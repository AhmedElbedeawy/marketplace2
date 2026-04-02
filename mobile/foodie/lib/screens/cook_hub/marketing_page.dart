import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../../config/api_config.dart';
import '../../providers/language_provider.dart';
import '../../providers/auth_provider.dart';

/// Cook Hub Marketing Page - Displays marketing campaigns and promotions
/// Follows Stitch design reference from cook_hub_marketing_final_design
class MarketingPage extends StatefulWidget {
  const MarketingPage({Key? key}) : super(key: key);

  @override
  State<MarketingPage> createState() => _MarketingPageState();
}

class _MarketingPageState extends State<MarketingPage> {
  Map<String, dynamic>? _activeCampaign;
  List<Map<String, dynamic>> _dishStats = [];
  List<Map<String, dynamic>> _expiredPromotions = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchMarketingData();
  }

  Future<void> _fetchMarketingData() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final token = authProvider.token;

    if (token == null) {
      setState(() {
        _error = 'Authentication required';
        _isLoading = false;
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // Fetch marketing data from API
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/marketing/cook/dashboard'),
        headers: {'Authorization': 'Bearer $token'},
      );

      print('📢 [MARKETING] API Response status: ${response.statusCode}');

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        
        setState(() {
          _activeCampaign = data['activeCampaign'];
          _dishStats = (data['dishStats'] as List?)?.cast<Map<String, dynamic>>() ?? [];
          _expiredPromotions = (data['expiredPromotions'] as List?)?.cast<Map<String, dynamic>>() ?? [];
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = 'Failed to load marketing data';
          _isLoading = false;
        });
      }
    } catch (e) {
      print('📢 [MARKETING] Exception: $e');
      setState(() {
        _error = 'Error loading marketing data: $e';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = Provider.of<LanguageProvider>(context);
    final isRTL = languageProvider.isArabic;

    return RefreshIndicator(
      onRefresh: _fetchMarketingData,
      child: CustomScrollView(
        slivers: [
          // Loading state
          if (_isLoading)
            const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator(color: Color(0xFF904800))),
            )
          
          // Error state
          else if (_error != null)
            SliverFillRemaining(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.error_outline, size: 48, color: Colors.grey[600]),
                    const SizedBox(height: 16),
                    Text(_error!, style: TextStyle(color: Colors.grey[600])),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: _fetchMarketingData,
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            )

          // Content
          else ...[
            // Active Campaign Section
            if (_activeCampaign != null) ...[
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        isRTL ? 'الحملة النشطة' : 'Active Campaign',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF2D2F2F),
                        ),
                      ),
                      TextButton(
                        onPressed: () {
                          // TODO: Navigate to view all campaigns
                        },
                        child: Text(
                          isRTL ? 'عرض الكل' : 'View all',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF904800),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: _buildActiveCampaignCard(isRTL),
              ),
            ] else ...[
              // No active campaign - show create CTA
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Container(
                    padding: const EdgeInsets.all(32),
                    decoration: BoxDecoration(
                      border: Border.all(color: const Color(0xFFEBEBEB), width: 2, style: BorderStyle.solid),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      children: [
                        Icon(Icons.campaign_outlined, size: 64, color: Colors.grey[400]),
                        const SizedBox(height: 16),
                        Text(
                          isRTL ? 'لا توجد حملة نشطة حالياً' : 'No Active Campaign',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey[600],
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          isRTL ? 'أنشئ حملتك الأولى لزيادة المبيعات' : 'Create your first campaign to boost sales',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey[500],
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 24),
                        ElevatedButton.icon(
                          onPressed: () {
                            // TODO: Create new campaign
                          },
                          icon: const Icon(Icons.add),
                          label: Text(isRTL ? 'إنشاء حملة' : 'Create Campaign'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFFCD535),
                            foregroundColor: const Color(0xFF2D2F2F),
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],

            // Dish Usage Stats Section
            if (_dishStats.isNotEmpty) ...[
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
                  child: Text(
                    isRTL ? 'استخدام الخصم حسب الطبق' : 'Discount Usage per Dish',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF2D2F2F),
                    ),
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: _buildUsageStatsCard(isRTL),
              ),
            ],

            // Expired Promotions Section
            if (_expiredPromotions.isNotEmpty) ...[
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
                  child: Text(
                    isRTL ? 'العروض المنتهية' : 'Expired Promotions',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF2D2F2F),
                    ),
                  ),
                ),
              ),
              SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) => _buildExpiredPromotionCard(_expiredPromotions[index], isRTL),
                  childCount: _expiredPromotions.length,
                ),
              ),
            ],

            // Create New Campaign Button
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: OutlinedButton.icon(
                  onPressed: () {
                    // TODO: Create new campaign
                  },
                  icon: const Icon(Icons.add_circle, color: Color(0xFF904800)),
                  label: Text(
                    isRTL ? 'إنشاء حملة جديدة' : 'Create New Campaign',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF904800),
                    ),
                  ),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFFEBEBEB), width: 2),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
            ),

            // Bottom padding for navigation bar
            const SliverToBoxAdapter(
              child: SizedBox(height: 100),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildActiveCampaignCard(bool isRTL) {
    if (_activeCampaign == null) return const SizedBox.shrink();

    final campaignName = _activeCampaign!['name'] ?? 'Unknown Campaign';
    final discountPercent = _activeCampaign!['discountPercent'] ?? 0;
    final totalRedemptions = _activeCampaign!['totalRedemptions'] ?? 0;
    final estimatedRevenue = _activeCampaign!['estimatedRevenue'] ?? 0.0;
    final isActive = _activeCampaign!['isActive'] ?? false;

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFEBEBEB)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with status
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: isActive ? Colors.green : Colors.grey,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    isActive ? 'LIVE' : 'INACTIVE',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: isActive ? Colors.green : Colors.grey,
                      letterSpacing: 1,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFFFCD535),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '$discountPercent%',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF2D2F2F),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          
          // Campaign name
          Text(
            campaignName,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Color(0xFF2D2F2F),
            ),
          ),
          const SizedBox(height: 20),
          
          // Stats grid
          Row(
            children: [
              // Total Usage
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF5F5F5),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isRTL ? 'إجمالي الاستخدام' : 'Total Usage',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Colors.grey[600],
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '$totalRedemptions',
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF2D2F2F),
                        ),
                      ),
                      Text(
                        isRTL ? 'استرداد' : 'redemptions',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              
              // Estimated Revenue
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF5F5F5),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isRTL ? 'الإيرادات المقدرة' : 'Est. Revenue',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Colors.grey[600],
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '\$${estimatedRevenue.toStringAsFixed(0)}',
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF904800),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildUsageStatsCard(bool isRTL) {
    // Find max value for scaling
    final maxValue = _dishStats.fold<double>(
      1,
      (max, stat) => (stat['usageCount'] ?? 0).toDouble().clamp(max, double.infinity),
    );

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFEBEBEB)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Bar chart
          SizedBox(
            height: 150,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: _dishStats.map((stat) {
                final usageCount = (stat['usageCount'] ?? 0).toDouble();
                final dishName = stat['dishName'] ?? 'Unknown';
                final heightPercent = maxValue > 0 ? (usageCount / maxValue * 100).clamp(10, 100) : 10;
                
                return Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Container(
                        width: 40,
                        height: 120,
                        decoration: BoxDecoration(
                          color: const Color(0xFFE7E8E8),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Align(
                          alignment: Alignment.bottomCenter,
                          child: Container(
                            width: 40,
                            height: heightPercent * 1.2,
                            decoration: BoxDecoration(
                              color: const Color(0xFF5A5C5C),
                              borderRadius: BorderRadius.circular(6),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        dishName.length > 8 ? '${dishName.substring(0, 8)}...' : dishName,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Colors.grey[600],
                        ),
                        textAlign: TextAlign.center,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 16),
          
          // Divider
          Container(
            height: 1,
            color: const Color(0xFFE7E8E8),
          ),
          const SizedBox(height: 16),
          
          // Campaign details
          _buildDetailRow(
            isRTL ? 'نوع الخصم' : 'Discount Type',
            isRTL ? 'قسيمة' : 'Coupon',
          ),
          const SizedBox(height: 12),
          _buildDetailRowWithBadge(
            isRTL ? 'الكود' : 'Code',
            'SAVE20',
          ),
          const SizedBox(height: 12),
          _buildDetailRow(
            isRTL ? 'صالح حتى' : 'Valid Through',
            'Dec 31, 2026',
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 13,
            color: Colors.grey[600],
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: Color(0xFF2D2F2F),
          ),
        ),
      ],
    );
  }

  Widget _buildDetailRowWithBadge(String label, String code) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 13,
            color: Colors.grey[600],
          ),
        ),
        Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFFCD535),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                code,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF2D2F2F),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Icon(Icons.content_copy, size: 16, color: Colors.grey[600]),
          ],
        ),
      ],
    );
  }

  Widget _buildExpiredPromotionCard(Map<String, dynamic> promotion, bool isRTL) {
    final name = promotion['name'] ?? 'Unknown Promotion';
    final endDate = promotion['endDate'] != null 
        ? DateTime.parse(promotion['endDate'])
        : null;
    final usesCount = promotion['usesCount'] ?? 0;
    final icon = promotion['icon'] ?? 'ac_unit';

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF5F5F5).withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFEBEBEB)),
      ),
      child: Row(
        children: [
          // Icon
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: const Color(0xFFE7E8E8),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              _getIconData(icon),
              color: Colors.grey[600],
              size: 24,
            ),
          ),
          const SizedBox(width: 12),
          
          // Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF2D2F2F),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  endDate != null 
                      ? '${isRTL ? 'انتهى في' : 'Ended'} ${_formatDate(endDate)} • $usesCount ${isRTL ? 'استخدام' : 'uses'}'
                      : '$usesCount ${isRTL ? 'استخدام' : 'uses'}',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),
          
          // Expired badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFFE7E8E8),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              isRTL ? 'منتهي' : 'Expired',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: Colors.grey[600],
              ),
            ),
          ),
        ],
      ),
    );
  }

  IconData _getIconData(String iconName) {
    switch (iconName.toLowerCase()) {
      case 'bolt':
        return Icons.bolt;
      case 'ac_unit':
        return Icons.ac_unit;
      case 'local_fire_department':
        return Icons.local_fire_department;
      default:
        return Icons.campaign_outlined;
    }
  }

  String _formatDate(DateTime date) {
    return '${date.month}/${date.day}/${date.year}';
  }
}