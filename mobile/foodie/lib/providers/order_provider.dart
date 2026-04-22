import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/order.dart';

class OrderProvider extends ChangeNotifier {
  List<Order> _orders = [];
  List<Order> _cookOrders = []; // Cook-specific orders
  Map<String, Map<String, dynamic>> _ratingStatuses = {}; // orderId -> status
  bool _isLoading = false;
  String? _error;

  List<Order> get orders => _orders;
  List<Order> get cookOrders => _cookOrders;
  Map<String, Map<String, dynamic>> get ratingStatuses => _ratingStatuses;
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
      // Match web endpoint: GET /api/orders (not /orders/my-orders)
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/orders'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final Map<String, dynamic> responseData = json.decode(response.body);
        if (responseData['success'] == true && responseData['data'] != null) {
          final List<dynamic> data = responseData['data'];
          _orders = data.map((o) => Order.fromJson(o)).toList();
        } else {
          _error = 'Invalid response format';
        }
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
        final Map<String, dynamic> responseData = json.decode(response.body);
        if (responseData['success'] == true && responseData['data'] != null) {
          return Order.fromJson(responseData['data']);
        }
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

  /// NEW: Fetch batch rating status for multiple orders (PHASE 5)
  Future<Map<String, Map<String, dynamic>>> fetchBatchRatingStatus(
    List<String> orderIds,
    String token,
  ) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/ratings/batch-status'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode({'orderIds': orderIds}),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] && data['data'] is List) {
          final statuses = <String, Map<String, dynamic>>{};
          for (final item in data['data']) {
            statuses[item['orderId']] = Map<String, dynamic>.from(item);
          }
          _ratingStatuses = statuses;
          notifyListeners();
          return statuses;
        }
      }
    } catch (e) {
      debugPrint('Error fetching batch rating status: $e');
    }
    return {};
  }

  /// NEW: Filter orders for review mode by cookId (PHASE 5)
  List<Order> filterOrdersForReview({
    required List<Order> orders,
    required String cookId,
    Map<String, Map<String, dynamic>>? ratingStatuses,
  }) {
    return orders.where((order) {
      // Only completed/delivered orders
      if (order.status != 'completed' && order.status != 'delivered') {
        return false;
      }

      // Must contain items from this cook
      final hasCookItems = order.subOrders.any(
        (subOrder) => subOrder.cookId.toString() == cookId,
      );
      if (!hasCookItems) {
        return false;
      }

      // Check if already fully rated (can edit if within window)
      if (ratingStatuses != null && ratingStatuses.containsKey(order.id)) {
        final status = ratingStatuses[order.id]!;
        final isRated = status['isRated'] ?? false;
        final canEdit = status['canEdit'] ?? false;
        
        // Show if not rated OR can edit
        return !isRated || canEdit;
      }

      // If no status info, include it (will be filtered after API call)
      return true;
    }).toList();
  }
}
