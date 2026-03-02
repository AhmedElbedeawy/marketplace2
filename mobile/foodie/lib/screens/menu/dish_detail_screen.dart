import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../config/api_config.dart';
import '../../models/food.dart';
import '../../providers/auth_provider.dart';
import '../../providers/food_provider.dart';
import '../../providers/cart_provider.dart';
import '../../providers/language_provider.dart';
import '../../providers/favorite_provider.dart';
import '../../providers/country_provider.dart';
// PHASE 4: getAbsoluteUrl utility
import '../../widgets/global_bottom_navigation.dart';
// STEP 4: Offer sheet for portion selection

// STEP 4: Image URL normalization helper - handles all server paths
String? normalizeImageUrl(String? url) {
  if (url == null) return null;
  final trimmed = url.trim();
  if (trimmed.isEmpty) return null;
  
  // Absolute URLs
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  
  // Asset paths
  if (trimmed.startsWith('assets/') || trimmed.startsWith('packages/')) return trimmed;
  
  // Server uploads paths - prepend API origin
  final origin = Uri.parse(ApiConfig.baseUrl).origin;
  
  if (trimmed.startsWith('/uploads')) {
    return '$origin$trimmed';
  }
  if (trimmed.startsWith('uploads/')) {
    return '$origin/$trimmed';
  }
  if (trimmed.startsWith('/')) {
    return '$origin$trimmed';
  }
  return '$origin/$trimmed';
}

class DishDetailScreen extends StatefulWidget {
  final String adminDishId; // PHASE 4: AdminDish ID for 2-layer model
  final String? dishName; // PHASE 4: Dish name for display
  final String? dishId; // Legacy: Product ID (kept for backward compatibility)
  final String? initialCookId; // STEP 4: Pre-selected cook ID from sheet
  final int? initialCookIndex; // STEP 4: Pre-selected cook index for PageView

  const DishDetailScreen({
    Key? key,
    required this.adminDishId, // PHASE 4: Required adminDishId
    this.dishName,
    this.dishId, // Optional legacy parameter
    this.initialCookId, // STEP 4
    this.initialCookIndex, // STEP 4
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
  
  // PHASE 5: Portion selection state
  String? _selectedPortionKey;
  Map<String, dynamic>? _selectedPortion; // { portionKey, portionLabel, price, stock }
  
  // PHASE 5: Fulfillment selection state
  String _selectedFulfillment = 'pickup'; // 'pickup' or 'delivery'

  @override
  void initState() {
    super.initState();
    // Defer initial fetch to post-frame to avoid notifying listeners during build (prevents web crash)
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _loadDishData();
    });
  }

  @override
  void dispose() {
    _cookPageController.dispose();
    _imagePageController.dispose();
    super.dispose();
  }

  // PHASE 5: Extract portion options from offer
  List<Map<String, dynamic>> _getPortionOptions(Map<String, dynamic> offer) {
    final variants = offer['variants'] as List<dynamic>?;
    
    if (variants != null && variants.isNotEmpty) {
      return variants.cast<Map<String, dynamic>>().toList();
    }
    
    // Fallback: single portion from offer price/stock
    return [{
      'portionKey': 'default',
      'portionLabel': '',
      'price': offer['price'] ?? 0.0,
      'stock': offer['stock'] ?? 0,
    }];
  }

  // PHASE 5: Get display label for portion with EN/AR support
  String _getPortionLabel(Map<String, dynamic> portion, bool isRTL) {
    // Prefer portionLabel from backend
    final label = portion['portionLabel'] as String? ?? '';
    if (label.isNotEmpty) return label;
    
    final key = portion['portionKey'] as String? ?? 'default';
    
    // Canonical mapping for known portion keys
    const Map<String, Map<String, String>> labelMap = {
      'small': {'en': 'Small', 'ar': 'صغير'},
      'medium': {'en': 'Medium', 'ar': 'متوسط'},
      'large': {'en': 'Large', 'ar': 'كبير'},
      'family': {'en': 'Family', 'ar': 'عائلي'},
      'default': {'en': 'Default', 'ar': 'افتراضي'},
    };
    
    final mappedLabel = labelMap[key]?[isRTL ? 'ar' : 'en'];
    if (mappedLabel != null) return mappedLabel;
    
    // Fallback: title-case the key
    return key
        .replaceAll('_', ' ')
        .split(' ')
        .map((word) => word.isNotEmpty ? word[0].toUpperCase() + word.substring(1).toLowerCase() : '')
        .join(' ');
  }

  // STEP 3: Show portion selector sheet
  Future<void> _showPortionSelectorSheet() async {
    if (_cookVariants.isEmpty) return;
    final currentCook = _cookVariants[_currentCookIndex];
    final portions = _getPortionOptions(currentCook.fullOfferData ?? {});
    if (portions.length <= 1) return;

    final isRTL = Provider.of<LanguageProvider>(context, listen: false).isArabic;
    final selected = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      builder: (ctx) => Container(
        color: Colors.white,
        child: ListView.builder(
          shrinkWrap: true,
          itemCount: portions.length,
          itemBuilder: (listCtx, idx) {
            final p = portions[idx];
            // Use canonical label mapping for EN/AR support
            final label = _getPortionLabel(p, isRTL);
            final price = p['price'] as num? ?? 0;
            final stock = p['stock'] as int? ?? 0;
            final isOutOfStock = stock <= 0;
            final isSelected = _selectedPortionKey == p['portionKey'];

            return GestureDetector(
              onTap: isOutOfStock ? null : () => Navigator.pop(listCtx, p),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                decoration: BoxDecoration(
                  color: isSelected ? const Color(0xFFF5F5F5) : Colors.white,
                  border: const Border(bottom: BorderSide(color: Color(0xFFEEEEEE))),
                ),
                child: Row(
                  children: [
                    // Label as main title
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            label,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: isOutOfStock ? const Color(0xFFAAAAAA) : const Color(0xFF333333),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '$price SAR',
                            style: TextStyle(
                              fontSize: 12,
                              color: isOutOfStock ? const Color(0xFFCCCCCC) : const Color(0xFF666666),
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Stock status or selection indicator
                    if (isOutOfStock)
                      Text(
                        isRTL ? 'غير متوفر' : 'Out of stock',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF999999),
                        ),
                      )
                    else if (isSelected)
                      const Icon(Icons.check_circle, size: 20, color: Color(0xFF005430)),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );

    if (selected != null) {
      setState(() {
        _selectedPortion = selected;
        _selectedPortionKey = selected['portionKey'] as String?;
      });
    }
  }

  // PHASE 5: Select default portion (lowest price with stock > 0, else lowest price overall)
  void _selectDefaultPortion(List<Map<String, dynamic>> portions) {
    if (portions.isEmpty) return;
    
    // Find lowest price with stock > 0
    final inStock = portions.where((p) => (p['stock'] as int? ?? 0) > 0).toList();
    if (inStock.isNotEmpty) {
      inStock.sort((a, b) => (a['price'] as num).compareTo(b['price'] as num));
      _selectedPortion = inStock.first;
    } else {
      // No stock, select lowest price overall
      portions.sort((a, b) => (a['price'] as num).compareTo(b['price'] as num));
      _selectedPortion = portions.first;
    }
    _selectedPortionKey = _selectedPortion!['portionKey'];
  }

  // PHASE 5: Get current cook offer data (with variants)
  Map<String, dynamic>? _getCurrentOfferData() {
    if (_currentCookIndex < 0 || _currentCookIndex >= _cookVariants.length) return null;
    final cook = _cookVariants[_currentCookIndex];
    // This would need to be populated from the provider - for now return basic structure
    return null; // Will be set during _loadDishData
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
            // PHASE 5: Store the full DishOffer for variants/prep/fulfillment access
            fullOfferData: {
              'variants': offer.variants,
              'prepReadyConfig': offer.prepReadyConfig,
              'fulfillmentModes': offer.fulfillmentModes,
              'price': offer.price,
              'stock': offer.stock,
              'portionSize': offer.portionSize,
              'prepTime': offer.prepTime,
            },
          )).toList();
          
          // PHASE 5: Initialize portion selection from first offer
          if (_cookVariants.isNotEmpty && _cookVariants.first.fullOfferData != null) {
            final firstOfferData = _cookVariants.first.fullOfferData!;
            final portions = _getPortionOptions(firstOfferData);
            _selectDefaultPortion(portions);
          }
          
          // STEP 4: Apply initial cook index from offer sheet if provided
          // Use addPostFrameCallback to jump after first frame
          if (widget.initialCookIndex != null && widget.initialCookIndex! < _cookVariants.length) {
            _currentCookIndex = widget.initialCookIndex!;
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (_cookPageController.hasClients) {
                _cookPageController.jumpToPage(_currentCookIndex);
              }
            });
          } else if (widget.initialCookId != null) {
            // Fallback: find cook by ID
            for (int i = 0; i < _cookVariants.length; i++) {
              if (_cookVariants[i].cookId == widget.initialCookId) {
                _currentCookIndex = i;
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (_cookPageController.hasClients) {
                    _cookPageController.jumpToPage(_currentCookIndex);
                  }
                });
                break;
              }
            }
          }
          
          // PHASE 5: Initialize fulfillment modes from first offer
          if (_cookVariants.isNotEmpty && _cookVariants.first.fullOfferData != null) {
            final fulfillmentModes = _cookVariants.first.fullOfferData!['fulfillmentModes'] as Map<String, dynamic>?;
            if (fulfillmentModes != null) {
              final hasPickup = fulfillmentModes['pickup'] as bool? ?? true;
              final hasDelivery = fulfillmentModes['delivery'] as bool? ?? false;
              
              // Default to first available
              if (hasPickup) {
                _selectedFulfillment = 'pickup';
              } else if (hasDelivery) {
                _selectedFulfillment = 'delivery';
              }
            }
          }
          
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

    // STEP 4: Stock validation guard
    final int stock = (_selectedPortion?['stock'] as int?) ?? 0;
    if (stock <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Out of stock')),
      );
      return;
    }

    final currentCook = _cookVariants[_currentCookIndex];
    final cartProvider = Provider.of<CartProvider>(context, listen: false);

    // PHASE 4: 2-layer cart item mapping
    // offerId = DishOffer._id (from currentCook.offerId)
    // dishId = AdminDish._id (_dishData!.adminDishId)
    // kitchenId = Cook._id (currentCook.cookId)
    final String offerId = currentCook.offerId;
    final String dishId = _dishData!.adminDishId ?? _dishData!.id;
    final String kitchenId = currentCook.cookId;
    
    // PHASE 5: Ensure portion is selected
    if (_selectedPortionKey == null || _selectedPortion == null) {
      final portions = _getPortionOptions(currentCook.fullOfferData ?? {});
      _selectDefaultPortion(portions);
    }
    
    // PHASE 5: Ensure fulfillment is set
    if (_selectedFulfillment.isEmpty) {
      _selectedFulfillment = 'pickup';
    }
    
    // PHASE 5: Get price from selected portion
    final price = _selectedPortion?['price'] as num? ?? currentCook.price;

    // Add items one by one for the quantity selected
    for (int i = 0; i < _quantity; i++) {
      cartProvider.addToCart(
        foodId: offerId, // PHASE 4: offerId = DishOffer ID
        foodName: _dishData!.name,
        price: price.toDouble(), // PHASE 5: Use selected portion price
        cookId: kitchenId, // PHASE 4: kitchenId = Cook ID
        cookName: currentCook.cookName,
        countryCode: _dishData!.countryCode,
        dishId: dishId, // PHASE 4: AdminDish ID
        // PHASE 5: portion & fulfillment data ready for future cart provider enhancement
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
      // STEP 7: Use Inter font family
      body: DefaultTextStyle.merge(
        style: const TextStyle(fontFamily: 'Inter'),
        child: Column(
          children: [
            // Header - with top padding to match Menu page (50)
            Padding(
              padding: const EdgeInsets.only(top: 50),
              child: SafeArea(
                bottom: false,
                child: _buildHeader(isRTL),
              ),
            ),
          
          // Content (scrollable) with Add to Cart at bottom
          Expanded(
            child: PageView.builder(
              controller: _cookPageController,
              onPageChanged: (index) {
                setState(() {
                  _currentCookIndex = index;
                  _quantity = 1; // Reset quantity when changing cook
                  
                  // PHASE 5: Reset portion selection when changing cook
                  if (_cookVariants.isNotEmpty && _cookVariants[index].fullOfferData != null) {
                    final offerData = _cookVariants[index].fullOfferData!;
                    final portions = _getPortionOptions(offerData);
                    _selectDefaultPortion(portions);
                    
                    // Reset fulfillment modes
                    final fulfillmentModes = offerData['fulfillmentModes'] as Map<String, dynamic>?;
                    if (fulfillmentModes != null) {
                      final hasPickup = fulfillmentModes['pickup'] as bool? ?? true;
                      final hasDelivery = fulfillmentModes['delivery'] as bool? ?? false;
                      if (hasPickup) {
                        _selectedFulfillment = 'pickup';
                      } else if (hasDelivery) {
                        _selectedFulfillment = 'delivery';
                      }
                    }
                  }
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
                      
                      const SizedBox(height: 24),
                      
                      // Fulfillment selector
                      _buildFulfillmentSelector(isRTL),
                      
                      const SizedBox(height: 20),
                      
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
      ), // Close DefaultTextStyle
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
    // Filter valid (non-empty) images
    final List<String> validImages = images.where((img) => img.trim().isNotEmpty).toList();
    final bool hasImages = validImages.isNotEmpty;
    
    // If no offer images, show placeholder
    final displayImages = hasImages ? validImages : ['Hamam.png'];

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
                  // STEP 4: Use normalizeImageUrl to get proper URL
                  final normalizedUrl = normalizeImageUrl(imagePath);
                  if (normalizedUrl == null) {
                    return Container(
                      color: AppTheme.surfaceColor,
                      child: const Center(
                        child: Icon(
                          Icons.restaurant_menu,
                          size: 60,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                    );
                  }
                  
                  // Determine if asset or network
                  final isAssetImage = normalizedUrl.startsWith('assets/') || normalizedUrl.startsWith('packages/');

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
                              normalizedUrl,
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
            
            // Page indicators - DASHES (hidden for single image)
            if (displayImages.length > 1)
              Positioned(
                top: 12,
                left: 0,
                right: 0,
                child: Center(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: List.generate(displayImages.length, (index) {
                      // Active state follows current page index (no initialPage)
                      final isActive = _imagePageController.hasClients && 
                          _imagePageController.page?.round() == index;
                      return Container(
                        width: isActive ? 32 : 18,
                        height: 4,
                        margin: const EdgeInsets.symmetric(horizontal: 2),
                        decoration: BoxDecoration(
                          color: isActive ? const Color(0xFF333333) : const Color(0xFFAAAAAA),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      );
                    }),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }

  Widget _buildInfoBoxes(bool isRTL, CookOffer cook) {
    // STEP 5: Compute card values
    final int stock = (_selectedPortion?['stock'] as int?) ?? 0;
    final priceVal = _selectedPortion?['price'];
    final String priceText = (priceVal == null) ? '—' : priceVal.toString();
    final portionLabel = _selectedPortion != null
        ? _getPortionLabel(_selectedPortion!, isRTL)
        : '—';
    
    // Parity: show selector if 2+ total variants available (even if some out-of-stock)
    final portions = _getPortionOptions(cook.fullOfferData ?? {});
    final canSelectPortion = portions.length > 1;

    final String prepTimeText = (() {
      final v = _cookVariants.isNotEmpty ? _cookVariants[_currentCookIndex] : null;
      final dynamic pt = v?.prepTime ?? v?.fullOfferData?['prepTime'];
      if (pt == null) return '—';
      if (pt is num) return '${pt.toInt()} min';
      final s = pt.toString().trim();
      if (s.isEmpty) return '—';
      return s.contains('min') ? s : '$s min';
    })();

    // Build stock value with prefix
    final String stockValue = stock <= 0 ? 'Out of stock' : 'in Stock $stock';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 26),
      child: Row(
        children: [
          // Card 1: Prep time - icon in card, value below
          Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                AspectRatio(
                  aspectRatio: 1,
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      final iconSize = constraints.maxHeight * 0.57;
                      return GestureDetector(
                        onTap: null,
                        child: Container(
                          decoration: BoxDecoration(
                            color: const Color(0xFFD9D9D9),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          alignment: Alignment.center,
                          child: Image.asset(
                            'assets/icons/Time.png',
                            width: iconSize,
                            height: iconSize,
                            fit: BoxFit.contain,
                            color: const Color(0xFF595757),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  prepTimeText,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF595757),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          // Card 2: Portion - icon in card, value below, tappable only if 2+ portions available
          Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                AspectRatio(
                  aspectRatio: 1,
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      final iconSize = constraints.maxHeight * 0.57;
                      return GestureDetector(
                        onTap: canSelectPortion ? () async {
                          await _showPortionSelectorSheet();
                        } : null,
                        child: Container(
                          decoration: BoxDecoration(
                            color: const Color(0xFFD9D9D9),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          alignment: Alignment.center,
                          child: Image.asset(
                            'assets/icons/Serving.png',
                            width: iconSize,
                            height: iconSize,
                            fit: BoxFit.contain,
                            color: const Color(0xFF595757),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  portionLabel,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF595757),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          // Card 3: Price - icon in card (white), value below (grey)
          Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                AspectRatio(
                  aspectRatio: 1,
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      final iconSize = constraints.maxHeight * 0.57;
                      return GestureDetector(
                        onTap: null,
                        child: Container(
                          decoration: BoxDecoration(
                            color: const Color(0xFF005430),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          alignment: Alignment.center,
                          child: Image.asset(
                            'assets/icons/Sar.png',
                            width: iconSize,
                            height: iconSize,
                            fit: BoxFit.contain,
                            color: Colors.white,
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'SAR $priceText',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF595757),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          // Card 4: Stock - icon in card, value below
          Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                AspectRatio(
                  aspectRatio: 1,
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      final iconSize = constraints.maxHeight * 0.57;
                      return GestureDetector(
                        onTap: null,
                        child: Container(
                          decoration: BoxDecoration(
                            color: stock == 0 ? Colors.grey[400] : const Color(0xFFD9D9D9),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          alignment: Alignment.center,
                          child: Image.asset(
                            'assets/icons/Stock.png',
                            width: iconSize,
                            height: iconSize,
                            fit: BoxFit.contain,
                            color: stock == 0 ? const Color(0xFF999999) : const Color(0xFF595757),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  stockValue,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: stock == 0 ? const Color(0xFF999999) : const Color(0xFF595757),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ],
      ),
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
    // Use fallback chain: selected offer description -> _dishData description -> empty
    String description = '';
    if (_cookVariants.isNotEmpty && _currentCookIndex < _cookVariants.length) {
      final offerData = _cookVariants[_currentCookIndex].fullOfferData;
      description = (offerData?['description'] as String?)?.trim() ?? '';
    }
    if (description.isEmpty) {
      description = _dishData?.description.trim() ?? '';
    }
    
    if (description.isEmpty) {
      return const SizedBox.shrink();
    }
    
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
            description,
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
    final int stock = (_selectedPortion?['stock'] as int?) ?? 0;
    final bool canAddToCart = _quantity > 0 && stock > 0;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 26),
      child: GestureDetector(
        onTap: canAddToCart ? _addToCart : null,
        child: Container(
          height: 56,
          decoration: BoxDecoration(
            color: canAddToCart
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

  Widget _buildFulfillmentSelector(bool isRTL) {
    // Get fulfillment modes from current offer
    Map<String, dynamic>? fulfillmentModes;
    if (_cookVariants.isNotEmpty && _currentCookIndex < _cookVariants.length) {
      final offerData = _cookVariants[_currentCookIndex].fullOfferData;
      fulfillmentModes = offerData?['fulfillmentModes'] as Map<String, dynamic>?;
    }

    if (fulfillmentModes == null) {
      return const SizedBox.shrink();
    }

    final hasPickup = fulfillmentModes['pickup'] as bool? ?? true;
    final hasDelivery = fulfillmentModes['delivery'] as bool? ?? false;

    // If no modes available, don't show selector
    if (!hasPickup && !hasDelivery) {
      return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            isRTL ? 'طريقة التسليم' : 'Fulfillment',
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              // Pickup option
              if (hasPickup)
                Expanded(
                  child: GestureDetector(
                    onTap: () {
                      setState(() {
                        _selectedFulfillment = 'pickup';
                      });
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: _selectedFulfillment == 'pickup'
                            ? const Color(0xFF005430)
                            : const Color(0xFFE7E7E7),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        isRTL ? 'استلام' : 'Pickup',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: _selectedFulfillment == 'pickup'
                              ? Colors.white
                              : const Color(0xFF595757),
                        ),
                      ),
                    ),
                  ),
                ),
              if (hasPickup && hasDelivery) const SizedBox(width: 12),
              // Delivery option
              if (hasDelivery)
                Expanded(
                  child: GestureDetector(
                    onTap: () {
                      setState(() {
                        _selectedFulfillment = 'delivery';
                      });
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: _selectedFulfillment == 'delivery'
                            ? const Color(0xFF005430)
                            : const Color(0xFFE7E7E7),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        isRTL ? 'توصيل' : 'Delivery',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: _selectedFulfillment == 'delivery'
                              ? Colors.white
                              : const Color(0xFF595757),
                        ),
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
}
