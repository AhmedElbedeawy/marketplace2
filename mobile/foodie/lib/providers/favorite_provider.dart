import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/food.dart';

class FavoriteProvider extends ChangeNotifier {
  final Set<String> _favoriteDishIds = {};
  // Store additional context for favorites: dishId -> {offerId, cookId, image}
  final Map<String, Map<String, dynamic>> _favoriteContexts = {};
  bool _isInitialized = false;
  bool _isLoading = false;

  Set<String> get favoriteDishIds => _favoriteDishIds;
  Map<String, Map<String, dynamic>> get favoriteContexts => _favoriteContexts;
  bool get isLoading => _isLoading;

  Future<void> init() async {
    if (_isInitialized || _isLoading) return;
    _isLoading = true;
    await _loadFavorites();
    _isLoading = false;
    _isInitialized = true;
  }

  Future<void> _loadFavorites() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final favoriteIds = prefs.getStringList('favorite_dish_ids') ?? [];
      _favoriteDishIds.clear();
      _favoriteDishIds.addAll(favoriteIds);
      
      // Load favorite contexts
      _favoriteContexts.clear();
      for (final key in favoriteIds) {
        final contextJson = prefs.getString('favorite_context_$key');
        if (contextJson != null) {
          // Parse: "offerId,cookId,image,dishName,price"
          final parts = contextJson.split(',');
          if (parts.isNotEmpty && parts[0].isNotEmpty) {
            _favoriteContexts[key] = {
              if (parts[0].isNotEmpty) 'offerId': parts[0],
              if (parts.length > 1 && parts[1].isNotEmpty) 'cookId': parts[1],
              if (parts.length > 2 && parts[2].isNotEmpty) 'image': parts[2],
              if (parts.length > 3 && parts[3].isNotEmpty) 'dishName': parts[3],
              if (parts.length > 4 && parts[4].isNotEmpty) 'price': double.tryParse(parts[4]),
            };
          }
        }
      }
      notifyListeners();
    } catch (e) {
      debugPrint('Error loading favorites: $e');
    }
  }

  Future<void> _saveFavorites() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setStringList('favorite_dish_ids', _favoriteDishIds.toList());
      
      // Save contexts
      for (final entry in _favoriteContexts.entries) {
        final context = entry.value;
        final contextStr = [
          context['offerId'] ?? '',
          context['cookId'] ?? '',
          context['image'] ?? '',
          context['dishName'] ?? '',
          context['price']?.toString() ?? '',
        ].join(',');
        await prefs.setString('favorite_context_${entry.key}', contextStr);
      }
    } catch (e) {
      debugPrint('Error saving favorites: $e');
    }
  }

  Future<void> toggleFavorite(String dishId, {String? offerId, String? cookId, String? image, String? dishName, double? price}) async {
    // Use combined key to support multiple cooks per dish
    final String key = offerId != null ? '${dishId}_$offerId' : dishId;
    
    if (_favoriteDishIds.contains(key)) {
      _favoriteDishIds.remove(key);
      _favoriteContexts.remove(key);
    } else {
      _favoriteDishIds.add(key);
      _favoriteContexts[key] = {
        if (offerId != null) 'offerId': offerId,
        if (cookId != null) 'cookId': cookId,
        if (image != null) 'image': image,
        if (dishName != null) 'dishName': dishName,
        if (price != null) 'price': price,
        'adminDishId': dishId,
      };
    }
    notifyListeners();
    await _saveFavorites();
  }

  Future<void> addFavorite(String dishId, {String? offerId, String? cookId, String? image}) async {
    _favoriteDishIds.add(dishId);
    if (offerId != null || cookId != null || image != null) {
      _favoriteContexts[dishId] = {
        if (offerId != null) 'offerId': offerId,
        if (cookId != null) 'cookId': cookId,
        if (image != null) 'image': image,
      };
    }
    notifyListeners();
    await _saveFavorites();
  }

  Future<void> removeFavorite(String key) async {
    _favoriteDishIds.remove(key);
    _favoriteContexts.remove(key);
    notifyListeners();
    await _saveFavorites();
  }

  // Check if specific offer is favorited
  bool isFavorite(String dishId, {String? offerId}) {
    final String key = offerId != null ? '${dishId}_$offerId' : dishId;
    return _favoriteDishIds.contains(key);
  }

  Map<String, dynamic>? getFavoriteContext(String dishId, {String? offerId}) {
    final String key = offerId != null ? '${dishId}_$offerId' : dishId;
    return _favoriteContexts[key];
  }

  List<Food> getFavoriteDishes(List<Food> allDishes) {
    return allDishes.where((dish) => _favoriteDishIds.contains(dish.id)).toList();
  }

  // Get all favorite entries as list - each entry is a separate offer-level card
  List<Map<String, dynamic>> getFavoriteEntries() {
    final entries = <Map<String, dynamic>>[];
    for (final key in _favoriteDishIds) {
      final context = _favoriteContexts[key];
      if (context != null) {
        entries.add({
          'key': key,
          'offerId': context['offerId'],
          'cookId': context['cookId'],
          'image': context['image'],
          'dishName': context['dishName'],
          'price': context['price'],
        });
      }
    }
    return entries;
  }
}
