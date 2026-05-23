import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/food_provider.dart';
import '../../providers/language_provider.dart';
import '../../providers/address_provider.dart';
import '../../models/food.dart';
import '../../widgets/global_bottom_navigation.dart';
import '../../utils/image_url_utils.dart';
import '../menu/dish_detail_screen.dart';

class CookKitchenScreen extends StatefulWidget {
  final String cookId;
  final String cookName;

  const CookKitchenScreen({
    super.key,
    required this.cookId,
    required this.cookName,
  });

  @override
  State<CookKitchenScreen> createState() => _CookKitchenScreenState();
}

class _CookKitchenScreenState extends State<CookKitchenScreen> {
  bool _isLoading = true;
  String? _error;
  CookInfo? _cook;
  List<Food> _dishes = [];
  final ScrollController _dishListScrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _loadCookData();
  }

  @override
  void dispose() {
    _dishListScrollController.dispose();
    super.dispose();
  }

  Future<void> _loadCookData() async {
    final foodProvider = Provider.of<FoodProvider>(context, listen: false);
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final addressProvider = Provider.of<AddressProvider>(context, listen: false);
    final headers = authProvider.getAuthHeaders();
    final lat = addressProvider.defaultAddress?.lat;
    final lng = addressProvider.defaultAddress?.lng;

    try {
      // Fetch cooks list and cook dishes in parallel — independent requests
      await Future.wait([
        foodProvider.fetchCooks(headers: headers, lat: lat, lng: lng),
        foodProvider.fetchCookDishes(cookId: widget.cookId, headers: headers),
      ]);

      final cook = foodProvider.cooks.firstWhere(
        (c) => c.id == widget.cookId,
        orElse: () => CookInfo(id: widget.cookId, name: widget.cookName),
      );

      print('🍳 [COOK KITCHEN] cookId from widget: ${widget.cookId}');
      print('🍳 [COOK KITCHEN] found cook: ${cook.name}, cook._id: ${cook.id}');
      print('🍳 [COOK KITCHEN] total cooks in list: ${foodProvider.cooks.length}');

      // Update state after async operations complete
      if (mounted) {
        setState(() {
          _cook = cook;
          _dishes = foodProvider.cookDishesFor(widget.cookId);
          _isLoading = false;
          _error = null;
        });
      }
    } catch (e) {
      print('❌ [COOK KITCHEN] Error loading data: $e');
      if (mounted) {
        setState(() {
          _error = 'Failed to load kitchen data';
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = Provider.of<LanguageProvider>(context);
    final isRTL = languageProvider.isArabic;

    return Scaffold(
      backgroundColor: const Color(0xFFF7F7F7),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back,
            color: AppTheme.textPrimary,
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          widget.cookName,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppTheme.textPrimary,
          ),
        ),
        centerTitle: true,
      ),
      body: _isLoading
          ? _buildLoadingSkeleton()
          : _error != null
              ? _buildErrorState(isRTL)
              : _buildContent(isRTL),
      bottomNavigationBar: const GlobalBottomNavigation(),
    );
  }

  Widget _buildContent(bool isRTL) {
    if (_cook == null) {
      return Center(child: Text(isRTL ? 'غير موجود' : 'Not found'));
    }

    return Column(
      children: [
        // Cook Header
        _buildCookHeader(isRTL),
        // Dishes List
        Expanded(
          child: _dishes.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.restaurant_menu, size: 64, color: Colors.grey[300]),
                      const SizedBox(height: 16),
                      Text(
                        isRTL ? 'لا توجد أطباق' : 'No dishes available',
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  controller: _dishListScrollController,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  itemCount: _dishes.length,
                  itemBuilder: (context, index) {
                    final dish = _dishes[index];
                    return _buildDishCard(dish, isRTL);
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildCookHeader(bool isRTL) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          // Cook Image
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: SmartImage(
              imageUrl: _cook!.profilePhoto,
              width: 80,
              height: 80,
              placeholder: Container(
                width: 80,
                height: 80,
                color: const Color(0xFFE7E7E7),
                child: const Icon(Icons.person, size: 32, color: Color(0xFF969494)),
              ),
              errorWidget: Container(
                width: 80,
                height: 80,
                color: const Color(0xFFE7E7E7),
                child: const Icon(Icons.person, size: 32, color: Color(0xFF969494)),
              ),
            ),
          ),
          const SizedBox(width: 16),
          // Cook Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _cook!.storeName ?? _cook!.name,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                // Rating
                Row(
                  children: [
                    const Icon(Icons.star, size: 16, color: Color(0xFFFF7A00)),
                    const SizedBox(width: 4),
                    Text(
                      '${_cook!.rating?.toStringAsFixed(1) ?? '0.0'} (${_cook!.ratingsCount ?? 0})',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFF7D7C7C),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                // Expertise
                if (_cook!.expertise.isNotEmpty)
                  Text(
                    _cook!.expertise.join(', '),
                    style: const TextStyle(
                      fontSize: 13,
                      color: Color(0xFF7D7C7C),
                    ),
                  ),
                const SizedBox(height: 4),
                // Dishes count from cook's dishes list
                Text(
                  '${_dishes.length} ${isRTL ? 'طبق' : 'dishes'}',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.accentColor,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Cook Kitchen dish card - shows cook's offer details
  Widget _buildDishCard(Food dish, bool isRTL) {
    final String dishName = isRTL ? (dish.nameAr ?? dish.name) : dish.name;
    
    // Get image - use offer image (same as cart logic)
    // Backend now returns: image = offer.images[0] || adminDish.images[0]
    String? imageUrl;
    
    // First try image field (offer's first image from backend)
    if (dish.image != null && dish.image!.isNotEmpty) {
      imageUrl = dish.image;
    }
    // Fallback to images array
    else if (dish.images.isNotEmpty) {
      imageUrl = dish.images.first;
    }
    // Fallback to imageUrl
    else if (dish.imageUrl != null && dish.imageUrl!.isNotEmpty) {
      imageUrl = dish.imageUrl;
    }
    
    final double price = dish.minPrice ?? dish.price ?? 0;
    final String description = isRTL ? (dish.descriptionAr ?? dish.description) : dish.description;
    final double rating = dish.rating ?? 0.0;
    final int reviewCount = dish.reviewCount ?? 0;

    return GestureDetector(
      onTap: () {
        // Navigate to dish profile page for this specific cook offer
        final adminDishId = dish.adminDishId ?? dish.id;
        
        print('🍳 [COOK KITCHEN] Tapping dish:');
        print('   dish.id: ${dish.id}');
        print('   dish.adminDishId: ${dish.adminDishId}');
        print('   Resolved adminDishId: $adminDishId');
        print('   widget.cookId: ${widget.cookId}');
        print('   dishName: $dishName');
        
        if (adminDishId.isEmpty) {
          print('❌ [COOK KITCHEN] ERROR: adminDishId is null or empty!');
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Unable to open dish: missing dish ID')),
          );
          return;
        }
        
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => DishDetailScreen(
              adminDishId: adminDishId,
              dishName: dishName,
              initialCookId: widget.cookId, // Pre-select this cook
            ),
          ),
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
          // Dish Image (cook's offer image or admin dish image)
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: SmartImage(
              imageUrl: imageUrl,
              width: 80,
              height: 80,
              placeholder: Container(
                width: 80,
                height: 80,
                color: const Color(0xFFE7E7E7),
                child: const Icon(Icons.restaurant, size: 32, color: Color(0xFF969494)),
              ),
              errorWidget: Container(
                width: 80,
                height: 80,
                color: const Color(0xFFE7E7E7),
                child: const Icon(Icons.restaurant, size: 32, color: Color(0xFF969494)),
              ),
            ),
          ),
          const SizedBox(width: 12),
          // Dish Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Dish Name
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
                const SizedBox(height: 4),
                // Rating
                Row(
                  children: [
                    const Icon(Icons.star, size: 12, color: Color(0xFFFF7A00)),
                    const SizedBox(width: 2),
                    Text(
                      '${rating.toStringAsFixed(1)} ($reviewCount)',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFF7D7C7C),
                      ),
                    ),
                  ],
                ),
                // Description
                if (description.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    description,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF7D7C7C),
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                const SizedBox(height: 6),
                // Price
                Row(
                  children: [
                    Text(
                      '$price SAR',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.accentColor,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
      ), // Close GestureDetector
    );
  }

  Widget _buildLoadingSkeleton() {
    return Column(
      children: [
        // Header skeleton
        Container(
          padding: const EdgeInsets.all(16),
          color: Colors.white,
          child: Row(
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: Colors.grey[200],
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      height: 20,
                      width: 120,
                      color: Colors.grey[200],
                    ),
                    const SizedBox(height: 8),
                    Container(
                      height: 14,
                      width: 80,
                      color: Colors.grey[200],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        // List skeleton
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: 5,
            itemBuilder: (context, index) {
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                height: 100,
                decoration: BoxDecoration(
                  color: Colors.grey[200],
                  borderRadius: BorderRadius.circular(16),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildErrorState(bool isRTL) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 48, color: Colors.red),
          const SizedBox(height: 16),
          Text(
            _error ?? (isRTL ? 'حدث خطأ' : 'An error occurred'),
            style: const TextStyle(color: Colors.red),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _loadCookData,
            child: Text(isRTL ? 'إعادة المحاولة' : 'Retry'),
          ),
        ],
      ),
    );
  }
}
