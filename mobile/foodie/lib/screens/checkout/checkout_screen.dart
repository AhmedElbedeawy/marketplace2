import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/checkout_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/cart_provider.dart';
import '../../providers/country_provider.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../widgets/map_picker.dart';
import '../../providers/address_provider.dart';
import '../../providers/language_provider.dart';
import '../../models/checkout_session.dart';
import '../../models/address.dart';
import '../../utils/country_context.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({Key? key}) : super(key: key);

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _notesController = TextEditingController();
  final _couponController = TextEditingController();
  
  String _selectedPayment = 'CASH';
  bool _isSubmitting = false;
  String? _selectedAddressId;
  bool _isAddressLoading = true;

  @override
  void initState() {
    super.initState();
    _initializeCheckout();
  }

  Future<void> _initializeCheckout() async {
    final checkoutProvider = Provider.of<CheckoutProvider>(context, listen: false);
    final cartProvider = Provider.of<CartProvider>(context, listen: false);
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final countryProvider = Provider.of<CountryProvider>(context, listen: false);
    final addressProvider = Provider.of<AddressProvider>(context, listen: false);

    // Clear previous session errors
    checkoutProvider.clearError();

    // Load addresses
    await addressProvider.fetchAddresses();
    if (addressProvider.defaultAddress != null) {
      _selectedAddressId = addressProvider.defaultAddress!.id;
    }
    setState(() => _isAddressLoading = false);

    // Flatten cart items from all cooks
    final cartItems = <Map<String, dynamic>>[];
    cartProvider.carts.forEach((cookId, items) {
      for (final item in items) {
        cartItems.add({
          'dishId': item.foodId,
          'cookId': cookId,
          'quantity': item.quantity,
          'unitPrice': item.price,
          'notes': '',
        });
      }
    });

    await checkoutProvider.createSession(
      cartItems, 
      authProvider.token ?? '',
      countryCode: countryProvider.countryCode,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Checkout'),
        backgroundColor: const Color(0xFFFF7A00),
      ),
      body: Consumer<CheckoutProvider>(
        builder: (context, checkoutProvider, child) {
          if (checkoutProvider.isLoading && checkoutProvider.session == null) {
            return const Center(child: CircularProgressIndicator());
          }

          final geoError = checkoutProvider.error != null && 
              (checkoutProvider.error!.contains('city') || checkoutProvider.error!.contains('distance') || checkoutProvider.error!.contains('far away'));

          if (checkoutProvider.error != null && checkoutProvider.session == null && !geoError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(checkoutProvider.error!),
                  ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Go Back'),
                  ),
                ],
              ),
            );
          }

          return Stack(
            children: [
              Column(
                children: [
                  _buildStepper(checkoutProvider.currentStep),
                  Expanded(
                    child: IgnorePointer(
                      ignoring: geoError,
                      child: ColorFiltered(
                        colorFilter: geoError 
                            ? ColorFilter.mode(Colors.grey.withValues(alpha: 0.5), BlendMode.saturation)
                            : const ColorFilter.mode(Colors.transparent, BlendMode.multiply),
                        child: _buildStepContent(checkoutProvider),
                      ),
                    ),
                  ),
                ],
              ),
              if (geoError)
                Container(
                  color: Colors.black.withValues(alpha: 0.3),
                  child: Center(
                    child: Container(
                      margin: const EdgeInsets.all(24),
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.error_outline, color: Colors.red, size: 48),
                          const SizedBox(height: 16),
                          Text(
                            checkoutProvider.error!,
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 24),
                          ElevatedButton(
                            onPressed: () {
                              checkoutProvider.clearError();
                              checkoutProvider.setCurrentStep(0);
                            },
                            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFFF7A00)),
                            child: const Text('Change Address', style: TextStyle(color: Colors.white)),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildStepper(int currentStep) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          _buildStepIndicator(0, currentStep, 'Address'),
          _buildStepLine(currentStep >= 1),
          _buildStepIndicator(1, currentStep, 'Coupon'),
          _buildStepLine(currentStep >= 2),
          _buildStepIndicator(2, currentStep, 'Payment'),
          _buildStepLine(currentStep >= 3),
          _buildStepIndicator(3, currentStep, 'Review'),
        ],
      ),
    );
  }

  Widget _buildStepIndicator(int step, int currentStep, String label) {
    final isActive = step == currentStep;
    final isCompleted = step < currentStep;

    return Column(
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: isCompleted || isActive ? const Color(0xFFFF7A00) : Colors.grey[300],
          ),
          child: Center(
            child: isCompleted
                ? const Icon(Icons.check, color: Colors.white, size: 16)
                : Text(
                    '${step + 1}',
                    style: TextStyle(
                      color: isActive ? Colors.white : Colors.grey[600],
                      fontWeight: FontWeight.bold,
                    ),
                  ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            color: isActive ? const Color(0xFFFF7A00) : Colors.grey[600],
          ),
        ),
      ],
    );
  }

  Widget _buildStepLine(bool isActive) {
    return Expanded(
      child: Container(
        height: 2,
        color: isActive ? const Color(0xFFFF7A00) : Colors.grey[300],
        margin: const EdgeInsets.only(bottom: 20),
      ),
    );
  }

  Widget _buildStepContent(CheckoutProvider checkoutProvider) {
    switch (checkoutProvider.currentStep) {
      case 0:
        return _buildAddressStep(checkoutProvider);
      case 1:
        return _buildCouponStep(checkoutProvider);
      case 2:
        return _buildPaymentStep(checkoutProvider);
      case 3:
        return _buildReviewStep(checkoutProvider);
      default:
        return Container();
    }
  }

  Widget _buildAddressStep(CheckoutProvider checkoutProvider) {
    final addressProvider = Provider.of<AddressProvider>(context);
    final languageProvider = Provider.of<LanguageProvider>(context);
    final isRTL = languageProvider.isArabic;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            isRTL ? 'عنوان التوصيل' : 'Delivery Address',
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          if (_isAddressLoading)
            const Center(child: CircularProgressIndicator())
          else ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.grey[300]!),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButtonFormField<String>(
                  initialValue: _selectedAddressId,
                  hint: Text(isRTL ? 'اختر عنواناً' : 'Select an address'),
                  isExpanded: true,
                  decoration: const InputDecoration(border: InputBorder.none),
                  items: addressProvider.addresses.map((address) {
                    return DropdownMenuItem<String>(
                      value: address.id,
                      child: Text('${address.label}: ${address.addressLine1}'),
                    );
                  }).toList(),
                  onChanged: (val) => setState(() => _selectedAddressId = val),
                ),
              ),
            ),
            const SizedBox(height: 12),
            TextButton.icon(
              onPressed: () => _showAddAddressDialog(context, isRTL),
              icon: const Icon(Icons.add_location_alt),
              label: Text(isRTL ? 'إضافة عنوان جديد بالخريطة' : 'Add new address with Map'),
              style: TextButton.styleFrom(foregroundColor: const Color(0xFFFF7A00)),
            ),
          ],
          const SizedBox(height: 24),
          TextField(
            controller: _notesController,
            decoration: InputDecoration(
              labelText: isRTL ? 'ملاحظات التوصيل (اختياري)' : 'Delivery Notes (Optional)',
              border: const OutlineInputBorder(),
            ),
            maxLines: 2,
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: (_isSubmitting || _selectedAddressId == null) ? null : () async {
                setState(() => _isSubmitting = true);
                final authProvider = Provider.of<AuthProvider>(context, listen: false);
                
                // Find selected address object
                final selectedAddr = addressProvider.addresses.firstWhere((a) => a.id == _selectedAddressId);

                final success = await checkoutProvider.updateAddress(
                  selectedAddr.addressLine1,
                  selectedAddr.city,
                  selectedAddr.countryCode,
                  _notesController.text,
                  authProvider.token ?? '',
                  lat: selectedAddr.lat,
                  lng: selectedAddr.lng,
                );

                setState(() => _isSubmitting = false);

                if (success) {
                  if (!mounted) return;
                  checkoutProvider.nextStep();
                } else {
                  if (!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(checkoutProvider.error ?? 'Failed to save address')),
                  );
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFFF7A00),
              ),
              child: _isSubmitting
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text('Continue'),
            ),
          ),
        ],
      ),
    );
  }

  void _showAddAddressDialog(BuildContext context, bool isRTL) {
    final labelController = TextEditingController(text: 'Home');
    final line1Controller = TextEditingController();
    final cityController = TextEditingController();
    final countryProvider = Provider.of<CountryProvider>(context, listen: false);
    double? lat;
    double? lng;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(isRTL ? 'إضافة عنوان جديد' : 'Add New Address'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: labelController,
                  decoration: InputDecoration(labelText: isRTL ? 'التصنيف' : 'Label'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: line1Controller,
                  decoration: InputDecoration(
                    labelText: isRTL ? 'العنوان' : 'Address',
                    hintText: isRTL ? 'شارع، مبنى، شقة' : 'Street, Building, Apt',
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: cityController,
                  decoration: InputDecoration(labelText: isRTL ? 'المدينة' : 'City'),
                ),
                const SizedBox(height: 16),
                if (lat != null && lng != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Text(
                      isRTL ? 'تم تحديد الموقع بنجاح' : 'Location picked successfully',
                      style: const TextStyle(color: Colors.green, fontSize: 12),
                    ),
                  ),
                OutlinedButton.icon(
                  onPressed: () async {
                    final LatLng? result = await Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => MapPicker(
                          title: isRTL ? 'حدد موقع التوصيل' : 'Pick Delivery Location',
                          initialLat: lat ?? 24.7136,
                          initialLng: lng ?? 46.6753,
                        ),
                      ),
                    );
                    if (result != null) {
                      setDialogState(() {
                        lat = result.latitude;
                        lng = result.longitude;
                      });
                    }
                  },
                  icon: const Icon(Icons.map),
                  label: Text(lat == null 
                      ? (isRTL ? 'تحديد على الخريطة' : 'Pick on Map')
                      : (isRTL ? 'تغيير الموقع' : 'Change Location')),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: lat == null ? Colors.grey : Colors.green,
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(isRTL ? 'إلغاء' : 'Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (line1Controller.text.isEmpty || cityController.text.isEmpty || lat == null) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(isRTL ? 'يرجى إكمال جميع الحقول وتحديد الموقع' : 'Please fill all fields and pick location')),
                  );
                  return;
                }

                final addressProvider = Provider.of<AddressProvider>(context, listen: false);
                final newAddr = Address(
                  id: '',
                  label: labelController.text,
                  addressLine1: line1Controller.text,
                  city: cityController.text,
                  countryCode: countryProvider.countryCode,
                  lat: lat!,
                  lng: lng!,
                  isDefault: addressProvider.addresses.isEmpty,
                );

                final success = await addressProvider.addAddress(newAddr);
                if (success && context.mounted) {
                  setState(() {
                    _selectedAddressId = addressProvider.addresses.last.id;
                  });
                  Navigator.pop(context);
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFFF7A00)),
              child: Text(isRTL ? 'إضافة' : 'Add', style: const TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCouponStep(CheckoutProvider checkoutProvider) {
    final session = checkoutProvider.session;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Discount Coupon',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          if (session?.appliedCoupon != null)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.green[50],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.green),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Coupon Applied', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                      Text(session!.appliedCoupon!.code, style: const TextStyle(fontSize: 16)),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.red),
                    onPressed: () async {
                      final authProvider = Provider.of<AuthProvider>(context, listen: false);
                      await checkoutProvider.removeCoupon(authProvider.token ?? '');
                    },
                  ),
                ],
              ),
            )
          else
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _couponController,
                    decoration: const InputDecoration(
                      labelText: 'Enter Coupon Code',
                      border: OutlineInputBorder(),
                    ),
                    textCapitalization: TextCapitalization.characters,
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: () async {
                    if (_couponController.text.isEmpty) return;
                    
                    final authProvider = Provider.of<AuthProvider>(context, listen: false);
                    final success = await checkoutProvider.applyCoupon(
                      _couponController.text,
                      authProvider.token ?? '',
                    );

                    if (success) {
                      if (!mounted) return;
                      _couponController.clear();
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Coupon applied!')),
                      );
                    } else {
                      if (!mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(checkoutProvider.error ?? 'Invalid coupon')),
                      );
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFFF7A00),
                  ),
                  child: const Text('Apply'),
                ),
              ],
            ),
          const SizedBox(height: 16),
          const Text(
            'You can skip this step if you don\'t have a coupon',
            style: TextStyle(color: Colors.grey, fontSize: 12),
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => checkoutProvider.previousStep(),
                  child: const Text('Back'),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: ElevatedButton(
                  onPressed: () => checkoutProvider.nextStep(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFFF7A00),
                  ),
                  child: const Text('Continue'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentStep(CheckoutProvider checkoutProvider) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Payment Method',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          _buildPaymentOption('CASH', 'Cash on Delivery', 'Pay with cash when you receive your order'),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => checkoutProvider.previousStep(),
                  child: const Text('Back'),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : () async {
                    setState(() => _isSubmitting = true);
                    final authProvider = Provider.of<AuthProvider>(context, listen: false);
                    final success = await checkoutProvider.setPaymentMethod(
                      _selectedPayment,
                      authProvider.token ?? '',
                    );
                    setState(() => _isSubmitting = false);

                    if (success) {
                      if (!mounted) return;
                      checkoutProvider.nextStep();
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFFF7A00),
                  ),
                  child: _isSubmitting
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text('Continue'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentOption(String value, String title, String subtitle) {
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedPayment = value;
        });
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border.all(
            color: _selectedPayment == value ? const Color(0xFFFF7A00) : Colors.grey[300]!,
            width: 2,
          ),
          borderRadius: BorderRadius.circular(8),
          color: _selectedPayment == value ? const Color(0xFFFFF7ED) : Colors.white,
        ),
        child: Row(
          children: [
            // ignore: deprecated_member_use
            Radio<String>(
              value: value,
              // ignore: deprecated_member_use
              groupValue: _selectedPayment,
              // ignore: deprecated_member_use
              onChanged: (val) {
                if (val != null) {
                  setState(() {
                    _selectedPayment = val;
                  });
                }
              },
              activeColor: const Color(0xFFFF7A00),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  Text(subtitle, style: const TextStyle(color: Colors.grey, fontSize: 12)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReviewStep(CheckoutProvider checkoutProvider) {
    final session = checkoutProvider.session;
    if (session == null) return Container();

    final pricing = session.pricingBreakdown;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Review & Confirm',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          _buildInfoSection('Delivery Address', session.addressSnapshot?.fullAddress ?? 'N/A'),
          _buildInfoSection('City', session.addressSnapshot?.city ?? 'N/A'),
          _buildInfoSection('Payment Method', session.paymentMethod == 'CASH' ? 'Cash on Delivery' : 'Credit Card'),
          const Divider(height: 32),
          _buildPricingRow('Subtotal', pricing.subtotal, pricing: pricing),
          if (pricing.couponDiscount > 0)
            _buildPricingRow('Coupon Discount', -pricing.couponDiscount, color: Colors.green, pricing: pricing),
          if (pricing.autoDiscount > 0)
            _buildPricingRow('Auto Discount', -pricing.autoDiscount, color: Colors.green, pricing: pricing),
          _buildPricingRow('Delivery Fee', pricing.deliveryFee, pricing: pricing),
          if (pricing.vatAmount > 0 && (pricing.vatRate ?? 0) > 0) ...[
            _buildPricingRow('Net Total', pricing.netTotal, pricing: pricing),
            _buildPricingRow(
              '${pricing.vatLabel ?? 'VAT'} (${pricing.vatRate?.toStringAsFixed(0)}%)',
              pricing.vatAmount,
              pricing: pricing,
            ),
          ],
          const Divider(height: 24),
          _buildPricingRow('Total', pricing.total, isTotal: true, pricing: pricing),
          if (pricing.vatAmount > 0 && (pricing.vatRate ?? 0) > 0)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Center(
                child: Text(
                  'Prices include ${pricing.vatRate?.toStringAsFixed(0)}% ${pricing.vatLabel ?? 'VAT'}',
                  style: const TextStyle(color: Colors.grey, fontSize: 12, fontStyle: FontStyle.italic),
                ),
              ),
            ),
          const SizedBox(height: 24),
          _buildDebugPanel(pricing),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => checkoutProvider.previousStep(),
                  child: const Text('Back'),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                flex: 2,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : () async {
                    setState(() => _isSubmitting = true);
                    final authProvider = Provider.of<AuthProvider>(context, listen: false);
                    final orderId = await checkoutProvider.confirmOrder(authProvider.token ?? '');
                    setState(() => _isSubmitting = false);

                    if (orderId != null) {
                      if (!mounted) return;
                      // Clear all carts
                      final cartProvider = Provider.of<CartProvider>(context, listen: false);
                      await cartProvider.clearAllCarts();
                      
                      // Navigate to success
                      if (!mounted) return;
                      Navigator.pushReplacementNamed(context, '/order-success', arguments: orderId);
                    } else {
                      if (!mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(checkoutProvider.error ?? 'Failed to place order')),
                      );
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFFF7A00),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: _isSubmitting
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text('Place Order', style: TextStyle(fontSize: 16)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildInfoSection(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontWeight: FontWeight.bold)),
          Text(value, style: const TextStyle(color: Colors.grey)),
        ],
      ),
    );
  }

  Widget _buildPricingRow(String label, double amount, {required PricingBreakdown pricing, Color? color, bool isTotal = false}) {
    final context = CountryContextHelper.getContext(pricing.countryCode);
    final currency = pricing.currencyCode ?? context.currencyCode;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
              fontSize: isTotal ? 18 : 14,
            ),
          ),
          Text(
            '$currency ${amount.abs().toStringAsFixed(2)}${amount < 0 ? ' -' : ''}',
            style: TextStyle(
              fontWeight: isTotal ? FontWeight.bold : FontWeight.w600,
              fontSize: isTotal ? 18 : 14,
              color: color ?? (isTotal ? const Color(0xFFFF7A00) : Colors.black),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDebugPanel(PricingBreakdown pricing) {
    if (pricing.debug == null) return const SizedBox.shrink();
    final debug = pricing.debug!;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red[50],
        border: Border.all(color: Colors.red, width: 1, style: BorderStyle.solid),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'VAT DEBUG PANEL (DEV ONLY)',
            style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 10),
          ),
          const Divider(color: Colors.red),
          _debugText('selectedCountryFromButton', debug['selectedCountryFromButton']),
          _debugText('resolvedCountryCode', debug['resolvedCountryCode']),
          _debugText('resolvedCurrencyCode', debug['resolvedCurrencyCode']),
          _debugText('settingsLookupKeyUsed', debug['settingsLookupKeyUsed']),
          _debugText('checkoutVatEnabled', debug['checkoutVatEnabled']),
          _debugText('checkoutVatRate', debug['checkoutVatRate']),
          const Divider(color: Colors.red),
          _debugText('subtotal', debug['subtotal']),
          _debugText('deliveryFee', debug['deliveryFee']),
          _debugText('grossTotal', debug['grossTotal']),
          _debugText('netTotal', debug['netTotal']),
          _debugText('vatAmount', debug['vatAmount']),
          _debugText('finalTotal', debug['finalTotal']),
        ],
      ),
    );
  }

  Widget _debugText(String label, dynamic value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 1),
      child: Text(
        '$label: $value',
        style: const TextStyle(fontFamily: 'monospace', fontSize: 10),
      ),
    );
  }

  @override
  void dispose() {
    _notesController.dispose();
    _couponController.dispose();
    super.dispose();
  }
}
