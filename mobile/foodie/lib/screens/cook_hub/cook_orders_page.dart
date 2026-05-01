import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../config/api_config.dart';
import '../../providers/language_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/country_provider.dart';
import 'cook_order_details_screen.dart';
import 'package:intl/intl.dart';

/// Helper class for grouping items
class CookItemGroup {
  final String fulfillmentMode;
  final DateTime? readyAt;
  final List<Map<String, dynamic>> items;
  final String? subOrderId; // Added: real subOrder._id for status updates

  CookItemGroup({
    required this.fulfillmentMode,
    this.readyAt,
    required this.items,
    this.subOrderId,
  });
}

/// Helper to group items by fulfillment mode and readyAt for Cook Hub
List<CookItemGroup> groupItemsByFulfillmentAndReady(List<Map<String, dynamic>> items, String timingPreference, {List<Map<String, dynamic>>? subOrders}) {
  // If subOrders array exists (new API), use it directly with real subOrder IDs
  if (subOrders != null && subOrders.isNotEmpty) {
    return subOrders.map((subOrder) {
      final subOrderItems = (subOrder['items'] as List<dynamic>?)?.cast<Map<String, dynamic>>() ?? [];
      return CookItemGroup(
        fulfillmentMode: (subOrder['fulfillmentMode'] ?? 'pickup').toString(),
        readyAt: subOrderItems.isNotEmpty && subOrderItems[0]['readyAt'] != null 
            ? DateTime.parse(subOrderItems[0]['readyAt']) 
            : null,
        items: subOrderItems,
        subOrderId: subOrder['_id']?.toString(), // Real subOrder._id for actions
      );
    }).toList();
  }
  
  // Fallback: group flattened items (old API or backward compatibility)
  final Map<String, CookItemGroup> groups = {};
  
  for (final item in items) {
    final fulfillmentMode = (item['fulfillmentMode'] ?? 'pickup').toString();
    
    // Group by readyAt only if timingPreference is 'separate'
    final readyAtStr = timingPreference == 'separate' ? (item['readyAt'] as String?) : null;
    final readyAt = readyAtStr != null ? DateTime.parse(readyAtStr) : null;
    final groupKey = '${fulfillmentMode}_${readyAtStr ?? 'combined'}';
    
    if (!groups.containsKey(groupKey)) {
      groups[groupKey] = CookItemGroup(
        fulfillmentMode: fulfillmentMode,
        readyAt: readyAt,
        items: [],
      );
    }
    groups[groupKey]!.items.add(item);
  }
  
  return groups.values.toList();
}

/// Cook Hub Orders Page - Updated with Stitch UI refinements
class CookOrdersPage extends StatefulWidget {
  const CookOrdersPage({Key? key}) : super(key: key);

  @override
  State<CookOrdersPage> createState() => _CookOrdersPageState();
}

class _CookOrdersPageState extends State<CookOrdersPage> {
  List<Map<String, dynamic>> _orders = [];
  bool _isLoading = true;
  String? _error;
  String _searchQuery = '';
  String _filterStatus = 'active'; // 'active', 'completed'
  bool _isSearchFocused = false;
  bool _isClearing = false; // Prevent expansion when clearing
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchOrders();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchOrders() async {
    final authProvider = context.read<AuthProvider>();
    final token = authProvider.token;

    if (token == null) {
      setState(() {
        _error = 'Authentication required';
        _isLoading = false;
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await http.get(
        Uri.parse(ApiConfig.cookOrdersEndpoint),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        
        List<Map<String, dynamic>> orders = [];
        if (data is List) {
          orders = data.cast<Map<String, dynamic>>();
        } else if (data is Map && data.containsKey('orders')) {
          orders = (data['orders'] as List?)?.cast<Map<String, dynamic>>() ?? [];
        } else if (data is Map && data.containsKey('data')) {
          orders = (data['data'] as List?)?.cast<Map<String, dynamic>>() ?? [];
        }
        
        setState(() {
          _orders = orders;
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = 'Failed to load orders: ${response.statusCode}';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Error loading orders: $e';
        _isLoading = false;
      });
    }
  }

  // Get filtered orders
  List<Map<String, dynamic>> get _filteredOrders {
    var filtered = _orders;
    
    // Filter by status category
    if (_filterStatus == 'active') {
      filtered = filtered.where((order) {
        final status = (order['status'] ?? '').toString().toLowerCase();
        return status != 'delivered' && status != 'completed' && status != 'pickedup';
      }).toList();
    } else if (_filterStatus == 'completed') {
      filtered = filtered.where((order) {
        final status = (order['status'] ?? '').toString().toLowerCase();
        return status == 'delivered' || status == 'completed' || status == 'pickedup';
      }).toList();
    }
    
    // Filter by search query - search across all visible order content
    if (_searchQuery.isEmpty) return filtered;
    
    final query = _searchQuery.toLowerCase();
    return filtered.where((order) {
      try {
        // Search in customer name
        final customerName = (order['customer']?['name'] ?? '').toString().toLowerCase();
        
        // Search in order number/ID
        final orderNumber = (order['orderNumber'] ?? order['_id'] ?? '').toString().toLowerCase();
        
        // Search in dish names from items array
        final items = (order['items'] as List?)?.cast<Map<String, dynamic>>() ?? [];
        final dishNames = items.map((item) {
          final productName = (item['productSnapshot']?['name'] ?? 
                              item['product']?['name'] ?? 
                              item['dishName'] ?? '').toString().toLowerCase();
          final notes = (item['notes'] ?? item['specialRequests'] ?? '').toString().toLowerCase();
          return '$productName $notes';
        }).join(' ');
        
        // Search in payment method
        final paymentMethod = (order['paymentMethod'] ?? order['paymentStatus'] ?? '').toString().toLowerCase();
        
        // Search in fulfillment mode
        final fulfillmentMode = (order['fulfillmentMode'] ?? order['deliveryMode'] ?? '').toString().toLowerCase();
        
        // Combine all searchable fields
        final searchableText = '$customerName $orderNumber $dishNames $paymentMethod $fulfillmentMode';
        
        return searchableText.contains(query);
      } catch (e) {
        print('⚠️ [SEARCH ERROR] Error filtering order: $e');
        return false;
      }
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;

    return RefreshIndicator(
      onRefresh: _fetchOrders,
      child: GestureDetector(
        // Tap anywhere outside search bar to unfocus
        onTap: () {
          if (_isSearchFocused) {
            setState(() => _isSearchFocused = false);
            // Unfocus the text field
            FocusScope.of(context).unfocus();
          }
        },
        behavior: HitTestBehavior.translucent,
        child: CustomScrollView(
          slivers: [
          // Search & Filter Bar - Simplified toggle (Styling matches Foodie Menu)
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: _isSearchFocused
                  ? TextField(
                      controller: _searchController,
                      onChanged: (value) {
                        setState(() => _searchQuery = value);
                      },
                      onSubmitted: (value) {
                        setState(() => _isSearchFocused = false);
                      },
                      decoration: InputDecoration(
                        hintText: isRTL ? 'بحث...' : 'Search orders...',
                        hintStyle: const TextStyle(color: Color(0xFF969494), fontSize: 14),
                        prefixIcon: const Icon(Icons.search, color: Color(0xFF969494), size: 20),
                        suffixIcon: _searchQuery.isNotEmpty
                            ? GestureDetector(
                                onTap: () {
                                  _searchController.clear();
                                  setState(() => _searchQuery = '');
                                },
                                child: const Icon(Icons.close, color: Color(0xFF969494), size: 20),
                              )
                            : null,
                        filled: true,
                        fillColor: const Color(0xFFE7E7E7),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      ),
                    )
                  : Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _searchController,
                            onChanged: (value) {
                              setState(() => _searchQuery = value);
                            },
                            onTap: () {
                              // Don't expand if we're clearing
                              if (!_isClearing) {
                                setState(() => _isSearchFocused = true);
                              }
                            },
                            decoration: InputDecoration(
                              hintText: isRTL ? 'بحث...' : 'Search orders...',
                              hintStyle: const TextStyle(color: Color(0xFF969494), fontSize: 14),
                              prefixIcon: const Icon(Icons.search, color: Color(0xFF969494), size: 20),
                              suffixIcon: _searchQuery.isNotEmpty
                                  ? GestureDetector(
                                      onTap: () {
                                        setState(() => _isClearing = true);
                                        _searchController.clear();
                                        setState(() {
                                          _searchQuery = '';
                                          _isClearing = false;
                                        });
                                        // Don't expand search bar when clearing
                                      },
                                      child: const Icon(Icons.close, color: Color(0xFF969494), size: 20),
                                    )
                                  : null,
                              filled: true,
                              fillColor: const Color(0xFFE7E7E7),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide.none,
                              ),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                            ),
                          ),
                        ),
                        
                        const SizedBox(width: 12),
                        
                        // Rectangular toggle control (Active / Completed)
                        Container(
                          decoration: BoxDecoration(
                            color: const Color(0xFFE0E0E0),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              GestureDetector(
                                onTap: () => setState(() => _filterStatus = 'active'),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                  decoration: BoxDecoration(
                                    color: _filterStatus == 'active' ? Colors.white : Colors.transparent,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    isRTL ? 'نشطة' : 'Active',
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: _filterStatus == 'active' ? FontWeight.bold : FontWeight.normal,
                                      color: _filterStatus == 'active' ? const Color(0xFFF68A2F) : const Color(0xFF5A5C5C),
                                    ),
                                  ),
                                ),
                              ),
                              GestureDetector(
                                onTap: () => setState(() => _filterStatus = 'completed'),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                  decoration: BoxDecoration(
                                    color: _filterStatus == 'completed' ? Colors.white : Colors.transparent,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    isRTL ? 'مكتملة' : 'Completed',
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: _filterStatus == 'completed' ? FontWeight.bold : FontWeight.normal,
                                      color: _filterStatus == 'completed' ? const Color(0xFFF68A2F) : const Color(0xFF5A5C5C),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
            ),
          ),

          // Loading state
          if (_isLoading)
            const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator(color: Color(0xFF904800))),
            )
          
          // Error state
          else if (_error != null)
            SliverFillRemaining(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.error_outline, size: 48, color: Colors.grey[600]),
                    const SizedBox(height: 16),
                    Text(_error!, style: TextStyle(color: Colors.grey[600])),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: _fetchOrders,
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            )

          // Empty state
          else if (_filteredOrders.isEmpty)
            SliverFillRemaining(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.receipt_long, size: 48, color: Colors.grey[400]),
                    const SizedBox(height: 16),
                    Text(
                      _searchQuery.isNotEmpty 
                          ? (isRTL ? 'لم يتم العثور على طلبات' : 'No orders found')
                          : (isRTL ? 'لا توجد طلبات' : 'No orders yet'),
                      style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                    ),
                  ],
                ),
              ),
            )

          // Orders list
          else
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) => _buildOrderCard(context, _filteredOrders[index], isRTL),
                childCount: _filteredOrders.length,
              ),
            ),

          // Bottom padding
          const SliverToBoxAdapter(
            child: SizedBox(height: 120),
          ),
        ],
      ),
      ),
    );
  }

  Widget _buildOrderCard(BuildContext context, Map<String, dynamic> order, bool isRTL) {
    final orderId = order['_id'] ?? order['orderNumber'] ?? '';
    final shortOrderId = orderId.length > 6 ? '#${orderId.substring(orderId.length - 6)}' : '#$orderId';
    
    DateTime orderDate;
    try {
      orderDate = DateTime.parse(order['createdAt']);
    } catch (_) {
      orderDate = DateTime.now();
    }
    final timeStr = DateFormat('h:mm a').format(orderDate);
    final dateStr = DateFormat('MMM d, y').format(orderDate);
    
    final customerName = order['customer']?['name'] ?? 'Unknown Customer';
    final totalAmount = (order['totalAmount'] ?? order['total'] ?? 0.0).toDouble();
    final status = (order['status'] ?? '').toString().toLowerCase();
    final paymentMethod = order['paymentMethod'] ?? order['paymentStatus'] ?? 'card';
    final fulfillmentMode = order['fulfillmentMode'] ?? order['deliveryMode'] ?? 'delivery';
    
    final items = (order['items'] as List?)?.cast<Map<String, dynamic>>() ?? [];
    final isOverdue = _isOrderOverdue(order);
    
    // Get currency symbol from country provider
    final countryProvider = Provider.of<CountryProvider>(context, listen: false);
    final currencySymbol = countryProvider.getLocalizedCurrency(isRTL);

    // Status styling with colored badges
    String statusText;
    Color statusBgColor;
    Color statusTextColor;
    
    switch (status) {
      case 'order_received':
        statusText = isRTL ? 'جديد' : 'NEW';
        statusBgColor = const Color(0xFFFFF8E1); // Warm yellow
        statusTextColor = const Color(0xFFB45309);
        break;
      case 'preparing':
      case 'cooking':
        statusText = isRTL ? 'قيد التحضير' : 'Preparing';
        statusBgColor = const Color(0xFFFEF3C7); // Soft orange
        statusTextColor = const Color(0xFFB45309);
        break;
      case 'ready':
        statusText = isRTL ? 'جاهز' : 'Ready';
        statusBgColor = const Color(0xFFDCFCE7); // Green
        statusTextColor = const Color(0xFF166534);
        break;
      case 'out_for_delivery':
        statusText = isRTL ? 'في الطريق' : 'Out for Delivery';
        statusBgColor = const Color(0xFFDBEAFE); // Blue
        statusTextColor = const Color(0xFF1E40AF);
        break;
      case 'delivered':
      case 'completed':
        statusText = isRTL ? 'تم التسليم' : 'Delivered';
        statusBgColor = const Color(0xFFDCFCE7); // Green
        statusTextColor = const Color(0xFF166534);
        break;
      case 'pickedup':
        statusText = isRTL ? 'تم الاستلام' : 'Picked Up';
        statusBgColor = const Color(0xFFDCFCE7); // Green
        statusTextColor = const Color(0xFF166534);
        break;
      case 'cancelled':
        statusText = isRTL ? 'ملغى' : 'Cancelled';
        statusBgColor = const Color(0xFFFEE2E2); // Red
        statusTextColor = const Color(0xFF991B1B);
        break;
      default:
        statusText = status.toUpperCase();
        statusBgColor = const Color(0xFFF0F0F0);
        statusTextColor = const Color(0xFF5A5C5C);
    }

    return GestureDetector(
      onTap: () => _showActionSheet(context, order, isRTL),
      child: Container(
        margin: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(32),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 20,
              offset: const Offset(0, 4),
            ),
          ],
          border: Border.all(color: const Color(0xFFEBEBEB)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              decoration: BoxDecoration(
                color: const Color(0xFFFAFAFA),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(32),
                  topRight: Radius.circular(32),
                ),
                border: Border(bottom: BorderSide(color: Colors.grey[100]!)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Row(
                      children: [
                        Text(
                          shortOrderId,
                          style: const TextStyle(
                            fontFamily: 'monospace',
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF2D2F2F),
                          ),
                        ),
                        const SizedBox(width: 4),
                        Container(
                          width: 3,
                          height: 3,
                          decoration: BoxDecoration(
                            color: Colors.grey[300],
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '$timeStr • $dateStr',
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.grey[600],
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: statusBgColor,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      statusText,
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        color: statusTextColor,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Body
            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.person, color: Color(0xFF5A5C5C), size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          customerName,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF2D2F2F),
                          ),
                        ),
                      ),
                      Text(
                        '$currencySymbol${totalAmount.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF2D2F2F),
                        ),
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 16),
                  
                  // Items - Grouped by fulfillment and ready time
                  ...(() {
                    final timingPref = (order['timingPreference'] ?? 'separate').toString();
                    final subOrders = order['subOrders'] as List<dynamic>?;
                    final groups = groupItemsByFulfillmentAndReady(
                      items, 
                      timingPref,
                      subOrders: subOrders?.cast<Map<String, dynamic>>(),
                    );
                    final widgets = <Widget>[];
                    
                    for (var i = 0; i < groups.length; i++) {
                      final group = groups[i];
                      
                      // Add group header if multiple groups
                      if (groups.length > 1) {
                        widgets.add(
                          Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: group.fulfillmentMode.toLowerCase() == 'pickup' 
                                        ? const Color(0xFF6B7280) 
                                        : const Color(0xFF3B82F6),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        group.fulfillmentMode.toLowerCase() == 'pickup' 
                                            ? Icons.store 
                                            : Icons.delivery_dining, 
                                        size: 12, 
                                        color: Colors.white,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        group.fulfillmentMode.toLowerCase() == 'pickup' ? 'Pickup' : 'Delivery',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 10,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                if (group.readyAt != null) ...[
                                  const SizedBox(width: 8),
                                  Text(
                                    '• ${DateFormat('h:mm a').format(group.readyAt!)}',
                                    style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        );
                      }
                      
                      // Add items in this group
                      for (final item in group.items) {
                        widgets.add(
                          Padding(
                            padding: EdgeInsets.only(
                              bottom: 8,
                              left: groups.length > 1 ? 16 : 0,
                              right: groups.length > 1 ? 16 : 0,
                            ),
                            child: _buildDishRow(item, isRTL),
                          ),
                        );
                      }
                      
                      // Add spacing between groups
                      if (i < groups.length - 1) {
                        widgets.add(const SizedBox(height: 12));
                      }
                    }
                    
                    return widgets;
                  })(),
                  
                  const SizedBox(height: 16),
                  
                  // Footer
                  Container(
                    padding: const EdgeInsets.only(top: 16),
                    decoration: BoxDecoration(
                      border: Border(top: BorderSide(color: Colors.grey[100]!)),
                    ),
                    child: Row(
                      children: [
                        Row(
                          children: [
                            Icon(
                              paymentMethod.toLowerCase() == 'cash' 
                                  ? Icons.payments 
                                  : Icons.credit_card,
                              color: Colors.grey[500],
                              size: 18,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              paymentMethod.toLowerCase() == 'cash' ? 'Cash' : 'Card',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: Colors.grey[500],
                              ),
                            ),
                          ],
                        ),
                        
                        const SizedBox(width: 16),
                        
                        Row(
                          children: [
                            Icon(
                              fulfillmentMode.toLowerCase() == 'pickup' 
                                  ? Icons.takeout_dining 
                                  : Icons.delivery_dining,
                              color: Colors.grey[500],
                              size: 18,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              fulfillmentMode.toLowerCase() == 'pickup' ? 'Pickup' : 'Delivery',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: Colors.grey[500],
                              ),
                            ),
                          ],
                        ),
                        
                        const Spacer(),
                        
                        if (isOverdue)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFFB02500),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text(
                              'OVERDUE',
                              style: TextStyle(
                                fontSize: 8,
                                fontWeight: FontWeight.w900,
                                color: Colors.white,
                                letterSpacing: 1,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDishRow(Map<String, dynamic> item, bool isRTL) {
    final quantity = item['quantity'] ?? 1;
    final productName = item['productSnapshot']?['name'] ?? 
                       item['product']?['name'] ?? 
                       item['dishName'] ?? 'Unknown Dish';
    final productImage = item['productSnapshot']?['image'] ?? 
                        item['product']?['photoUrl'] ?? 
                        item['product']?['images']?.firstOrNull;
    final notes = item['notes'] ?? item['specialRequests'] ?? '';
    
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Container(
              width: 48,
              height: 48,
              color: const Color(0xFFF5F5F5),
              child: productImage != null
                  ? Image.network(
                      productImage,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const Icon(Icons.restaurant, color: Color(0xFFF68A2F)),
                    )
                  : const Icon(Icons.restaurant, color: Color(0xFFF68A2F)),
            ),
          ),
          
          const SizedBox(width: 12),
          
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  productName,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF2D2F2F),
                    height: 1.2,
                  ),
                ),
                if (notes.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    notes,
                    style: TextStyle(
                      fontSize: 10,
                      color: Colors.grey[500],
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                const SizedBox(height: 2),
                Text(
                  'x$quantity',
                  style: TextStyle(
                    fontSize: 10,
                    color: Colors.grey[500],
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  bool _isOrderOverdue(Map<String, dynamic> order) {
    final status = (order['status'] ?? '').toString().toLowerCase();
    if (status == 'delivered' || status == 'completed' || status == 'cancelled') return false;
    
    try {
      final createdAt = DateTime.parse(order['createdAt']);
      final prepTime = int.tryParse(order['prepTime'].toString()) ?? 30;
      final readyBy = createdAt.add(Duration(minutes: prepTime));
      return DateTime.now().isAfter(readyBy);
    } catch (_) {
      return false;
    }
  }

  void _showActionSheet(BuildContext context, Map<String, dynamic> order, bool isRTL) {
    final status = (order['status'] ?? '').toString().toLowerCase();
    final orderId = order['_id'] ?? order['orderNumber'] ?? '';
    final subOrders = order['subOrders'] as List<dynamic>?;
    final customerPhone = order['customer']?['phone'] ?? '';
    final fulfillmentMode = (order['fulfillmentMode'] ?? order['deliveryMode'] ?? '').toString().toLowerCase();
    
    // For backward compatibility: if no subOrders array, use old approach
    final hasMultipleSubOrders = subOrders != null && subOrders.length > 1;
    
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(40)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Container(
                width: 40,
                height: 5,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
            ),
            
            // Action items - tight fit
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Column(
                children: [
                  _buildActionItem(
                    icon: Icons.visibility,
                    label: isRTL ? 'عرض تفاصيل الطلب' : 'View Order Details',
                    iconColor: const Color(0xFFF28C28),
                    bgColor: const Color(0xFFF5F5F5),
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => CookOrderDetailsScreen(orderId: orderId),
                        ),
                      ).then((_) => _fetchOrders());
                    },
                  ),
                  
                  // If multiple subOrders, show actions per subOrder group
                  if (hasMultipleSubOrders) ..._buildMultiSubOrderActions(subOrders, isRTL)
                  else ..._buildSingleSubOrderActions(
                    subOrderId: subOrders != null && subOrders.isNotEmpty 
                        ? (subOrders[0]['_id']?.toString() ?? '')
                        : (order['subOrderId']?.toString() ?? ''),
                    status: status,
                    fulfillmentMode: subOrders != null && subOrders.isNotEmpty
                        ? (subOrders[0]['fulfillmentMode'] ?? fulfillmentMode).toString().toLowerCase()
                        : fulfillmentMode,
                    isRTL: isRTL,
                  ),
                  
                  if (customerPhone.isNotEmpty)
                    _buildActionItem(
                      icon: Icons.chat_bubble,
                      label: isRTL ? 'تواصل مع الزبون' : 'Contact Foodie',
                      iconColor: const Color(0xFF6B7280),
                      bgColor: const Color(0xFFF5F5F5),
                      onTap: () {
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(isRTL ? 'رقم الزبون: $customerPhone' : 'Customer phone: $customerPhone')),
                        );
                      },
                    ),
                  
                  const Divider(height: 16),

                  _buildActionItem(
                    icon: Icons.cancel,
                    label: isRTL ? 'إلغاء الطلب' : 'Cancel Order',
                    iconColor: const Color(0xFFEF4444),
                    bgColor: const Color(0xFFFEE2E2),
                    textColor: const Color(0xFFDC2626),
                    onTap: () {
                      Navigator.pop(context);
                      _showCancelDialog(
                        hasMultipleSubOrders ? null : (subOrders != null && subOrders.isNotEmpty 
                            ? (subOrders[0]['_id']?.toString() ?? '')
                            : (order['subOrderId']?.toString() ?? '')),
                        subOrders: hasMultipleSubOrders ? subOrders : null,
                      );
                    },
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  // Build actions for orders with multiple subOrders (mixed pickup/delivery)
  List<Widget> _buildMultiSubOrderActions(List<dynamic> subOrders, bool isRTL) {
    final widgets = <Widget>[];
    
    for (int i = 0; i < subOrders.length; i++) {
      final subOrder = subOrders[i];
      final subOrderId = subOrder['_id']?.toString() ?? '';
      final subOrderStatus = (subOrder['status'] ?? '').toString().toLowerCase();
      final subOrderFulfillment = (subOrder['fulfillmentMode'] ?? 'pickup').toString().toLowerCase();
      
      // Add group header
      if (i > 0) widgets.add(const Divider(height: 24));
      widgets.add(
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: subOrderFulfillment == 'pickup' ? const Color(0xFF6B7280) : const Color(0xFF3B82F6),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      subOrderFulfillment == 'pickup' ? Icons.store : Icons.delivery_dining,
                      size: 12,
                      color: Colors.white,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      subOrderFulfillment == 'pickup' ? (isRTL ? 'استلام' : 'Pickup') : (isRTL ? 'توصيل' : 'Delivery'),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
      
      // Add actions for this subOrder
      widgets.addAll(_buildSingleSubOrderActions(
        subOrderId: subOrderId,
        status: subOrderStatus,
        fulfillmentMode: subOrderFulfillment,
        isRTL: isRTL,
      ));
    }
    
    return widgets;
  }

  // Build actions for a single subOrder
  List<Widget> _buildSingleSubOrderActions({
    required String subOrderId,
    required String status,
    required String fulfillmentMode,
    required bool isRTL,
  }) {
    final widgets = <Widget>[];
    
    if (status == 'order_received' || status == 'preparing' || status == 'cooking') {
      widgets.add(
        _buildActionItem(
          icon: Icons.check_circle,
          label: isRTL ? 'علّم كجاهز' : 'Mark as Ready',
          iconColor: const Color(0xFF22C55E),
          bgColor: const Color(0xFFDCFCE7),
          onTap: () async {
            Navigator.pop(context);
            await _updateOrderStatus(subOrderId, 'ready');
          },
        ),
      );
    } else if (status == 'ready' && fulfillmentMode == 'delivery') {
      widgets.add(
        _buildActionItem(
          icon: Icons.check_circle,
          label: isRTL ? 'علّم كمسلم' : 'Mark as Delivered',
          iconColor: const Color(0xFF22C55E),
          bgColor: const Color(0xFFDCFCE7),
          onTap: () async {
            Navigator.pop(context);
            await _updateOrderStatus(subOrderId, 'delivered');
          },
        ),
      );
    } else if (status == 'ready' && fulfillmentMode == 'pickup') {
      widgets.add(
        _buildActionItem(
          icon: Icons.check_circle,
          label: isRTL ? 'علّم كمستلم' : 'Mark as Picked Up',
          iconColor: const Color(0xFF22C55E),
          bgColor: const Color(0xFFDCFCE7),
          onTap: () async {
            Navigator.pop(context);
            await _updateOrderStatus(subOrderId, 'pickedup');
          },
        ),
      );
    }
    
    // View Shipping Details - for delivery orders only
    if (fulfillmentMode == 'delivery') {
      widgets.add(
        _buildActionItem(
          icon: Icons.local_shipping,
          label: isRTL ? 'عرض تفاصيل الشحن' : 'View Shipping Details',
          iconColor: const Color(0xFF3B82F6),
          bgColor: const Color(0xFFDBEAFE),
          onTap: () {
            Navigator.pop(context);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(isRTL ? 'جاري فتح تفاصيل الشحن...' : 'Opening shipping details...')),
            );
          },
        ),
      );
    }
    
    return widgets;
  }

  Widget _buildActionItem({
    required IconData icon,
    required String label,
    required Color iconColor,
    required Color bgColor,
    Color? textColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Icon(icon, color: iconColor, size: 22),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: textColor ?? const Color(0xFF2D2F2F),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showCancelDialog(String? subOrderId, {List<dynamic>? subOrders}) {
    // If multiple subOrders, show selector
    if (subOrders != null && subOrders.length > 1) {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Cancel Order Group'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: subOrders.map((sub) {
              final subId = sub['_id']?.toString() ?? '';
              final fulfillment = (sub['fulfillmentMode'] ?? 'pickup').toString().toLowerCase();
              return ListTile(
                leading: Icon(
                  fulfillment == 'pickup' ? Icons.store : Icons.delivery_dining,
                  color: fulfillment == 'pickup' ? const Color(0xFF6B7280) : const Color(0xFF3B82F6),
                ),
                title: Text(fulfillment == 'pickup' ? 'Cancel Pickup' : 'Cancel Delivery'),
                onTap: () {
                  Navigator.pop(context);
                  _confirmCancel(subId);
                },
              );
            }).toList(),
          ),
        ),
      );
    } else if (subOrderId != null && subOrderId.isNotEmpty) {
      _confirmCancel(subOrderId);
    }
  }

  void _confirmCancel(String subOrderId) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel Order'),
        content: const Text('Are you sure you want to cancel this order?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('No'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              await _updateOrderStatus(subOrderId, 'cancelled');
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFEF4444),
            ),
            child: const Text('Yes, Cancel'),
          ),
        ],
      ),
    );
  }

  Future<void> _updateOrderStatus(String orderId, String newStatus) async {
    final authProvider = context.read<AuthProvider>();
    final token = authProvider.token;

    if (token == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Authentication required')),
      );
      return;
    }

    try {
      final response = await http.put(
        Uri.parse('${ApiConfig.baseUrl}/orders/sub-order/$orderId/status'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode({'status': newStatus}),
      );

      if (response.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Order status updated to $newStatus')),
        );
        
        // Update local state instead of refetching all orders
        setState(() {
          _orders = _orders.map((order) {
            // If order has subOrders, update the specific subOrder
            if (order['subOrders'] != null && (order['subOrders'] as List).isNotEmpty) {
              return {
                ...order,
                'subOrders': (order['subOrders'] as List).map((subOrder) {
                  if (subOrder['_id'] == orderId) {
                    return {...subOrder, 'status': newStatus};
                  }
                  return subOrder;
                }).toList(),
              };
            }
            // If it's a single order (backward compatibility)
            if (order['_id'] == orderId || order['orderId'] == orderId) {
              return {...order, 'status': newStatus};
            }
            return order;
          }).toList();
        });
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to update order status')),
        );
      }
    } catch (e) {
      print('❌ [ORDER UPDATE] Error: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Error updating order status')),
      );
    }
  }
}