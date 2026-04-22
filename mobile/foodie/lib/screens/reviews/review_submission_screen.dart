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

class ReviewSubmissionScreen extends StatefulWidget {
  final Order order;
  final String cookId;
  final String? cookName;

  const ReviewSubmissionScreen({
    Key? key,
    required this.order,
    required this.cookId,
    this.cookName,
  }) : super(key: key);

  @override
  State<ReviewSubmissionScreen> createState() => _ReviewSubmissionScreenState();
}

class _ReviewSubmissionScreenState extends State<ReviewSubmissionScreen> {
  final TextEditingController _reviewController = TextEditingController();
  final Map<String, int> _dishRatings = {}; // dishId -> rating
  bool _isSubmitting = false;
  bool _isLoading = true;
  List<Map<String, dynamic>> _cookDishes = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadOrderDetails();
  }

  @override
  void dispose() {
    _reviewController.dispose();
    super.dispose();
  }

  Future<void> _loadOrderDetails() async {
    setState(() => _isLoading = true);

    try {
      final authProvider = context.read<AuthProvider>();
      final token = authProvider.token;

      if (token == null) {
        throw Exception('Not authenticated');
      }

      // Fetch full order details with items
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/orders/${widget.order.id}'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final responseData = json.decode(response.body);
        
        if (responseData['success'] != true || responseData['data'] == null) {
          throw Exception('Invalid response format');
        }
        
        final orderData = responseData['data'];
        final subOrders = orderData['subOrders'] as List? ?? [];
        
        debugPrint('🔍 Loading dishes for cook: ${widget.cookId}');
        debugPrint('📦 Total subOrders: ${subOrders.length}');
        
        // Find the subOrder for this cook
        for (final subOrder in subOrders) {
          // Extract cook ID - can be object or string
          final cookData = subOrder['cook'];
          String? subOrderCookId;
          
          if (cookData is Map<String, dynamic>) {
            subOrderCookId = cookData['_id'];
          } else if (cookData is String) {
            subOrderCookId = cookData;
          }
          
          debugPrint('  SubOrder cook ID: $subOrderCookId');
          
          if (subOrderCookId?.toString() == widget.cookId) {
            // Found the matching subOrder - extract items
            final items = subOrder['items'] as List? ?? [];
            debugPrint('✅ Found matching subOrder with ${items.length} items');
            
            _cookDishes = items.map((item) {
              final productSnapshot = item['productSnapshot'] is Map<String, dynamic> 
                  ? item['productSnapshot'] 
                  : {};
              
              // product can be a string ID or a populated object
              final productId = item['product'] is String 
                  ? item['product'] 
                  : (item['product'] is Map ? (item['product']['_id'] ?? '') : '');
              
              final productName = productSnapshot['name'] ?? 
                  (item['product'] is Map ? item['product']['name'] : 'Unknown Dish');
              
              final productImage = productSnapshot['image'] ?? 
                  (item['product'] is Map ? item['product']['image'] : null);
              
              final dish = {
                'id': item['_id'] ?? item['id'] ?? '',
                'productId': productId,
                'dishOfferId': item['dishOffer'],
                'name': productName,
                'image': productImage,
                'quantity': item['quantity'] ?? 1,
                'price': (item['price'] ?? 0).toDouble(),
              };
              
              debugPrint('    Dish: ${dish['name']}, ProductId: ${dish['productId']}, Image: ${dish['image'] != null ? 'YES' : 'NO'}');
              
              return dish;
            }).toList();
            
            break;
          }
        }

        if (mounted) {
          debugPrint('🍽️ Total dishes loaded: ${_cookDishes.length}');
          setState(() {
            _isLoading = false;
            _error = null;
          });
        }
      } else {
        throw Exception('Failed to load order details');
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
    // Validate all dishes are rated
    for (final dish in _cookDishes) {
      final dishId = dish['id'] as String;
      if (!_dishRatings.containsKey(dishId) || _dishRatings[dishId] == 0) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please rate all dishes'),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }
    }

    setState(() => _isSubmitting = true);

    try {
      final authProvider = context.read<AuthProvider>();
      final token = authProvider.token;

      if (token == null) {
        throw Exception('Not authenticated');
      }

      // Build dish ratings array
      final dishRatings = _cookDishes.map((dish) {
        final dishId = dish['id'] as String;
        final productId = dish['productId'] ?? dishId;
        final dishOfferId = dish['dishOfferId'];

        return {
          'product': productId,
          'dishOffer': dishOfferId,
          'rating': _dishRatings[dishId],
          'review': '', // Per-dish review not used, only overallReview
        };
      }).toList();

      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/ratings/order/${widget.order.id}'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode({
          'dishRatings': dishRatings,
          'overallReview': _reviewController.text.trim(),
        }),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = json.decode(response.body);
        if (data['success']) {
          // Success - return to previous screen
          if (mounted) {
            Navigator.pop(context, true); // Return success flag
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Review submitted successfully!'),
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
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
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
          isRTL ? 'تقييم الطلب' : 'Review Order',
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
              : _cookDishes.isEmpty
                  ? const Center(
                      child: Text(
                        'No dishes to review',
                        style: TextStyle(
                          fontSize: 16,
                          color: Color(0xFF7D7C7C),
                        ),
                      ),
                    )
                  : Column(
                      children: [
                        // Order context (compact)
                        _buildOrderContext(isRTL),
                        // Dish ratings list
                        Expanded(
                          child: ListView(
                            padding: const EdgeInsets.all(16),
                            children: [
                              // Section title
                              Text(
                                isRTL ? 'قيّم الأطباق' : 'Rate Dishes',
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 12),
                              // Dish cards
                              ..._cookDishes.map((dish) => _buildDishRatingCard(dish, isRTL)),
                              const SizedBox(height: 16),
                              // Shared review section
                              _buildSharedReviewSection(isRTL),
                              const SizedBox(height: 24),
                            ],
                          ),
                        ),
                        // Submit button
                        _buildSubmitButton(isRTL),
                      ],
                    ),
    );
  }

  Widget _buildOrderContext(bool isRTL) {
    return Container(
      padding: const EdgeInsets.all(14),
      color: Colors.white,
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isRTL ? 'طلب' : 'Order',
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF7D7C7C),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '#${widget.order.id.substring(widget.order.id.length - 6)}',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary,
                  ),
                ),
              ],
            ),
          ),
          if (widget.cookName != null)
            Text(
              widget.cookName!,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: AppTheme.accentColor,
              ),
            ),
        ],
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
          // Dish image
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
          // Dish name and stars
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
                // Star rating selector
                Row(
                  children: List.generate(5, (index) {
                    return GestureDetector(
                      onTap: () {
                        setState(() {
                          _dishRatings[dishId] = index + 1;
                        });
                      },
                      child: Padding(
                        padding: const EdgeInsets.only(right: 4),
                        child: Icon(
                          index < currentRating
                              ? Icons.star
                              : Icons.star_border,
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

  Widget _buildSharedReviewSection(bool isRTL) {
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
            isRTL ? 'اكتب تقييمك' : 'Write Your Review',
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _reviewController,
            maxLines: 4,
            maxLength: 500,
            decoration: InputDecoration(
              hintText: isRTL
                  ? 'شارك تجربتك مع هذا الطلب...'
                  : 'Share your experience with this order...',
              hintStyle: const TextStyle(
                fontSize: 12,
                color: Color(0xFF969494),
              ),
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
            style: const TextStyle(
              fontSize: 12,
              color: AppTheme.textPrimary,
            ),
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
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          child: _isSubmitting
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
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
