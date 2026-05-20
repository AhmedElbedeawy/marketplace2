import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/order.dart';
import '../mappers/order_mapper.dart';

// Re-export mapper types so existing imports of order_provider.dart
// continue to resolve ItemGroup, OrderDisplayData, groupItemsByFulfillmentAndReady.
export '../mappers/order_mapper.dart';

class OrderProvider extends ChangeNotifier {
  List<Order> _orders = [];
  List<Order> _cookOrders = [];
  Map<String, Map<String, dynamic>> _ratingStatuses = {};
  Map<String, OrderDisplayData> _orderDisplayData = {};
  bool _isLoading = false;
  String? _error;
  DateTime? _lastOrdersFetch;

  List<Order> get orders => _orders;
  List<Order> get cookOrders => _cookOrders;
  Map<String, Map<String, dynamic>> get ratingStatuses => _ratingStatuses;
  Map<String, OrderDisplayData> get orderDisplayData => _orderDisplayData;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchCookOrders(String token) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await http.get(
        Uri.parse(ApiConfig.cookOrders),
        headers: {'Authorization': 'Bearer $token'},
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
    if (_lastOrdersFetch != null &&
        DateTime.now().difference(_lastOrdersFetch!).inSeconds < 60) {
      return;
    }
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/orders'),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        final Map<String, dynamic> responseData = json.decode(response.body);
        if (responseData['success'] == true && responseData['data'] != null) {
          final List<dynamic> data = responseData['data'];
          _orders = data.map((o) => Order.fromJson(o)).toList();
          _lastOrdersFetch = DateTime.now();
          _orderDisplayData = buildOrderDisplayCache(_orders);
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
        headers: {'Authorization': 'Bearer $token'},
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
        _lastOrdersFetch = null; // bypass TTL — must reflect mutation immediately
        await fetchOrders(token);
      }
    } catch (e) {
      _error = 'Failed to update order: $e';
      notifyListeners();
    }
  }

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

  List<Order> filterOrdersForReview({
    required List<Order> orders,
    required String cookId,
    Map<String, Map<String, dynamic>>? ratingStatuses,
  }) {
    return orders.where((order) {
      if (order.status != 'completed' && order.status != 'delivered') {
        return false;
      }

      final hasCookItems = order.subOrders.any(
        (subOrder) => subOrder.cookId.toString() == cookId,
      );
      if (!hasCookItems) return false;

      if (ratingStatuses != null && ratingStatuses.containsKey(order.id)) {
        final status = ratingStatuses[order.id]!;
        final isRated = status['isRated'] ?? false;
        final canEdit = status['canEdit'] ?? false;
        return !isRated || canEdit;
      }

      return true;
    }).toList();
  }
}
