import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/language_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/order_provider.dart';
import '../../providers/country_provider.dart';
import '../../models/order.dart';
import '../reviews/review_submission_screen.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../utils/image_url_utils.dart';

class FoodieMyOrdersScreen extends StatefulWidget {
  final bool reviewMode;
  final String? cookId;
  final String? cookName;

  const FoodieMyOrdersScreen({
    Key? key,
    this.reviewMode = false,
    this.cookId,
    this.cookName,
  }) : super(key: key);

  @override
  State<FoodieMyOrdersScreen> createState() => _FoodieMyOrdersScreenState();
}

class _FoodieMyOrdersScreenState extends State<FoodieMyOrdersScreen>
    with SingleTickerProviderStateMixin {
  int _selectedTab = 0;
  Map<String, dynamic> _ratingStatuses = {};

  final List<String> _activeStatuses = [
    'pending',
    'confirmed',
    'partially_delivered',
    'preparing',
    'ready',
    'out_for_delivery',
  ];

  @override
  void initState() {
    super.initState();
    _loadOrders();
  }

  Future<void> _loadOrders() async {
    final orderProvider = Provider.of<OrderProvider>(context, listen: false);
    final authProvider = Provider.of<AuthProvider>(context, listen: false);

    if (authProvider.token != null) {
      await orderProvider.fetchOrders(authProvider.token!);
      if (widget.reviewMode) {
        await _loadReviewModeData();
      }
    }
  }

  Future<void> _loadReviewModeData() async {
    final orderProvider = Provider.of<OrderProvider>(context, listen: false);
    final authProvider = Provider.of<AuthProvider>(context, listen: false);

    try {
      final completedOrders = orderProvider.orders.where((order) {
        if (!['completed', 'delivered', 'pickedup'].contains(order.status)) return false;
        
        for (final subOrder in order.subOrders ?? []) {
          if (subOrder.cookId.toString() == widget.cookId) {
            return true;
          }
        }
        return false;
      }).toList();

      if (completedOrders.isNotEmpty) {
        final orderIds = completedOrders.map((o) => o.id).toList();
        await orderProvider.fetchBatchRatingStatus(orderIds, authProvider.token ?? '');
        setState(() => _ratingStatuses = orderProvider.ratingStatuses);
      }
    } catch (e) {
      debugPrint('Error loading review mode data: $e');
    }
  }

  List<Order> _getFilteredOrders() {
    final orderProvider = Provider.of<OrderProvider>(context, listen: false);
    final allOrders = orderProvider.orders;

    if (widget.reviewMode && widget.cookId != null) {
      return _filterReviewModeOrders(allOrders);
    }

    switch (_selectedTab) {
      case 0: // Active
        return allOrders.where((order) {
          return _activeStatuses.contains(order.status);
        }).toList();
      case 1: // Completed
        return allOrders.where((order) {
          final status = order.status.toLowerCase();
          return status == 'completed' || status == 'delivered' || status == 'pickedup';
        }).toList();
      case 2: // Cancelled
        return allOrders.where((order) {
          return order.status == 'cancelled';
        }).toList();
      default:
        return [];
    }
  }

  List<Order> _filterReviewModeOrders(List<Order> orders) {
    return orders.where((order) {
      if (!['completed', 'delivered', 'pickedup'].contains(order.status)) return false;

      bool hasCookItems = false;
      for (final subOrder in order.subOrders ?? []) {
        if (subOrder.cookId.toString() == widget.cookId) {
          hasCookItems = true;
          break;
        }
      }
      if (!hasCookItems) return false;

      final ratingStatus = _ratingStatuses[order.id];
      if (ratingStatus != null && ratingStatus['isRated'] == true) {
        return ratingStatus['canEdit'] == true;
      }

      return true;
    }).toList();
  }

  void _handleRateOrder(Order order, bool isRTL) {
    final cooks = <Map<String, dynamic>>[];
    final seenCookIds = <String>{};

    for (final subOrder in order.subOrders ?? []) {
      final cookId = subOrder.cookId;
      if (cookId.isNotEmpty && !seenCookIds.contains(cookId)) {
        seenCookIds.add(cookId);
        cooks.add({
          'cookId': cookId,
          'cookName': subOrder.cookName ?? 'Cook',
        });
      }
    }

    if (cooks.isEmpty) return;

    if (cooks.length == 1) {
      _openReviewScreen(order, cooks.first['cookId'] as String);
    } else {
      _showCookSelector(order, cooks, isRTL);
    }
  }

  void _showCookSelector(Order order, List<Map<String, dynamic>> cooks, bool isRTL) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.grey[300],
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      isRTL ? 'اختر الطاهي للتقييم' : 'Select Cook to Rate',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              ...cooks.map((cook) => ListTile(
                leading: const Icon(Icons.person_outline, color: AppTheme.accentColor),
                title: Text(cook['cookName'] as String),
                trailing: Icon(isRTL ? Icons.arrow_back : Icons.arrow_forward),
                onTap: () {
                  Navigator.pop(context);
                  _openReviewScreen(order, cook['cookId'] as String);
                },
              )),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }

  void _openReviewScreen(Order order, String cookId) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ReviewSubmissionScreen(
          order: order,
          cookId: cookId,
        ),
      ),
    );
  }

  String _formatDate(String? dateString) {
    if (dateString == null) return '';
    try {
      final date = DateTime.parse(dateString);
      return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    } catch (e) {
      return '';
    }
  }

  String _getShortOrderId(String id) {
    return id.length > 6 ? id.substring(id.length - 6) : id;
  }

  String _getStatusText(Order order, bool isRTL) {
    final status = order.status.toLowerCase();
    
    if (status == 'completed' || status == 'delivered' || status == 'pickedup') {
      if (status == 'pickedup') {
        return isRTL ? 'تم الاستلام' : 'Picked Up';
      }
      
      if (order.subOrders.isNotEmpty) {
        final allPickup = order.subOrders.every(
          (sub) => sub.fulfillmentMode?.toLowerCase() == 'pickup'
        );
        
        if (allPickup) {
          return isRTL ? 'تم الاستلام' : 'Picked Up';
        }
      }
      
      return isRTL ? 'تم التوصيل' : 'Delivered';
    }
    
    switch (status) {
      case 'pending':
        return isRTL ? 'قيد الانتظار' : 'Pending';
      case 'confirmed':
        return isRTL ? 'مؤكد' : 'Confirmed';
      case 'preparing':
        return isRTL ? 'قيد التحضير' : 'Being Cooked';
      case 'ready':
        return isRTL ? 'جاهز' : 'Ready';
      case 'delivered':
        return isRTL ? 'تم التوصيل' : 'Delivered';
      case 'completed':
        return isRTL ? 'مكتمل' : 'Completed';
      case 'cancelled':
        return isRTL ? 'ملغى' : 'Cancelled';
      case 'partially_delivered':
        return isRTL ? 'تم التوصيل جزئياً' : 'Partially Delivered';
      case 'order_received':
        return isRTL ? 'تم الاستلام' : 'Order Received';
      default:
        return order.status;
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'pending':
        return const Color(0xFFF59E0B);
      case 'confirmed':
        return const Color(0xFF3B82F6);
      case 'preparing':
        return const Color(0xFFF59E0B);
      case 'ready':
        return const Color(0xFF10B981);
      case 'delivered':
        return const Color(0xFF3B82F6);
      case 'completed':
        return const Color(0xFF10B981);
      case 'cancelled':
        return const Color(0xFF9CA3AF);
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;
    final orderProvider = context.watch<OrderProvider>();
    final countryProvider = context.watch<CountryProvider>();
    final currencyCode = countryProvider.currencyCode;
    final filteredOrders = _getFilteredOrders();

    final tabLabels = isRTL
        ? ['نشطة', 'مكتملة', 'ملغاة']
        : ['Active', 'Completed', 'Cancelled'];

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.white,
        leading: IconButton(
          icon: Icon(
            isRTL ? Icons.arrow_forward : Icons.arrow_back,
            color: AppTheme.textPrimary,
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          widget.reviewMode
              ? (isRTL ? 'تقييم الطلبات' : 'Rate Orders')
              : (isRTL ? 'طلباتي' : 'My Orders'),
          style: const TextStyle(
            color: AppTheme.textPrimary,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
      ),
      body: orderProvider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : orderProvider.error != null
              ? Center(child: Text(orderProvider.error!))
              : filteredOrders.isEmpty
                  ? Center(
                      child: Text(
                        isRTL ? 'لا توجد طلبات' : 'No orders found',
                        style: const TextStyle(fontSize: 16, color: Colors.grey),
                      ),
                    )
                  : Column(
                      children: [
                        // Tab bar
                        Container(
                          color: Colors.white,
                          child: Row(
                            children: List.generate(3, (index) {
                              final isSelected = _selectedTab == index;
                              return Expanded(
                                child: GestureDetector(
                                  onTap: () => setState(() => _selectedTab = index),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(vertical: 16),
                                    decoration: BoxDecoration(
                                      border: Border(
                                        bottom: BorderSide(
                                          color: isSelected ? AppTheme.accentColor : Colors.transparent,
                                          width: 3,
                                        ),
                                      ),
                                    ),
                                    child: Text(
                                      tabLabels[index],
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                        color: isSelected ? AppTheme.accentColor : Colors.grey,
                                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                        fontSize: 14,
                                      ),
                                    ),
                                  ),
                                ),
                              );
                            }),
                          ),
                        ),
                        const SizedBox(height: 8),
                        // Orders list
                        Expanded(
                          child: ListView.builder(
                            padding: const EdgeInsets.all(16),
                            itemCount: filteredOrders.length,
                            itemBuilder: (context, index) {
                              final order = filteredOrders[index];
                              return _buildOrderCard(order, isRTL, currencyCode);
                            },
                          ),
                        ),
                      ],
                    ),
    );
  }

  Widget _buildOrderCard(Order order, bool isRTL, String currencyCode) {
    final isCompleted = ['completed', 'delivered', 'pickedup'].contains(order.status.toLowerCase());
    final showRateButton = isCompleted && !widget.reviewMode;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        children: [
          // Main card content (tappable → Order Details)
          InkWell(
            onTap: () => Navigator.pushNamed(context, '/order-details', arguments: order.id),
            borderRadius: BorderRadius.vertical(
              top: Radius.circular(12),
              bottom: showRateButton ? Radius.zero : Radius.circular(12),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header row: Order # + Date/Time (top right)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        isRTL ? 'طلب #${_getShortOrderId(order.id)}' : 'Order #${_getShortOrderId(order.id)}',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      Row(
                        children: [
                          Icon(Icons.access_time, size: 14, color: Colors.grey[600]),
                          const SizedBox(width: 4),
                          Text(
                            _formatDate(order.createdAt.toIso8601String()),
                            style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                          ),
                        ],
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 12),
                  
                  // Cook name + Total amount
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        isRTL ? 'من ${order.subOrders?.first.cookName ?? 'الشيف'}' : 'From ${order.subOrders?.first.cookName ?? 'Cook'}',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey[700],
                        ),
                      ),
                      Text(
                        '${order.totalAmount.toStringAsFixed(2)} $currencyCode',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                          color: AppTheme.accentColor,
                        ),
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 12),
                  
                  // Order items (dish names + images + quantities)
                  if (order.subOrders?.isNotEmpty == true)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: order.subOrders!.expand((subOrder) {
                        return subOrder.items.asMap().entries.map((entry) {
                          final idx = entry.key;
                          final item = entry.value;
                          
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              textDirection: isRTL ? TextDirection.rtl : TextDirection.ltr,
                              children: [
                                // Dish image
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: item.image != null && item.image!.isNotEmpty
                                      ? CachedNetworkImage(
                                          imageUrl: getAbsoluteUrl(item.image!),
                                          width: 60,
                                          height: 60,
                                          fit: BoxFit.cover,
                                          placeholder: (context, url) => Container(
                                            width: 60,
                                            height: 60,
                                            color: Colors.grey[200],
                                            child: const Icon(Icons.restaurant, color: Colors.grey),
                                          ),
                                          errorWidget: (context, url, error) => Container(
                                            width: 60,
                                            height: 60,
                                            color: Colors.grey[200],
                                            child: const Icon(Icons.restaurant, color: Colors.grey),
                                          ),
                                        )
                                      : Container(
                                          width: 60,
                                          height: 60,
                                          color: Colors.grey[200],
                                          child: const Icon(Icons.restaurant, color: Colors.grey),
                                        ),
                                ),
                                const SizedBox(width: 12),
                                
                                // Dish details
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        item.name,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w600,
                                          fontSize: 14,
                                          color: AppTheme.textPrimary,
                                        ),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        isRTL ? 'الكمية: ${item.quantity}' : 'Qty: ${item.quantity}',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey[600],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                
                                // Price
                                Text(
                                  '${item.price.toStringAsFixed(2)} $currencyCode',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                    fontSize: 13,
                                    color: AppTheme.textPrimary,
                                  ),
                                ),
                              ],
                            ),
                          );
                        }).toList();
                      }).toList(),
                    ),
                  
                  const SizedBox(height: 8),
                  
                  // Footer: Status badge + Fulfillment type badge
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Fulfillment type badge
                      if (order.subOrders?.isNotEmpty == true && order.subOrders!.first.fulfillmentMode != null)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: order.subOrders!.first.fulfillmentMode == 'pickup'
                                ? const Color(0xFF6B7280)
                                : const Color(0xFF3B82F6),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                order.subOrders!.first.fulfillmentMode == 'pickup'
                                    ? Icons.store
                                    : Icons.delivery_dining,
                                size: 14,
                                color: Colors.white,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                order.subOrders!.first.fulfillmentMode == 'pickup'
                                    ? (isRTL ? 'استلام' : 'Pickup')
                                    : (isRTL ? 'توصيل' : 'Delivery'),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      
                      // Status badge (moved to bottom row)
                      _buildStatusBadge(order.status, isRTL),
                    ],
                  ),
                ],
              ),
            ),
          ),
          
          // Rate Order button section (integrated into card)
          if (showRateButton)
            Column(
              children: [
                const Divider(height: 1, thickness: 1, color: Color(0xFFE5E7EB)),
                SizedBox(
                  width: double.infinity,
                  child: TextButton(
                    onPressed: () => _handleRateOrder(order, isRTL),
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 20),
                    ),
                    child: Text(
                      isRTL ? 'تقييم الطلب' : 'Rate Order',
                      style: const TextStyle(
                        color: AppTheme.accentColor,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(String status, bool isRTL) {
    final statusText = _getStatusText(Order(
      id: '',
      status: status,
      totalAmount: 0,
      createdAt: DateTime.now(),
    ), isRTL);
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: _getStatusColor(status).withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        statusText,
        style: TextStyle(
          color: _getStatusColor(status),
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
