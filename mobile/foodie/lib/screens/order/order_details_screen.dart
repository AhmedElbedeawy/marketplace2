import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/theme.dart';
import '../../providers/order_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/language_provider.dart';
import '../../providers/app_mode_provider.dart';
import '../../models/order.dart';

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

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;
    final appMode = context.watch<AppModeProvider>();
    final isCookMode = appMode.isCookHubMode;

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: Text(isRTL ? 'تفاصيل الطلب' : 'Order Details'),
        backgroundColor: Colors.white,
        foregroundColor: AppTheme.textPrimary,
        elevation: 0,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _order == null
              ? Center(child: Text(isRTL ? 'فشل تحميل الطلب' : 'Failed to load order'))
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildHeader(isRTL),
                      const SizedBox(height: 16),
                      if (isCookMode)
                        _buildCookView(isRTL)
                      else
                        _buildFoodieView(isRTL),
                      const SizedBox(height: 24),
                      _buildOrderSummary(isRTL),
                    ],
                  ),
                ),
    );
  }

  Widget _buildHeader(bool isRTL) {
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
                isRTL ? 'طلب #${_order!.id.substring(_order!.id.length - 6)}' : 'Order #${_order!.id.substring(_order!.id.length - 6)}',
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

  Widget _buildFoodieView(bool isRTL) {
    // Foodie views cook locations for each sub-order
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          isRTL ? 'مواقع الاستلام' : 'Pickup Locations',
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        const SizedBox(height: 12),
        ..._order!.subOrders.map((subOrder) {
          final snapshot = subOrder.cookLocationSnapshot;
          if (snapshot == null) return const SizedBox.shrink();
          
          return Container(
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isRTL ? 'مطبخ الشيف' : 'Cook\'s Kitchen',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                Text(
                  '${snapshot.address}, ${snapshot.city}',
                  style: const TextStyle(color: Colors.grey),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 150,
                  width: double.infinity,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: GoogleMap(
                      initialCameraPosition: CameraPosition(
                        target: LatLng(snapshot.lat, snapshot.lng),
                        zoom: 14,
                      ),
                      markers: {
                        Marker(
                          markerId: MarkerId('cook_${subOrder.id}'),
                          position: LatLng(snapshot.lat, snapshot.lng),
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
                    onPressed: () => _launchNavigation(snapshot.lat, snapshot.lng),
                    icon: const Icon(Icons.navigation, color: Colors.white),
                    label: Text(isRTL ? 'فتح في خرائط جوجل' : 'Open in Google Maps', style: const TextStyle(color: Colors.white)),
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFFF7A00)),
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ],
    );
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

  Widget _buildOrderSummary(bool isRTL) {
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
          _buildPriceRow(isRTL ? 'الإجمالي' : 'Total', _order!.totalAmount, isBold: true),
          if (_order!.vatSnapshot != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                'Prices include ${_order!.vatSnapshot!.vatRate.toStringAsFixed(0)}% ${_order!.vatSnapshot!.vatLabel}',
                style: const TextStyle(color: Colors.grey, fontSize: 12, fontStyle: FontStyle.italic),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildPriceRow(String label, double amount, {bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontWeight: isBold ? FontWeight.bold : FontWeight.normal)),
          Text(amount.toStringAsFixed(2), style: TextStyle(fontWeight: isBold ? FontWeight.bold : FontWeight.normal)),
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
}
