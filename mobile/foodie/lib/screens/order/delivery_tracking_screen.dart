import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/theme.dart';
import '../../providers/language_provider.dart';

class DeliveryTrackingScreen extends StatefulWidget {
  final String orderId;
  final LatLng cookLocation;
  final LatLng customerLocation;
  final String cookName;
  final bool isPickup;
  
  const DeliveryTrackingScreen({
    Key? key,
    required this.orderId,
    required this.cookLocation,
    required this.customerLocation,
    required this.cookName,
    this.isPickup = false,
  }) : super(key: key);

  @override
  State<DeliveryTrackingScreen> createState() => _DeliveryTrackingScreenState();
}

class _DeliveryTrackingScreenState extends State<DeliveryTrackingScreen> {
  GoogleMapController? _mapController;
  final String _orderStatus = 'preparing'; // preparing, on_the_way, delivered
  final int _estimatedMinutes = 35;

  @override
  void dispose() {
    _mapController?.dispose();
    super.dispose();
  }

  void _launchNavigation() async {
    final targetLocation = widget.isPickup ? widget.cookLocation : widget.customerLocation;
    final url = Uri.parse(
      'https://www.google.com/maps/dir/?api=1&destination=${targetLocation.latitude},${targetLocation.longitude}'
    );
    
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: SafeArea(
        child: Stack(
          children: [
            _buildMap(),
            _buildHeader(context, isRTL),
            _buildStatusCard(isRTL),
          ],
        ),
      ),
    );
  }

  Widget _buildMap() {
    final bounds = LatLngBounds(
      southwest: LatLng(
        widget.cookLocation.latitude < widget.customerLocation.latitude
            ? widget.cookLocation.latitude
            : widget.customerLocation.latitude,
        widget.cookLocation.longitude < widget.customerLocation.longitude
            ? widget.cookLocation.longitude
            : widget.customerLocation.longitude,
      ),
      northeast: LatLng(
        widget.cookLocation.latitude > widget.customerLocation.latitude
            ? widget.cookLocation.latitude
            : widget.customerLocation.latitude,
        widget.cookLocation.longitude > widget.customerLocation.longitude
            ? widget.cookLocation.longitude
            : widget.customerLocation.longitude,
      ),
    );

    return GoogleMap(
      initialCameraPosition: CameraPosition(
        target: widget.cookLocation,
        zoom: 13,
      ),
      onMapCreated: (controller) {
        _mapController = controller;
        // Fit bounds to show both locations
        Future.delayed(const Duration(milliseconds: 500), () {
          _mapController?.animateCamera(
            CameraUpdate.newLatLngBounds(bounds, 100),
          );
        });
      },
      markers: {
        Marker(
          markerId: const MarkerId('cook_location'),
          position: widget.cookLocation,
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange),
          infoWindow: InfoWindow(
            title: widget.isPickup ? 'Pickup Location' : 'Cook Location',
            snippet: widget.cookName,
          ),
        ),
        if (!widget.isPickup)
          Marker(
            markerId: const MarkerId('customer_location'),
            position: widget.customerLocation,
            icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
            infoWindow: const InfoWindow(
              title: 'Delivery Location',
              snippet: 'Your address',
            ),
          ),
      },
      polylines: widget.isPickup
          ? {}
          : {
              Polyline(
                polylineId: const PolylineId('delivery_route'),
                points: [widget.cookLocation, widget.customerLocation],
                color: const Color(0xFFFCD535),
                width: 4,
                patterns: [PatternItem.dash(20), PatternItem.gap(10)],
              ),
            },
      myLocationEnabled: true,
      myLocationButtonEnabled: false,
      zoomControlsEnabled: false,
      mapToolbarEnabled: false,
    );
  }

  Widget _buildHeader(BuildContext context, bool isRTL) {
    return Positioned(
      top: 16,
      left: 20,
      right: 20,
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.1),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Icon(
                isRTL ? Icons.arrow_forward : Icons.arrow_back,
                color: AppTheme.textPrimary,
              ),
            ),
          ),
          const Spacer(),
          GestureDetector(
            onTap: _launchNavigation,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: AppTheme.accentColor,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.1),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.navigation,
                    size: 20,
                    color: Color(0xFF595757),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    isRTL ? 'التنقل' : 'Navigate',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF595757),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusCard(bool isRTL) {
    return Positioned(
      bottom: 0,
      left: 0,
      right: 0,
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 12,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Order ID
              Row(
                children: [
                  Text(
                    isRTL ? 'رقم الطلب:' : 'Order ID:',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w400,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '#${widget.orderId}',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              // Status Steps
              _buildStatusTimeline(isRTL),
              const SizedBox(height: 20),
              // Estimated Time
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.backgroundColor,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: const BoxDecoration(
                        color: AppTheme.accentColor,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.access_time,
                        color: Color(0xFF595757),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.isPickup
                                ? (isRTL ? 'جاهز للاستلام في' : 'Ready for pickup in')
                                : (isRTL ? 'الوصول خلال' : 'Arriving in'),
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w400,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            isRTL
                                ? '$_estimatedMinutes دقيقة'
                                : '$_estimatedMinutes minutes',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              // Contact Buttons
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () async {
                        // TODO: Implement call cook functionality
                        // For now, show a placeholder action
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(isRTL ? 'جاري الاتصال بالطاهي' : 'Calling cook...'),
                            duration: const Duration(seconds: 1),
                          ),
                        );
                      },
                      icon: const Icon(Icons.phone, size: 20),
                      label: Text(isRTL ? 'اتصال' : 'Call'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF595757),
                        side: const BorderSide(color: Color(0xFF595757)),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () async {
                        // TODO: Implement message cook functionality
                        // For now, show a placeholder action
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(isRTL ? 'جاري إرسال الرسالة' : 'Sending message...'),
                            duration: const Duration(seconds: 1),
                          ),
                        );
                      },
                      icon: const Icon(Icons.message, size: 20),
                      label: Text(isRTL ? 'رسالة' : 'Message'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF595757),
                        side: const BorderSide(color: Color(0xFF595757)),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusTimeline(bool isRTL) {
    final steps = [
      {'key': 'preparing', 'label': isRTL ? 'يتم التحضير' : 'Preparing', 'icon': Icons.restaurant},
      if (!widget.isPickup)
        {'key': 'on_the_way', 'label': isRTL ? 'في الطريق' : 'On the way', 'icon': Icons.delivery_dining},
      {'key': 'delivered', 'label': widget.isPickup ? (isRTL ? 'جاهز' : 'Ready') : (isRTL ? 'تم التوصيل' : 'Delivered'), 'icon': Icons.check_circle},
    ];

    final currentIndex = steps.indexWhere((step) => step['key'] == _orderStatus);

    return Row(
      children: List.generate(steps.length, (index) {
        final step = steps[index];
        final isActive = index <= currentIndex;
        final isLast = index == steps.length - 1;

        return Expanded(
          child: Row(
            children: [
              Expanded(
                child: Column(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: isActive ? AppTheme.accentColor : AppTheme.backgroundColor,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: isActive ? AppTheme.accentColor : AppTheme.textSecondary,
                          width: 2,
                        ),
                      ),
                      child: Icon(
                        step['icon'] as IconData,
                        size: 20,
                        color: isActive ? const Color(0xFF595757) : AppTheme.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      step['label'] as String,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
                        color: isActive ? AppTheme.textPrimary : AppTheme.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              if (!isLast)
                Expanded(
                  child: Container(
                    height: 2,
                    margin: const EdgeInsets.only(bottom: 32),
                    color: isActive ? AppTheme.accentColor : AppTheme.dividerColor,
                  ),
                ),
            ],
          ),
        );
      }),
    );
  }
}
