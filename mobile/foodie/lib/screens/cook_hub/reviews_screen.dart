import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import '../../config/theme.dart';
import '../../config/api_config.dart';
import '../../providers/language_provider.dart';
import '../../providers/auth_provider.dart';

class ReviewsScreen extends StatefulWidget {
  const ReviewsScreen({super.key});

  @override
  State<ReviewsScreen> createState() => _ReviewsScreenState();
}

class _ReviewsScreenState extends State<ReviewsScreen> {
  final List<dynamic> _reviews = [];
  bool _isLoading = true;
  String? _error;
  double _averageRating = 0;
  int _totalReviews = 0;

  @override
  void initState() {
    super.initState();
    _fetchReviews();
  }

  Future<void> _fetchReviews() async {
    final authProvider = context.read<AuthProvider>();
    final token = authProvider.token;

    if (token == null) {
      setState(() {
        _error = 'Not authenticated';
        _isLoading = false;
      });
      return;
    }

    try {
      // Fetch cook's profile which includes rating info
      final response = await http.get(
        Uri.parse(ApiConfig.userProfile),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final user = data['data'] ?? data;
        
        setState(() {
          _averageRating = user['cookRatingAvg']?.toDouble() ?? 0.0;
          _totalReviews = user['cookRatingCount'] ?? 0;
          // TODO: Fetch actual reviews list when endpoint is available
          _isLoading = false;
        });
      } else {
        throw Exception('Failed to load reviews');
      }
    } catch (err) {
      setState(() {
        _error = err.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;

    if (_isLoading) {
      return Scaffold(
        backgroundColor: AppTheme.backgroundColor,
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          title: Text(
            isRTL ? 'التقييمات والمراجعات' : 'Reviews & Ratings',
            style: const TextStyle(
              color: AppTheme.textPrimary,
              fontSize: 20,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null) {
      return Scaffold(
        backgroundColor: AppTheme.backgroundColor,
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          title: Text(
            isRTL ? 'التقييمات والمراجعات' : 'Reviews & Ratings',
            style: const TextStyle(
              color: AppTheme.textPrimary,
              fontSize: 20,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 48, color: Colors.grey[400]),
              const SizedBox(height: 16),
              Text(
                _error ?? 'Error loading reviews',
                style: const TextStyle(color: AppTheme.textSecondary),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Text(
          isRTL ? 'التقييمات والمراجعات' : 'Reviews & Ratings',
          style: const TextStyle(
            color: AppTheme.textPrimary,
            fontSize: 20,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _fetchReviews,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Rating Summary
            Card(
              color: Colors.white,
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          _averageRating.toStringAsFixed(1),
                          style: const TextStyle(
                            fontSize: 48,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.accentColor,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: List.generate(5, (index) {
                                return Icon(
                                  index < _averageRating.round()
                                      ? Icons.star
                                      : Icons.star_border,
                                  color: AppTheme.accentColor,
                                  size: 24,
                                );
                              }),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '$_totalReviews ${isRTL ? 'تقييم' : 'reviews'}',
                              style: const TextStyle(
                                color: AppTheme.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Reviews List
            if (_reviews.isEmpty)
              Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    children: [
                      Icon(
                        Icons.rate_review_outlined,
                        size: 64,
                        color: Colors.grey[400],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        isRTL
                            ? 'لا توجد تقييمات بعد'
                            : 'No reviews yet',
                        style: const TextStyle(
                          color: AppTheme.textSecondary,
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        isRTL
                            ? 'ستظهر تقييمات العملاء هنا'
                            : 'Customer reviews will appear here',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: AppTheme.textSecondary,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
              )
            else
              ..._reviews.map((review) => _buildReviewCard(review)),
          ],
        ),
      ),
    );
  }

  Widget _buildReviewCard(dynamic review) {
    final languageProvider = context.read<LanguageProvider>();
    final isRTL = languageProvider.isArabic;
    final rating = review['rating'] ?? 0;
    final comment = isRTL
        ? (review['commentAr'] ?? review['comment'] ?? '')
        : (review['comment'] ?? review['commentAr'] ?? '');
    final customerName = review['customerName'] ?? 'Customer';
    final orderDate = review['orderDate'] ?? '';
    final reviewId = review['_id'] ?? review['id'];
    final hasReply = review['reply'] != null && review['reply'].toString().isNotEmpty;

    return Card(
      color: Colors.white,
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  customerName,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                Row(
                  children: List.generate(5, (index) {
                    return Icon(
                      index < rating ? Icons.star : Icons.star_border,
                      color: AppTheme.accentColor,
                      size: 18,
                    );
                  }),
                ),
              ],
            ),
            const SizedBox(height: 8),
            if (comment.isNotEmpty)
              Text(
                comment,
                style: const TextStyle(color: AppTheme.textPrimary),
              ),
            if (orderDate.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                _formatDate(orderDate),
                style: const TextStyle(
                  color: AppTheme.textSecondary,
                  fontSize: 12,
                ),
              ),
            ],
            const SizedBox(height: 12),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: () => _showReplyDialog(reviewId, review['reply'] as String?),
                icon: const Icon(Icons.reply, size: 18),
                label: Text(isRTL ? 'رد على التقييم' : 'Reply'),
                style: TextButton.styleFrom(foregroundColor: AppTheme.accentColor),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showReplyDialog(dynamic reviewId, String? existingReply) {
    final languageProvider = context.read<LanguageProvider>();
    final isRTL = languageProvider.isArabic;
    final controller = TextEditingController(text: existingReply ?? '');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom,
          left: 16, right: 16, top: 16,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(isRTL ? 'اكتب ردك' : 'Write your reply', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            TextField(controller: controller, maxLines: 4, decoration: InputDecoration(hintText: isRTL ? 'اكتب ردك هنا...' : 'Write your reply here...', border: const OutlineInputBorder())),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(onPressed: () => Navigator.pop(ctx), child: Text(isRTL ? 'إلغاء' : 'Cancel')),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: () async {
                    final reply = controller.text.trim();
                    if (reply.isNotEmpty) { Navigator.pop(ctx); await _submitReply(reviewId, reply); }
                  },
                  child: Text(isRTL ? 'إرسال' : 'Submit'),
                ),
              ],
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Future<void> _submitReply(dynamic reviewId, String reply) async {
    final token = context.read<AuthProvider>().token;
    if (token == null) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Authentication required'))); return; }
    try {
      final response = await http.post(
        Uri.parse(ApiConfig.replyToRating(reviewId.toString())),
        headers: {'Authorization': 'Bearer $token', 'Content-Type': 'application/json'},
        body: json.encode({'reply': reply}),
      );
      if (mounted) {
        final isRTL = context.read<LanguageProvider>().isArabic;
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(response.statusCode == 200 || response.statusCode == 201 ? (isRTL ? 'تم إرسال الرد' : 'Reply submitted') : (isRTL ? 'فشل إرسال الرد' : 'Failed to submit reply'))));
        if (response.statusCode == 200 || response.statusCode == 201) _fetchReviews();
      }
    } catch (e) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'))); }
  }

  String _formatDate(String dateString) {
    final date = DateTime.parse(dateString);
    return '${date.day}/${date.month}/${date.year}';
  }
}
