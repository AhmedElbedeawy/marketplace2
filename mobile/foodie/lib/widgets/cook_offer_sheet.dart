import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../models/food.dart';
import '../providers/auth_provider.dart';
import '../providers/food_provider.dart';
import '../providers/language_provider.dart';
import '../utils/image_url_utils.dart';

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
}) async {
  final isRTL = languageProvider.isArabic;
  final headers = authProvider.getAuthHeaders();
  
  try {
    await foodProvider.fetchOffersByAdminDish(adminDishId, headers);
  } catch (e) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(isRTL ? 'فشل تحميل الطهاة' : 'Failed to load cooks')),
      );
    }
    return null;
  }

  final offers = foodProvider.currentOffers;
  
  // Handle 0 offers: always show "No offers available" sheet for consistent UX
  if (offers.isEmpty && context.mounted) {
    await showModalBottomSheet<void>(
      context: context,
      builder: (BuildContext sheetContext) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 24, 16, 32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isRTL ? 'لا يوجد عروض متاحة' : 'No offers available',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  isRTL ? 'للأسف، لا توجد عروض لهذا الطبق حالياً' : 'Unfortunately, there are no offers for this dish at the moment',
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppTheme.textSecondary,
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(sheetContext),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.accentColor,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: Text(
                      isRTL ? 'حسناً' : 'OK',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
    return null;
  }

  // Compute min price for each cook (price of smallest portion = first variant)
  final List<Map<String, dynamic>> cooksWithPrice = [];
  for (int i = 0; i < offers.length; i++) {
    final offer = offers[i];
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
      'index': i,
    });
  }

  // If only one cook and forceShow is false, auto-return (old behavior)
  if (cooksWithPrice.length == 1 && !forceShow) {
    final c = cooksWithPrice.first;
    final offer = c['offer'];
    return {
      'cookId': offer.cook.id,
      'offerId': offer.id,
      'cookName': c['cookName'],
      'cookIndex': c['index'],
    };
  }

  if (!context.mounted) return null;
  
  final screenHeight = MediaQuery.of(context).size.height;
  final sheetHeight = screenHeight * 0.88;
  
  // Calculate badges for each cook
  // Find min price and min prep time for badge calculations
  final int globalMinPrice = cooksWithPrice.isNotEmpty ? (cooksWithPrice.map((c) => c['minPrice'] as int).reduce((a, b) => a < b ? a : b)) : 0;
  int globalMinPrepTime = 999999;
  for (final offer in offers) {
    final prepTime = (offer.prepTime as int?) ?? 30;
    if (prepTime < globalMinPrepTime) globalMinPrepTime = prepTime;
  }
  double globalMaxRating = 0;
  for (final offer in offers) {
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
      badge = 'Best Price';
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
  
  return await showModalBottomSheet<Map<String, dynamic>>(
    context: context,
    isScrollControlled: true,
    builder: (BuildContext sheetContext) {
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
                    onTap: () => Navigator.pop(sheetContext),
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

                    return GestureDetector(
                      onTap: isDisabled ? null : () => Navigator.pop(sheetContext, {
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
                              // Main row: avatar | name+rating | price | Select
                              Row(
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
                                          Text(' (120)', style: TextStyle(fontSize: 11, color: isDisabled ? const Color(0xFFAAAAAA) : AppTheme.textSecondary)),
                                        ]),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  // Price
                                  Text('SAR $minPrice', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: isDisabled ? const Color(0xFFAAAAAA) : const Color(0xFF005430))),
                                  const SizedBox(width: 8),
                                  // Select button on right
                                  SizedBox(
                                    height: 32,
                                    child: ElevatedButton(
                                      onPressed: isDisabled ? null : () => Navigator.pop(sheetContext, {'cookId': offer.cook.id, 'offerId': offer.id, 'cookName': cookName, 'cookIndex': c['index']}),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: isDisabled ? const Color(0xFFCCCCCC) : const Color(0xFF005430),
                                        padding: const EdgeInsets.symmetric(horizontal: 16),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                      ),
                                      child: Text(isRTL ? 'اختيار' : 'Select', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white)),
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
    },
  );
}
