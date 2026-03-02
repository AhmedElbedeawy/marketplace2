import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../config/theme.dart';
import '../models/food.dart';
import '../providers/auth_provider.dart';
import '../providers/food_provider.dart';
import '../providers/language_provider.dart';
import '../screens/menu/menu_screen.dart';

/// Helper to normalize cook image URL using existing getImageUrl helper
String? _getCookImageUrl(dynamic cook) {
  if (cook == null) return null;
  
  // Try to get cook image from full offer data's embedded cook
  String? imageUrl;
  if (cook is CookOffer && cook.fullOfferData != null) {
    final cookData = cook.fullOfferData!['cook'];
    if (cookData != null) {
      imageUrl = cookData['profilePhoto'] ?? cookData['image'] ?? cookData['avatar'];
    }
  }
  
  // Also try direct cook object fields
  imageUrl ??= cook.profilePhoto ?? cook.image ?? cook.avatar;
  
  if (imageUrl == null || imageUrl.isEmpty) return null;
  
  return getImageUrl(imageUrl);
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

  // Compute min price for each cook
  final List<Map<String, dynamic>> cooksWithPrice = [];
  for (int i = 0; i < offers.length; i++) {
    final offer = offers[i];
    final variants = offer.variants as List<dynamic>?;
    int minPrice = 0;
    bool hasStock = false;
    
    if (variants != null && variants.isNotEmpty) {
      for (final v in variants) {
        final price = (v['price'] as num?)?.toInt() ?? 0;
        final stock = (v['stock'] as int?) ?? 0;
        if (stock > 0) hasStock = true;
        if (price > 0 && (minPrice == 0 || price < minPrice)) {
          minPrice = price;
        }
      }
    } else {
      // Single offer without variants
      minPrice = offer.price.toInt();
      if ((offer.stock ?? 0) > 0) hasStock = true;
    }
    
    cooksWithPrice.add({
      'offer': offer,
      'cookName': offer.cook.storeName ?? offer.cook.name,
      'rating': offer.cook.rating ?? 0.0,
      'cookImage': _getCookImageUrl(offer.cook),
      'minPrice': minPrice,
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
  
  return await showModalBottomSheet<Map<String, dynamic>>(
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
                isRTL ? 'اختر الطاهي' : 'Select Cook',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 16),
              ListView.builder(
                shrinkWrap: true,
                itemCount: cooksWithPrice.length,
                itemBuilder: (listContext, idx) {
                  final c = cooksWithPrice[idx];
                  final cookName = c['cookName'] as String;
                  final rating = c['rating'] as double;
                  final cookImage = c['cookImage'] as String?;
                  final minPrice = c['minPrice'] as int;
                  final hasStock = c['hasStock'] as bool;
                  final offer = c['offer'];
                  final isDisabled = !hasStock;

                  return GestureDetector(
                    onTap: isDisabled ? null : () => Navigator.pop(sheetContext, {
                      'cookId': offer.cook.id,
                      'offerId': offer.id,
                      'cookName': cookName,
                      'cookIndex': c['index'],
                    }),
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: isDisabled ? const Color(0xFFEEEEEE) : Colors.white,
                        border: Border.all(
                          color: isDisabled ? const Color(0xFFDDDDDD) : AppTheme.textSecondary,
                          width: 1,
                        ),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          // Cook image thumbnail
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: cookImage != null
                                ? CachedNetworkImage(
                                    imageUrl: cookImage,
                                    width: 48,
                                    height: 48,
                                    fit: BoxFit.cover,
                                    placeholder: (_, __) => Container(
                                      width: 48,
                                      height: 48,
                                      color: const Color(0xFFEEEEEE),
                                      child: const Icon(Icons.storefront, size: 24, color: Color(0xFFAAAAAA)),
                                    ),
                                    errorWidget: (_, __, ___) => Container(
                                      width: 48,
                                      height: 48,
                                      color: const Color(0xFFEEEEEE),
                                      child: const Icon(Icons.storefront, size: 24, color: Color(0xFFAAAAAA)),
                                    ),
                                  )
                                : Container(
                                    width: 48,
                                    height: 48,
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFEEEEEE),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: const Icon(Icons.storefront, size: 24, color: Color(0xFFAAAAAA)),
                                  ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  cookName,
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: isDisabled ? const Color(0xFFAAAAAA) : AppTheme.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    const Icon(Icons.star, size: 14, color: Color(0xFFFCD535)),
                                    const SizedBox(width: 4),
                                    Text(
                                      rating.toStringAsFixed(1),
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: isDisabled ? const Color(0xFFAAAAAA) : AppTheme.textSecondary,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                isDisabled ? 'Out of stock' : 'From SAR $minPrice',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: isDisabled ? const Color(0xFFAAAAAA) : const Color(0xFF005430),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      );
    },
  );
}
