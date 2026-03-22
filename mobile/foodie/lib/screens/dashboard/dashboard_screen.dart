import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
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
      backgroundColor: const Color(0xFFF6F6F6),
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
                        // KPI Grid - Sales Card (Full Width)
                        Container(
                          padding: const EdgeInsets.all(24),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(32),
                            border: Border.all(
                              color: const Color(0xFFACADAD).withOpacity(0.15),
                              width: 1,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.04),
                                blurRadius: 4,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Header
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    isRTL ? 'المبيعات' : 'Sales',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: Color(0xFF757575),
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                  Row(
                                    children: [
                                      Text(
                                        isRTL ? '٧ أيام' : '7 DAYS',
                                        style: const TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w700,
                                          color: Color(0xFF904800),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        isRTL ? 'اليوم' : 'TODAY',
                                        style: const TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w700,
                                          color: Color(0xFFBDBDBD),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              // Total Sales Value
                              Text(
                                '$currency ${_totalSales.toStringAsFixed(0)}',
                                style: const TextStyle(
                                  fontSize: 36,
                                  fontWeight: FontWeight.w800,
                                  color: Color(0xFFF68A2F),
                                ),
                              ),
                              // Chart placeholder
                              const SizedBox(height: 24),
                              Container(
                                height: 112,
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF6F6F6).withOpacity(0.5),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Center(
                                  child: Text(
                                    isRTL ? 'الرسم البياني للمبيعات' : 'Sales Chart',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: Color(0xFF9E9E9E),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Stats Cards Grid
                        GridView.count(
                          crossAxisCount: 2,
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          mainAxisSpacing: 12,
                          crossAxisSpacing: 12,
                          childAspectRatio: 1.4,
                          children: [
                            _buildModernStatsCard(
                              title: isRTL ? 'إجمالي الطلبات' : 'Total Orders',
                              value: '$_totalOrders',
                              subtitle: isRTL ? '$_dispatchedOrders تم التوصيل' : '$_dispatchedOrders Delivered',
                              icon: Icons.receipt_long,
                              color: const Color(0xFF333333),
                            ),
                            _buildModernStatsCard(
                              title: isRTL ? 'قيد التحضير' : 'In Kitchen',
                              value: '$_inKitchenOrders',
                              subtitle: isRTL ? 'طلبات قيد التحضير' : 'Orders being prepared',
                              icon: Icons.restaurant,
                              color: const Color(0xFF3B82F6),
                            ),
                            _buildModernStatsCard(
                              title: isRTL ? 'في الانتظار' : 'Pending',
                              value: '$_pendingOrders',
                              subtitle: isRTL ? 'في انتظار الاستلام' : 'Awaiting pickup',
                              icon: Icons.pending_actions,
                              color: Colors.orange,
                            ),
                            _buildModernStatsCard(
                              title: isRTL ? 'القوائم النشطة' : 'Active Listings',
                              value: '45',
                              subtitle: '',
                              icon: Icons.restaurant_menu,
                              color: const Color(0xFF333333),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
    );
  }

  Widget _buildModernStatsCard({
    required String title,
    required String value,
    required String subtitle,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(32),
        border: Border.all(
          color: const Color(0xFFACADAD).withOpacity(0.15),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Icon
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: const Color(0xFFF6F6F6),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, color: const Color(0xFF757575), size: 24),
          ),
          const Spacer(),
          // Title
          Text(
            title,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: Color(0xFF757575),
            ),
          ),
          const SizedBox(height: 4),
          // Value
          Text(
            value,
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w800,
              color: Color(0xFF2D2F2F),
            ),
          ),
          if (subtitle.isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: const TextStyle(
                fontSize: 9,
                fontWeight: FontWeight.w700,
                color: Color(0xFF9E9E9E),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
