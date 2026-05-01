import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../config/theme.dart';
import '../../config/api_config.dart';
import '../../providers/language_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/food_provider.dart';
import '../../providers/address_provider.dart';
import '../../providers/favorite_provider.dart';
import '../../models/food.dart';
import '../../utils/image_url_utils.dart';
import '../menu/dish_detail_screen.dart';
import '../reviews/cook_order_selection_screen.dart';

class CookProfileScreen extends StatefulWidget {
  final String cookId;
  final String cookName;

  const CookProfileScreen({
    Key? key,
    required this.cookId,
    required this.cookName,
  }) : super(key: key);

  @override
  State<CookProfileScreen> createState() => _CookProfileScreenState();
}

class _CookProfileScreenState extends State<CookProfileScreen>
    with SingleTickerProviderStateMixin {
  int _selectedTab = 0; // 0 = Menu, 1 = Reviews
  bool _isLoading = true;
  String? _error;
  CookInfo? _cook;
  List<Food> _dishes = [];

  // Reviews data
  Map<String, dynamic>? _ratingSummary;
  List<Map<String, dynamic>> _reviews = [];
  bool _isLoadingReviews = false;

  @override
  void initState() {
    super.initState();
    _loadCookData();
  }

  Future<void> _loadCookData() async {
    final foodProvider = Provider.of<FoodProvider>(context, listen: false);
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final addressProvider = Provider.of<AddressProvider>(context, listen: false);
    final headers = authProvider.getAuthHeaders();
    final lat = addressProvider.defaultAddress?.lat;
    final lng = addressProvider.defaultAddress?.lng;

    try {
      // Fetch cooks list to get cook info
      await foodProvider.fetchCooks(headers: headers, lat: lat, lng: lng);

      // Find the cook
      final cook = foodProvider.cooks.firstWhere(
        (c) => c.id == widget.cookId,
        orElse: () => CookInfo(id: widget.cookId, name: widget.cookName),
      );

      // Fetch cook's dishes
      await foodProvider.fetchCookDishes(
        cookId: widget.cookId,
        headers: headers,
      );

      // Load reviews
      await _loadReviews();

      if (mounted) {
        setState(() {
          _cook = cook;
          _dishes = foodProvider.cookDishes;
          _isLoading = false;
          _error = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to load cook data';
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _loadReviews() async {
    setState(() => _isLoadingReviews = true);

    try {
      // Load rating summary
      final summaryResponse = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/ratings/cook/${widget.cookId}/summary'),
      );

      if (summaryResponse.statusCode == 200) {
        final data = json.decode(summaryResponse.body);
        if (data['success']) {
          _ratingSummary = data['data'];
        }
      }

      // Load reviews list
      final reviewsResponse = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/ratings/cook/${widget.cookId}/reviews?limit=20'),
      );

      if (reviewsResponse.statusCode == 200) {
        final data = json.decode(reviewsResponse.body);
        if (data['success'] && data['data'] != null) {
          _reviews = List<Map<String, dynamic>>.from(data['data']['reviews'] ?? []);
        }
      }
    } catch (e) {
      debugPrint('Error loading reviews: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoadingReviews = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;

    return Scaffold(
      backgroundColor: const Color(0xFFF7F7F7),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            isRTL ? Icons.arrow_forward : Icons.arrow_back,
            color: AppTheme.textPrimary,
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          _selectedTab == 0
              ? (isRTL ? 'قائمة الطعام' : 'Menu')
              : (isRTL ? 'التقييمات' : 'Reviews'),
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: AppTheme.textPrimary,
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!))
              : Column(
                  children: [
                    // Compact cook card
                    _buildCookCard(isRTL),
                    // Tabs
                    _buildTabs(isRTL),
                    // Tab content
                    Expanded(
                      child: _selectedTab == 0
                          ? _buildMenuTab(isRTL)
                          : _buildReviewsTab(isRTL),
                    ),
                  ],
                ),
    );
  }

  Widget _buildCookCard(bool isRTL) {
    if (_cook == null) return const SizedBox.shrink();

    final cookName = _cook!.storeName?.isNotEmpty == true
        ? _cook!.storeName!
        : _cook!.name;
    final expertiseDisplay = _cook!.expertise.isNotEmpty
        ? _cook!.expertise.first
        : (isRTL ? 'متعدد التخصصات' : 'Multi-Specialty');

    return Container(
      padding: const EdgeInsets.all(16),
      color: Colors.white,
      child: Row(
        children: [
          // Cook image
          Container(
            width: 84,
            height: 84,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE0E0E0), width: 1),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(11),
              child: SmartImage(
                imageUrl: _cook!.profilePhoto,
                width: 84,
                height: 84,
                placeholder: Container(
                  color: const Color(0xFFF5F5F5),
                  child: const Icon(Icons.person, size: 40, color: Color(0xFF969494)),
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          // Cook info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  cookName,
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  expertiseDisplay,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF7D7C7C),
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.star, size: 14, color: Color(0xFFFF7A00)),
                    const SizedBox(width: 4),
                    Text(
                      '${_cook!.rating?.toStringAsFixed(1) ?? '0.0'} (${_cook!.ratingsCount ?? 0})',
                      style: const TextStyle(
                        fontSize: 11,
                        color: Color(0xFF7D7C7C),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '${_dishes.length} ${isRTL ? 'طبق' : 'dishes'}',
                      style: const TextStyle(
                        fontSize: 11,
                        color: Color(0xFF7D7C7C),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                // Bio text (max 2 lines)
                Text(
                  isRTL
                      ? 'طاهي محترف يقدم أطباق شهية'
                      : 'Professional cook offering delicious homemade dishes',
                  style: const TextStyle(
                    fontSize: 11,
                    color: Color(0xFF7D7C7C),
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          // Favorites button
          Consumer<FavoriteProvider>(
            builder: (context, favoriteProvider, _) {
              final isFavorite = favoriteProvider.isCookFavorite(widget.cookId);
              
              return SizedBox(
                height: 30,
                child: OutlinedButton.icon(
                  onPressed: () async {
                    await favoriteProvider.toggleCookFavorite(widget.cookId);
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
                  icon: Icon(
                    isFavorite ? Icons.favorite : Icons.favorite_border, 
                    size: 16,
                    color: isFavorite ? const Color(0xFFFF7A00) : null,
                  ),
                  label: Text(
                    isRTL ? 'مفضلة' : 'Favorite',
                    style: TextStyle(
                      fontSize: 12,
                      color: isFavorite ? const Color(0xFFFF7A00) : null,
                      fontWeight: isFavorite ? FontWeight.w700 : FontWeight.normal,
                    ),
                  ),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    side: BorderSide(
                      color: isFavorite ? const Color(0xFFFF7A00) : const Color(0xFFE0E0E0),
                    ),
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildTabs(bool isRTL) {
    return Container(
      color: Colors.white,
      child: Row(
        children: [
          Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _selectedTab = 0),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(
                      color: _selectedTab == 0
                          ? AppTheme.accentColor
                          : Colors.transparent,
                      width: 3,
                    ),
                  ),
                ),
                child: Text(
                  isRTL ? 'قائمة الطعام' : 'Menu',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: _selectedTab == 0 ? FontWeight.w600 : FontWeight.w500,
                    color: _selectedTab == 0
                        ? AppTheme.accentColor
                        : const Color(0xFF7D7C7C),
                  ),
                ),
              ),
            ),
          ),
          Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _selectedTab = 1),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(
                      color: _selectedTab == 1
                          ? AppTheme.accentColor
                          : Colors.transparent,
                      width: 3,
                    ),
                  ),
                ),
                child: Text(
                  isRTL ? 'التقييمات' : 'Reviews',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: _selectedTab == 1 ? FontWeight.w600 : FontWeight.w500,
                    color: _selectedTab == 1
                        ? AppTheme.accentColor
                        : const Color(0xFF7D7C7C),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMenuTab(bool isRTL) {
    if (_dishes.isEmpty) {
      return Center(
        child: Text(
          isRTL ? 'لا توجد أطباق' : 'No dishes available',
          style: const TextStyle(
            fontSize: 16,
            color: Color(0xFF7D7C7C),
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _dishes.length,
      itemBuilder: (context, index) {
        return _buildDishCard(_dishes[index], isRTL);
      },
    );
  }

  Widget _buildDishCard(Food dish, bool isRTL) {
    final dishName = isRTL ? (dish.nameAr ?? dish.name) : dish.name;

    return GestureDetector(
      onTap: () {
        final adminDishId = dish.adminDishId ?? dish.id;
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => DishDetailScreen(
              adminDishId: adminDishId,
              dishName: dishName,
              initialCookId: widget.cookId,
            ),
          ),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
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
            // Dish image
            ClipRRect(
              borderRadius: const BorderRadius.horizontal(left: Radius.circular(16)),
              child: SmartImage(
                imageUrl: dish.image,
                width: 120,
                height: 96,
                placeholder: Container(
                  width: 120,
                  height: 96,
                  color: const Color(0xFFF5F5F5),
                  child: const Icon(Icons.restaurant, size: 40, color: Color(0xFF969494)),
                ),
              ),
            ),
            // Dish info
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      dishName,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    if (dish.description.isNotEmpty)
                      Text(
                        dish.description,
                        style: const TextStyle(
                          fontSize: 11,
                          color: Color(0xFF7D7C7C),
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                  ],
                ),
              ),
            ),
            // Price
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Text(
                '${dish.price.toStringAsFixed(2)} SAR',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.accentColor,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReviewsTab(bool isRTL) {
    if (_isLoadingReviews) {
      return const Center(child: CircularProgressIndicator());
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Rating summary block
        _buildRatingSummary(isRTL),
        const SizedBox(height: 16),
        // Sort row
        _buildSortRow(isRTL),
        const SizedBox(height: 16),
        // Reviews list
        if (_reviews.isEmpty)
          Center(
            child: Text(
              isRTL ? 'لا توجد تقييمات بعد' : 'No reviews yet',
              style: const TextStyle(
                fontSize: 16,
                color: Color(0xFF7D7C7C),
              ),
            ),
          )
        else
          ..._reviews.map((review) => _buildReviewCard(review, isRTL)).toList(),
      ],
    );
  }

  Widget _buildRatingSummary(bool isRTL) {
    final averageRating = _ratingSummary?['averageRating']?.toDouble() ?? 0.0;
    final totalReviews = _ratingSummary?['totalReviews'] ?? 0;
    final starDistribution = Map<String, int>.from(
      _ratingSummary?['starDistribution'] ?? {'5': 0, '4': 0, '3': 0, '2': 0, '1': 0},
    );

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Row(
            children: [
              // Left: Large rating
              SizedBox(
                width: 80,
                child: Column(
                  children: [
                    Text(
                      averageRating.toStringAsFixed(1),
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(5, (index) {
                        return Icon(
                          index < averageRating.floor()
                              ? Icons.star
                              : Icons.star_border,
                          size: 12,
                          color: const Color(0xFFFF7A00),
                        );
                      }),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      isRTL ? 'من 5' : 'out of 5',
                      style: const TextStyle(
                        fontSize: 11,
                        color: Color(0xFF7D7C7C),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              // Middle: Star breakdown bars
              Expanded(
                child: Column(
                  children: [5, 4, 3, 2, 1].map((star) {
                    final count = starDistribution[star.toString()] ?? 0;
                    final percentage = totalReviews > 0
                        ? (count / totalReviews * 100).toInt()
                        : 0;

                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 2),
                      child: Row(
                        children: [
                          Text(
                            '$star',
                            style: const TextStyle(
                              fontSize: 11,
                              color: Color(0xFF7D7C7C),
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Icon(Icons.star, size: 10, color: Color(0xFFFF7A00)),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Container(
                              height: 6,
                              decoration: BoxDecoration(
                                color: const Color(0xFFE0E0E0),
                                borderRadius: BorderRadius.circular(3),
                              ),
                              child: FractionallySizedBox(
                                alignment: Alignment.centerLeft,
                                widthFactor: percentage / 100,
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFF7A00),
                                    borderRadius: BorderRadius.circular(3),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(width: 16),
              // Right: Percentages
              SizedBox(
                width: 40,
                child: Column(
                  children: [5, 4, 3, 2, 1].map((star) {
                    final count = starDistribution[star.toString()] ?? 0;
                    final percentage = totalReviews > 0
                        ? (count / totalReviews * 100).toInt()
                        : 0;

                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 2),
                      child: Text(
                        '$percentage%',
                        style: const TextStyle(
                          fontSize: 11,
                          color: Color(0xFF7D7C7C),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Write a Review button
          SizedBox(
            width: double.infinity,
            height: 32,
            child: ElevatedButton(
              onPressed: () {
                // Navigate to order selection screen for this cook
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => CookOrderSelectionScreen(
                      cookId: widget.cookId,
                      cookName: widget.cookName,
                    ),
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.accentColor,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: Text(
                isRTL ? 'كتابة تقييم' : 'Write a Review',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSortRow(bool isRTL) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          isRTL ? 'ترتيب حسب: الأحدث' : 'Sort by: Most Recent',
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            color: Color(0xFF7D7C7C),
          ),
        ),
        GestureDetector(
          onTap: () {
            // TODO: Show sort options
          },
          child: Text(
            isRTL ? 'عرض الكل' : 'View All',
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppTheme.accentColor,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildReviewCard(Map<String, dynamic> review, bool isRTL) {
    final reviewer = Map<String, dynamic>.from(review['reviewer'] ?? {});
    final reviewerName = reviewer['name'] ?? (isRTL ? 'مجهول' : 'Anonymous');
    final reviewerAvatar = reviewer['avatar'];
    final overallRating = (review['overallRating'] ?? 0).toDouble();
    final overallReview = review['overallReview'] ?? '';
    final createdAt = review['createdAt'] != null
        ? DateTime.parse(review['createdAt'])
        : null;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Reviewer header
          Row(
            children: [
              // Avatar
              CircleAvatar(
                radius: 18,
                backgroundColor: const Color(0xFFF5F5F5),
                backgroundImage: reviewerAvatar != null
                    ? NetworkImage(reviewerAvatar)
                    : null,
                child: reviewerAvatar == null
                    ? const Icon(Icons.person, size: 20, color: Color(0xFF969494))
                    : null,
              ),
              const SizedBox(width: 10),
              // Name and date
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      reviewerName,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    if (createdAt != null)
                      Text(
                        '${createdAt.day}/${createdAt.month}/${createdAt.year}',
                        style: const TextStyle(
                          fontSize: 11,
                          color: Color(0xFF7D7C7C),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          // Stars
          Row(
            children: List.generate(5, (index) {
              return Icon(
                index < overallRating.floor()
                    ? Icons.star
                    : Icons.star_border,
                size: 12,
                color: const Color(0xFFFF7A00),
              );
            }),
          ),
          const SizedBox(height: 8),
          // Review text
          if (overallReview.isNotEmpty)
            Text(
              overallReview,
              style: const TextStyle(
                fontSize: 12,
                color: AppTheme.textPrimary,
              ),
            ),
          const SizedBox(height: 12),
          // Bottom action row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildActionItem(Icons.thumb_up_outlined, isRTL ? 'مفيد' : 'Helpful'),
              _buildActionItem(Icons.reply_outlined, isRTL ? 'رد' : 'Reply'),
              _buildActionItem(Icons.chat_bubble_outline, isRTL ? 'تعليق' : 'Comment'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActionItem(IconData icon, String label) {
    return GestureDetector(
      onTap: () {
        // UI only - no action in Phase 3
        debugPrint('👆 [REVIEW ACTION] $label tapped');
      },
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: const Color(0xFF7D7C7C)),
          const SizedBox(width: 4),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              color: Color(0xFF7D7C7C),
            ),
          ),
        ],
      ),
    );
  }
}
