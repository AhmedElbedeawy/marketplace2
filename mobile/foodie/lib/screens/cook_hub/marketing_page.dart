import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../../config/api_config.dart';
import '../../config/theme.dart';
import '../../providers/language_provider.dart';
import '../../providers/auth_provider.dart';

class MarketingPage extends StatefulWidget {
  const MarketingPage({Key? key}) : super(key: key);

  @override
  State<MarketingPage> createState() => _MarketingPageState();
}

class _MarketingPageState extends State<MarketingPage> {
  List<Map<String, dynamic>> _active   = [];
  List<Map<String, dynamic>> _upcoming = [];
  List<Map<String, dynamic>> _expired  = [];
  Map<String, dynamic>?      _summary;
  bool   _isLoading = true;
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
      setState(() { _error = 'Authentication required'; _isLoading = false; });
      return;
    }

    setState(() { _isLoading = true; _error = null; });

    try {
      final response = await http.get(
        Uri.parse(ApiConfig.cookMarketingDashboard()),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body)['data'] as Map<String, dynamic>;
        setState(() {
          _active   = (data['active']   as List?)?.cast<Map<String, dynamic>>() ?? [];
          _upcoming = (data['upcoming'] as List?)?.cast<Map<String, dynamic>>() ?? [];
          _expired  = (data['expired']  as List?)?.cast<Map<String, dynamic>>() ?? [];
          _summary  = data['summary']  as Map<String, dynamic>?;
          _isLoading = false;
        });
      } else {
        setState(() { _error = 'Failed to load marketing data'; _isLoading = false; });
      }
    } catch (e) {
      setState(() { _error = 'Error: $e'; _isLoading = false; });
    }
  }

  String _formatDate(String? iso) {
    if (iso == null) return '';
    try {
      final d = DateTime.parse(iso);
      return '${d.day}/${d.month}/${d.year}';
    } catch (_) { return iso; }
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = Provider.of<LanguageProvider>(context);
    final isRTL = languageProvider.isArabic;
    final hasAnyCampaign = _active.isNotEmpty || _upcoming.isNotEmpty || _expired.isNotEmpty;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
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
                    child: Text(
                      isRTL ? 'التسويق' : 'Marketing',
                      style: const TextStyle(
                        color: AppTheme.textPrimary,
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        height: 1.2,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: RefreshIndicator(
        onRefresh: _fetchMarketingData,
        child: CustomScrollView(
          slivers: [
            if (_isLoading)
              const SliverFillRemaining(
                child: Center(
                  child: CircularProgressIndicator(color: Color(0xFF904800)),
                ),
              )

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
                        child: Text(isRTL ? 'إعادة المحاولة' : 'Retry'),
                      ),
                    ],
                  ),
                ),
              )

            else if (!hasAnyCampaign)
              SliverFillRemaining(
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.campaign_outlined, size: 64, color: Colors.grey[400]),
                        const SizedBox(height: 16),
                        Text(
                          isRTL ? 'لا توجد حملات تسويقية' : 'No campaigns yet',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF5A5C5C),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          isRTL
                              ? 'ستظهر الحملات التي تؤثر على أطباقك هنا'
                              : 'Campaigns affecting your dishes will appear here',
                          style: TextStyle(fontSize: 14, color: Colors.grey[500]),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                ),
              )

            else ...[
              // ── Summary strip ──────────────────────────────────────────
              if (_summary != null)
                SliverToBoxAdapter(
                  child: _buildSummaryStrip(_summary!, isRTL),
                ),

              // ── Active ─────────────────────────────────────────────────
              if (_active.isNotEmpty) ...[
                _sectionHeader(
                  isRTL ? 'الحملات النشطة' : 'Active Campaigns',
                  const Color(0xFF27AE60),
                  Icons.play_circle_outline,
                ),
                SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (ctx, i) => _buildCampaignCard(_active[i], 'active', isRTL),
                    childCount: _active.length,
                  ),
                ),
              ],

              // ── Upcoming ───────────────────────────────────────────────
              if (_upcoming.isNotEmpty) ...[
                _sectionHeader(
                  isRTL ? 'الحملات القادمة' : 'Upcoming',
                  const Color(0xFF2980B9),
                  Icons.schedule,
                ),
                SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (ctx, i) => _buildCampaignCard(_upcoming[i], 'upcoming', isRTL),
                    childCount: _upcoming.length,
                  ),
                ),
              ],

              // ── Expired ────────────────────────────────────────────────
              if (_expired.isNotEmpty) ...[
                _sectionHeader(
                  isRTL ? 'الحملات المنتهية' : 'Ended Campaigns',
                  Colors.grey,
                  Icons.history,
                ),
                SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (ctx, i) => _buildCampaignCard(_expired[i], 'expired', isRTL),
                    childCount: _expired.length,
                  ),
                ),
              ],

              const SliverToBoxAdapter(child: SizedBox(height: 100)),
            ],
          ],
        ),
      ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryStrip(Map<String, dynamic> summary, bool isRTL) {
    const currency = 'SAR';
    return Container(
      margin: const EdgeInsets.fromLTRB(24, 16, 24, 4),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _summaryCell(
            isRTL ? 'الاستخدام' : 'Uses',
            '${summary['totalUsageCount'] ?? 0}',
            const Color(0xFF904800),
          ),
          _divider(),
          _summaryCell(
            isRTL ? 'المبيعات الصافية' : 'Net Sales',
            '$currency ${((summary['totalNetSales'] ?? 0) as num).toStringAsFixed(0)}',
            const Color(0xFF27AE60),
          ),
          _divider(),
          _summaryCell(
            isRTL ? 'إجمالي الخصم' : 'Total Discount',
            '$currency ${((summary['totalDiscount'] ?? 0) as num).toStringAsFixed(0)}',
            Colors.orange[800]!,
          ),
        ],
      ),
    );
  }

  Widget _summaryCell(String label, String value, Color valueColor) {
    return Column(
      children: [
        Text(value,
            style: TextStyle(
                fontSize: 16, fontWeight: FontWeight.bold, color: valueColor)),
        const SizedBox(height: 2),
        Text(label,
            style: const TextStyle(fontSize: 11, color: Color(0xFF7D7C7C))),
      ],
    );
  }

  Widget _divider() => Container(
      height: 32, width: 1, color: const Color(0xFFEBEBEB));

  SliverToBoxAdapter _sectionHeader(String title, Color color, IconData icon) {
    return SliverToBoxAdapter(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 20, 24, 8),
        child: Row(
          children: [
            Icon(icon, size: 18, color: color),
            const SizedBox(width: 6),
            Text(
              title,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCampaignCard(
      Map<String, dynamic> campaign, String group, bool isRTL) {
    final name    = campaign['name'] as String? ?? '';
    final type    = campaign['type'] as String? ?? '';
    final disc    = (campaign['discountPercent'] ?? 0).toDouble();
    final startAt = _formatDate(campaign['startAt'] as String?);
    final endAt   = _formatDate(campaign['endAt']   as String?);
    final impact  = campaign['impact'] as Map<String, dynamic>? ?? {};
    final dishes  = (campaign['affectedDishes'] as List?)
            ?.cast<Map<String, dynamic>>() ?? [];

    final usageCount    = (impact['usageCount']           ?? 0) as int;
    final grossSales    = (impact['grossSales']            ?? 0).toDouble();
    final discountAmt   = (impact['discountAmount']        ?? 0).toDouble();
    final netSales      = (impact['netSales']              ?? 0).toDouble();
    final ordersCount   = (impact['discountedOrdersCount'] ?? 0) as int;
    const currency = 'SAR';

    final Color accentColor = group == 'active'
        ? const Color(0xFF27AE60)
        : group == 'upcoming'
            ? const Color(0xFF2980B9)
            : Colors.grey;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 12,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Expanded(
                  child: Text(
                    name,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF2D2F2F),
                    ),
                  ),
                ),
                _typeChip(type, disc, isRTL),
              ],
            ),
            const SizedBox(height: 6),

            // Date range
            Row(
              children: [
                Icon(Icons.calendar_today_outlined,
                    size: 12, color: Colors.grey[500]),
                const SizedBox(width: 4),
                Text(
                  '$startAt → $endAt',
                  style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                ),
              ],
            ),

            // Impact stats (only if there was any activity)
            if (usageCount > 0) ...[
              const SizedBox(height: 14),
              const Divider(height: 1),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _impactCell(
                    isRTL ? 'الاستخدام' : 'Uses',
                    '$usageCount',
                    accentColor,
                  ),
                  _impactCell(
                    isRTL ? 'الطلبات' : 'Orders',
                    '$ordersCount',
                    accentColor,
                  ),
                  _impactCell(
                    isRTL ? 'الإجمالي' : 'Gross',
                    '$currency ${grossSales.toStringAsFixed(0)}',
                    accentColor,
                  ),
                  _impactCell(
                    isRTL ? 'الخصم' : 'Discount',
                    '−$currency ${discountAmt.toStringAsFixed(0)}',
                    Colors.orange[800]!,
                  ),
                  _impactCell(
                    isRTL ? 'الصافي' : 'Net',
                    '$currency ${netSales.toStringAsFixed(0)}',
                    const Color(0xFF27AE60),
                  ),
                ],
              ),
            ] else if (group != 'expired') ...[
              const SizedBox(height: 8),
              Text(
                isRTL ? 'لا يوجد استخدام بعد' : 'No usage yet',
                style: TextStyle(fontSize: 12, color: Colors.grey[500]),
              ),
            ],

            // Affected dishes
            if (dishes.isNotEmpty) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: dishes.take(5).map<Widget>((d) {
                  return Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: accentColor.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      d['name'] as String? ?? '',
                      style: TextStyle(
                          fontSize: 11,
                          color: accentColor,
                          fontWeight: FontWeight.w500),
                    ),
                  );
                }).toList(),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _typeChip(String type, double discount, bool isRTL) {
    final isCoupon = type == 'COUPON';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: isCoupon
            ? const Color(0xFF8E44AD).withValues(alpha: 0.1)
            : const Color(0xFF904800).withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        isCoupon
            ? (isRTL ? 'كوبون $discount%' : 'Coupon $discount%')
            : (isRTL ? 'خصم $discount%' : '$discount% Off'),
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.bold,
          color: isCoupon ? const Color(0xFF8E44AD) : const Color(0xFF904800),
        ),
      ),
    );
  }

  Widget _impactCell(String label, String value, Color valueColor) {
    return Column(
      children: [
        Text(value,
            style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: valueColor)),
        const SizedBox(height: 2),
        Text(label,
            style: const TextStyle(
                fontSize: 10, color: Color(0xFF7D7C7C))),
      ],
    );
  }
}
