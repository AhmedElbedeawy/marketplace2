import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/language_provider.dart';
import '../../providers/cart_provider.dart';
import '../../providers/navigation_provider.dart';
import '../../providers/country_provider.dart';
import '../../models/cart.dart';
import '../../widgets/global_bottom_navigation.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({Key? key}) : super(key: key);

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  @override
  void initState() {
    super.initState();
    // Set cart as active tab AND origin
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final navigationProvider = Provider.of<NavigationProvider>(context, listen: false);
      navigationProvider.setActiveTab(NavigationTab.cart, setAsOrigin: true);
    });
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;
    
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: SafeArea(
        child: Column(
          children: [
            // Cart title matching Home page position
            Padding(
              padding: const EdgeInsets.only(top: 50, left: 20, right: 4),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          isRTL ? 'السلة' : 'Cart',
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
              child: _buildCartContent(isRTL),
            ),
          ],
        ),
      ),
      bottomNavigationBar: const GlobalBottomNavigation(),
    );
  }

  Widget _buildCartContent(bool isRTL) {
    return Consumer<CartProvider>(
      builder: (context, cartProvider, _) {
        if (cartProvider.carts.isEmpty) {
          return _buildEmptyCart(isRTL);
        }

        return Column(
          children: [
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.all(20),
                itemCount: cartProvider.carts.length,
                itemBuilder: (context, index) {
                  final cookId = cartProvider.carts.keys.elementAt(index);
                  final items = cartProvider.carts[cookId]!;
                  return _buildCookCart(cookId, items, isRTL, cartProvider);
                },
              ),
            ),
            _buildSummary(isRTL, cartProvider),
          ],
        );
      },
    );
  }

  Widget _buildEmptyCart(bool isRTL) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.shopping_cart_outlined,
            size: 100,
            color: AppTheme.textSecondary,
          ),
          const SizedBox(height: 16),
          Text(
            isRTL ? 'السلة فارغة' : 'Your cart is empty',
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w600,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            isRTL ? 'أضف بعض الأطباق اللذيذة!' : 'Add some delicious dishes!',
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w400,
              color: AppTheme.textSecondary,
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.accentColor,
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
            child: Text(
              isRTL ? 'تصفح الأطباق' : 'Browse Dishes',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Color(0xFF595757),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCookCart(String cookId, List<CartItem> items, bool isRTL, CartProvider cartProvider) {
    if (items.isEmpty) return const SizedBox.shrink();

    final cookName = items.first.cookName;
    double cookTotal = 0;
    for (final item in items) {
      cookTotal += item.subtotal;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
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
          // Cook header
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              color: AppTheme.backgroundColor,
              borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
            ),
            child: Row(
              children: [
                const Icon(Icons.restaurant, size: 20, color: AppTheme.textPrimary),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    cookName,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                ),
                Text(
                  isRTL 
                    ? '${cookTotal.toStringAsFixed(0)} ${context.watch<CountryProvider>().getLocalizedCurrency(true)}' 
                    : '${context.watch<CountryProvider>().getLocalizedCurrency(false)} ${cookTotal.toStringAsFixed(0)}',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary,
                  ),
                ),
              ],
            ),
          ),
          // Items
          ...items.map((item) => _buildCartItem(item, isRTL, cartProvider, cookId)),
        ],
      ),
    );
  }

  Widget _buildCartItem(CartItem item, bool isRTL, CartProvider cartProvider, String cookId) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        border: Border(
          top: BorderSide(color: AppTheme.dividerColor, width: 1),
        ),
      ),
      child: Row(
        children: [
          // Dish image placeholder
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              color: AppTheme.dividerColor,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.restaurant_menu, color: AppTheme.textSecondary),
          ),
          const SizedBox(width: 12),
          // Dish info
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
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  isRTL 
                    ? '${item.price.toStringAsFixed(0)} ${context.watch<CountryProvider>().getLocalizedCurrency(true)}' 
                    : '${context.watch<CountryProvider>().getLocalizedCurrency(false)} ${item.price.toStringAsFixed(0)}',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          // Quantity controls
          _buildQuantityControl(item, isRTL, cartProvider, cookId),
        ],
      ),
    );
  }

  Widget _buildQuantityControl(CartItem item, bool isRTL, CartProvider cartProvider, String cookId) {
    return Row(
      children: [
        // Decrease
        GestureDetector(
          onTap: () {
            if (item.quantity > 1) {
              cartProvider.updateQuantity(cookId, item.foodId, item.quantity - 1);
            } else {
              cartProvider.removeFromCart(cookId, item.foodId);
            }
          },
          child: Container(
            width: 32,
            height: 32,
            decoration: const BoxDecoration(
              color: AppTheme.accentColor,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.remove, size: 18, color: Color(0xFF595757)),
          ),
        ),
        const SizedBox(width: 12),
        // Quantity
        Text(
          '${item.quantity}',
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: AppTheme.textPrimary,
          ),
        ),
        const SizedBox(width: 12),
        // Increase
        GestureDetector(
          onTap: () {
            cartProvider.updateQuantity(cookId, item.foodId, item.quantity + 1);
          },
          child: Container(
            width: 32,
            height: 32,
            decoration: const BoxDecoration(
              color: AppTheme.accentColor,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.add, size: 18, color: Color(0xFF595757)),
          ),
        ),
      ],
    );
  }

  Widget _buildSummary(bool isRTL, CartProvider cartProvider) {
    final subtotal = cartProvider.totalPrice;
    const deliveryFee = 10.0;
    final total = subtotal + deliveryFee;

    return Container(
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
          children: [
            _buildSummaryRow(
              isRTL ? 'المجموع الفرعي' : 'Subtotal',
              subtotal,
              isRTL,
            ),
            const SizedBox(height: 8),
            _buildSummaryRow(
              isRTL ? 'رسوم التوصيل' : 'Delivery Fee',
              deliveryFee,
              isRTL,
            ),
            const Divider(height: 24, thickness: 1),
            _buildSummaryRow(
              isRTL ? 'الإجمالي' : 'Total',
              total,
              isRTL,
              isBold: true,
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pushNamed(context, '/checkout');
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF595757),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: Text(
                  isRTL ? 'إتمام الطلب' : 'Proceed to Checkout',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryRow(String label, double amount, bool isRTL, {bool isBold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: isBold ? 16 : 14,
            fontWeight: isBold ? FontWeight.w700 : FontWeight.w600,
            color: AppTheme.textPrimary,
          ),
        ),
        Text(
          isRTL 
            ? '${amount.toStringAsFixed(2)} ${context.watch<CountryProvider>().getLocalizedCurrency(true)}' 
            : '${context.watch<CountryProvider>().getLocalizedCurrency(false)} ${amount.toStringAsFixed(2)}',
          style: TextStyle(
            fontSize: isBold ? 16 : 14,
            fontWeight: isBold ? FontWeight.w700 : FontWeight.w600,
            color: AppTheme.textPrimary,
          ),
        ),
      ],
    );
  }

}

