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

  void setCurrentStep(int step) {
    _currentStep = step;
    notifyListeners();
  }

  void nextStep() {
    if (_currentStep < 3) {
      _currentStep++;
      notifyListeners();
    }
  }

  void previousStep() {
    if (_currentStep > 0) {
      _currentStep--;
      notifyListeners();
    }
  }

  Future<bool> createSession(List<Map<String, dynamic>> cartItems, String token, {String countryCode = 'SA'}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/checkout/session'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({
          'cartItems': cartItems,
          'countryCode': countryCode
        }),
      );

      if (response.statusCode == 201) {
        final data = json.decode(response.body);
        _session = CheckoutSession.fromJson(data['data']['session']);
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _error = json.decode(response.body)['message'] ?? 'Failed to create session';
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

  Future<bool> updateAddress(String addressLine1, String city, String countryCode, String deliveryNotes, String token, {double? lat, double? lng}) async {
    if (_session == null) return false;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await http.patch(
        Uri.parse('${ApiConfig.baseUrl}/checkout/session/${_session!.id}/address'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({
          'addressLine1': addressLine1,
          'city': city,
          'countryCode': countryCode,
          'lat': lat ?? 0,
          'lng': lng ?? 0,
          'deliveryNotes': deliveryNotes,
        }),
      );

      if (response.statusCode == 200) {
        await fetchSession(_session!.id, token);
        return true;
      } else {
        _error = json.decode(response.body)['message'] ?? 'Failed to update address';
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
        Uri.parse('${ApiConfig.baseUrl}/checkout/session/${_session!.id}/coupon'),
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
        Uri.parse('${ApiConfig.baseUrl}/checkout/session/${_session!.id}/coupon'),
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
        Uri.parse('${ApiConfig.baseUrl}/checkout/session/${_session!.id}/payment-method'),
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
      
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/checkout/session/${_session!.id}/confirm'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({'idempotencyKey': idempotencyKey}),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = json.decode(response.body);
        final orderId = data['data']['orderId'];
        _isLoading = false;
        notifyListeners();
        return orderId;
      } else {
        _error = json.decode(response.body)['message'] ?? 'Failed to place order';
        _isLoading = false;
        notifyListeners();
        return null;
      }
    } catch (e) {
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
}
