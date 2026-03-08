import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/cart_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/checkout_provider.dart';
import '../../providers/language_provider.dart';
import '../../models/cart.dart' as cart;
import '../../widgets/global_bottom_navigation.dart';

/// Single-page checkout screen matching web behavior
/// - All sections in one scrollable page
/// - Fulfillment selection per cook
/// - Delivery fee calculation based on fulfillment type
/// - Combine delivery toggle when applicable
class SinglePageCheckoutScreen extends StatefulWidget {
  const SinglePageCheckoutScreen({Key? key}) : super(key: key);

  @override
  State<SinglePageCheckoutScreen> createState() => _SinglePageCheckoutScreenState();
}

class _SinglePageCheckoutScreenState extends State<SinglePageCheckoutScreen> {
  bool _isProcessing = false;
  
  // Track fulfillment preferences per cook (defaults to pickup)
  final Map<String, String> _cookFulfillmentPreferences = {};

  @override
  Widget build(BuildContext context) {
    return Consumer4<CartProvider, AuthProvider, CheckoutProvider, LanguageProvider>(
      builder: (context, cartProvider, authProvider, checkoutProvider, languageProvider, _) {
        final isRTL = languageProvider.isArabic;
        
        return Scaffold(
          appBar: AppBar(
            title: Text(isRTL ? 'الدفع' : 'Checkout'),
            backgroundColor: AppTheme.accentColor,
            elevation: 0,
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Order Summary Section
                _buildOrderSummary(cartProvider, isRTL),
                
                const SizedBox(height: 24),
                
                // Fulfillment Selection Section
                _buildFulfillmentSection(cartProvider, isRTL),
                
                const SizedBox(height: 24),
                
                // Delivery Address Section
                _buildAddressSection(isRTL),
                
                const SizedBox(height: 24),
                
                // Coupon Section (if available)
                // TODO: Implement coupon section
                
                const SizedBox(height: 24),
                
                // Payment Method Section
                _buildPaymentSection(isRTL),
                
                const SizedBox(height: 24),
                
                // Order Totals Section
                _buildTotalsSection(cartProvider, isRTL),
                
                const SizedBox(height: 32),
                
                // Place Order Button
                _buildPlaceOrderButton(cartProvider, authProvider, checkoutProvider, isRTL),
              ],
            ),
          ),
          bottomNavigationBar: const GlobalBottomNavigation(),
        );
      },
    );
  }

  Widget _buildOrderSummary(CartProvider cartProvider, bool isRTL) {
    // Debug logs for verification
    debugPrint('🛒 [CHECKOUT-ITEMS] Cart has ${cartProvider.cartItems.length} items:');
    for (var i = 0; i < cartProvider.cartItems.length; i++) {
      final item = cartProvider.cartItems[i];
      debugPrint('🛒 [CHECKOUT-ITEMS]   Item $i: foodId=${item.foodId}, cookId=${item.cookId}, fulfillment=${item.fulfillmentMode ?? 'pickup'}, prepTime=${item.prepTime}min, deliveryFee=${item.deliveryFee}');
    }
    
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              isRTL ? 'ملخص الطلب' : 'Order Summary',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            ...cartProvider.cartItems.map((item) => _buildCartItem(item, isRTL)).toList(),
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
          // Item image placeholder
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
        ],
      ),
    );
  }

  Widget _buildFulfillmentSection(CartProvider cartProvider, bool isRTL) {
    // Group items by cook
    final Map<String, List<cart.CartItem>> itemsByCook = {};
    for (final item in cartProvider.cartItems) {
      if (!itemsByCook.containsKey(item.cookId)) {
        itemsByCook[item.cookId] = [];
      }
      itemsByCook[item.cookId]!.add(item);
    }

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              isRTL ? 'طريقة الاستلام' : 'Fulfillment',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            ...itemsByCook.entries.map((entry) => 
              _buildCookFulfillmentCard(entry.key, entry.value, isRTL)
            ).toList(),
          ],
        ),
      ),
    );
  }

  Widget _buildCookFulfillmentCard(String cookId, List<cart.CartItem> items, bool isRTL) {
    final currentPreference = _cookFulfillmentPreferences[cookId] ?? 'pickup';
    
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            items.first.cookName,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildFulfillmentOption(
                  'pickup',
                  Icons.storefront,
                  isRTL ? 'استلام' : 'Pickup',
                  currentPreference == 'pickup',
                  () {
                    setState(() {
                      _cookFulfillmentPreferences[cookId] = 'pickup';
                    });
                  },
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _buildFulfillmentOption(
                  'delivery',
                  Icons.delivery_dining,
                  isRTL ? 'توصيل' : 'Delivery',
                  currentPreference == 'delivery',
                  () {
                    setState(() {
                      _cookFulfillmentPreferences[cookId] = 'delivery';
                    });
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFulfillmentOption(
    String value,
    IconData icon,
    String label,
    bool isSelected,
    VoidCallback onTap,
  ) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.accentColor.withOpacity(0.2) : Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? AppTheme.accentColor : Colors.grey[300]!,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Column(
          children: [
            Icon(icon, color: isSelected ? AppTheme.accentColor : Colors.grey),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                color: isSelected ? AppTheme.accentColor : Colors.grey[700],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAddressSection(bool isRTL) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              isRTL ? 'عنوان التوصيل' : 'Delivery Address',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            ListTile(
              leading: const Icon(Icons.location_on, color: AppTheme.accentColor),
              title: Text(isRTL ? 'اختر عنواناً' : 'Select Address'),
              subtitle: Text(isRTL ? 'لم يتم اختيار عنوان بعد' : 'No address selected yet'),
              trailing: Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey[400]),
              onTap: () {
                // TODO: Navigate to address picker
              },
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
            _buildPaymentOption('cash', Icons.money, isRTL ? 'الدفع نقداً' : 'Cash on Delivery', true, isRTL),
            const SizedBox(height: 8),
            _buildPaymentOption('card', Icons.credit_card, isRTL ? 'بطاقة ائتمان' : 'Credit Card', false, isRTL),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentOption(String id, IconData icon, String label, bool isSelected, bool isRTL) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isSelected ? Colors.orange[50] : Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isSelected ? AppTheme.accentColor : Colors.grey[300]!,
          width: isSelected ? 2 : 1,
        ),
      ),
      child: Row(
        children: [
          Icon(icon, color: isSelected ? AppTheme.accentColor : Colors.grey[600]),
          const SizedBox(width: 12),
          Text(
            label,
            style: TextStyle(
              fontSize: 14,
              fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
              color: isSelected ? AppTheme.accentColor : Colors.grey[800],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTotalsSection(CartProvider cartProvider, bool isRTL) {
    final subtotal = cartProvider.totalPrice;
    
    // Calculate delivery fee based on fulfillment preferences
    double deliveryFee = 0;
    final hasAnyDelivery = _cookFulfillmentPreferences.values.any((pref) => pref == 'delivery');
    
    if (hasAnyDelivery) {
      // Sum max delivery fee per cook with delivery
      final cooks = <String, List<cart.CartItem>>{};
      for (final item in cartProvider.cartItems) {
        if (!cooks.containsKey(item.cookId)) {
          cooks[item.cookId] = [];
        }
        cooks[item.cookId]!.add(item);
      }
      
      for (final entry in cooks.entries) {
        if (_cookFulfillmentPreferences[entry.key] == 'delivery') {
          final maxFee = entry.value.fold<double>(0, (max, item) => 
            item.deliveryFee > max ? item.deliveryFee : max
          );
          deliveryFee += maxFee;
        }
      }
    }
    
    final total = subtotal + deliveryFee;

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            _buildTotalRow(isRTL ? 'المجموع الفرعي' : 'Subtotal', _formatCurrency(subtotal), isRTL),
            const SizedBox(height: 8),
            _buildTotalRow(isRTL ? 'رسوم التوصيل' : 'Delivery Fee', _formatCurrency(deliveryFee), isRTL),
            const Divider(height: 24, thickness: 1),
            _buildTotalRow(isRTL ? 'الإجمالي' : 'Total', _formatCurrency(total), isRTL, isTotal: true),
          ],
        ),
      ),
    );
  }

  Widget _buildTotalRow(String label, String amount, bool isRTL, {bool isTotal = false}) {
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
            : () => _handlePlaceOrder(cartProvider, authProvider, checkoutProvider),
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.accentColor,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        child: _isProcessing
            ? const SizedBox(
                height: 24,
                width: 24,
                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
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
      // TODO: Create session and confirm order
      // This will be implemented next
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Order placement not yet implemented')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
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
