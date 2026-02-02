import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/language_provider.dart';
import '../../providers/food_provider.dart';
import '../../providers/favorite_provider.dart';
import '../../providers/navigation_provider.dart';
import '../../providers/cart_provider.dart';
import '../../providers/country_provider.dart';
import '../../models/food.dart';
import '../../widgets/global_bottom_navigation.dart';
import '../menu/dish_detail_screen.dart';

class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({Key? key}) : super(key: key);

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  @override
  void initState() {
    super.initState();
    // Set favorite as active tab AND origin
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final navigationProvider = Provider.of<NavigationProvider>(context, listen: false);
      navigationProvider.setActiveTab(NavigationTab.favorite, setAsOrigin: true);
    });
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;
    
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: SafeArea(
        child: Column(
          children: [
            // Favorites title matching Menu and Cart page position
            Padding(
              padding: const EdgeInsets.only(top: 50, left: 20, right: 4),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          isRTL ? 'المفضلة' : 'Favorites',
                          style: const TextStyle(
                            color: AppTheme.textPrimary,
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            height: 1.2,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: _buildFavoritesGrid(isRTL),
            ),
          ],
        ),
      ),
      bottomNavigationBar: const GlobalBottomNavigation(),
    );
  }

  Widget _buildFavoritesGrid(bool isRTL) {
    return Consumer2<FoodProvider, FavoriteProvider>(
      builder: (context, foodProvider, favoriteProvider, _) {
        final allDishes = foodProvider.popularDishes;
        final favoriteDishes = favoriteProvider.getFavoriteDishes(allDishes);

        if (favoriteDishes.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.favorite_border,
                  size: 80,
                  color: AppTheme.textSecondary,
                ),
                const SizedBox(height: 16),
                Text(
                  isRTL ? 'لا توجد مفضلات بعد' : 'No favorites yet',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () {
                    final navigationProvider = Provider.of<NavigationProvider>(context, listen: false);
                    navigationProvider.resetToHome();
                    Navigator.pop(context);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.accentColor,
                    padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: Text(
                    isRTL ? 'استكشف الأطباق' : 'Explore Dishes',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF595757),
                    ),
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
          itemCount: favoriteDishes.length,
          itemBuilder: (context, index) {
            final dish = favoriteDishes[index];
            return _buildDishCard(dish, isRTL);
          },
        );
      },
    );
  }

  Widget _buildDishCard(Food dish, bool isRTL) {
    final bool isAssetImage = dish.image != null && !dish.image!.startsWith('http');

    return Consumer2<FavoriteProvider, CartProvider>(
      builder: (context, favoriteProvider, cartProvider, _) {
        final isFavorite = favoriteProvider.isFavorite(dish.id);

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
                // Dish Image with Favorite Icon
                Stack(
                  children: [
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
                    // Favorite Heart Icon
                    Positioned(
                      top: 8,
                      right: 8,
                      child: GestureDetector(
                        onTap: () {
                          favoriteProvider.toggleFavorite(dish.id);
                        },
                        child: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.1),
                                blurRadius: 4,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Icon(
                            isFavorite ? Icons.favorite : Icons.favorite_border,
                            color: isFavorite ? Colors.red : AppTheme.textSecondary,
                            size: 20,
                          ),
                        ),
                      ),
                    ),
                  ],
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
                      const SizedBox(height: 8),
                      // Add to Cart Button
                      GestureDetector(
                        onTap: () {
                          // Add to cart with proper functionality
                          cartProvider.addToCart(
                            foodId: dish.id,
                            foodName: dish.name,
                            price: dish.price,
                            cookId: 'default_cook',
                            cookName: 'Kitchen',
                          );
                          
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                isRTL 
                                  ? 'تمت إضافة ${dish.name} إلى السلة'
                                  : '${dish.name} added to cart'
                              ),
                              duration: const Duration(seconds: 2),
                              backgroundColor: AppTheme.accentColor,
                            ),
                          );
                        },
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(
                            color: AppTheme.accentColor,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.shopping_cart_outlined, size: 16, color: Colors.white),
                              const SizedBox(width: 4),
                              Text(
                                isRTL ? 'أضف للسلة' : 'Add to cart',
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
