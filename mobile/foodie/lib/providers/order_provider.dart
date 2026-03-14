import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/order.dart';

class OrderProvider extends ChangeNotifier {
  List<Order> _orders = [];
  List<Order> _cookOrders = []; // Cook-specific orders
  bool _isLoading = false;
  String? _error;

  List<Order> get orders => _orders;
  List<Order> get cookOrders => _cookOrders;
  bool get isLoading => _isLoading;
  String? get error => _error;

  /// Fetch cook-specific orders for Cook Hub
  Future<void> fetchCookOrders(String token) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await http.get(
        Uri.parse(ApiConfig.cookOrders),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        _cookOrders = data.map((o) => Order.fromJson(o)).toList();
      } else {
        _error = 'Failed to fetch cook orders: ${response.statusCode}';
      }
    } catch (e) {
      _error = 'Error fetching cook orders: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchOrders(String token) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/orders/my-orders'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        _orders = data.map((o) => Order.fromJson(o)).toList();
      } else {
        _error = 'Failed to fetch orders: ${response.statusCode}';
      }
    } catch (e) {
      _error = 'Error fetching orders: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Order?> getOrderDetails(String orderId, String token) async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/orders/$orderId'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        return Order.fromJson(json.decode(response.body));
      }
    } catch (e) {
      debugPrint('Error fetching order details: $e');
    }
    return null;
  }

  Future<void> updateOrderStatus(
      String orderId, String subOrderId, String status, String token) async {
    try {
      final response = await http.patch(
        Uri.parse(
            '${ApiConfig.baseUrl}/orders/$orderId/sub-orders/$subOrderId/status'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode({'status': status}),
      );

      if (response.statusCode == 200) {
        // Refresh orders
        await fetchOrders(token);
      }
    } catch (e) {
      _error = 'Failed to update order: $e';
      notifyListeners();
    }
  }
}
