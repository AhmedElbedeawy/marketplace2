import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/language_provider.dart';
import '../../providers/favorite_provider.dart';
import '../../providers/navigation_provider.dart';
import '../../providers/food_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/address_provider.dart';
import '../../models/food.dart';
import '../../widgets/global_bottom_navigation.dart';
import '../../utils/image_url_utils.dart';
import '../../utils/prep_time_utils.dart';
import '../menu/dish_detail_screen.dart';
import '../menu/menu_screen.dart';

class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({Key? key}) : super(key: key);

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  bool _showDishes = true; // Toggle between Dishes and Cooks
  bool _cooksLoaded = false; // Track if cooks have been fetched
  @override
  void initState() {
    super.initState();
    // Set favorite as active tab AND origin
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final navigationProvider = Provider.of<NavigationProvider>(context, listen: false);
      navigationProvider.setActiveTab(NavigationTab.favorite, setAsOrigin: true);
    });
  }

  // Load cooks for the Cooks tab
  Future<void> _loadCooks() async {
    final foodProvider = Provider.of<FoodProvider>(context, listen: false);
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final addressProvider = Provider.of<AddressProvider>(context, listen: false);
    final headers = authProvider.getAuthHeaders();
    final lat = addressProvider.defaultAddress?.lat;
    final lng = addressProvider.defaultAddress?.lng;
    
    await foodProvider.fetchCooks(
      headers: headers,
      lat: lat,
      lng: lng,
    );
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
            // Favorites title
            Padding(
              padding: const EdgeInsets.only(top: 16, left: 24, right: 24),
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
            const SizedBox(height: 16),
            
            // Toggle: Dishes / Cooks
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Container(
                decoration: BoxDecoration(
                  color: const Color(0xFFE7E7E7),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () {
                          setState(() => _showDishes = true);
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: _showDishes ? Colors.white : Colors.transparent,
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: _showDishes
                                ? [
                                    BoxShadow(
                                      color: Colors.black.withValues(alpha: 0.1),
                                      blurRadius: 8,
                                      offset: const Offset(0, 2),
                                    ),
                                  ]
                                : null,
                          ),
                          child: Text(
                            isRTL ? 'الأطباق' : 'Dishes',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: _showDishes ? FontWeight.w700 : FontWeight.w500,
                              color: _showDishes ? AppTheme.textPrimary : const Color(0xFF969494),
                            ),
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: GestureDetector(
                        onTap: () {
                          setState(() => _showDishes = false);
                          // Load cooks when switching to Cooks tab
                          if (!_cooksLoaded) {
                            _loadCooks();
                            _cooksLoaded = true;
                          }
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: !_showDishes ? Colors.white : Colors.transparent,
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: !_showDishes
                                ? [
                                    BoxShadow(
                                      color: Colors.black.withValues(alpha: 0.1),
                                      blurRadius: 8,
                                      offset: const Offset(0, 2),
                                    ),
                                  ]
                                : null,
                          ),
                          child: Text(
                            isRTL ? 'الطهاة' : 'Cooks',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: !_showDishes ? FontWeight.w700 : FontWeight.w500,
                              color: !_showDishes ? AppTheme.textPrimary : const Color(0xFF969494),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            
            // Content
            Expanded(
              child: _showDishes 
                  ? _buildFavoritesGrid(isRTL)
                  : _buildFavoriteCooksList(isRTL),
            ),
          ],
        ),
      ),
      bottomNavigationBar: const GlobalBottomNavigation(),
    );
  }

  Widget _buildFavoritesGrid(bool isRTL) {
    return Consumer<FavoriteProvider>(
      builder: (context, favoriteProvider, _) {
        // Get favorite entries - each entry is a separate offer-level card
        final favoriteEntries = favoriteProvider.getFavoriteEntries();

        if (favoriteEntries.isEmpty) {
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
                  isRTL ? 'لا توجد مفضلات بعد' : 'No favorite dishes yet',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const MenuScreen()),
                    );
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
                      color: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          itemCount: favoriteEntries.length,
          itemBuilder: (context, index) {
            final entry = favoriteEntries[index];
            return _buildFavoriteCard(entry, isRTL);
          },
        );
      },
    );
  }

  Widget _buildFavoriteCard(Map<String, dynamic> entry, bool isRTL) {
    final key = entry['key'] as String;
    final offerData = entry['offerData'] as Map<String, dynamic>?;
    
    // Debug: Log what data we have
    debugPrint('📦 [FAVORITES CARD] Building card for key: $key');
    debugPrint('   has offerData: ${offerData != null}');
    if (offerData != null) {
      debugPrint('   offerData keys: ${offerData.keys.toList()}');
      debugPrint('   has cook: ${offerData['cook'] != null}');
      debugPrint('   has ratings: ${offerData['ratings'] != null}');
    }
    debugPrint('   entry keys: ${entry.keys.toList()}');
    
    // Extract offer data - same as cook_offer_sheet.dart
    final String dishName = offerData?['name'] ?? entry['dishName'] as String? ?? 'Unknown Dish';
    final List<dynamic> images = offerData?['images'] as List<dynamic>? ?? [];
    final String? imageUrl = images.isNotEmpty ? images.first.toString() : entry['image'] as String?;
    final String displayImageUrl = imageUrl != null && imageUrl.isNotEmpty ? getAbsoluteUrl(imageUrl) : '';
    
    // Get price from variants or offer price
    final variants = offerData?['variants'] as List<dynamic>?;
    double minPrice = (entry['price'] as num?)?.toDouble() ?? 0.0;
    if (variants != null && variants.isNotEmpty) {
      final firstVariant = variants.first as Map<String, dynamic>;
      minPrice = (firstVariant['price'] as num?)?.toDouble() ?? minPrice;
    } else if (offerData?['price'] != null) {
      minPrice = (offerData!['price'] as num).toDouble();
    }
    
    // Get ratings
    final dishRating = ((offerData?['ratings'] as Map<String, dynamic>?)?['average'] as num?)?.toDouble() ?? 0.0;
    final dishReviewCount = (offerData?['ratings'] as Map<String, dynamic>?)?['count'] as int? ?? 0;
    
    // Get cook info
    final cookData = offerData?['cook'] as Map<String, dynamic>?;
    // Priority: storeName (business name) > name (personal name) > 'Unknown Cook'
    final String cookName = cookData?['storeName'] ?? cookData?['name'] ?? 'Unknown Cook';
    final String? cookImage = cookData?['profilePhoto'] ?? cookData?['image'];
    final double cookRating = (cookData?['rating'] as num?)?.toDouble() ?? 0.0;
    final int cookRatingCount = cookData?['ratingsCount'] as int? ?? 0;
    
    // Get prep time
    final prepReadyConfig = offerData?['prepReadyConfig'] as Map<String, dynamic>?;
    final int prepTime = offerData?['prepTime'] as int? ?? 30;
    final String prepTimeText = prepReadyConfig != null && prepReadyConfig['optionType'] == 'cutoff'
        ? PrepTimeUtils.getCutoffReadyByText(prepReadyConfig, isRTL: isRTL, cookCountryCode: cookData?['countryCode'])
        : PrepTimeUtils.getPrepTimeDisplayText(prepReadyConfig, prepTime, isRTL: isRTL, includeLabel: false);
    
    // Check stock - default to true if offerData is missing (old favorites)
    final bool hasStock = offerData == null 
        ? true  // Old favorites: assume in stock
        : (offerData['stock'] as int? ?? 0) > 0 || 
            (variants?.any((v) => (v['stock'] as int? ?? 0) > 0) ?? false);
    final bool isDisabled = !hasStock;
    
    return Consumer<FavoriteProvider>(
      builder: (context, favoriteProvider, _) {
        return GestureDetector(
          onTap: isDisabled ? null : () async {
            // Navigate to dish profile with this specific cook
            await Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => DishDetailScreen(
                  adminDishId: entry['adminDishId'] as String? ?? key.split('_').first,
                  dishName: dishName,
                  initialCookId: entry['cookId'] as String?,
                ),
              ),
            );
          },
          child: Stack(
            children: [
              Container(
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
                      // Main row: dish image (left) | info (right)
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // LEFT: Dish image - 105x84
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              width: 105,
                              height: 84,
                              color: const Color(0xFFEEEEEE),
                              child: displayImageUrl.isNotEmpty
                                  ? Image.network(
                                      displayImageUrl,
                                      fit: BoxFit.cover,
                                      errorBuilder: (_, __, ___) => const Icon(Icons.restaurant, size: 24, color: Color(0xFFAAAAAA)),
                                    )
                                  : const Icon(Icons.restaurant, size: 24, color: Color(0xFFAAAAAA)),
                            ),
                          ),
                          const SizedBox(width: 10),
                          // RIGHT: Info column
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Row 1: Dish name | Price
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        dishName,
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
                                    // Price with OSAR icon
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
                                          '${minPrice.toInt()}+',
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
                                // Row 2: Dish rating + prep time
                                Row(
                                  children: [
                                    // Dish rating
                                    const Icon(Icons.star, size: 12, color: Color(0xFFFCD535)),
                                    const SizedBox(width: 3),
                                    Text(
                                      dishRating.toStringAsFixed(1),
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                        color: isDisabled ? const Color(0xFFAAAAAA) : AppTheme.textPrimary,
                                      ),
                                    ),
                                    const SizedBox(width: 2),
                                    Text(
                                      '($dishReviewCount)',
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
                                    // Prep time
                                    Icon(Icons.access_time, size: 11, color: isDisabled ? const Color(0xFFAAAAAA) : const Color(0xFF555555)),
                                    const SizedBox(width: 3),
                                    Flexible(
                                      child: FittedBox(
                                        fit: BoxFit.scaleDown,
                                        alignment: Alignment.centerLeft,
                                        child: Text(
                                          prepTimeText,
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
                                // Row 3: Cook avatar + name + cook rating
                                Row(
                                  children: [
                                    // Cook avatar
                                    ClipOval(
                                      child: Container(
                                        width: 20,
                                        height: 20,
                                        color: const Color(0xFFEEEEEE),
                                        child: cookImage != null && cookImage.isNotEmpty
                                            ? Image.network(
                                                getAbsoluteUrl(cookImage),
                                                width: 20,
                                                height: 20,
                                                fit: BoxFit.cover,
                                                errorBuilder: (_, __, ___) => const Icon(Icons.person, size: 12, color: Color(0xFFAAAAAA)),
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
                                    // Cook rating
                                    const Icon(Icons.star, size: 10, color: Color(0xFFFCD535)),
                                    const SizedBox(width: 2),
                                    Text(
                                      cookRating.toStringAsFixed(1),
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w600,
                                        color: isDisabled ? const Color(0xFFAAAAAA) : AppTheme.textPrimary,
                                      ),
                                    ),
                                    const SizedBox(width: 2),
                                    Text(
                                      '($cookRatingCount)',
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
                  ),  // Close Padding
                ),  // Close Container
              ),  // Close Container
              // Favorite removal icon - bottom right
              Positioned(
                bottom: 8,
                right: 8,
                child: GestureDetector(
                  onTap: () {
                    favoriteProvider.removeFavorite(key);
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
                    child: const Icon(
                      Icons.favorite,
                      color: Color(0xFFFF7A00),
                      size: 18,
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // Build favorite cooks list (same as Menu → Cook tab)
  Widget _buildFavoriteCooksList(bool isRTL) {
    return Consumer<FavoriteProvider>(
      builder: (context, favoriteProvider, _) {
        final favoriteCookIds = favoriteProvider.favoriteCookIds;

        if (favoriteCookIds.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Image.asset(
                  'assets/icons/GCooks.png',
                  width: 80,
                  height: 80,
                  color: AppTheme.textSecondary,
                ),
                const SizedBox(height: 16),
                Text(
                  isRTL ? 'لا يوجد طهاة مفضلون' : 'No favorite cooks yet',
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
                    navigationProvider.setActiveTab(NavigationTab.menu, setAsOrigin: true);
                    Navigator.of(context).popUntil((route) => route.isFirst);
                    Navigator.push(
                      context,
                      PageRouteBuilder(
                        pageBuilder: (context, _, __) => const MenuScreen(initialByDish: false),
                        transitionDuration: Duration.zero,
                        reverseTransitionDuration: Duration.zero,
                      ),
                    ).then((_) {
                      if (navigationProvider.activeTab == NavigationTab.menu) {
                        navigationProvider.resetToHome();
                      }
                    });
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.accentColor,
                    padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: Text(
                    isRTL ? 'استكشف الطهاة' : 'Explore Cooks',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
          );
        }

        // Get all cooks and filter by favorites
        final foodProvider = context.watch<FoodProvider>();
        final allCooks = foodProvider.cooks;
        final favoriteCooks = allCooks
            .where((cook) => favoriteCookIds.contains(cook.id))
            .toList();

        return ListView.builder(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          itemCount: favoriteCooks.length,
          itemBuilder: (context, index) {
            final cook = favoriteCooks[index];
            return _buildFavoriteCookCard(cook, isRTL);
          },
        );
      },
    );
  }

  // Build favorite cook card (same as Menu → Cook tab)
  Widget _buildFavoriteCookCard(CookInfo cook, bool isRTL) {
    final cookName = cook.storeName?.isNotEmpty == true ? cook.storeName! : cook.name;
    final expertiseDisplay = cook.expertise.isNotEmpty 
        ? cook.expertise.first 
        : 'Multi-Specialty';

    return Consumer<FavoriteProvider>(
      builder: (context, favoriteProvider, _) {
        final isFavorite = favoriteProvider.isCookFavorite(cook.id);

        return GestureDetector(
          onTap: () {
            Navigator.pushNamed(
              context, 
              '/cook-kitchen',
              arguments: {'cookId': cook.id, 'cookName': cookName},
            );
          },
          child: Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(12),
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
            child: Row(
              children: [
                // Cook Image
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: SmartImage(
                    imageUrl: cook.profilePhoto,
                    width: 80,
                    height: 80,
                    placeholder: _buildCookPlaceholder(),
                    errorWidget: _buildCookPlaceholder(),
                  ),
                ),
                const SizedBox(width: 12),
                // Cook Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        cookName,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.textPrimary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(Icons.star, size: 14, color: Color(0xFFFF7A00)),
                          const SizedBox(width: 4),
                          Text(
                            '${cook.rating?.toStringAsFixed(1) ?? '0.0'} (${cook.ratingsCount ?? 0})',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: Color(0xFF7D7C7C),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(Icons.restaurant_menu, size: 12, color: Color(0xFF7D7C7C)),
                          const SizedBox(width: 4),
                          Text(
                            expertiseDisplay,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: Color(0xFF7D7C7C),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                // Favorite Button
                GestureDetector(
                  onTap: () async {
                    await favoriteProvider.toggleCookFavorite(cook.id);
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            isFavorite
                                ? (isRTL ? 'تمت الإزالة من المفضلة' : 'Removed from favorites')
                                : (isRTL ? 'تمت الإضافة إلى المفضلة' : 'Added to favorites'),
                            style: const TextStyle(
                              color: Color(0xFFFF7A00),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          duration: const Duration(seconds: 1),
                          backgroundColor: Colors.white,
                          behavior: SnackBarBehavior.floating,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 8,
                        ),
                      );
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: isFavorite ? Colors.white : const Color(0xFFE7E7E7),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      isFavorite ? Icons.favorite : Icons.favorite_border,
                      color: isFavorite ? const Color(0xFFFF7A00) : const Color(0xFF969494),
                      size: 20,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildCookPlaceholder() {
    return Container(
      width: 80,
      height: 80,
      decoration: BoxDecoration(
        color: const Color(0xFFE7E7E7),
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Icon(Icons.person, size: 32, color: Color(0xFF969494)),
    );
  }
}