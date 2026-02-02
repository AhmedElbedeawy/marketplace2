import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/cart.dart';

class CartProvider extends ChangeNotifier {
  final SharedPreferences _prefs;
  static const String _key = 'cartsByCountry';
  
  Map<String, dynamic> _cartsByCountry = {}; // { EG: { cookId: [items] }, ... }
  String _currentCountry = 'EG';
  
  final bool _isLoading = false;
  String? _error;

  CartProvider(this._prefs) {
    _loadCarts();
  }

  void _loadCarts() {
    final saved = _prefs.getString(_key);
    if (saved != null) {
      try {
        _cartsByCountry = json.decode(saved);
      } catch (e) {
        _cartsByCountry = {};
      }
    }
  }

  Future<void> _saveCarts() async {
    await _prefs.setString(_key, json.encode(_cartsByCountry));
  }

  void updateCountry(String countryCode) {
    if (_currentCountry != countryCode) {
      _currentCountry = countryCode;
      notifyListeners();
      debugPrint('🛒 Mobile Cart switched to country view: $_currentCountry');
    }
  }

  // Get current country's carts
  Map<String, List<CartItem>> get carts {
    final countryCarts = _cartsByCountry[_currentCountry] as Map<String, dynamic>? ?? {};
    final Map<String, List<CartItem>> result = {};
    
    countryCarts.forEach((cookId, itemsList) {
      if (itemsList is List) {
        result[cookId] = itemsList.map((item) => CartItem.fromJson(item)).toList();
      }
    });
    
    return result;
  }

  bool get isLoading => _isLoading;
  String? get error => _error;

  double get totalPrice {
    double total = 0;
    for (final cookCart in carts.values) {
      for (final item in cookCart) {
        total += item.subtotal;
      }
    }
    return total;
  }

  int get totalItems {
    int total = 0;
    for (final cookCart in carts.values) {
      for (final item in cookCart) {
        total += item.quantity;
      }
    }
    return total;
  }

  Future<void> addToCart({
    required String foodId, // PHASE 4: offerId = DishOffer._id (PRIMARY KEY for uniqueness)
    required String foodName,
    required double price,
    required String cookId, // PHASE 4: kitchenId = Cook._id (for multi-kitchen display grouping)
    required String cookName,
    String? countryCode,
    String? dishId, // PHASE 4: AdminDish._id (metadata only, never used for cart operations)
  }) async {
    try {
      final targetCountry = countryCode ?? _currentCountry;
      
      if (!_cartsByCountry.containsKey(targetCountry)) {
        _cartsByCountry[targetCountry] = {};
      }
      
      final countryCarts = _cartsByCountry[targetCountry] as Map<String, dynamic>;
      
      if (!countryCarts.containsKey(cookId)) {
        countryCarts[cookId] = [];
      }
      
      final items = (countryCarts[cookId] as List);
      
      // PHASE 4: CRITICAL - Cart item uniqueness based on offerId (foodId) ONLY
      // This ensures two different cooks offering same dish create separate cart lines
      final existingItemIndex = items.indexWhere((item) => item['foodId'] == foodId);

      if (existingItemIndex >= 0) {
        // Increment quantity for same offer
        final existingItem = CartItem.fromJson(items[existingItemIndex]);
        existingItem.quantity++;
        items[existingItemIndex] = existingItem.toJson();
      } else {
        // Add new item - each offerId creates a distinct cart line
        final newItem = CartItem(
          id: DateTime.now().toString(),
          foodId: foodId, // offerId = DishOffer._id (unique per cook per dish)
          foodName: foodName,
          price: price,
          quantity: 1,
          cookId: cookId, // kitchenId = Cook._id (for UI grouping)
          cookName: cookName,
          countryCode: targetCountry,
          dishId: dishId, // AdminDish._id (metadata only)
        );
        items.add(newItem.toJson());
      }

      await _saveCarts();
      notifyListeners();
    } catch (e) {
      _error = 'Failed to add item to cart';
      notifyListeners();
    }
  }

  // PHASE 4: Remove uses offerId (foodId) as the key
  Future<void> removeFromCart(String cookId, String offerId) async {
    try {
      if (_cartsByCountry.containsKey(_currentCountry)) {
        final countryCarts = _cartsByCountry[_currentCountry] as Map<String, dynamic>;
        if (countryCarts.containsKey(cookId)) {
          final items = (countryCarts[cookId] as List);
          // PHASE 4: Use offerId (foodId) as the unique identifier
          items.removeWhere((item) => item['foodId'] == offerId);
          if (items.isEmpty) {
            countryCarts.remove(cookId);
          }
        }
      }
      await _saveCarts();
      notifyListeners();
    } catch (e) {
      _error = 'Failed to remove item from cart';
      notifyListeners();
    }
  }

  // PHASE 4: UpdateQuantity uses offerId (foodId) as the key
  Future<void> updateQuantity(String cookId, String offerId, int quantity) async {
    try {
      if (_cartsByCountry.containsKey(_currentCountry)) {
        final countryCarts = _cartsByCountry[_currentCountry] as Map<String, dynamic>;
        if (countryCarts.containsKey(cookId)) {
          final items = (countryCarts[cookId] as List);
          // PHASE 4: Use offerId (foodId) as the unique identifier
          final index = items.indexWhere((item) => item['foodId'] == offerId);
          if (index >= 0) {
            if (quantity <= 0) {
              items.removeAt(index);
              if (items.isEmpty) countryCarts.remove(cookId);
            } else {
              final item = CartItem.fromJson(items[index]);
              item.quantity = quantity;
              items[index] = item.toJson();
            }
          }
        }
      }
      await _saveCarts();
      notifyListeners();
    } catch (e) {
      _error = 'Failed to update quantity';
      notifyListeners();
    }
  }

  Future<void> clearCart(String cookId) async {
    try {
      if (_cartsByCountry.containsKey(_currentCountry)) {
        (_cartsByCountry[_currentCountry] as Map<String, dynamic>).remove(cookId);
      }
      await _saveCarts();
      notifyListeners();
    } catch (e) {
      _error = 'Failed to clear cart';
      notifyListeners();
    }
  }

  Future<void> clearAllCarts() async {
    try {
      _cartsByCountry[_currentCountry] = {};
      await _saveCarts();
      notifyListeners();
    } catch (e) {
      _error = 'Failed to clear carts';
      notifyListeners();
    }
  }

  // Legacy method, now a no-op or proxy to updateCountry
  void validateCartForCountry(String countryCode) {
    updateCountry(countryCode);
  }
}
