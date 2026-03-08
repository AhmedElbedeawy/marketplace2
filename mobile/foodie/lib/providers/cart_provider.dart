import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/cart.dart';
import '../utils/delivery_fee_calculator.dart';
import '../utils/prep_time_utils.dart';

class CartProvider extends ChangeNotifier {
  final SharedPreferences _prefs;
  
  // Match web: cart_guest_{countryCode} or cart_{userId}_{countryCode}
  // Also maintain foodie_cart for legacy compatibility
  String _getStorageKey(String countryCode, {String? userId}) {
    if (userId != null && userId.isNotEmpty) {
      return 'cart_${userId}_$countryCode';
    }
    return 'cart_guest_$countryCode';
  }

  List<CartItem> _cartItems = [];
  String _currentCountry = 'SA';
  String? _currentUserId;
  
  CartProvider(this._prefs) {
    _loadCart();
  }

  void _loadCart() {
    // Try user-specific key first, then guest key
    final userKey = _getStorageKey(_currentCountry, userId: _currentUserId);
    var saved = _prefs.getString(userKey);
    
    // Fallback to legacy key
    saved ??= _prefs.getString('foodie_cart');
    saved ??= _prefs.getString('cart_guest_SA');
    
    if (saved != null) {
      try {
        final decoded = json.decode(saved);
        if (decoded is List) {
          _cartItems = decoded
              .map((item) => CartItem.fromJson(Map<String, dynamic>.from(item)))
              .toList();
        }
      } catch (e) {
        _cartItems = [];
      }
    }
  }

  Future<void> _saveCart() async {
    final jsonString = json.encode(_cartItems.map((item) => item.toJson()).toList());
    
    // Save to country-specific key (like web)
    final userKey = _getStorageKey(_currentCountry, userId: _currentUserId);
    await _prefs.setString(userKey, jsonString);
    
    // Also save to legacy key for compatibility
    await _prefs.setString('foodie_cart', jsonString);
  }

  void updateCountry(String countryCode) {
    final normalized = countryCode.trim().toUpperCase();
    if (normalized.isEmpty) {
      _currentCountry = 'SA';
    } else {
      _currentCountry = normalized;
    }
    // Reload cart for new country
    _loadCart();
    notifyListeners();
  }

  void setUserId(String? userId) {
    _currentUserId = userId;
    // Reload cart for new user
    _loadCart();
    notifyListeners();
  }

  // GETTER: Cart items (flat list like web)
  List<CartItem> get cartItems => _cartItems;

  // GETTER: Current country
  String get currentCountry => _currentCountry;

  // GETTER: Total price
  double get totalPrice {
    double total = 0;
    for (final item in _cartItems) {
      total += item.subtotal;
    }
    return total;
  }

  // GETTER: Total delivery fee (with batching)
  double get totalDeliveryFee {
    final result = calcDeliveryFees(_cartItems);
    return result.totalDeliveryFee;
  }

  // GETTER: Delivery fee by cook
  Map<String, double> get deliveryFeeByCook {
    final result = calcDeliveryFees(_cartItems);
    return result.deliveryFeeByCook;
  }

  // GETTER: Batch count by cook
  Map<String, int> get batchCountByCook {
    final result = calcDeliveryFees(_cartItems);
    return result.batchCountByCook;
  }

  // GETTER: Total items count
  int get totalItems {
    int total = 0;
    for (final item in _cartItems) {
      total += item.quantity;
    }
    return total;
  }

  // GETTER: Check if empty
  bool get isEmpty => _cartItems.isEmpty;

  // IDENTITY: Same as web app
  // same cook + same offer + same portion + same fulfillment → increase quantity
  // Different portion → new cart line
  int _findItemIndex(String cookId, String offerId, String? portionKey, String? fulfillmentMode) {
    for (int i = 0; i < _cartItems.length; i++) {
      final item = _cartItems[i];
      final sameCook = item.cookId == cookId;
      final sameOffer = item.foodId == offerId;
      final samePortion = (item.portionKey ?? '') == (portionKey ?? '');
      final sameFulfillment = (item.fulfillmentMode ?? 'pickup') == (fulfillmentMode ?? 'pickup');
      
      if (sameCook && sameOffer && samePortion && sameFulfillment) {
        return i;
      }
    }
    return -1;
  }

  // CENTRALIZED: Compute prep time from prepReadyConfig (single source of truth)
  static int computePrepTime(Map<String, dynamic>? prepReadyConfig, {int? numericPrepTime}) {
    if (prepReadyConfig != null) {
      final result = PrepTimeUtils.computePrepTime(prepReadyConfig);
      debugPrint('🕒 [CART-PREP] Computed from cutoff config: ${result.prepTimeMinutes} min (${result.prepTimeText})');
      return result.prepTimeMinutes;
    }
    
    // No config - use numeric prepTime
    if (numericPrepTime != null) {
      debugPrint('🕒 [CART-PREP] Using numeric prepTime: $numericPrepTime min');
      return numericPrepTime;
    }
    
    // Fallback - log warning
    debugPrint('⚠️ [CART-PREP-WARNING] No prepReadyConfig or numeric prepTime, using fallback 30 min');
    return 30;
  }

  // ADD TO CART: Match web logic exactly
  Future<void> addToCart({
    required String foodId, // offerId = DishOffer._id
    required String foodName,
    required double price,
    required String cookId,
    required String cookName,
    String? countryCode,
    String? dishId,
    String? portionKey,
    String? fulfillmentMode,
    double? priceAtAdd,
    double deliveryFee = 0.0, // 0 for pickup, actual fee for delivery
    Map<String, dynamic>? prepReadyConfig, // Prep time config (cutoff/fixed/range)
    int? numericPrepTime, // Fallback numeric prep time
  }) async {
    // CENTRALIZED: Compute prep time (single source of truth)
    final computedPrepTime = computePrepTime(prepReadyConfig, numericPrepTime: numericPrepTime);
    
    // Normalize parameters (match web defaults)
    final normalizedCountry = (countryCode ?? _currentCountry).toUpperCase().trim();
    final normalizedPortion = portionKey ?? 'default';
    final normalizedFulfillment = fulfillmentMode ?? 'pickup';
    final normalizedPrice = priceAtAdd ?? price;
    
    // CRITICAL: If pickup, deliveryFee MUST be 0
    final actualDeliveryFee = normalizedFulfillment == 'pickup' ? 0.0 : deliveryFee;

    // Check for existing item with same identity
    final existingIndex = _findItemIndex(cookId, foodId, normalizedPortion, normalizedFulfillment);

    if (existingIndex >= 0) {
      // Update quantity of existing item
      final existing = _cartItems[existingIndex];
      _cartItems[existingIndex] = CartItem(
        id: existing.id,
        foodId: existing.foodId,
        foodName: existing.foodName,
        price: existing.price,
        quantity: existing.quantity + 1,
        cookId: existing.cookId,
        cookName: existing.cookName,
        countryCode: normalizedCountry,
        dishId: dishId,
        portionKey: normalizedPortion,
        fulfillmentMode: normalizedFulfillment,
        priceAtAdd: normalizedPrice,
        deliveryFee: actualDeliveryFee,
        prepTime: computedPrepTime,
      );
    } else {
      // Add new item
      final newItem = CartItem(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        foodId: foodId, // offerId
        foodName: foodName,
        price: normalizedPrice,
        quantity: 1,
        cookId: cookId,
        cookName: cookName,
        countryCode: normalizedCountry,
        dishId: dishId,
        portionKey: normalizedPortion,
        fulfillmentMode: normalizedFulfillment,
        priceAtAdd: normalizedPrice,
        deliveryFee: actualDeliveryFee,
        prepTime: computedPrepTime,
      );
      _cartItems.add(newItem);
    }

    await _saveCart();
    notifyListeners();
  }

  // UPDATE QUANTITY
  Future<void> updateQuantity(
    String cookId, 
    String offerId, 
    int quantity, {
    String? portionKey,
    String? fulfillmentMode,
  }) async {
    final index = _findItemIndex(cookId, offerId, portionKey, fulfillmentMode);
    
    if (index >= 0) {
      if (quantity <= 0) {
        _cartItems.removeAt(index);
      } else {
        final item = _cartItems[index];
        _cartItems[index] = CartItem(
          id: item.id,
          foodId: item.foodId,
          foodName: item.foodName,
          price: item.price,
          quantity: quantity,
          cookId: item.cookId,
          cookName: item.cookName,
          countryCode: item.countryCode ?? _currentCountry,
          dishId: item.dishId,
          portionKey: item.portionKey,
          fulfillmentMode: item.fulfillmentMode,
          priceAtAdd: item.priceAtAdd,
          deliveryFee: item.deliveryFee,
          prepTime: item.prepTime,
        );
      }
      await _saveCart();
      notifyListeners();
    }
  }

  // REMOVE ITEM
  Future<void> removeFromCart(
    String cookId, 
    String offerId, {
    String? portionKey,
    String? fulfillmentMode,
  }) async {
    final index = _findItemIndex(cookId, offerId, portionKey, fulfillmentMode);
    
    if (index >= 0) {
      _cartItems.removeAt(index);
      await _saveCart();
      notifyListeners();
    }
  }

  // CLEAR CART
  Future<void> clearCart() async {
    _cartItems.clear();
    await _saveCart();
    notifyListeners();
  }

  // CLEAR CART (alias for compatibility)
  Future<void> clearAllCarts() async {
    await clearCart();
  }

  // CLEAR CART FOR SPECIFIC COOK
  Future<void> clearCartForCook(String cookId) async {
    _cartItems.removeWhere((item) => item.cookId == cookId);
    await _saveCart();
    notifyListeners();
  }
}
