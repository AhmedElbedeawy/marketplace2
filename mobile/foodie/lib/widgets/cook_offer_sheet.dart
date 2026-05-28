import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../models/food.dart';
import '../providers/auth_provider.dart';
import '../providers/food_provider.dart';
import '../providers/language_provider.dart';
import '../utils/arabic_utils.dart';
import '../utils/image_url_utils.dart';
import '../utils/prep_time_utils.dart'; // Prep time calculation for filtering

/// Haversine formula — returns distance in km between two lat/lng points
double _haversineDistanceKm(double lat1, double lng1, double lat2, double lng2) {
  const R = 6371.0; // Earth radius in km
  final dLat = (lat2 - lat1) * math.pi / 180;
  final dLng = (lng2 - lng1) * math.pi / 180;
  final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
      math.cos(lat1 * math.pi / 180) *
          math.cos(lat2 * math.pi / 180) *
          math.sin(dLng / 2) *
          math.sin(dLng / 2);
  return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
}

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
  double? userLat, // user's current/browsing latitude
  double? userLng, // user's current/browsing longitude
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
        userLat: userLat,
        userLng: userLng,
      );
    },
  );
}

// Helper to build dish image with smart crop
Widget _buildDishImage(DishOffer offer) {
  final images = offer.images;
  if (images.isEmpty) {
    return const Icon(Icons.restaurant, size: 24, color: Color(0xFFAAAAAA));
  }
  
  final imageUrl = images.first;
  final fullUrl = getAbsoluteUrl(imageUrl);
  
  return Image.network(
    fullUrl,
    fit: BoxFit.cover,
    errorBuilder: (_, __, ___) => const Icon(Icons.restaurant, size: 24, color: Color(0xFFAAAAAA)),
  );
}

// Helper to get prep time display text (same as Dish Profile page)
String _getPrepTimeDisplayText(DishOffer offer, bool isRTL) {
  final prepReadyConfig = offer.prepReadyConfig;
  final int prepTime = offer.prepTime;
  
  // For cutoff mode: show "Ready by <day> <HH:mm>"
  if (prepReadyConfig != null && prepReadyConfig['optionType'] == 'cutoff') {
    final cookCountryCode = offer.cook.countryCode;
    return PrepTimeUtils.getCutoffReadyByText(
      prepReadyConfig,
      isRTL: isRTL,
      cookCountryCode: cookCountryCode,
    );
  }
  
  // For fixed/range modes: use standard display text
  return PrepTimeUtils.getPrepTimeDisplayText(
    prepReadyConfig,
    prepTime,
    isRTL: isRTL,
    includeLabel: false, // Don't include "Prep Time:" prefix
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
  final double? userLat;
  final double? userLng;

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
    this.userLat,
    this.userLng,
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
      if (!mounted) return; // Sheet was dismissed while loading — do nothing
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
          
          // Compute prep time using same logic as Dish Profile info card
          final prepResult = PrepTimeUtils.computePrepTime(
            prepReadyConfig,
            cookCountryCode: offer.cook.countryCode,
          );
          
          // Check if computed prep time is within selected bucket
          if (prepResult.prepTimeMinutes > maxPrepTime) return false;
        }
        
        // 3. Distance filter — Haversine against browsing/saved address location
        if (widget.distanceFilter != null &&
            widget.distanceFilter! < 30 &&
            widget.userLat != null &&
            widget.userLng != null) {
          final cookLat = (offer.cook.location?['lat'] as num?)?.toDouble();
          final cookLng = (offer.cook.location?['lng'] as num?)?.toDouble();
          if (cookLat != null && cookLng != null && cookLat != 0 && cookLng != 0) {
            final dist = _haversineDistanceKm(
              widget.userLat!, widget.userLng!, cookLat, cookLng);
            if (dist > widget.distanceFilter!) return false;
          }
          // If cook has no location data, let it pass (don't exclude unknown)
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
        'dishRating': (offer.ratings?['average'] as num?)?.toDouble() ?? offer.cook.rating ?? 0.0, // FIX: Use dish rating, not cook rating
        'dishReviewCount': offer.ratings?['count'] ?? 0, // FIX: Dish review count
        'cookRating': offer.cook.rating ?? 0.0,
        'cookRatingCount': offer.cook.ratingsCount ?? 0, // FIX: Cook rating count
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
      final rating = (offer.ratings?['average'] as num?)?.toDouble() ?? offer.cook.rating ?? 0.0; // FIX: Use dish rating
      if (rating > globalMaxRating) globalMaxRating = rating;
    }
      
    // Add badge info to each cook
    final List<Map<String, dynamic>> cooksWithBadges = [];
    for (final c in cooksWithPrice) {
      final minPrice = c['minPrice'] as int;
      final offer = c['offer'];
      final prepTime = (offer.prepTime as int?) ?? 30;
      final dishRating = c['dishRating'] as double; // FIX: Use dish rating
        
      String? badge;
      if (minPrice == globalMinPrice && globalMinPrice > 0) {
        badge = 'Best price';
      } else if (prepTime == globalMinPrepTime) {
        badge = 'Fastest';
      } else if (dishRating >= globalMaxRating && globalMaxRating > 0) {
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
                          '${isRTL ? toArabicNumerals(cooksWithBadges.length.toString()) : cooksWithBadges.length} ${isRTL ? 'مطابخ متاحة' : 'kitchens available'}',
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
                    final dishRating = c['dishRating'] as double;
                    final dishReviewCount = c['dishReviewCount'] as int;
                    final cookRating = c['cookRating'] as double;
                    final cookRatingCount = c['cookRatingCount'] as int;
                    final cookImage = c['cookImage'] as String?;
                    final minPrice = c['minPrice'] as int;
                    final hasStock = c['hasStock'] as bool;
                    final offer = c['offer'];
                    final badge = c['badge'] as String?;
                    final isDisabled = !hasStock;

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
                              // Main row: dish image (left) | info (right)
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // LEFT: Dish image - 105x84 with smart crop
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(8),
                                    child: Container(
                                      width: 105,
                                      height: 84,
                                      color: const Color(0xFFEEEEEE),
                                      child: _buildDishImage(offer),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  // RIGHT: Info column
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        // Row 1: Dish name (main title) | Price (right)
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Expanded(
                                              child: Text(
                                                isRTL && (offer.nameAr?.isNotEmpty == true) ? offer.nameAr! : (offer.name.isNotEmpty ? offer.name : 'Unknown Dish'),
                                                style: TextStyle(
                                                  fontSize: 14,
                                                  fontWeight: FontWeight.w700,
                                                  color: isDisabled ? const Color(0xFFAAAAAA) : AppTheme.textPrimary,
                                                ),
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            // Price with inline OSAR icon (restored size)
                                            Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Image.asset(
                                                  'assets/icons/OSAR.png',
                                                  width: 20,
                                                  height: 20,
                                                ),
                                                const SizedBox(width: 3),
                                                Text(
                                                  isRTL ? '${toArabicNumerals(minPrice.toString())}+' : '$minPrice+',
                                                  style: TextStyle(
                                                    fontSize: 14,
                                                    fontWeight: FontWeight.w700,
                                                    color: isDisabled ? const Color(0xFFAAAAAA) : Colors.black,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 8),
                                        // Divider
                                        Container(height: 1, color: const Color(0xFFEEEEEE)),
                                        const SizedBox(height: 8),
                                        // Row 2: Dish rating + prep time on same row with divider
                                        Row(
                                          children: [
                                            // Dish rating
                                            const Icon(Icons.star, size: 12, color: Color(0xFFFCD535)),
                                            const SizedBox(width: 3),
                                            Text(
                                              isRTL ? toArabicNumerals(dishRating.toStringAsFixed(1)) : dishRating.toStringAsFixed(1),
                                              style: TextStyle(
                                                fontSize: 11,
                                                fontWeight: FontWeight.w600,
                                                color: isDisabled ? const Color(0xFFAAAAAA) : AppTheme.textPrimary,
                                              ),
                                            ),
                                            const SizedBox(width: 2),
                                            Text(
                                              isRTL ? '(${toArabicNumerals(dishReviewCount.toString())})' : '($dishReviewCount)',
                                              style: TextStyle(
                                                fontSize: 10,
                                                color: isDisabled ? const Color(0xFFAAAAAA) : const Color(0xFF555555),
                                              ),
                                            ),
                                            // Vertical divider
                                            Container(
                                              width: 1,
                                              height: 12,
                                              margin: const EdgeInsets.symmetric(horizontal: 8),
                                              color: const Color(0xFFE0E0E0),
                                            ),
                                            // Prep time - full sentence (same as Dish Profile)
                                            Icon(Icons.access_time, size: 11, color: isDisabled ? const Color(0xFFAAAAAA) : const Color(0xFF555555)),
                                            const SizedBox(width: 3),
                                            Flexible(
                                              child: FittedBox(
                                                fit: BoxFit.scaleDown,
                                                alignment: Alignment.centerLeft,
                                                child: Text(
                                                  _getPrepTimeDisplayText(offer, isRTL),
                                                  style: TextStyle(
                                                    fontSize: 10,
                                                    color: isDisabled ? const Color(0xFFAAAAAA) : const Color(0xFF555555),
                                                  ),
                                                  maxLines: 1,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 8),
                                        // Row 3: Cook avatar + name + cook rating (all in one row)
                                        Row(
                                          children: [
                                            // Cook avatar (circular)
                                            ClipOval(
                                              child: Container(
                                                width: 20,
                                                height: 20,
                                                color: const Color(0xFFEEEEEE),
                                                child: cookImage != null && cookImage.isNotEmpty
                                                    ? Image(
                                                        image: getImageProvider(cookImage),
                                                        width: 20,
                                                        height: 20,
                                                        fit: BoxFit.cover,
                                                      )
                                                    : const Icon(Icons.person, size: 12, color: Color(0xFFAAAAAA)),
                                              ),
                                            ),
                                            const SizedBox(width: 6),
                                            // Cook name
                                            Text(
                                              cookName,
                                              style: TextStyle(
                                                fontSize: 11,
                                                fontWeight: FontWeight.w500,
                                                color: isDisabled ? const Color(0xFFAAAAAA) : AppTheme.textPrimary,
                                              ),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                            const SizedBox(width: 6),
                                            // Cook rating with count
                                            const Icon(Icons.star, size: 10, color: Color(0xFFFCD535)),
                                            const SizedBox(width: 2),
                                            Text(
                                              isRTL ? toArabicNumerals(cookRating.toStringAsFixed(1)) : cookRating.toStringAsFixed(1),
                                              style: TextStyle(
                                                fontSize: 10,
                                                fontWeight: FontWeight.w600,
                                                color: isDisabled ? const Color(0xFFAAAAAA) : AppTheme.textPrimary,
                                              ),
                                            ),
                                            const SizedBox(width: 2),
                                            Text(
                                              isRTL ? '(${toArabicNumerals(cookRatingCount.toString())})' : '($cookRatingCount)',
                                              style: TextStyle(
                                                fontSize: 10,
                                                color: isDisabled ? const Color(0xFFAAAAAA) : const Color(0xFF555555),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
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
    final screenHeight = MediaQuery.of(context).size.height;
    return SizedBox(
      height: screenHeight * 0.88,
      child: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Header — identical to the loaded state ─────────────────
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
                        // Skeleton subtitle bar
                        Container(
                          width: 120,
                          height: 12,
                          decoration: BoxDecoration(
                            color: const Color(0xFFE8E8E8),
                            borderRadius: BorderRadius.circular(6),
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
              const SizedBox(height: 20),
              // ── Skeleton kitchen cards ─────────────────────────────────
              Expanded(
                child: ListView.builder(
                  itemCount: 4,
                  physics: const NeverScrollableScrollPhysics(),
                  itemBuilder: (_, __) => _buildSkeletonCard(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSkeletonCard() {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE8E8E8)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Dish image placeholder
          Container(
            width: 105,
            height: 84,
            decoration: BoxDecoration(
              color: const Color(0xFFEEEEEE),
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Title row
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        height: 14,
                        decoration: BoxDecoration(
                          color: const Color(0xFFE8E8E8),
                          borderRadius: BorderRadius.circular(6),
                        ),
                      ),
                    ),
                    const SizedBox(width: 24),
                    Container(
                      width: 44,
                      height: 14,
                      decoration: BoxDecoration(
                        color: const Color(0xFFE8E8E8),
                        borderRadius: BorderRadius.circular(6),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Container(height: 1, color: const Color(0xFFEEEEEE)),
                const SizedBox(height: 10),
                // Rating / prep time row
                Row(
                  children: [
                    Container(
                      width: 80,
                      height: 11,
                      decoration: BoxDecoration(
                        color: const Color(0xFFE8E8E8),
                        borderRadius: BorderRadius.circular(6),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Container(
                      width: 70,
                      height: 11,
                      decoration: BoxDecoration(
                        color: const Color(0xFFE8E8E8),
                        borderRadius: BorderRadius.circular(6),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                // Cook name row
                Container(
                  width: 100,
                  height: 11,
                  decoration: BoxDecoration(
                    color: const Color(0xFFEEEEEE),
                    borderRadius: BorderRadius.circular(6),
                  ),
                ),
              ],
            ),
          ),
        ],
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
