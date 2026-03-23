import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/language_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/app_mode_provider.dart';
import 'widgets/cook_hub_shell.dart';

/// Cook Hub Overview Screen - Master Cook Hub page with dashboard stats
class CookHubOverviewScreen extends StatelessWidget {
  const CookHubOverviewScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return const CookHubShell(
      activeTab: CookHubTab.overview,
      child: CookHubOverviewContent(),
    );
  }
}

/// Content for Cook Hub Overview - Dashboard stats and KPIs
class CookHubOverviewContent extends StatelessWidget {
  const CookHubOverviewContent({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Sales Card (Full Width)
          _buildSalesCard(isRTL),
          const SizedBox(height: 16),

          // Stats Grid
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.4,
            children: [
              _buildStatCard(
                isRTL ? 'إجمالي الطلبات' : 'Total Orders',
                '1,247',
                isRTL ? '٨٥٦ تم التوصيل' : '856 Delivered',
                Icons.receipt_long,
              ),
              _buildStatCard(
                isRTL ? 'قيد التحضير' : 'In Kitchen',
                '98',
                isRTL ? 'طلبات قيد التحضير' : 'Orders being prepared',
                Icons.restaurant,
              ),
              _buildStatCard(
                isRTL ? 'في الانتظار' : 'Pending',
                '142',
                isRTL ? 'في انتظار الاستلام' : 'Awaiting pickup',
                Icons.pending_actions,
              ),
              _buildStatCard(
                isRTL ? 'القوائم النشطة' : 'Active Listings',
                '45',
                '',
                Icons.restaurant_menu,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSalesCard(bool isRTL) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(32),
        border: Border.all(
          color: const Color(0xFFACADAD).withOpacity(0.15),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                isRTL ? 'المبيعات' : 'Sales',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF757575),
                  letterSpacing: 0.5,
                ),
              ),
              Row(
                children: [
                  _buildPeriodChip('TODAY', false),
                  const SizedBox(width: 8),
                  _buildPeriodChip('7 DAYS', true),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Total Sales Value
          const Text(
            'SAR 22,300',
            style: TextStyle(
              fontSize: 36,
              fontWeight: FontWeight.w800,
              color: Color(0xFFF68A2F),
            ),
          ),
          // Chart placeholder
          const SizedBox(height: 24),
          Container(
            height: 112,
            decoration: BoxDecoration(
              color: const Color(0xFFF6F6F6).withOpacity(0.5),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Center(
              child: Text(
                isRTL ? 'الرسم البياني للمبيعات' : 'Sales Chart',
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF9E9E9E),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPeriodChip(String label, bool isSelected) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: isSelected ? const Color(0xFF904800) : Colors.transparent,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          color: isSelected ? Colors.white : const Color(0xFFBDBDBD),
        ),
      ),
    );
  }

  Widget _buildStatCard(String title, String value, String subtitle, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(32),
        border: Border.all(
          color: const Color(0xFFACADAD).withOpacity(0.15),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Icon
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: const Color(0xFFF6F6F6),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, color: const Color(0xFF757575), size: 24),
          ),
          const Spacer(),
          // Title
          Text(
            title,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: Color(0xFF757575),
            ),
          ),
          const SizedBox(height: 4),
          // Value
          Text(
            value,
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w800,
              color: Color(0xFF2D2F2F),
            ),
          ),
          if (subtitle.isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: const TextStyle(
                fontSize: 9,
                fontWeight: FontWeight.w700,
                color: Color(0xFF9E9E9E),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
