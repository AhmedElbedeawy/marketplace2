import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../models/food.dart';
import '../../providers/auth_provider.dart';
import '../../providers/food_provider.dart';
import '../../providers/cart_provider.dart';
import '../../providers/language_provider.dart';
import '../../providers/country_provider.dart';
import '../../config/theme.dart';

class DishDetailScreen extends StatefulWidget {
  final String dishId;

  const DishDetailScreen({
    Key? key,
    required this.dishId,
  }) : super(key: key);

  @override
  State<DishDetailScreen> createState() => _DishDetailScreenState();
}

class _DishDetailScreenState extends State<DishDetailScreen> {
  final PageController _cookPageController = PageController();
  int _currentCookIndex = 0;
  int _quantity = 1;
  bool _isLoading = true;
  Food? _dishData;
  List<DishCookVariant> _cookVariants = [];

  @override
  void initState() {
    super.initState();
    _loadDishData();
  }

  @override
  void dispose() {
    _cookPageController.dispose();
    super.dispose();
  }

  Future<void> _loadDishData() async {
    setState(() => _isLoading = true);
    
    try {
      final foodProvider = context.read<FoodProvider>();
      final authProvider = context.read<AuthProvider>();
      // Load dish details with all cooks offering this dish
      await foodProvider.fetchDishDetails(widget.dishId, authProvider.getAuthHeaders());
      
      setState(() {
        _dishData = foodProvider.currentDish;
        _cookVariants = foodProvider.dishCookVariants;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  void _decrementQuantity() {
    if (_quantity > 1) {
      setState(() => _quantity--);
    }
  }

  void _incrementQuantity() {
    setState(() => _quantity++);
  }

  Future<void> _toggleFavorite() async {
    if (_dishData == null || _cookVariants.isEmpty) return;
    
    // Toggle favorite for this dish
    await context.read<FoodProvider>().toggleFavorite(
      widget.dishId,
    );
    
    setState(() {});
  }

  Future<void> _addToCart() async {
    if (_dishData == null || _cookVariants.isEmpty || _quantity < 1) return;
    
    final currentVariant = _cookVariants[_currentCookIndex];
    final cartProvider = context.read<CartProvider>();
    
    await cartProvider.addToCart(
      foodId: widget.dishId,
      foodName: _dishData!.name,
      price: currentVariant.price,
      cookId: currentVariant.cookId,
      cookName: currentVariant.cookName,
    );
    
    // Reset quantity after adding to cart
    if (mounted) {
      setState(() {
        _quantity = 1;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Added to cart'),
          duration: Duration(seconds: 2),
          backgroundColor: AppTheme.accentColor,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isRTL = context.watch<LanguageProvider>().isArabic;
    
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: AppTheme.backgroundColor,
        body: Center(
          child: CircularProgressIndicator(color: AppTheme.accentColor),
        ),
      );
    }
    
    if (_dishData == null || _cookVariants.isEmpty) {
      return Scaffold(
        backgroundColor: AppTheme.backgroundColor,
        appBar: AppBar(
          backgroundColor: AppTheme.backgroundColor,
          elevation: 0,
          leading: IconButton(
            icon: Icon(
              isRTL ? Icons.arrow_forward : Icons.arrow_back,
              color: AppTheme.textPrimary,
            ),
            onPressed: () => Navigator.pop(context),
          ),
        ),
        body: Center(
          child: Text(
            isRTL ? 'الطبق غير متاح' : 'Dish unavailable',
            style: const TextStyle(
              fontSize: 16,
              color: AppTheme.textSecondary,
            ),
          ),
        ),
      );
    }
    
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: SafeArea(
        child: PageView.builder(
          controller: _cookPageController,
          onPageChanged: (index) {
            setState(() {
              _currentCookIndex = index;
              _quantity = 1; // Reset quantity when switching cooks
            });
          },
          itemCount: _cookVariants.length,
          itemBuilder: (context, index) {
            return _buildDishDetailPage(_cookVariants[index], isRTL);
          },
        ),
      ),
    );
  }

  Widget _buildDishDetailPage(DishCookVariant variant, bool isRTL) {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with back button, dish name, and cook name
          _buildHeader(variant, isRTL),
          
          // Photo slider with progress indicators
          _buildPhotoSlider(variant, isRTL),
          
          // Info boxes (time, serving, price, calories)
          _buildInfoBoxes(variant, isRTL),
          
          const SizedBox(height: 24),
          
          // Dish title and rating
          _buildTitleAndRating(isRTL),
          
          const SizedBox(height: 16),
          
          // Description
          _buildDescription(isRTL),
          
          const SizedBox(height: 16),
          
          // Ingredients
          _buildIngredients(isRTL),
          
          const SizedBox(height: 24),
          
          // Quantity selector
          _buildQuantitySelector(isRTL),
          
          const SizedBox(height: 16),
          
          // Add to cart button
          _buildAddToCartButton(isRTL),
          
          const SizedBox(height: 100), // Bottom padding for nav bar
        ],
      ),
    );
  }

  Widget _buildHeader(DishCookVariant variant, bool isRTL) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
      child: Row(
        children: [
          // Back button
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
            ),
            child: IconButton(
              icon: Icon(
                isRTL ? Icons.arrow_forward : Icons.arrow_back,
                color: AppTheme.textPrimary,
                size: 20,
              ),
              onPressed: () => Navigator.pop(context),
              padding: EdgeInsets.zero,
            ),
          ),
          
          const SizedBox(width: 12),
          
          // Dish name and cook name
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _dishData?.name ?? '',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                GestureDetector(
                  onTap: () {
                    // Navigate to cook profile with cook ID
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('${isRTL ? 'جاري فتح ملف الطاهي' : 'Opening cook profile'}: ${variant.cookName}'),
                        duration: const Duration(seconds: 1),
                      ),
                    );
                    // TODO: Navigate to CookProfileScreen with cook ID when available
                  },
                  child: Text(
                    variant.cookName,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFFFF4444), // Red color for cook name
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPhotoSlider(DishCookVariant variant, bool isRTL) {
    final images = variant.images.isNotEmpty ? variant.images : [_dishData?.image ?? ''];
    
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: [
          // Progress indicators
          Row(
            children: List.generate(
              images.length,
              (index) => Expanded(
                child: Container(
                  height: 3,
                  margin: EdgeInsets.only(
                    right: index < images.length - 1 ? 8 : 0,
                  ),
                  decoration: BoxDecoration(
                    color: index == 0 ? AppTheme.textPrimary : const Color(0xFFE0E0E0),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Main image with heart icon
          Stack(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: _buildImage(images[0], 280),
              ),
              
              // Heart icon (favorite toggle)
              Positioned(
                top: 16,
                right: 16,
                child: GestureDetector(
                  onTap: _toggleFavorite,
                  child: Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.9),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      _dishData?.isFavorite ?? false ? Icons.favorite : Icons.favorite_border,
                      color: _dishData?.isFavorite ?? false ? Colors.red : AppTheme.textSecondary,
                      size: 24,
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

  Widget _buildImage(String imageUrl, double height) {
    final bool isAsset = imageUrl.startsWith('assets/');
    
    if (isAsset) {
      return Image.asset(
        imageUrl,
        width: double.infinity,
        height: height,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => Container(
          width: double.infinity,
          height: height,
          color: const Color(0xFFD0D0D0),
          child: const Icon(Icons.restaurant, size: 60, color: AppTheme.textSecondary),
        ),
      );
    }
    
    return CachedNetworkImage(
      imageUrl: imageUrl,
      width: double.infinity,
      height: height,
      fit: BoxFit.cover,
      errorWidget: (_, __, ___) => Container(
        width: double.infinity,
        height: height,
        color: const Color(0xFFD0D0D0),
        child: const Icon(Icons.restaurant, size: 60, color: AppTheme.textSecondary),
      ),
    );
  }

  Widget _buildInfoBoxes(DishCookVariant variant, bool isRTL) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
      child: Row(
        children: [
          _buildInfoBox(
            icon: Icons.access_time,
            label: '${_dishData?.prepTime ?? 60} Mins',
            isRTL: isRTL,
          ),
          const SizedBox(width: 12),
          _buildInfoBox(
            icon: Icons.restaurant,
            label: '${_dishData?.servingSize ?? '1-4'} Serving',
            isRTL: isRTL,
          ),
          const SizedBox(width: 12),
          _buildInfoBox(
            icon: Icons.attach_money,
            label: '${context.watch<CountryProvider>().currencyCode} ${variant.price.toStringAsFixed(2)}',
            isRTL: isRTL,
            isPrice: true,
          ),
          const SizedBox(width: 12),
          _buildInfoBox(
            icon: Icons.local_fire_department,
            label: '${_dishData?.calories ?? 160} Kcal',
            isRTL: isRTL,
          ),
        ],
      ),
    );
  }

  Widget _buildInfoBox({
    required IconData icon,
    required String label,
    required bool isRTL,
    bool isPrice = false,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: isPrice ? const Color(0xFF1B5E20) : const Color(0xFFE0E0E0),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          children: [
            Icon(
              icon,
              size: 24,
              color: isPrice ? Colors.white : AppTheme.textSecondary,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: isPrice ? Colors.white : AppTheme.textPrimary,
              ),
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTitleAndRating(bool isRTL) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _dishData?.name ?? '',
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w700,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.star, color: Color(0xFFFCD535), size: 20),
              const SizedBox(width: 4),
              Text(
                '${_dishData?.rating.toStringAsFixed(1) ?? '4.9'} | ${_cookVariants.length} ${isRTL ? 'طهاة' : 'Cooks'}',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textSecondary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDescription(bool isRTL) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Text(
        _dishData?.description ?? 'Delicious dish prepared with care.',
        style: const TextStyle(
          fontSize: 14,
          height: 1.5,
          color: AppTheme.textSecondary,
        ),
      ),
    );
  }

  Widget _buildIngredients(bool isRTL) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Text(
        '${isRTL ? 'المكونات' : 'Ingredients'}: ${_dishData?.ingredients ?? 'Fresh ingredients'}',
        style: const TextStyle(
          fontSize: 14,
          height: 1.5,
          color: AppTheme.textSecondary,
        ),
      ),
    );
  }

  Widget _buildQuantitySelector(bool isRTL) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 80),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Minus button
          GestureDetector(
            onTap: _decrementQuantity,
            child: Container(
              width: 56,
              height: 56,
              decoration: const BoxDecoration(
                color: Color(0xFFFCD535),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.remove,
                color: AppTheme.textPrimary,
                size: 24,
              ),
            ),
          ),
          
          // Quantity display
          Expanded(
            child: Center(
              child: Text(
                _quantity.toString(),
                style: const TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.textPrimary,
                ),
              ),
            ),
          ),
          
          // Plus button
          GestureDetector(
            onTap: _incrementQuantity,
            child: Container(
              width: 56,
              height: 56,
              decoration: const BoxDecoration(
                color: Color(0xFFFCD535),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.add,
                color: AppTheme.textPrimary,
                size: 24,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAddToCartButton(bool isRTL) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 40),
      child: SizedBox(
        width: double.infinity,
        height: 56,
        child: ElevatedButton(
          onPressed: _addToCart,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF2C2C2C),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(28),
            ),
            elevation: 4,
          ),
          child: Text(
            isRTL ? 'إضافة إلى السلة' : 'Add to Cart',
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
        ),
      ),
    );
  }
}
