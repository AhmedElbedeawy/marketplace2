import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/language_provider.dart';
import '../../providers/food_provider.dart';
import '../../providers/navigation_provider.dart';
import '../../providers/country_provider.dart';
import '../../models/food.dart';
import '../../widgets/shared_app_header.dart';
import '../../widgets/global_bottom_navigation.dart';
import '../menu/dish_detail_screen.dart';

class SeeAllDishesScreen extends StatefulWidget {
  const SeeAllDishesScreen({Key? key}) : super(key: key);

  @override
  State<SeeAllDishesScreen> createState() => _SeeAllDishesScreenState();
}

class _SeeAllDishesScreenState extends State<SeeAllDishesScreen> {
  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;
    
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: SafeArea(
        child: Column(
          children: [
            SharedAppHeader(
              title: isRTL ? 'الأطباق المميزة' : 'Featured Dishes',
              showBackButton: true,
              onBackPressed: () {
                // Return to origin tab
                final navigationProvider = Provider.of<NavigationProvider>(context, listen: false);
                navigationProvider.returnToOrigin();
                Navigator.pop(context);
              },
            ),
            Expanded(
              child: _buildDishesGrid(isRTL),
            ),
          ],
        ),
      ),
      bottomNavigationBar: const GlobalBottomNavigation(),
    );
  }

  Widget _buildDishesGrid(bool isRTL) {
    return Consumer<FoodProvider>(
      builder: (context, foodProvider, _) {
        final dishes = foodProvider.popularDishes;

        if (dishes.isEmpty) {
          return Center(
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
                  isRTL ? 'لا توجد أطباق' : 'No dishes available',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary,
                  ),
                ),
              ],
            ),
          );
        }

        return GridView.builder(
          padding: const EdgeInsets.all(20),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            childAspectRatio: 0.75,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
          ),
          itemCount: dishes.length,
          itemBuilder: (context, index) {
            final dish = dishes[index];
            return _buildDishCard(dish, isRTL);
          },
        );
      },
    );
  }

  Widget _buildDishCard(Food dish, bool isRTL) {
    final bool isAssetImage = dish.image != null && !dish.image!.startsWith('http');

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          PageRouteBuilder(
            pageBuilder: (context, animation, secondaryAnimation) => DishDetailScreen(adminDishId: dish.id),
            transitionDuration: Duration.zero,
            reverseTransitionDuration: Duration.zero,
          ),
        );
      },
      child: Container(
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
            // Dish Image
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
              child: dish.image != null
                  ? (isAssetImage
                      ? Image.asset(
                          'assets/dishes/${dish.image!}',
                          width: double.infinity,
                          height: 120,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            width: double.infinity,
                            height: 120,
                            color: AppTheme.dividerColor,
                            child: const Icon(Icons.restaurant, size: 40, color: AppTheme.textSecondary),
                          ),
                        )
                      : Image.network(
                          dish.image!,
                          width: double.infinity,
                          height: 120,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            width: double.infinity,
                            height: 120,
                            color: AppTheme.dividerColor,
                            child: const Icon(Icons.restaurant, size: 40, color: AppTheme.textSecondary),
                          ),
                        ))
                  : Container(
                      width: double.infinity,
                      height: 120,
                      color: AppTheme.dividerColor,
                      child: const Icon(Icons.restaurant, size: 40, color: AppTheme.textSecondary),
                    ),
            ),
            // Dish Info
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    dish.name,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.star, size: 14, color: AppTheme.accentColor),
                      const SizedBox(width: 4),
                      Text(
                        dish.rating.toStringAsFixed(1),
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                      const Spacer(),
                      Text(
                        isRTL 
                          ? '${dish.price} ${context.watch<CountryProvider>().getLocalizedCurrency(true)}' 
                          : '${context.watch<CountryProvider>().getLocalizedCurrency(false)} ${dish.price}',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

}

