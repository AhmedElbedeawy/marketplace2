import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/food.dart';

class FavoriteProvider extends ChangeNotifier {
  final Set<String> _favoriteProductIds = {};
  final Set<String> _favoriteCookIds = {};
  // Store additional context for favorites: productId -> {offerId, cookId, image}
  final Map<String, Map<String, dynamic>> _favoriteContexts = {};
  bool _isLoading = false;
  String? _error;

  Set<String> get favoriteProductIds => _favoriteProductIds;
  Set<String> get favoriteCookIds => _favoriteCookIds;
  Map<String, Map<String, dynamic>> get favoriteContexts => _favoriteContexts;
  bool get isLoading => _isLoading;
  String? get error => _error;

  /// Fetch user's favorite products from API
  Future<void> fetchFavoriteProducts(String token) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/favorites/products'),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final favorites = data['favorites'] ?? data['data'] ?? [];

        _favoriteProductIds.clear();
        for (var fav in favorites) {
          final productId =
              fav['productId']?['_id'] ?? fav['productId'] ?? fav['_id'];
          if (productId != null) {
            _favoriteProductIds.add(productId.toString());
            _favoriteContexts[productId.toString()] = {
              'offerId': fav['_id'],
              'cookId': fav['productId']?['cook']?['_id'] ?? fav['cookId'],
              'image': fav['productId']?['images']?.first ?? fav['image'],
            };
          }
        }
      } else {
        throw Exception('Failed to load favorite products');
      }
    } catch (err) {
      _error = err.toString();
      debugPrint('Error fetching favorite products: $err');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Fetch user's favorite cooks from API
  Future<void> fetchFavoriteCooks(String token) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/favorites/cooks'),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final favorites = data['favorites'] ?? data['data'] ?? [];

        _favoriteCookIds.clear();
        for (var fav in favorites) {
          final cookId = fav['cookId']?['_id'] ?? fav['cookId'];
          if (cookId != null) {
            _favoriteCookIds.add(cookId.toString());
          }
        }
      } else {
        throw Exception('Failed to load favorite cooks');
      }
    } catch (err) {
      _error = err.toString();
      debugPrint('Error fetching favorite cooks: $err');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Toggle favorite product (add/remove)
  Future<bool> toggleFavoriteProduct(String token, String productId) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/favorites/product'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode({'productId': productId}),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = json.decode(response.body);
        if (data['success'] == true) {
          // Refresh favorites to sync with backend
          await fetchFavoriteProducts(token);
          return true;
        }
      }
      throw Exception('Failed to toggle favorite');
    } catch (err) {
      _error = err.toString();
      debugPrint('Toggle favorite error: $err');
      return false;
    }
  }

  /// Toggle favorite cook
  Future<bool> toggleFavoriteCook(String token, String cookId) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/favorites/cook'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode({'cookId': cookId}),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = json.decode(response.body);
        if (data['success'] == true) {
          await fetchFavoriteCooks(token);
          return true;
        }
      }
      throw Exception('Failed to toggle favorite cook');
    } catch (err) {
      _error = err.toString();
      debugPrint('Toggle favorite cook error: $err');
      return false;
    }
  }

  bool isProductFavorite(String productId) {
    return _favoriteProductIds.contains(productId);
  }

  bool isCookFavorite(String cookId) {
    return _favoriteCookIds.contains(cookId);
  }

  // Convenience methods for UI
  bool isFavorite(String productId) => isProductFavorite(productId);
  
  Future<bool> toggleFavorite(String token, String productId) async {
    return await toggleFavoriteProduct(token, productId);
  }

  List<Food> getFavoriteDishes(List<Food> allDishes) {
    return allDishes.where((dish) => isProductFavorite(dish.id)).toList();
  }

  Map<String, dynamic>? getFavoriteContext(String productId) {
    return _favoriteContexts[productId];
  }
}
