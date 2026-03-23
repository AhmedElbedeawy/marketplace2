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
  String _selectedPeriod = 'last7';

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
        Uri.parse('${ApiConfig.cookSalesSummary}?period=$_selectedPeriod'),
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
      // Original mobile app header preserved - no changes to header actions
      appBar: AppBar(
        elevation: 0,
        backgroundColor: const Color(0xFFF6F6F6),
        leading: Builder(
          builder: (context) => IconButton(
            icon: Image.asset(
              'assets/icons/Burger.png',
              width: 24,
              height: 24,
            ),
            onPressed: () => Scaffold.of(context).openDrawer(),
          ),
        ),
        title: Row(
          children: [
            const Icon(Icons.restaurant, color: Color(0xFFFCD535), size: 24),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  isRTL ? 'لوحة التحكم' : 'Cook Hub',
                  style: const TextStyle(
                    color: Color(0xFF2D2F2F),
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  isRTL ? 'أدوات الطاهي' : 'manageYourHomeKitchen',
                  style: const TextStyle(
                    fontSize: 10,
                    color: Color(0xFF757575),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          // Notifications
          IconButton(
            icon: Stack(
              children: [
                Padding(
                  padding: const EdgeInsets.all(8),
                  child: Image.asset(
                    'assets/icons/notifications.png',
                    width: 24,
                    height: 24,
                    fit: BoxFit.contain,
                    errorBuilder: (_, __, ___) => const Icon(
                      Icons.notifications_none,
                      color: Color(0xFF2D2F2F),
                      size: 22,
                    ),
                  ),
                ),
                Positioned(
                  right: 0,
                  top: 0,
                  child: Container(
                    padding: const EdgeInsets.all(2),
                    decoration: const BoxDecoration(
                      color: Colors.red,
                      shape: BoxShape.circle,
                    ),
                    constraints: const BoxConstraints(
                      minWidth: 12,
                      minHeight: 12,
                    ),
                    child: const Text(
                      '3',
                      style: TextStyle(color: Colors.white, fontSize: 8),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
              ],
            ),
            onPressed: () {},
          ),
          // Profile
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
            decoration: BoxDecoration(
              border: Border.all(color: const Color(0xFFE5E7EB), width: 2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: InkWell(
              onTap: () => languageProvider.toggleLanguage(),
              borderRadius: BorderRadius.circular(8),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                child: Text(
                  languageProvider.isArabic ? 'AR' : 'EN',
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                    color: Color(0xFF2D2F2F),
                  ),
                ),
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.account_circle, color: Color(0xFF2D2F2F)),
            onPressed: () {},
          ),
        ],
      ),
      body: Column(
        children: [
          // Top Slider (Segmented Control) - Stitch Design
          _buildTopSlider(isRTL),
          // Dashboard Content
          Expanded(
            child: _isLoading
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
                              // Sales Card (Full Width) - Stitch Design
                              _buildSalesCardStitch(currency, isRTL),
                              const SizedBox(height: 16),

                              // Stats Grid - Stitch Design
                              GridView.count(
                                crossAxisCount: 2,
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                mainAxisSpacing: 12,
                                crossAxisSpacing: 12,
                                childAspectRatio: 1.4,
                                children: [
                                  _buildStatCardStitch(
                                    isRTL ? 'إجمالي الطلبات' : 'Total Orders',
                                    '$_totalOrders',
                                    isRTL ? '$_dispatchedOrders تم التوصيل' : '$_dispatchedOrders Delivered',
                                    Icons.receipt_long,
                                  ),
                                  _buildStatCardStitch(
                                    isRTL ? 'قيد التحضير' : 'In Kitchen',
                                    '$_inKitchenOrders',
                                    isRTL ? 'طلبات قيد التحضير' : 'Orders being prepared',
                                    Icons.restaurant,
                                  ),
                                  _buildStatCardStitch(
                                    isRTL ? 'في الانتظار' : 'Pending',
                                    '$_pendingOrders',
                                    isRTL ? 'في انتظار الاستلام' : 'Awaiting pickup',
                                    Icons.pending_actions,
                                  ),
                                  _buildStatCardStitch(
                                    isRTL ? 'القوائم النشطة' : 'Active Listings',
                                    '45',
                                    '',
                                    Icons.restaurant_menu,
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildSalesCard(String currency, bool isRTL) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with period selector
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                isRTL ? 'المبيعات' : 'Sales',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1E1E1E),
                ),
              ),
              _buildPeriodSelector(),
            ],
          ),
          const SizedBox(height: 12),
          // Total sales
          Text(
            '$currency ${_totalSales.toStringAsFixed(0)}',
            style: const TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              color: Color(0xFFFF7A00),
            ),
          ),
          const SizedBox(height: 16),
          // Chart placeholder
          Container(
            height: 200,
            width: double.infinity,
            decoration: BoxDecoration(
              color: const Color(0xFFF0F0F0),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Center(
              child: Text(
                isRTL ? 'الرسم البياني' : 'Chart',
                style: const TextStyle(
                  fontSize: 14,
                  color: Color(0xFF9E9E9E),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPeriodSelector() {
    final periods = ['today', 'last7', 'last30', 'last90'];
    final labels = {
      'en': ['Today', '7 Days', '30 Days', '90 Days'],
      'ar': ['اليوم', '٧ أيام', '٣٠ يوم', '٩٠ يوم'],
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFFF5F5F5),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: periods.map((period) {
          final isSelected = _selectedPeriod == period;
          final index = periods.indexOf(period);
          final languageProvider = context.watch<LanguageProvider>();
          final label = languageProvider.isArabic 
              ? labels['ar']![index]
              : labels['en']![index];

          return GestureDetector(
            onTap: () {
              setState(() {
                _selectedPeriod = period;
                _loadDashboardData();
              });
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: isSelected ? const Color(0xFFFF7A00) : Colors.transparent,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: isSelected ? Colors.white : const Color(0xFF666666),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildCategoryCard(bool isRTL) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            isRTL ? 'المبيعات حسب الفئة' : 'Sales by Category',
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1E1E1E),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            isRTL ? 'آخر ٣٠ يوم' : 'Last 30 Days',
            style: const TextStyle(
              fontSize: 12,
              color: Color(0xFF666666),
            ),
          ),
          const SizedBox(height: 16),
          // Category bars placeholder
          ...List.generate(5, (index) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Category ${index + 1}',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF666666)),
                    ),
                    Text(
                      'SAR ${(1000 - index * 150).toString()}',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Container(
                  height: 6,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE5DEDD),
                    borderRadius: BorderRadius.circular(3),
                  ),
                  child: FractionallySizedBox(
                    alignment: Alignment.centerLeft,
                    widthFactor: (5 - index) / 5,
                    child: Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFFE5DEDD),
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          )),
        ],
      ),
    );
  }

  Widget _buildOrdersCard(bool isRTL) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                isRTL ? 'الطلبات' : 'Orders',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1E1E1E),
                ),
              ),
              TextButton(
                onPressed: () {},
                child: Row(
                  children: [
                    const Text(
                      'See All',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFFFF7A00),
                      ),
                    ),
                    Icon(
                      Icons.arrow_forward,
                      size: 14,
                      color: const Color(0xFFFF7A00),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildOrderRow(isRTL ? 'إجمالي الطلبات' : 'All Orders', '$_totalOrders', isPrimary: true),
          _buildDivider(),
          _buildOrderRow(isRTL ? 'تم التوصيل' : 'Dispatched', '$_dispatchedOrders'),
          _buildOrderRow(isRTL ? 'في الانتظار' : 'Awaiting Pickup', '$_pendingOrders'),
          _buildOrderRow(isRTL ? 'قيد التحضير' : 'In Kitchen', '$_inKitchenOrders'),
        ],
      ),
    );
  }

  Widget _buildActiveListingsCard(bool isRTL) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                isRTL ? 'القائمة النشطة' : 'Active Menu',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1E1E1E),
                ),
              ),
              TextButton(
                onPressed: () {},
                child: Row(
                  children: [
                    const Text(
                      'See All',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFFFF7A00),
                      ),
                    ),
                    Icon(
                      Icons.arrow_forward,
                      size: 14,
                      color: const Color(0xFFFF7A00),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildListingRow(isRTL ? 'إجمالي العناصر' : 'All Listings', '45'),
          _buildDivider(),
          _buildListingRow('Grilled', '12 items'),
          _buildListingRow('Fried', '8 items'),
          _buildListingRow('Salads', '6 items'),
        ],
      ),
    );
  }

  Widget _buildTrafficCard(bool isRTL) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            isRTL ? 'حركة المرور' : 'Traffic',
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1E1E1E),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            isRTL ? 'مقارنة بآخر ٣٠ يوم' : 'vs Prior 30 Days',
            style: const TextStyle(
              fontSize: 11,
              color: Color(0xFF666666),
            ),
          ),
          const SizedBox(height: 16),
          _buildTrafficStat(isRTL ? 'ظهور القائمة' : 'Listing Impressions', '24,678', '+3.1%'),
          const SizedBox(height: 12),
          _buildTrafficStat(isRTL ? 'معدل النقر' : 'Click-Through Rate', '1.6%', '+0.1%'),
          const SizedBox(height: 12),
          _buildTrafficStat(isRTL ? 'مشاهدات المتجر' : 'Store Views', '2,246', '+3.1%', hasIcon: true),
        ],
      ),
    );
  }

  Widget _buildOrderRow(String label, String value, {bool isPrimary = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              color: Color(0xFF666666),
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: isPrimary ? const Color(0xFFFF7A00) : const Color(0xFF757575),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildListingRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              color: Color(0xFF666666),
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: Color(0xFF757575),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTrafficStat(String label, String value, String trend, {bool hasIcon = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: Color(0xFF666666),
          ),
        ),
        const SizedBox(height: 4),
        Row(
          children: [
            if (hasIcon) ...[
              Icon(Icons.visibility, size: 14, color: const Color(0xFF666666)),
              const SizedBox(width: 4),
            ],
            Text(
              value,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1E1E1E),
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: const Color(0xFFE8F5E9),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Row(
                children: [
                  Icon(Icons.trending_up, size: 12, color: const Color(0xFF2E7D32)),
                  const SizedBox(width: 2),
                  Text(
                    trend,
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF2E7D32),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildDivider() {
    return Divider(
      height: 1,
      thickness: 1,
      color: const Color(0xFFE0E0E0),
    );
  }

  // Stitch Design - Sales Card matching cook_hub_overview_with_icon
  Widget _buildSalesCardStitch(String currency, bool isRTL) {
    return Container(
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
          // Header with period selector
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
                  _buildPeriodChip('TODAY', false),
                  const SizedBox(width: 8),
                  _buildPeriodChip('7 DAYS', true),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Total sales value
          Text(
            '$currency ${_totalSales.toStringAsFixed(0)}',
            style: const TextStyle(
              fontSize: 36,
              fontWeight: FontWeight.w800,
              color: Color(0xFFF68A2F),
            ),
          ),
          const SizedBox(height: 24),
          // Chart area (placeholder for now)
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
    );
  }

  // Stitch Design - Top Slider (Segmented Control) from cook_hub_overview_with_icon
  Widget _buildTopSlider(bool isRTL) {
    final tabs = [
      {'en': 'Overview', 'ar': 'نظرة عامة'},
      {'en': 'Orders', 'ar': 'الطلبات'},
      {'en': 'Menu', 'ar': 'القائمة'},
      {'en': 'Marketing', 'ar': 'التسويق'},
    ];

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: List.generate(tabs.length, (index) {
            final isSelected = index == 0; // Overview is active
            final label = isRTL ? tabs[index]['ar']! : tabs[index]['en']!;

            return Padding(
              padding: EdgeInsets.only(
                left: isRTL ? 0 : 8,
                right: isRTL ? 8 : 0,
              ),
              child: GestureDetector(
                onTap: () {
                  if (index == 1) {
                    // Navigate to main Orders screen (supports both Foodie and Cook Hub)
                    Navigator.pushNamed(context, '/orders');
                  } else if (index == 2) {
                    // Navigate to Menu
                    Navigator.pushNamed(context, '/cook/menu');
                  }
                  // Marketing placeholder - future implementation
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
                  decoration: BoxDecoration(
                    color: isSelected ? const Color(0xFF333333) : const Color(0xFFE7E8E8),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    label,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: isSelected ? Colors.white : const Color(0xFF5A5C5C),
                    ),
                  ),
                ),
              ),
            );
          }),
        ),
      ),
    );
  }

  Widget _buildPeriodChip(String label, bool isSelected) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: isSelected ? const Color(0xFF904800) : Colors.transparent,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          color: isSelected ? Colors.white : const Color(0xFFBDBDBD),
        ),
      ),
    );
  }

  // Stitch Design - Stat Card matching cook_hub_overview_with_icon
  Widget _buildStatCardStitch(String title, String value, String subtitle, IconData icon) {
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
