import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/food_provider.dart';
import '../providers/language_provider.dart';
import '../providers/filter_provider.dart';
import '../widgets/cook_offer_sheet.dart';
import '../screens/menu/dish_detail_screen.dart';

// Track currently opening dish to prevent duplicate action sheets
String? _currentlyOpeningDishId;

/// Shared helper for opening a dish with cook offer sheet selection
/// Used by both Menu and Featured (Home) entry points to ensure consistent flow
Future<void> openDishWithCookSheet({
  required BuildContext context,
  required String adminDishId,
  String? dishName,
}) async {
  // Prevent duplicate action sheets for same dish
  if (_currentlyOpeningDishId == adminDishId) return;
  _currentlyOpeningDishId = adminDishId;
  
  try {
    // Get all active filters from FilterProvider
    final filterProvider = context.read<FilterProvider>();
    
    final selectedCook = await showCookOfferSheet(
      context: context,
      adminDishId: adminDishId,
      foodProvider: context.read<FoodProvider>(),
      authProvider: context.read<AuthProvider>(),
      languageProvider: context.read<LanguageProvider>(),
      forceShow: true,
      // Pass all offer-level filters
      fulfillmentFilter: filterProvider.orderType,
      prepTimeFilter: filterProvider.prepTime,
      distanceFilter: filterProvider.distance,
      topRatedOnly: filterProvider.showOnlyPopularCooks,
      userLat: filterProvider.browsingLat,
      userLng: filterProvider.browsingLng,
    );

    if (!context.mounted) return;
    
    // Diagnostic: Log when cook selection is cancelled (bottom sheet handles 0-offer UX)
    if (selectedCook == null) {
      debugPrint('Cook selection cancelled for dish: $adminDishId');
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => DishDetailScreen(
          adminDishId: adminDishId,
          dishName: dishName,
          initialCookId: selectedCook['cookId'] as String?,
          initialCookIndex: selectedCook['cookIndex'] as int?,
        ),
      ),
    );
  } finally {
    _currentlyOpeningDishId = null;
  }
}
