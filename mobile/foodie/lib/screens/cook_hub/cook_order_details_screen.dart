import 'dart:convert';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import '../../config/theme.dart';
import '../../config/api_config.dart';
import '../../providers/language_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/country_provider.dart';
import '../../utils/image_url_utils.dart';

class CookOrderDetailsScreen extends StatefulWidget {
  final String orderId;
  /// Full order map passed directly from CookOrdersPage. When provided, the
  /// screen renders immediately without a loading spinner. A background fetch
  /// still runs so a pull-to-refresh always returns fresh data.
  final Map<String, dynamic>? initialOrder;

  const CookOrderDetailsScreen({
    Key? key,
    required this.orderId,
    this.initialOrder,
  }) : super(key: key);

  @override
  State<CookOrderDetailsScreen> createState() => _CookOrderDetailsScreenState();
}

class _CookOrderDetailsScreenState extends State<CookOrderDetailsScreen> {
  dynamic _orderData;
  bool _isLoading = true;
  String? _error;
  bool _isUpdating = false;

  @override
  void initState() {
    super.initState();
    // If the caller already has the order data (from the list screen), show it
    // immediately — no spinner needed. Pull-to-refresh will fetch fresh data.
    // We do NOT auto-fetch in the background: the details endpoint may return a
    // different/incomplete shape that would overwrite the correct initialOrder.
    if (widget.initialOrder != null) {
      _orderData = widget.initialOrder;
      _isLoading = false;
    } else {
      // No initial data — must fetch from the API
      _fetchOrderDetails();
    }
  }

  Future<void> _fetchOrderDetails() async {
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
      final response = await http.get(
        Uri.parse(ApiConfig.getCookOrderDetails(widget.orderId)),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        setState(() {
          _orderData = data['data'] ?? data;
          _isLoading = false;
        });
      } else {
        throw Exception('Failed to load order details');
      }
    } catch (err) {
      setState(() {
        _error = err.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _updateOrderStatus(String subOrderId, String newStatus) async {
    final authProvider = context.read<AuthProvider>();
    final token = authProvider.token;

    if (token == null) return;

    setState(() => _isUpdating = true);

    try {
      final response = await http.put(
        Uri.parse(ApiConfig.updateSubOrderStatus(subOrderId)),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode({'status': newStatus}),
      );

      if (response.statusCode == 200) {
        // Refresh order details
        await _fetchOrderDetails();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(_getStatusUpdateMessage(newStatus)),
              backgroundColor: Colors.green,
            ),
          );
        }
      } else {
        throw Exception('Failed to update status');
      }
    } catch (err) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update status: $err'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      setState(() => _isUpdating = false);
    }
  }

  String _getStatusUpdateMessage(String status) {
    final languageProvider = context.read<LanguageProvider>();
    final isRTL = languageProvider.isArabic;

    switch (status) {
      case 'order_received':
        return isRTL ? 'تم استلام الطلب' : 'Order received';
      case 'preparing':
        return isRTL ? 'قيد التحضير' : 'Preparing';
      case 'ready':
        return isRTL ? 'جاهز للاستلام' : 'Ready for pickup';
      case 'completed':
        return isRTL ? 'تم التوصيل' : 'Delivered';
      default:
        return isRTL ? 'تم التحديث' : 'Updated';
    }
  }

  void _showStatusActionSheet(String subOrderId, String currentStatus) {
    final languageProvider = context.read<LanguageProvider>();
    final isRTL = languageProvider.isArabic;

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                isRTL ? 'تحديث حالة الطلب' : 'Update Order Status',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const Divider(),
            if (currentStatus == 'order_received') ...[
              ListTile(
                leading:
                    const Icon(Icons.check_circle, color: AppTheme.accentColor),
                title: Text(isRTL ? 'بدء التحضير' : 'Start Preparing'),
                onTap: () {
                  Navigator.pop(context);
                  _updateOrderStatus(subOrderId, 'preparing');
                },
              ),
            ],
            if (currentStatus == 'preparing') ...[
              ListTile(
                leading:
                    const Icon(Icons.restaurant, color: AppTheme.accentColor),
                title: Text(isRTL ? 'وضع جاهز' : 'Mark as Ready'),
                onTap: () {
                  Navigator.pop(context);
                  _updateOrderStatus(subOrderId, 'ready');
                },
              ),
            ],
            if (currentStatus == 'ready') ...[
              ListTile(
                leading: const Icon(Icons.delivery_dining,
                    color: AppTheme.successColor),
                title: Text(isRTL ? 'إكمال الطلب' : 'Complete Order'),
                onTap: () {
                  Navigator.pop(context);
                  _updateOrderStatus(subOrderId, 'completed');
                },
              ),
            ],
            ListTile(
              leading: const Icon(Icons.close, color: Colors.red),
              title: Text(isRTL ? 'إلغاء' : 'Cancel'),
              onTap: () => Navigator.pop(context),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;
    final currencyCode = context.watch<CountryProvider>().currencyCode;

    if (_isLoading) {
      return Scaffold(
        backgroundColor: AppTheme.backgroundColor,
        body: SafeArea(
          child: Column(
            children: [
              _buildPageHeader(isRTL, context),
              const Expanded(child: Center(child: CircularProgressIndicator())),
            ],
          ),
        ),
      );
    }

    if (_error != null || _orderData == null) {
      return Scaffold(
        backgroundColor: AppTheme.backgroundColor,
        body: SafeArea(
          child: Column(
            children: [
              _buildPageHeader(isRTL, context),
              Expanded(
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.error_outline, size: 48, color: Colors.grey[400]),
                      const SizedBox(height: 16),
                      Text(
                        _error ?? (isRTL ? 'فشل تحميل الطلب' : 'Failed to load order'),
                        style: const TextStyle(color: AppTheme.textSecondary),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    // Normalize the data into a uniform subOrders list.
    // The list endpoint returns items at the top level; the details endpoint
    // may return them under subOrders. Handle both shapes here so the
    // rendering widgets never see an empty list.
    final rawSubOrders = (_orderData['subOrders'] as List<dynamic>?) ?? [];
    List<dynamic> subOrders;
    if (rawSubOrders.isNotEmpty &&
        (rawSubOrders[0] as Map<String, dynamic>)['items'] != null) {
      // Preferred shape: subOrders each have their own items list
      subOrders = rawSubOrders;
    } else {
      // Flat shape: items live at the top level — wrap in one synthetic subOrder
      final topItems = (_orderData['items'] as List<dynamic>?) ?? [];
      subOrders = topItems.isEmpty
          ? []
          : [
              {
                '_id': (_orderData['subOrderId'] ?? '').toString(),
                'status': (_orderData['status'] ?? '').toString(),
                'fulfillmentMode': (_orderData['fulfillmentMode'] ??
                        _orderData['deliveryMode'] ??
                        'pickup')
                    .toString(),
                'deliveryFee': _orderData['deliveryFee'] ?? 0,
                'items': topItems,
              }
            ];
    }
    final status = (_orderData['status'] ?? '').toString();
    final orderNumber = _orderData['orderNumber']?.toString() ??
        widget.orderId.substring(
            widget.orderId.length > 6 ? widget.orderId.length - 6 : 0);

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: SafeArea(
        child: Column(
          children: [
            _buildPageHeader(isRTL, context),
            Expanded(
              child: RefreshIndicator(
                onRefresh: _fetchOrderDetails,
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // ── Order Progress tracker ───────────────────────────
                      _buildOrderProgress(status, isRTL),
                      const SizedBox(height: 16),

                      // ── Ordered Items card ───────────────────────────────
                      _buildOrderedItemsSection(
                          subOrders, status, orderNumber, isRTL, currencyCode),
                      const SizedBox(height: 16),

                      // ── Payment Summary card ─────────────────────────────
                      _buildPaymentSummary(subOrders, isRTL, currencyCode),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ─── Inline header matching Foodie OrderDetailsScreen style ────────────────
  Widget _buildPageHeader(bool isRTL, BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 16, left: 24, right: 24, bottom: 8),
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
          Text(
            isRTL ? 'تفاصيل الطلب' : 'Order Details',
            style: const TextStyle(
              color: AppTheme.textPrimary,
              fontSize: 18,
              fontWeight: FontWeight.w700,
              height: 1.2,
            ),
          ),
        ],
      ),
    );
  }

  // ─── Ordered Items section — matches Foodie _buildOrderedItemsSection ───────
  Widget _buildOrderedItemsSection(
    List<dynamic> subOrders,
    String orderStatus,
    String orderNumber,
    bool isRTL,
    String currencyCode,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section title + order# + status badge
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isRTL ? 'الأصناف المطلوبة' : 'Ordered Items',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    isRTL ? 'طلب #$orderNumber' : 'Order #$orderNumber',
                    style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                  ),
                ],
              ),
              _buildStatusBadge(orderStatus, isRTL),
            ],
          ),
          const Divider(height: 20),

          // Items grouped per subOrder
          ...subOrders.asMap().entries.map((entry) {
            final idx = entry.key;
            final subOrder = entry.value as Map<String, dynamic>;
            final items = (subOrder['items'] as List<dynamic>?) ?? [];
            final subOrderId = (subOrder['_id'] ?? subOrder['id'])?.toString() ?? '';
            final subStatus = (subOrder['status'] ?? '').toString();
            final fulfillment = (subOrder['fulfillmentMode'] ?? '').toString().toLowerCase();
            final subDeliveryFee =
                (subOrder['deliveryFee'] as num?)?.toDouble() ?? 0.0;
            final itemsTotal = items.fold<double>(0, (sum, item) {
              final qty = (item['quantity'] as num?)?.toDouble() ?? 1;
              final price = (item['price'] as num?)?.toDouble() ??
                  (item['unitPrice'] as num?)?.toDouble() ??
                  ((item['productSnapshot'] as Map?)?['price'] as num?)?.toDouble() ??
                  0.0;
              return sum + price * qty;
            });

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Sub-order header: fulfillment label + Update Status button
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(
                            fulfillment == 'delivery'
                                ? Icons.delivery_dining
                                : Icons.store_outlined,
                            size: 16,
                            color: AppTheme.textSecondary,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            fulfillment == 'delivery'
                                ? (isRTL ? 'توصيل' : 'Delivery')
                                : (isRTL ? 'استلام' : 'Pickup'),
                            style: const TextStyle(
                                fontWeight: FontWeight.w600, fontSize: 14),
                          ),
                        ],
                      ),
                      if (_isUpdating)
                        const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2))
                      else if (subOrderId.isNotEmpty)
                        GestureDetector(
                          onTap: () =>
                              _showStatusActionSheet(subOrderId, subStatus),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: AppTheme.accentColor.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                  color: AppTheme.accentColor, width: 1),
                            ),
                            child: Text(
                              isRTL ? 'تحديث الحالة' : 'Update Status',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.accentColor,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),

                // Item rows — matching Foodie style exactly
                ...items.asMap().entries.map((itemEntry) {
                  final item = itemEntry.value as Map<String, dynamic>;
                  final qty = (item['quantity'] as num?)?.toInt() ?? 1;
                  // Price: try direct field first, then snapshot, then zero
                  final unitPrice = (item['price'] as num?)?.toDouble() ??
                      (item['unitPrice'] as num?)?.toDouble() ??
                      (item['productSnapshot']?['price'] as num?)?.toDouble() ??
                      0.0;
                  final lineTotal = unitPrice * qty;
                  // Name: productSnapshot (list API) → product → flat name → dishName
                  final name = ((item['productSnapshot'] as Map?)?['name'] ??
                          (item['product'] as Map?)?['name'] ??
                          item['name'] ??
                          item['dishName'] ??
                          'Item')
                      .toString();
                  // Image: productSnapshot → product.photoUrl → product.images[0] → flat image
                  final rawImage = ((item['productSnapshot'] as Map?)?['image'] ??
                          (item['product'] as Map?)?['photoUrl'] ??
                          ((item['product']?['images'] as List?)?.isNotEmpty == true
                              ? (item['product']['images'] as List).first
                              : null) ??
                          item['image'] ??
                          '')
                      .toString();
                  final imageUrl = rawImage.isNotEmpty ? getAbsoluteUrl(rawImage) : '';

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      textDirection:
                          isRTL ? TextDirection.rtl : TextDirection.ltr,
                      children: [
                        // Dish image
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: imageUrl.isNotEmpty
                              ? CachedNetworkImage(
                                  imageUrl: imageUrl,
                                  width: 52,
                                  height: 52,
                                  fit: BoxFit.cover,
                                  placeholder: (_, __) => Container(
                                    width: 52,
                                    height: 52,
                                    color: Colors.grey[200],
                                    child: const Icon(Icons.restaurant,
                                        color: Colors.grey),
                                  ),
                                  errorWidget: (_, __, ___) => Container(
                                    width: 52,
                                    height: 52,
                                    color: Colors.grey[200],
                                    child: const Icon(Icons.restaurant,
                                        color: Colors.grey),
                                  ),
                                )
                              : Container(
                                  width: 52,
                                  height: 52,
                                  color: Colors.grey[200],
                                  child: const Icon(Icons.restaurant,
                                      color: Colors.grey),
                                ),
                        ),
                        const SizedBox(width: 12),

                        // Dish details
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                name,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                    fontSize: 14,
                                    color: AppTheme.textPrimary),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                isRTL
                                    ? 'الكمية: $qty × ${unitPrice.toStringAsFixed(2)} $currencyCode'
                                    : 'Qty: $qty × ${unitPrice.toStringAsFixed(2)} $currencyCode',
                                style: const TextStyle(
                                    fontSize: 12, color: Colors.grey),
                              ),
                            ],
                          ),
                        ),

                        // Line total
                        Text(
                          '${lineTotal.toStringAsFixed(2)} $currencyCode',
                          style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                              color: AppTheme.textPrimary),
                        ),
                      ],
                    ),
                  );
                }).toList(),

                // Sub-order subtotals row
                Container(
                  padding: const EdgeInsets.only(top: 12),
                  margin: EdgeInsets.only(
                      top: 8,
                      bottom:
                          idx < subOrders.length - 1 ? 24 : 0),
                  decoration: BoxDecoration(
                    border: Border(top: BorderSide(color: Colors.grey[200]!)),
                  ),
                  child: Column(
                    children: [
                      _buildPriceRow(
                        isRTL ? 'إجمالي الأصناف' : 'Items subtotal',
                        itemsTotal,
                        currencyCode,
                        isRTL,
                      ),
                      if (subDeliveryFee > 0)
                        _buildPriceRow(
                          isRTL ? 'رسوم التوصيل' : 'Delivery fee',
                          subDeliveryFee,
                          currencyCode,
                          isRTL,
                        ),
                    ],
                  ),
                ),
              ],
            );
          }).toList(),
        ],
      ),
    );
  }

  // ─── Payment Summary — matches Foodie _buildPaymentSummary ─────────────────
  Widget _buildPaymentSummary(
      List<dynamic> subOrders, bool isRTL, String currencyCode) {
    double grandTotal = 0;

    final subOrderWidgets = subOrders.map((so) {
      final subOrder = so as Map<String, dynamic>;
      final items = (subOrder['items'] as List<dynamic>?) ?? [];
      final itemsTotal = items.fold<double>(0, (sum, item) {
        final qty = (item['quantity'] as num?)?.toDouble() ?? 1;
        final price = (item['price'] as num?)?.toDouble() ??
            (item['unitPrice'] as num?)?.toDouble() ??
            ((item['productSnapshot'] as Map?)?['price'] as num?)?.toDouble() ??
            0.0;
        return sum + price * qty;
      });
      final deliveryFee =
          (subOrder['deliveryFee'] as num?)?.toDouble() ?? 0.0;
      grandTotal += itemsTotal + deliveryFee;

      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildPriceRow(
              isRTL ? 'الأصناف' : 'Items', itemsTotal, currencyCode, isRTL),
          if (deliveryFee > 0)
            _buildPriceRow(isRTL ? 'رسوم التوصيل' : 'Delivery fee',
                deliveryFee, currencyCode, isRTL),
          const SizedBox(height: 8),
        ],
      );
    }).toList();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            isRTL ? 'ملخص الحساب' : 'Payment Summary',
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          const Divider(height: 20),

          ...subOrderWidgets,

          const Divider(height: 8),
          const SizedBox(height: 8),

          // Grand total
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                isRTL ? 'الإجمالي' : 'Total',
                style: const TextStyle(
                    fontWeight: FontWeight.bold, fontSize: 16),
              ),
              Text(
                '${grandTotal.toStringAsFixed(2)} $currencyCode',
                style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 18,
                    color: AppTheme.accentColor),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ─── Order Progress tracker ─────────────────────────────────────────────────
  /// Maps a raw status string to a 0-based step index.
  /// Returns -1 for cancelled so the tracker renders a safe cancelled banner.
  int _statusToStep(String status) {
    switch (status.toLowerCase()) {
      case 'pending':
      case 'order_received':
        return 0;
      case 'preparing':
      case 'cooking':
        return 1;
      case 'ready':
        return 2;
      case 'completed':
      case 'delivered':
      case 'pickedup':
        return 3;
      case 'cancelled':
        return -1;
      default:
        return 0;
    }
  }

  Widget _buildOrderProgress(String status, bool isRTL) {
    final activeStep = _statusToStep(status);

    const stepLabels = ['Pending', 'Preparing', 'Ready', 'Completed'];
    const stepLabelsAR = ['قيد الانتظار', 'قيد التحضير', 'جاهز', 'مكتمل'];
    final labels = isRTL ? stepLabelsAR : stepLabels;

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            isRTL ? 'حالة الطلب' : 'Order Progress',
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 14,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 14),

          // Cancelled state — simple banner, no broken step UI
          if (activeStep == -1)
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.cancel_outlined,
                    color: Color(0xFF9CA3AF), size: 18),
                const SizedBox(width: 8),
                Text(
                  isRTL ? 'تم إلغاء الطلب' : 'Order Cancelled',
                  style: const TextStyle(
                    color: Color(0xFF9CA3AF),
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
              ],
            )
          else ...[
            // Step dots connected by lines
            Row(
              children: [
                for (int i = 0; i < 4; i++) ...[
                  _buildStepDot(i, activeStep),
                  if (i < 3)
                    Expanded(
                      child: Container(
                        height: 2,
                        color: i < activeStep
                            ? AppTheme.accentColor
                            : const Color(0xFFE5E7EB),
                      ),
                    ),
                ],
              ],
            ),
            const SizedBox(height: 8),

            // Step labels below the dots
            Row(
              children: [
                for (int i = 0; i < 4; i++)
                  Expanded(
                    child: Text(
                      labels[i],
                      textAlign: i == 0
                          ? (isRTL ? TextAlign.end : TextAlign.start)
                          : i == 3
                              ? (isRTL ? TextAlign.start : TextAlign.end)
                              : TextAlign.center,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: i == activeStep
                            ? FontWeight.bold
                            : FontWeight.normal,
                        color: i <= activeStep
                            ? AppTheme.textPrimary
                            : const Color(0xFFB0B3B8),
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildStepDot(int step, int activeStep) {
    final isDone = step < activeStep;
    final isActive = step == activeStep;
    return Container(
      width: 24,
      height: 24,
      decoration: BoxDecoration(
        color: (isDone || isActive)
            ? AppTheme.accentColor
            : const Color(0xFFE5E7EB),
        shape: BoxShape.circle,
      ),
      child: isDone
          ? const Icon(Icons.check, size: 14, color: Colors.white)
          : isActive
              ? const Center(
                  child: CircleAvatar(
                    radius: 4,
                    backgroundColor: Colors.white,
                  ),
                )
              : null,
    );
  }

  // ─── Status badge — same solid-bg style as Foodie _buildWebStyleStatusBadge ─
  Widget _buildStatusBadge(String status, bool isRTL) {
    Color bgColor;
    String label;
    switch (status.toLowerCase()) {
      case 'pending':
      case 'order_received':
        bgColor = const Color(0xFFF59E0B);
        label = isRTL ? 'قيد الانتظار' : 'Pending';
        break;
      case 'confirmed':
        bgColor = const Color(0xFF3B82F6);
        label = isRTL ? 'مؤكد' : 'Confirmed';
        break;
      case 'preparing':
        bgColor = const Color(0xFFF59E0B);
        label = isRTL ? 'قيد التحضير' : 'Being Cooked';
        break;
      case 'ready':
        bgColor = const Color(0xFF10B981);
        label = isRTL ? 'جاهز' : 'Ready';
        break;
      case 'completed':
        bgColor = const Color(0xFF10B981);
        label = isRTL ? 'مكتمل' : 'Completed';
        break;
      case 'cancelled':
        bgColor = const Color(0xFF9CA3AF);
        label = isRTL ? 'ملغى' : 'Cancelled';
        break;
      default:
        bgColor = Colors.grey;
        label = status;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
          color: bgColor, borderRadius: BorderRadius.circular(12)),
      child: Text(
        label,
        style: const TextStyle(
            color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
      ),
    );
  }

  // ─── Shared price row helper ────────────────────────────────────────────────
  Widget _buildPriceRow(
      String label, double amount, String currencyCode, bool isRTL,
      {bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        textDirection: isRTL ? TextDirection.rtl : TextDirection.ltr,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: TextStyle(
                  fontWeight:
                      isBold ? FontWeight.bold : FontWeight.normal)),
          Text('${amount.toStringAsFixed(2)} $currencyCode',
              style: TextStyle(
                  fontWeight:
                      isBold ? FontWeight.bold : FontWeight.normal)),
        ],
      ),
    );
  }

}
