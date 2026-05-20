import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/language_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/order_provider.dart';
import '../../providers/country_provider.dart';
import '../../providers/food_provider.dart';
import '../../models/order.dart';
import '../reviews/review_submission_screen.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../utils/arabic_utils.dart';
import '../../utils/image_url_utils.dart';
import 'package:intl/intl.dart';

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
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadOrders());
  }

  Future<void> _loadOrders() async {
    final orderProvider = Provider.of<OrderProvider>(context, listen: false);
    final authProvider = Provider.of<AuthProvider>(context, listen: false);

    if (authProvider.token == null) return;

    // Hydration guard: skip fetch if orders are already loaded and this is a normal view.
    // TTL enforcement is handled inside OrderProvider.fetchOrders (60s window).
    if (!widget.reviewMode && orderProvider.orders.isNotEmpty) return;

    await orderProvider.fetchOrders(authProvider.token!);
    if (mounted) _precacheOrderImages(orderProvider);
    if (widget.reviewMode) {
      await _loadReviewModeData();
    }
  }

  void _precacheOrderImages(OrderProvider orderProvider) {
    // First 3 orders × up to 3 items each = max 9 images
    for (final order in orderProvider.orders.take(3)) {
      for (final subOrder in order.subOrders.take(2)) {
        for (final item in subOrder.items.take(3)) {
          final raw = item.image ?? '';
          if (raw.isEmpty) continue;
          final url = getAbsoluteUrl(raw);
          if (url.startsWith('http')) {
            precacheImage(CachedNetworkImageProvider(url), context);
          }
        }
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
        // notifyListeners() inside fetchBatchRatingStatus triggers rebuild automatically
      }
    } catch (e) {
      debugPrint('Error loading review mode data: $e');
    }
  }

  List<Order> _getFilteredOrders() {
    final orderProvider = Provider.of<OrderProvider>(context, listen: false);
    final allOrders = orderProvider.orders;

    if (widget.reviewMode && widget.cookId != null) {
      return _filterReviewModeOrders(allOrders, orderProvider.ratingStatuses);
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

  List<Order> _filterReviewModeOrders(
      List<Order> orders, Map<String, Map<String, dynamic>> ratingStatuses) {
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

      final ratingStatus = ratingStatuses[order.id];
      if (ratingStatus != null && ratingStatus['isRated'] == true) {
        return ratingStatus['canEdit'] == true;
      }

      return true;
    }).toList();
  }

  void _handleRateOrder(Order order, bool isRTL) {
    if (order.subOrders.isEmpty) return;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ReviewSubmissionScreen(
          order: order,
          cookId: '',
        ),
      ),
    );
  }

  static String _getShortOrderId(String id) =>
      id.length > 6 ? id.substring(id.length - 6) : id;

  static String _formatDate(String isoString) {
    final dt = DateTime.parse(isoString);
    return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year} '
        '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
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
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 16, left: 24, right: 24),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Icon(
                      Icons.arrow_back,
                      color: AppTheme.textPrimary,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 24),
                  Expanded(
                    child: Text(
                      widget.reviewMode
                          ? (isRTL ? 'تقييم الطلبات' : 'Rate Orders')
                          : (isRTL ? 'طلباتي' : 'My Orders'),
                      style: const TextStyle(
                        color: AppTheme.textPrimary,
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        height: 1.2,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(child: orderProvider.isLoading
          ? _buildOrdersSkeleton()
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
                          color: Colors.transparent,
                          child: Row(
                            children: List.generate(3, (index) {
                              final isSelected = _selectedTab == index;
                              return Expanded(
                                child: GestureDetector(
                                  onTap: () {
                                    setState(() => _selectedTab = index);
                                  },
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
                        // Order cards list
                        Expanded(
                          child: ListView.builder(
                            padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
                            itemCount: filteredOrders.length,
                            itemBuilder: (context, index) {
                              final order = filteredOrders[index];
                              return _buildOrderCard(order, isRTL, currencyCode, orderProvider);
                            },
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

  Widget _buildOrderCard(Order order, bool isRTL, String currencyCode, OrderProvider orderProvider) {
    final foodProvider = Provider.of<FoodProvider>(context, listen: false);
    final cached = orderProvider.orderDisplayData[order.id];
    final isCompleted = ['completed', 'delivered', 'pickedup'].contains(order.status.toLowerCase());
    final showRateButton = isCompleted && !widget.reviewMode;
    final bool hasPickup = cached?.hasPickup ?? order.subOrders.any((sub) => sub.fulfillmentMode == 'pickup');
    final bool hasDelivery = cached?.hasDelivery ?? order.subOrders.any((sub) => sub.fulfillmentMode == 'delivery');

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
              top: const Radius.circular(12),
              bottom: showRateButton ? Radius.zero : const Radius.circular(12),
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
                        isRTL ? 'طلب #${cached?.shortOrderId ?? _getShortOrderId(order.id)}' : 'Order #${cached?.shortOrderId ?? _getShortOrderId(order.id)}',
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
                            cached?.createdAtStr ?? _formatDate(order.createdAt.toIso8601String()),
                            style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                          ),
                        ],
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 12),
                  
                  // Order items - Grouped by cook, then by fulfillment/ready time
                  if (order.subOrders.isNotEmpty == true)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: () {
                        if (cached == null) return <Widget>[];

                        return cached!.cookGroups.entries.expand((cookEntry) {
                          final cookId = cookEntry.key;
                          final cookItemGroups = cookEntry.value;
                          final cookName = cookItemGroups.first.cookName;
                          final double cookTotal =
                              cached.cookTotals[cookId] ?? 0.0;

                          return [
                            // Cook section header: "From: CookName" + total (items + delivery)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    isRTL ? 'من: $cookName' : 'From: $cookName',
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: Colors.grey[700],
                                    ),
                                  ),
                                  Text(
                                    isRTL ? '${cached.cookTotalStrsAr[cookId] ?? toArabicNumerals(cookTotal.toStringAsFixed(2))} $currencyCode' : '${cached.cookTotalStrs[cookId] ?? cookTotal.toStringAsFixed(2)} $currencyCode',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 16,
                                      color: AppTheme.accentColor,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            
                            // Fulfillment groups for this cook
                            ...cookItemGroups.asMap().entries.map((groupEntry) {
                              final group = groupEntry.value;
                              
                              return Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Group header with fulfillment badge (no cook name)
                                  if (cookItemGroups.length > 1)
                                    Padding(
                                      padding: const EdgeInsets.only(bottom: 8),
                                      child: Row(
                                        children: [
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                            decoration: BoxDecoration(
                                              color: group.fulfillmentMode == 'pickup' 
                                                  ? const Color(0xFF6B7280) 
                                                  : const Color(0xFF3B82F6),
                                              borderRadius: BorderRadius.circular(10),
                                            ),
                                            child: Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Icon(
                                                  group.fulfillmentMode == 'pickup' 
                                                      ? Icons.store 
                                                      : Icons.delivery_dining, 
                                                  size: 14, 
                                                  color: Colors.white,
                                                ),
                                                const SizedBox(width: 4),
                                                Text(
                                                  group.fulfillmentMode == 'pickup'
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
                                          if (group.readyAt != null) ...[
                                            const SizedBox(width: 8),
                                            Text(
                                              '• ${DateFormat('h:mm a').format(group.readyAt!)}',
                                              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                                            ),
                                          ],
                                        ],
                                      ),
                                    ),
                                  
                                  // Items in this group
                                  ...group.items.asMap().entries.map((entry) {
                                    final item = entry.value;
                                    
                                    return Padding(
                                      padding: EdgeInsets.only(bottom: 8, left: cookItemGroups.length > 1 ? 16 : 0, right: cookItemGroups.length > 1 ? 16 : 0),
                                      child: Row(
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
                                                  isRTL ? (item.nameAr?.isNotEmpty == true ? item.nameAr! : (foodProvider.findArabicNameById(item.productId) ?? item.name)) : item.name,
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
                                                  isRTL ? 'الكمية: ${toArabicNumerals(item.quantity.toString())}' : 'Qty: ${item.quantity}',
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
                                            isRTL ? '${toArabicNumerals(item.price.toStringAsFixed(2))} $currencyCode' : '${item.price.toStringAsFixed(2)} $currencyCode',
                                            style: const TextStyle(
                                              fontWeight: FontWeight.w600,
                                              fontSize: 13,
                                              color: AppTheme.textPrimary,
                                            ),
                                          ),
                                        ],
                                      ),
                                    );
                                  }).toList(),
                                ],
                              );
                            }).toList(),
                            
                            // Spacing between cook sections
                            const SizedBox(height: 12),
                          ];
                        }).toList()
                          ..add(
                            // Separator + Parent order total footer
                            Column(
                              children: [
                                Divider(height: 1, thickness: 1, color: Colors.grey[300]),
                                const SizedBox(height: 8),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      isRTL ? 'المجموع الكلي' : 'Order Total',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 14,
                                        color: AppTheme.textPrimary,
                                      ),
                                    ),
                                    Text(
                                      isRTL ? '${cached?.orderTotalStrAr ?? toArabicNumerals(order.totalAmount.toStringAsFixed(2))} $currencyCode' : '${cached?.orderTotalStr ?? order.totalAmount.toStringAsFixed(2)} $currencyCode',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 16,
                                        color: AppTheme.accentColor,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          );
                      }(),
                    ),
                  
                  const SizedBox(height: 8),
                  
                  // Footer: Status badge + Fulfillment type badge (ONE badge per parent order)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Fulfillment type badge - show only ONE badge for the entire order
                      if (order.subOrders.isNotEmpty == true)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: hasPickup && hasDelivery
                                ? const Color(0xFFFF9800)
                                : hasDelivery
                                    ? const Color(0xFF3B82F6)
                                    : const Color(0xFF6B7280),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                hasPickup && hasDelivery
                                    ? Icons.swap_horiz
                                    : hasDelivery
                                        ? Icons.delivery_dining
                                        : Icons.store,
                                size: 14,
                                color: Colors.white,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                hasPickup && hasDelivery
                                    ? (isRTL ? 'مختلط' : 'Mixed')
                                    : hasDelivery
                                        ? (isRTL ? 'توصيل' : 'Delivery')
                                        : (isRTL ? 'استلام' : 'Pickup'),
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
    final statusText = _getStatusTextFromStatus(status, isRTL);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: _getStatusColor(status).withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        statusText,
        style: TextStyle(color: _getStatusColor(status), fontSize: 12, fontWeight: FontWeight.w600),
      ),
    );
  }

  String _getStatusTextFromStatus(String status, bool isRTL) {
    final s = status.toLowerCase();
    if (s == 'completed' || s == 'delivered' || s == 'pickedup') {
      if (s == 'pickedup') return isRTL ? 'تم الاستلام' : 'Picked Up';
      return isRTL ? 'تم التوصيل' : 'Delivered';
    }
    switch (s) {
      case 'pending': return isRTL ? 'قيد الانتظار' : 'Pending';
      case 'confirmed': return isRTL ? 'مؤكد' : 'Confirmed';
      case 'preparing': return isRTL ? 'قيد التحضير' : 'Being Cooked';
      case 'ready': return isRTL ? 'جاهز' : 'Ready';
      case 'delivered': return isRTL ? 'تم التوصيل' : 'Delivered';
      case 'completed': return isRTL ? 'مكتمل' : 'Completed';
      case 'cancelled': return isRTL ? 'ملغى' : 'Cancelled';
      default: return status;
    }
  }

  Widget _buildOrdersSkeleton() {
    return _SkeletonPulse(
      builder: (color) {
        Widget box(double w, double h, {double r = 8}) => Container(
          width: w,
          height: h,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(r),
          ),
        );

        Widget fakeCard() => Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE8E8E8)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [box(130, 14), box(90, 12)],
              ),
              const SizedBox(height: 12),
              box(110, 12),
              const SizedBox(height: 10),
              Row(children: [
                box(60, 60, r: 8),
                const SizedBox(width: 12),
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  box(150, 12),
                  const SizedBox(height: 6),
                  box(70, 10),
                ]),
              ]),
              const SizedBox(height: 8),
              Row(children: [
                box(60, 60, r: 8),
                const SizedBox(width: 12),
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  box(120, 12),
                  const SizedBox(height: 6),
                  box(55, 10),
                ]),
              ]),
              const SizedBox(height: 12),
              Container(height: 1, color: color),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [box(80, 12), box(90, 14)],
              ),
            ],
          ),
        );

        return SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
          physics: const NeverScrollableScrollPhysics(),
          child: Column(children: [
            fakeCard(),
            fakeCard(),
            fakeCard(),
          ]),
        );
      },
    );
  }
}

class _SkeletonPulse extends StatefulWidget {
  final Widget Function(Color color) builder;
  const _SkeletonPulse({required this.builder});

  @override
  State<_SkeletonPulse> createState() => _SkeletonPulseState();
}

class _SkeletonPulseState extends State<_SkeletonPulse>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (_, __) => widget.builder(
        Color.lerp(
          const Color(0xFFEEEEEE),
          const Color(0xFFD4D4D4),
          _ctrl.value,
        )!,
      ),
    );
  }
}
