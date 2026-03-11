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
  
  // Per-cook timing preference: 'combined' or 'separate' (mirrors web localStorage)
  Map<String, String> _cookTimingPreferences = {};
  
  CartProvider(this._prefs) {
    _loadCart();
    _loadTimingPreferences();
  }
  
  void _loadTimingPreferences() {
    // Load from SharedPreferences (mirrors web localStorage)
    final saved = _prefs.getString('cookTimingPreferences');
    if (saved != null) {
      try {
        _cookTimingPreferences = Map<String, String>.from(json.decode(saved));
      } catch (e) {
        _cookTimingPreferences = {};
      }
    }
  }
  
  Future<void> _saveTimingPreferences() async {
    await _prefs.setString('cookTimingPreferences', json.encode(_cookTimingPreferences));
  }
  
  // Get timing preference for a cook
  String getCookTimingPreference(String cookId) {
    return _cookTimingPreferences[cookId] ?? 'separate';
  }
  
  // Toggle timing preference for a cook
  Future<void> toggleCookTimingPreference(String cookId) async {
    final current = _cookTimingPreferences[cookId] ?? 'separate';
    _cookTimingPreferences[cookId] = current == 'combined' ? 'separate' : 'combined';
    await _saveTimingPreferences();
    notifyListeners();
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

  // GETTER: Total delivery fee (with batching and per-cook timing preference)
  double get totalDeliveryFee {
    final result = calcDeliveryFees(_cartItems, cookCombineConfig: _cookTimingPreferences);
    return result.totalDeliveryFee;
  }

  // GETTER: Delivery fee by cook
  Map<String, double> get deliveryFeeByCook {
    final result = calcDeliveryFees(_cartItems, cookCombineConfig: _cookTimingPreferences);
    return result.deliveryFeeByCook;
  }

  // GETTER: Batch count by cook
  Map<String, int> get batchCountByCook {
    final result = calcDeliveryFees(_cartItems, cookCombineConfig: _cookTimingPreferences);
    return result.batchCountByCook;
  }

  // GETTER: Check if toggle should be shown for a cook (mirrors web: hasDeliveryItems && items > 1 && batches > 1)
  bool shouldShowTimingToggle(String cookId, List<CartItem> items) {
   final deliveryItems = items.where((item) => item.fulfillmentMode == 'delivery').toList();
   if (deliveryItems.isEmpty) return false;
   if (items.length <= 1) return false;
    
    // Count unique prep times regardless of current preference
   final uniquePrepTimes = <int>{};
   for(final item in deliveryItems) {
     uniquePrepTimes.add(item.prepTime);
    }
    
    // Show toggle only if there are multiple different prep times
   return uniquePrepTimes.length > 1;
  }

  // GETTER: Get delivery items for a cook
  List<CartItem> getDeliveryItemsForCook(List<CartItem> items) {
    return items.where((item) => item.fulfillmentMode == 'delivery').toList();
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
  int _findItemIndex(String cookId, String offerId, String? portionKey, String? fulfillmentMode, {String? extras, String? pickupLocationId}) {
    for (int i = 0; i < _cartItems.length; i++) {
      final item = _cartItems[i];
      final sameCook = item.cookId == cookId;
      final sameOffer = item.foodId == offerId;
      final samePortion = (item.portionKey ?? '') == (portionKey ?? '');
      final sameFulfillment = (item.fulfillmentMode ?? 'pickup') == (fulfillmentMode ?? 'pickup');
      
      // Treat null/empty extras as equivalent (backward compatible)
      final itemExtras = item.extras ?? '';
      final newExtras = extras ?? '';
      final sameExtras = itemExtras.isEmpty || newExtras.isEmpty || itemExtras == newExtras;
      
      // Treat null/empty pickupLocationId as equivalent (backward compatible)
      final itemPickup = item.pickupLocationId ?? '';
      final newPickup = pickupLocationId ?? '';
      final samePickup = itemPickup.isEmpty || newPickup.isEmpty || itemPickup == newPickup;
      
      if (sameCook && sameOffer && samePortion && sameFulfillment && sameExtras && samePickup) {
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
    String? photoUrl, // Dish image for cart display
    String? extras, // Normalized JSON string of extra IDs (for cart identity)
    String? pickupLocationId, // Pickup location ID (for cart identity)
  }) async {
   // DEBUG: Print received parameters
   debugPrint('🛒 [CARTPROVIDER-RECEIVED] ==========');
   debugPrint('🛒 [RECEIVED] photoUrl: $photoUrl');
   debugPrint('🛒 [RECEIVED] deliveryFee: $deliveryFee');
   debugPrint('🛒 [RECEIVED] fulfillmentMode: $fulfillmentMode');
   debugPrint('🛒 [RECEIVED] countryCode: $countryCode');
   debugPrint('🛒 [RECEIVED] prepReadyConfig: $prepReadyConfig');
   debugPrint('🛒 [RECEIVED] numericPrepTime: $numericPrepTime');
   debugPrint('🛒 [RECEIVED] portionKey: $portionKey');
   debugPrint('🛒 [RECEIVED] foodId: $foodId');
   debugPrint('🛒 [RECEIVED] cookId: $cookId');
   debugPrint('🛒 [CARTPROVIDER-RECEIVED] ==========');
   
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
    final existingIndex = _findItemIndex(cookId, foodId, normalizedPortion, normalizedFulfillment, extras: extras, pickupLocationId: pickupLocationId);

    if (existingIndex >= 0) {
     // Update quantity of existing item
  final existing = _cartItems[existingIndex];
    debugPrint('🛒 [ADDTOCART-MERGE] Merging with existing item:');
    debugPrint('🛒 [ADDTOCART-MERGE]   foodId=${existing.foodId}, foodName=${existing.foodName}');
    debugPrint('🛒 [ADDTOCART-MERGE]   existing.photoUrl=${existing.photoUrl}');
    debugPrint('🛒 [ADDTOCART-MERGE]   new photoUrl=$photoUrl');
    debugPrint('🛒 [ADDTOCART-MERGE]  resolved photoUrl=${existing.photoUrl ?? photoUrl}');
     _cartItems[existingIndex] = CartItem(
      id: existing.id,
     foodId: existing.foodId,
     foodName: existing.foodName,
       price: existing.price,
       quantity: existing.quantity +1,
    cookId: existing.cookId,
    cookName: existing.cookName,
    countryCode: normalizedCountry,
       dishId: dishId,
       portionKey: normalizedPortion,
     fulfillmentMode: normalizedFulfillment,
       priceAtAdd: normalizedPrice,
    deliveryFee: actualDeliveryFee,
       prepTime: computedPrepTime,
       photoUrl: existing.photoUrl ?? photoUrl, // Keep existing image or use new one
       extras: existing.extras ?? extras, // Keep existing extras or use new
       pickupLocationId: existing.pickupLocationId ?? pickupLocationId, // Keep existing pickup location or use new
     );
    debugPrint('🛒 [ADDTOCART-MERGE]   MERGED item qty=${_cartItems[existingIndex].quantity}, photoUrl=${_cartItems[existingIndex].photoUrl}');

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
       photoUrl: photoUrl,
       extras: extras,
       pickupLocationId: pickupLocationId,
     );
     _cartItems.add(newItem);
       
   // DEBUG: Print stored CartItem values
   debugPrint('🛒 [CARTITEM-STORED] ==========');
   debugPrint('🛒 [STORED] photoUrl: ${newItem.photoUrl}');
   debugPrint('🛒 [STORED] deliveryFee: ${newItem.deliveryFee}');
   debugPrint('🛒 [STORED] fulfillmentMode: ${newItem.fulfillmentMode}');
   debugPrint('🛒 [STORED] prepTime: ${newItem.prepTime}');
   debugPrint('🛒 [STORED] cookId: ${newItem.cookId}');
   debugPrint('🛒 [CARTITEM-STORED] ==========');
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
    String? extras,
    String? pickupLocationId,
  }) async {
    // DEBUG: Log received parameters
    debugPrint('🔘 [UPDATE-QTY] RECEIVED: cookId=$cookId, offerId=$offerId, quantity=$quantity, portionKey=$portionKey, fulfillmentMode=$fulfillmentMode');
    
    final index = _findItemIndex(cookId, offerId, portionKey, fulfillmentMode, extras: extras, pickupLocationId: pickupLocationId);
    
    // DEBUG: Log search result
    debugPrint('🔘 [UPDATE-QTY] SEARCH RESULT: index=$index');
    if (index >= 0) {
      final item = _cartItems[index];
      debugPrint('🔘 [UPDATE-QTY] FOUND ITEM: cookId=${item.cookId}, foodId=${item.foodId}, portionKey=${item.portionKey}, fulfillmentMode=${item.fulfillmentMode}, qty=${item.quantity}, photoUrl=${item.photoUrl}');
      
      // DEBUG: Dump entire cart BEFORE update
      debugPrint('🔘 [UPDATE-QTY] CART BEFORE UPDATE (${_cartItems.length} items):');
      for (int i = 0; i < _cartItems.length; i++) {
      final cartItem = _cartItems[i];
        debugPrint('🔘 [UPDATE-QTY]   CART[$i]: cookId=${cartItem.cookId}, foodId=${cartItem.foodId}, foodName=${cartItem.foodName}, qty=${cartItem.quantity}, photoUrl=${cartItem.photoUrl}, portionKey=${cartItem.portionKey}, fulfillmentMode=${cartItem.fulfillmentMode}');
      }
    } else {
      debugPrint('🔘 [UPDATE-QTY] ITEM NOT FOUND - checking all cart items:');
      for (int i = 0; i < _cartItems.length; i++) {
        final item = _cartItems[i];
        debugPrint('🔘 [UPDATE-QTY] CART[$i]: cookId=${item.cookId}, foodId=${item.foodId}, portionKey=${item.portionKey}, fulfillmentMode=${item.fulfillmentMode}');
      }
    }
    
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
          photoUrl: item.photoUrl, // FIX: Preserve photoUrl
          extras: item.extras,     // FIX: Preserve extras
          pickupLocationId: item.pickupLocationId, // FIX: Preserve pickupLocationId
        );
       debugPrint('🔘 [UPDATE-QTY] UPDATED item at index $index: qty ${item.quantity} -> $quantity, photoUrl preserved: ${item.photoUrl != null}');
      }
      
      // DEBUG: Dump entire cart AFTER update
     debugPrint('🔘 [UPDATE-QTY] CART AFTER UPDATE (${_cartItems.length} items):');
      for (int i = 0; i < _cartItems.length; i++) {
       final cartItem = _cartItems[i];
       debugPrint('🔘 [UPDATE-QTY]   CART[$i]: cookId=${cartItem.cookId}, foodId=${cartItem.foodId}, foodName=${cartItem.foodName}, qty=${cartItem.quantity}, photoUrl=${cartItem.photoUrl}');
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
    String? extras,
    String? pickupLocationId,
  }) async {
    final index = _findItemIndex(cookId, offerId, portionKey, fulfillmentMode, extras: extras, pickupLocationId: pickupLocationId);
    
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
