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
                          isRTL ? Icons.arrow_forward : Icons.arrow_back,
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
                        _buildCouponSection(isRTL),

                        const SizedBox(height: 12),

                        // 3. Payment Method Section
                        _buildPaymentSection(isRTL),

                        const SizedBox(height: 24),

                        // 4. Combined Review & Order Summary Section
                        _buildReviewAndSummarySection(cartProvider, isRTL),

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
                      color: Color(0xFF595757),
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

  Widget _buildCouponSection(bool isRTL) {
    final couponController = TextEditingController();

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
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(
                  child: SizedBox(
                    height: 40,
                    child: TextField(
                      controller: couponController,
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
                    onPressed: () {
                      // TODO: Apply coupon logic
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFFF7A00),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: Text(isRTL ? 'تطبيق' : 'Apply'),
                  ),
                ),
              ],
            ),
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
            const SizedBox(height: 8),
            _buildPaymentOption('card', Icons.credit_card,
                isRTL ? 'بطاقة ائتمان' : 'Credit Card', false, isRTL),
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

  Widget _buildReviewAndSummarySection(CartProvider cartProvider, bool isRTL) {
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
                _formatCurrency(cartProvider.totalPrice), isRTL),
            const SizedBox(height: 8),
            _buildTotalRow(isRTL ? 'رسوم التوصيل' : 'Delivery Fee',
                _formatCurrency(_calculateDeliveryFee(cartProvider)), isRTL),
            const Divider(height: 24),
            _buildTotalRow(
                isRTL ? 'الإجمالي' : 'Total',
                _formatCurrency(cartProvider.totalPrice +
                    _calculateDeliveryFee(cartProvider)),
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
                  item.foodName,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${item.quantity}x • ${_formatCurrency(item.price)}',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppTheme.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          Text(
            _formatCurrency(item.price * item.quantity),
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
      {bool isTotal = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: isTotal ? 18 : 14,
            fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
            color: AppTheme.textPrimary,
          ),
        ),
        Text(
          amount,
          style: TextStyle(
            fontSize: isTotal ? 18 : 14,
            fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
            color: AppTheme.textPrimary,
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
      final hasDelivery = cartProvider.cartItems
          .any((item) => item.fulfillmentMode == 'delivery');
      if (hasDelivery && _selectedAddressId == null) {
        throw Exception('Please select a delivery address');
      }

      // Build cart items payload
      final cartItems = <Map<String, dynamic>>[];
      for (final item in cartProvider.cartItems) {
        print('🛒 [CHECKOUT-ITEM] foodId=${item.foodId}, portionKey=${item.portionKey}, quantity=${item.quantity}');
        cartItems.add({
          'dishId': item.dishId, // AdminDish ID (for reference)
          'dishOffer': item.foodId, // CRITICAL: DishOffer._id (for stock validation)
          'offerId': item.foodId, // CRITICAL: Also send as offerId for backend compatibility
          'dishName': item.foodName,
          'cookId': item.cookId,
          'quantity': item.quantity,
          'unitPrice': item.price,
          'notes': '',
          'fulfillmentMode': item.fulfillmentMode ?? 'pickup',
          'deliveryFee': item.deliveryFee,
          'portionKey': item.portionKey, // CRITICAL: Must send portionKey for variant stock validation
          'photoUrl': item.photoUrl,
          'prepReadyConfig': null, // Will be computed by backend
          'prepTimeMinutes': item.prepTime,
        });
      }
      
      print('🛒 [CHECKOUT-PAYLOAD] Sending ${cartItems.length} items to createSession');
      cartItems.asMap().forEach((idx, item) {
        print('🛒 [CHECKOUT-PAYLOAD] Item $idx: dishId=${item['dishId']}, portionKey=${item['portionKey']}');
      });

      // Create session first
      final token = authProvider.token ?? '';
      final success = await checkoutProvider.createSession(cartItems, token);

      if (!success) {
        throw Exception(checkoutProvider.error ?? 'Failed to create session');
      }

      // Then set the selected address on the session (delivery orders only)
      if (hasDelivery && _selectedAddressId != null && checkoutProvider.session != null) {
        // Get fresh provider reference
        final freshAddressProvider =
            Provider.of<AddressProvider>(context, listen: false);
        final address = freshAddressProvider.addresses.firstWhere(
          (a) => a.id == _selectedAddressId,
          orElse: () => freshAddressProvider.addresses.first,
        );

        final addressUpdated = await checkoutProvider.updateAddress(
          address.addressLine1,
          address.city,
          address.countryCode,
          address.deliveryNotes ?? '',
          token,
          lat: address.lat,
          lng: address.lng,
        );

        if (!addressUpdated) {
          throw Exception('Failed to set delivery address');
        }
      }

      if (!success) {
        throw Exception(checkoutProvider.error ?? 'Failed to create session');
      }

      // Confirm order
      final orderId = await checkoutProvider.confirmOrder(token);

      if (orderId == null) {
        final errorMsg = checkoutProvider.error ?? 'Failed to confirm order';
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
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isProcessing = false);
      }
    }
  }

  String _formatCurrency(double amount) {
    return 'SAR ${amount.toStringAsFixed(2)}';
  }
}
