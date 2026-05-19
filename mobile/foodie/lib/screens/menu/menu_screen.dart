import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import '../../config/api_config.dart';
import '../../utils/image_url_utils.dart';
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
import '../../models/food.dart'; // STEP 2: Food model for proper field access
import '../../widgets/global_bottom_navigation.dart';
import '../../widgets/refine_button.dart';
// SmartImage for proper image handling
// STEP 1: Shared offer sheet helper
import '../../utils/dish_navigation.dart'; // Shared dish navigation helper
import '../../utils/arabic_utils.dart';

// STEP 2: Add helper function for dish image URL handling
String getImageUrl(String? raw) {
  if (raw == null || raw.trim().isEmpty) return '';

  final s = raw.trim();

  if (s.startsWith('http://') || s.startsWith('https://')) return s;

  final withSlash = s.startsWith('/') ? s : '/$s';

  const apiOrigin = 'https://api.eltekkeya.com';

  return '$apiOrigin$withSlash';
}

class MenuScreen extends StatefulWidget {
  final String? initialCategoryId; // Optional parameter to pre-select category
  final String? initialSearchQuery; // Optional search query from home screen
  final String? selectedAdminDishId; // Optional: open this dish's offers sheet on load
  final bool initialByDish; // Optional: open in Dishes tab (true) or Cooks tab (false)

  const MenuScreen({super.key, this.initialCategoryId, this.initialSearchQuery, this.selectedAdminDishId, this.initialByDish = true});

  @override
  State<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends State<MenuScreen> {
  String _selectedCategoryId = '';
  late bool _isByDish; // Toggle between By Dish and By Cook (replaces Delivery/Pickup)
  String _selectedExpertise = 'All'; // Expertise filter for Cook mode
  bool _isLoading = true;
  String? _error;
  String _searchQuery = ''; // For local dish search
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocusNode = FocusNode();

  final ScrollController _categoryScrollController = ScrollController();
  final ScrollController _dishListScrollController = ScrollController();
  bool _isRestoringState = false;
  
  // Expertise items fetched from /expertise API
  List<Map<String, dynamic>> _expertiseApiItems = [];

  Future<bool> _checkLocationAndPrompt() async {
    final addressProvider = Provider.of<AddressProvider>(context, listen: false);
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final languageProvider = Provider.of<LanguageProvider>(context, listen: false);
    final isRTL = languageProvider.isArabic;

    if (authProvider.token != null) {
      await addressProvider.fetchAddresses(authProvider.token!);
    }
    if (addressProvider.defaultAddress != null) return true;

    if (!mounted) return false;

    await showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40, height: 4,
                decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2)),
              ),
              const SizedBox(height: 20),
              const Icon(Icons.location_on_outlined, size: 48, color: AppTheme.accentColor),
              const SizedBox(height: 16),
              Text(
                isRTL ? 'مطلوب تحديد الموقع' : 'Location Required',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                isRTL
                    ? 'يرجى تحديد موقع التوصيل لاستعراض الأطباق القريبة منك.'
                    : 'Please select a delivery location to browse dishes near you.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey[600]),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.pop(ctx);
                    Navigator.pushNamed(context, '/address-form');
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.accentColor,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: Text(
                    isRTL ? 'تحديد الموقع' : 'Select Location',
                    style: const TextStyle(color: Colors.white, fontSize: 16),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: Text(isRTL ? 'إلغاء' : 'Cancel'),
              ),
            ],
          ),
        ),
      ),
    );

    return false;
  }

  Future<void> _fetchExpertise() async {
    try {
      final response = await http.get(Uri.parse(ApiConfig.getExpertise));
      if (response.statusCode == 200 && mounted) {
        final data = jsonDecode(response.body);
        final list = data is List ? data : (data['data'] ?? data['expertise'] ?? []);
        setState(() {
          _expertiseApiItems = List<Map<String, dynamic>>.from(list);
        });
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    // Save scroll positions before disposing - guard with mounted check
    if (mounted) {
      try {
        final menuStateProvider = Provider.of<MenuStateProvider>(context, listen: false);
        if (_categoryScrollController.hasClients) {
          menuStateProvider.saveCategoryScrollOffset(_categoryScrollController.offset);
        }
        if (_dishListScrollController.hasClients) {
          menuStateProvider.saveDishListScrollOffset(_dishListScrollController.offset);
        }
      } catch (e) {
        // Ignore provider access errors during dispose
      }
    }
    _searchController.dispose();
    _searchFocusNode.dispose();
    _categoryScrollController.dispose();
    _dishListScrollController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _isByDish = widget.initialByDish; // Honour caller's requested tab

    // Add scroll listener to save category scroll position
    _categoryScrollController.addListener(() {
      if (_categoryScrollController.hasClients) {
        final menuStateProvider = Provider.of<MenuStateProvider>(context, listen: false);
        menuStateProvider.saveCategoryScrollOffset(_categoryScrollController.offset);
      }
    });
    
    _loadInitialData().then((_) {
      // If a specific dish was selected (e.g. from home search suggestion),
      // open its offers sheet immediately after the menu data loads
      if (widget.selectedAdminDishId != null && widget.selectedAdminDishId!.isNotEmpty) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted) return;
          _navigateToDish(widget.selectedAdminDishId!);
        });
      }
    });
    // Apply initial search query if provided
    if (widget.initialSearchQuery != null && widget.initialSearchQuery!.isNotEmpty) {
      _searchQuery = widget.initialSearchQuery!;
      _searchController.text = widget.initialSearchQuery!;
    }
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
      await Future.wait([foodProvider.fetchCategories(headers), _fetchExpertise()]);
      
      // Get sorted categories with placeholders
      final categories = _getSortedCategories(foodProvider.categories);
      
      // Check if we have saved state from previous session (not app restart)
      if (menuStateProvider.hasState && widget.initialCategoryId == null) {
        // Restore saved category selection but always scroll to top on re-entry
        _selectedCategoryId = menuStateProvider.selectedCategoryId!;
      } else if (widget.initialCategoryId != null && widget.initialCategoryId!.isNotEmpty) {
        // Pre-select the category passed from Home page
        _selectedCategoryId = widget.initialCategoryId!;
        // Save this as new state
        menuStateProvider.saveSelectedCategory(_selectedCategoryId);
      } else {
        // STEP 3: Default to "All" (empty string) instead of first category
        _selectedCategoryId = '';
        // Save this as new state
        menuStateProvider.saveSelectedCategory(_selectedCategoryId);
      }
      
      // PHASE 4: Use AdminDish 2-layer API for menu list, respecting any pre-set filters
      final filterProvider = Provider.of<FilterProvider>(context, listen: false);
      if (_selectedCategoryId.isNotEmpty) {
        await foodProvider.fetchAdminDishesWithStats(
          headers,
          lat: lat,
          lng: lng,
          categoryId: _selectedCategoryId,
          topRatedOnly: filterProvider.showOnlyPopularCooks,
        );
      } else {
        await foodProvider.fetchAdminDishesWithStats(
          headers,
          lat: lat,
          lng: lng,
          topRatedOnly: filterProvider.showOnlyPopularCooks,
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
  
  /// Refresh dishes with current filter state (called when filters are applied)
  Future<void> _refreshDishesWithFilters() async {
    final foodProvider = Provider.of<FoodProvider>(context, listen: false);
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final addressProvider = Provider.of<AddressProvider>(context, listen: false);
    final filterProvider = Provider.of<FilterProvider>(context, listen: false);
    final headers = authProvider.getAuthHeaders();
    
    final lat = addressProvider.defaultAddress?.lat;
    final lng = addressProvider.defaultAddress?.lng;
    
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // PHASE 4: Use AdminDish 2-layer API with active filters
      if (_selectedCategoryId.isNotEmpty) {
        await foodProvider.fetchAdminDishesWithStats(
          headers,
          lat: lat,
          lng: lng,
          categoryId: _selectedCategoryId,
          orderType: filterProvider.orderType,
          prepTime: filterProvider.prepTime,
          topRatedOnly: filterProvider.showOnlyPopularCooks,
        );
      } else {
        await foodProvider.fetchAdminDishesWithStats(
          headers,
          lat: lat,
          lng: lng,
          orderType: filterProvider.orderType,
          prepTime: filterProvider.prepTime,
          topRatedOnly: filterProvider.showOnlyPopularCooks,
        );
      }
      
      // Reset dish list scroll to top when applying filters
      if (_dishListScrollController.hasClients) {
        _dishListScrollController.jumpTo(0);
      }
    } catch (e) {
      setState(() {
        _error = 'Failed to refresh dishes';
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
    final effectiveCategoryId = categoryId.isEmpty ? null : categoryId;
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
    final filterProvider = Provider.of<FilterProvider>(context, listen: false);
    final headers = authProvider.getAuthHeaders();
    
    final lat = addressProvider.defaultAddress?.lat;
    final lng = addressProvider.defaultAddress?.lng;

    try {
      // PHASE 4: Use AdminDish 2-layer API with category filter and active filters
      await foodProvider.fetchAdminDishesWithStats(
        headers,
        lat: lat,
        lng: lng,
        categoryId: effectiveCategoryId,
        orderType: filterProvider.orderType,
        prepTime: filterProvider.prepTime,
        topRatedOnly: filterProvider.showOnlyPopularCooks,
      );
      
      // Reset dish list scroll to top when changing category
      if (_dishListScrollController.hasClients) {
        _dishListScrollController.jumpTo(0);
        menuStateProvider.saveDishListScrollOffset(0);
      }
        } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Failed to load dishes';
      });
    } finally {
      if (!mounted) return;
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
    
    // Add preparation time
    if (filterProvider.prepTime != '60') {
      chips.add('${filterProvider.prepTime} min');
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
  
  Future<void> _removeFilter(String filterLabel, FilterProvider filterProvider) async {
    // Remove based on filter type
    if (filterLabel.contains(' min')) {
      // Preparation time filter
      filterProvider.setPrepTime('60');
    } else if (filterLabel.contains('-') && filterLabel.contains(' ')) {
      // Price range filter (e.g., "50-200 SAR")
      filterProvider.setPriceRange(0, 500);
    } else if (filterLabel.contains(' km')) {
      // Distance filter
      filterProvider.setDistance(30);
    } else if (filterLabel == 'Popular Cooks') {
      filterProvider.setShowOnlyPopularCooks(false);
    } else if (filterLabel == 'Featured Dishes') {
      filterProvider.setShowOnlyPopularDishes(false);
    } else if (filterLabel.startsWith('Sort: ')) {
      filterProvider.setSortBy('Recommended');
    } else if (filterLabel == 'Delivery' || filterLabel == 'Pickup') {
      filterProvider.setOrderType('All');
    } else {
      // Could be a category
      if (filterProvider.selectedCategories.contains(filterLabel)) {
        filterProvider.toggleCategory(filterLabel);
      }
    }
    
    // Refresh dishes with remaining filters to update stats
    await _refreshDishesWithFilters();
  }

  Future<void> _navigateToDish(String adminDishId, {String? dishName}) async {
    // Use shared helper for consistent flow
    await openDishWithCookSheet(
      context: context,
      adminDishId: adminDishId,
      dishName: dishName,
    );
    // Guard: if context unmounted (user cancelled), return early
    if (!mounted) return;
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = Provider.of<LanguageProvider>(context);
    final isRTL = languageProvider.isArabic;
    
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      extendBody: true,
      body: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        behavior: HitTestBehavior.translucent,
        child: SafeArea(
        child: Column(
          children: [
            // Menu title matching Home page position
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
                          isRTL ? 'القائمة' : 'Menu',
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
          _buildMenuSearchBar(isRTL),
          _buildDeliveryPickupToggle(isRTL),
          // Show active filters or category tabs / expertise slider
          Consumer<FilterProvider>(
            builder: (context, filterProvider, _) {
              final hasActiveFilters = filterProvider.selectedCategories.isNotEmpty ||
                  filterProvider.orderType != 'All' ||
                  filterProvider.prepTime != '60' ||
                  filterProvider.minPrice != 0 ||
                  filterProvider.maxPrice != 500 ||
                  filterProvider.distance != 30 ||
                  filterProvider.showOnlyPopularCooks ||
                  filterProvider.showOnlyPopularDishes ||
                  filterProvider.sortBy != 'Recommended';
              
              if (hasActiveFilters) {
                return _buildActiveFilterChips(isRTL, filterProvider);
              } else {
                // Show expertise slider in Cook mode, category tabs in Dish mode
                if (_isByDish) {
                  return _buildCategoryTabs(isRTL);
                } else {
                  return _buildExpertiseSlider(isRTL);
                }
              }
            },
          ),
            Expanded(
              child: _buildDishList(isRTL),
            ),
          ],
        ),
      ),
      ), // GestureDetector
      bottomNavigationBar: const GlobalBottomNavigation(),
    );
  }

  Widget _buildMenuSearchBar(bool isRTL) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
      child: SizedBox(
        height: 44,
        child: Stack(
          children: [
            // GestureDetector intercepts taps for location gate; AbsorbPointer
            // prevents TextField from directly receiving pointer events.
            GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () async {
                final hasLocation = await _checkLocationAndPrompt();
                if (!hasLocation || !context.mounted) return;
                FocusScope.of(context).requestFocus(_searchFocusNode);
              },
              child: AbsorbPointer(
                child: TextField(
                  controller: _searchController,
                  focusNode: _searchFocusNode,
                  decoration: InputDecoration(
                    hintText: isRTL ? 'ابحث عن طبق...' : 'Search for a dish...',
                    hintStyle: const TextStyle(color: Color(0xFF969494), fontSize: 14),
                    prefixIcon: const Icon(Icons.search, color: Color(0xFF969494), size: 20),
                    // Reserve space at the visual end (suffixIcon = end in both LTR and RTL)
                    suffixIcon: _searchQuery.isNotEmpty ? const SizedBox(width: 44) : null,
                    filled: true,
                    fillColor: const Color(0xFFE7E7E7),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                  ),
                  onChanged: (val) {
                    setState(() => _searchQuery = val);
                  },
                ),
              ),
            ),
            // Clear button lives outside AbsorbPointer so it receives taps.
            // In RTL the button sits on the LEFT (text end); in LTR on the RIGHT.
            if (_searchQuery.isNotEmpty)
              Positioned(
                left: isRTL ? 0 : null,
                right: isRTL ? null : 0,
                top: 0,
                bottom: 0,
                child: GestureDetector(
                  onTap: () {
                    setState(() {
                      _searchQuery = '';
                      _searchController.clear();
                    });
                  },
                  child: const SizedBox(
                    width: 44,
                    child: Icon(Icons.close, color: Color(0xFF969494), size: 18),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildDeliveryPickupToggle(bool isRTL) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Expanded(
            child: SizedBox(
              height: 44,
              child: Container(
                decoration: BoxDecoration(
                  color: const Color(0xFFE7E7E7),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () async {
                        final hasLocation = await _checkLocationAndPrompt();
                        if (!hasLocation || !context.mounted) return;
                        setState(() => _isByDish = true);
                        // When switching to Dish mode, reset expertise
                        _selectedExpertise = 'All';
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          color: _isByDish ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: _isByDish
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
                          isRTL ? 'الأطباق' : 'Dish',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: _isByDish ? FontWeight.w700 : FontWeight.w500,
                            color: _isByDish ? AppTheme.textPrimary : const Color(0xFF969494),
                          ),
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: () async {
                        final hasLocation = await _checkLocationAndPrompt();
                        if (!hasLocation || !context.mounted) return;
                        setState(() => _isByDish = false);
                        // Fetch cooks when switching to Cook mode
                        final foodProvider = Provider.of<FoodProvider>(context, listen: false);
                        final authProvider = Provider.of<AuthProvider>(context, listen: false);
                        final addressProvider = Provider.of<AddressProvider>(context, listen: false);
                        final headers = authProvider.getAuthHeaders();
                        final lat = addressProvider.defaultAddress?.lat;
                        final lng = addressProvider.defaultAddress?.lng;
                        
                        // Reset expertise to All when switching to Cook mode
                        _selectedExpertise = 'All';
                        
                        await foodProvider.fetchCooks(
                          headers: headers,
                          lat: lat,
                          lng: lng,
                        );
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          color: !_isByDish ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: !_isByDish
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
                          isRTL ? 'الطهاة' : 'Cook',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: !_isByDish ? FontWeight.w700 : FontWeight.w500,
                            color: !_isByDish ? AppTheme.textPrimary : const Color(0xFF969494),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            ), // Close SizedBox height: 44
          ),
          const SizedBox(width: 12),
          // Filter button - unified refine component
          RefineButton(
            isMenuPage: true,
            beforeTap: _checkLocationAndPrompt,
            onApply: () async {
              // Re-fetch dishes with current filters to get filtered stats
              await _refreshDishesWithFilters();
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
            itemCount: categories.length + 1,
            itemBuilder: (context, index) {
              // STEP 4: Make "All" tab behave like other categories
              final isAllTab = index == 0;
              final currentId = isAllTab ? '' : categories[index - 1].id;
              final isSelected = _selectedCategoryId == currentId;
              
              final category = isAllTab
                  ? Category(id: '', name: 'All', nameAr: 'الكل')
                  : categories[index - 1];

              return GestureDetector(
               onTap: () {
                 // STEP 4: Use consistent ID for All tab
                 final tappedId = isAllTab ? '' : categories[index - 1].id;
                 _onCategoryTap(tappedId);
               },
                child: Container(
                  key: ValueKey(category.id), // STEP 4: Stable key to prevent rebuild flicker
                  margin: const EdgeInsets.only(right: 12), // Reduced from 16
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        isRTL ? category.nameAr : category.nameEn,
                        style: TextStyle(
                          fontSize: 12, // Reduced from 14
                          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                          // STEP 4: Remove gray color for "All" tab when selected
                          color: isSelected ? AppTheme.textPrimary : const Color(0xFF7D7C7C),
                        ),
                      ),
                      const SizedBox(height: 3), // Reduced from 4
                      if (isSelected)
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

  Widget _buildExpertiseSlider(bool isRTL) {
    final items = <Map<String, dynamic>>[
      {'name': 'All', 'nameAr': 'الكل'},
      ..._expertiseApiItems,
    ];

    return Container(
      height: 45,
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: const BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: Color(0xFFE7E7E7),
            width: 1,
          ),
        ),
      ),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        controller: _categoryScrollController,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        itemCount: items.length,
        itemBuilder: (context, index) {
          final item = items[index];
          final backendValue = item['name']?.toString() ?? '';
          final displayLabel = isRTL
              ? (item['nameAr'] ?? item['name'] ?? backendValue).toString()
              : backendValue;
          final isSelected = _selectedExpertise == backendValue;

          return GestureDetector(
            onTap: () async {
              final hasLocation = await _checkLocationAndPrompt();
              if (!hasLocation || !context.mounted) return;
              setState(() {
                _selectedExpertise = backendValue;
              });
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
                expertise: backendValue == 'All' ? 'All' : backendValue,
              );
            },
            child: Container(
              margin: const EdgeInsets.only(right: 12),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    displayLabel,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                      color: isSelected ? AppTheme.textPrimary : const Color(0xFF7D7C7C),
                    ),
                  ),
                  const SizedBox(height: 3),
                  if (isSelected)
                    Container(
                      width: displayLabel.length * 7.5, // Approximate width
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
  }

  Widget _buildCookList(bool isRTL) {
    if (_isLoading) {
      return _buildLoadingSkeleton();
    }

    if (_error != null) {
      return _buildErrorState(isRTL);
    }

    return Consumer<FoodProvider>(
      builder: (context, foodProvider, _) {
        final cooks = foodProvider.cooks;
        
        if (cooks.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.restaurant_menu, size: 64, color: Colors.grey[300]),
                const SizedBox(height: 16),
                Text(
                  isRTL ? 'لا يوجد طهاة' : 'No cooks available',
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          );
        }

        return ListView.builder(
          controller: _dishListScrollController,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          itemCount: cooks.length,
          itemBuilder: (context, index) {
            final cook = cooks[index];
            return _buildCookCard(cook, isRTL);
          },
        );
      },
    );
  }

  Widget _buildCookCard(CookInfo cook, bool isRTL) {
    // Get cook name (storeName > name)
    final cookName = cook.storeName?.isNotEmpty == true ? cook.storeName! : cook.name;

    // Get expertise display (first expertise or 'Multi-Specialty')
    final expertiseEn = cook.expertise.isNotEmpty ? cook.expertise.first : 'Multi-Specialty';
    String expertiseDisplay = expertiseEn;
    if (isRTL) {
      // Look up Arabic name from fetched expertise items
      final match = _expertiseApiItems.firstWhere(
        (item) => (item['name']?.toString() ?? '').toLowerCase() == expertiseEn.toLowerCase(),
        orElse: () => <String, dynamic>{},
      );
      final nameAr = match['nameAr']?.toString() ?? '';
      expertiseDisplay = nameAr.isNotEmpty ? nameAr : _translateExpertiseToAr(expertiseEn);
    }
    
    return GestureDetector(
      onTap: () async {
        final hasLocation = await _checkLocationAndPrompt();
        if (!hasLocation || !context.mounted) return;
        Navigator.pushNamed(
          context,
          '/cook-kitchen',
          arguments: {'cookId': cook.id, 'cookName': cookName, 'initialTab': '1'},
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
                  // Cook Name
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
                  // Rating (below name as per requirement)
                  Row(
                    children: [
                      const Icon(Icons.star, size: 14, color: Color(0xFFFF7A00)),
                      const SizedBox(width: 4),
                      Text(
                        isRTL
                            ? '${toArabicNumerals(cook.rating?.toStringAsFixed(1) ?? '0.0')} (${toArabicNumerals('${cook.ratingsCount ?? 0}')})'
                            : '${cook.rating?.toStringAsFixed(1) ?? '0.0'} (${cook.ratingsCount ?? 0})',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: Color(0xFF7D7C7C),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  // Expertise
                  Row(
                    children: [
                      Text(
                        isRTL ? 'خبرة' : 'Expertise:',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF7D7C7C),
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        expertiseDisplay,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  // Dishes count
                  Row(
                    children: [
                      Text(
                        isRTL ? 'أطباق' : 'Dishes:',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF7D7C7C),
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        isRTL ? toArabicNumerals('${cook.dishesCount}') : '${cook.dishesCount}',
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

  String _translateExpertiseToAr(String en) {
    const map = {
      'multi-specialty': 'متعدد التخصصات',
      'fast food': 'وجبات سريعة',
      'home cooking': 'طبخ بيتي',
      'grills': 'مشاوي',
      'grilling': 'مشاوي',
      'seafood': 'مأكولات بحرية',
      'vegetarian': 'نباتي',
      'vegan': 'نباتي صارم',
      'desserts': 'حلويات',
      'sweets': 'حلويات',
      'pastries': 'معجنات',
      'bakery': 'مخبوزات',
      'salads': 'سلطات',
      'soups': 'شوربات',
      'breakfast': 'فطور',
      'lunch': 'غداء',
      'dinner': 'عشاء',
      'italian': 'إيطالي',
      'asian': 'آسيوي',
      'middle eastern': 'شرق أوسطي',
      'arabic': 'عربي',
      'indian': 'هندي',
      'mexican': 'مكسيكي',
      'american': 'أمريكي',
      'mediterranean': 'متوسطي',
      'healthy': 'صحي',
      'diet': 'دايت',
      'keto': 'كيتو',
      'turkish': 'تركي',
      'lebanese': 'لبناني',
    };
    return map[en.toLowerCase()] ?? en;
  }

  Widget _buildCookPlaceholder() {
    return Container(
      width: 80,
      height: 80,
      color: const Color(0xFFE7E7E7),
      child: const Icon(
        Icons.person,
        size: 32,
        color: Color(0xFF969494),
      ),
    );
  }

  Widget _buildDishList(bool isRTL) {
    // Show cook list in Cook mode, dish list in Dish mode
    if (!_isByDish) {
      return _buildCookList(isRTL);
    }
    
    if (_isLoading) {
      return _buildLoadingSkeleton();
    }

    if (_error != null) {
      return _buildErrorState(isRTL);
    }

    return Consumer2<FoodProvider, FilterProvider>(
      builder: (context, foodProvider, filterProvider, _) {
        // PHASE 4: Use adminDishesWithStats for dish list
        // NOTE: When filters are applied via _refreshDishesWithFilters(),
        // the backend already returns filtered dishes with correct stats.
        // Client-side filtering is only needed for search and price range
        // (which are not part of the backend filter params).
        List<Food> filteredDishes = List.from(foodProvider.adminDishesWithStats);

        // Apply search filter (client-side only)
        if (_searchQuery.isNotEmpty) {
          final q = _searchQuery.toLowerCase();
          filteredDishes = filteredDishes.where((dish) {
            return dish.name.toLowerCase().contains(q) ||
                (dish.nameAr?.toLowerCase().contains(q) ?? false);
          }).toList();
        }

        // Apply price range filter (client-side only)
        if (filterProvider.minPrice > 0 || filterProvider.maxPrice < 500) {
          filteredDishes = filteredDishes.where((dish) {
            final price = dish.price.toDouble() ?? 0.0;
            return price >= filterProvider.minPrice && price <= filterProvider.maxPrice;
          }).toList();
        }

        // NOTE: Offer-level filters (orderType, prepTime, topRated) are now handled
        // by the backend when _refreshDishesWithFilters() is called.
        // The backend returns only dishes with matching offers and pre-computed stats.
        // No client-side filtering needed for these.

        // Apply featured/popular dishes filter
        // DISH-LEVEL FILTER: Based on Admin Panel Featured flag (isPopular)
        // No offer-level logic - purely dish-level
        if (filterProvider.showOnlyPopularDishes) {
          filteredDishes = filteredDishes.where((dish) {
            return dish.isPopular == true; // Admin Panel Featured flag
          }).toList();
        }

        // Apply sorting
        switch (filterProvider.sortBy) {
          case 'Rating':
            filteredDishes.sort((a, b) {
              return b.rating.compareTo(a.rating);
            });
            break;
          case 'Price (Low–High)':
            filteredDishes.sort((a, b) {
              return a.price.compareTo(b.price);
            });
            break;
          case 'Price (High–Low)':
            filteredDishes.sort((a, b) {
              return b.price.compareTo(a.price);
            });
            break;
          case 'Delivery Time':
            filteredDishes.sort((a, b) {
              return a.prepTime.compareTo(b.prepTime);
            });
            break;
          case 'Distance':
            // Distance sorting would require location data
            break;
          case 'Recommended':
          default:
            // Default sorting (no change)
            break;
        }

        final dishes = filteredDishes;

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

  Widget _buildDishCard(Food dish, bool isRTL) {
    // Food model: use field access instead of Map access
    final String dishId = dish.adminDishId ?? dish.id;
    final String dishName = isRTL ? (dish.nameAr ?? dish.name) : dish.name;
    
    // STEP 2: Use Food model fields for image (not Map access)
    String? rawImage;
    
    // Priority: dish.images (DishOffer) > dish.image (legacy) > dish.imageUrl (AdminDish)
    if (dish.images.isNotEmpty) {
      rawImage = dish.images.first;
    } else if (dish.image != null && dish.image!.isNotEmpty) {
      rawImage = dish.image;
    } else if (dish.imageUrl != null && dish.imageUrl!.isNotEmpty) {
      rawImage = dish.imageUrl;
    }
    
    final String imageUrl = rawImage?.trim() ?? '';
    final double minPrice = dish.minPrice ?? dish.price;
    final int offerCount = dish.offerCount ?? dish.cookCount;
    
    return GestureDetector(
      onTap: () async {
        final hasLocation = await _checkLocationAndPrompt();
        if (!hasLocation || !context.mounted) return;
        await _navigateToDish(dishId, dishName: dishName);
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
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Dish Image
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: imageUrl.isNotEmpty
    ? SmartImage(
  imageUrl: imageUrl,
  width: 80,
  height: 80,
  fit: BoxFit.cover,
)
    : Container(
        width: 80,
        height: 80,
        color: const Color(0xFFE7E7E7),
        child: const Icon(
          Icons.restaurant,
          size: 32,
          color: Color(0xFF969494),
              ),
      ),
),
const SizedBox(width: 12),
            // Dish Info
            Expanded(
              child: Column(
                crossAxisAlignment: isRTL ? CrossAxisAlignment.end : CrossAxisAlignment.start,
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
                    textAlign: isRTL ? TextAlign.right : TextAlign.left,
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
                        isRTL ? '(${toArabicNumerals('${dish.variantsCount ?? 0}')})' : '(${dish.variantsCount ?? 0})',
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
                        isRTL ? '(${toArabicNumerals('$offerCount')})' : '($offerCount)',
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
            // Price on the right side - vertically centered within the card
            Padding(
              padding: const EdgeInsets.only(right: 16, top: 8, bottom: 8),
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
                    isRTL ? '${toArabicNumerals('${minPrice.toInt()}')}+' : '${minPrice.toInt()}+',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: Colors.black,
                    ),
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
