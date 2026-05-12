import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'package:cached_network_image/cached_network_image.dart';
import '../../config/theme.dart';
import '../../config/api_config.dart';
import '../../providers/language_provider.dart';
import '../../providers/auth_provider.dart';
import '../../utils/image_url_utils.dart';
// proxyGcsUrl / isGcsUrl are also exported from image_url_utils.dart

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
    final cookId = authProvider.user?.id;

    if (token == null || cookId == null) {
      setState(() {
        _error = 'Not authenticated';
        _isLoading = false;
      });
      return;
    }

    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/ratings/cook/$cookId/reviews'),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        final body = json.decode(response.body) as Map<String, dynamic>;
        final data = body['data'] as Map<String, dynamic>? ?? {};
        final reviews = data['reviews'] as List? ?? [];

        // Compute average from returned reviews (fallback if summary not in payload)
        double avg = 0;
        if (reviews.isNotEmpty) {
          final sum = reviews.fold<double>(
            0,
            (acc, r) => acc + ((r['overallRating'] as num?)?.toDouble() ?? 0),
          );
          avg = sum / reviews.length;
        }

        setState(() {
          _reviews.clear();
          _reviews.addAll(reviews);
          _totalReviews = (data['pagination'] as Map<String, dynamic>?)?['totalReviews'] as int? ?? reviews.length;
          _averageRating = avg;
          _isLoading = false;
        });
      } else {
        throw Exception('Failed to load reviews (${response.statusCode})');
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

    // API shape: { reviewer: { name, avatar }, overallRating, overallReview, createdAt }
    final reviewer = review['reviewer'] as Map<String, dynamic>? ?? {};
    final customerName = reviewer['name'] as String? ?? 'Customer';
    final avatarRaw = reviewer['avatar'] as String?;
    // Resolve relative path → absolute, then proxy GCS URLs so they load on
    // all platforms. Only use the result if it's a proper HTTP(S) URL.
    String avatarUrl = '';
    if (avatarRaw != null && avatarRaw.isNotEmpty) {
      final resolved = getAbsoluteUrl(avatarRaw);
      if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
        avatarUrl = isGcsUrl(resolved) ? proxyGcsUrl(resolved) : resolved;
      }
    }

    final rating = (review['overallRating'] as num?)?.toInt() ?? 0;
    final comment = (review['overallReview'] as String? ?? '').trim();
    final createdAt = review['createdAt'] as String? ?? '';
    final reviewId = review['_id'] ?? review['id'];

    return Card(
      color: Colors.white,
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Reviewer row: avatar + name + stars
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Avatar
                CircleAvatar(
                  radius: 20,
                  backgroundColor: const Color(0xFFE0E0E0),
                  child: avatarUrl.isNotEmpty
                      ? ClipOval(
                          child: CachedNetworkImage(
                            imageUrl: avatarUrl,
                            width: 40,
                            height: 40,
                            fit: BoxFit.cover,
                            errorWidget: (_, __, ___) => const Icon(
                              Icons.person,
                              size: 22,
                              color: Color(0xFF9E9E9E),
                            ),
                          ),
                        )
                      : const Icon(
                          Icons.person,
                          size: 22,
                          color: Color(0xFF9E9E9E),
                        ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    customerName,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                    ),
                  ),
                ),
                // Star rating
                Row(
                  children: List.generate(5, (index) {
                    return Icon(
                      index < rating ? Icons.star : Icons.star_border,
                      color: AppTheme.accentColor,
                      size: 17,
                    );
                  }),
                ),
              ],
            ),
            if (comment.isNotEmpty) ...[
              const SizedBox(height: 10),
              Text(
                comment,
                style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14),
              ),
            ],
            if (createdAt.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(
                _formatDate(createdAt),
                style: const TextStyle(
                  color: AppTheme.textSecondary,
                  fontSize: 12,
                ),
              ),
            ],
            const SizedBox(height: 10),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: () => _showReplyDialog(reviewId, review['reply'] as String?),
                icon: const Icon(Icons.reply, size: 17),
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
