import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:smooth_page_indicator/smooth_page_indicator.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:http/http.dart' as http;
import '../../config/theme.dart';
import '../../config/api_config.dart';
import '../../providers/language_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/food_provider.dart';
import '../../providers/notification_provider.dart';
import '../../providers/navigation_provider.dart';
import '../../providers/country_provider.dart';
import '../../providers/address_provider.dart';
import '../../models/food.dart';
import '../../models/category.dart';
import '../../utils/image_url_utils.dart'; // PHASE 4: getAbsoluteUrl utility
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../widgets/map_picker.dart';
import '../menu/menu_screen.dart';
import '../orders/orders_screen.dart';
import '../messages/messages_screen.dart';
import '../help/help_screen.dart';
import '../settings/settings_screen.dart';
import 'see_all_dishes_screen.dart';
import 'see_all_cooks_screen.dart';
import '../notifications/notifications_screen.dart';
import '../../widgets/global_bottom_navigation.dart';
import '../../widgets/refine_button.dart';
import '../../widgets/star_rating_widget.dart';
// STEP 1: Offer sheet helper
import '../../utils/dish_navigation.dart'; // Shared dish navigation helper
import '../../widgets/cook_details_dialog.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with RouteAware {
  int _carouselIndex = 0;
  final PageController _pageController = PageController(); // Remove viewportFraction
  Timer? _autoPlayTimer;
  int _heroAdsCount = 5; // Default value
  List<dynamic> _heroImages = []; // Store fetched hero images
  
  // PHASE 2: Mobile Featured Dishes Settings
  String? _mobileHeroFeaturedDishId;
  List<String> _mobileSupportFeaturedDishIds = [];
  bool _settingsLoaded = false;
  
  // Scroll controllers for all horizontal sliders
  final ScrollController _dishesScrollController = ScrollController();
  final ScrollController _categoriesScrollController = ScrollController();
  final ScrollController _cooksScrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      // Get auth token and fetch addresses
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final addressProvider = Provider.of<AddressProvider>(context, listen: false);
      final token = authProvider.token;
      
      // Fetch addresses with token if available
      if (token != null) {
        await addressProvider.fetchAddresses(token);
      }
      
      // Check if we have a valid address - only gate specific actions, don't block home
      // Let home load normally; location gating happens on specific actions
      _loadData();
      _fetchHeroImages();
      _fetchMobileFeaturedDishSettings();
      _startAutoPlay();
      
      // Set home as active tab AND origin
      final navigationProvider = Provider.of<NavigationProvider>(context, listen: false);
      navigationProvider.setActiveTab(NavigationTab.home, setAsOrigin: true);
      
      // Listen for country changes to refresh data
      final countryProvider = Provider.of<CountryProvider>(context, listen: false);
      countryProvider.addListener(_onCountryChanged);
    });
  }

  // Helper: Check if location exists and show small action sheet if not
  // Returns true if location exists, false if user needs to add location
  Future<bool> _checkLocationAndPrompt() async {
    final addressProvider = Provider.of<AddressProvider>(context, listen: false);
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final languageProvider = Provider.of<LanguageProvider>(context, listen: false);
    final isRTL = languageProvider.isArabic;
    
    // Refresh addresses if we have token
    final token = authProvider.token;
    if (token != null) {
      await addressProvider.fetchAddresses(token);
    }
    
    // Check if we have a valid address
    if (addressProvider.defaultAddress != null) {
      return true;
    }
    
    // No location - show small action sheet
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
                    ? 'يرجى تحديد موقع توصيل以便浏览附近的菜品'
                    : 'Please select a delivery location to browse dishes near you.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey[600]),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.pop(ctx); // Close action sheet
                    _openFullLocationPicker(); // Open full picker
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

  // Open full location picker bottom sheet (~88% height)
  void _openFullLocationPicker() {
    final languageProvider = Provider.of<LanguageProvider>(context, listen: false);
    final isRTL = languageProvider.isArabic;
    final addressProvider = Provider.of<AddressProvider>(context, listen: false);
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    
    final labelController = TextEditingController(text: 'Home');
    final line1Controller = TextEditingController();
    final cityController = TextEditingController();
    double? lat;
    double? lng;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        height: MediaQuery.of(context).size.height * 0.88,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          children: [
            Container(
              margin: const EdgeInsets.only(top: 12),
              width: 40, height: 4,
              decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2)),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    isRTL ? 'إضافة عنوان جديد' : 'Add New Address',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(ctx)),
                ],
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(controller: labelController, decoration: InputDecoration(labelText: isRTL ? 'التصنيف' : 'Label')),
                    const SizedBox(height: 12),
                    TextField(controller: line1Controller, decoration: InputDecoration(labelText: isRTL ? 'العنوان' : 'Address')),
                    const SizedBox(height: 12),
                    TextField(controller: cityController, decoration: InputDecoration(labelText: isRTL ? 'المدينة' : 'City')),
                    const SizedBox(height: 16),
                    if (lat != null && lng != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Text(isRTL ? 'تم تحديد الموقع' : 'Location picked', style: const TextStyle(color: Colors.green, fontSize: 12)),
                      ),
                    OutlinedButton.icon(
                      onPressed: () async {
                        final LatLng? result = await Navigator.push(context, MaterialPageRoute(builder: (context) => MapPicker(
                          title: isRTL ? 'حدد موقع التوصيل' : 'Pick Delivery Location',
                          initialLat: lat ?? 24.7136,
                          initialLng: lng ?? 46.6753,
                        )));
                        if (result != null) {
                          lat = result.latitude;
                          lng = result.longitude;
                        }
                      },
                      icon: const Icon(Icons.map),
                      label: Text(lat == null ? (isRTL ? 'تحديد على الخريطة' : 'Pick on Map') : (isRTL ? 'تغيير' : 'Change')),
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () async {
                          final token = authProvider.token;
                          if (token == null || line1Controller.text.isEmpty || cityController.text.isEmpty) return;
                          final newAddr = await addressProvider.createAddress(
                            token: token,
                            addressLine1: line1Controller.text,
                            addressLine2: null,
                            city: cityController.text,
                            countryCode: 'SA', // Locked to SA
                            label: labelController.text,
                            deliveryNotes: null,
                            lat: lat ?? 24.7136,
                            lng: lng ?? 46.6753,
                          );
                          if (newAddr != null && ctx.mounted) {
                            Navigator.pop(ctx);
                          }
                        },
                        style: ElevatedButton.styleFrom(backgroundColor: AppTheme.accentColor, padding: const EdgeInsets.symmetric(vertical: 14)),
                        child: Text(isRTL ? 'حفظ' : 'Save', style: const TextStyle(color: Colors.white)),
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showLocationGate() {
    final languageProvider = Provider.of<LanguageProvider>(context, listen: false);
    final isRTL = languageProvider.isArabic;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => PopScope(
        canPop: false,
        onPopInvokedWithResult: (didPop, result) async {
          // Prevent popping
        },
        child: AlertDialog(
          title: Text(isRTL ? 'مطلوب تحديد الموقع' : 'Location Required'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.location_on, size: 64, color: AppTheme.accentColor),
              const SizedBox(height: 16),
              Text(
                isRTL 
                    ? 'يرجى إضافة عنوان توصيل لتتمكن من تصفح الأطباق القريبة منك.'
                    : 'Please add a delivery address to browse dishes available in your area.',
                textAlign: TextAlign.center,
              ),
            ],
          ),
          actions: [
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => _showAddAddressDialog(context, isRTL),
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.accentColor),
                child: Text(isRTL ? 'إضافة عنوان' : 'Add Address', style: const TextStyle(color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showAddAddressDialog(BuildContext context, bool isRTL) {
    final labelController = TextEditingController(text: 'Home');
    final line1Controller = TextEditingController();
    final cityController = TextEditingController();
    final countryProvider = Provider.of<CountryProvider>(context, listen: false);
    double? lat;
    double? lng;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(isRTL ? 'إضافة عنوان جديد' : 'Add New Address'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: labelController,
                  decoration: InputDecoration(labelText: isRTL ? 'التصنيف' : 'Label'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: line1Controller,
                  decoration: InputDecoration(
                    labelText: isRTL ? 'العنوان' : 'Address',
                    hintText: isRTL ? 'شارع، مبنى، شقة' : 'Street, Building, Apt',
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: cityController,
                  decoration: InputDecoration(labelText: isRTL ? 'المدينة' : 'City'),
                ),
                const SizedBox(height: 16),
                if (lat != null && lng != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Text(
                      isRTL ? 'تم تحديد الموقع بنجاح' : 'Location picked successfully',
                      style: const TextStyle(color: Colors.green, fontSize: 12),
                    ),
                  ),
                OutlinedButton.icon(
                  onPressed: () async {
                    final LatLng? result = await Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => MapPicker(
                          title: isRTL ? 'حدد موقع التوصيل' : 'Pick Delivery Location',
                          initialLat: lat ?? 24.7136,
                          initialLng: lng ?? 46.6753,
                        ),
                      ),
                    );
                    if (result != null) {
                      setDialogState(() {
                        lat = result.latitude;
                        lng = result.longitude;
                      });
                    }
                  },
                  icon: const Icon(Icons.map),
                  label: Text(lat == null 
                      ? (isRTL ? 'تحديد على الخريطة' : 'Pick on Map')
                      : (isRTL ? 'تغيير الموقع' : 'Change Location')),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: lat == null ? Colors.grey : Colors.green,
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(isRTL ? 'إلغاء' : 'Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (line1Controller.text.isEmpty || cityController.text.isEmpty || lat == null) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(isRTL ? 'يرجى إكمال جميع الحقول وتحديد الموقع' : 'Please fill all fields and pick location')),
                  );
                  return;
                }

                final addressProvider = Provider.of<AddressProvider>(context, listen: false);
                final token = context.read<AuthProvider>().token;
                if (token == null) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Authentication required')),
                  );
                  return;
                }

                final newAddr = await addressProvider.addAddress(
                  token: token,
                  addressLine1: line1Controller.text,
                  addressLine2: null,
                  city: cityController.text,
                  countryCode: countryProvider.countryCode,
                  label: labelController.text,
                  deliveryNotes: null,
                  lat: lat!,
                  lng: lng!,
                );

                if (newAddr != null && context.mounted) {
                  Navigator.pop(context); // Close add dialog
                  Navigator.pop(context); // Close location gate
                  _loadData(); // Load data with new address
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.accentColor),
              child: Text(isRTL ? 'إضافة' : 'Add', style: const TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  void _onCountryChanged() {
    if (mounted) {
      debugPrint('🌍 HomeScreen: Country changed, refreshing data...');
      _loadData();
      _resetAllSliders();
    }
  }

  @override
  void dispose() {
    // Remove listener
    try {
      final countryProvider = Provider.of<CountryProvider>(context, listen: false);
      countryProvider.removeListener(_onCountryChanged);
    } catch (_) {}
    
    _autoPlayTimer?.cancel();
    _pageController.dispose();
    _dishesScrollController.dispose();
    _categoriesScrollController.dispose();
    _cooksScrollController.dispose();
    super.dispose();
  }

  // Reset all sliders to the start position
  void _resetAllSliders() {
    if (_dishesScrollController.hasClients) {
      _dishesScrollController.jumpTo(0);
    }
    if (_categoriesScrollController.hasClients) {
      _categoriesScrollController.jumpTo(0);
    }
    if (_cooksScrollController.hasClients) {
      _cooksScrollController.jumpTo(0);
    }
  }

  void _startAutoPlay() {
    _autoPlayTimer = Timer.periodic(const Duration(seconds: 5), (timer) {
      if (_pageController.hasClients) {
        final int nextPage = (_carouselIndex + 1) % _heroAdsCount;
        _pageController.animateToPage(
          nextPage,
          duration: const Duration(milliseconds: 400),
          curve: Curves.easeInOut,
        );
      }
    });
  }

  Future<void> _fetchHeroImages() async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/settings/hero-images'),
      );
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final heroImages = data['heroImages'] as List<dynamic>;
        
        setState(() {
          _heroImages = heroImages;
          _heroAdsCount = heroImages.isNotEmpty ? heroImages.length : 5;
        });
      }
    } catch (e) {
      debugPrint('Error fetching hero images: $e');
      // Keep default value of 5 and empty images list
      setState(() {
        _heroImages = [];
        _heroAdsCount = 5;
      });
    }
  }

  // PHASE 2: Fetch mobile featured dish settings from admin
  Future<void> _fetchMobileFeaturedDishSettings() async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/settings'),
      );
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        
        setState(() {
          _mobileHeroFeaturedDishId = data['mobileHeroFeaturedDishId'];
          _mobileSupportFeaturedDishIds = List<String>.from(
            data['mobileSupportFeaturedDishIds'] ?? []
          );
          _settingsLoaded = true;
        });
      }
    } catch (e) {
      debugPrint('Error fetching mobile featured dish settings: $e');
      setState(() {
        _mobileHeroFeaturedDishId = null;
        _mobileSupportFeaturedDishIds = [];
        _settingsLoaded = true;
      });
    }
  }

  Future<void> _loadData() async {
    final authProvider = context.read<AuthProvider>();
    final foodProvider = context.read<FoodProvider>();
    final addressProvider = context.read<AddressProvider>();
    final headers = authProvider.getAuthHeaders();
    
    final lat = addressProvider.defaultAddress?.lat;
    final lng = addressProvider.defaultAddress?.lng;

    await Future.wait([
      foodProvider.fetchFeaturedAdminDishes(headers, limit: 10),
      foodProvider.fetchCategories(headers),
      foodProvider.fetchPopularChefs(headers, lat: lat, lng: lng),
    ]);
  }

  // Navigation removed - using global navigation provider

  // Sort categories according to the specified display order
  List<Category> _getSortedCategories(List<Category> categories, bool isLoading) {
    // If still loading or no categories from API, use default categories
    if (isLoading || categories.isEmpty) {
      return DefaultCategories.getCategories();
    }
    
    // Sort by sortOrder from API, falling back to DefaultCategories order
    final sortedList = [...categories];
    sortedList.sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    
    // If we have fewer categories than defaults, fill in with placeholders
    for (final defaultCat in DefaultCategories.getCategories()) {
      if (!sortedList.any((c) => c.nameEn == defaultCat.nameEn)) {
        sortedList.add(defaultCat);
      }
    }
    
    return sortedList;
  }

  // PHASE 4: Get sorted AdminDishes - use featuredDishes directly (already sorted by API)
  List<Food> _getSortedDishes() {
    // PHASE 4: Use featuredDishes from foodProvider (fetched from /api/public/admin-dishes/featured)
    return context.read<FoodProvider>().featuredDishes;
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final authProvider = context.watch<AuthProvider>();
    final foodProvider = context.watch<FoodProvider>();
    final isRTL = languageProvider.isArabic;
    final userName = authProvider.user?.name.split(' ').first ?? 'User';

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      extendBody: true, // Allow body to extend behind bottom navigation
      extendBodyBehindAppBar: true, // Allow body to show behind transparent AppBar
      appBar: _buildSlimHeader(userName, isRTL, authProvider),
      drawer: NavigationDrawer(
        isRTL: isRTL,
        onLogout: () {
          authProvider.logout();
          Navigator.of(context).pushReplacementNamed('/login');
        },
      ),
      body: Stack(
        children: [
          // Main scrollable content
          SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 96), // Changed from 86px to 96px
            // Slim Search Bar
            _buildSlimSearchBar(isRTL),
            // Featured Dishes Section - Hero + Support Layout
            _buildSectionTitle(
              isRTL ? 'الأطباق المميزة' : 'Featured Dishes',
              isRTL,
              subtitle: isRTL ? 'أطباق رائجة اليوم' : 'Popular dishes Today',
              onSeeAll: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const SeeAllDishesScreen()),
                ).then((_) {
                  // Reset all sliders when returning
                  _resetAllSliders();
                });
              },
            ),
            _buildFeaturedDishesSection(foodProvider, isRTL),
            const SizedBox(height: 18),

            // Categories Section
            _buildSectionTitle(
              isRTL ? 'الفئات' : 'Categories',
              isRTL,
              onSeeAll: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const MenuScreen()),
                ).then((_) {
                  // Reset all sliders when returning
                  _resetAllSliders();
                });
              },
            ),
            SizedBox(
              height: 91,
              child: ListView.builder(
                controller: _categoriesScrollController,
                scrollDirection: Axis.horizontal,
                clipBehavior: Clip.none,
                padding: EdgeInsets.only(
                  left: isRTL ? 0 : 24,
                  right: isRTL ? 24 : 0,
                ),
                itemCount: () {
                  final raw = _getSortedCategories(foodProvider.categories, foodProvider.isLoading);
                  final Map<String, Category> byKey = {};
                  for (final c in raw) {
                    final k = _categoryKey(c);
                    final existing = byKey[k];
                    final currentIsBackend = c.id.length > 10;
                    final existingIsBackend = existing != null && existing.id.length > 10;
                    if (existing == null) {
                      byKey[k] = c;
                    } else if (!existingIsBackend && currentIsBackend) {
                      byKey[k] = c;
                    }
                  }
                  return byKey.length;
                }(),
                itemBuilder: (context, index) {
                  final raw = _getSortedCategories(foodProvider.categories, foodProvider.isLoading);
                  final Map<String, Category> byKey = {};
                  for (final c in raw) {
                    final k = _categoryKey(c);
                    final existing = byKey[k];
                    final currentIsBackend = c.id.length > 10;
                    final existingIsBackend = existing != null && existing.id.length > 10;
                    if (existing == null) {
                      byKey[k] = c;
                    } else if (!existingIsBackend && currentIsBackend) {
                      byKey[k] = c;
                    }
                  }
                  final categories = byKey.values.toList();
                  final category = categories[index];
                  return _buildNewCategoryCard(category, isRTL, index);
                },
              ),
            ),            const SizedBox(height: 21),

            // Top-rated Cooks Section - NEW DESIGN
            _buildSectionTitle(
              isRTL ? 'الطهاة الأعلى تقييماً' : 'Top-rated Cooks',
              isRTL,
              subtitle: isRTL ? 'الأيدي الخفية وراء النكهات.' : 'The hands behind the flavor.',
              onSeeAll: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const SeeAllCooksScreen()),
                ).then((_) {
                  // Reset all sliders when returning
                  _resetAllSliders();
                });
              },
            ),
            // Only show if there are top-rated cooks
            if (foodProvider.popularChefs.isNotEmpty) ...[
              // Hero Top-Rated Cook (First Item)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: _buildHeroTopRatedCook(foodProvider.popularChefs[0], isRTL),
              ),
              const SizedBox(height: 16),
              // Remaining Top-Rated Cooks
              if (foodProvider.popularChefs.length > 1)
                SizedBox(
                  height: 180,
                  child: ListView.builder(
                    controller: _cooksScrollController,
                    scrollDirection: Axis.horizontal,
                    clipBehavior: Clip.none,
                    padding: EdgeInsets.only(
                      left: isRTL ? 0 : 24,
                      right: isRTL ? 24 : 0,
                    ),
                    itemCount: foodProvider.popularChefs.length - 1,
                    itemBuilder: (context, index) {
                      final chef = foodProvider.popularChefs[index + 1]; // Skip first (hero)
                      return Padding(
                        padding: const EdgeInsetsDirectional.only(end: 14),
                        child: _buildTopRatedCookCard(chef, isRTL, languageProvider),
                      );
                    },
                  ),
                ),
            ],
            const SizedBox(height: 80), // Extra padding for bottom navigation transparency
          ],
        ),
          ),
          // Fixed background rectangle behind header
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: Container(
              height: 111, // Reduced by 5px (from 116 to 111)
              decoration: const BoxDecoration(
                color: AppTheme.backgroundColor, // #F5F5F5
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: const GlobalBottomNavigation(),
    );
  }

  // Fixed header - transparent background matching app background
  PreferredSizeWidget _buildSlimHeader(String userName, bool isRTL, AuthProvider authProvider) {
    return AppBar(
      elevation: 0,
      scrolledUnderElevation: 0, // Prevent elevation change on scroll
      toolbarHeight: 101, // Increased by 25px (from 76 to 101)
      backgroundColor: Colors.transparent, // Transparent to show app background
      surfaceTintColor: Colors.transparent, // Prevent tint color on scroll
      shadowColor: Colors.transparent, // Prevent shadow on scroll
      automaticallyImplyLeading: false,
      leading: Padding(
        padding: const EdgeInsets.only(top: 37), // Increased by 25px (from 12 to 37)
        child: Builder(
          builder: (BuildContext context) {
            return IconButton(
              icon: Image.asset(
                'icons/Burger.png',
                width: 24,
                height: 24,
              ),
              onPressed: () {
                Scaffold.of(context).openDrawer();
              },
              padding: EdgeInsets.zero,
            );
          },
        ),
      ),
      titleSpacing: 0,
      title: Padding(
        padding: const EdgeInsets.only(top: 37, left: 4, right: 4), // Increased by 25px (from 12 to 37)
        child: Row(
          children: [
            // Greeting + subtitle (center-left, expanded)
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    isRTL ? 'مرحبا، $userName' : 'Hi, $userName',
                    style: const TextStyle(
                      color: AppTheme.textPrimary,
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      height: 1.2,
                    ),
                  ),
                  Text(
                    isRTL
                        ? 'هل تشعر بالجوع؟ دعنا نجد شيئًا لذيذًا!'
                        : 'Feeling hungry? Let\'s find something delicious!',
                    style: const TextStyle(
                      color: Color(0xFF7D7C7C),
                      fontSize: 10, // Reverted back to 10
                      fontWeight: FontWeight.w600, // Reverted back to semi-bold
                      height: 1.2,
                      letterSpacing: -0.4,
                      fontFamily: 'Inter',
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            // Notification bell
            Consumer<NotificationProvider>(
              builder: (context, notificationProvider, _) {
                return GestureDetector(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const NotificationsScreen(),
                      ),
                    );
                  },
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: AppTheme.backgroundColor,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(8),
                          child: Image.asset(
                            'icons/notifications.png',
                            width: 24,
                            height: 24,
                            fit: BoxFit.contain,
                            errorBuilder: (_, __, ___) => const Icon(
                              Icons.notifications_outlined,
                              color: AppTheme.textPrimary,
                              size: 22,
                            ),
                          ),
                        ),
                      ),
                      if (notificationProvider.unreadCount > 0)
                        Positioned(
                          top: -2,
                          right: -2,
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: const BoxDecoration(
                              color: Color(0xFFE94057),
                              shape: BoxShape.circle,
                            ),
                            constraints: const BoxConstraints(
                              minWidth: 18,
                              minHeight: 18,
                            ),
                            child: Text(
                              notificationProvider.unreadCount > 9
                                  ? '9+'
                                  : '${notificationProvider.unreadCount}',
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: Colors.white,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        ),
                    ],
                  ),
                );
              },
            ),
            const SizedBox(width: 8),
            // Profile picture (right) - tappable to settings
            GestureDetector(
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (context) => const SettingsScreen())),
              child: Consumer<AuthProvider>(
                builder: (context, authProvider, _) {
                  final profileImg = authProvider.user?.profileImage;
                  final hasValidImage = profileImg != null && profileImg.isNotEmpty;
                  return CircleAvatar(
                    radius: 18,
                    backgroundColor: AppTheme.dividerColor,
                    backgroundImage: hasValidImage ? getImageProvider(profileImg) : null,
                    child: hasValidImage ? null : const Icon(Icons.person, color: AppTheme.textSecondary, size: 20),
                  );
                },
              ),
            ),
            const SizedBox(width: 16),
          ],
        ),
      ),
    );
  }

  // Search modal - full-screen overlay with suggestions
  void _showSearchModal(BuildContext context, bool isRTL) {
    final searchController = TextEditingController();
    List<Map<String, dynamic>> suggestions = [];
    Timer? debounceTimer;
    final countryCode = context.read<CountryProvider>().countryCode;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) {
          Future<void> fetchSuggestions(String query) async {
            if (query.trim().isEmpty) {
              setModalState(() => suggestions = []);
              return;
            }
            try {
              final uri = Uri.parse(
                '${ApiConfig.baseUrl}/public/admin-dishes/search?q=${Uri.encodeComponent(query)}&country=$countryCode&limit=8',
              );
              final response = await http.get(uri);
              if (response.statusCode == 200) {
                final data = json.decode(response.body) as List;
                setModalState(() => suggestions = data.cast<Map<String, dynamic>>());
              }
            } catch (_) {}
          }

          return Container(
            height: MediaQuery.of(context).size.height * 0.85,
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            ),
            child: Column(
              children: [
                Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE0E0E0),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                  child: TextField(
                    controller: searchController,
                    autofocus: true,
                    textInputAction: TextInputAction.search,
                    decoration: InputDecoration(
                      hintText: isRTL ? 'ابحث عن طبق...' : 'Search for a dish...',
                      prefixIcon: const Icon(Icons.search, color: Color(0xFF969494)),
                      suffixIcon: IconButton(
                        icon: const Icon(Icons.close, color: Color(0xFF969494)),
                        onPressed: () => Navigator.pop(context),
                      ),
                      filled: true,
                      fillColor: const Color(0xFFF5F5F5),
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
                      debounceTimer?.cancel();
                      debounceTimer = Timer(const Duration(milliseconds: 300), () {
                        fetchSuggestions(val);
                      });
                    },
                    onSubmitted: (val) {
                      if (val.trim().isNotEmpty) {
                        Navigator.pop(context);
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => MenuScreen(initialSearchQuery: val.trim()),
                          ),
                        ).then((_) => _resetAllSliders());
                      }
                    },
                  ),
                ),
                const Divider(height: 1),
                Expanded(
                  child: suggestions.isEmpty
                      ? Center(
                          child: Text(
                            isRTL ? 'ابدأ الكتابة للبحث...' : 'Start typing to search...',
                            style: const TextStyle(color: Color(0xFF969494)),
                          ),
                        )
                      : ListView.builder(
                          itemCount: suggestions.length,
                          itemBuilder: (context, index) {
                            final dish = suggestions[index];
                            final name = isRTL
                                ? (dish['nameAr'] as String? ?? dish['nameEn'] as String? ?? '')
                                : (dish['nameEn'] as String? ?? '');
                            final category = isRTL
                                ? (dish['categoryNameAr'] as String? ?? dish['categoryNameEn'] as String? ?? '')
                                : (dish['categoryNameEn'] as String? ?? '');
                            final rawUrl = dish['imageUrl'] as String? ?? '';
                            final fullImageUrl = rawUrl.isEmpty
                                ? ''
                                : rawUrl.startsWith('http')
                                    ? rawUrl
                                    : 'https://api.eltekkeya.com$rawUrl';
                            return ListTile(
                              leading: ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: fullImageUrl.isNotEmpty
                                    ? CachedNetworkImage(
                                        imageUrl: fullImageUrl,
                                        width: 44,
                                        height: 44,
                                        fit: BoxFit.cover,
                                        placeholder: (_, __) => Container(
                                          width: 44, height: 44,
                                          color: const Color(0xFFE7E7E7),
                                        ),
                                        errorWidget: (_, __, ___) => Container(
                                          width: 44, height: 44,
                                          color: const Color(0xFFE7E7E7),
                                          child: const Icon(Icons.restaurant, size: 20, color: Color(0xFF969494)),
                                        ),
                                      )
                                    : Container(
                                        width: 44, height: 44,
                                        color: const Color(0xFFE7E7E7),
                                        child: const Icon(Icons.restaurant, size: 20, color: Color(0xFF969494)),
                                      ),
                              ),
                              title: Text(
                                name,
                                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                              ),
                              subtitle: category.isNotEmpty
                                  ? Text(category, style: const TextStyle(fontSize: 12, color: Color(0xFF7D7C7C)))
                                  : null,
                              onTap: () {
                                Navigator.pop(context);
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => MenuScreen(
                                      initialSearchQuery: dish['nameEn'] as String? ?? name,
                                      selectedAdminDishId: dish['_id'] as String?,
                                    ),
                                  ),
                                ).then((_) => _resetAllSliders());
                              },
                            );
                          },
                        ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  // Search bar and filter button - matching design
  Widget _buildSlimSearchBar(bool isRTL) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Search bar - #D9D9D9 background
          Expanded(
            child: GestureDetector(
              onTap: () async {
                              // Check location before opening search
                              final hasLocation = await _checkLocationAndPrompt();
                              if (hasLocation && context.mounted) {
                                _showSearchModal(context, isRTL);
                              }
                            },
              child: Container(
                height: 44,
                decoration: BoxDecoration(
                  color: const Color(0xFFD9D9D9),
                  borderRadius: BorderRadius.circular(12),
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
                    const SizedBox(width: 16),
                    Image.asset(
                      'icons/Search.png',
                      width: 20,
                      height: 20,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        isRTL ? 'ابحث' : 'Search',
                        style: const TextStyle(
                          color: Color(0xFF969494),
                          fontSize: 14,
                          fontWeight: FontWeight.w400,
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          // Refine/Filter button - unified component
          RefineButton(
            onApply: () {
              // Navigate to Menu page with applied filters
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const MenuScreen()),
              ).then((_) {
                // Reset all sliders when returning from Menu
                _resetAllSliders();
              });
            },
          ),
        ],
      ),
    );
  }

  // Hero image slider - full width, one image at a time, auto-play every 5 seconds
  Widget _buildHeroImageSlider() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 3), // Top 0px (moved up 12px from original), bottom 3px (decreased from 15)
      child: Column(
        children: [
          SizedBox(
            height: 150, // Increased by 15px (from 135 to 150)
            child: PageView(
              controller: _pageController,
              onPageChanged: (index) {
                setState(() {
                  _carouselIndex = index;
                });
              },
              children: _heroImages.isNotEmpty
                ? _heroImages.map((image) => _buildHeroSlide(getAbsoluteUrl(image['imageUrl']))).toList()
                : List.generate(
                    _heroAdsCount,
                    (index) {
                      // Fallback to asset images if API fails
                      final extension = (index + 1) == 5 ? 'jpg' : 'png';
                      return _buildHeroSlide('assets/images/Ad${index + 1}.$extension');
                    },
                  ),
            ),
          ),
          const SizedBox(height: 8),
          AnimatedSmoothIndicator(
            activeIndex: _carouselIndex,
            count: _heroImages.isNotEmpty ? _heroImages.length : _heroAdsCount,
            effect: const WormEffect(
              dotWidth: 5,
              dotHeight: 5,
              activeDotColor: AppTheme.accentColor,
              dotColor: Color(0xFFD0D0D0),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeroSlide(String imageUrl) {
    final bool isAsset = imageUrl.startsWith('assets/');
    
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: isAsset
            ? Image.asset(
                imageUrl,
                width: double.infinity,
                height: 150, // Increased by 15px (from 135 to 150)
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  color: AppTheme.dividerColor,
                  child: const Center(
                    child: Icon(Icons.restaurant, size: 40, color: AppTheme.textSecondary),
                  ),
                ),
              )
            : CachedNetworkImage(
                imageUrl: imageUrl,
                width: double.infinity,
                height: 150, // Increased by 15px (from 135 to 150)
                fit: BoxFit.cover,
                errorWidget: (_, __, ___) => Container(
                  color: AppTheme.dividerColor,
                  child: const Center(
                    child: Icon(Icons.restaurant, size: 40, color: AppTheme.textSecondary),
                  ),
                ),
              ),
      ),
    );
  }

  Widget _buildSectionTitle(String title, bool isRTL, {VoidCallback? onSeeAll, String? subtitle}) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontFamily: 'Noto Serif',
                  color: Color(0xFF40403F),
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (onSeeAll != null)
                GestureDetector(
                  onTap: onSeeAll,
                  child: Text(
                    isRTL ? 'عرض الكل' : 'See all',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF969494),
                    ),
                  ),
                ),
            ],
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 0),
            Text(
              subtitle,
              style: const TextStyle(
                fontFamily: 'Noto Serif',
                color: Color(0xFF969494),
                fontSize: 14,
                fontWeight: FontWeight.w400,
              ),
            ),
          ],
        ],
      ),
    );
  }

  // PHASE 1: Featured Dishes Section - Hero + Support Layout
  Widget _buildFeaturedDishesSection(FoodProvider foodProvider, bool isRTL) {
    // Get sorted dishes for fallback logic
    final sortedDishes = _getSortedDishes();
    
    // Loading state
    if (foodProvider.isLoading && sortedDishes.isEmpty) {
      return const SizedBox(
        height: 200,
        child: Center(child: CircularProgressIndicator(color: AppTheme.accentColor)),
      );
    }
    
    // Fallback: need at least 1 dish for hero
    if (sortedDishes.isEmpty) {
      return const SizedBox.shrink();
    }
    
    // PHASE 2: Determine which dishes to show
    Food heroDish = sortedDishes[0];
    List<Food> supportDishes = [];
    
    // Try to use admin-selected dishes if settings are loaded
    if (_settingsLoaded && _mobileHeroFeaturedDishId != null) {
      // Find the selected hero dish
      heroDish = sortedDishes.firstWhere(
        (d) => d.adminDishId == _mobileHeroFeaturedDishId || d.id == _mobileHeroFeaturedDishId,
        orElse: () => sortedDishes[0], // Fallback to first dish
      );
    } else {
      // Fallback: use first dish as hero
      heroDish = sortedDishes[0];
    }
    
    // Get support dishes
    if (_settingsLoaded && _mobileSupportFeaturedDishIds.length == 2) {
      // Find the selected support dishes
      for (final dishId in _mobileSupportFeaturedDishIds) {
        final dish = sortedDishes.firstWhere(
          (d) => d.adminDishId == dishId || d.id == dishId,
          orElse: () => heroDish, // Fallback won't be used if settings are valid
        );
        if (dish != heroDish && !supportDishes.contains(dish)) {
          supportDishes.add(dish);
        }
      }
      // Ensure exactly 2 support dishes
      if (supportDishes.length != 2) {
        // Fallback: use next 2 dishes after hero
        supportDishes = sortedDishes
            .where((d) => d != heroDish)
            .take(2)
            .toList();
      }
    } else {
      // Fallback: use next 2 dishes after hero
      supportDishes = sortedDishes
          .where((d) => d != heroDish)
          .take(2)
          .toList();
    }
    
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          // Hero Featured Dish
          _buildHeroDishCard(heroDish, isRTL),
          
          const SizedBox(height: 12),
          
          // Support Featured Dishes (2 dishes side by side)
          if (supportDishes.isNotEmpty)
            _buildSupportDishesRow(supportDishes, isRTL),
        ],
      ),
    );
  }

  // Build Hero Featured Dish (wide format)
  Widget _buildHeroDishCard(Food dish, bool isRTL) {
    final String imageUrlRaw = dish.imageUrl ?? dish.image ?? '';
    final String imageUrl = getAbsoluteUrl(imageUrlRaw);
    final String displayName = isRTL ? (dish.nameAr ?? dish.name) : dish.name;
    final String displayDesc = dish.description;
    
    // Debug: Log hero dish data to verify description is populated
    debugPrint('HERO DISH: id=${dish.id}, name=$displayName, description=${displayDesc.isEmpty ? "EMPTY" : displayDesc.substring(0, (displayDesc.length > 50 ? 50 : displayDesc.length))}...');
    
    return GestureDetector(
      onTap: () async {
        final hasLocation = await _checkLocationAndPrompt();
        if (!hasLocation || !context.mounted) return;
        await openDishWithCookSheet(
          context: context,
          adminDishId: dish.adminDishId ?? dish.id,
          dishName: displayName,
        );
      },
      child: LayoutBuilder(
        builder: (context, constraints) {
          // Hero dimensions: width = screen width - 48px, height = 0.8 × width
          final width = constraints.maxWidth;
          final height = width * 0.8;
            
          return Container(
            width: width,
            height: height,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              color: const Color(0xFFD9D9D9),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  // Dish Image
                  if (imageUrl.isNotEmpty && !imageUrlRaw.startsWith('assets/'))
                    CachedNetworkImage(
                      imageUrl: imageUrl,
                      fit: BoxFit.cover,
                      placeholder: (_, __) => Container(color: const Color(0xFFE0E0E0)),
                      errorWidget: (_, __, ___) => Container(
                        color: const Color(0xFFE0E0E0),
                        child: const Icon(Icons.restaurant, size: 48, color: Color(0xFF969494)),
                      ),
                    )
                  else
                    Container(
                      color: const Color(0xFFE0E0E0),
                      child: const Icon(Icons.restaurant, size: 48, color: Color(0xFF969494)),
                    ),
                  
                  // Popular Badge (top-left)
                  Positioned(
                    top: 16,
                    left: 16,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.6),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.star,
                            color: Color(0xFFFCD535),
                            size: 14,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            isRTL ? 'متميز' : 'Popular',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  
                  // Bottom gradient overlay (40% height)
                  Positioned(
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: height * 0.4,
                    child: Container(
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.bottomCenter,
                          end: Alignment.topCenter,
                          colors: [
                            Color(0xFF000000),
                            Color(0x00000000),
                          ],
                        ),
                      ),
                    ),
                  ),
                  
                  // Content overlay
                  Positioned(
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 0,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.end,
                        mainAxisSize: MainAxisSize.max,
                        children: [
                          // Dish Name
                          Text(
                            displayName,
                            style: const TextStyle(
                              color: Color(0xFFEFB5B5),
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              fontFamily: 'Inter',
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          // Dish Description and Order Button row (aligned vertically)
                          const SizedBox(height: 4),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              // Dish Description (Subtitle) - on the left
                              if (displayDesc.isNotEmpty)
                                Expanded(
                                  child: Text(
                                    displayDesc,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 24,
                                      fontWeight: FontWeight.w400,
                                      fontFamily: 'Noto Serif',
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                )
                              else
                                const SizedBox(width: 1),
                              const SizedBox(width: 8),
                              // Order Now Button - on the right
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFF7A00),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  isRTL ? 'اطلب الآن' : 'Order Now',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
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


  // Build Support Featured Dishes Row (2 dishes side by side)
  Widget _buildSupportDishesRow(List<Food> dishes, bool isRTL) {
    return Row(
      children: [
        // Left card
        Expanded(
          child: _buildSupportDishCard(dishes[0], isRTL),
        ),
        if (dishes.length > 1) ...[
          const SizedBox(width: 12),
          // Right card
          Expanded(
            child: _buildSupportDishCard(dishes[1], isRTL),
          ),
        ],
      ],
    );
  }

  // Build Support Dish Card (1:1 square ratio)
  Widget _buildSupportDishCard(Food dish, bool isRTL) {
    final String imageUrlRaw = dish.imageUrl ?? dish.image ?? '';
    final String imageUrl = getAbsoluteUrl(imageUrlRaw);
    final String displayName = isRTL ? (dish.nameAr ?? dish.name) : dish.name;
    final String displayDesc = dish.description;
    
    // Debug: Log support dish data to verify description is populated
    debugPrint('SUPPORT DISH: id=${dish.id}, name=$displayName, description=${displayDesc.isEmpty ? "EMPTY" : displayDesc.substring(0, (displayDesc.length > 50 ? 50 : displayDesc.length))}...');
    
    return GestureDetector(
      onTap: () async {
        final hasLocation = await _checkLocationAndPrompt();
        if (!hasLocation || !context.mounted) return;
        await openDishWithCookSheet(
          context: context,
          adminDishId: dish.adminDishId ?? dish.id,
          dishName: displayName,
        );
      },
      child: Column(
        crossAxisAlignment: isRTL ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          // 1:1 Square Image
          AspectRatio(
            aspectRatio: 1, // 1:1 square ratio
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                color: const Color(0xFFD9D9D9),
              ),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: LayoutBuilder(
                      builder: (context, constraints) {
                        // Get container dimensions
                        final containerHeight = constraints.maxHeight;
                        final containerWidth = constraints.maxWidth;
                        
                        return imageUrl.isNotEmpty && !imageUrlRaw.startsWith('assets/')
                            ? CachedNetworkImage(
                                imageUrl: imageUrl,
                                fit: BoxFit.fitHeight,
                                alignment: Alignment.center,
                                placeholder: (_, __) => Container(color: const Color(0xFFE0E0E0)),
                                errorWidget: (_, __, ___) => Container(
                                  color: const Color(0xFFE0E0E0),
                                  child: const Icon(Icons.restaurant, size: 32, color: Color(0xFF969494)),
                                ),
                              )
                            : Container(
                                color: const Color(0xFFE0E0E0),
                                child: const Icon(Icons.restaurant, size: 32, color: Color(0xFF969494)),
                              );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          const SizedBox(height: 8),
                    
          // Row with Name/Description on left, View button on right
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Name and Description column
              Expanded(
                child: Column(
                  crossAxisAlignment: isRTL ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                  children: [
                    // Dish Name - Noto Serif 18px #40403F
                    Text(
                      displayName,
                      style: const TextStyle(
                        fontFamily: 'Noto Serif',
                        color: Color(0xFF40403F),
                        fontSize: 18,
                        fontWeight: FontWeight.w400,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: isRTL ? TextAlign.right : TextAlign.left,
                    ),
                              
                    // Dish Description - Inter bold 10px #969494
                    if (displayDesc.isNotEmpty) ...
                      [
                      const SizedBox(height: 2),
                      Text(
                        displayDesc,
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          color: Color(0xFF969494),
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: isRTL ? TextAlign.right : TextAlign.left,
                      ),
                    ],
                  ],
                ),
              ),
                        
              const SizedBox(width: 8),
                        
              // View Icon button - no background, aligned right (flex to prevent cropping)
              const SizedBox(
                width: 28,
                height: 28,
                child: Padding(
                  padding: EdgeInsets.only(right: 2),
                  child: Image(
                    image: AssetImage('icons/View.png'),
                    fit: BoxFit.contain,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // Bottom navigation moved to GlobalBottomNavigation widget

  // PHASE 4: Build AdminDish card for Featured section
  Widget _buildDishCard(Food dish, bool isRTL) {
    // PHASE 4: Use imageUrl with getAbsoluteUrl
    final String imageUrlRaw = dish.imageUrl ?? dish.image ?? '';
    final String imageUrl = getAbsoluteUrl(imageUrlRaw);
    final bool isAssetImage = imageUrlRaw.isEmpty || imageUrlRaw.startsWith('assets/');
    
    // PHASE 4: Bilingual name - show nameAr if Arabic
    final String displayName = isRTL ? (dish.nameAr ?? dish.name) : dish.name;
    
    // PHASE 4: Use offerCount (kitchens count) instead of cookCount
    final int kitchensCount = dish.offerCount ?? dish.cookCount;
    
    return GestureDetector(
      onTap: () async {
        // Check location before opening dish
        final hasLocation = await _checkLocationAndPrompt();
        if (!hasLocation || !context.mounted) return;
        // Use shared helper for consistent flow, then reset sliders
        await openDishWithCookSheet(
          context: context,
          adminDishId: dish.adminDishId ?? dish.id,
          dishName: displayName,
        );
        _resetAllSliders();
      },
      child: Container(
        width: 118,
        height: 134,
        margin: const EdgeInsetsDirectional.only(end: 12),
        decoration: const BoxDecoration(
          borderRadius: BorderRadius.vertical(top: Radius.circular(15), bottom: Radius.circular(10)),
          color: Color(0xFFD9D9D9),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Dish Image - PHASE 4: Use getAbsoluteUrl
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(15)),
              child: SizedBox(
                width: 118,
                height: 79,
                child: !isAssetImage && imageUrl.isNotEmpty
                    ? CachedNetworkImage(
                        imageUrl: imageUrl,
                        width: 118,
                        height: 79,
                        fit: BoxFit.cover,
                        placeholder: (_, __) => Container(
                          color: const Color(0xFFE0E0E0),
                        ),
                        errorWidget: (_, __, ___) => Container(
                          width: 118,
                          height: 79,
                          color: const Color(0xFFE0E0E0),
                          child: const Icon(Icons.restaurant, size: 32, color: Color(0xFF969494)),
                        ),
                      )
                    : (imageUrlRaw.isEmpty
                        ? Container(
                            width: 118,
                            height: 79,
                            color: const Color(0xFFE0E0E0),
                            child: const Icon(Icons.restaurant, size: 32, color: Color(0xFF969494)),
                          )
                        : Image.asset(
                            'dishes/$imageUrlRaw',
                            width: 118,
                            height: 79,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Container(
                              width: 118,
                              height: 79,
                              color: const Color(0xFFE0E0E0),
                              child: const Icon(Icons.restaurant, size: 32, color: Color(0xFF969494)),
                            ),
                          )),
              ),
            ),
            
            // Info Bar with Cooks and Dishes count
            Container(
              width: 118,
              height: 18,
              color: const Color(0xFF40403F),
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Cook icon
                  Image.asset(
                    'icons/Cooks.png',
                    width: 10,
                    height: 10,
                    color: Colors.white,
                    errorBuilder: (_, __, ___) => const Icon(
                      Icons.person_outline,
                      size: 10,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(width: 2),
                  Text(
                    '${dish.cookCount}',
                    style: const TextStyle(
                      fontSize: 8,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFFFFFFFF),
                      height: 1,
                    ),
                  ),
                  const SizedBox(width: 6),
                  // Separator
                  Container(
                    width: 2,
                    height: 2,
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  // Dishes icon
                  Image.asset(
                    'icons/Dishes.png',
                    width: 10,
                    height: 10,
                    color: Colors.white,
                    errorBuilder: (_, __, ___) => const Icon(
                      Icons.restaurant_menu,
                      size: 10,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(width: 2),
                  Text(
                    '${dish.orderCount}',
                    style: const TextStyle(
                      fontSize: 8,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFFFFFFFF),
                      height: 1,
                    ),
                  ),
                ],
              ),
            ),
            
            // Dish Name and Description
            Container(
              width: 118,
              height: 35, // Reduced to fix 1px overflow
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
              decoration: const BoxDecoration(
                color: Color(0xFFD9D9D9),
                borderRadius: BorderRadius.only(
                  bottomLeft: Radius.circular(10),
                  bottomRight: Radius.circular(10),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    dish.name,
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF40403F),
                      height: 1.2,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    dish.description,
                    style: const TextStyle(
                      fontSize: 8,
                      fontWeight: FontWeight.w400,
                      color: Color(0xFF40403F),
                      height: 1.2,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Helper: Get normalized key for category deduplication
  String _categoryKey(Category c) {
    final name = (c.nameEn.isNotEmpty ? c.nameEn : c.name).trim().toLowerCase();
    if (name == 'oven dishes') return 'oven';
    return name;
  }

  // Helper: Get display name (handle "Oven Dishes" -> "Oven")
  String _categoryDisplayName(Category c, bool isRTL) {
    final nameEn = (c.nameEn.isNotEmpty ? c.nameEn : c.name).trim().toLowerCase();
    if (nameEn == 'oven dishes') return isRTL ? 'اكلات بالفرن' : 'Oven';
    return c.getName(isRTL);
  }

  String _categoryAssetFor(Category category) {
    final key = _categoryKey(category);

    switch (key) {
      case 'oven dishes':
        return 'categories/Oven.png';
      case 'traditional':
      case 'traditional dishes':
        return 'categories/Traditional.png';
      case 'roasted':
        return 'categories/Roasted.png';
      case 'grilled':
        return 'categories/Grilled.png';
      case 'casseroles':
        return 'categories/Casseroles.png';
      case 'fried':
        return 'categories/Fried.png';
      case 'sides':
        return 'categories/Sides.png';
      case 'salads':
        return 'categories/Salads.png';
      case 'desserts':
        return 'categories/Desserts.png';

      default:
        return 'categories/Oven.png';
    }
  }

  // NEW CATEGORY CARD BUILDER (Mobile Redesign)
  Widget _buildNewCategoryCard(Category category, bool isRTL, int index) {
    // Check if category has a dedicated mobile icon uploaded (new-style categories only)
    final bool hasValidMobileIcon = category.icons.mobile.isNotEmpty && 
                                     category.icons.mobile.contains('/uploads/');
    
    // Get asset path for legacy categories without mobile icons
    final String assetPath = _categoryAssetFor(category);
    
    // First card is 130x91, others are 65x91
    final bool isFirstCard = index == 0;
    final double cardWidth = isFirstCard ? 130 : 65;
    const double cardHeight = 91;
    const double labelHeight = 26;
    
    return GestureDetector(
      onTap: () async {
        // Check location before navigating to menu
        final hasLocation = await _checkLocationAndPrompt();
        if (!hasLocation || !context.mounted) return;
        // Navigate to Menu screen with this category pre-selected
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => MenuScreen(initialCategoryId: category.id),
          ),
        ).then((_) {
          // Reset all sliders when returning from Menu screen
          _resetAllSliders();
        });
      },
      child: Container(
        width: cardWidth,
        height: cardHeight,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(4),
        ),
        margin: const EdgeInsetsDirectional.only(end: 6.5),
        child: Stack(
          children: [
            // Image (full 91px height, label overlays at bottom)
            Container(
              width: cardWidth,
              height: cardHeight,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(4),
              ),
              child: hasValidMobileIcon
                  ? CachedNetworkImage(
                      imageUrl: getAbsoluteUrl(category.icons.mobile),
                      width: cardWidth,
                      height: cardHeight,
                      fit: BoxFit.cover,
                      placeholder: (context, url) => Container(
                        color: const Color(0xFFD9D9D9),
                        child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
                      ),
                      errorWidget: (context, url, error) {
                        // Silently fall back to asset for missing mobile icons
                        return Image.asset(
                          assetPath,
                          width: cardWidth,
                          height: cardHeight,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            color: const Color(0xFFD9D9D9),
                            child: const Icon(Icons.restaurant, size: 32, color: Color(0xFF40403F)),
                          ),
                        );
                      },
                    )
                  : Image.asset(
                      assetPath,
                      width: cardWidth,
                      height: cardHeight,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        debugPrint('Failed to load category icon (asset): $assetPath');
                        return Container(
                          color: const Color(0xFFD9D9D9),
                          child: const Icon(
                            Icons.restaurant,
                            size: 32,
                            color: Color(0xFF40403F),
                          ),
                        );
                      },
                    ),
            ),
            // Label overlay (26px height, positioned at bottom of image)
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Container(
                width: cardWidth,
                height: labelHeight,
                color: Colors.transparent,
                alignment: Alignment.center,
                child: Text(
                  _categoryDisplayName(category, isRTL),
                  style: TextStyle(
                    fontFamily: 'Manrope',
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: category.mobileFontColor == 'light' 
                        ? const Color(0xFFFBDFAA)  // Light text color
                        : const Color(0xFF47240A),  // Dark text color
                    shadows: const [
                      Shadow(
                        color: Color(0xFFA78751),  // Stroke color
                        offset: Offset(0, 0),
                        blurRadius: 0.26,  // Simulates stroke width
                      ),
                    ],
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryCard(Category category, bool isRTL) {
    // Check if category has a dedicated mobile icon uploaded (new-style categories only)
    // Only use mobile icon if explicitly set AND looks like a valid upload path
    final bool hasValidMobileIcon = category.icons.mobile.isNotEmpty && 
                                     category.icons.mobile.contains('/uploads/');
    
    // Get asset path for legacy categories without mobile icons (existing behavior unchanged)
    final String assetPath = _categoryAssetFor(category);
    
    return GestureDetector(
      onTap: () async {
        // Check location before navigating to menu
        final hasLocation = await _checkLocationAndPrompt();
        if (!hasLocation || !context.mounted) return;
        // Navigate to Menu screen with this category pre-selected
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => MenuScreen(initialCategoryId: category.id),
          ),
        ).then((_) {
          // Reset all sliders when returning from Menu screen
          _resetAllSliders();
        });
      },
      child: Container(
        width: 70,
        height: 72,
        margin: const EdgeInsetsDirectional.only(end: 8),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.start,
          children: [
            Container(
              width: 70,
              height: 72,
              decoration: const BoxDecoration(
                color: Color(0xFFD9D9D9),
                borderRadius: BorderRadius.all(Radius.circular(5)),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Icon
                  Container(
                    height: 40,
                    alignment: Alignment.center,
                    child: Transform.translate(
                      offset: category.nameEn == 'Oven' ? const Offset(0, 5) : Offset.zero,
                      child: hasValidMobileIcon
                          ? CachedNetworkImage(
                              imageUrl: getAbsoluteUrl(category.icons.mobile),
                              width: 40,
                              height: 40,
                              fit: BoxFit.contain,
                              placeholder: (context, url) => const CircularProgressIndicator(strokeWidth: 2),
                              errorWidget: (context, url, error) {
                                // Silently fall back to asset for missing mobile icons
                                return Image.asset(
                                  assetPath,
                                  width: 40,
                                  height: 40,
                                  fit: BoxFit.contain,
                                  errorBuilder: (_, __, ___) => const Icon(Icons.restaurant, size: 32, color: Color(0xFF40403F)),
                                );
                              },
                            )
                          : Image.asset(
                              assetPath,
                              width: 40,
                              height: 40,
                              fit: BoxFit.contain,
                              errorBuilder: (context, error, stackTrace) {
                                debugPrint('Failed to load category icon (asset): $assetPath');
                                return const Icon(
                                  Icons.restaurant,
                                  size: 32,
                                  color: Color(0xFF40403F),
                                );
                              },
                            ),
                    ),
                  ),
                  // Category name
                  Text(
                    _categoryDisplayName(category, isRTL),
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF40403F),
                    ),
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildChefCard(Chef chef, bool isRTL, LanguageProvider languageProvider) {
    // Use getImageProvider for unified image handling
    final String? profileImage = chef.profileImage;
    
    return Container(
      width: 135, // Card width (90% of height)
      margin: const EdgeInsetsDirectional.only(end: 12),
      child: Container(
        width: 135,
        height: 161,
        decoration: BoxDecoration(
          color: const Color(0xFFF5F5F5),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Stack(
          children: [
            // 1. Cook Image (Bottom Layer)
            Positioned.fill(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image(
                  image: getImageProvider(profileImage),
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    color: const Color(0xFFF5F5F5),
                    child: const Icon(Icons.person, size: 50, color: Color(0xFF969494)),
                  ),
                ),
              ),
            ),
            
            // 2. Hollow Card Overlay (Ccard.png) (Top Layer)
            Positioned.fill(
              child: Image.asset(
                'cooks/Ccard.png',
                fit: BoxFit.fill, // Ensure frame matches card dimensions exactly
                errorBuilder: (context, error, stackTrace) => Container(),
              ),
            ),

            // 3. Info Overlay (Details)
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.transparent,
                      Colors.black.withValues(alpha: 0.9),
                    ],
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Stars Rating
                    StarRatingWidget(
                      rating: chef.rating,
                      ratingCount: chef.reviewCount,
                      itemSize: 11,
                      filledColor: const Color(0xFFCEA45A),
                      unfilledColor: Colors.white.withValues(alpha: 0.3),
                    ),
                    const SizedBox(height: 3),
                    // Cook Name
                    Text(
                      chef.name,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 3),
                    // Expertise with Gradient Lines
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox(
                          width: 28,
                          child: Container(
                            height: 1,
                            decoration: const BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.centerRight,
                                end: Alignment.centerLeft,
                                colors: [Color(0xFFCEA45A), Color(0xFF111211)],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Flexible(
                          child: Text(
                            languageProvider.getExpertiseTitle(chef.expertise),
                            style: const TextStyle(
                              fontSize: 10,
                              color: Color(0xFFCEA45A),
                              fontWeight: FontWeight.w500,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            textAlign: TextAlign.center,
                          ),
                        ),
                        const SizedBox(width: 6),
                        SizedBox(
                          width: 28,
                          child: Container(
                            height: 1,
                            decoration: const BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.centerLeft,
                                end: Alignment.centerRight,
                                colors: [Color(0xFFCEA45A), Color(0xFF111211)],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    // Orders Count
                    Text(
                      '${chef.ordersCount} orders',
                      style: const TextStyle(
                        fontSize: 10,
                        color: Color(0xFFCEA45A),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            
            // 4. Tap Overlay
            Positioned.fill(
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: () {
                    showDialog(
                      context: context,
                      builder: (context) => CookDetailsDialog(cook: chef),
                    );
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: Container(),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // NEW: Hero Top-Rated Cook Card (First Item)
  Widget _buildHeroTopRatedCook(Chef chef, bool isRTL) {
    final String? profileImage = chef.profileImage;
    final displayName = chef.name;
    final rating = chef.rating.toStringAsFixed(1);
    
    return GestureDetector(
      onTap: () {
        showDialog(
          context: context,
          builder: (context) => CookDetailsDialog(cook: chef),
        );
      },
      child: Container(
        width: double.infinity,
        height: 169,
        decoration: BoxDecoration(
          color: const Color(0xFF604734),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Stack(
          children: [
            // Background Cover Image with proper overlay appearance
            Positioned.fill(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    // Base image
                    Image.asset(
                      'assets/cooks/Cover.png',
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        color: const Color(0xFF604734),
                      ),
                    ),
                    // Overlay blend effect using semi-transparent layer
                    Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            const Color(0xFF604734).withValues(alpha: 0.3),
                            const Color(0xFF604734).withValues(alpha: 0.6),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            // Content
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // Profile Image (Left)
                  Container(
                    width: 121,
                    height: 121,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white.withValues(alpha: 0.3), width: 2),
                    ),
                    child: ClipOval(
                      child: Image(
                        image: getImageProvider(profileImage),
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                          color: const Color(0xFF604734),
                          child: const Icon(Icons.person, size: 60, color: Colors.white),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  // Info (Right)
                  Expanded(
                    child: Column(
                      crossAxisAlignment: isRTL ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Top Rated Badge
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFF7A00),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.star,
                                color: Color(0xFFFCD535),  // Yellow star
                                size: 14,
                              ),
                              SizedBox(width: 4),
                              Text(
                                'Top rated',
                                style: TextStyle(
                                  fontFamily: 'Inter',
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 9),
                        // Cook Name
                        Text(
                          displayName,
                          style: const TextStyle(
                            fontFamily: 'Noto Serif',
                            fontSize: 24,
                            fontWeight: FontWeight.w400,
                            color: Colors.white,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 6),
                        // Subtitle
                        Text(
                          isRTL ? 'الموهبة وراء المذاق' : 'THE TALENT BEHIND THE TASTE',
                          style: const TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 12,
                            fontWeight: FontWeight.w400,
                            color: Color(0xFFD9D9D9),
                            letterSpacing: 0.5,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 6),
                        // Rating
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.star,
                              color: Color(0xFFFCD535),
                              size: 20,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              rating,
                              style: const TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: Colors.white,
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
          ],
        ),
      ),
    );
  }

  // NEW: Top-Rated Cook Card (Remaining Items)
  Widget _buildTopRatedCookCard(Chef chef, bool isRTL, LanguageProvider languageProvider) {
    final String? profileImage = chef.profileImage;
    final displayName = chef.name;
    final rating = chef.rating.toStringAsFixed(1);
    
    return GestureDetector(
      onTap: () {
        showDialog(
          context: context,
          builder: (context) => CookDetailsDialog(cook: chef),
        );
      },
      child: SizedBox(
        width: 100,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Circular Image
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFFE0E0E0), width: 2),
              ),
              child: ClipOval(
                child: Image(
                  image: getImageProvider(profileImage),
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    color: const Color(0xFFF5F5F5),
                    child: const Icon(Icons.person, size: 50, color: Color(0xFF969494)),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            // Cook Name
            Text(
              displayName,
              style: const TextStyle(
                fontFamily: 'Inter',
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Color(0xFF40403F),
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 4),
            // Rating
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.star,
                  color: Color(0xFFFCD535),
                  size: 16,
                ),
                const SizedBox(width: 2),
                Text(
                  rating,
                  style: const TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF40403F),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}


class NavigationDrawer extends StatelessWidget {
  final bool isRTL;
  final VoidCallback onLogout;

  const NavigationDrawer({
    Key? key,
    required this.isRTL,
    required this.onLogout,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    
    return Drawer(
      child: Container(
        color: Colors.white.withValues(alpha: 0.9), // 90% opacity (10% transparency)
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            // Slim header with back arrow
            Container(
              height: 90,
              padding: const EdgeInsets.only(left: 16, top: 45),
              alignment: Alignment.centerLeft,
              child: Row(
                children: [
                  IconButton(
                    icon: Icon(isRTL ? Icons.arrow_forward : Icons.arrow_back, size: 22),
                    onPressed: () => Navigator.pop(context),
                    padding: EdgeInsets.zero,
                    color: AppTheme.textPrimary,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    isRTL ? 'القائمة' : 'Menu',
                    style: const TextStyle(
                      fontSize: 19,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                ],
              ),
            ),
            const Divider(height: 1, thickness: 1),
            const SizedBox(height: 8),
            _buildDrawerItem(
              context,
              icon: Icons.history,
              title: isRTL ? 'سجل الطلبات' : 'Orders History',
              onTap: () {
                Navigator.pop(context);
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const OrdersScreen()),
                );
              },
            ),
            _buildDrawerItem(
              context,
              icon: Icons.message_outlined,
              title: isRTL ? 'الرسائل' : 'Messages',
              onTap: () {
                Navigator.pop(context);
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const MessagesScreen()),
                );
              },
            ),
            _buildDrawerItem(
              context,
              icon: Icons.help_outline,
              title: isRTL ? 'المساعدة' : 'Help',
              onTap: () {
                Navigator.pop(context);
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const HelpScreen()),
                );
              },
            ),
            _buildDrawerItem(
              context,
              icon: Icons.language,
              title: isRTL ? 'اللغة' : 'Language',
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    isRTL ? 'EN' : 'AR',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Icon(
                    isRTL ? Icons.arrow_forward_ios : Icons.arrow_back_ios,
                    size: 12,
                    color: AppTheme.textSecondary,
                  ),
                ],
              ),
              onTap: () {
                languageProvider.toggleLanguage();
              },
            ),
            _buildDrawerItem(
              context,
              icon: Icons.flag_outlined,
              title: isRTL ? 'البلد' : 'Country',
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    context.watch<CountryProvider>().countryCode,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Icon(
                    isRTL ? Icons.arrow_forward_ios : Icons.arrow_back_ios,
                    size: 12,
                    color: AppTheme.textSecondary,
                  ),
                ],
              ),
              onTap: () {
                _showCountryPicker(context, isRTL);
              },
            ),
            _buildDrawerItem(
              context,
              icon: Icons.settings_outlined,
              title: isRTL ? 'الإعدادات' : 'Settings',
              onTap: () {
                Navigator.pop(context);
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const SettingsScreen()),
                );
              },
            ),
            _buildDrawerItem(
              context,
              icon: Icons.logout,
              title: isRTL ? 'تسجيل الخروج' : 'Log out',
              onTap: onLogout,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDrawerItem(
    BuildContext context, {
    required IconData icon,
    required String title,
    Widget? trailing,
    required VoidCallback onTap,
  }) {
    return ListTile(
      leading: Icon(icon, color: AppTheme.textPrimary, size: 20),
      title: Text(
        title,
        style: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w500,
          color: AppTheme.textPrimary,
        ),
      ),
      trailing: trailing,
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 2),
      dense: true,
    );
  }

  void _showCountryPicker(BuildContext context, bool isRTL) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (BuildContext context) {
        final countryProvider = context.read<CountryProvider>();
        final countries = [
          {'code': 'EG', 'name': isRTL ? 'مصر' : 'Egypt', 'flag': '🇪🇬'},
          {'code': 'SA', 'name': isRTL ? 'المملكة العربية السعودية' : 'Saudi Arabia', 'flag': '🇸🇦'},
          {'code': 'AE', 'name': isRTL ? 'الإمارات' : 'United Arab Emirates', 'flag': '🇦🇪'},
          {'code': 'KW', 'name': isRTL ? 'الكويت' : 'Kuwait', 'flag': '🇰🇼'},
          {'code': 'QA', 'name': isRTL ? 'قطر' : 'Qatar', 'flag': '🇶🇦'},
        ];

        return Container(
          padding: const EdgeInsets.symmetric(vertical: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                isRTL ? 'اختر البلد' : 'Select Country',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 10),
              ...countries.map((country) {
                final isSelected = countryProvider.countryCode == country['code'];
                return ListTile(
                  leading: Text(country['flag']!, style: const TextStyle(fontSize: 24)),
                  title: Text(
                    country['name']!,
                    style: TextStyle(
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      color: isSelected ? AppTheme.primaryColor : AppTheme.textPrimary,
                    ),
                  ),
                  trailing: isSelected ? const Icon(Icons.check, color: AppTheme.primaryColor) : null,
                  onTap: () {
                    final code = country['code']!;
                    if (code != countryProvider.countryCode) {
                      countryProvider.setCountry(code);
                      Navigator.pop(context); // Close sheet
                      Navigator.pop(context); // Close drawer
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(isRTL ? 'تم الانتقال إلى سلة ${country['name']}' : 'Switched to ${country['name']} cart'),
                          duration: const Duration(seconds: 2),
                        ),
                      );
                    } else {
                      Navigator.pop(context);
                    }
                  },
                );
              }).toList(),
            ],
          ),
        );
      },
    );
  }
}

