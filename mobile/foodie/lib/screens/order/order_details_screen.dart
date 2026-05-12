import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/theme.dart';
import '../../providers/order_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/language_provider.dart';
import '../../providers/app_mode_provider.dart';
import '../../providers/country_provider.dart';
import '../../models/order.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../utils/image_url_utils.dart';

class OrderDetailsScreen extends StatefulWidget {
  final String orderId;

  const OrderDetailsScreen({Key? key, required this.orderId}) : super(key: key);

  @override
  State<OrderDetailsScreen> createState() => _OrderDetailsScreenState();
}

class _OrderDetailsScreenState extends State<OrderDetailsScreen> {
  Order? _order;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchOrder();
  }

  Future<void> _fetchOrder() async {
    final orderProvider = Provider.of<OrderProvider>(context, listen: false);
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final order = await orderProvider.getOrderDetails(widget.orderId, authProvider.token ?? '');
    if (mounted) {
      setState(() {
        _order = order;
        _isLoading = false;
      });
    }
  }

  void _launchNavigation(double lat, double lng) async {
    final url = Uri.parse('https://www.google.com/maps/dir/?api=1&destination=$lat,$lng');
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }

  void _showPickupLocationDialog(SubOrder subOrder, bool isRTL) {
    final snapshot = subOrder.cookLocationSnapshot;
    if (snapshot == null) return;

    showDialog(
      context: context,
      builder: (context) => Dialog(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    isRTL ? 'موقع الاستلام' : 'Pickup Location',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            SizedBox(
              height: 300,
              child: GoogleMap(
                initialCameraPosition: CameraPosition(
                  target: LatLng(snapshot.lat, snapshot.lng),
                  zoom: 15,
                ),
                markers: {
                  Marker(
                    markerId: MarkerId('pickup_${subOrder.id}'),
                    position: LatLng(snapshot.lat, snapshot.lng),
                  ),
                },
                liteModeEnabled: true,
                zoomGesturesEnabled: false,
                scrollGesturesEnabled: false,
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Text(
                    '${snapshot.address}, ${snapshot.city}',
                    style: const TextStyle(fontSize: 14),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        _launchNavigation(snapshot.lat, snapshot.lng);
                      },
                      icon: const Icon(Icons.navigation, color: Colors.white),
                      label: Text(
                        isRTL ? 'فتح في خرائط جوجل' : 'Open in Google Maps',
                        style: const TextStyle(color: Colors.white),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFFF7A00),
                      ),
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

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;
    final countryProvider = context.watch<CountryProvider>();
    final currencyCode = countryProvider.currencyCode;
    final appMode = context.watch<AppModeProvider>();
    final isCookMode = appMode.isCookHubMode;

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _order == null
                ? Center(child: Text(isRTL ? 'فشل تحميل الطلب' : 'Failed to load order'))
                : Column(
                    children: [
                      // Inline header
                      Padding(
                        padding: const EdgeInsets.only(top: 16, left: 24, right: 24, bottom: 8),
                        child: Row(
                          children: [
                            GestureDetector(
                              onTap: () => Navigator.pop(context),
                              child: Icon(
                                isRTL ? Icons.arrow_forward : Icons.arrow_back,
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
                      ),
                      Expanded(
                        child: SingleChildScrollView(
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Issue banner if exists
                              if (_order!.hasIssue == true && _order!.issue != null)
                                _buildIssueBanner(isRTL),
                              if (_order!.hasIssue == true && _order!.issue != null)
                                const SizedBox(height: 16),

                              // Ordered Items section
                              _buildOrderedItemsSection(isRTL, currencyCode),
                              const SizedBox(height: 16),

                              // Payment Summary section
                              _buildPaymentSummary(isRTL, currencyCode),
                              const SizedBox(height: 16),

                              // Order Tracking section
                              if (!isCookMode) _buildTrackingSection(isRTL),

                              if (isCookMode) ...[
                                const SizedBox(height: 8),
                                _buildCookView(isRTL),
                              ],
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
      ),
    );
  }

  Widget _buildHeader(bool isRTL) {
    // Fix: Handle short order IDs safely
    final shortId = _order!.id.length > 6 
        ? _order!.id.substring(_order!.id.length - 6) 
        : _order!.id;
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                isRTL ? 'طلب #$shortId' : 'Order #$shortId',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
              ),
              Text(
                _order!.status.toUpperCase(),
                style: TextStyle(color: _getStatusColor(_order!.status), fontWeight: FontWeight.w600),
              ),
            ],
          ),
          Text(
            '${_order!.createdAt.day}/${_order!.createdAt.month}/${_order!.createdAt.year}',
            style: const TextStyle(color: Colors.grey),
          ),
        ],
      ),
    );
  }

  Widget _buildIssueBanner(bool isRTL) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF3CD),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFFC107), width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.warning, color: Color(0xFFFFC107)),
              const SizedBox(width: 8),
              Text(
                isRTL ? 'تم الإبلاغ عن مشكلة' : 'Issue Reported',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            isRTL 
                ? 'السبب: ${_order!.issue!['reason']}\n${_order!.issue!['description']}'
                : 'Reason: ${_order!.issue!['reason']}\n${_order!.issue!['description']}',
            style: const TextStyle(fontSize: 14),
          ),
          const SizedBox(height: 8),
          Text(
            isRTL 
                ? 'الحالة: ${_order!.issue!['status'] == 'open' ? 'قيد المراجعة' : 'تم الحل'}'
                : 'Status: ${_order!.issue!['status'] == 'open' ? 'Under Review' : 'Resolved'}',
            style: const TextStyle(fontSize: 12, color: Colors.grey),
          ),
        ],
      ),
    );
  }

  Widget _buildDeliveryAddressLabel(bool isRTL) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          const Icon(Icons.location_on, color: AppTheme.accentColor, size: 20),
          const SizedBox(width: 8),
          Text(
            isRTL 
                ? 'عنوان التوصيل: ${_order!.deliveryAddress!.label}'
                : 'Delivery Address: ${_order!.deliveryAddress!.label}',
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: AppTheme.textPrimary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWebStyleStatusBadge(String status, bool isRTL) {
    // Web-style badge: solid background color with white text + icon
    Color bgColor;
    IconData? icon;
    String label;
    
    switch (status.toLowerCase()) {
      case 'pending':
      case 'order_received':
        bgColor = const Color(0xFFF59E0B);
        icon = Icons.schedule;
        label = isRTL ? 'قيد الانتظار' : 'Pending';
        break;
      case 'confirmed':
        bgColor = const Color(0xFF3B82F6);
        icon = Icons.check_circle;
        label = isRTL ? 'مؤكد' : 'Confirmed';
        break;
      case 'preparing':
        bgColor = const Color(0xFFF59E0B);
        icon = Icons.restaurant;
        label = isRTL ? 'قيد التحضير' : 'Being Cooked';
        break;
      case 'ready':
        bgColor = const Color(0xFF10B981);
        icon = Icons.check_circle;
        label = isRTL ? 'جاهز' : 'Ready';
        break;
      case 'out_for_delivery':
        bgColor = const Color(0xFF3B82F6);
        icon = Icons.delivery_dining;
        label = isRTL ? 'قيد التوصيل' : 'Out for Delivery';
        break;
      case 'delivered':
        bgColor = const Color(0xFF3B82F6);
        icon = Icons.check_circle;
        label = isRTL ? 'تم التوصيل' : 'Delivered';
        break;
      case 'completed':
        bgColor = const Color(0xFF10B981);
        icon = Icons.check_circle;
        label = isRTL ? 'مكتمل' : 'Completed';
        break;
      case 'cancelled':
        bgColor = const Color(0xFF9CA3AF);
        icon = Icons.cancel;
        label = isRTL ? 'ملغى' : 'Cancelled';
        break;
      default:
        bgColor = Colors.grey;
        icon = null;
        label = status;
    }
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 14, color: Colors.white),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderedItemsSection(bool isRTL, String currencyCode) {
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
            isRTL ? 'الأصناف المطلوبة' : 'Ordered Items',
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          const Divider(),
          const SizedBox(height: 8),
          
          // Group items by subOrder (cook)
          ..._order!.subOrders.asMap().entries.map((entry) {
            final idx = entry.key;
            final subOrder = entry.value;
            
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Cook header with action button (pickup/delivery)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          isRTL ? 'من: ${subOrder.cookName ?? 'الشيف'}' : 'From: ${subOrder.cookName ?? 'Cook'}',
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                        ),
                      ),
                      // Action button: Pickup or Delivery label
                      if (subOrder.fulfillmentMode == 'pickup' && subOrder.cookLocationSnapshot != null)
                        ElevatedButton.icon(
                          onPressed: () => _showPickupLocationDialog(subOrder, isRTL),
                          icon: const Icon(Icons.store, size: 16),
                          label: Text(
                            isRTL ? 'موقع الاستلام' : 'Pickup',
                            style: const TextStyle(fontSize: 12),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: AppTheme.accentColor,
                            elevation: 0,
                            side: const BorderSide(color: AppTheme.accentColor, width: 1.5),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          ),
                        )
                      else if (subOrder.fulfillmentMode == 'delivery' && _order!.deliveryAddress != null)
                        Text(
                          isRTL 
                              ? 'عنوان التوصيل: ${_order!.deliveryAddress!.label}'
                              : 'Delivery Address: ${_order!.deliveryAddress!.label}',
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppTheme.textSecondary,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                    ],
                  ),
                ),
                
                // Items list
                ...subOrder.items.asMap().entries.map((itemEntry) {
                  final item = itemEntry.value;
                  final lineTotal = item.price * item.quantity;
                  
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
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
                                  width: 52,
                                  height: 52,
                                  fit: BoxFit.cover,
                                  placeholder: (context, url) => Container(
                                    width: 52,
                                    height: 52,
                                    color: Colors.grey[200],
                                    child: const Icon(Icons.restaurant, color: Colors.grey),
                                  ),
                                  errorWidget: (context, url, error) => Container(
                                    width: 52,
                                    height: 52,
                                    color: Colors.grey[200],
                                    child: const Icon(Icons.restaurant, color: Colors.grey),
                                  ),
                                )
                              : Container(
                                  width: 52,
                                  height: 52,
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
                                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: AppTheme.textPrimary),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                isRTL ? 'الكمية: ${item.quantity} × ${item.price.toStringAsFixed(2)} $currencyCode' : 'Qty: ${item.quantity} × ${item.price.toStringAsFixed(2)} $currencyCode',
                                style: const TextStyle(fontSize: 12, color: Colors.grey),
                              ),
                            ],
                          ),
                        ),
                        
                        // Line total
                        Text(
                          '${lineTotal.toStringAsFixed(2)} $currencyCode',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.textPrimary),
                        ),
                      ],
                    ),
                  );
                }).toList(),
                
                // Sub-order totals
                if (subOrder.items.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.only(top: 12),
                    margin: EdgeInsets.only(top: 8, bottom: idx < _order!.subOrders.length - 1 ? 24 : 0),
                    decoration: BoxDecoration(
                      border: Border(top: BorderSide(color: Colors.grey[200]!)),
                    ),
                    child: Column(
                      children: [
                        _buildPriceRow(
                          isRTL ? 'إجمالي الأصناف' : 'Items subtotal',
                          subOrder.items.fold<double>(0, (sum, item) => sum + (item.price * item.quantity)),
                          currencyCode,
                          isRTL,
                        ),
                        if (subOrder.deliveryFee > 0)
                          _buildPriceRow(
                            isRTL ? 'رسوم التوصيل' : 'Delivery fee',
                            subOrder.deliveryFee,
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

  Widget _buildPaymentSummary(bool isRTL, String currencyCode) {
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
          const Divider(),
          const SizedBox(height: 8),
          
          // Sub-order breakdown
          ..._order!.subOrders.map((subOrder) {
            final itemsTotal = subOrder.items.fold<double>(0, (sum, item) => sum + (item.price * item.quantity));
            
            return Column(
              children: [
                Text(
                  subOrder.cookName ?? (isRTL ? 'الشيف' : 'Cook'),
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: Color(0xFF374151)),
                ),
                const SizedBox(height: 4),
                _buildPriceRow(
                  isRTL ? 'الأصناف' : 'Items',
                  itemsTotal,
                  currencyCode,
                  isRTL,
                ),
                if (subOrder.deliveryFee > 0)
                  _buildPriceRow(
                    isRTL ? 'رسوم التوصيل' : 'Delivery fee',
                    subOrder.deliveryFee,
                    currencyCode,
                    isRTL,
                  ),
                const SizedBox(height: 8),
              ],
            );
          }).toList(),
          
          const Divider(),
          const SizedBox(height: 8),
          
          // Total
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                isRTL ? 'الإجمالي' : 'Total',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              Text(
                '${_order!.totalAmount.toStringAsFixed(2)} $currencyCode',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppTheme.accentColor),
              ),
            ],
          ),
          
          // VAT info
          if (_order!.vatSnapshot != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                isRTL 
                    ? 'الأسعار تشمل ${_order!.vatSnapshot!.vatRate.toStringAsFixed(0)}% ${_order!.vatSnapshot!.vatLabel}'
                    : 'Prices include ${_order!.vatSnapshot!.vatRate.toStringAsFixed(0)}% ${_order!.vatSnapshot!.vatLabel}',
                style: const TextStyle(color: Colors.grey, fontSize: 12, fontStyle: FontStyle.italic),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildFoodieView(bool isRTL) {
    // Pickup locations are now shown inline with each cook block
    // This method is kept for compatibility but returns empty
    return const SizedBox.shrink();
  }

  Widget _buildCookView(bool isRTL) {
    // Cook views foodie's delivery location
    final delivery = _order!.deliveryAddress;
    if (delivery == null) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          isRTL ? 'موقع التوصيل' : 'Delivery Location',
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                delivery.label,
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              Text(
                '${delivery.addressLine1}, ${delivery.city}',
                style: const TextStyle(color: Colors.grey),
              ),
              if (delivery.deliveryNotes?.isNotEmpty ?? false)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    'Note: ${delivery.deliveryNotes}',
                    style: const TextStyle(fontStyle: FontStyle.italic, color: Colors.blueGrey),
                  ),
                ),
              const SizedBox(height: 12),
              SizedBox(
                height: 200,
                width: double.infinity,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: GoogleMap(
                    initialCameraPosition: CameraPosition(
                      target: LatLng(delivery.lat, delivery.lng),
                      zoom: 15,
                    ),
                    markers: {
                      Marker(
                        markerId: const MarkerId('delivery_loc'),
                        position: LatLng(delivery.lat, delivery.lng),
                      ),
                    },
                    liteModeEnabled: true,
                    zoomGesturesEnabled: false,
                    scrollGesturesEnabled: false,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => _launchNavigation(delivery.lat, delivery.lng),
                  icon: const Icon(Icons.navigation, color: Colors.white),
                  label: Text(isRTL ? 'بدء التنقل' : 'Start Navigation', style: const TextStyle(color: Colors.white)),
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFFF7A00)),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPriceRow(String label, double amount, String currencyCode, bool isRTL, {bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        textDirection: isRTL ? TextDirection.rtl : TextDirection.ltr,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontWeight: isBold ? FontWeight.bold : FontWeight.normal)),
          Text('${amount.toStringAsFixed(2)} $currencyCode', style: TextStyle(fontWeight: isBold ? FontWeight.bold : FontWeight.normal)),
        ],
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return Colors.green;
      case 'cancelled':
        return Colors.red;
      case 'confirmed':
      case 'ready':
        return Colors.blue;
      default:
        return Colors.orange;
    }
  }

  // ── Order Tracking ──────────────────────────────────────────────────────────

  Widget _buildTrackingSection(bool isRTL) {
    final subOrders = _order!.subOrders;
    if (subOrders.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ...subOrders.map((sub) => Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: _buildSubOrderTracking(sub, isRTL),
        )),
      ],
    );
  }

  Widget _buildSubOrderTracking(SubOrder subOrder, bool isRTL) {
    final isCancelled = subOrder.status.toLowerCase() == 'cancelled' ||
        _order!.status.toLowerCase() == 'cancelled';
    final isPickup = subOrder.fulfillmentMode == 'pickup';

    // Build ordered step keys
    final List<String> stepKeys = isCancelled
        ? ['order_received', 'cancelled']
        : isPickup
            ? ['order_received', 'preparing', 'ready', 'pickedup']
            : ['order_received', 'preparing', 'ready', 'out_for_delivery', 'delivered'];

    final int activeIndex = _resolveStepIndex(subOrder.status, stepKeys);

    final cookLabel = subOrder.cookName ?? (isRTL ? 'الشيف' : 'Cook');
    final modeLabel = isPickup
        ? (isRTL ? 'استلام' : 'Pickup')
        : (isRTL ? 'توصيل' : 'Delivery');

    return Container(
      padding: const EdgeInsets.all(16),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Card header
          Row(
            children: [
              const Icon(Icons.local_shipping_outlined, size: 18, color: Color(0xFFFF7A00)),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  isRTL
                      ? 'تتبع الطلب — $cookLabel ($modeLabel)'
                      : 'Order Tracking — $cookLabel ($modeLabel)',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: Color(0xFF1F2937),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Steps
          ...List.generate(stepKeys.length, (i) {
            final isCompleted = i < activeIndex;
            final isActive = i == activeIndex;
            final isLast = i == stepKeys.length - 1;
            return _buildTrackingStep(
              stepKeys[i],
              isCompleted: isCompleted,
              isActive: isActive,
              isLast: isLast,
              isCancelled: isCancelled && isActive,
              isRTL: isRTL,
            );
          }),
        ],
      ),
    );
  }

  int _resolveStepIndex(String status, List<String> stepKeys) {
    final s = status.toLowerCase();
    // Normalize
    final normalized = _normalizeStatus(s);
    final idx = stepKeys.indexOf(normalized);
    if (idx >= 0) return idx;
    return 0;
  }

  String _normalizeStatus(String s) {
    switch (s) {
      case 'pending':
      case 'received':
      case 'order_received':
        return 'order_received';
      case 'preparing':
        return 'preparing';
      case 'ready':
        return 'ready';
      case 'out_for_delivery':
        return 'out_for_delivery';
      case 'delivered':
        return 'delivered';
      case 'pickedup':
      case 'picked_up':
      case 'completed':
        return 'pickedup';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'order_received';
    }
  }

  Widget _buildTrackingStep(
    String stepKey, {
    required bool isCompleted,
    required bool isActive,
    required bool isLast,
    required bool isCancelled,
    required bool isRTL,
  }) {
    const orange = Color(0xFFFF7A00);
    const grey = Color(0xFFD1D5DB);

    final circleColor = isCompleted || isActive ? orange : grey;
    final lineColor = isCompleted ? orange : grey;

    final stepLabel = _stepLabel(stepKey, isRTL);
    final stepSub = _stepSubtitle(stepKey, isActive, isCompleted, isCancelled, isRTL);

    return IntrinsicHeight(
      child: Row(
        children: [
          // Left: circle + line
          SizedBox(
            width: 28,
            child: Column(
              children: [
                // Circle
                Container(
                  width: 22,
                  height: 22,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isCompleted ? orange : Colors.transparent,
                    border: Border.all(
                      color: circleColor,
                      width: isActive ? 2.5 : 2,
                    ),
                  ),
                  child: isCompleted
                      ? const Icon(Icons.check, size: 12, color: Colors.white)
                      : isCancelled
                          ? const Icon(Icons.close, size: 12, color: Color(0xFFFF7A00))
                          : null,
                ),
                // Connector line (skip for last step)
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      margin: const EdgeInsets.symmetric(vertical: 3),
                      color: lineColor,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          // Right: label + subtitle
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 0 : 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    stepLabel,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                      color: isActive
                          ? orange
                          : isCompleted
                              ? const Color(0xFF1F2937)
                              : const Color(0xFF9CA3AF),
                    ),
                  ),
                  if (stepSub.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      stepSub,
                      style: TextStyle(
                        fontSize: 11,
                        color: isActive ? orange.withValues(alpha: 0.85) : const Color(0xFF9CA3AF),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _stepLabel(String key, bool isRTL) {
    if (isRTL) {
      switch (key) {
        case 'order_received': return 'تم استلام الطلب';
        case 'preparing':      return 'جاري التحضير';
        case 'ready':          return 'جاهز';
        case 'out_for_delivery': return 'قيد التوصيل';
        case 'delivered':      return 'تم التوصيل';
        case 'pickedup':       return 'تم الاستلام';
        case 'cancelled':      return 'ملغى';
        default:               return key;
      }
    } else {
      switch (key) {
        case 'order_received': return 'Order Received';
        case 'preparing':      return 'Preparing';
        case 'ready':          return 'Ready';
        case 'out_for_delivery': return 'Out for Delivery';
        case 'delivered':      return 'Delivered';
        case 'pickedup':       return 'Picked Up';
        case 'cancelled':      return 'Cancelled';
        default:               return key;
      }
    }
  }

  String _stepSubtitle(String key, bool isActive, bool isCompleted, bool isCancelled, bool isRTL) {
    if (isCancelled) return isRTL ? 'تم إلغاء الطلب' : 'Order was cancelled';
    if (isActive) return isRTL ? 'جارٍ الآن' : 'In progress';
    if (isCompleted) return isRTL ? 'مكتمل' : 'Completed';
    return isRTL ? 'قادم' : 'Pending';
  }
}
