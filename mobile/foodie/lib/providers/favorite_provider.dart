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
      for (final dishId in favoriteIds) {
        final contextJson = prefs.getString('favorite_context_$dishId');
        if (contextJson != null) {
          // Simple parsing - stored as "offerId,cookId,image"
          final parts = contextJson.split(',');
          if (parts.isNotEmpty && parts[0].isNotEmpty) {
            _favoriteContexts[dishId] = {
              if (parts[0].isNotEmpty) 'offerId': parts[0],
              if (parts.length > 1 && parts[1].isNotEmpty) 'cookId': parts[1],
              if (parts.length > 2 && parts[2].isNotEmpty) 'image': parts[2],
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
        ].join(',');
        await prefs.setString('favorite_context_${entry.key}', contextStr);
      }
    } catch (e) {
      debugPrint('Error saving favorites: $e');
    }
  }

  bool isFavorite(String dishId) {
    return _favoriteDishIds.contains(dishId);
  }

  Future<void> toggleFavorite(String dishId, {String? offerId, String? cookId, String? image}) async {
    if (_favoriteDishIds.contains(dishId)) {
      _favoriteDishIds.remove(dishId);
      _favoriteContexts.remove(dishId);
    } else {
      _favoriteDishIds.add(dishId);
      if (offerId != null || cookId != null || image != null) {
        _favoriteContexts[dishId] = {
          if (offerId != null) 'offerId': offerId,
          if (cookId != null) 'cookId': cookId,
          if (image != null) 'image': image,
        };
      }
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

  Future<void> removeFavorite(String dishId) async {
    _favoriteDishIds.remove(dishId);
    _favoriteContexts.remove(dishId);
    notifyListeners();
    await _saveFavorites();
  }

  Map<String, dynamic>? getFavoriteContext(String dishId) {
    return _favoriteContexts[dishId];
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
