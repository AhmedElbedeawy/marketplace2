import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/language_provider.dart';
import '../../providers/country_provider.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Page Title
            Text(
              isRTL ? 'نظرة عامة على الأداء' : 'Performance Overview',
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w700,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              isRTL
                  ? 'تتبع مبيعاتك وأداء مطبخك في لمحة سريعة 📊'
                  : 'Track your sales and kitchen performance at a glance 📊',
              style: const TextStyle(
                fontSize: 14,
                color: AppTheme.textSecondary,
              ),
            ),
            const SizedBox(height: 24),
            
            // Stats Cards
            _buildStatsCard(
              isRTL ? 'إجمالي المبيعات' : 'Total Sales',
              '${context.watch<CountryProvider>().currencyCode} 22,300',
              isRTL ? '+12.5% من الشهر الماضي' : '+12.5% from last month',
              Icons.trending_up,
              AppTheme.accentColor,
            ),
            const SizedBox(height: 12),
            _buildStatsCard(
              isRTL ? 'الطلبات' : 'Orders',
              '1,247',
              isRTL ? '856 تم التوصيل' : '856 Delivered',
              Icons.shopping_cart,
              AppTheme.successColor,
            ),
            const SizedBox(height: 12),
            _buildStatsCard(
              isRTL ? 'القوائم النشطة' : 'Active Listings',
              '45',
              isRTL ? '18 طبق تقليدي' : '18 Traditional Dishes',
              Icons.restaurant_menu,
              const Color(0xFF3B82F6),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsCard(
    String title,
    String value,
    String subtitle,
    IconData icon,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
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
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 28),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppTheme.textSecondary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                    color: color,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppTheme.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
