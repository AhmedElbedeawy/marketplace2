import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../config/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/food_provider.dart';
import '../../providers/language_provider.dart';
import '../../providers/navigation_provider.dart';
import '../../providers/menu_state_provider.dart';
import '../../providers/filter_provider.dart';
import '../../providers/country_provider.dart';
import '../../providers/address_provider.dart';
import '../../models/category.dart';
import '../../utils/image_url_utils.dart'; // PHASE 4: getAbsoluteUrl utility
import '../../widgets/global_bottom_navigation.dart';
import '../../widgets/refine_button.dart';
import 'dish_detail_screen.dart';

class MenuScreen extends StatefulWidget {
  final String? initialCategoryId; // Optional parameter to pre-select category
  
  const MenuScreen({super.key, this.initialCategoryId});

  @override
  State<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends State<MenuScreen> {
  String _selectedCategoryId = '';
  bool _isDelivery = true; // Toggle between Delivery and Pickup
  bool _isLoading = true;
  String? _error;
  
  final ScrollController _categoryScrollController = ScrollController();
  final ScrollController _dishListScrollController = ScrollController();
  bool _isRestoringState = false;

  @override
  void dispose() {
    // Save scroll positions before disposing
    final menuStateProvider = Provider.of<MenuStateProvider>(context, listen: false);
    if (_categoryScrollController.hasClients) {
      menuStateProvider.saveCategoryScrollOffset(_categoryScrollController.offset);
    }
    if (_dishListScrollController.hasClients) {
      menuStateProvider.saveDishListScrollOffset(_dishListScrollController.offset);
    }
    
    _categoryScrollController.dispose();
    _dishListScrollController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    
    // Add scroll listener to save category scroll position
    _categoryScrollController.addListener(() {
      if (_categoryScrollController.hasClients) {
        final menuStateProvider = Provider.of<MenuStateProvider>(context, listen: false);
        menuStateProvider.saveCategoryScrollOffset(_categoryScrollController.offset);
      }
    });
    
    _loadInitialData();
    // Set menu as active tab AND origin
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final navigationProvider = Provider.of<NavigationProvider>(context, listen: false);
      navigationProvider.setActiveTab(NavigationTab.menu, setAsOrigin: true);
    });
  }

  Future<void> _loadInitialData() async {
    final foodProvider = Provider.of<FoodProvider>(context, listen: false);
    final menuStateProvider = Provider.of<MenuStateProvider>(context, listen: false);
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final addressProvider = Provider.of<AddressProvider>(context, listen: false);
    final headers = authProvider.getAuthHeaders();
    
    final lat = addressProvider.defaultAddress?.lat;
    final lng = addressProvider.defaultAddress?.lng;
    
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      await foodProvider.fetchCategories(headers);
      
      // Get sorted categories with placeholders
      final categories = _getSortedCategories(foodProvider.categories);
      
      // Check if we have saved state from previous session (not app restart)
      if (menuStateProvider.hasState && widget.initialCategoryId == null) {
        // Restore saved state
        _selectedCategoryId = menuStateProvider.selectedCategoryId!;
        _isDelivery = menuStateProvider.isDelivery;
        _isRestoringState = true;
      } else if (widget.initialCategoryId != null && widget.initialCategoryId!.isNotEmpty) {
        // Pre-select the category passed from Home page
        _selectedCategoryId = widget.initialCategoryId!;
        // Save this as new state
        menuStateProvider.saveSelectedCategory(_selectedCategoryId);
      } else {
        // Select first active category by default (app restart or first visit)
        if (categories.isNotEmpty) {
          final firstActive = categories.firstWhere(
            (cat) => cat.id.isNotEmpty,
            orElse: () => categories.first,
          );
          _selectedCategoryId = firstActive.id;
          // Save this as new state
          menuStateProvider.saveSelectedCategory(_selectedCategoryId);
        }
      }
      
      // PHASE 4: Use AdminDish 2-layer API for menu list
      if (_selectedCategoryId.isNotEmpty) {
        await foodProvider.fetchAdminDishesWithStats(
          headers,
          lat: lat,
          lng: lng,
          categoryId: _selectedCategoryId,
        );
      } else {
        await foodProvider.fetchAdminDishesWithStats(
          headers,
          lat: lat,
          lng: lng,
        );
      }
      
      // Restore scroll positions after UI is built
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_isRestoringState) {
          _restoreScrollPositions(menuStateProvider);
        } else {
          _scrollToSelectedCategory(categories);
        }
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load data';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _scrollToSelectedCategory(List<Category> categories) {
    if (!_categoryScrollController.hasClients) return;
    
    // Find the index of the selected category
    final selectedIndex = categories.indexWhere((cat) => cat.id == _selectedCategoryId);
    
    if (selectedIndex == -1) return;
    
    // Calculate scroll position
    // Each category item is approximately 70-80px wide (text width varies)
    // We'll estimate based on average tab width
    const double estimatedTabWidth = 80; // Approximate width per tab
    const double padding = 16; // Left padding
    
    // Calculate offset to center the selected tab
    final double screenWidth = MediaQuery.of(context).size.width;
    final double targetOffset = (selectedIndex * estimatedTabWidth) - (screenWidth / 2) + (estimatedTabWidth / 2) + padding;
    
    // Ensure offset is within valid bounds
    final double maxScroll = _categoryScrollController.position.maxScrollExtent;
    final double scrollOffset = targetOffset.clamp(0.0, maxScroll);
    
    // Animate to the calculated position
    _categoryScrollController.animateTo(
      scrollOffset,
      duration: const Duration(milliseconds: 400),
      curve: Curves.easeInOut,
    );
  }

  /// Restore scroll positions from saved state (instant, no animation)
  void _restoreScrollPositions(MenuStateProvider menuStateProvider) {
    // Restore category scroll position instantly
    if (_categoryScrollController.hasClients && menuStateProvider.categoryScrollOffset > 0) {
      _categoryScrollController.jumpTo(
        menuStateProvider.categoryScrollOffset.clamp(
          0.0,
          _categoryScrollController.position.maxScrollExtent,
        ),
      );
    }
    
    // Restore dish list scroll position instantly
    if (_dishListScrollController.hasClients && menuStateProvider.dishListScrollOffset > 0) {
      _dishListScrollController.jumpTo(
        menuStateProvider.dishListScrollOffset.clamp(
          0.0,
          _dishListScrollController.position.maxScrollExtent,
        ),
      );
    }
    
    _isRestoringState = false;
  }

  List<Category> _getSortedCategories(List<Category> categories) {
    // Sort by sortOrder from API, fallback to order in list
    final sortedList = List<Category>.from(categories);
    sortedList.sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    return sortedList;
  }

  Future<void> _onCategoryTap(String categoryId) async {
    if (categoryId.isEmpty) {
      // Placeholder category - show message
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Category not yet available'),
          duration: Duration(seconds: 2),
        ),
      );
      return;
    }

    setState(() {
      _selectedCategoryId = categoryId;
      _isLoading = true;
    });
    
    // Save selected category to state provider
    final menuStateProvider = Provider.of<MenuStateProvider>(context, listen: false);
    menuStateProvider.saveSelectedCategory(categoryId);

    final foodProvider = Provider.of<FoodProvider>(context, listen: false);
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final addressProvider = Provider.of<AddressProvider>(context, listen: false);
    final headers = authProvider.getAuthHeaders();
    
    final lat = addressProvider.defaultAddress?.lat;
    final lng = addressProvider.defaultAddress?.lng;

    try {
      // PHASE 4: Use AdminDish 2-layer API with category filter
      await foodProvider.fetchAdminDishesWithStats(
        headers,
        lat: lat,
        lng: lng,
        categoryId: categoryId,
      );
      
      // Reset dish list scroll to top when changing category
      if (_dishListScrollController.hasClients) {
        _dishListScrollController.jumpTo(0);
        menuStateProvider.saveDishListScrollOffset(0);
      }
    } catch (e) {
      setState(() {
        _error = 'Failed to load dishes';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Widget _buildActiveFilterChips(bool isRTL, FilterProvider filterProvider) {
    final chips = <String>[];
    
    // Add category chips
    chips.addAll(filterProvider.selectedCategories);
    
    // Add order type if not 'All'
    if (filterProvider.orderType != 'All') {
      chips.add(filterProvider.orderType);
    }
    
    // Add delivery time
    if (filterProvider.deliveryTime != '60') {
      chips.add('${filterProvider.deliveryTime} min');
    }
    
    // Add price range
    if (filterProvider.minPrice != 0 || filterProvider.maxPrice != 500) {
      final currency = context.read<CountryProvider>().currencyCode;
      chips.add('${filterProvider.minPrice.toInt()}-${filterProvider.maxPrice.toInt()} $currency');
    }
    
    // Add distance
    if (filterProvider.distance != 30) {
      chips.add('Within ${filterProvider.distance.toStringAsFixed(0)} km');
    }
    
    // Add popular filters
    if (filterProvider.showOnlyPopularCooks) {
      chips.add('Popular Cooks');
    }
    if (filterProvider.showOnlyPopularDishes) {
      chips.add('Featured Dishes');
    }
    
    // Add sort by if not Recommended
    if (filterProvider.sortBy != 'Recommended') {
      chips.add('Sort: ${filterProvider.sortBy}');
    }
    
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: chips.asMap().entries.map((entry) {
            final chip = entry.value;
            
            return Padding(
              padding: EdgeInsets.only(right: isRTL ? 0 : 8, left: isRTL ? 8 : 0),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFFFCD535),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      chip,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFF40403F),
                      ),
                    ),
                    const SizedBox(width: 6),
                    GestureDetector(
                      onTap: () => _removeFilter(chip, filterProvider),
                      child: const Icon(
                        Icons.close,
                        size: 16,
                        color: Color(0xFF40403F),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }
  
  void _removeFilter(String filterLabel, FilterProvider filterProvider) {
    // ... existing code ...
  }

  void _navigateToDish(String adminDishId, {String? dishName}) {
    Navigator.push(
      context,
      MaterialPageRoute(
        // PHASE 4: Pass adminDishId for 2-layer model
        builder: (_) => DishDetailScreen(
          adminDishId: adminDishId,
          dishName: dishName,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = Provider.of<LanguageProvider>(context);
    final isRTL = languageProvider.isArabic;
    
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: SafeArea(
        child: Column(
          children: [
            // Menu title matching Home page position
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
                          isRTL ? 'القاصمة' : 'Menu',
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
          _buildDeliveryPickupToggle(isRTL),
          // Show active filters or category tabs
          Consumer<FilterProvider>(
            builder: (context, filterProvider, _) {
              final hasActiveFilters = filterProvider.selectedCategories.isNotEmpty ||
                  filterProvider.orderType != 'All' ||
                  filterProvider.deliveryTime != '60' ||
                  filterProvider.minPrice != 0 ||
                  filterProvider.maxPrice != 500 ||
                  filterProvider.distance != 30 ||
                  filterProvider.showOnlyPopularCooks ||
                  filterProvider.showOnlyPopularDishes ||
                  filterProvider.sortBy != 'Recommended';
              
              if (hasActiveFilters) {
                return _buildActiveFilterChips(isRTL, filterProvider);
              } else {
                return _buildCategoryTabs(isRTL);
              }
            },
          ),
            Expanded(
              child: _buildDishList(isRTL),
            ),
          ],
        ),
      ),
      bottomNavigationBar: const GlobalBottomNavigation(),
    );
  }

  Widget _buildDeliveryPickupToggle(bool isRTL) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Expanded(
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
                        setState(() => _isDelivery = true);
                        // Save delivery state
                        final menuStateProvider = Provider.of<MenuStateProvider>(context, listen: false);
                        menuStateProvider.saveDeliveryState(true);
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        decoration: BoxDecoration(
                          color: _isDelivery ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: _isDelivery
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
                          isRTL ? 'توصيل' : 'Delivery',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: _isDelivery ? FontWeight.w700 : FontWeight.w500,
                            color: _isDelivery ? AppTheme.textPrimary : const Color(0xFF969494),
                          ),
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: () {
                        setState(() => _isDelivery = false);
                        // Save delivery state
                        final menuStateProvider = Provider.of<MenuStateProvider>(context, listen: false);
                        menuStateProvider.saveDeliveryState(false);
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        decoration: BoxDecoration(
                          color: !_isDelivery ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: !_isDelivery
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
                          isRTL ? 'استلام' : 'Pickup',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: !_isDelivery ? FontWeight.w700 : FontWeight.w500,
                            color: !_isDelivery ? AppTheme.textPrimary : const Color(0xFF969494),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 12),
          // Filter button - unified refine component
          RefineButton(
            isMenuPage: true,
            onApply: () {
              // Menu page stays on same page, filters are applied automatically
              // because FilterProvider state is shared
            },
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryTabs(bool isRTL) {
    return Consumer<FoodProvider>(
      builder: (context, foodProvider, _) {
        final categories = _getSortedCategories(foodProvider.categories);
        
        return Container(
          height: 45, // Reduced from 50
          padding: const EdgeInsets.symmetric(vertical: 10), // Reduced from 12
          decoration: const BoxDecoration(
            border: Border(
              bottom: BorderSide(
                color: Color(0xFFE7E7E7),
                width: 1,
              ),
            ),
          ),
          child: ListView.builder(
            controller: _categoryScrollController, // Add scroll controller
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12), // Reduced from 16
            itemCount: categories.length,
            itemBuilder: (context, index) {
              final category = categories[index];
              final isActive = category.id == _selectedCategoryId;
              final isPlaceholder = category.id.isEmpty;
              
              return GestureDetector(
                onTap: () => _onCategoryTap(category.id),
                child: Container(
                  margin: const EdgeInsets.only(right: 12), // Reduced from 16
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        isRTL ? category.nameAr : category.name,
                        style: TextStyle(
                          fontSize: 12, // Reduced from 14
                          fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                          color: isPlaceholder
                              ? const Color(0xFF969494)
                              : (isActive ? AppTheme.textPrimary : const Color(0xFF7D7C7C)),
                        ),
                      ),
                      const SizedBox(height: 3), // Reduced from 4
                      if (isActive)
                        Container(
                          width: 35, // Reduced from 40
                          height: 2,
                          decoration: BoxDecoration(
                            color: AppTheme.accentColor,
                            borderRadius: BorderRadius.circular(1),
                          ),
                        ),
                    ],
                  ),
                ),
              );
            },
          ),
        );
      },
    );
  }

  Widget _buildDishList(bool isRTL) {
    if (_isLoading) {
      return _buildLoadingSkeleton();
    }

    if (_error != null) {
      return _buildErrorState(isRTL);
    }

    return Consumer<FoodProvider>(
      builder: (context, foodProvider, _) {
        // PHASE 4: Use adminDishesWithStats for dish list
        final dishes = foodProvider.adminDishesWithStats;

        if (dishes.isEmpty) {
          return _buildEmptyState(isRTL);
        }

        return NotificationListener<ScrollNotification>(
          onNotification: (ScrollNotification scrollInfo) {
            // Save scroll position when user stops scrolling
            if (scrollInfo is ScrollEndNotification && _dishListScrollController.hasClients) {
              final menuStateProvider = Provider.of<MenuStateProvider>(context, listen: false);
              menuStateProvider.saveDishListScrollOffset(_dishListScrollController.offset);
            }
            return false;
          },
          child: ListView.builder(
            controller: _dishListScrollController,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            itemCount: dishes.length,
            itemBuilder: (context, index) {
              final dish = dishes[index];
              return _buildDishCard(dish, isRTL);
            },
          ),
        );
      },
    );
  }

  Widget _buildDishCard(dynamic dish, bool isRTL) {
    // PHASE 4: Support both legacy Product and AdminDish formats
    // AdminDish has adminDishId, nameAr, imageUrl, minPrice, offerCount
    final String dishId = dish.adminDishId ?? dish.id;
    final String dishName = isRTL ? (dish.nameAr ?? dish.name) : dish.name;
    final String? imageUrl = dish.imageUrl ?? dish.image;
    final double minPrice = dish.minPrice ?? dish.price ?? 0;
    final int offerCount = dish.offerCount ?? dish.cookCount ?? 1;
    
    // PHASE 4: Apply getAbsoluteUrl for image
    final String absoluteImageUrl = getAbsoluteUrl(imageUrl);
    final bool isAssetImage = imageUrl != null && !imageUrl.startsWith('http');
    
    return GestureDetector(
      onTap: () => _navigateToDish(dishId, dishName: dish.name),
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
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Dish Image
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: absoluteImageUrl.isNotEmpty
                  ? (isAssetImage
                      ? Image.asset(
                          imageUrl,
                          width: 80,
                          height: 80,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            width: 80,
                            height: 80,
                            color: const Color(0xFFE7E7E7),
                            child: const Icon(Icons.restaurant, size: 32, color: Color(0xFF969494)),
                          ),
                        )
                      : CachedNetworkImage(
                          imageUrl: absoluteImageUrl,
                          width: 80,
                          height: 80,
                          fit: BoxFit.cover,
                          placeholder: (_, __) => Container(
                            width: 80,
                            height: 80,
                            color: const Color(0xFFE7E7E7),
                          ),
                          errorWidget: (_, __, ___) => Container(
                            width: 80,
                            height: 80,
                            color: const Color(0xFFE7E7E7),
                            child: const Icon(Icons.restaurant, size: 32, color: Color(0xFF969494)),
                          ),
                        ))
                  : Container(
                      width: 80,
                      height: 80,
                      color: const Color(0xFFE7E7E7),
                      child: const Icon(Icons.restaurant, size: 32, color: Color(0xFF969494)),
                    ),
            ),
            const SizedBox(width: 12),
            // Dish Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    dishName,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Text(
                        isRTL ? 'أطباق' : 'Dishes',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF7D7C7C),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '(${dish.orderCount ?? 0})',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text(
                        isRTL ? 'طهاة' : 'Cooks',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF7D7C7C),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '($offerCount)',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Text(
                        isRTL ? 'نطاق السعر' : 'Price range',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF7D7C7C),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '${context.watch<CountryProvider>().currencyCode} ${minPrice.toInt()}+',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF4CAF50),
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

  Widget _buildLoadingSkeleton() {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: 4,
      itemBuilder: (context, index) {
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: const Color(0xFFE7E7E7),
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 150,
                      height: 16,
                      color: const Color(0xFFE7E7E7),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      width: 100,
                      height: 12,
                      color: const Color(0xFFE7E7E7),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      width: 80,
                      height: 12,
                      color: const Color(0xFFE7E7E7),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildEmptyState(bool isRTL) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.restaurant_menu_outlined,
            size: 80,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 16),
          Text(
            isRTL ? 'لا توجد أطباق متاحة' : 'No dishes available',
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Color(0xFF7D7C7C),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(bool isRTL) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.error_outline,
            size: 80,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 16),
          Text(
            _error ?? (isRTL ? 'حدث خطأ' : 'Something went wrong'),
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Color(0xFF7D7C7C),
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _loadInitialData,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.accentColor,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
            child: Text(
              isRTL ? 'إعادة المحاولة' : 'Retry',
              style: const TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }
}
