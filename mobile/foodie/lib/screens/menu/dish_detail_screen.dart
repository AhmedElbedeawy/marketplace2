import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:smooth_page_indicator/smooth_page_indicator.dart';
import '../../config/theme.dart';
import '../../models/food.dart';
import '../../providers/auth_provider.dart';
import '../../providers/food_provider.dart';
import '../../providers/cart_provider.dart';
import '../../providers/language_provider.dart';
import '../../providers/favorite_provider.dart';
import '../../providers/country_provider.dart';
import '../../utils/image_url_utils.dart'; // PHASE 4: getAbsoluteUrl utility
import '../../widgets/global_bottom_navigation.dart';

class DishDetailScreen extends StatefulWidget {
  final String adminDishId; // PHASE 4: AdminDish ID for 2-layer model
  final String? dishName; // PHASE 4: Dish name for display
  final String? dishId; // Legacy: Product ID (kept for backward compatibility)

  const DishDetailScreen({
    Key? key,
    required this.adminDishId, // PHASE 4: Required adminDishId
    this.dishName,
    this.dishId, // Optional legacy parameter
  }) : super(key: key);

  @override
  State<DishDetailScreen> createState() => _DishDetailScreenState();
}

class _DishDetailScreenState extends State<DishDetailScreen> {
  final PageController _cookPageController = PageController();
  final PageController _imagePageController = PageController();
  int _currentCookIndex = 0;
  int _quantity = 1;
  bool _isLoading = true;
  Food? _dishData;
  List<CookOffer> _cookVariants = [];

  @override
  void initState() {
    super.initState();
    _loadDishData();
  }

  @override
  void dispose() {
    _cookPageController.dispose();
    _imagePageController.dispose();
    super.dispose();
  }

  Future<void> _loadDishData() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final foodProvider = Provider.of<FoodProvider>(context, listen: false);
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final headers = authProvider.getAuthHeaders();
      
      // PHASE 4: Use adminDishId for 2-layer model
      final String adminDishId = widget.adminDishId;
      
      // Fetch AdminDish info and offers
      await foodProvider.fetchOffersByAdminDish(adminDishId, headers);
      
      // Set current AdminDish for Level 2 popup
      final offers = foodProvider.currentOffers;
      
      if (offers.isNotEmpty) {
        // Create a Food object from AdminDish data for display
        // Use the first offer's data as fallback
        final firstOffer = offers.first;
        
        setState(() {
          _dishData = Food(
            id: adminDishId,
            name: widget.dishName ?? firstOffer.name,
            nameAr: firstOffer.nameAr,
            description: firstOffer.description ?? '',
            price: firstOffer.price,
            category: '',
            orderCount: 0,
            isFavorite: false,
            rating: firstOffer.cook.rating ?? 4.5,
            reviewCount: firstOffer.cook.ratingsCount ?? 0,
            cookCount: offers.length,
            image: firstOffer.images.isNotEmpty ? firstOffer.images.first : null,
            images: firstOffer.images,
            prepTime: firstOffer.prepTime,
            calories: firstOffer.calories ?? 500,
            servingSize: firstOffer.portionSize ?? '1-4 Serving',
            adminDishId: firstOffer.adminDishId,
          );
          
          // Convert DishOffer to CookOffer for UI
          // PHASE 4: Store offerId for cart mapping
          _cookVariants = offers.map((offer) => CookOffer(
            offerId: offer.id, // PHASE 4: DishOffer._id
            cookId: offer.cook.id,
            cookName: offer.cook.storeName ?? offer.cook.name,
            cookImage: offer.cook.profilePhoto,
            cookRating: offer.cook.rating ?? 4.5,
            cookReviews: offer.cook.ratingsCount ?? 0,
            price: offer.price,
            prepTime: offer.prepTime,
            calories: offer.calories ?? 500,
            servingSize: 4,
            availableQuantity: offer.stock ?? 10,
          )).toList();
          
          _isLoading = false;
        });
      } else {
        setState(() {
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _toggleFavorite() {
    if (_dishData == null) return;
    
    final favoriteProvider = Provider.of<FavoriteProvider>(context, listen: false);
    favoriteProvider.toggleFavorite(_dishData!.id);
    
    final languageProvider = Provider.of<LanguageProvider>(context, listen: false);
    final isRTL = languageProvider.isArabic;
    final isFavorite = favoriteProvider.isFavorite(_dishData!.id);
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          isFavorite
              ? (isRTL ? 'تمت الإضافة إلى المفضلة' : 'Added to favorites')
              : (isRTL ? 'تمت الإزالة من المفضلة' : 'Removed from favorites'),
        ),
        duration: const Duration(seconds: 1),
      ),
    );
  }

  void _addToCart() {
    if (_dishData == null || _cookVariants.isEmpty || _quantity <= 0) return;

    final currentCook = _cookVariants[_currentCookIndex];
    final cartProvider = Provider.of<CartProvider>(context, listen: false);

    // PHASE 4: 2-layer cart item mapping
    // offerId = DishOffer._id (from currentCook.offerId)
    // dishId = AdminDish._id (_dishData!.adminDishId)
    // kitchenId = Cook._id (currentCook.cookId)
    final String offerId = currentCook.offerId;
    final String dishId = _dishData!.adminDishId ?? _dishData!.id;
    final String kitchenId = currentCook.cookId;

    // Add items one by one for the quantity selected
    for (int i = 0; i < _quantity; i++) {
      cartProvider.addToCart(
        foodId: offerId, // PHASE 4: offerId = DishOffer ID
        foodName: _dishData!.name,
        price: currentCook.price,
        cookId: kitchenId, // PHASE 4: kitchenId = Cook ID
        cookName: currentCook.cookName,
        countryCode: _dishData!.countryCode,
        dishId: dishId, // PHASE 4: AdminDish ID
      );
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Added $_quantity x ${_dishData!.name} to cart'),
        duration: const Duration(seconds: 2),
        backgroundColor: AppTheme.accentColor,
      ),
    );

    // Reset quantity
    setState(() {
      _quantity = 1;
    });
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = Provider.of<LanguageProvider>(context);
    final isRTL = languageProvider.isArabic;

    if (_isLoading) {
      return const Scaffold(
        backgroundColor: AppTheme.backgroundColor,
        body: Center(
          child: CircularProgressIndicator(
            color: AppTheme.accentColor,
          ),
        ),
      );
    }

    if (_dishData == null || _cookVariants.isEmpty) {
      return Scaffold(
        backgroundColor: AppTheme.backgroundColor,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: AppTheme.textPrimary),
            onPressed: () => Navigator.pop(context),
          ),
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.restaurant_menu_outlined,
                size: 80,
                color: AppTheme.textSecondary,
              ),
              const SizedBox(height: 16),
              Text(
                isRTL ? 'الطبق غير متوفر' : 'Dish unavailable',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textPrimary,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: Column(
        children: [
          // Header
          SafeArea(
            bottom: false,
            child: _buildHeader(isRTL),
          ),
          
          // Content (scrollable) with Add to Cart at bottom
          Expanded(
            child: PageView.builder(
              controller: _cookPageController,
              onPageChanged: (index) {
                setState(() {
                  _currentCookIndex = index;
                  _quantity = 1; // Reset quantity when changing cook
                });
                if (_imagePageController.hasClients) {
                  _imagePageController.jumpToPage(0);
                }
              },
              itemCount: _cookVariants.length,
              itemBuilder: (context, cookIndex) {
                final cook = _cookVariants[cookIndex];
                return SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Cook Flipper Indicator - above image
                      if (_cookVariants.length > 1)
                        _buildCookFlipperIndicator(isRTL),
                      
                      // Image Slider
                      _buildImageSlider(isRTL, cook),
                      
                      const SizedBox(height: 20),
                      
                      // Info Boxes
                      _buildInfoBoxes(isRTL, cook),
                      
                      const SizedBox(height: 24),
                      
                      // Dish Title and Rating
                      _buildTitleAndRating(isRTL),
                      
                      const SizedBox(height: 16),
                      
                      // Description
                      _buildDescription(isRTL),
                      
                      const SizedBox(height: 20),
                      
                      // Ingredients
                      _buildIngredients(isRTL),
                      
                      const SizedBox(height: 24),
                      
                      // Quantity Selector
                      _buildQuantitySelector(isRTL),
                      
                      const SizedBox(height: 20),
                      
                      // Add to Cart Button (inside scroll)
                      _buildAddToCartButton(isRTL),
                      
                      const SizedBox(height: 20),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
      bottomNavigationBar: const GlobalBottomNavigation(),
    );
  }

  Widget _buildCookFlipperIndicator(bool isRTL) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 26, vertical: 12),
      child: Row(
        children: List.generate(
          _cookVariants.length,
          (index) => Expanded(
            child: Container(
              height: 4,
              margin: EdgeInsets.only(
                right: index < _cookVariants.length - 1 ? 6 : 0,
              ),
              decoration: BoxDecoration(
                color: index == _currentCookIndex
                    ? const Color(0xFFE94057)
                    : const Color(0xFFD9D9D9),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(bool isRTL) {
    final currentCook = _cookVariants[_currentCookIndex];
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      child: Row(
        children: [
          // Back button
          IconButton(
            icon: Icon(
              isRTL ? Icons.arrow_forward : Icons.arrow_back,
              color: AppTheme.textPrimary,
              size: 24,
            ),
            onPressed: () => Navigator.pop(context),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
          ),
          const SizedBox(width: 16),
          // Dish name and cook name on same line
          Expanded(
            child: Row(
              children: [
                Flexible(
                  child: Text(
                    _dishData!.name,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: () {
                    // Navigate to cook profile with cook ID
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('${isRTL ? 'جاري فتح ملف الطاهي' : 'Opening cook profile'}: ${currentCook.cookName}'),
                        duration: const Duration(seconds: 1),
                      ),
                    );
                    // TODO: Navigate to CookProfileScreen with cook ID when available
                  },
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.chevron_left,
                        size: 16,
                        color: Color(0xFFE94057),
                      ),
                      Flexible(
                        child: Text(
                          currentCook.cookName,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFFE94057),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildImageSlider(bool isRTL, CookOffer cook) {
    // PHASE 4: Use offer images from _dishData.images, fallback to adminDish image
    final List<String> images = _dishData?.images ?? [];
    final bool hasImages = images.isNotEmpty;
    
    // If no offer images, show placeholder
    final displayImages = hasImages ? images : ['Hamam.png'];

    return Consumer<FavoriteProvider>(
      builder: (context, favoriteProvider, _) {
        final isFavorite = _dishData != null ? favoriteProvider.isFavorite(_dishData!.id) : false;
        
        return Stack(
          children: [
            // Image PageView
            Container(
              height: 218,
              width: 327,
              margin: const EdgeInsets.symmetric(horizontal: 26),
              child: PageView.builder(
                controller: _imagePageController,
                itemCount: displayImages.length,
                itemBuilder: (context, index) {
                  final imagePath = displayImages[index];
                  // PHASE 4: Check if it's an asset or network image
                  final isAssetImage = imagePath.startsWith('assets/') || !imagePath.startsWith('http');
                  final imageUrl = getAbsoluteUrl(imagePath);

                  return Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.08),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: isAssetImage
                          ? Image.asset(
                              imagePath,
                              width: 327,
                              height: 218,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Container(
                                color: AppTheme.surfaceColor,
                                child: const Center(
                                  child: Icon(
                                    Icons.restaurant_menu,
                                    size: 60,
                                    color: AppTheme.textSecondary,
                                  ),
                                ),
                              ),
                            )
                          : Image.network(
                              imageUrl,
                              width: 327,
                              height: 218,
                              fit: BoxFit.cover,
                              loadingBuilder: (_, child, loadingProgress) {
                                if (loadingProgress == null) return child;
                                return Container(
                                  color: AppTheme.surfaceColor,
                                  child: const Center(
                                    child: CircularProgressIndicator(),
                                  ),
                                );
                              },
                              errorBuilder: (_, __, ___) => Container(
                                color: AppTheme.surfaceColor,
                                child: const Center(
                                  child: Icon(
                                    Icons.restaurant_menu,
                                    size: 60,
                                    color: AppTheme.textSecondary,
                                  ),
                                ),
                              ),
                            ),
                    ),
                  );
                },
              ),
            ),
            
            // Favorite button
            Positioned(
              top: 12,
              right: isRTL ? null : 36,
              left: isRTL ? 36 : null,
              child: GestureDetector(
                onTap: _toggleFavorite,
                child: Image.asset(
                  isFavorite
                      ? 'assets/icons/Red Heart.png'
                      : 'assets/icons/White Heart.png',
                  width: 34,
                  height: 33,
                  errorBuilder: (_, __, ___) => Icon(
                    isFavorite ? Icons.favorite : Icons.favorite_border,
                    color: isFavorite ? Colors.red : Colors.white,
                    size: 34,
                  ),
                ),
              ),
            ),
            
            // Page indicators
            if (images.length > 1)
              Positioned(
                bottom: 16,
                left: 0,
                right: 0,
                child: Center(
                  child: SmoothPageIndicator(
                    controller: _imagePageController,
                    count: images.length,
                    effect: const WormEffect(
                      dotHeight: 8,
                      dotWidth: 8,
                      activeDotColor: AppTheme.accentColor,
                      dotColor: Colors.white,
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }

  Widget _buildInfoBoxes(bool isRTL, CookOffer cook) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 26),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          _buildInfoBox(
            icon: null,
            iconAsset: 'Time.png',
            label: isRTL ? '${cook.prepTime} دقيقة' : '${cook.prepTime} mins',
            value: '',
            isPrice: false,
          ),
          const SizedBox(width: 30),
          _buildInfoBox(
            icon: null,
            iconAsset: 'Serving.png',
            label: '${_dishData!.servingSize} Serving',
            value: '',
            isPrice: false,
          ),
          const SizedBox(width: 30),
          _buildInfoBox(
            icon: null,
            iconAsset: 'Sar.png',
            label: '${context.watch<CountryProvider>().getLocalizedCurrency(false)} ${cook.price.toStringAsFixed(0)}',
            value: '',
            isPrice: true,
          ),
          const SizedBox(width: 30),
          _buildInfoBox(
            icon: null,
            iconAsset: 'Calories.png',
            label: '${cook.calories} Kcal',
            value: '',
            isPrice: false,
          ),
        ],
      ),
    );
  }

  Widget _buildInfoBox({
    IconData? icon,
    String? iconAsset,
    required String label,
    required String value,
    required bool isPrice,
  }) {
    return Column(
      children: [
        Container(
          width: 51,
          height: 51,
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: isPrice ? const Color(0xFF005430) : const Color(0xFFD9D9D9),
            borderRadius: BorderRadius.circular(5),
          ),
          child: Center(
            child: iconAsset != null
                ? Image.asset(
                    'assets/icons/$iconAsset',
                    width: 24,
                    height: 24,
                    color: isPrice ? const Color(0xFFFFFFFF) : const Color(0xFF595757),
                    errorBuilder: (_, __, ___) => Icon(
                      Icons.monetization_on,
                      size: 24,
                      color: isPrice ? const Color(0xFFFFFFFF) : const Color(0xFF595757),
                    ),
                  )
                : icon != null
                    ? Icon(
                        icon,
                        size: 24,
                        color: isPrice ? const Color(0xFFFFFFFF) : const Color(0xFF595757),
                      )
                    : null,
          ),
        ),
        const SizedBox(height: 6),
        SizedBox(
          width: 51,
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: Color(0xFF595757),
            ),
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  Widget _buildTitleAndRating(bool isRTL) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _dishData!.name,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w600,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              // Star rating
              Row(
                children: List.generate(5, (index) {
                  return Icon(
                    index < _dishData!.rating.floor()
                        ? Icons.star
                        : Icons.star_border,
                    size: 18,
                    color: AppTheme.accentColor,
                  );
                }),
              ),
              const SizedBox(width: 8),
              Text(
                _dishData!.rating.toStringAsFixed(1),
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textPrimary,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                isRTL
                    ? '(${_dishData!.cookCount} طباخ)'
                    : '(${_dishData!.cookCount} Cooks)',
                style: const TextStyle(
                  fontSize: 12,
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
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            isRTL ? 'الوصف' : 'Description',
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _dishData!.description,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppTheme.textSecondary,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildIngredients(bool isRTL) {
    // Default ingredients if none provided
    final ingredients = _dishData!.ingredients.isNotEmpty
        ? _dishData!.ingredients
        : [
            'Pigeon',
            'rice or freekeh',
            'onion',
            'garlic',
            'herbs (parsley, dill, mint)',
            'spices',
            'ghee',
            'salt',
            'pepper',
          ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            isRTL ? 'المكونات' : 'Ingredients',
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: ingredients.map((ingredient) {
              return Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: AppTheme.surfaceColor,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: AppTheme.dividerColor,
                    width: 1,
                  ),
                ),
                child: Text(
                  ingredient,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textSecondary,
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildQuantitySelector(bool isRTL) {
    final currentCook = _cookVariants[_currentCookIndex];
    
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 26),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                isRTL ? 'الكمية' : 'Quantity',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textPrimary,
                ),
              ),
              Text(
                isRTL
                    ? 'متوفر: ${currentCook.availableQuantity}'
                    : 'Available: ${currentCook.availableQuantity}',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textSecondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Decrease button
              GestureDetector(
                onTap: () {
                  if (_quantity > 1) {
                    setState(() {
                      _quantity--;
                    });
                  }
                },
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: const BoxDecoration(
                    color: Color(0xFFFCD535),
                    shape: BoxShape.circle,
                  ),
                  child: const Center(
                    child: Icon(
                      Icons.remove,
                      size: 24,
                      color: Color(0xFF595757),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              // Quantity display
              Container(
                width: 40,
                height: 40,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    _quantity.toString(),
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF595757),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              // Increase button
              GestureDetector(
                onTap: () {
                  if (_quantity < currentCook.availableQuantity) {
                    setState(() {
                      _quantity++;
                    });
                  }
                },
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: const BoxDecoration(
                    color: Color(0xFFFCD535),
                    shape: BoxShape.circle,
                  ),
                  child: const Center(
                    child: Icon(
                      Icons.add,
                      size: 24,
                      color: Color(0xFF595757),
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

  Widget _buildAddToCartButton(bool isRTL) {
    final currentCook = _cookVariants[_currentCookIndex];
    final totalPrice = currentCook.price * _quantity;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 26),
      child: GestureDetector(
        onTap: _quantity > 0 ? _addToCart : null,
        child: Container(
          height: 56,
          decoration: BoxDecoration(
            color: _quantity > 0
                ? const Color(0xFF595757)
                : AppTheme.textSecondary,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF595757).withValues(alpha: 0.3),
                blurRadius: 8,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.shopping_cart,
                color: Colors.white,
                size: 24,
              ),
              const SizedBox(width: 12),
              Text(
                isRTL ? 'أضف إلى السلة' : 'Add to Cart',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 8),
              const Text(
                '•',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                isRTL
                    ? '${totalPrice.toStringAsFixed(0)} ${context.watch<CountryProvider>().getLocalizedCurrency(true)}'
                    : '${context.watch<CountryProvider>().getLocalizedCurrency(false)} ${totalPrice.toStringAsFixed(0)}',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
