import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import '../../config/theme.dart';
import '../../config/api_config.dart';
import '../../providers/language_provider.dart';
import '../../providers/country_provider.dart';
import '../../providers/auth_provider.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({Key? key}) : super(key: key);

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool _isLoading = true;
  String? _error;

  // Dashboard stats
  int _totalOrders = 0;
  int _dispatchedOrders = 0;
  int _pendingOrders = 0;
  int _inKitchenOrders = 0;
  double _totalSales = 0;
  List<dynamic> _salesData = [];

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
    final authProvider = context.read<AuthProvider>();
    final token = authProvider.token;

    if (token == null) {
      setState(() {
        _error = 'Not authenticated';
        _isLoading = false;
      });
      return;
    }

    try {
      // Fetch cook order stats
      final statsResponse = await http.get(
        Uri.parse(ApiConfig.cookOrderStats),
        headers: {'Authorization': 'Bearer $token'},
      );

      // Fetch sales summary
      final salesResponse = await http.get(
        Uri.parse('${ApiConfig.cookSalesSummary}?period=last30'),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (statsResponse.statusCode == 200) {
        final statsData =
            statsResponse.body.isNotEmpty ? jsonDecode(statsResponse.body) : {};

        setState(() {
          _totalOrders = statsData['allOrders'] ?? 0;
          _dispatchedOrders = statsData['dispatched'] ?? 0;
          _pendingOrders = (statsData['awaitingPickup'] ?? 0) +
              (statsData['inKitchen'] ?? 0);
          _inKitchenOrders = statsData['inKitchen'] ?? 0;
        });
      }

      if (salesResponse.statusCode == 200) {
        final salesJson =
            salesResponse.body.isNotEmpty ? jsonDecode(salesResponse.body) : {};

        setState(() {
          _salesData = salesJson['salesData'] ?? [];
          // Calculate total from sales data
          _totalSales = 0;
          if (_salesData.isNotEmpty) {
            for (var entry in _salesData) {
              _totalSales += (entry['sales'] ?? 0).toDouble();
            }
          }
        });
      }

      setState(() {
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Error loading dashboard: $e');
      setState(() {
        _error = 'Failed to load dashboard data';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final countryProvider = context.watch<CountryProvider>();
    final isRTL = languageProvider.isArabic;
    final currency = countryProvider.currencyCode;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.error_outline,
                          size: 48, color: Colors.grey[400]),
                      const SizedBox(height: 16),
                      Text(
                        _error!,
                        style: TextStyle(color: Colors.grey[600]),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadDashboardData,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadDashboardData,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Page Title
                        Text(
                          isRTL
                              ? 'نظرة عامة على الأداء'
                              : 'Performance Overview',
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          isRTL
                              ? 'تتبع مبيعاتك وأداء مطبخك في لمحة سريعة 📊'
                              : 'Track your sales and kitchen performance at a glance 📊',
                          style: const TextStyle(
                            fontSize: 14,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Stats Cards
                        _buildStatsCard(
                          isRTL ? 'إجمالي المبيعات' : 'Total Sales',
                          '$currency ${_totalSales.toStringAsFixed(0)}',
                          isRTL ? 'آخر 30 يوم' : 'Last 30 days',
                          Icons.trending_up,
                          AppTheme.accentColor,
                        ),
                        const SizedBox(height: 12),
                        _buildStatsCard(
                          isRTL ? 'إجمالي الطلبات' : 'Total Orders',
                          '$_totalOrders',
                          isRTL
                              ? '$_dispatchedOrders تم التوصيل'
                              : '$_dispatchedOrders Delivered',
                          Icons.shopping_cart,
                          AppTheme.successColor,
                        ),
                        const SizedBox(height: 12),
                        _buildStatsCard(
                          isRTL ? 'قيد التحضير' : 'In Kitchen',
                          '$_inKitchenOrders',
                          isRTL ? 'طلبات قيد التحضير' : 'Orders being prepared',
                          Icons.restaurant,
                          const Color(0xFF3B82F6),
                        ),
                        const SizedBox(height: 12),
                        _buildStatsCard(
                          isRTL ? 'في الانتظار' : 'Pending',
                          '$_pendingOrders',
                          isRTL ? 'في انتظار الاستلام' : 'Awaiting pickup',
                          Icons.pending_actions,
                          Colors.orange,
                        ),
                      ],
                    ),
                  ),
                ),
    );
  }

  Widget _buildStatsCard(
    String title,
    String value,
    String subtitle,
    IconData icon,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 28),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppTheme.textSecondary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                    color: color,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppTheme.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
