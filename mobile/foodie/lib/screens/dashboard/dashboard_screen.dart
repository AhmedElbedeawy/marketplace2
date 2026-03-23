import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import '../../config/api_config.dart';
import '../../providers/language_provider.dart';
import '../../providers/country_provider.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/global_bottom_navigation.dart';
import '../menu/menu_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({Key? key}) : super(key: key);

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool _isLoading = true;
  bool _isMenuLoading = true;
  String? _error;
  String _selectedPeriod = 'last7';
  int _currentTabIndex = 0; // 0=Overview, 1=Orders, 2=Menu, 3=Marketing
  final PageController _pageController = PageController();

  // Dashboard stats
  int _totalOrders = 0;
  int _dispatchedOrders = 0;
  int _pendingOrders = 0;
  int _inKitchenOrders = 0;
  double _totalSales = 0;
  List<dynamic> _salesData = [];

  // Menu items
  List<dynamic> _menuItems = [];

  // Safe parsing helpers for API data that may be int/double/string/null
  int _safeIntParse(dynamic value) {
    if (value == null) return 0;
    if (value is int) return value;
    if (value is double) return value.toInt();
    if (value is String) return int.tryParse(value.replaceAll(RegExp(r'[^0-9]'), '')) ?? 0;
    return 0;
  }

  double _safeDoubleParse(dynamic value) {
    if (value == null) return 0;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) return double.tryParse(value.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 0.0;
    return 0;
  }

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
    _loadMenuItems();
  }

  Future<void> _loadMenuItems() async {
    final authProvider = context.read<AuthProvider>();
    final token = authProvider.token;

    if (token == null) {
      setState(() {
        _isMenuLoading = false;
      });
      return;
    }

    try {
      final response = await http.get(
        Uri.parse(ApiConfig.cookMenu),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        // Handle different response structures safely
        List<dynamic> offers = [];
        if (data is Map<String, dynamic>) {
          final offersData = data['offers'];
          if (offersData is List) {
            offers = offersData;
          } else if (data['dishOffers'] is List) {
            offers = data['dishOffers'];
          }
        } else if (data is List) {
          offers = data;
        }
        setState(() {
          _menuItems = offers;
          _isMenuLoading = false;
        });
      } else {
        setState(() {
          _isMenuLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Error loading menu: $e');
      setState(() {
        _isMenuLoading = false;
      });
    }
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
          _totalOrders = _safeIntParse(statsData['allOrders']);
          _dispatchedOrders = _safeIntParse(statsData['dispatched']);
          _pendingOrders = _safeIntParse(statsData['awaitingPickup']) +
              _safeIntParse(statsData['inKitchen']);
          _inKitchenOrders = _safeIntParse(statsData['inKitchen']);
        });
      }

      if (salesResponse.statusCode == 200) {
        final salesJson =
            salesResponse.body.isNotEmpty ? jsonDecode(salesResponse.body) : {};

        setState(() {
          // Handle salesData that might be a List or String (backend inconsistency)
          final salesDataRaw = salesJson['salesData'];
          if (salesDataRaw is List) {
            _salesData = salesDataRaw;
          } else if (salesDataRaw is String) {
            // Try to parse JSON string if backend sent it as string
            try {
              _salesData = jsonDecode(salesDataRaw);
            } catch (_) {
              _salesData = [];
            }
          } else {
            _salesData = [];
          }
          
          // Calculate total from sales data with type safety
          _totalSales = 0.0;
          if (_salesData is List && _salesData.isNotEmpty) {
            for (final entry in _salesData) {
              if (entry is Map<String, dynamic>) {
                final salesValue = entry['sales'];
                if (salesValue != null) {
                  if (salesValue is num) {
                    _totalSales += salesValue.toDouble();
                  } else if (salesValue is String) {
                    _totalSales += double.tryParse(salesValue.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 0.0;
                  }
                }
              }
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
          // Profile icon
          IconButton(
            icon: const Icon(Icons.account_circle, color: Color(0xFF2D2F2F)),
            onPressed: () {},
          ),
        ],
      ),
      drawer: Drawer(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            DrawerHeader(
              decoration: const BoxDecoration(color: Color(0xFFFCD535)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Text(
                    isRTL ? 'القائمة' : 'Menu',
                    style: const TextStyle(color: Color(0xFF2D2F2F), fontSize: 24, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
            ListTile(
              leading: const Icon(Icons.home),
              title: Text(isRTL ? 'الرئيسية' : 'Home'),
              onTap: () {
                Navigator.pop(context);
                Navigator.pushNamedAndRemoveUntil(context, '/', (route) => false);
              },
            ),
            ListTile(
              leading: const Icon(Icons.restaurant_menu),
              title: Text(isRTL ? 'القائمة' : 'Menu'),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(context, MaterialPageRoute(builder: (context) => const MenuScreen()));
              },
            ),
            ListTile(
              leading: const Icon(Icons.favorite),
              title: Text(isRTL ? 'المفضلة' : 'Favorites'),
              onTap: () {
                Navigator.pop(context);
                Navigator.pushNamed(context, '/favorites');
              },
            ),
            ListTile(
              leading: const Icon(Icons.shopping_cart),
              title: Text(isRTL ? 'السلة' : 'Cart'),
              onTap: () {
                Navigator.pop(context);
                Navigator.pushNamed(context, '/cart');
              },
            ),
            ListTile(
              leading: const Icon(Icons.receipt_long),
              title: Text(isRTL ? 'طلباتي' : 'My Orders'),
              onTap: () {
                Navigator.pop(context);
                Navigator.pushNamed(context, '/orders');
              },
            ),
            ListTile(
              leading: const Icon(Icons.message),
              title: Text(isRTL ? 'الرسائل' : 'Messages'),
              onTap: () {
                Navigator.pop(context);
                Navigator.pushNamed(context, '/messages');
              },
            ),
            ListTile(
              leading: const Icon(Icons.help),
              title: Text(isRTL ? 'المساعدة' : 'Help'),
              onTap: () {
                Navigator.pop(context);
                Navigator.pushNamed(context, '/help');
              },
            ),
            ListTile(
              leading: const Icon(Icons.settings),
              title: Text(isRTL ? 'الإعدادات' : 'Settings'),
              onTap: () {
                Navigator.pop(context);
                Navigator.pushNamed(context, '/settings');
              },
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          // Top Slider (Segmented Control) - Stitch Design
          _buildTopSlider(isRTL),
          // Page Content - switches based on tab selection
          Expanded(
            child: PageView(
              controller: _pageController,
              onPageChanged: (index) {
                setState(() {
                  _currentTabIndex = index;
                });
              },
              children: [
                // Overview tab content
                _buildOverviewContent(currency, isRTL),
                // Orders tab - placeholder, navigates to orders screen
                _buildOrdersPlaceholder(isRTL),
                // Menu tab - placeholder, navigates to menu screen
                _buildMenuContent(isRTL),
                // Marketing tab - placeholder
                _buildMarketingPlaceholder(isRTL),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: const GlobalBottomNavigation(),
    );
  }

  // Overview content view
  Widget _buildOverviewContent(String currency, bool isRTL) {
    return _isLoading
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
                        childAspectRatio: 1.6,
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
              );
  }

  // Orders placeholder - navigates to orders screen
  Widget _buildOrdersPlaceholder(bool isRTL) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.receipt_long, size: 64, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text(
            isRTL ? 'الطلبات' : 'Orders',
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          ElevatedButton(
            onPressed: () {
              Navigator.pushNamed(context, '/orders');
            },
            child: Text(isRTL ? 'عرض الطلبات' : 'View Orders'),
          ),
        ],
      ),
    );
  }

  // Menu content view - displays menu items from API (Stitch design)
  Widget _buildMenuContent(bool isRTL) {
    if (_isMenuLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    return RefreshIndicator(
      onRefresh: _loadMenuItems,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 16),
            // Search & Filter Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  // Search bar
                  Expanded(
                    child: Container(
                      height: 48,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: const Color(0xFFACADAD).withOpacity(0.3),
                          width: 1,
                        ),
                      ),
                      child: Row(
                        children: [
                          const SizedBox(width: 12),
                          Icon(Icons.search, color: Colors.grey[600], size: 20),
                          const SizedBox(width: 8),
                          Expanded(
                            child: TextField(
                              decoration: InputDecoration(
                                hintText: isRTL ? 'بحث...' : 'Search menu items...',
                                hintStyle: TextStyle(color: Colors.grey[400], fontSize: 14),
                                border: InputBorder.none,
                                contentPadding: EdgeInsets.zero,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Filter button
                  Container(
                    height: 48,
                    width: 48,
                    decoration: BoxDecoration(
                      color: const Color(0xFFFCD535),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.tune, color: Color(0xFF2D2F2F)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Title & + Dish Button
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isRTL ? 'قائمة الطعام' : 'Menu',
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF2D2F2F),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          isRTL ? 'أدر قائمة طعامك وأنشئ أطباق جديدة 📋' : 'Manage your menu and Create new dishes 📋',
                          style: const TextStyle(
                            fontSize: 12,
                            color: Color(0xFF5A5C5C),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  // + Dish button (visual only, not final flow)
                  GestureDetector(
                    onTap: () {
                      // TODO: Implement + Dish flow later
                      debugPrint('+ Dish tapped - not implemented yet');
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF27AE60),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.add, color: Colors.white, size: 18),
                          const SizedBox(width: 4),
                          Text(
                            isRTL ? 'طبق' : 'Dish',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Table Header Row
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFFEEEEEE),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  SizedBox(width: 50, child: FittedBox(fit: BoxFit.scaleDown, child: Text(isRTL ? 'صورة' : 'ITEM', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF666666))))),
                  Expanded(child: FittedBox(fit: BoxFit.scaleDown, child: Text(isRTL ? 'التفاصيل' : 'DETAILS', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF666666))))),
                  SizedBox(width: 80, child: FittedBox(fit: BoxFit.scaleDown, child: Text(isRTL ? 'الإجراءات' : 'ACTIONS', textAlign: TextAlign.center, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF666666))))),
                ],
              ),
            ),

            // Menu items list
            if (_menuItems.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: _buildEmptyMenuState(isRTL),
              )
            else
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: _menuItems.length,
                itemBuilder: (context, index) {
                  final item = _menuItems[index];
                  return _buildMenuTableRow(item, isRTL);
                },
              ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  // Empty menu state
  Widget _buildEmptyMenuState(bool isRTL) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.restaurant_menu, size: 64, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text(
            isRTL ? 'قائمة الطعام فارغة' : 'No menu items yet',
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Color(0xFF5A5C5C),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            isRTL ? 'أضف أطباق من صفحة إدارة الطهاة' : 'Add dishes from cook management page',
            style: const TextStyle(
              fontSize: 14,
              color: Color(0xFF9E9E9E),
            ),
          ),
        ],
      ),
    );
  }

  // Menu item row - table/row layout (not card)
  Widget _buildMenuTableRow(Map<String, dynamic> item, bool isRTL) {
    // Safe field extraction with multiple fallbacks
    final title = item['name'] ?? 
                  item['title'] ?? 
                  item['dishName'] ?? 
                  item['dishTitle'] ?? 
                  'Unknown Dish';
    final priceValue = item['price'] ?? item['offerPrice'] ?? 0;
    final price = priceValue is num ? priceValue.toStringAsFixed(0) : (priceValue is String ? priceValue : '0');
    final deliveryFee = (item['deliveryFee'] ?? item['deliveryCost'] ?? 0);
    final isActive = item['isActive'] == true || item['active'] == true || item['status'] == 'active';
    final imageUrl = item['imageUrl'] ?? 
                     item['image'] ?? 
                     (item['images'] is List && (item['images'] as List).isNotEmpty ? (item['images'] as List).first : null) ?? 
                     item['photoUrl'];
    final inStock = item['inStock'] ?? 
                    item['isAvailable'] ?? 
                    item['available'] ?? 
                    (item['stockCount'] != null && item['stockCount'] > 0) ?? 
                    true;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFE0E0E0), width: 1),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 50,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: imageUrl != null && imageUrl.toString().isNotEmpty
                  ? Image.network(
                      imageUrl.toString(),
                      width: 44,
                      height: 44,
                      fit: BoxFit.cover,
                      loadingBuilder: (context, child, loadingProgress) {
                        if (loadingProgress == null) return child;
                        return Container(
                          width: 44,
                          height: 44,
                          color: const Color(0xFFF6F6F6),
                          child: const Center(child: CircularProgressIndicator(value: null, strokeWidth: 2)),
                        );
                      },
                      errorBuilder: (context, error, stackTrace) {
                        debugPrint('Image load error: $error');
                        return _buildPlaceholderImageSmall();
                      },
                    )
                  : _buildPlaceholderImageSmall(),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF2D2F2F)),
                    maxLines: 1, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 3),
                Row(
                  children: [
                    Text('$price SAR', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFFF68A2F))),
                    if (deliveryFee > 0) ...[
                      const SizedBox(width: 8),
                      Text('+ $deliveryFee SAR', style: TextStyle(fontSize: 10, color: Colors.grey[600])),
                    ],
                  ],
                ),
                const SizedBox(height: 3),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: inStock ? const Color(0xFFE8F5E9) : const Color(0xFFFFEBEE),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(inStock ? (isRTL ? 'متوفر' : 'In Stock') : (isRTL ? 'نفذ' : 'Out'),
                      style: TextStyle(fontSize: 9, fontWeight: FontWeight.w600,
                          color: inStock ? const Color(0xFF2E7D32) : const Color(0xFFC62828))),
                ),
              ],
            ),
          ),
          SizedBox(
            width: 80,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                GestureDetector(
                  onTap: () => debugPrint('Toggle: $title'),
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: isActive ? const Color(0xFFE8F5E9) : const Color(0xFFF5F5F5),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Icon(isActive ? Icons.visibility : Icons.visibility_off, size: 16,
                        color: isActive ? const Color(0xFF2E7D32) : const Color(0xFF757575)),
                  ),
                ),
                const SizedBox(width: 6),
                GestureDetector(
                  onTap: () => debugPrint('Edit: $title'),
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(color: const Color(0xFFF6F6F6), borderRadius: BorderRadius.circular(6)),
                    child: const Icon(Icons.edit, size: 16, color: Color(0xFF666666)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }


  Widget _buildPlaceholderImageLarge() {
    return Container(
      width: 80,
      height: 80,
      decoration: BoxDecoration(
        color: const Color(0xFFF6F6F6),
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Icon(Icons.restaurant, color: Color(0xFF9E9E9E), size: 32),
    );
  }

  Widget _buildPlaceholderImageSmall() {
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: const Color(0xFFF6F6F6),
        borderRadius: BorderRadius.circular(6),
      ),
      child: const Icon(Icons.restaurant, color: Color(0xFF9E9E9E), size: 18),
    );
  }

  // Menu placeholder - navigates to menu screen (for separate screen navigation)
  Widget _buildMenuPlaceholder(bool isRTL) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.restaurant_menu, size: 64, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text(
            isRTL ? 'قائمة الطعام' : 'Menu',
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          ElevatedButton(
            onPressed: () {
              Navigator.pushNamed(context, '/cook/menu');
            },
            child: Text(isRTL ? 'عرض القائمة' : 'View Menu'),
          ),
        ],
      ),
    );
  }

  // Marketing placeholder
  Widget _buildMarketingPlaceholder(bool isRTL) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.campaign, size: 64, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text(
            isRTL ? 'التسويق' : 'Marketing',
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            isRTL ? 'قريباً' : 'Coming soon',
            style: TextStyle(color: Colors.grey[600]),
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
                child: const Row(
                  children: [
                    Text(
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
                      color: Color(0xFFFF7A00),
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
                child: const Row(
                  children: [
                    Text(
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
                      color: Color(0xFFFF7A00),
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
              const Icon(Icons.visibility, size: 14, color: Color(0xFF666666)),
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
                  const Icon(Icons.trending_up, size: 12, color: Color(0xFF2E7D32)),
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
    return const Divider(
      height: 1,
      thickness: 1,
      color: Color(0xFFE0E0E0),
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
            final isSelected = index == _currentTabIndex;
            final label = isRTL ? tabs[index]['ar']! : tabs[index]['en']!;

            return Padding(
              padding: EdgeInsets.only(
                left: isRTL ? 0 : 8,
                right: isRTL ? 8 : 0,
              ),
              child: GestureDetector(
                onTap: () {
                  // Use PageView to switch between tabs
                  _pageController.animateToPage(
                    index,
                    duration: const Duration(milliseconds: 300),
                    curve: Curves.easeInOut,
                  );
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
