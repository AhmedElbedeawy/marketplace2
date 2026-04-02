import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';

/// Provider for Cook Hub dashboard data
/// Fetches real-time data from verified backend endpoints:
/// - Sales Summary: GET /api/orders/cook/sales-summary
/// - Sales by Category: GET /api/orders/cook/sales-by-category  
/// - Order Stats: GET /api/orders/cook/order-stats
class CookDashboardProvider extends ChangeNotifier {
  List<dynamic> _salesSummary = [];
  List<Map<String, dynamic>> _salesByCategory = [];
  Map<String, dynamic>? _orderStats;
  
  bool _isLoading = false;
  String? _error;

  // Getters
  List<dynamic> get salesSummary => _salesSummary;
  List<Map<String, dynamic>> get salesByCategory => _salesByCategory;
  Map<String, dynamic>? get orderStats => _orderStats;
  bool get isLoading => _isLoading;
  String? get error => _error;

  /// Fetch all dashboard data in parallel
  Future<void> fetchDashboardData(String token) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      debugPrint('🔵 Fetching Cook Hub dashboard data...');
      
      // Fetch all three endpoints in parallel
      final results = await Future.wait([
        _fetchSalesSummary(token),
        _fetchSalesByCategory(token),
        _fetchOrderStats(token),
      ]);

      _salesSummary = results[0] as List<dynamic>;
      _salesByCategory = results[1] as List<Map<String, dynamic>>;
      _orderStats = results[2] as Map<String, dynamic>?;
      
      debugPrint('✅ Sales Summary: ${_salesSummary.length} items');
      debugPrint('✅ Sales by Category: ${_salesByCategory.length} categories');
      debugPrint('✅ Order Stats: ${_orderStats != null ? "loaded" : "null"}');
    } catch (e) {
      _error = 'Failed to load dashboard data: $e';
      debugPrint('❌ Error loading dashboard data: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// GET /api/orders/cook/sales-summary
  /// Returns: Array of {date: String, sales: num}
  Future<List<dynamic>> _fetchSalesSummary(String token) async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/orders/cook/sales-summary'),
        headers: {'Authorization': 'Bearer $token'},
      );

      debugPrint('📊 Sales Summary API: ${response.statusCode}');
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data is List) {
          debugPrint('📊 Sales Summary data: $data');
          return data;
        }
      }
    } catch (e) {
      debugPrint('❌ Error fetching sales summary: $e');
    }
    return [];
  }

  /// GET /api/orders/cook/sales-by-category
  /// Returns: Array of {category: String, sales: num}
  Future<List<Map<String, dynamic>>> _fetchSalesByCategory(String token) async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/orders/cook/sales-by-category'),
        headers: {'Authorization': 'Bearer $token'},
      );

      debugPrint('📈 Sales by Category API: ${response.statusCode}');
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data is List) {
          debugPrint('📈 Sales by Category data: $data');
          return data.cast<Map<String, dynamic>>();
        }
      }
    } catch (e) {
      debugPrint('❌ Error fetching sales by category: $e');
    }
    return [];
  }

  /// GET /api/orders/cook/order-stats
  Future<Map<String, dynamic>?> _fetchOrderStats(String token) async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/orders/cook/order-stats'),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        return json.decode(response.body) as Map<String, dynamic>;
      }
    } catch (e) {
      debugPrint('Error fetching order stats: $e');
    }
    return null;
  }
}
