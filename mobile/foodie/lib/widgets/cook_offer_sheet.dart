import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../models/food.dart';
import '../providers/auth_provider.dart';
import '../providers/food_provider.dart';
import '../providers/language_provider.dart';
import '../utils/image_url_utils.dart';
import '../utils/prep_time_utils.dart'; // Prep time calculation for filtering

/// Helper to get cook image URL - returns null if no image
String? _getCookImageUrl(dynamic cook) {
  if (cook == null) return null;
  
  String? imageUrl;
  
  // Handle DishOffer which has 'cook' property (CookInfo object)
  if (cook is DishOffer) {
    imageUrl = cook.cook.profilePhoto;
  }
  // Handle CookInfo directly
  else if (cook is CookInfo) {
    imageUrl = cook.profilePhoto;
  }
  // Handle legacy CookOffer with fullOfferData
  else if (cook is CookOffer && cook.fullOfferData != null) {
    final cookData = cook.fullOfferData!['cook'];
    if (cookData != null) {
      imageUrl = cookData['profilePhoto'] ?? cookData['image'] ?? cookData['avatar'];
    }
  }
  // Fallback: try direct fields
  else {
    imageUrl = cook.profilePhoto ?? cook.profileImage ?? cook.image ?? cook.avatar;
  }
  
  // Return null if no image found
  if (imageUrl == null || imageUrl.isEmpty) return null;
  
  // Return the URL through getAbsoluteUrl to ensure proper prefix
  return getAbsoluteUrl(imageUrl);
}

/// Show cook selector sheet - lists cooks with min price
/// Returns map with cookId, offerId, cookIndex, or null on cancel
/// forceShow: if true, show sheet for 1 cook (don't auto-return), show "No offers" sheet for 0 cooks
Future<Map<String, dynamic>?> showCookOfferSheet({
  required BuildContext context,
  required String adminDishId,
  required FoodProvider foodProvider,
  required AuthProvider authProvider,
  required LanguageProvider languageProvider,
  bool forceShow = false,
  String? fulfillmentFilter, // 'delivery', 'pickup', or null for 'all'
  String? prepTimeFilter, // '30', '60', '90', or null for 'all'
  double? distanceFilter, // max distance in km, or null for 'all'
  bool topRatedOnly = false, // filter to top-rated cooks only
}) async {
  // Open sheet immediately with loading state
  return await showModalBottomSheet<Map<String, dynamic>>(
    context: context,
    isScrollControlled: true,
    builder: (BuildContext sheetContext) {
      return _CookOfferSheetContent(
        adminDishId: adminDishId,
        foodProvider: foodProvider,
        authProvider: authProvider,
        languageProvider: languageProvider,
        forceShow: forceShow,
        fulfillmentFilter: fulfillmentFilter,
        prepTimeFilter: prepTimeFilter,
        distanceFilter: distanceFilter,
        topRatedOnly: topRatedOnly,
      );
    },
  );
}

class _CookOfferSheetContent extends StatefulWidget {
  final String adminDishId;
  final FoodProvider foodProvider;
  final AuthProvider authProvider;
  final LanguageProvider languageProvider;
  final bool forceShow;
  final String? fulfillmentFilter;
  final String? prepTimeFilter;
  final double? distanceFilter;
  final bool topRatedOnly;

  const _CookOfferSheetContent({
    required this.adminDishId,
    required this.foodProvider,
    required this.authProvider,
    required this.languageProvider,
    this.forceShow = false,
    this.fulfillmentFilter,
    this.prepTimeFilter,
    this.distanceFilter,
    this.topRatedOnly = false,
  });

  @override
  State<_CookOfferSheetContent> createState() => _CookOfferSheetContentState();
}

class _CookOfferSheetContentState extends State<_CookOfferSheetContent> {
  bool _isLoading = true;
  bool _hasError = false;
  List<dynamic> _offers = [];

  @override
  void initState() {
    super.initState();
    // Defer to post-frame to avoid notifyListeners during build
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _loadOffers();
    });
  }

  Future<void> _loadOffers() async {
    final headers = widget.authProvider.getAuthHeaders();
    
    try {
      await widget.foodProvider.fetchOffersByAdminDish(widget.adminDishId, headers);
      setState(() {
        _offers = widget.foodProvider.currentOffers;
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _hasError = true;
          _isLoading = false;
        });
      }
    }
  }
  
  @override
  Widget build(BuildContext context) {
    final isRTL = widget.languageProvider.isArabic;
      
    // Loading state - show skeleton immediately
    if (_isLoading) {
      return _buildLoadingSheet(isRTL);
    }
      
    // Error state
    if (_hasError) {
      return _buildErrorSheet(isRTL);
    }
      
    // Empty offers state
    if (_offers.isEmpty) {
      return _buildEmptyOffersSheet(isRTL);
    }
    
    // Apply ALL offer-level filters together
    // A dish stays visible if at least ONE offer satisfies ALL active filters
    List<dynamic> filteredOffers = _offers;
    
    // Check if any offer-level filter is active
    final bool hasOfferFilters = 
      (widget.fulfillmentFilter != null && widget.fulfillmentFilter != 'All') ||
      (widget.prepTimeFilter != null && widget.prepTimeFilter != '60') ||
      (widget.distanceFilter != null && widget.distanceFilter! < 30) ||
      widget.topRatedOnly;
    
    if (hasOfferFilters) {
      filteredOffers = _offers.where((offer) {
        // ALL filters must pass for the SAME offer
        
        // 1. Fulfillment filter
        if (widget.fulfillmentFilter != null && widget.fulfillmentFilter != 'All') {
          final fulfillmentModes = offer.fulfillmentModes as Map<String, dynamic>?;
          if (fulfillmentModes == null) return false;
          
          if (widget.fulfillmentFilter == 'Delivery') {
            if (fulfillmentModes['delivery'] != true) return false;
          } else if (widget.fulfillmentFilter == 'Pickup') {
            if (fulfillmentModes['pickup'] != true) return false;
          }
        }
        
        // 2. Preparation Time filter - use PrepTimeUtils (same as Dish Profile)
        if (widget.prepTimeFilter != null && widget.prepTimeFilter != '60') {
          final maxPrepTime = int.parse(widget.prepTimeFilter!);
          final prepReadyConfig = offer.prepReadyConfig;
          final prepTime = offer.prepTime ?? 30;
          
          // Compute prep time using same logic as Dish Profile info card
          final prepResult = PrepTimeUtils.computePrepTime(
            prepReadyConfig,
            cookCountryCode: offer.cook.countryCode,
          );
          
          // Check if computed prep time is within selected bucket
          if (prepResult.prepTimeMinutes > maxPrepTime) return false;
        }
        
        // 3. Distance filter - requires location services (TODO)
        if (widget.distanceFilter != null && widget.distanceFilter! < 30) {
          // TODO: Implement distance calculation using cook location vs user location
          // Requires:
          // - User location from AddressProvider
          // - Cook location from offer.cook.location or similar
          // - Haversine formula or similar distance calculation
          // For now, pass all offers (filter not functional yet)
        }
        
        // 4. Top-rated cooks filter
        if (widget.topRatedOnly) {
          final isTopRated = offer.cook.isTopRated;
          if (!isTopRated) return false;
        }
        
        // Offer passed all active filters
        return true;
      }).toList();
      
      // If no offers match all filters, show empty state
      if (filteredOffers.isEmpty) {
        return _buildEmptyOffersSheet(isRTL);
      }
    }
      
    // Compute min price for each cook (price of smallest portion = first variant)
    final List<Map<String, dynamic>> cooksWithPrice = [];
    for (int i = 0; i < filteredOffers.length; i++) {
      final offer = filteredOffers[i];
      
      // Find the original index in _offers list (not the filtered list index)
      // This is critical: DishDetailScreen needs the index in the full offers list
      final originalIndex = _offers.indexOf(offer);
      
      final variants = offer.variants as List<dynamic>?;
      int smallestPortionPrice = 0;
      bool hasStock = false;
        
      if (variants != null && variants.isNotEmpty) {
        // Find minimum priced variant = smallest portion / lowest starting price
        for (final v in variants) {
          final price = (v['price'] as num?)?.toInt() ?? 0;
          final stock = (v['stock'] as int?) ?? 0;
          if (stock > 0) hasStock = true;
          if (price > 0 && (smallestPortionPrice == 0 || price < smallestPortionPrice)) {
            smallestPortionPrice = price;
          }
        }
        // If no price found from variants, use offer price
        if (smallestPortionPrice == 0) {
          smallestPortionPrice = offer.price.toInt();
        }
      } else {
        // Single offer without variants
        smallestPortionPrice = offer.price.toInt();
        if ((offer.stock ?? 0) > 0) hasStock = true;
      }
        
      cooksWithPrice.add({
        'offer': offer,
        'cookName': offer.cook.storeName ?? offer.cook.name,
        'rating': offer.cook.rating ?? 0.0,
        'cookImage': _getCookImageUrl(offer.cook),
        'minPrice': smallestPortionPrice,
        'hasStock': hasStock,
        'index': originalIndex, // Use original index, not filtered index
      });
    }
  
    // If only one cook and forceShow is false, auto-return (old behavior)
    if (cooksWithPrice.length == 1 && !widget.forceShow) {
      final c = cooksWithPrice.first;
      final offer = c['offer'];
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.pop(context, {
          'cookId': offer.cook.id,
          'offerId': offer.id,
          'cookName': c['cookName'],
          'cookIndex': c['index'],
        });
      });
      return Container(); // Return empty container while sheet closes
    }
  
    final screenHeight = MediaQuery.of(context).size.height;
    final sheetHeight = screenHeight * 0.88;
      
    // Calculate badges for each cook
    // Find min price and min prep time for badge calculations
    final int globalMinPrice = cooksWithPrice.isNotEmpty ? (cooksWithPrice.map((c) => c['minPrice'] as int).reduce((a, b) => a < b ? a : b)) : 0;
    int globalMinPrepTime = 999999;
    for (final offer in _offers) {
      final prepTime = (offer.prepTime as int?) ?? 30;
      if (prepTime < globalMinPrepTime) globalMinPrepTime = prepTime;
    }
    double globalMaxRating = 0;
    for (final offer in _offers) {
      final rating = (offer.cook.rating as num?)?.toDouble() ?? 0.0;
      if (rating > globalMaxRating) globalMaxRating = rating;
    }
      
    // Add badge info to each cook
    final List<Map<String, dynamic>> cooksWithBadges = [];
    for (final c in cooksWithPrice) {
      final minPrice = c['minPrice'] as int;
      final offer = c['offer'];
      final prepTime = (offer.prepTime as int?) ?? 30;
      final rating = c['rating'] as double;
        
      String? badge;
      if (minPrice == globalMinPrice && globalMinPrice > 0) {
        badge = 'Best price';
      } else if (prepTime == globalMinPrepTime) {
        badge = 'Fastest';
      } else if (rating >= globalMaxRating && globalMaxRating > 0) {
        badge = 'Top Rated';
      }
        
      cooksWithBadges.add({
        ...c,
        'badge': badge,
        'prepTime': prepTime,
      });
    }
      
    return SizedBox(
      height: sheetHeight,
      child: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
          child: Column(
            mainAxisSize: MainAxisSize.max,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header with close button - tighter spacing
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isRTL ? 'اختر المطبخ' : 'Select a Kitchen',
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${cooksWithBadges.length} ${isRTL ? 'مطابخ متاحة' : 'kitchens available'}',
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF5F5F5),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(
                        Icons.close,
                        size: 20,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Expanded(
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: cooksWithBadges.length,
                  itemBuilder: (listContext, idx) {
                    final c = cooksWithBadges[idx];
                    final cookName = c['cookName'] as String;
                    final rating = c['rating'] as double;
                    final cookImage = c['cookImage'] as String?;
                    final minPrice = c['minPrice'] as int;
                    final hasStock = c['hasStock'] as bool;
                    final offer = c['offer'];
                    final badge = c['badge'] as String?;
                    final prepTime = c['prepTime'] as int;
                    final isDisabled = !hasStock;
                    final reviewCount = offer.ratings?['count'] ?? 0; // FIX: Use real exact dish/offer rating count

                    return GestureDetector(
                      onTap: isDisabled ? null : () => Navigator.pop(context, {
                        'cookId': offer.cook.id,
                        'offerId': offer.id,
                        'cookName': cookName,
                        'cookIndex': c['index'],
                      }),
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: const Color(0xFFE8E8E8),
                            width: 1,
                          ),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Badge at top-left
                              if (badge != null) ...[
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFFF8E1),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(badge == 'Fastest' ? Icons.bolt : Icons.emoji_events, size: 12, color: const Color(0xFFFFB300)),
                                      const SizedBox(width: 3),
                                      Text(isRTL ? (badge == 'Best Price' ? 'أفضل سعر' : badge == 'Fastest' ? 'الأسرع' : 'الأعلى تقييماً') : badge, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF795400))),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 8),
                              ],
                              // Main row: avatar | name+rating | price
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.center,
                                children: [
                                  // Avatar - rounded square
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(12),
                                    child: Container(
                                      width: 40,
                                      height: 40,
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFEEEEEE),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: cookImage != null && cookImage.isNotEmpty
                                          ? Image(image: getImageProvider(cookImage), width: 40, height: 40, fit: BoxFit.cover)
                                          : const Icon(Icons.storefront, size: 20, color: Color(0xFFAAAAAA)),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  // Cook name + rating
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(cookName, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: isDisabled ? const Color(0xFFAAAAAA) : AppTheme.textPrimary), maxLines: 1, overflow: TextOverflow.ellipsis),
                                        const SizedBox(height: 2),
                                        Row(children: [
                                          const Icon(Icons.star, size: 12, color: Color(0xFFFCD535)),
                                          const SizedBox(width: 2),
                                          Text(rating.toStringAsFixed(1), style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: isDisabled ? const Color(0xFFAAAAAA) : AppTheme.textPrimary)),
                                          Text(' ($reviewCount)', style: TextStyle(fontSize: 11, color: isDisabled ? const Color(0xFFAAAAAA) : AppTheme.textSecondary)),
                                        ]),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  // Price with OSAR icon on the right side - vertically centered
                                  Padding(
                                    padding: const EdgeInsets.only(right: 16),
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Image.asset(
                                          'assets/icons/OSAR.png',
                                          width: 24,
                                          height: 24,
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          '$minPrice+',
                                          style: TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w500,
                                            color: isDisabled ? const Color(0xFFAAAAAA) : Colors.black,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              // Divider
                              Container(height: 1, color: const Color(0xFFEEEEEE)),
                              const SizedBox(height: 8),
                              // Bottom meta row: prep time
                              Row(children: [
                                Icon(Icons.access_time, size: 12, color: isDisabled ? const Color(0xFFAAAAAA) : const Color(0xFF747474)),
                                const SizedBox(width: 3),
                                Text(isRTL ? 'خلال $prepTime دقيقة' : 'Ready in $prepTime min', style: TextStyle(fontSize: 11, color: isDisabled ? const Color(0xFFAAAAAA) : const Color(0xFF747474))),
                              ]),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ));
  }

  Widget _buildLoadingSheet(bool isRTL) {
    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.88,
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 16),
            Text(
              isRTL ? 'جاري تحميل المطابخ...' : 'Loading kitchens...',
              style: const TextStyle(fontSize: 16, color: AppTheme.textSecondary),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorSheet(bool isRTL) {
    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.88,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
        child: Column(
          mainAxisSize: MainAxisSize.max,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              isRTL ? 'حدث خطأ' : 'Error',
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
            ),
            const SizedBox(height: 16),
            Text(
              isRTL ? 'فشل تحميل المطابخ، يرجى المحاولة مرة أخرى' : 'Failed to load kitchens, please try again',
              style: const TextStyle(fontSize: 14, color: AppTheme.textSecondary),
            ),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.accentColor,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                child: Text(isRTL ? 'حسناً' : 'OK', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyOffersSheet(bool isRTL) {
    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.88,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
        child: Column(
          mainAxisSize: MainAxisSize.max,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              isRTL ? 'لا يوجد عروض متاحة' : 'No offers available',
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
            ),
            const SizedBox(height: 16),
            Text(
              isRTL ? 'للأسف، لا توجد عروض لهذا الطبق حالياً' : 'Unfortunately, there are no offers for this dish at the moment',
              style: const TextStyle(fontSize: 14, color: AppTheme.textSecondary),
            ),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.accentColor,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                child: Text(isRTL ? 'حسناً' : 'OK', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
