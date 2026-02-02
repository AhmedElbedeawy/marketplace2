import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/food.dart';
import '../models/category.dart';
import '../config/api_config.dart';

class FoodProvider extends ChangeNotifier {
  final List<Food> _foods = [];
  final List<Food> _popularDishes = [];
  final List<Food> _featuredDishes = []; // PHASE 3: AdminDish featured
  final List<Food> _adminDishesWithStats = []; // PHASE 3: AdminDish with stats
  final List<Chef> _chefs = [];
  final List<Chef> _popularChefs = [];
  final List<Category> _categories = [];
  final List<Food> _categoryDishes = []; // For Menu screen
  bool _isLoading = false;
  String? _error;

  List<Food> get foods => _foods;
  List<Food> get popularDishes => _popularDishes;
  List<Food> get featuredDishes => _featuredDishes; // PHASE 3
  List<Food> get adminDishesWithStats => _adminDishesWithStats; // PHASE 3
  List<Chef> get chefs => _chefs;
  List<Chef> get popularChefs => _popularChefs;
  List<Category> get categories => _categories;
  List<Food> get categoryDishes => _categoryDishes; // For Menu screen
  bool get isLoading => _isLoading;
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

  Future<void> fetchPopularChefs(Map<String, String> headers, {double? lat, double? lng}) async {
    try {
      String url = ApiConfig.getTopRatedCooks;
      if (lat != null && lng != null) {
        url += '${url.contains('?') ? '&' : '?'}lat=$lat&lng=$lng';
      }

      final response = await http.get(
        Uri.parse(url),
        headers: headers,
      );
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        _popularChefs.clear();
        if (data['data'] != null && (data['data'] as List).isNotEmpty) {
          final List<Chef> fetchedChefs = [];
          for (final item in data['data']) {
            fetchedChefs.add(Chef.fromJson(item));
          }
          // Sort by rating then ordersCount
          fetchedChefs.sort((a, b) {
            if (b.rating != a.rating) {
              return b.rating.compareTo(a.rating);
            }
            return b.ordersCount.compareTo(a.ordersCount);
          });
          _popularChefs.addAll(fetchedChefs);
        } else {
          // Fallback to agreed chefs
          _popularChefs.addAll([
            Chef(
              id: 'c4',
              name: 'Hassan Grill House',
              expertise: 'Grilled & BBQ',
              profileImage: 'C4.png',
              rating: 4.9,
              reviewCount: 412,
              specialties: ['Grilled Specialities'],
              isFollowing: false,
              ordersCount: 510,
            ),
            Chef(
              id: 'c1',
              name: 'Amal Kitchen',
              expertise: 'Traditional Egyptian',
              profileImage: 'C1.png',
              rating: 4.9,
              reviewCount: 323,
              specialties: ['Home-style Egyptian'],
              isFollowing: false,
              ordersCount: 450,
            ),
            Chef(
              id: 'c2',
              name: 'Chef Mohamed',
              expertise: 'Grilled & BBQ',
              profileImage: 'C2.png',
              rating: 4.8,
              reviewCount: 256,
              specialties: ['Authentic Grills'],
              isFollowing: false,
              ordersCount: 320,
            ),
            Chef(
              id: 'c3',
              name: 'Mama Nadia',
              expertise: 'Casseroles',
              profileImage: 'C3.png',
              rating: 4.7,
              reviewCount: 189,
              specialties: ['Tagine Specialist'],
              isFollowing: false,
              ordersCount: 280,
            ),
          ]);
        }
        notifyListeners();
      }
    } catch (e) {
      _error = 'Failed to fetch popular chefs';
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
          images: _currentDish!.images.isNotEmpty ? _currentDish!.images : [_currentDish!.image ?? ''],
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

  // PHASE 3/4: Fetch featured AdminDishes for Home screen
  Future<void> fetchFeaturedAdminDishes(Map<String, String> headers, {int limit = 10}) async {
    try {
      final url = '${ApiConfig.getFeaturedAdminDishes}?limit=$limit';
      final response = await http.get(
        Uri.parse(url),
        headers: headers,
      );
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final List<dynamic> dishes = data['dishes'] ?? data;
        _featuredDishes.clear();
        for (final item in dishes) {
          _featuredDishes.add(Food.fromAdminDishJson(item));
        }
        notifyListeners();
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
      
      final url = '${ApiConfig.getAdminDishesWithStats}${params.isNotEmpty ? '?${params.join('&')}' : ''}';
      final response = await http.get(
        Uri.parse(url),
        headers: headers,
      );
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final List<dynamic> dishes = data['dishes'] ?? data;
        _adminDishesWithStats.clear();
        for (final item in dishes) {
          _adminDishesWithStats.add(Food.fromAdminDishJson(item));
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

  Future<void> fetchOffersByAdminDish(String adminDishId, Map<String, String> headers) async {
    _isLoading = true;
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
      
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = 'Failed to fetch offers: $e';
      _isLoading = false;
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
