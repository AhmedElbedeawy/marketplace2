import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/cart_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/checkout_provider.dart';
import '../../providers/language_provider.dart';
import '../../providers/address_provider.dart';
import '../../models/cart.dart' as cart;
import '../../widgets/global_bottom_navigation.dart';
import '../../widgets/phone_verification_widget.dart';
import '../../providers/food_provider.dart';
import '../../providers/country_provider.dart';
import '../../utils/arabic_utils.dart';
import 'order_success_screen.dart';

/// Single-page checkout screen matching web behavior
/// Section order:
/// 1. Delivery Address
/// 2. Discount Coupon
/// 3. Payment Method
/// 4. Review & Place Order + Order Summary (combined)
class SinglePageCheckoutScreen extends StatefulWidget {
  const SinglePageCheckoutScreen({Key? key}) : super(key: key);

  @override
  State<SinglePageCheckoutScreen> createState() =>
      _SinglePageCheckoutScreenState();
}

class _SinglePageCheckoutScreenState extends State<SinglePageCheckoutScreen> {
  bool _isProcessing = false;
  String? _selectedAddressId;
  String _selectedPaymentMethod = 'CASH';
  final TextEditingController _couponController = TextEditingController();
  String? _couponError;

  @override
  void dispose() {
    _couponController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final addressProvider =
          Provider.of<AddressProvider>(context, listen: false);
      final authProvider = Provider.of<AuthProvider>(context, listen: false);

      if (authProvider.token != null) {
        addressProvider.fetchAddresses(authProvider.token!).then((_) {
          if (mounted && addressProvider.selectedAddress != null) {
            setState(() {
              _selectedAddressId = addressProvider.selectedAddress!.id;
            });
          }
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer4<CartProvider, AuthProvider, CheckoutProvider,
        LanguageProvider>(
      builder: (context, cartProvider, authProvider, checkoutProvider,
          languageProvider, _) {
        final isRTL = languageProvider.isArabic;

        return Scaffold(
          backgroundColor: AppTheme.backgroundColor,
          body: SafeArea(
            child: Column(
              children: [
                // Checkout header — same structure as Menu / Cart / Favorites
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
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              isRTL ? 'الدفع' : 'Checkout',
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
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Expanded(
                  child: SingleChildScrollView(
                    physics: const BouncingScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // 1. Delivery Address Section — only for carts that have
                        //    at least one delivery item. Pickup-only carts skip this.
                        if (cartProvider.cartItems.any(
                          (item) => item.fulfillmentMode == 'delivery',
                        )) ...[
                          _buildAddressSection(cartProvider, isRTL),
                          const SizedBox(height: 12),
                        ],

                        // 2. Discount Coupon Section
                        _buildCouponSection(isRTL, checkoutProvider, authProvider),

                        const SizedBox(height: 12),

                        // 3. Payment Method Section
                        _buildPaymentSection(isRTL),

                        const SizedBox(height: 24),

                        // 4. Combined Review & Order Summary Section
                        _buildReviewAndSummarySection(cartProvider, checkoutProvider, isRTL),

                        const SizedBox(height: 32),

                        // Place Order Button
                        _buildPlaceOrderButton(cartProvider, authProvider,
                            checkoutProvider, isRTL),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          bottomNavigationBar: const GlobalBottomNavigation(),
        );
      },
    );
  }

  Widget _buildAddressSection(CartProvider cartProvider, bool isRTL) {
    final addressProvider = Provider.of<AddressProvider>(context);

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  isRTL ? 'عنوان التوصيل' : 'Delivery Address',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.textPrimary,
                  ),
                ),
                TextButton(
                  onPressed: () async {
                    final authProvider =
                        Provider.of<AuthProvider>(context, listen: false);
                    await Navigator.pushNamed(context, '/address-form');
                    // Refresh addresses after adding new one
                    if (mounted && authProvider.token != null) {
                      addressProvider.fetchAddresses(authProvider.token!);
                    }
                  },
                  child: Text(
                    isRTL ? 'إضافة جديد' : 'Add New',
                    style: const TextStyle(
                      fontSize: 14,
                      color: Color(0xFFFF7A00),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            if (addressProvider.addresses.isNotEmpty)
              Column(
                children: [
                  ...addressProvider.addresses
                      .map((address) => RadioListTile<String>(
                            value: address.id,
                            groupValue: _selectedAddressId,
                            onChanged: (value) {
                              setState(() {
                                _selectedAddressId = value;
                                addressProvider.setSelectedAddress(address);
                              });
                            },
                            title: Text(
                              address.label ?? 'Address',
                              style: const TextStyle(
                                  fontSize: 13, color: AppTheme.textPrimary),
                            ),
                            subtitle: Text(
                              address.addressLine1,
                              style: const TextStyle(
                                  fontSize: 11, color: Color(0xFF888888)),
                            ),
                            secondary: const Icon(Icons.location_on,
                                color: Color(0xFF333333)),
                            contentPadding: EdgeInsets.zero,
                            visualDensity: VisualDensity.compact,
                          )),
                  ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    trailing: IconButton(
                      icon: const Icon(Icons.edit,
                          size: 20, color: Color(0xFF333333)),
                      onPressed: _selectedAddressId != null
                          ? () => Navigator.pushNamed(
                                context,
                                '/address-form',
                                arguments: _selectedAddressId,
                              )
                          : null,
                    ),
                  ),
                ],
              )
            else
              ListTile(
                leading: const Icon(Icons.location_off, color: Colors.grey),
                title: Text(isRTL ? 'لا يوجد عنوان' : 'No Address'),
                subtitle: Text(isRTL
                    ? 'يرجى إضافة عنوان التوصيل'
                    : 'Please add a delivery address'),
                trailing: IconButton(
                  icon:
                      const Icon(Icons.add_location, color: Color(0xFF595757)),
                  onPressed: () async {
                    final authProvider =
                        Provider.of<AuthProvider>(context, listen: false);
                    await Navigator.pushNamed(context, '/address-form');
                    if (mounted && authProvider.token != null) {
                      addressProvider.fetchAddresses(authProvider.token!);
                    }
                  },
                ),
              ),
            const Divider(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildCouponSection(bool isRTL, CheckoutProvider checkoutProvider, AuthProvider authProvider) {
    final appliedCoupon = checkoutProvider.session?.appliedCoupon;

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              isRTL ? 'كود الخصم' : 'Promo code',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            if (appliedCoupon != null) ...[
              // Applied coupon — show badge with remove button
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.green.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.green, width: 1),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle, color: Colors.green, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '${isRTL ? 'كوبون مطبق:' : 'Coupon applied:'} ${appliedCoupon.code}',
                        style: const TextStyle(
                          fontSize: 13,
                          color: Colors.green,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    GestureDetector(
                      onTap: checkoutProvider.isLoading
                          ? null
                          : () async {
                              if (authProvider.token != null) {
                                await checkoutProvider.removeCoupon(authProvider.token!);
                                setState(() {
                                  _couponController.clear();
                                  _couponError = null;
                                });
                              }
                            },
                      child: const Icon(Icons.close, size: 18, color: Colors.grey),
                    ),
                  ],
                ),
              ),
            ] else ...[
              // Input row
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    child: SizedBox(
                      height: 40,
                      child: TextField(
                        controller: _couponController,
                        decoration: InputDecoration(
                          hintText: isRTL ? 'أدخل الكوبون' : 'Enter promo code',
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 6),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  SizedBox(
                    height: 40,
                    child: ElevatedButton(
                      onPressed: checkoutProvider.isLoading
                          ? null
                          : () async {
                              final code = _couponController.text.trim();
                              if (code.isEmpty) return;
                              if (authProvider.token == null) return;
                              if (checkoutProvider.session == null) return;
                              setState(() { _couponError = null; });
                              final success = await checkoutProvider.applyCoupon(
                                  code, authProvider.token!);
                              if (!success) {
                                setState(() {
                                  _couponError = checkoutProvider.error ??
                                      (isRTL ? 'كوبون غير صالح' : 'Invalid coupon');
                                });
                              }
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFFF7A00),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: checkoutProvider.isLoading
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white),
                            )
                          : Text(isRTL ? 'تطبيق' : 'Apply'),
                    ),
                  ),
                ],
              ),
              if (_couponError != null) ...[
                const SizedBox(height: 6),
                Text(
                  _couponError!,
                  style: const TextStyle(fontSize: 12, color: Colors.red),
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentSection(bool isRTL) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              isRTL ? 'طريقة الدفع' : 'Payment Method',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            _buildPaymentOption('cash', Icons.money,
                isRTL ? 'الدفع نقداً' : 'Cash on Delivery', true, isRTL),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentOption(
      String id, IconData icon, String label, bool isSelected, bool isRTL) {
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedPaymentMethod = id.toUpperCase();
        });
      },
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? const Color(0xFFFF7A00) : Colors.grey[300]!,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Icon(icon, color: isSelected ? const Color(0xFFFF7A00) : Colors.grey),
            const SizedBox(width: 12),
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                color:
                    isSelected ? AppTheme.textPrimary : AppTheme.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReviewAndSummarySection(CartProvider cartProvider, CheckoutProvider checkoutProvider, bool isRTL) {
    final pricing = checkoutProvider.session?.pricingBreakdown;
    final subtotal = pricing?.subtotal ?? cartProvider.totalPrice;
    final deliveryFee = pricing?.deliveryFee ?? _calculateDeliveryFee(cartProvider);
    final couponDiscount = pricing?.couponDiscount ?? 0.0;
    final autoDiscount = pricing?.autoDiscount ?? 0.0;
    final vatAmount = pricing?.vatAmount ?? 0.0;
    final total = pricing?.total ?? (subtotal + deliveryFee);

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              isRTL ? 'مراجعة الطلب' : 'Review & Order Summary',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 16),
            // Order items
            ...cartProvider.cartItems
                .map((item) => _buildCartItem(item, isRTL))
                .toList(),
            const Divider(height: 24),
            // Totals
            _buildTotalRow(isRTL ? 'المجموع الفرعي' : 'Subtotal',
                _formatCurrency(subtotal, isRTL), isRTL),
            const SizedBox(height: 8),
            _buildTotalRow(isRTL ? 'رسوم التوصيل' : 'Delivery Fee',
                _formatCurrency(deliveryFee, isRTL), isRTL),
            if (couponDiscount > 0) ...[
              const SizedBox(height: 8),
              _buildTotalRow(
                isRTL ? 'خصم الكوبون' : 'Coupon Discount',
                '-${_formatCurrency(couponDiscount, isRTL)}',
                isRTL,
                isDiscount: true,
              ),
            ],
            if (autoDiscount > 0) ...[
              const SizedBox(height: 8),
              _buildTotalRow(
                isRTL ? 'خصم إضافي' : 'Auto Discount',
                '-${_formatCurrency(autoDiscount, isRTL)}',
                isRTL,
                isDiscount: true,
              ),
            ],
            if (vatAmount > 0) ...[
              const SizedBox(height: 8),
              _buildTotalRow(
                isRTL ? 'ضريبة القيمة المضافة' : 'VAT',
                _formatCurrency(vatAmount, isRTL),
                isRTL,
              ),
            ],
            const Divider(height: 24),
            _buildTotalRow(
                isRTL ? 'الإجمالي' : 'Total',
                _formatCurrency(total, isRTL),
                isRTL,
                isTotal: true),
          ],
        ),
      ),
    );
  }

  Widget _buildCartItem(cart.CartItem item, bool isRTL) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              color: Colors.grey[200],
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.fastfood, color: Colors.grey),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isRTL
                      ? (Provider.of<FoodProvider>(context, listen: false).findArabicNameById(item.dishId ?? '') ?? item.foodName)
                      : item.foodName,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${isRTL ? toArabicNumerals('${item.quantity}') : item.quantity}x • ${_formatCurrency(item.price, isRTL)}',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppTheme.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          Text(
            _formatCurrency(item.price * item.quantity, isRTL),
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: AppTheme.textPrimary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTotalRow(String label, String amount, bool isRTL,
      {bool isTotal = false, bool isDiscount = false}) {
    final color = isDiscount ? Colors.green : AppTheme.textPrimary;
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: isTotal ? 18 : 14,
            fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
            color: color,
          ),
        ),
        Text(
          amount,
          style: TextStyle(
            fontSize: isTotal ? 18 : 14,
            fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
            color: color,
          ),
        ),
      ],
    );
  }

  double _calculateDeliveryFee(CartProvider cartProvider) {
    // Group by cook
    final cooks = <String, List<cart.CartItem>>{};
    for (final item in cartProvider.cartItems) {
      if (!cooks.containsKey(item.cookId)) {
        cooks[item.cookId] = [];
      }
      cooks[item.cookId]!.add(item);
    }

    // Sum max delivery fee per cook
    double total = 0;
    for (final entry in cooks.entries) {
      final maxFee = entry.value.fold<double>(
          0, (max, item) => item.deliveryFee > max ? item.deliveryFee : max);
      total += maxFee;
    }

    return total;
  }

  Widget _buildPlaceOrderButton(
    CartProvider cartProvider,
    AuthProvider authProvider,
    CheckoutProvider checkoutProvider,
    bool isRTL,
  ) {
    // Demo/reviewer accounts bypass the OTP gate entirely.
    // isDemoAccount mirrors the server-side login bypass and is not
    // affected by whatever isPhoneVerified value is cached locally.
    final hasVerifiedPhone =
        authProvider.user?.isPhoneVerified == true || authProvider.isDemoAccount;

    // If user has no verified phone, show the verification block before the button
    if (!hasVerifiedPhone) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          PhoneVerificationWidget(
            titleOverride: isRTL
                ? 'يرجى تأكيد رقم هاتفك لإتمام الطلب'
                : 'Verify your phone number to place the order',
            onVerified: () => setState(() {}), // rebuild — hasVerifiedPhone will now be true
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 56,
            child: ElevatedButton(
              onPressed: null, // disabled until verified
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFD1D5DB),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: Text(
                isRTL ? 'تأكيد الطلب' : 'Place Order',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
              ),
            ),
          ),
        ],
      );
    }

    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        onPressed: _isProcessing || cartProvider.cartItems.isEmpty
            ? null
            : () =>
                _handlePlaceOrder(cartProvider, authProvider, checkoutProvider),
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFFFF7A00),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        child: _isProcessing
            ? const SizedBox(
                height: 24,
                width: 24,
                child: CircularProgressIndicator(
                    strokeWidth: 2, color: Colors.white),
              )
            : Text(
                isRTL ? 'تأكيد الطلب' : 'Place Order',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
      ),
    );
  }

  Future<void> _handlePlaceOrder(
    CartProvider cartProvider,
    AuthProvider authProvider,
    CheckoutProvider checkoutProvider,
  ) async {
    setState(() => _isProcessing = true);

    try {
      // STOCK VALIDATION: Check if any cart items are out of stock
      final outOfStockItems = <String>[];
      for (final item in cartProvider.cartItems) {
        if (item.quantity <= 0) {
          outOfStockItems.add(item.foodName);
        }
      }
      
      if (outOfStockItems.isNotEmpty) {
        throw Exception('Some items are out of stock. Remove them to continue.');
      }
      
      // Only require an address when the cart has at least one delivery item.
      // RACE FIX: _selectedAddressId is set inside fetchAddresses().then() in
      // initState — if the user taps Place Order before that callback runs,
      // _selectedAddressId is still null. Fall back to addressProvider's
      // selectedAddress (populated by fetchAddresses itself, earlier in the
      // same future chain) so the first tap doesn't fail with a stale guard.
      final addressProvider =
          Provider.of<AddressProvider>(context, listen: false);
      final resolvedAddressId =
          _selectedAddressId ?? addressProvider.selectedAddress?.id;

      final hasDelivery = cartProvider.cartItems
          .any((item) => item.fulfillmentMode == 'delivery');
      if (hasDelivery && (resolvedAddressId == null || resolvedAddressId.isEmpty)) {
        throw Exception('Please select a delivery address');
      }

      // Build cart items payload
      final cartItems = <Map<String, dynamic>>[];
      for (final item in cartProvider.cartItems) {
        // Derive fulfillmentMode from both cached value AND delivery fee.
        // The cached fulfillmentMode may be stale ('delivery') from a previous
        // default-value bug — cross-check with deliveryFee:
        //   - delivery item   → fulfillmentMode == 'delivery' AND deliveryFee > 0
        //   - pickup item     → everything else (including stale 'delivery' + fee 0)
        final resolvedMode = (item.fulfillmentMode == 'delivery' && item.deliveryFee > 0)
            ? 'delivery'
            : 'pickup';
        print('🛒 [CHECKOUT-ITEM] foodId=${item.foodId}, portionKey=${item.portionKey}, quantity=${item.quantity}, cachedMode=${item.fulfillmentMode}, deliveryFee=${item.deliveryFee}, resolvedMode=$resolvedMode');
        cartItems.add({
          'dishId': item.dishId, // AdminDish ID (for reference)
          'dishOffer': item.foodId, // CRITICAL: DishOffer._id (for stock validation)
          'offerId': item.foodId, // CRITICAL: Also send as offerId for backend compatibility
          'dishName': item.foodName,
          'cookId': item.cookId,
          'quantity': item.quantity,
          'unitPrice': item.price,
          'notes': '',
          'fulfillmentMode': resolvedMode,
          'deliveryFee': item.deliveryFee,
          'portionKey': item.portionKey, // CRITICAL: Must send portionKey for variant stock validation
          'photoUrl': item.photoUrl,
          'prepReadyConfig': null, // Will be computed by backend
          'prepTimeMinutes': item.prepTime,
        });
      }

      print('🛒 [CHECKOUT-PAYLOAD] Sending ${cartItems.length} items to createSession');
      cartItems.asMap().forEach((idx, item) {
        print('🛒 [CHECKOUT-PAYLOAD] Item $idx: dishId=${item['dishId']}, portionKey=${item['portionKey']}, fulfillmentMode=${item['fulfillmentMode']}, deliveryFee=${item['deliveryFee']}');
      });

      // Create session first
      final token = authProvider.token ?? '';
      final success = await checkoutProvider.createSession(cartItems, token);

      if (!success) {
        throw Exception(checkoutProvider.error ?? 'Could not start checkout. Please try again.');
      }

      // Then set the selected address on the session (delivery orders only)
      // Backend resolves all address data from DB using addressId — never send flat fields.
      if (hasDelivery && resolvedAddressId != null && checkoutProvider.session != null) {
        // Guard: empty-string addressId would cause backend 400 ADDRESS_ID_REQUIRED.
        if (resolvedAddressId.isEmpty) {
          throw Exception('Invalid address selected. Please re-select your delivery address.');
        }

        final addressUpdated = await checkoutProvider.updateAddress(
          resolvedAddressId,
          token,
        );

        if (!addressUpdated) {
          // Propagate exact backend message (e.g. INVALID_LOCATION) so the user
          // knows what to fix (e.g. "select a location on the map").
          final errMsg = checkoutProvider.error ?? 'Could not set your delivery address. Please try again.';
          throw Exception(errMsg);
        }
      }

      if (!success) {
        throw Exception(checkoutProvider.error ?? 'Could not start checkout. Please try again.');
      }

      // Confirm order
      final orderId = await checkoutProvider.confirmOrder(token);

      if (orderId == null) {
        final errorMsg = checkoutProvider.error ?? 'Could not place your order. Please try again.';
        print('❌ [CHECKOUT ERROR] Order confirmation failed: $errorMsg');
        throw Exception(errorMsg);
      }

      // Clear cart after successful order
      await cartProvider.clearCart();

      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => OrderSuccessScreen(orderId: orderId),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              e.toString().replaceAll('Exception: ', ''),
              style: const TextStyle(color: Colors.white),
            ),
            backgroundColor: const Color(0xFFDC2626),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isProcessing = false);
      }
    }
  }

  String _formatCurrency(double amount, bool isRTL) {
    final numStr = isRTL
        ? toArabicNumerals(amount.toStringAsFixed(2))
        : amount.toStringAsFixed(2);
    return isRTL
        ? '$numStr ${context.read<CountryProvider>().getLocalizedCurrency(true)}'
        : '${context.read<CountryProvider>().getLocalizedCurrency(false)} $numStr';
  }
}
