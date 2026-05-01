import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';
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
        final decoded = json.decode(saved);
        if (decoded is Map) {
          _cookTimingPreferences = Map<String, String>.from(decoded);
        }
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
          
          // STOCK CHECK: Set quantity to 0 for items that might be out of stock
          // (This will be validated against live stock when user tries to checkout)
          // For now, we keep quantity as-is but checkout will validate
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
    
    // UNIFIED CART: Sync to backend if logged in
    if (_currentUserId != null) {
      _syncCartToBackend();
    }
  }

  // UNIFIED CART: Sync cart to backend (content-only, no pricing/logic)
  Timer? _syncDebounceTimer;
  
  void _syncCartToBackend() {
    // Debounce sync to avoid excessive API calls
    _syncDebounceTimer?.cancel();
    _syncDebounceTimer = Timer(const Duration(seconds: 1), () async {
      if (_currentUserId == null) return;  // ✅ Only check user ID, allow empty cart sync
      
      try {
        final token = await _getAuthToken();
        if (token == null) {
          debugPrint('⚠️ [CART_SYNC] No auth token, skipping sync');
          return;
        }

        debugPrint('🔄 [CART_SYNC] Syncing ${_cartItems.length} items to backend');

        // Extract content + display snapshot for backend storage
        final minimalItems = _cartItems.map((item) => <String, dynamic>{
          // Core fields
          'offerId': item.foodId,
          'adminDishId': item.dishId,
          'cookId': item.cookId,
          'portionKey': item.portionKey,
          'quantity': item.quantity,
          'fulfillmentMode': item.fulfillmentMode,
          'countryCode': item.countryCode,
          // Display snapshot (for cross-platform rendering)
          'dishName': item.foodName,
          'photoUrl': item.photoUrl,
          'cookName': item.cookName,
          'priceAtAdd': item.priceAtAdd ?? item.price,
          'deliveryFee': item.deliveryFee,
          'prepTime': item.prepTime,
        }).toList();

        // PROOF LOG: Show exact payload being sent
        debugPrint('📤 [CART_SYNC PROOF] Payload:');
        for (int i = 0; i < minimalItems.length; i++) {
          final item = minimalItems[i];
          debugPrint('   Item $i: offerId=${item['offerId']}, dishName=${item['dishName']}, cookName=${item['cookName']}, qty=${item['quantity']}, portionKey=${item['portionKey']}');
        }

        debugPrint('🔄 [CART_SYNC] Sending sync request: ${minimalItems.length} items');
        
        final response = await http.post(
          Uri.parse(ApiConfig.syncCart),
          headers: {
            'Authorization': 'Bearer $token',
            'Content-Type': 'application/json',
          },
          body: jsonEncode({
            'items': minimalItems,
            'countryCode': _currentCountry
          }),
        );

        debugPrint('📥 [CART_SYNC] Response status: ${response.statusCode}');
        debugPrint('📥 [CART_SYNC] Response body: ${response.body.substring(0, response.body.length > 200 ? 200 : response.body.length)}');
        
        if (response.statusCode == 200) {
          debugPrint('✅ [CART_SYNC] Synced to backend: ${minimalItems.length} items');
        } else {
          debugPrint('❌ [CART_SYNC] Sync failed: ${response.statusCode}');
        }
      } catch (e) {
        debugPrint('❌ [CART_SYNC] Failed to sync to backend: $e');
      }
    });
  }

  // UNIFIED CART: Fetch cart from backend (PUBLIC for cart screen refresh)
  Future<void> fetchCartFromBackend() async {
    if (_currentUserId == null) {
      debugPrint('⚠️ [CART_SYNC] No user ID, skipping fetch from backend');
      return;
    }
    
    try {
      final token = await _getAuthToken();
      if (token == null) {
        debugPrint('⚠️ [CART_SYNC] No auth token, skipping fetch from backend');
        return;
      }

      debugPrint('🔄 [CART_SYNC] Fetching cart from backend...');
      
      final response = await http.get(
        Uri.parse('${ApiConfig.getCart}?countryCode=$_currentCountry'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      debugPrint('📥 [CART_SYNC] Fetch response status: ${response.statusCode}');
      debugPrint('📥 [CART_SYNC] Fetch response body: ${response.body.substring(0, response.body.length > 300 ? 300 : response.body.length)}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['items'] != null) {
          final backendItems = data['items'] as List;
          
          debugPrint('📦 [CART_SYNC] Fetched ${backendItems.length} items from backend');
          
          if (backendItems.isNotEmpty) {
            // Backend has items - only load if local is empty
            if (_cartItems.isEmpty) {
              debugPrint('🔄 [CART_SYNC] Loading backend cart into local storage (local was empty)');
              
              // Convert backend items to CartItem (with display snapshot)
              _cartItems = backendItems.map((item) => CartItem(
                id: DateTime.now().millisecondsSinceEpoch.toString(),
                foodId: item['offerId'] as String,
                foodName: item['dishName'] as String? ?? 'Loading...',
                price: (item['priceAtAdd'] as num?)?.toDouble() ?? 0,
                quantity: (item['quantity'] as num).toInt(),
                cookId: item['cookId'] as String,
                cookName: item['cookName'] as String? ?? 'Loading...',
                countryCode: item['countryCode'] as String? ?? _currentCountry,
                dishId: item['adminDishId'] as String?,
                portionKey: item['portionKey'] as String,
                fulfillmentMode: item['fulfillmentMode'] as String? ?? 'delivery',
                priceAtAdd: (item['priceAtAdd'] as num?)?.toDouble(),
                deliveryFee: (item['deliveryFee'] as num?)?.toDouble() ?? 0,
                prepTime: (item['prepTime'] as num?)?.toInt() ?? 30,
                photoUrl: item['photoUrl'] as String?,
              )).toList();
              
              await _saveCart();
              notifyListeners();
              
              debugPrint('✅ [CART_SYNC] Backend cart loaded: ${_cartItems.length} items');
            } else {
              debugPrint('⚠️ [CART_SYNC] Local cart not empty (${_cartItems.length} items), keeping local cart');
            }
          } else {
            // Backend cart is empty - clear local cart if it has items
            if (_cartItems.isNotEmpty) {
              debugPrint('🔄 [CART_SYNC] Backend cart is empty, clearing local cart');
              _cartItems.clear();
              await _saveCart();
              notifyListeners();
            } else {
              debugPrint('⚠️ [CART_SYNC] Backend cart is empty, local cart already empty');
            }
          }
        } else {
          debugPrint('⚠️ [CART_SYNC] Invalid response format: success=${data['success']}, items=${data['items']}');
        }
      } else {
        debugPrint('❌ [CART_SYNC] Fetch failed with status: ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('❌ [CART_SYNC] Failed to fetch from backend: $e');
    }
  }

  // Helper to get auth token
  Future<String?> _getAuthToken() async {
    // Try to get from SharedPreferences (stored by auth provider)
    // AuthProvider stores token as 'authToken' (not 'auth_token')
    return _prefs.getString('authToken');
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
    // UNIFIED CART: Fetch from backend if logged in
    if (userId != null) {
      fetchCartFromBackend();
    }
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
    int? currentStock, // CRITICAL: Current stock for validation
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
    
    // CRITICAL: Validate total quantity (existing + new) does not exceed stock
    if (currentStock != null && currentStock > 0) {
      if (existingIndex >= 0) {
        final existingQuantity = _cartItems[existingIndex].quantity;
        final newTotal = existingQuantity + 1;
        if (newTotal > currentStock) {
          debugPrint('⚠️ [CART] Cannot add: existing($existingQuantity) + new(1) = $newTotal > stock($currentStock)');
          throw Exception('Stock exceeded. Available: $currentStock, In cart: $existingQuantity');
        }
      } else {
        // New item - check if stock is at least 1
        if (currentStock <= 0) {
          debugPrint('⚠️ [CART] Cannot add: out of stock');
          throw Exception('Out of stock');
        }
      }
    }

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
       currentStock: currentStock, // CRITICAL: Update stock on merge
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
       currentStock: currentStock, // CRITICAL: Store stock when adding
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
        
        // CRITICAL: Validate quantity against currentStock
        if (item.currentStock != null && quantity > item.currentStock!) {
          debugPrint('⚠️ [UPDATE-QTY] Blocked: requested qty=$quantity exceeds stock=${item.currentStock}');
          throw Exception('Cannot exceed stock (${item.currentStock})');
        }
        
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
          currentStock: item.currentStock, // CRITICAL: Preserve currentStock
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
      debugPrint('💾 [CART] Cart saved, sync triggered if logged in (userId=$_currentUserId)');
      
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
    
    // Also explicitly clear all possible cart storage keys to ensure complete cleanup
    await _prefs.remove('foodie_cart');
    await _prefs.remove('cart_guest_SA');
    await _prefs.remove('cart_guest_AE');
    await _prefs.remove('cart_guest_KW');
    
    // Clear user-specific keys if logged in
    if (_currentUserId != null && _currentUserId!.isNotEmpty) {
      await _prefs.remove('cart_$_currentUserId-SA');
      await _prefs.remove('cart_$_currentUserId-AE');
      await _prefs.remove('cart_$_currentUserId-KW');
    }
    
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

  // CRITICAL: Refresh cart with live stock levels (called on cart open)
  // Adjusts quantities to available stock, removes out-of-stock items
  Future<Map<String, dynamic>?> refreshCartStock(String token) async {
    if (_cartItems.isEmpty) {
      return null;
    }
    
    try {
      debugPrint('🔄 [CART] Refreshing cart stock with backend...');
      
      final response = await http.post(
        Uri.parse(ApiConfig.refreshCartStock),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'cartItems': _cartItems.map((item) {
            return <String, dynamic>{
              'offerId': item.foodId, // CRITICAL: Use foodId (DishOffer._id), not dishId
              'dishId': item.dishId,
              'portionKey': item.portionKey,
              'quantity': item.quantity,
              'name': item.foodName,
              'cookId': item.cookId,
            };
          }).toList(),
        }),
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        if (data['success'] == true) {
          final removedItems = data['removedItems'] as List;
          final updatedItems = data['updatedItems'] as List;
          
          debugPrint('✅ [CART] Stock refresh complete: ${removedItems.length} items removed');
          
          // Remove out-of-stock items from local cart
          for (final removed in removedItems) {
            final itemId = removed['id'] as String; // This is offerId (foodId)
            _cartItems.removeWhere((item) => item.foodId == itemId);
          }
          
          // Update quantities for items with reduced stock
          for (final updated in updatedItems) {
            final itemId = updated['offerId'] as String; // This is offerId (foodId)
            final int newQuantity = (updated['quantity'] as num).toInt();
            final int currentStock = (updated['currentStock'] as num?)?.toInt() ?? 0;
            final int itemIndex = _cartItems.indexWhere((item) => item.foodId == itemId);
            
            if (itemIndex >= 0 && _cartItems[itemIndex].quantity != newQuantity) {
              // Re-create CartItem with new quantity and stock
              final oldItem = _cartItems[itemIndex];
              _cartItems[itemIndex] = CartItem(
                id: oldItem.id,
                foodId: oldItem.foodId,
                foodName: oldItem.foodName,
                price: oldItem.price,
                quantity: newQuantity,
                cookId: oldItem.cookId,
                cookName: oldItem.cookName,
                countryCode: oldItem.countryCode,
                dishId: oldItem.dishId,
                portionKey: oldItem.portionKey,
                fulfillmentMode: oldItem.fulfillmentMode,
                priceAtAdd: oldItem.priceAtAdd,
                deliveryFee: oldItem.deliveryFee,
                prepTime: oldItem.prepTime,
                photoUrl: oldItem.photoUrl,
                extras: oldItem.extras,
                pickupLocationId: oldItem.pickupLocationId,
                currentStock: currentStock,
              );
              debugPrint('📦 [CART] Updated quantity: ${oldItem.foodName} ${oldItem.quantity}→$newQuantity, stock=$currentStock');
            }
          }
          
          // Save updated cart and notify listeners
          await _saveCart();
          notifyListeners();
          
          return data;
        }
      }
      
      return null;
    } catch (e) {
      debugPrint('❌ [CART] Stock refresh failed: $e');
      return null;
    }
  }
}
