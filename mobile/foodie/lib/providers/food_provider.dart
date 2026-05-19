import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/food.dart';
import '../models/category.dart';
import '../config/api_config.dart';

class FoodProvider extends ChangeNotifier {
  final List<Food> _foods = [];
  final List<Food> _popularDishes = [];
  final List<Food> _featuredDishes = []; // PHASE 3: AdminDish featured
  final List<Food> _adminDishesWithStats = []; // PHASE 3: AdminDish with stats
  final List<Food> _viewedDishes = []; // Dishes viewed via Cook Hub or direct access
  final List<Chef> _chefs = [];
  final List<Chef> _popularChefs = [];
  final List<CookInfo> _cooks = []; // Cook mode list
  final List<Category> _categories = [];
  final List<Food> _categoryDishes = []; // For Menu screen
  bool _isLoading = false;
  bool _isOffersLoading = false; // Separate loading flag for offers only
  String? _error;
  
  // SharedPreferences for caching featured dishes
  final SharedPreferences _prefs;
  
  FoodProvider(this._prefs) {
    _loadCachedFeaturedDishes();
  }
  
  // Load cached featured dishes from SharedPreferences
  void _loadCachedFeaturedDishes() {
    try {
      final cached = _prefs.getString('featured_dishes_cache');
      if (cached != null) {
        final decoded = json.decode(cached) as List;
        _featuredDishes.clear();
        for (final item in decoded) {
          if (item is Map<String, dynamic>) {
            _featuredDishes.add(Food.fromAdminDishJson(item));
          }
        }
        debugPrint('📦 [CACHE] Loaded ${_featuredDishes.length} featured dishes from cache');
      }
    } catch (e) {
      debugPrint('❌ [CACHE] Error loading featured dishes cache: $e');
    }
  }
  
  // Save featured dishes to SharedPreferences cache
  Future<void> _saveFeaturedDishesCache() async {
    try {
      final encoded = json.encode(_featuredDishes.map((d) => d.toJson()).toList());
      await _prefs.setString('featured_dishes_cache', encoded);
      debugPrint('💾 [CACHE] Saved ${_featuredDishes.length} featured dishes to cache');
    } catch (e) {
      debugPrint('❌ [CACHE] Error saving featured dishes cache: $e');
    }
  }

  List<Food> get foods => _foods;
  List<Food> get popularDishes => _popularDishes;
  List<Food> get featuredDishes => _featuredDishes; // PHASE 3
  List<Food> get adminDishesWithStats => _adminDishesWithStats; // PHASE 3
  List<Food> get viewedDishes => _viewedDishes;
  List<Chef> get chefs => _chefs;
  List<Chef> get popularChefs => _popularChefs;
  List<CookInfo> get cooks => _cooks;
  List<Category> get categories => _categories;
  List<Food> get categoryDishes => _categoryDishes; // For Menu screen
  bool get isLoading => _isLoading;

  /// Returns the Arabic name for a food/dish by any known ID (productId / adminDishId).
  /// Searches across all cached food lists. Returns null if not found or nameAr is empty.
  String? findArabicNameById(String id) {
    if (id.isEmpty) return null;
    for (final list in [_foods, _popularDishes, _featuredDishes, _viewedDishes, _categoryDishes, _adminDishesWithStats]) {
      for (final food in list) {
        if (food.id == id || food.adminDishId == id) {
          if (food.nameAr != null && food.nameAr!.isNotEmpty) return food.nameAr;
        }
      }
    }
    return null;
  }
  bool get isOffersLoading => _isOffersLoading; // Loading state for offers only
  String? get error => _error;

  Future<void> fetchFoods(Map<String, String> headers, {double? lat, double? lng}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      String url = ApiConfig.getProducts;
      if (lat != null && lng != null) {
        url += '${url.contains('?') ? '&' : '?'}lat=$lat&lng=$lng';
      }
      
      final response = await http.get(
        Uri.parse(url),
        headers: headers,
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        _foods.clear();
        if (data['products'] != null) {
          for (final item in data['products']) {
            _foods.add(Food.fromJson(item));
          }
        }
      }
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = 'Failed to fetch foods';
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchPopularDishes(Map<String, String> headers, {double? lat, double? lng}) async {
    try {
      String url = ApiConfig.getPopularDishes;
      if (lat != null && lng != null) {
        url += '${url.contains('?') ? '&' : '?'}lat=$lat&lng=$lng';
      }

      final response = await http.get(
        Uri.parse(url),
        headers: headers,
      );
      
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        _popularDishes.clear();
        if (data.isNotEmpty) {
          for (final item in data) {
            _popularDishes.add(Food.fromJson(item));
          }
        } else {
          // Fallback to agreed dishes
          final displayOrder = [
            'Molokhia',
            'Roasted Duck',
            'Stuffed Grape Leaves',
            'Shish Tawook',
            'Lamb Shank Fattah',
            'Egyptian Moussaka',
          ];
          for (final dishName in displayOrder) {
            String image = 'Molokhia.png';
            String description = 'Home-Style Flavor';
            if (dishName == 'Roasted Duck') { image = 'Roasted Duck.png'; description = 'Crispy Rich Taste'; }
            else if (dishName == 'Stuffed Grape Leaves') { image = 'Vine Leaves.png'; description = 'Tender Balanced Taste'; }
            else if (dishName == 'Shish Tawook') { image = 'Mix Grill.png'; description = 'Light Smoky Marinade'; }
            else if (dishName == 'Lamb Shank Fattah') { image = 'Meat & Rice.png'; description = 'Tender Rich Lamb'; }
            else if (dishName == 'Egyptian Moussaka') { image = 'Mesakaa.png'; description = 'Authentic Local Taste'; }

            _popularDishes.add(Food(
              id: dishName.toLowerCase().replaceAll(' ', '_'),
              name: dishName,
              description: description,
              price: 50,
              category: 'Traditional',
              image: image,
              orderCount: 0,
              isFavorite: false,
              rating: 4.5,
              reviewCount: 0,
              cookCount: 7,
              prepTime: 30,
              calories: 450,
            ));
          }
        }
        notifyListeners();
      }
    } catch (e) {
      _error = 'Failed to fetch popular dishes: $e';
      notifyListeners();
    }
  }

  Future<void> fetchChefs(Map<String, String> headers, {double? lat, double? lng}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      String url = ApiConfig.getCooks;
      if (lat != null && lng != null) {
        url += '${url.contains('?') ? '&' : '?'}lat=$lat&lng=$lng';
      }

      final response = await http.get(
        Uri.parse(url),
        headers: headers,
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        _chefs.clear();
        if (data['data'] != null) {
          for (final item in data['data']) {
            _chefs.add(Chef.fromJson(item));
          }
        }
      }
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = 'Failed to fetch chefs';
      _isLoading = false;
      notifyListeners();
    }
  }

  // Fetch cooks for Cook mode with optional expertise filter
  Future<void> fetchCooks({
    required Map<String, String> headers,
    double? lat,
    double? lng,
    String? expertise, // Optional expertise filter (e.g., 'Bakery', 'Oriental')
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      String url = ApiConfig.getCooks;
      
      // Add expertise filter if provided
      if (expertise != null && expertise.isNotEmpty && expertise != 'All') {
        url += '${url.contains('?') ? '&' : '?'}expertise=$expertise';
      }
      
      if (lat != null && lng != null) {
        url += '${url.contains('?') ? '&' : '?'}lat=$lat&lng=$lng';
      }

      print('🔍 [COOKS] Fetching from: $url');
      print('🔍 [COOKS] Headers: $headers');
      print('🔍 [COOKS] expertise param: $expertise');
      
      final response = await http.get(
        Uri.parse(url),
        headers: headers,
      );

      print('📡 [COOKS] Response status: ${response.statusCode}');
      print('📡 [COOKS] Response body preview: ${response.body.substring(0, response.body.length > 500 ? 500 : response.body.length)}');
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        _cooks.clear();
        
        // Handle both 'data' array and direct array response
        final cooksData = data['data'] ?? data;
        if (cooksData is List) {
          for (final item in cooksData) {
            _cooks.add(CookInfo.fromJson(item));
          }
        }
        
        print('📊 [COOKS] Loaded ${_cooks.length} cooks');
      }
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      print('❌ [COOKS] Error: $e');
      _error = 'Failed to fetch cooks';
      _isLoading = false;
      notifyListeners();
    }
  }

  // Fetch dishes for a specific cook
  final List<Food> _cookDishes = [];
  List<Food> get cookDishes => _cookDishes;

  Future<void> fetchCookDishes({
    required String cookId,
    required Map<String, String> headers,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final url = '${ApiConfig.getCooks}/$cookId/dishes';
      
      print('🔍 [COOK DISHES] Fetching from: $url');
      print('🔍 [COOK DISHES] cookId: $cookId');
      print('🔍 [COOK DISHES] Headers: $headers');
      
      final response = await http.get(
        Uri.parse(url),
        headers: headers,
      );

      print('📡 [COOK DISHES] Response status: ${response.statusCode}');
      print('📡 [COOK DISHES] Response body: ${response.body}');
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        _cookDishes.clear();
        
        // Handle both 'data' array and direct array response
        final dishesData = data['data'] ?? data;
        if (dishesData is List) {
          for (final item in dishesData) {
            _cookDishes.add(Food.fromJson(item));
          }
        }
        
        print('📊 [COOK DISHES] Loaded ${_cookDishes.length} dishes');
      }
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      print('❌ [COOK DISHES] Error: $e');
      _error = 'Failed to fetch cook dishes';
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchPopularChefs(Map<String, String> headers, {double? lat, double? lng}) async {
    try {
      String url = ApiConfig.getTopRatedCooks;
      
      // Add country as query param (like web app does)
      final countryCode = headers['x-country-code'] ?? 'SA';
      url += '?country=$countryCode';
      
      if (lat != null && lng != null) {
        url += '&lat=$lat&lng=$lng';
      }

      print('🔍 [TOP-RATED] Fetching from: $url');
      print('🔍 [TOP-RATED] Headers: ${headers.keys.toList()}');
      
      final response = await http.get(
        Uri.parse(url),
        headers: headers,
      );
      
      print('📡 [TOP-RATED] Response status: ${response.statusCode}');
      print('📡 [TOP-RATED] Response body length: ${response.body.length}');
      
      // Log first 1000 chars of response
      final previewLength = response.body.length > 1000 ? 1000 : response.body.length;
      print('📡 [TOP-RATED] Response preview: ${response.body.substring(0, previewLength)}');
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        _popularChefs.clear();
        
        print('📊 [TOP-RATED] Parsed JSON keys: ${data.keys.toList()}');
        print('📊 [TOP-RATED] data["data"] type: ${data['data']?.runtimeType}');
        print('📊 [TOP-RATED] data["data"] exists: ${data['data'] != null}');
        print('📊 [TOP-RATED] data["data"] length: ${data['data'] != null ? (data['data'] as List).length : 0}');
        
        if (data['data'] != null && (data['data'] as List).isNotEmpty) {
          final List<Chef> fetchedChefs = [];
          int parseErrors = 0;
          
          for (int i = 0; i < (data['data'] as List).length; i++) {
            final item = (data['data'] as List)[i];
            final cookName = item['storeName'] ?? item['name'] ?? 'Unknown';
            
            print('\n🍳 [TOP-RATED] Parsing cook #$i: $cookName');
            print('   Keys in item: ${item.keys.toList()}');
            print('   profilePhoto: ${item['profilePhoto']}');
            print('   ratings: ${item['ratings']}');
            
            try {
              final chef = Chef.fromJson(item);
              print('  ✅ Parsed successfully:');
              print('     - name: ${chef.name}');
              print('     - profileImage: ${chef.profileImage}');
              print('     - rating: ${chef.rating}');
              print('     - reviewCount: ${chef.reviewCount}');
              print('     - expertise: ${chef.expertise}');
              fetchedChefs.add(chef);
            } catch (e) {
              print('  ❌ Parse error for $cookName: $e');
              parseErrors++;
            }
          }
          
          // Sort by rating then ordersCount
          fetchedChefs.sort((a, b) {
            if (b.rating != a.rating) {
              return b.rating.compareTo(a.rating);
            }
            return b.ordersCount.compareTo(a.ordersCount);
          });
          
          _popularChefs.addAll(fetchedChefs);
          print('\n✅ [TOP-RATED] Final results:');
          print('   - Total cooks from API: ${(data['data'] as List).length}');
          print('   - Successfully parsed: ${fetchedChefs.length}');
          print('   - Parse errors: $parseErrors');
          print('   - Final popularChefs count: ${_popularChefs.length}');
        } else {
          // NO fallback to dummy cooks - section should be empty if no real top-rated cooks
          _popularChefs.clear();
          print('⚠️ [TOP-RATED] No data returned from API, clearing list');
        }
        notifyListeners();
      } else {
        print('❌ [TOP-RATED] HTTP error: ${response.statusCode}');
        print('❌ [TOP-RATED] Error body: ${response.body}');
      }
    } catch (e, stackTrace) {
      print('❌ [TOP-RATED] Exception: $e');
      print('❌ [TOP-RATED] Stack trace: $stackTrace');
      _error = 'Failed to fetch popular chefs: $e';
      notifyListeners();
    }
  }

  Future<void> fetchCategories(Map<String, String> headers) async {
    try {
      final response = await http.get(
        Uri.parse(ApiConfig.getCategories),
        headers: headers,
      );
      
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        _categories.clear();
        for (final item in data) {
          _categories.add(Category.fromJson(item));
        }
        notifyListeners();
      }
    } catch (e) {
      _error = 'Failed to fetch categories: $e';
      notifyListeners();
    }
  }

  Future<void> fetchDishesByCategory(String categoryId, Map<String, String> headers, {double? lat, double? lng}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      String url = '${ApiConfig.getProducts}?category=$categoryId';
      if (lat != null && lng != null) {
        url += '&lat=$lat&lng=$lng';
      }

      final response = await http.get(
        Uri.parse(url),
        headers: headers,
      );
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        _categoryDishes.clear();
        if (data['products'] != null) {
          for (final item in data['products']) {
            _categoryDishes.add(Food.fromJson(item));
          }
        }
      }
      
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = 'Failed to fetch dishes: $e';
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> searchFoods(String query, Map<String, String> headers, {double? lat, double? lng}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      String url = '${ApiConfig.getProducts}?search=$query';
      if (lat != null && lng != null) {
        url += '&lat=$lat&lng=$lng';
      }

      final response = await http.get(
        Uri.parse(url),
        headers: headers,
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        _foods.clear();
        if (data['products'] != null) {
          for (final item in data['products']) {
            _foods.add(Food.fromJson(item));
          }
        }
      }
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = 'Search failed';
      _isLoading = false;
      notifyListeners();
    }
  }

  // Dish detail screen related methods
  Food? _currentDish;
  List<DishCookVariant> _dishCookVariants = [];

  Food? get currentDish => _currentDish;
  List<DishCookVariant> get dishCookVariants => _dishCookVariants;

  Future<void> fetchDishDetails(String dishId, Map<String, String> headers) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.getProductById}$dishId'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        _currentDish = Food.fromJson(data);
        
        // Backend returns offers in currentDish.cooks
        _dishCookVariants = _currentDish!.cooks.map((offer) => DishCookVariant(
         cookId: offer.cookId,
         cookName: offer.cookName,
         cookRating: offer.cookRating,
          price: offer.price,
          images: _currentDish!.images.isNotEmpty ? _currentDish!.images: [_currentDish!.image ?? ''],
          deliveryFee: (offer.fullOfferData?['deliveryFee'] as num?)?.toDouble() ?? 0.0,
         countryCode: offer.fullOfferData?['cook']?['countryCode'] ?? offer.fullOfferData?['countryCode'],
         fullOfferData: offer.fullOfferData,
        )).toList();
      }

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = 'Failed to fetch dish details: $e';
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> toggleFavorite(String dishId) async {
    try {
      // Update in popular dishes list
      final index = _popularDishes.indexWhere((dish) => dish.id == dishId);
      if (index >= 0) {
        final dish = _popularDishes[index];
        _popularDishes[index] = Food(
          id: dish.id,
          name: dish.name,
          description: dish.description,
          price: dish.price,
          category: dish.category,
          image: dish.image,
          orderCount: dish.orderCount,
          isFavorite: !dish.isFavorite,
          rating: dish.rating,
          reviewCount: dish.reviewCount,
          cookCount: dish.cookCount,
          prepTime: dish.prepTime,
          calories: dish.calories,
          servingSize: dish.servingSize,
          ingredients: dish.ingredients,
          images: dish.images,
          cooks: dish.cooks,
        );
      }
      
      // Update current dish
      if (_currentDish != null && _currentDish!.id == dishId) {
        _currentDish = Food(
          id: _currentDish!.id,
          name: _currentDish!.name,
          description: _currentDish!.description,
          price: _currentDish!.price,
          category: _currentDish!.category,
          image: _currentDish!.image,
          orderCount: _currentDish!.orderCount,
          isFavorite: !_currentDish!.isFavorite,
          rating: _currentDish!.rating,
          reviewCount: _currentDish!.reviewCount,
          cookCount: _currentDish!.cookCount,
          prepTime: _currentDish!.prepTime,
          calories: _currentDish!.calories,
          servingSize: _currentDish!.servingSize,
          ingredients: _currentDish!.ingredients,
          images: _currentDish!.images,
          cooks: _currentDish!.cooks,
        );
      }
      
      // Update in foods list
      final foodIndex = _foods.indexWhere((dish) => dish.id == dishId);
      if (foodIndex >= 0) {
        final dish = _foods[foodIndex];
        _foods[foodIndex] = Food(
          id: dish.id,
          name: dish.name,
          description: dish.description,
          price: dish.price,
          category: dish.category,
          image: dish.image,
          orderCount: dish.orderCount,
          isFavorite: !dish.isFavorite,
          rating: dish.rating,
          reviewCount: dish.reviewCount,
          cookCount: dish.cookCount,
          prepTime: dish.prepTime,
          calories: dish.calories,
          servingSize: dish.servingSize,
          ingredients: dish.ingredients,
          images: dish.images,
          cooks: dish.cooks,
        );
      }
      
      notifyListeners();
    } catch (e) {
      _error = 'Failed to toggle favorite: $e';
      notifyListeners();
    }
  }

  // Add a dish to viewedDishes for favorites tracking
  void addToViewedDishes(Food dish) {
    // Avoid duplicates - remove if already exists then add at front
    _viewedDishes.removeWhere((d) => d.id == dish.id);
    _viewedDishes.insert(0, dish);
    // Keep only last 50 viewed dishes
    if (_viewedDishes.length > 50) {
      _viewedDishes.removeLast();
    }
    notifyListeners();
  }

  // PHASE 3/4: Fetch featured AdminDishes for Home screen
  Future<void> fetchFeaturedAdminDishes(Map<String, String> headers, {int limit = 10}) async {
    try {
      final url = '${ApiConfig.getFeaturedAdminDishes}?limit=$limit';
      final response = await http.get(
        Uri.parse(url),
        headers: headers,
      );
      
      if (response.statusCode == 200) {
        final decoded = json.decode(response.body);
        final List<dynamic> dishes =
            (decoded is Map && decoded['dishes'] is List) ? (decoded['dishes'] as List) :
            (decoded is List) ? decoded :
            [];
        
        // Build new list first to avoid clearing existing data before new data arrives
        final newFeaturedDishes = <Food>[];
        for (final item in dishes) {
          if (item is Map<String, dynamic>) {
            newFeaturedDishes.add(Food.fromAdminDishJson(item));
          } else {
            debugPrint('Skipping non-map FeaturedAdminDish item: ${item.runtimeType}');
          }
        }
        
        // Only replace if we got valid data (prevent clearing on empty/error response)
        if (newFeaturedDishes.isNotEmpty) {
          _featuredDishes.clear();
          _featuredDishes.addAll(newFeaturedDishes);
          await _saveFeaturedDishesCache(); // Cache the new data
          notifyListeners();
        }
      }
    } catch (e) {
      debugPrint('Failed to fetch featured AdminDishes: $e');
      // Keep existing data on error
      notifyListeners();
    }
  }

  // PHASE 3/4: Fetch AdminDishes with stats for Menu screen
  Future<void> fetchAdminDishesWithStats(
    Map<String, String> headers, {
    double? lat,
    double? lng,
    String? categoryId,
    String? search,
    // Filter parameters for computing filtered stats
    String? orderType,
    String? prepTime,
    bool? topRatedOnly,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final params = <String>[];
      if (lat != null && lng != null) {
        params.add('lat=$lat');
        params.add('lng=$lng');
      }
      if (categoryId != null && categoryId.isNotEmpty) {
        params.add('category=$categoryId');
      }
      if (search != null && search.isNotEmpty) {
        params.add('search=$search');
      }
      // Add filter parameters
      if (orderType != null && orderType.isNotEmpty) {
        params.add('orderType=$orderType');
      }
      if (prepTime != null && prepTime.isNotEmpty) {
        params.add('prepTime=$prepTime');
      }
      if (topRatedOnly != null && topRatedOnly) {
        params.add('topRatedOnly=true');
      }
      
      final url = '${ApiConfig.getAdminDishesWithStats}${params.isNotEmpty ? '?${params.join('&')}' : ''}';
      final response = await http.get(
        Uri.parse(url),
        headers: headers,
      );
      
      if (response.statusCode == 200) {
        final decoded = json.decode(response.body);
final List<dynamic> dishes =
    (decoded is Map && decoded['dishes'] is List) ? (decoded['dishes'] as List) :
    (decoded is List) ? decoded :
    [];
        _adminDishesWithStats.clear();
        for (final item in dishes) {
          if (item is Map<String, dynamic>) {
            _adminDishesWithStats.add(Food.fromAdminDishJson(item));
          } else {
            debugPrint('Skipping non-map AdminDishesWithStats item: ${item.runtimeType}');
          }
        }
      }
      
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = 'Failed to fetch AdminDishes: $e';
      _isLoading = false;
      notifyListeners();
    }
  }

  // PHASE 3/4: Fetch offers by AdminDish ID (Level 1 popup)
  List<DishOffer> _currentOffers = [];
  List<DishOffer> get currentOffers => _currentOffers;

  // Fetch dishes offered by a specific cook (for "More from this Cook" section)
  Future<List<Food>> fetchDishesByCook(
    Map<String, String> headers, {
    required String cookId,
    String? excludeAdminDishId,
    int limit = 10,
    String countryCode = 'SA',
  }) async {
    try {
      // Use /by-cook/:cookId endpoint which returns DishOffer documents filtered by cook
      // Each offer includes the populated adminDish field
      // CRITICAL FIX: Add country parameter to match server filtering
      final url = '${ApiConfig.getOffersByCook}$cookId?country=$countryCode';
      debugPrint('\n🔍 FETCHING DISHES BY COOK:');
      debugPrint('   URL: $url');
      debugPrint('   Country: $countryCode');
      debugPrint('   Headers: ${headers.keys.toList()}');
      
      final response = await http.get(
        Uri.parse(url),
        headers: headers,
      );
      
      debugPrint('   ✅ Response received!');
      debugPrint('   Response status: ${response.statusCode}');
      debugPrint('   Response body (first 500 chars): ${response.body.substring(0, response.body.length > 500 ? 500 : response.body.length)}');
      
      if (response.statusCode == 200) {
        final List<dynamic> offers = json.decode(response.body);
        debugPrint('   API returned ${offers.length} offers');
        
        // Log first offer structure for debugging
        if (offers.isNotEmpty) {
          debugPrint('   First offer structure:');
          final firstOffer = offers[0] as Map<String, dynamic>;
          debugPrint('     - Keys: ${firstOffer.keys.toList()}');
          debugPrint('     - Has adminDish: ${firstOffer.containsKey('adminDish')}');
          if (firstOffer.containsKey('adminDish') && firstOffer['adminDish'] != null) {
            final adminDish = firstOffer['adminDish'] as Map<String, dynamic>;
            debugPrint('     - adminDish keys: ${adminDish.keys.toList()}');
            debugPrint('     - adminDish._id: ${adminDish['_id']}');
            debugPrint('     - adminDish.nameEn: ${adminDish['nameEn']}');
            debugPrint('     - adminDish.nameAr: ${adminDish['nameAr']}');
            debugPrint('     - adminDish.descriptionEn: ${adminDish['descriptionEn']}');
            debugPrint('     - adminDish.descriptionAr: ${adminDish['descriptionAr']}');
            debugPrint('     - adminDish.description: ${adminDish['description']}');
          }
        }
        
        final List<Food> result = [];
        final Set<String> seenDishIds = {}; // Prevent duplicate dishes
        
        for (final offer in offers) {
          if (offer is Map<String, dynamic>) {
            // Extract adminDish from offer
            final adminDish = offer['adminDish'] as Map<String, dynamic>?;
            if (adminDish == null) {
              debugPrint('   ⚠️ Offer without adminDish, skipping');
              continue;
            }
            
            final dishId = adminDish['_id'] as String?;
            if (dishId == null || dishId.isEmpty) continue;
            
            // Exclude the current dish
            if (dishId == excludeAdminDishId) {
              debugPrint('   Excluding current dish: ${adminDish['nameEn'] ?? adminDish['name']}');
              continue;
            }
            
            // Prevent duplicates (same dish might have multiple offers/variants)
            if (seenDishIds.contains(dishId)) {
              debugPrint('   Duplicate dish, skipping: ${adminDish['nameEn'] ?? adminDish['name']}');
              continue;
            }
            seenDishIds.add(dishId);
            
            // Convert adminDish to Food object
            final food = Food.fromAdminDishJson(adminDish);
            result.add(food);
            debugPrint('   Added: ${food.name} (adminDishId: ${food.id})');
            
            // Stop when we have enough dishes
            if (result.length >= limit) break;
          }
        }
        
        debugPrint('   Total unique dishes: ${result.length}');
        return result;
      } else {
        debugPrint('   ⚠️ API error: ${response.statusCode}');
        debugPrint('   Response body: ${response.body}');
      }
    } catch (e, stackTrace) {
      debugPrint('   ❌ EXCEPTION fetching dishes by cook: $e');
      debugPrint('   Stack trace: $stackTrace');
    }
    debugPrint('   Returning empty list');
    return [];
  }

  Future<void> fetchOffersByAdminDish(String adminDishId, Map<String, String> headers) async {
    _isOffersLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.getOffersByAdminDish}$adminDishId'),
        headers: headers,
      );
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true && data['offers'] != null) {
          _currentOffers = (data['offers'] as List<dynamic>)
              .map((item) => DishOffer.fromJson(item))
              .toList();
        } else {
          _currentOffers = [];
        }
      }
      
      _isOffersLoading = false;
      notifyListeners();
    } catch (e) {
      _error = 'Failed to fetch offers: $e';
      _isOffersLoading = false;
      notifyListeners();
    }
  }

  // PHASE 3/4: Current selected AdminDish for Level 2 popup
  Food? _currentAdminDish;
  Food? get currentAdminDish => _currentAdminDish;

  // Set current AdminDish when selecting from Level 1
  void setCurrentAdminDish(Food dish) {
    _currentAdminDish = dish;
    notifyListeners();
  }

  // Clear current AdminDish when closing popups
  void clearCurrentAdminDish() {
    _currentAdminDish = null;
    _currentOffers = [];
    notifyListeners();
  }
}
