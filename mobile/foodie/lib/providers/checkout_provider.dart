import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../models/checkout_session.dart';
import '../config/api_config.dart';
import 'package:uuid/uuid.dart';

class CheckoutProvider with ChangeNotifier {
  CheckoutSession? _session;
  bool _isLoading = false;
  String? _error;
  int _currentStep = 0;

  CheckoutSession? get session => _session;
  bool get isLoading => _isLoading;
  String? get error => _error;
  int get currentStep => _currentStep;

  // Helper to safely notify listeners (defer if during build)
  void _safeNotifyListeners() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      notifyListeners();
    });
  }

  void setCurrentStep(int step) {
    _currentStep = step;
    _safeNotifyListeners();
  }

  void nextStep() {
    if (_currentStep < 3) {
      _currentStep++;
      _safeNotifyListeners();
    }
  }

  void previousStep() {
    if (_currentStep > 0) {
      _currentStep--;
      _safeNotifyListeners();
    }
  }

  Future<bool> createSession(List<Map<String, dynamic>> cartItems, String token,
      {String countryCode = 'SA'}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/checkout/session'),
        headers: {
  'Content-Type': 'application/json',
  'x-country-code': countryCode,
  if (token.isNotEmpty) 'Authorization': 'Bearer $token',
},
        body: json.encode({'cartItems': cartItems, 'countryCode': countryCode}),
      );

      if (response.statusCode == 201) {
        final data = json.decode(response.body);
        _session = CheckoutSession.fromJson(data['data']['session']);
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _error =
            json.decode(response.body)['message'] ?? 'Failed to create session';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Network error: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateAddress(String addressId, String token) async {
    if (_session == null) return false;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await http.patch(
        Uri.parse(
            '${ApiConfig.baseUrl}/checkout/session/${_session!.id}/address'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({
          'addressId': addressId,
        }),
      );

      if (response.statusCode == 200) {
        await fetchSession(_session!.id, token);
        return true;
      } else {
        _error =
            json.decode(response.body)['message'] ?? 'Failed to update address';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Network error: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> applyCoupon(String code, String token) async {
    if (_session == null) return false;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await http.post(
        Uri.parse(
            '${ApiConfig.baseUrl}/checkout/session/${_session!.id}/coupon'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({'code': code}),
      );

      if (response.statusCode == 200) {
        await fetchSession(_session!.id, token);
        return true;
      } else {
        _error = json.decode(response.body)['message'] ?? 'Invalid coupon';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Network error: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> removeCoupon(String token) async {
    if (_session == null) return false;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await http.delete(
        Uri.parse(
            '${ApiConfig.baseUrl}/checkout/session/${_session!.id}/coupon'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        await fetchSession(_session!.id, token);
        return true;
      } else {
        _error = 'Failed to remove coupon';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Network error: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> setPaymentMethod(String method, String token) async {
    if (_session == null) return false;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await http.patch(
        Uri.parse(
            '${ApiConfig.baseUrl}/checkout/session/${_session!.id}/payment-method'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({'method': method}),
      );

      if (response.statusCode == 200) {
        await fetchSession(_session!.id, token);
        return true;
      } else {
        _error = 'Failed to set payment method';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Network error: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<String?> confirmOrder(String token) async {
    if (_session == null) return null;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final idempotencyKey = const Uuid().v4();
      
      // DEBUG: Log request details
      debugPrint('🛒 [CHECKOUT] Confirm order request:');
      debugPrint('🛒 [CHECKOUT]   sessionId: ${_session!.id}');
      debugPrint('🛒 [CHECKOUT]   idempotencyKey: $idempotencyKey');
      debugPrint('🛒 [CHECKOUT]   token exists: ${token.isNotEmpty}');
      debugPrint('🛒 [CHECKOUT]   session address: ${_session!.addressSnapshot}');

      final response = await http.post(
        Uri.parse(
            '${ApiConfig.baseUrl}/checkout/session/${_session!.id}/confirm'),
        headers: {
          'Content-Type': 'application/json',
          if (token.isNotEmpty) 'Authorization': 'Bearer $token',
        },
        body: json.encode({'idempotencyKey': idempotencyKey}),
      );

      // DEBUG: Log response
      debugPrint('🛒 [CHECKOUT] Response status: ${response.statusCode}');
      debugPrint('🛒 [CHECKOUT] Response body: ${response.body}');

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = json.decode(response.body);
        final orderId = data['data']['orderId'];
        _isLoading = false;
        notifyListeners();
        return orderId;
      } else {
        _error =
            json.decode(response.body)['message'] ?? 'Failed to place order';
        _isLoading = false;
        notifyListeners();
        return null;
      }
    } catch (e) {
      debugPrint('🛒 [CHECKOUT] Error: $e');
      _error = 'Network error: $e';
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  Future<void> fetchSession(String sessionId, String token) async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/checkout/session/$sessionId'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        _session = CheckoutSession.fromJson(data['data']);
        _isLoading = false;
        notifyListeners();
      }
    } catch (e) {
      _error = 'Failed to fetch session';
      _isLoading = false;
      notifyListeners();
    }
  }

  void clearSession() {
    _session = null;
    _currentStep = 0;
    _error = null;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
  
  // CRITICAL: Validate cart stock before checkout
  // Returns null if all items in stock, otherwise returns list of unavailable items
  Future<Map<String, dynamic>?> validateCartStock(String token) async {
    if (_session?.cartSnapshot == null || _session!.cartSnapshot.isEmpty) {
      return null; // No items to validate
    }
    
    try {
      debugPrint('🔍 [CHECKOUT] Validating cart stock before checkout...');
      
      final response = await http.post(
        Uri.parse(ApiConfig.validateCartStock),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode({
          'sessionId': _session?.id,
          'cartItems': _session!.cartSnapshot.map((item) {
            return <String, dynamic>{
              'dishOfferId': item.dishOffer ?? item.dishId,
              'portionKey': item.portionKey ?? '',
              'quantity': item.quantity,
              'name': item.dishName,
            };
          }).toList(),
        }),
      );
      
      if (response.statusCode == 200) {
        debugPrint('✅ [CHECKOUT] All cart items in stock');
        return null; // All items in stock
      }
      
      if (response.statusCode == 400) {
        final data = json.decode(response.body);
        debugPrint('⚠️ [CHECKOUT] Stock validation failed: ${data['message']}');
        return data; // Return unavailable items
      }
      
      debugPrint('⚠️ [CHECKOUT] Stock validation error: ${response.statusCode}');
      return null; // Allow checkout to proceed on error
      
    } catch (e) {
      debugPrint('❌ [CHECKOUT] Stock validation exception: $e');
      return null; // Allow checkout to proceed on error
    }
  }
}
