import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import 'auth_provider.dart';

/// Provider for Cook Hub dashboard data
/// Fetches real-time data from verified backend endpoints:
/// - Sales Summary: GET /api/orders/cook/sales-summary?period=last30
/// - Sales by Category: GET /api/orders/cook/sales-by-category  
/// - Order Stats: GET /api/orders/cook/order-stats
/// - Active Listings: GET /api/products?cook={cookId}
class CookDashboardProvider extends ChangeNotifier {
  final AuthProvider _authProvider;
  
  List<dynamic> _salesSummary = [];
  List<Map<String, dynamic>> _salesByCategory = [];
  Map<String, dynamic>? _orderStats;
  int _activeListings = 0;
  Map<String, dynamic>? _trafficStats;
  List<dynamic> _recentActivity = [];
  Map<String, dynamic>? _performanceStats;
  String _selectedPeriod = 'last30'; // today, last7, last30, last90
  
  bool _isLoading = false;
  bool _hasLoaded = false;  // Tracks if data has been successfully loaded
  String? _error;

  CookDashboardProvider(this._authProvider);

  // Getters
  List<dynamic> get salesSummary => _salesSummary;
  List<Map<String, dynamic>> get salesByCategory => _salesByCategory;
  Map<String, dynamic>? get orderStats => _orderStats;
  int get activeListings => _activeListings;
  Map<String, dynamic>? get trafficStats => _trafficStats;
  List<dynamic> get recentActivity => _recentActivity;
  Map<String, dynamic>? get performanceStats => _performanceStats;
  String get selectedPeriod => _selectedPeriod;
  bool get isLoading => _isLoading;
  bool get hasLoaded => _hasLoaded;  // Expose for overview page
  String? get error => _error;

  /// Fetch all dashboard data in parallel
  Future<void> fetchDashboardData({String? cookId}) async {
    // Get LIVE token from AuthProvider (not stale passed parameter)
    final token = _authProvider.token;
    
    // Token validation - do NOT call APIs without valid token
    if (token == null || token.isEmpty) {
      debugPrint('❌ CookDashboardProvider: Token is null or empty, skipping API calls');
      _error = 'Authentication required. Please log in again.';
      _isLoading = false;
      notifyListeners();
      return;
    }

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      debugPrint('🔵 Fetching Cook Hub dashboard data for period: $_selectedPeriod...');
      debugPrint('🔑 Token (live from AuthProvider): ${token.substring(0, token.length > 20 ? 20 : token.length)}...');
      
      // Fetch all endpoints in parallel
      final futures = [
        _fetchSalesSummary(token),
        _fetchSalesByCategory(token),
        _fetchOrderStats(token),
        _fetchTrafficStats(token),
        _fetchRecentActivity(token),
        _fetchPerformanceStats(token),
      ];
      
      // Fetch active listings if cookId is provided
      if (cookId != null) {
        futures.add(_fetchActiveListings(token, cookId));
      }
      
      final results = await Future.wait(futures);

      _salesSummary = results[0] as List<dynamic>;
      _salesByCategory = results[1] as List<Map<String, dynamic>>;
      _orderStats = results[2] as Map<String, dynamic>?;
      _trafficStats = results[3] as Map<String, dynamic>?;
      _recentActivity = results[4] as List<dynamic>;
      _performanceStats = results[5] as Map<String, dynamic>?;
      
      if (cookId != null && results.length > 6) {
        _activeListings = results[6] as int;
      }
      
      debugPrint('✅ Sales Summary: ${_salesSummary.length} items');
      debugPrint('✅ Sales by Category: ${_salesByCategory.length} categories');
      debugPrint('✅ Order Stats: ${_orderStats != null ? "loaded" : "null"}');
      debugPrint('✅ Active Listings: $_activeListings');
      debugPrint('✅ Traffic Stats: ${_trafficStats != null ? "loaded" : "null"}');
      debugPrint('✅ Recent Activity: ${_recentActivity.length} items');
      debugPrint('✅ Performance Stats: ${_performanceStats != null ? "loaded" : "null"}');
    } catch (e) {
      _error = 'Failed to load dashboard data: $e';
      debugPrint('❌ Error loading dashboard data: $e');
    } finally {
      _isLoading = false;
      // Mark as loaded on success (even if empty data, fetch completed)
      _hasLoaded = true;
      notifyListeners();
    }
  }
  
  /// Change the selected period and refresh data
  Future<void> changePeriod(String period, {String? cookId}) async {
    _selectedPeriod = period;
    _hasLoaded = false;  // Reset so new period data will be fetched
    await fetchDashboardData(cookId: cookId);
  }

  /// Manually refresh dashboard data
  Future<void> refresh({String? cookId}) async {
    _hasLoaded = false;  // Reset so data will be re-fetched
    await fetchDashboardData(cookId: cookId);
  }

  /// GET /api/orders/cook/sales-summary?period={period}
  /// Returns: Array of {date: String, sales: num}
  Future<List<dynamic>> _fetchSalesSummary(String token) async {
    try {
      debugPrint('📊 Sales Summary Request:');
      debugPrint('   URL: ${ApiConfig.baseUrl}/orders/cook/sales-summary?period=$_selectedPeriod');
      debugPrint('   Headers: Authorization: Bearer ${token.substring(0, token.length > 20 ? 20 : token.length)}...');
      
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/orders/cook/sales-summary?period=$_selectedPeriod'),
        headers: {'Authorization': 'Bearer $token'},
      );

      debugPrint('📊 Sales Summary API ($_selectedPeriod): ${response.statusCode}');
      
      if (response.statusCode == 401) {
        debugPrint('❌ 401 Unauthorized - token may be expired');
        return [];
      }
      
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
      debugPrint('📈 Sales by Category Request:');
      debugPrint('   URL: ${ApiConfig.baseUrl}/orders/cook/sales-by-category');
      debugPrint('   Headers: Authorization: Bearer ${token.substring(0, token.length > 20 ? 20 : token.length)}...');
      
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/orders/cook/sales-by-category'),
        headers: {'Authorization': 'Bearer $token'},
      );

      debugPrint('📈 Sales by Category API: ${response.statusCode}');
      
      if (response.statusCode == 401) {
        debugPrint('❌ 401 Unauthorized - token may be expired');
        return [];
      }
      
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
      debugPrint('📊 Order Stats Request:');
      debugPrint('   URL: ${ApiConfig.baseUrl}/orders/cook/order-stats');
      debugPrint('   Headers: Authorization: Bearer ${token.substring(0, token.length > 20 ? 20 : token.length)}...');
      
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/orders/cook/order-stats'),
        headers: {'Authorization': 'Bearer $token'},
      );

      debugPrint('📊 Order Stats API: ${response.statusCode}');
      
      if (response.statusCode == 401) {
        debugPrint('❌ 401 Unauthorized - token may be expired');
        return null;
      }
      
      if (response.statusCode == 200) {
        return json.decode(response.body) as Map<String, dynamic>;
      }
    } catch (e) {
      debugPrint('Error fetching order stats: $e');
    }
    return null;
  }
  
  /// GET /api/dish-offers/my?active=true
  /// Returns: Count of active dish offers for logged-in cook (same as Cook Menu)
  Future<int> _fetchActiveListings(String token, String cookId) async {
    try {
      debugPrint('📦 Active Listings Request:');
      debugPrint('   URL: ${ApiConfig.baseUrl}/dish-offers/my?active=true');
      debugPrint('   Headers: Authorization: Bearer ${token.substring(0, token.length > 20 ? 20 : token.length)}...');
      
      // Use same endpoint as Cook Hub Menu (getMyOffers)
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/dish-offers/my?active=true'),
        headers: {'Authorization': 'Bearer $token'},
      );

      debugPrint('📦 Active Listings API: ${response.statusCode}');
      
      if (response.statusCode == 401) {
        debugPrint('❌ 401 Unauthorized - token may be expired');
        return 0;
      }
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data is List) {
          debugPrint('📦 Active Listings count: ${data.length}');
          return data.length;
        } else if (data is Map && data.containsKey('offers') && data['offers'] is List) {
          final offers = data['offers'] as List;
          debugPrint('📦 Active Listings count: ${offers.length}');
          return offers.length;
        }
      }
    } catch (e) {
      debugPrint('❌ Error fetching active listings: $e');
    }
    return 0;
  }
  
  /// GET /api/orders/cook/traffic-stats?period={period}
  /// Returns: {listingImpressions, clickThroughRate, storeViews, viewsData[]}
  Future<Map<String, dynamic>?> _fetchTrafficStats(String token) async {
    try {
      debugPrint('📊 Traffic Stats Request:');
      debugPrint('   URL: ${ApiConfig.baseUrl}/orders/cook/traffic-stats?period=$_selectedPeriod');
      debugPrint('   Headers: Authorization: Bearer ${token.substring(0, token.length > 20 ? 20 : token.length)}...');
      
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/orders/cook/traffic-stats?period=$_selectedPeriod'),
        headers: {'Authorization': 'Bearer $token'},
      );

      debugPrint('📊 Traffic Stats API: ${response.statusCode}');
      
      if (response.statusCode == 401) {
        debugPrint('❌ 401 Unauthorized - token may be expired');
        return null;
      }
      
      if (response.statusCode == 200) {
        return json.decode(response.body) as Map<String, dynamic>;
      }
    } catch (e) {
      debugPrint('❌ Error fetching traffic stats: $e');
    }
    return null;
  }
  
  /// GET /api/orders/cook/recent-activity?limit=5
  /// Returns: Array of recent activities
  Future<List<dynamic>> _fetchRecentActivity(String token) async {
    try {
      debugPrint('📝 Recent Activity Request:');
      debugPrint('   URL: ${ApiConfig.baseUrl}/orders/cook/recent-activity?limit=5');
      debugPrint('   Headers: Authorization: Bearer ${token.substring(0, token.length > 20 ? 20 : token.length)}...');
      
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/orders/cook/recent-activity?limit=5'),
        headers: {'Authorization': 'Bearer $token'},
      );

      debugPrint('📝 Recent Activity API: ${response.statusCode}');
      
      if (response.statusCode == 401) {
        debugPrint('❌ 401 Unauthorized - token may be expired');
        return [];
      }
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data is List) {
          return data;
        }
      }
    } catch (e) {
      debugPrint('❌ Error fetching recent activity: $e');
    }
    return [];
  }
  
  /// GET /api/orders/cook/performance-stats?period={period}
  /// Returns: {performanceScore, percentileRank, completionRate, averageRating}
  Future<Map<String, dynamic>?> _fetchPerformanceStats(String token) async {
    try {
      debugPrint('📈 Performance Stats Request:');
      debugPrint('   URL: ${ApiConfig.baseUrl}/orders/cook/performance-stats?period=$_selectedPeriod');
      debugPrint('   Headers: Authorization: Bearer ${token.substring(0, token.length > 20 ? 20 : token.length)}...');
      
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/orders/cook/performance-stats?period=$_selectedPeriod'),
        headers: {'Authorization': 'Bearer $token'},
      );

      debugPrint('📈 Performance Stats API: ${response.statusCode}');
      
      if (response.statusCode == 401) {
        debugPrint('❌ 401 Unauthorized - token may be expired');
        return null;
      }
      
      if (response.statusCode == 200) {
        return json.decode(response.body) as Map<String, dynamic>;
      }
    } catch (e) {
      debugPrint('❌ Error fetching performance stats: $e');
    }
    return null;
  }
}
