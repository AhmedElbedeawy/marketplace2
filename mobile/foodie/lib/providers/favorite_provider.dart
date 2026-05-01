import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../models/food.dart';

class FavoriteProvider extends ChangeNotifier {
  final Set<String> _favoriteDishIds = {};
  // Store additional context for favorites: dishId -> {offerId, cookId, image}
  final Map<String, Map<String, dynamic>> _favoriteContexts = {};
  final Set<String> _favoriteCookIds = {}; // Cook favorites
  bool _isInitialized = false;
  bool _isLoading = false;

  Set<String> get favoriteDishIds => _favoriteDishIds;
  Set<String> get favoriteCookIds => _favoriteCookIds;
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
          final context = jsonDecode(contextJson) as Map<String, dynamic>;
          _favoriteContexts[key] = context;
        }
      }
      
      // Load cook favorites
      final favoriteCookIds = prefs.getStringList('favorite_cook_ids') ?? [];
      _favoriteCookIds.clear();
      _favoriteCookIds.addAll(favoriteCookIds);
      
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
        final contextJson = jsonEncode(context);
        await prefs.setString('favorite_context_${entry.key}', contextJson);
      }
      
      // Save cook favorites
      await prefs.setStringList('favorite_cook_ids', _favoriteCookIds.toList());
    } catch (e) {
      debugPrint('Error saving favorites: $e');
    }
  }

  Future<void> toggleFavorite(String dishId, {String? offerId, String? cookId, String? image, String? dishName, double? price, Map<String, dynamic>? offerData}) async {
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
        if (image != null && image.isNotEmpty) 'image': image,
        if (dishName != null && dishName.isNotEmpty) 'dishName': dishName,
        if (price != null) 'price': price,
        if (offerData != null) 'offerData': offerData,
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
          'offerData': context['offerData'], // Include full offer data
          'adminDishId': context['adminDishId'],
        });
      }
    }
    return entries;
  }
  
  // Cook favorite methods
  Future<void> toggleCookFavorite(String cookId) async {
    if (_favoriteCookIds.contains(cookId)) {
      _favoriteCookIds.remove(cookId);
    } else {
      _favoriteCookIds.add(cookId);
    }
    notifyListeners();
    await _saveFavorites();
  }
  
  bool isCookFavorite(String cookId) {
    return _favoriteCookIds.contains(cookId);
  }
}
