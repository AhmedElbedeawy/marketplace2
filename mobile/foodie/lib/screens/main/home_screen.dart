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
import '../../providers/app_mode_provider.dart';
import '../../providers/food_provider.dart';
import '../../providers/notification_provider.dart';
import '../../providers/navigation_provider.dart';
import '../../providers/country_provider.dart';
import '../../providers/address_provider.dart';
import '../../models/address.dart';
import '../../models/food.dart';
import '../../models/category.dart';
import '../../utils/image_url_utils.dart'; // PHASE 4: getAbsoluteUrl utility
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../widgets/map_picker.dart';
import '../menu/menu_screen.dart';
import '../menu/dish_detail_screen.dart';
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
  
  // Scroll controllers for all horizontal sliders
  final ScrollController _dishesScrollController = ScrollController();
  final ScrollController _categoriesScrollController = ScrollController();
  final ScrollController _cooksScrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final addressProvider = Provider.of<AddressProvider>(context, listen: false);
      await addressProvider.fetchAddresses();
      
      if (!mounted) return;
      if (addressProvider.addresses.isEmpty || addressProvider.defaultAddress == null) {
        _showLocationGate();
      } else {
        _loadData();
      }

      _fetchHeroImages();
      _startAutoPlay();
      // Set home as active tab AND origin
      final navigationProvider = Provider.of<NavigationProvider>(context, listen: false);
      navigationProvider.setActiveTab(NavigationTab.home, setAsOrigin: true);
      
      // Listen for country changes to refresh data
      final countryProvider = Provider.of<CountryProvider>(context, listen: false);
      countryProvider.addListener(_onCountryChanged);
    });
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
                final newAddr = Address(
                  id: '',
                  label: labelController.text,
                  addressLine1: line1Controller.text,
                  city: cityController.text,
                  countryCode: countryProvider.countryCode,
                  lat: lat!,
                  lng: lng!,
                  isDefault: true,
                );

                final success = await addressProvider.addAddress(newAddr);
                if (success && context.mounted) {
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
      _fetchHeroAdsCount();
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
            // Hero Image Slider (real photos, no text overlays)
            _buildHeroImageSlider(),

            _buildSectionTitle(
              isRTL ? 'الأطباق المميزة' : 'Featured Dishes',
              isRTL,
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
            SizedBox(
              height: 135, // Increased from 134px to accommodate card properly
              child: foodProvider.isLoading && foodProvider.featuredDishes.isEmpty
                  ? const Center(child: CircularProgressIndicator(color: AppTheme.accentColor))
                  : ListView.builder(
                      controller: _dishesScrollController,
                      scrollDirection: Axis.horizontal,
                      clipBehavior: Clip.none,
                      padding: EdgeInsets.only(
                        left: isRTL ? 0 : 20,
                        right: isRTL ? 20 : 0,
                      ),
                      itemCount: _getSortedDishes().length,
                      itemBuilder: (context, index) {
                        final dish = _getSortedDishes()[index];
                        return _buildDishCard(dish, isRTL);
                      },
                    ),
            ),
            const SizedBox(height: 2), // Reduced from 16px to 2px

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
              height: 72,
              child: ListView.builder(
                controller: _categoriesScrollController, // Add scroll controller
                scrollDirection: Axis.horizontal,
                clipBehavior: Clip.none,
                padding: EdgeInsets.only(
                  left: isRTL ? 0 : 20,
                  right: isRTL ? 20 : 0,
                ),
                itemCount: _getSortedCategories(foodProvider.categories, foodProvider.isLoading).length,
                itemBuilder: (context, index) {
                  final category = _getSortedCategories(foodProvider.categories, foodProvider.isLoading)[index];
                  return _buildCategoryCard(category, isRTL);
                },
              ),
            ),            const SizedBox(height: 8), // Reduced from 16px to 8px

            // Top-rated Cooks Section
            _buildSectionTitle(
              isRTL ? 'الطهاة الأعلى تقييماً' : 'Top-rated Cooks',
              isRTL,
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
            SizedBox(
              height: 180, // Increased to accommodate card design
              child: ListView.builder(
                controller: _cooksScrollController,
                scrollDirection: Axis.horizontal,
                clipBehavior: Clip.none,
                padding: EdgeInsets.only(
                  left: isRTL ? 0 : 20,
                  right: isRTL ? 20 : 0,
                ),
                itemCount: foodProvider.popularChefs.length,
                itemBuilder: (context, index) {
                  final chef = foodProvider.popularChefs[index];
                  return _buildChefCard(chef, isRTL, languageProvider);
                },
              ),
            ),            const SizedBox(height: 80), // Extra padding for bottom navigation transparency
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
                'assets/icons/Burger.png',
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
                            'assets/icons/notifications.png',
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
            // Profile picture (right)
            CircleAvatar(
              radius: 18, // Slightly larger
              backgroundColor: AppTheme.dividerColor,
              child: authProvider.user?.profileImage != null
                  ? ClipOval(
                      child: CachedNetworkImage(
                        imageUrl: authProvider.user!.profileImage!,
                        width: 36,
                        height: 36,
                        fit: BoxFit.cover,
                        errorWidget: (_, __, ___) =>
                            const Icon(Icons.person, color: AppTheme.textSecondary, size: 20),
                      ),
                    )
                  : const Icon(Icons.person, color: AppTheme.textSecondary, size: 20),
            ),
            const SizedBox(width: 16),
          ],
        ),
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
                    'assets/icons/Search.png',
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

  Widget _buildSectionTitle(String title, bool isRTL, {VoidCallback? onSeeAll}) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 12), // Changed bottom padding from 8px to 12px
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            title,
            style: const TextStyle(
              color: AppTheme.textPrimary,
              fontSize: 16,
              fontWeight: FontWeight.w700,
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
                  color: Color(0xFF969494), // Grey color
                ),
              ),
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
      onTap: () {
        // PHASE 4: Navigate to Level 1 popup (offers list) for this AdminDish
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => DishDetailScreen(
              adminDishId: dish.adminDishId ?? dish.id,
              dishName: displayName,
            ),
          ),
        ).then((_) {
          _resetAllSliders();
        });
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
                            'assets/dishes/$imageUrlRaw',
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
                    'assets/icons/Cooks.png',
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
                    'assets/icons/Dishes.png',
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

  Widget _buildCategoryCard(Category category, bool isRTL) {
    // PHASE 4: Get icon URL from API and convert relative paths to absolute using shared utility
    final String iconUrlRaw = category.iconMobile;
    final String iconUrl = getAbsoluteUrl(iconUrlRaw); // Uses shared getAbsoluteUrl utility
    
    // Determine if we should use asset or network image
    // Asset: empty string or starts with 'assets/'
    // Network: starts with 'http' OR starts with '/uploads/' (converted to absolute above)
    final bool isAssetIcon = iconUrlRaw.isEmpty || iconUrlRaw.startsWith('assets/');
    final String assetPath = 'assets/categories/${category.nameEn}.png';
    
    return GestureDetector(
      onTap: () {
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
                      child: isAssetIcon
                          ? Image.asset(
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
                            )
                          : CachedNetworkImage(
                              imageUrl: iconUrl,
                              width: 40,
                              height: 40,
                              fit: BoxFit.contain,
                              errorWidget: (_, __, ___) {
                                debugPrint('Failed to load category icon (network): $iconUrl');
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
                    category.getName(isRTL),
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
    // PHASE 4: Use getAbsoluteUrl for chef profilePhoto
    final bool hasImage = chef.profileImage != null && chef.profileImage!.isNotEmpty;
    final bool isAssetImage = hasImage && !chef.profileImage!.startsWith('http');
    final String profileImageUrl = hasImage ? getAbsoluteUrl(chef.profileImage) : '';
    
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
                child: hasImage
                    ? (isAssetImage
                        ? Image.asset(
                            'assets/cooks/${chef.profileImage!}',
                            fit: BoxFit.cover, // Fill the card area
                            errorBuilder: (_, __, ___) => Container(
                              color: const Color(0xFFF5F5F5),
                              child: const Icon(Icons.person, size: 50, color: Color(0xFF969494)),
                            ),
                          )
                        : CachedNetworkImage(
                            imageUrl: profileImageUrl, // PHASE 4: Uses getAbsoluteUrl
                            fit: BoxFit.cover, // Fill the card area
                            errorWidget: (_, __, ___) => Container(
                              color: const Color(0xFFF5F5F5),
                              child: const Icon(Icons.person, size: 50, color: Color(0xFF969494)),
                            ),
                          ))
                    : Container(
                        color: const Color(0xFFF5F5F5),
                        child: const Icon(Icons.person, size: 50, color: Color(0xFF969494)),
                      ),
              ),
            ),
            
            // 2. Hollow Card Overlay (Ccard.png) (Top Layer)
            Positioned.fill(
              child: Image.asset(
                'assets/cooks/Ccard.png',
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
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Divider(height: 1, thickness: 1),
            ),
            // Switch to Cook Hub button
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              child: OutlinedButton(
                onPressed: () {
                  Navigator.pop(context);
                  final authProvider = context.read<AuthProvider>();
                  final user = authProvider.user;
                  final status = user?.roleCookStatus ?? 'none';

                  if (status == 'approved') {
                    context.read<AppModeProvider>().switchToCookHub();
                  } else if (status == 'pending') {
                    Navigator.of(context).pushNamed('/cook-status');
                  } else if (status == 'suspended') {
                    Navigator.of(context).pushNamed('/suspended');
                  } else {
                    Navigator.of(context).pushNamed('/cook-registration');
                  }
                },
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppTheme.textSecondary, width: 1),
                  padding: const EdgeInsets.symmetric(vertical: 13),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(24),
                  ),
                ),
                child: Text(
                  isRTL ? 'التحويل إلى Cook Hub' : 'Switch to Cook Hub',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary,
                  ),
                ),
              ),
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

