import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../config/theme.dart';
import '../../config/api_config.dart';
import '../../providers/language_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/order.dart';
import '../../utils/image_url_utils.dart';

class _CookGroup {
  final String cookUserId;
  final String cookName;
  final List<Map<String, dynamic>> dishes;
  final TextEditingController reviewController;

  _CookGroup({
    required this.cookUserId,
    required this.cookName,
    required this.dishes,
    required this.reviewController,
  });

  void dispose() => reviewController.dispose();
}

class ReviewSubmissionScreen extends StatefulWidget {
  final Order order;
  final String cookId;
  final String? cookUserId;
  final String? cookName;

  const ReviewSubmissionScreen({
    Key? key,
    required this.order,
    required this.cookId,
    this.cookUserId,
    this.cookName,
  }) : super(key: key);

  @override
  State<ReviewSubmissionScreen> createState() => _ReviewSubmissionScreenState();
}

class _ReviewSubmissionScreenState extends State<ReviewSubmissionScreen> {
  final Map<String, int> _dishRatings = {};
  bool _isSubmitting = false;
  bool _isLoading = true;
  List<_CookGroup> _cookGroups = [];
  String? _error;

  bool get _isSingleCookMode => widget.cookId.isNotEmpty;

  @override
  void initState() {
    super.initState();
    _loadOrderDetails();
  }

  @override
  void dispose() {
    for (final g in _cookGroups) {
      g.dispose();
    }
    super.dispose();
  }

  Future<void> _loadOrderDetails() async {
    setState(() => _isLoading = true);

    try {
      final authProvider = context.read<AuthProvider>();
      final token = authProvider.token;
      if (token == null) throw Exception('Not authenticated');

      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/orders/${widget.order.id}'),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to load order details');
      }

      final responseData = json.decode(response.body);
      if (responseData['success'] != true || responseData['data'] == null) {
        throw Exception('Invalid response format');
      }

      final subOrders = (responseData['data']['subOrders'] as List?) ?? [];
      final groups = <_CookGroup>[];

      for (final subOrder in subOrders) {
        final cookData = subOrder['cook'];
        String subOrderCookUserId;
        String subOrderCookName;

        if (cookData is Map<String, dynamic>) {
          subOrderCookUserId = cookData['_id'] ?? '';
          subOrderCookName = cookData['storeName'] ?? cookData['name'] ?? 'Kitchen';
        } else {
          subOrderCookUserId = cookData?.toString() ?? '';
          subOrderCookName = 'Kitchen';
        }
        // cookName is enriched server-side at the subOrder level — prefer it over cook object fields
        final enrichedName = subOrder['cookName'] as String?;
        if (enrichedName != null && enrichedName.isNotEmpty) {
          subOrderCookName = enrichedName;
        }

        // In single-cook mode, skip subOrders that don't match
        if (_isSingleCookMode) {
          final targetId = widget.cookUserId ?? widget.cookId;
          if (subOrderCookUserId != targetId) continue;
        }

        final items = (subOrder['items'] as List?) ?? [];
        final dishes = items.map<Map<String, dynamic>>((item) {
          final snap = item['productSnapshot'] is Map<String, dynamic>
              ? item['productSnapshot'] as Map<String, dynamic>
              : <String, dynamic>{};

          final productId = item['product'] is String
              ? item['product'] as String
              : (item['product'] is Map ? (item['product']['_id'] ?? '') : '');

          final productName = snap['name'] ??
              (item['product'] is Map ? item['product']['name'] : 'Unknown Dish');

          final productImage = snap['image'] ??
              (item['product'] is Map ? item['product']['image'] : null);

          return {
            'id': item['_id'] ?? item['id'] ?? '',
            'productId': productId,
            'dishOfferId': item['dishOffer'],
            'name': productName,
            'image': productImage,
            'quantity': item['quantity'] ?? 1,
            'price': (item['price'] ?? 0).toDouble(),
          };
        }).toList();

        if (dishes.isNotEmpty) {
          groups.add(_CookGroup(
            cookUserId: subOrderCookUserId,
            cookName: _isSingleCookMode
                ? (widget.cookName ?? subOrderCookName)
                : subOrderCookName,
            dishes: dishes,
            reviewController: TextEditingController(),
          ));
        }
      }

      if (mounted) {
        setState(() {
          _cookGroups = groups;
          _isLoading = false;
          _error = null;
        });
      }
    } catch (e) {
      debugPrint('❌ Error loading order details: $e');
      if (mounted) {
        setState(() {
          _error = 'Error loading order: $e';
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _submitReview() async {
    final languageProvider = context.read<LanguageProvider>();
    final isRTL = languageProvider.isArabic;

    // Validate all dishes across all groups are rated
    for (final group in _cookGroups) {
      for (final dish in group.dishes) {
        final dishId = dish['id'] as String;
        if (!_dishRatings.containsKey(dishId) || _dishRatings[dishId] == 0) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(isRTL ? 'يرجى تقييم جميع الأطباق' : 'Please rate all dishes'),
              backgroundColor: Colors.red,
            ),
          );
          return;
        }
      }
    }

    setState(() => _isSubmitting = true);

    try {
      final authProvider = context.read<AuthProvider>();
      final token = authProvider.token;
      if (token == null) throw Exception('Not authenticated');

      final dishRatings = _cookGroups.expand((group) => group.dishes.map((dish) => {
            'product': dish['productId'] ?? dish['id'],
            'dishOffer': dish['dishOfferId'],
            'rating': _dishRatings[dish['id'] as String],
            'review': '',
          })).toList();

      final cookReviews = _cookGroups
          .map((g) => {
                'cookUserId': g.cookUserId,
                'overallReview': g.reviewController.text.trim(),
              })
          .toList();

      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/ratings/order/${widget.order.id}'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode({
          'dishRatings': dishRatings,
          'cookReviews': cookReviews,
          'overallReview': _cookGroups.isNotEmpty
              ? _cookGroups.first.reviewController.text.trim()
              : '',
        }),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = json.decode(response.body);
        if (data['success'] == true) {
          if (mounted) {
            Navigator.pop(context, true);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(isRTL ? 'تم إرسال التقييم بنجاح!' : 'Review submitted successfully!'),
                backgroundColor: Colors.green,
              ),
            );
          }
        } else {
          throw Exception(data['message'] ?? 'Failed to submit review');
        }
      } else {
        final data = json.decode(response.body);
        throw Exception(data['message'] ?? 'Failed to submit review');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;
    final allDishes = _cookGroups.expand((g) => g.dishes).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF7F7F7),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 16, left: 24, right: 24),
              child: Row(
                  children: [
                    GestureDetector(
                      onTap: () => Navigator.pop(context),
                      child: Icon(
                        isRTL ? Icons.arrow_forward : Icons.arrow_back,
                        color: AppTheme.textPrimary,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 24),
                    Expanded(
                      child: Row(
                        children: [
                          Text(
                            isRTL ? 'تقييم الطلب' : 'Review Order',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Icon(
                            Icons.chevron_left,
                            size: 16,
                            color: AppTheme.accentColor,
                          ),
                          Flexible(
                            child: Text(
                              '#${widget.order.id.substring(widget.order.id.length > 6 ? widget.order.id.length - 6 : 0)}',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.accentColor,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
              ),
            ),
            Expanded(child: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!))
              : allDishes.isEmpty
                  ? Center(
                      child: Text(
                        isRTL ? 'لا توجد أطباق للتقييم' : 'No dishes to review',
                        style: const TextStyle(fontSize: 16, color: Color(0xFF7D7C7C)),
                      ),
                    )
                  : Column(
                      children: [
                        Expanded(
                          child: ListView(
                            padding: const EdgeInsets.all(16),
                            children: [
                              ..._cookGroups.asMap().entries.expand((entry) {
                                final idx = entry.key;
                                final group = entry.value;
                                return [
                                  if (!_isSingleCookMode) ...[
                                    if (idx > 0) const SizedBox(height: 8),
                                    _buildCookHeader(group.cookName),
                                    const SizedBox(height: 12),
                                  ],
                                  if (_isSingleCookMode) ...[
                                    Text(
                                      isRTL ? 'قيّم الأطباق' : 'Rate Dishes',
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                        color: AppTheme.textPrimary,
                                      ),
                                    ),
                                    const SizedBox(height: 12),
                                  ],
                                  ...group.dishes.map((dish) => _buildDishRatingCard(dish, isRTL)),
                                  const SizedBox(height: 8),
                                  _buildReviewSection(group, isRTL),
                                  const SizedBox(height: 16),
                                ];
                              }),
                              const SizedBox(height: 8),
                            ],
                          ),
                        ),
                        _buildSubmitButton(isRTL),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCookHeader(String cookName) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        cookName,
        style: const TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w600,
          color: AppTheme.textPrimary,
        ),
      ),
    );
  }

  Widget _buildDishRatingCard(Map<String, dynamic> dish, bool isRTL) {
    final dishId = dish['id'] as String;
    final dishName = dish['name'] as String;
    final dishImage = dish['image'] as String?;
    final currentRating = _dishRatings[dishId] ?? 0;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: dishImage != null
                ? SmartImage(
                    imageUrl: dishImage,
                    width: 60,
                    height: 60,
                    placeholder: Container(
                      width: 60,
                      height: 60,
                      color: const Color(0xFFF5F5F5),
                      child: const Icon(Icons.restaurant, size: 30, color: Color(0xFF969494)),
                    ),
                  )
                : Container(
                    width: 60,
                    height: 60,
                    color: const Color(0xFFF5F5F5),
                    child: const Icon(Icons.restaurant, size: 30, color: Color(0xFF969494)),
                  ),
          ),
          const SizedBox(width: 12),
          Expanded(
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
                const SizedBox(height: 8),
                Row(
                  children: List.generate(5, (index) {
                    return GestureDetector(
                      onTap: () => setState(() => _dishRatings[dishId] = index + 1),
                      child: Padding(
                        padding: const EdgeInsets.only(right: 4),
                        child: Icon(
                          index < currentRating ? Icons.star : Icons.star_border,
                          size: 24,
                          color: const Color(0xFFFF7A00),
                        ),
                      ),
                    );
                  }),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReviewSection(_CookGroup group, bool isRTL) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _isSingleCookMode
                ? (isRTL ? 'اكتب تقييمك' : 'Write Your Review')
                : (isRTL ? 'تقييم ${group.cookName}' : 'Review for ${group.cookName}'),
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: group.reviewController,
            maxLines: 4,
            maxLength: 500,
            decoration: InputDecoration(
              hintText: isRTL
                  ? 'شارك تجربتك مع هذا الطلب...'
                  : 'Share your experience with this order...',
              hintStyle: const TextStyle(fontSize: 12, color: Color(0xFF969494)),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: Color(0xFFE0E0E0)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: Color(0xFFE0E0E0)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: AppTheme.accentColor),
              ),
              contentPadding: const EdgeInsets.all(12),
            ),
            style: const TextStyle(fontSize: 12, color: AppTheme.textPrimary),
          ),
        ],
      ),
    );
  }

  Widget _buildSubmitButton(bool isRTL) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SizedBox(
        width: double.infinity,
        height: 48,
        child: ElevatedButton(
          onPressed: _isSubmitting ? null : _submitReview,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.accentColor,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          child: _isSubmitting
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                )
              : Text(
                  isRTL ? 'إرسال التقييم' : 'Submit Review',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
        ),
      ),
    );
  }
}
