import 'dart:ui';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../models/food.dart';
import '../../providers/auth_provider.dart';
import '../../providers/food_provider.dart';
import '../../providers/cart_provider.dart';
import '../../providers/language_provider.dart';
import '../../providers/favorite_provider.dart';
import '../../providers/country_provider.dart';
import '../../utils/image_url_utils.dart';
import '../../utils/prep_time_utils.dart';
// PHASE 4: getAbsoluteUrl utility
// STEP 4: Offer sheet for portion selection

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
  late final PageController _cookPageController;
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
  
  // Cache for "More from this Cook" Future to prevent recreation during build
  Future<List<Food>>? _moreFromThisCookFuture;
  String? _moreFromThisCookCookId; // Track if cook changed

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

  // Get prep time display text for description section
  String _getPrepTimeDisplayText(bool isRTL, {bool includeLabel = true}) {
    if (_cookVariants.isEmpty || _currentCookIndex >= _cookVariants.length) {
      return 'Prep Time: —';
    }
    
    final offer = _cookVariants[_currentCookIndex];
    final prepReadyConfig = offer.fullOfferData?['prepReadyConfig'] as Map<String, dynamic>?;
    final prepTime = offer.prepTime ?? 30;
    
    return PrepTimeUtils.getPrepTimeDisplayText(prepReadyConfig, prepTime, isRTL: isRTL, includeLabel: includeLabel);
  }

  // Get prep time text for icon card (simpler format)
  String _getIconCardPrepTimeText() {
  if (_cookVariants.isEmpty || _currentCookIndex >= _cookVariants.length) {
    return '';
  }

  final offer = _cookVariants[_currentCookIndex];
  final fullOfferData = offer.fullOfferData;

  if (fullOfferData == null || fullOfferData.isEmpty) {
    return '';
  }

  final prepReadyConfig =
      fullOfferData['prepReadyConfig'] as Map<String, dynamic>?;

  if (prepReadyConfig == null || prepReadyConfig.isEmpty) {
    return '';
  }

  final cookCountryCode =
      (fullOfferData['cook'] as Map<String, dynamic>?)?['countryCode']
          as String?;

  return PrepTimeUtils.getIconCardText(
    prepReadyConfig,
    offer.prepTime ?? 30,
    cookCountryCode: cookCountryCode,
  );
}

// Get prep time text for icon card using specific cook (not _currentCookIndex)
String _getIconCardPrepTimeTextForCook(CookOffer cook) {
  final fullOfferData = cook.fullOfferData;

  if (fullOfferData == null || fullOfferData.isEmpty) {
    return '';
  }

  final prepReadyConfig =
      fullOfferData['prepReadyConfig'] as Map<String, dynamic>?;

  if (prepReadyConfig == null || prepReadyConfig.isEmpty) {
    return '';
  }

  final cookCountryCode =
      (fullOfferData['cook'] as Map<String, dynamic>?)?['countryCode']
          as String?;

  return PrepTimeUtils.getIconCardText(
    prepReadyConfig,
    cook.prepTime ?? 30,
    cookCountryCode: cookCountryCode,
  );
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

  // New: Show portion selector action sheet
  Future<void> _showPortionSelectorSheet() async {
    if (_cookVariants.isEmpty) return;
    final currentCook = _cookVariants[_currentCookIndex];
    final allPortions = _getPortionOptions(currentCook.fullOfferData ?? {});
    final inStockPortions = allPortions.where((p) => (p['stock'] as int? ?? 0) > 0).toList();
    
    if (inStockPortions.isEmpty) return;

    final isRTL = Provider.of<LanguageProvider>(context, listen: false).isArabic;
    final selected = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      builder: (ctx) => Container(
        color: Colors.white,
        child: ListView.builder(
          shrinkWrap: true,
          itemCount: inStockPortions.length,
          itemBuilder: (listCtx, idx) {
            final p = inStockPortions[idx];
            final label = _getPortionLabel(p, isRTL);
            final price = p['price'] as num? ?? 0;
            final isSelected = _selectedPortionKey == p['portionKey'];

            return GestureDetector(
              onTap: () => Navigator.pop(listCtx, p),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                decoration: BoxDecoration(
                  color: isSelected ? const Color(0xFFF5F5F5) : Colors.white,
                  border: const Border(bottom: BorderSide(color: Color(0xFFEEEEEE))),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            label,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF333333),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '$price SAR',
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFF666666),
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (isSelected)
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
            rating: firstOffer.ratings?['average']?.toDouble() ?? firstOffer.cook.rating ?? 4.5,
            reviewCount: firstOffer.ratings?['count'] ?? firstOffer.cook.ratingsCount ?? 0,
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
	    deliveryFee: offer.deliveryFee ?? 0.0,
            prepTime: offer.prepTime,
            calories: offer.calories ?? 500,
            servingSize: 4,
            availableQuantity: offer.stock ?? 10,
            // PHASE 5: Store the full DishOffer for variants/prep/fulfillment access
            fullOfferData: {
              'name': offer.name,
              'nameAr': offer.nameAr,
              'variants': offer.variants,
              'prepReadyConfig': offer.prepReadyConfig,
              'fulfillmentModes': offer.fulfillmentModes,
              'price': offer.price,
              'stock': offer.stock,
              'portionSize': offer.portionSize,
              'prepTime': offer.prepTime,
              'images': offer.images,
              'descriptionEn': offer.descriptionEn,
              'descriptionAr': offer.descriptionAr,
              'longDescriptionEn': offer.longDescriptionEn,
              'longDescriptionAr': offer.longDescriptionAr,
              'ratings': offer.ratings, // Dish ratings
              'cook': {
                'id': offer.cook.id,
                'name': offer.cook.name,
                'storeName': offer.cook.storeName,
                'profilePhoto': offer.cook.profilePhoto,
                'rating': offer.cook.rating,
                'ratingsCount': offer.cook.ratingsCount,
                'countryCode': offer.cook.countryCode,
              },
            },
          )).toList();
          
          // Initialize cook PageController with correct initial page to prevent flash
          int targetCookIndex = 0;
          bool foundRequestedCook = false;
          
          if (widget.initialCookIndex != null && widget.initialCookIndex! < _cookVariants.length) {
            targetCookIndex = widget.initialCookIndex!;
            foundRequestedCook = true;
            debugPrint('✅ [DISH DETAIL] Using initialCookIndex: $targetCookIndex');
          } else if (widget.initialCookId != null) {
            debugPrint('🔍 [DISH DETAIL] Looking for initialCookId: ${widget.initialCookId}');
            debugPrint('   Available cooks: ${_cookVariants.map((c) => c.cookId).toList()}');
            
            for (int i = 0; i < _cookVariants.length; i++) {
              if (_cookVariants[i].cookId == widget.initialCookId) {
                targetCookIndex = i;
                foundRequestedCook = true;
                debugPrint('✅ [DISH DETAIL] Found cook at index: $targetCookIndex');
                break;
              }
            }
            
            if (!foundRequestedCook) {
              debugPrint('⚠️ [DISH DETAIL] Requested cook not found in offers! Defaulting to index 0');
            }
          }
          
          _currentCookIndex = targetCookIndex;
          _cookPageController = PageController(initialPage: targetCookIndex);
          
          debugPrint('📍 [DISH DETAIL] Final cook index: $_currentCookIndex, cookId: ${_cookVariants.isNotEmpty ? _cookVariants[_currentCookIndex].cookId : "N/A"}');
          
          // PHASE 5: Initialize portion selection from first offer
          if (_cookVariants.isNotEmpty && _cookVariants.first.fullOfferData != null) {
            final firstOfferData = _cookVariants.first.fullOfferData!;
            final portions = _getPortionOptions(firstOfferData);
            _selectDefaultPortion(portions);
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
        
          // Add to viewed dishes for favorites tracking
          if (_dishData != null) {
            foodProvider.addToViewedDishes(_dishData!);
          }
        });
      } else {
        setState(() {
          _isLoading = false;
        
          // Add to viewed dishes for favorites tracking
          if (_dishData != null) {
            foodProvider.addToViewedDishes(_dishData!);
          }
        });
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _toggleFavorite() {
    if (_dishData == null || _cookVariants.isEmpty) return;
    
    final currentCook = _cookVariants[_currentCookIndex];
    final favoriteProvider = Provider.of<FavoriteProvider>(context, listen: false);
    // Use SAME image selection logic as Dish Profile display:
    // 1. Admin dish images first, 2. Offer images, 3. Filter empty strings
    final adminDishImages = _dishData?.images ?? [];
    final validAdminImages = adminDishImages.where((img) => img.trim().isNotEmpty).toList();
    final offerImages = (currentCook.fullOfferData?['images'] as List?)?.toList() ?? [];
    final validOfferImages = offerImages.where((img) => img.toString().trim().isNotEmpty).toList();
    
    String? selectedImage;
    if (validAdminImages.isNotEmpty) {
      selectedImage = validAdminImages.first.toString();
    } else if (validOfferImages.isNotEmpty) {
      selectedImage = validOfferImages.first.toString();
    } else {
      selectedImage = currentCook.cookImage?.isNotEmpty == true ? currentCook.cookImage : null;
    }
    
    debugPrint('⭐ [FAVORITES] Adding to favorites:');
    debugPrint('   dishId: ${_dishData!.id}');
    debugPrint('   offerId: ${currentCook.offerId}');
    debugPrint('   cookId: ${currentCook.cookId}');
    debugPrint('   has offerData: ${currentCook.fullOfferData != null}');
    if (currentCook.fullOfferData != null) {
      debugPrint('   offerData keys: ${currentCook.fullOfferData!.keys.toList()}');
      debugPrint('   has cook data: ${currentCook.fullOfferData!['cook'] != null}');
    }
    
    favoriteProvider.toggleFavorite(
      _dishData!.id,
      offerId: currentCook.offerId,
      cookId: currentCook.cookId,
      image: selectedImage,
      dishName: _dishData!.name,
      price: currentCook.price,
      offerData: currentCook.fullOfferData, // Pass full offer data for favorites card
    );
    
    final languageProvider = Provider.of<LanguageProvider>(context, listen: false);
    final isRTL = languageProvider.isArabic;
    final isFavorite = favoriteProvider.isFavorite(_dishData!.id, offerId: currentCook.offerId);
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          isFavorite
              ? (isRTL ? 'تمت الإضافة إلى المفضلة' : 'Added to favorites')
              : (isRTL ? 'تمت الإزالة من المفضلة' : 'Removed from favorites'),
          style: const TextStyle(
            color: Color(0xFFFF7A00), // App orange text
            fontWeight: FontWeight.w600,
          ),
        ),
        duration: const Duration(seconds: 1),
        backgroundColor: Colors.white, // White background
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        elevation: 8,
      ),
    );
  }

  Future<void> _addToCart() async {
    if (_dishData == null || _cookVariants.isEmpty || _quantity <= 0) return;

    // STEP 4: Stock validation guard
    final int stock = (_selectedPortion?['stock'] as int?) ?? 0;
    
    // CRITICAL: Check if requested quantity exceeds stock
    if (_quantity > stock) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Requested quantity not available. Stock: $stock'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }
    
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
    
    // DEBUG LOG: Cart addition parameters
    debugPrint('🛒 [DEBUG] === ADD TO CART STARTED ===');
    debugPrint('🛒 [DEBUG] selectedOfferId: $offerId');
    debugPrint('🛒 [DEBUG] selectedCookId: $kitchenId');
    debugPrint('🛒 [DEBUG] selectedPortionKey: $_selectedPortionKey');
    debugPrint('🛒 [DEBUG] countryCode: ${_dishData!.countryCode}');
    debugPrint('🛒 [DEBUG] quantity: $_quantity');
    
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
    debugPrint('🛒 [DEBUG] price: $price');

    // Add items one by one for the quantity selected
    for (int i = 0; i < _quantity; i++) {
      debugPrint('🛒 [DEBUG] Adding item #${i + 1} to cart...');
      
      // Pass prepReadyConfig to CartProvider for centralized computation
      final prepReadyConfig = currentCook.fullOfferData?['prepReadyConfig'] as Map<String, dynamic>?;
      final numericPrepTime = currentCook.prepTime;
double toDouble(dynamic value) {
  if (value == null) return 0;
  if (value is num) return value.toDouble();
  return double.tryParse(value.toString()) ?? 0.0;
}

final deliveryFee = _selectedFulfillment == 'delivery'
    ? toDouble(currentCook.deliveryFee)
    : 0.0;
      
      // Get dish image: prefer admin dish image (more reliable) over offer image (may be missing)
      // This prevents 404 errors when offer-specific images don't exist on server
      final rawPhotoUrl = (_dishData?.images.isNotEmpty == true) 
          ? _dishData!.images.first 
          : ((currentCook.fullOfferData?['images'] as List?)?.isNotEmpty == true
              ? (currentCook.fullOfferData!['images'] as List).first.toString()
              : null);

final photoUrl = rawPhotoUrl == null
    ? null
    : (rawPhotoUrl.startsWith('http://') || rawPhotoUrl.startsWith('https://'))
        ? rawPhotoUrl
        : rawPhotoUrl.startsWith('/')
            ? 'https://api.eltekkeya.com$rawPhotoUrl'
            : 'https://api.eltekkeya.com/$rawPhotoUrl';

debugPrint('🚚 [PROOF] fullOfferData keys: ${currentCook.fullOfferData?.keys.toList()}');
debugPrint('🚚 [PROOF] fullOfferData cook object: ${currentCook.fullOfferData?['cook']}');
debugPrint('🚚 [PROOF] currentCook.price: ${currentCook.price}');
debugPrint('🚚 [PROOF] currentCook.fullOfferData: ${currentCook.fullOfferData}');
debugPrint('🚚 [PROOF] final deliveryFee sent: $deliveryFee');
debugPrint('🚚 [PROOF] currentCook.deliveryFee: ${currentCook.deliveryFee}');
debugPrint('🚚 [PROOF] selected fulfillment: $_selectedFulfillment');
debugPrint('🚚 [PROOF] final deliveryFee sent: $deliveryFee');

debugPrint('🚚 [PROOF] selected fulfillment: $_selectedFulfillment');
debugPrint('🚚 [PROOF] fullOfferData deliveryFee: ${currentCook.fullOfferData?['deliveryFee']}');
debugPrint('🚚 [PROOF] fullOfferData cook country: ${(currentCook.fullOfferData?['cook'] as Map<String, dynamic>?)?['countryCode']}');
debugPrint('🚚 [PROOF] normalized photoUrl chosen: $photoUrl');
debugPrint('🚚 [PROOF] _dishData.countryCode: ${_dishData?.countryCode}');

      try {
        await cartProvider.addToCart(
          foodId: offerId, // offerId = DishOffer ID
          foodName: _dishData!.name,
          price: price.toDouble(), // Use selected portion price
          cookId: kitchenId, // Cook ID
          cookName: currentCook.cookName,
          countryCode: ((currentCook.fullOfferData?['cook'] as Map<String, dynamic>?)?['countryCode'] ?? _dishData?.countryCode ?? 'SA'),
          dishId: dishId, // AdminDish ID
          portionKey: _selectedPortionKey,
          fulfillmentMode: _selectedFulfillment,
          priceAtAdd: price.toDouble(),
          deliveryFee: deliveryFee,
          prepReadyConfig: prepReadyConfig,
          numericPrepTime: numericPrepTime,
          photoUrl: photoUrl,
          currentStock: stock, // CRITICAL: Pass stock for validation
        );
      } catch (e) {
        // Stock validation failed - show error
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceAll('Exception: ', '')),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Added $_quantity x ${_dishData!.name} to cart',
          style: const TextStyle(
            color: Color(0xFFFF7A00), // App orange text
            fontWeight: FontWeight.w600,
          ),
        ),
        duration: const Duration(seconds: 2),
        backgroundColor: Colors.white, // White background
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        elevation: 8,
      ),
    );

    // Reset quantity
    setState(() {
      _quantity = 1;
    });
    
    debugPrint('🛒 [DEBUG] === ADD TO CART COMPLETED ===');
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
      extendBody: true,
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
                      
                      const SizedBox(height: 16),
                      
                      // Preparation Time section
                      _buildPreparationTimeSection(isRTL),
                      
                      const SizedBox(height: 16),
                      
                      // Cook Section
                      _buildCookSection(isRTL),
                      
                      const SizedBox(height: 16),
                      
                      // Portion Selection section
                      _buildPortionSelectionSection(isRTL),
                      
                      const SizedBox(height: 16),
                      
                      // Fulfillment selector
                      _buildFulfillmentSelector(isRTL),
                      
                      const SizedBox(height: 20),
                      
                      // More from this Cook
                      _buildMoreFromThisCook(isRTL),
                      
                      // Add bottom padding to account for floating bar
                      const SizedBox(height: 60),
                    ],
                  ),
                );
              },
            ),
          ),
          
          // Floating bottom section with blur background
          SafeArea(
            top: false,
            child: ClipRRect(
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 4, sigmaY: 4),
                child: Container(
                  color: const Color(0xFFF5F5F5),
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Quantity + Total Price row - centered
                      Center(
                        child: _buildQuantitySelector(isRTL),
                      ),
                      const SizedBox(height: 16),
                      // Add to Cart button - centered
                      Center(
                        child: _buildAddToCartButton(isRTL),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
        ),
      ), // Close DefaultTextStyle
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
                        color: Color(0xFFFF7A00),
                      ),
                      Flexible(
                        child: Text(
                          currentCook.cookName,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFFFF7A00),
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
        // Check favorite status for the CURRENT cook's offer
        final isFavorite = _dishData != null ? favoriteProvider.isFavorite(_dishData!.id, offerId: cook.offerId) : false;
        
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
                  // Use SmartImage for all URL types - handles base64, network, uploads automatically
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
                      child: SmartImage(
                        imageUrl: imagePath,
                        width: 327,
                        height: 218,
                        fit: BoxFit.cover,
                        placeholder: Container(
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
                      ? 'icons/Red Heart.png'
                      : 'icons/White Heart.png',
                  width: 34,
                  height: 33,
                  errorBuilder: (_, __, ___) => Icon(
                    isFavorite ? Icons.favorite : Icons.favorite_border,
                    color: isFavorite ? const Color(0xFFFFE5CC) : Colors.white,
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
    // Only render info boxes for the currently visible cook page
    // This prevents flash of wrong data during PageView initialization
   final int cookIndex = _cookVariants.indexOf(cook);
    if (cookIndex != _currentCookIndex) {
     return const SizedBox.shrink();
    }

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
    final portionCount = portions.length;

    // Use simplified icon card prep time text - pass cook parameter directly
    final String prepTimeText = _getIconCardPrepTimeTextForCook(cook);

    // Build stock value with prefix (empty when out of stock - label removed)
    final String stockValue = stock <= 0 ? '' : 'in Stock $stock';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 26),
      child: Row(
        children: [
          // Card 1: Prep time - icon in card, value below
          SizedBox(
            width: 62,
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
                            'icons/Time.png',
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
                if (prepTimeText.isEmpty) const SizedBox.shrink() else Text(
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
          const SizedBox(width: 25),
          // Card 2: Portion - display only, show portion count
          SizedBox(
            width: 62,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                AspectRatio(
                  aspectRatio: 1,
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      final iconSize = constraints.maxHeight * 0.57;
                      return Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFFD9D9D9),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        alignment: Alignment.center,
                        child: Image.asset(
                          'icons/Serving.png',
                          width: iconSize,
                          height: iconSize,
                          fit: BoxFit.contain,
                          color: const Color(0xFF595757),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 6),
                // Show portion count
                Text(
                  '$portionCount Portion${portionCount != 1 ? 's' : ''}',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF595757),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
          const SizedBox(width: 25),
          // Card 3: Price - icon in card (white), value below (grey)
          SizedBox(
            width: 62,
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
                            color: const Color(0xFFFF7A00),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          alignment: Alignment.center,
                          child: Image.asset(
                            'icons/Sar.png',
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
          const SizedBox(width: 25),
          // Card 4: Stock - icon in card, value below
          SizedBox(
            width: 62,
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
                            'icons/Stock.png',
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
                if (stockValue.isNotEmpty)
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
              fontSize: 22,
              fontWeight: FontWeight.w700,
              fontFamily: 'Plus Jakarta Sans',
              color: Color(0xFF1D1B19),
            ),
          ),
          const SizedBox(height: 9),
          Row(
            children: [
              // Single star + rating number + review count
              const Icon(
                Icons.star,
                size: 18,
                color: Color(0xFFFCD535),
              ),
              const SizedBox(width: 4),
              Text(
                _dishData!.rating.toStringAsFixed(1),
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  fontFamily: 'Inter',
                  color: Color(0xFF595757),
                ),
              ),
              if (_dishData!.reviewCount > 0) ...[
                Text(
                  ' (${_dishData!.reviewCount})',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    fontFamily: 'Inter',
                    color: Color(0xFF595757),
                  ),
                ),
              ],
              const SizedBox(width: 12),
              // Vertical separator
              const Text(
                '|',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w400,
                  color: Color(0xFF595757),
                ),
              ),
              const SizedBox(width: 12),
              // Cook avatar - circular
              ClipOval(
                child: Container(
                  width: 24,
                  height: 24,
                  color: const Color(0xFFD9D9D9),
                  child: _cookVariants.isNotEmpty && _currentCookIndex < _cookVariants.length
                      ? Image(
                          image: getImageProvider(_cookVariants[_currentCookIndex].cookImage),
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const Icon(Icons.person, size: 16, color: Color(0xFF595757)),
                        )
                      : const Icon(Icons.person, size: 16, color: Color(0xFF595757)),
                ),
              ),
              const SizedBox(width: 8),
              // Cook name with orange underline
              GestureDetector(
                onTap: null, // TODO: Navigate to cook profile
                child: Text(
                  _cookVariants.isNotEmpty && _currentCookIndex < _cookVariants.length
                      ? _cookVariants[_currentCookIndex].cookName
                      : '',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    fontFamily: 'Inter',
                    color: Color(0xFF595757),
                    decoration: TextDecoration.underline,
                    decorationColor: Color(0xFFFF7A00),
                    decorationThickness: 2,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // Cook rating with star icon
              if (_cookVariants.isNotEmpty && _currentCookIndex < _cookVariants.length) ...[
                const Icon(Icons.star, size: 16, color: Color(0xFFFCD535)),
                const SizedBox(width: 4),
                Text(
                  '${_cookVariants[_currentCookIndex].cookRating.toStringAsFixed(1)}(${_cookVariants[_currentCookIndex].cookReviews})',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    fontFamily: 'Inter',
                    color: Color(0xFF595757),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDescription(bool isRTL) {
    // Get description from current offer or dish data
    String description = '';
    
    // First try from current cook variant's fullOfferData
    if (_cookVariants.isNotEmpty && _currentCookIndex < _cookVariants.length) {
      final offerData = _cookVariants[_currentCookIndex].fullOfferData;
      if (offerData != null) {
        // Use bilingual: longDescriptionEn → descriptionEn (English), longDescriptionAr → descriptionAr (Arabic)
        if (isRTL) {
          description = (offerData['longDescriptionAr'] as String?) ?? '';
          if (description.isEmpty) {
            description = (offerData['descriptionAr'] as String?) ?? '';
          }
        } else {
          description = (offerData['longDescriptionEn'] as String?) ?? '';
          if (description.isEmpty) {
            description = (offerData['descriptionEn'] as String?) ?? '';
          }
        }
      }
    }
    
    // Fallback to _dishData description
    if (description.isEmpty && _dishData != null) {
      description = _dishData!.description;
    }
    
    // Also try getting directly from food provider's current offers
    if (description.isEmpty) {
      final foodProvider = Provider.of<FoodProvider>(context, listen: false);
      final offers = foodProvider.currentOffers;
      if (offers.isNotEmpty) {
        final currentOffer = offers[_currentCookIndex < offers.length ? _currentCookIndex : 0];
        if (isRTL) {
          description = currentOffer.longDescription ?? currentOffer.description ?? '';
        } else {
          description = currentOffer.longDescription ?? currentOffer.description ?? '';
        }
      }
    }
    
    if (description.isEmpty) {
      return const SizedBox.shrink();
    }
    
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Text(
        description,
        style: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w400,
          fontFamily: 'Inter',
          color: Color(0xFF595757),
          height: 1.5,
        ),
      ),
    );
  }

  // New: Build Preparation Time section
  Widget _buildPreparationTimeSection(bool isRTL) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            isRTL ? 'وقت التحضير' : 'Preparation Time',
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              fontFamily: 'Plus Jakarta Sans',
              color: Color(0xFF1D1B19),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _getPrepTimeDisplayText(isRTL, includeLabel: false),
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w400,
              fontFamily: 'Inter',
              color: Color(0xFF595757),
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }

  // New: Build cook section for dish profile (now integrated into rating row)
  Widget _buildCookSection(bool isRTL) {
    // Cook section is now inline with rating, so this returns empty
    return const SizedBox.shrink();
  }

  // New: Build inline portion selection section
  Widget _buildPortionSelectionSection(bool isRTL) {
    if (_cookVariants.isEmpty || _currentCookIndex >= _cookVariants.length) {
      return const SizedBox.shrink();
    }
    
    final cook = _cookVariants[_currentCookIndex];
    final allPortions = _getPortionOptions(cook.fullOfferData ?? {});
    
    // CRITICAL: Show ALL portions (even out-of-stock), just disable them
    // Show section if 1+ portions available (matching web behavior)
    if (allPortions.isEmpty) {
      return const SizedBox.shrink();
    }
    
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            isRTL ? 'اختر الحجم' : 'Select Portion Size',
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              fontFamily: 'Plus Jakarta Sans',
              color: Color(0xFF1D1B19),
            ),
          ),
          const SizedBox(height: 12),
          ...allPortions.map((portion) {
            final isSelected = _selectedPortionKey == portion['portionKey'];
            final price = portion['price'] ?? 0;
            final stock = portion['stock'] as int? ?? 0;
            final isOutOfStock = stock <= 0;
            final label = _getPortionLabel(portion, isRTL);
            // Generate subtitle based on portion key
            String subtitle = '';
            final portionKey = (portion['portionKey'] as String?).toString().toLowerCase();
            if (portionKey.contains('single') || portionKey.contains('small') || portionKey.contains('medium')) {
              subtitle = isRTL ? 'مثالي لشخص واحد' : 'Perfect for 1 person';
            } else if (portionKey.contains('large')) {
              subtitle = isRTL ? 'مثالي لشخصين' : 'Perfect for 2 people';
            } else if (portionKey.contains('family') || portionKey.contains('xlarge')) {
              subtitle = isRTL ? 'مثالي لـ 3-4 أشخاص' : 'Perfect for 3-4 people';
            }
            
            return GestureDetector(
              onTap: isOutOfStock ? null : () {
                setState(() {
                  _selectedPortion = portion;
                  _selectedPortionKey = portion['portionKey'] as String?;
                });
              },
              child: Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                decoration: BoxDecoration(
                  color: isOutOfStock ? const Color(0xFFF5F5F5) : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isSelected ? const Color(0xFFFF7A00) : (isOutOfStock ? const Color(0xFFE0E0E0) : const Color(0xFFE8E8E8)),
                    width: isSelected ? 2 : 1.5,
                  ),
                ),
                child: Row(
                  children: [
                    // Radio button
                    Container(
                      width: 24,
                      height: 24,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: isSelected ? const Color(0xFFFF7A00) : const Color(0xFFD0D0D0),
                          width: 2,
                        ),
                      ),
                      child: isSelected
                          ? Center(
                              child: Container(
                                width: 14,
                                height: 14,
                                decoration: const BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: Color(0xFFFF7A00),
                                ),
                              ),
                            )
                          : null,
                    ),
                    const SizedBox(width: 16),
                    // Label and subtitle
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  label,
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                    fontFamily: 'Inter',
                                    color: isOutOfStock ? const Color(0xFFB0B0B0) : const Color(0xFF1D1B19),
                                  ),
                                ),
                              ),
                              if (isOutOfStock)
                                Text(
                                  isRTL ? 'نفذ' : 'Out of Stock',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    fontFamily: 'Inter',
                                    color: Color(0xFFFF3B30),
                                  ),
                                ),
                            ],
                          ),
                          if (subtitle.isNotEmpty)
                            Text(
                              subtitle,
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w400,
                                fontFamily: 'Inter',
                                color: isOutOfStock ? const Color(0xFFC0C0C0) : const Color(0xFF595757),
                              ),
                            ),
                        ],
                      ),
                    ),
                    // Price
                    Text(
                      'SAR ${price.toStringAsFixed(2)}',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        fontFamily: 'Inter',
                        color: isSelected ? const Color(0xFFFF7A00) : const Color(0xFF1D1B19),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ],
      ),
    );
  }

  // New: Build "More from this Cook" section
  Widget _buildMoreFromThisCook(bool isRTL) {
    // Get current cook info
    if (_cookVariants.isEmpty || _currentCookIndex >= _cookVariants.length) {
      return const SizedBox.shrink();
    }
    
    final currentCook = _cookVariants[_currentCookIndex];
    final currentCookId = currentCook.cookId;
    final currentAdminDishId = _dishData?.id;
    
    // Get FoodProvider and AuthProvider
    final foodProvider = Provider.of<FoodProvider>(context, listen: false);
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final countryProvider = Provider.of<CountryProvider>(context, listen: false);
    final headers = authProvider.getAuthHeaders();
    final countryCode = countryProvider.countryCode ?? 'SA';
    
    // Only create new Future if cook changed
    if (_moreFromThisCookFuture == null || _moreFromThisCookCookId != currentCookId) {
      _moreFromThisCookFuture = _getDishesByCook(currentCookId, currentAdminDishId, foodProvider, headers, countryCode);
      _moreFromThisCookCookId = currentCookId;
    }
    
    // Use FutureBuilder to fetch and display dishes
    return FutureBuilder<List<Food>>(
      future: _moreFromThisCookFuture,
      builder: (context, snapshot) {
        // Show nothing while loading or if no dishes
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const SizedBox.shrink();
        }
        
        if (!snapshot.hasData || snapshot.data!.isEmpty) {
          return const SizedBox.shrink();
        }
        
        final dishes = snapshot.data!;
        
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Section Title
              Text(
                isRTL ? 'المزيد من هذا الطباخ' : 'More from this Cook',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  fontFamily: 'Plus Jakarta Sans',
                  color: Color(0xFF1D1B19),
                ),
              ),
              const SizedBox(height: 12),
              // Row of 2 dishes - exact same layout as Featured support dishes
              Row(
                children: [
                  // Left card
                  Expanded(
                    child: _buildMoreFromThisCookCard(dishes[0], currentCookId, currentCook, isRTL),
                  ),
                  // Spacing between cards - exact same as Featured
                  if (dishes.length > 1) ...[
                    const SizedBox(width: 12),
                    // Right card
                    Expanded(
                      child: _buildMoreFromThisCookCard(dishes[1], currentCookId, currentCook, isRTL),
                    ),
                  ],
                ],
              ),
            ],
          ),
        );
      },
    );
  }
  
  // Helper to get dishes by cook (reusing existing data or fetching)
  Future<List<Food>> _getDishesByCook(
    String cookId,
    String? excludeAdminDishId,
    FoodProvider foodProvider,
    Map<String, String> headers,
    String countryCode,
  ) async {
    debugPrint('\n🔍 MORE FROM THIS COOK - FETCHING:');
    debugPrint('   Current cookId: $cookId');
    debugPrint('   Current adminDishId (to exclude): $excludeAdminDishId');
    debugPrint('   Country: $countryCode');
    
    // MUST use /by-cook/:cookId endpoint because:
    // 1. Global lists (viewedDishes, featuredDishes, adminDishesWithStats) have cooks=[] (empty)
    // 2. Cannot determine which cook offers which dish from those sources
    // 3. Only /by-cook endpoint returns offers filtered by specific cook
    
    final fetchedDishes = await foodProvider.fetchDishesByCook(
      headers,
      cookId: cookId,
      excludeAdminDishId: excludeAdminDishId,
      limit: 10,
      countryCode: countryCode,
    );
    
    debugPrint('   Fetched ${fetchedDishes.length} dishes for this cook');
    
    // Filter out current dish and shuffle
    final filtered = fetchedDishes.where((d) => d.id != excludeAdminDishId).toList();
    debugPrint('   After excluding current dish: ${filtered.length} dishes');
    
    filtered.shuffle();
    final selected = filtered.take(2).toList();
    
    debugPrint('   Selected ${selected.length} dishes:');
    for (int i = 0; i < selected.length; i++) {
      debugPrint('     [$i] ${selected[i].name} (adminDishId: ${selected[i].id})');
    }
    
    if (selected.isEmpty) {
      debugPrint('   ⚠️ No other dishes from this cook - section will be hidden');
    }
    debugPrint('\n');
    
    return selected;
  }
  
  // Build card for "More from this Cook" - EXACT copy of Featured support dish card
  Widget _buildMoreFromThisCookCard(Food dish, String preSelectedCookId, CookOffer currentCook, bool isRTL) {
    final String imageUrlRaw = dish.imageUrl ?? dish.image ?? '';
    final String imageUrl = getAbsoluteUrl(imageUrlRaw);
    final String displayName = isRTL ? (dish.nameAr ?? dish.name) : dish.name;
    final String displayDesc = dish.description;
    
    // Cook rating info
    final String cookName = currentCook.cookName;
    final double cookRating = currentCook.cookRating;
    final int cookReviews = currentCook.cookReviews;
    
    return GestureDetector(
      onTap: () {
        debugPrint('\n🎯 [MORE FROM COOK] Tapping dish card:');
        debugPrint('   dish.id (adminDishId): ${dish.id}');
        debugPrint('   displayName: $displayName');
        debugPrint('   preSelectedCookId: $preSelectedCookId');
        debugPrint('   currentCook.cookId: ${currentCook.cookId}');
        debugPrint('   Match: ${preSelectedCookId == currentCook.cookId}');
        
        // Navigate directly to dish profile, skipping cook offer sheet
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => DishDetailScreen(
              adminDishId: dish.id,
              dishName: displayName,
              // Pre-select the same cook
              initialCookId: preSelectedCookId,
            ),
          ),
        );
      },
      child: Column(
        crossAxisAlignment: isRTL ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          // 1:1 Square Image - EXACT same as Featured support dish card
          AspectRatio(
            aspectRatio: 1, // 1:1 square ratio
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                color: const Color(0xFFD9D9D9),
              ),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: LayoutBuilder(
                      builder: (context, constraints) {
                        // Get container dimensions
                        final containerHeight = constraints.maxHeight;
                        final containerWidth = constraints.maxWidth;
                        
                        return imageUrl.isNotEmpty && !imageUrlRaw.startsWith('assets/')
                            ? CachedNetworkImage(
                                imageUrl: imageUrl,
                                fit: BoxFit.fitHeight,
                                alignment: Alignment.center,
                                placeholder: (_, __) => Container(color: const Color(0xFFE0E0E0)),
                                errorWidget: (_, __, ___) => Container(
                                  color: const Color(0xFFE0E0E0),
                                  child: const Icon(Icons.restaurant, size: 32, color: Color(0xFF969494)),
                                ),
                              )
                            : Container(
                                color: const Color(0xFFE0E0E0),
                                child: const Icon(Icons.restaurant, size: 32, color: Color(0xFF969494)),
                              );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          const SizedBox(height: 8),
                    
          // Row with Name/Description on left, View button on right - EXACT same layout
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Name and Description column
              Expanded(
                child: Column(
                  crossAxisAlignment: isRTL ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                  children: [
                    // Dish Name - Noto Serif 18px #40403F - EXACT same style
                    Text(
                      displayName,
                      style: const TextStyle(
                        fontFamily: 'Noto Serif',
                        color: Color(0xFF40403F),
                        fontSize: 18,
                        fontWeight: FontWeight.w400,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: isRTL ? TextAlign.right : TextAlign.left,
                    ),
                    
                    // Dish Description - Inter bold 10px #969494 - EXACT same style
                    if (displayDesc.isNotEmpty) ...
                      [
                      const SizedBox(height: 2),
                      Text(
                        displayDesc,
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          color: Color(0xFF969494),
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: isRTL ? TextAlign.right : TextAlign.left,
                      ),
                    ],
                  ],
                ),
              ),
                        
              const SizedBox(width: 8),
                        
              // View Icon button - no background, aligned right (flex to prevent cropping) - EXACT same
              const SizedBox(
                width: 28,
                height: 28,
                child: Padding(
                  padding: EdgeInsets.only(right: 2),
                  child: Image(
                    image: AssetImage('icons/View.png'),
                    fit: BoxFit.contain,
                  ),
                ),
              ),
            ],
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
    final totalPrice = (_selectedPortion?['price'] ?? currentCook.price) * _quantity;
    
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Quantity selector
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Decrease button - grey
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
                  color: Color(0xFFD9D9D9),
                  shape: BoxShape.circle,
                ),
                child: const Center(
                  child: Icon(
                    Icons.remove,
                    size: 24,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            // Quantity display
            Text(
              _quantity.toString(),
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                fontFamily: 'Inter',
                color: Color(0xFF1D1B19),
              ),
            ),
            const SizedBox(width: 12),
            // Increase button - orange
            GestureDetector(
              onTap: () {
                // CRITICAL: Use selected portion stock, not legacy offer stock
                final int maxStock = (_selectedPortion?['stock'] as int? ?? currentCook.availableQuantity);
                if (_quantity < maxStock) {
                  setState(() {
                    _quantity++;
                  });
                }
              },
              child: Container(
                width: 40,
                height: 40,
                decoration: const BoxDecoration(
                  color: Color(0xFFFF7A00),
                  shape: BoxShape.circle,
                ),
                child: const Center(
                  child: Icon(
                    Icons.add,
                    size: 24,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(width: 34),
        // Total price
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            const Text(
              'TOTAL PRICE',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                fontFamily: 'Inter',
                color: Color(0xFF595757),
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              'SAR ${totalPrice.toStringAsFixed(2)}',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                fontFamily: 'Inter',
                color: Color(0xFFFF7A00),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildAddToCartButton(bool isRTL) {
    final currentCook = _cookVariants[_currentCookIndex];
    final int stock = (_selectedPortion?['stock'] as int?) ?? 0;
    final bool canAddToCart = _quantity > 0 && stock > 0;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: GestureDetector(
        onTap: canAddToCart ? () => _addToCart() : null,
        child: Container(
          height: 56,
          decoration: BoxDecoration(
            color: canAddToCart
                ? const Color(0xFFFF7A00)
                : const Color(0xFFE0E0E0),
            borderRadius: BorderRadius.circular(16),
          ),
          alignment: Alignment.center,
          child: Text(
            isRTL ? 'أضف إلى السلة' : 'Add to Cart',
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              fontFamily: 'Inter',
              color: Colors.white,
            ),
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
            isRTL ? 'طريقة التسليم' : 'Fulfillment Type',
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              fontFamily: 'Plus Jakarta Sans',
              color: Color(0xFF1D1B19),
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
                      padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 16),
                      decoration: BoxDecoration(
                        color: _selectedFulfillment == 'pickup'
                            ? const Color(0xFFFFE5CC)
                            : Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: _selectedFulfillment == 'pickup'
                              ? const Color(0xFFFF7A00)
                              : const Color(0xFFE0E0E0),
                          width: 2,
                        ),
                      ),
                      alignment: Alignment.center,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.storefront,
                            size: 24,
                            color: _selectedFulfillment == 'pickup'
                                ? const Color(0xFFFF7A00)
                                : const Color(0xFF595757),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            isRTL ? 'استلام من المطبخ' : 'KITCHEN PICKUP',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              fontFamily: 'Inter',
                              color: _selectedFulfillment == 'pickup'
                                  ? const Color(0xFFFF7A00)
                                  : const Color(0xFF595757),
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
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
                      padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 16),
                      decoration: BoxDecoration(
                        color: _selectedFulfillment == 'delivery'
                            ? const Color(0xFFFFE5CC)
                            : Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: _selectedFulfillment == 'delivery'
                              ? const Color(0xFFFF7A00)
                              : const Color(0xFFE0E0E0),
                          width: 2,
                        ),
                      ),
                      alignment: Alignment.center,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.local_shipping_outlined,
                            size: 24,
                            color: _selectedFulfillment == 'delivery'
                                ? const Color(0xFFFF7A00)
                                : const Color(0xFF595757),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            isRTL ? 'التوصيل' : 'DELIVERY',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              fontFamily: 'Inter',
                              color: _selectedFulfillment == 'delivery'
                                  ? const Color(0xFFFF7A00)
                                  : const Color(0xFF595757),
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
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
