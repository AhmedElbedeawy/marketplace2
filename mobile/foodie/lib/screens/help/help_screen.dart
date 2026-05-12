import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/language_provider.dart';
import 'support_messages_screen.dart';

class HelpScreen extends StatelessWidget {
  const HelpScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Inline header — no AppBar ─────────────────────────────────
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
                  Text(
                    isRTL ? 'المساعدة' : 'Help',
                    style: const TextStyle(
                      color: AppTheme.textPrimary,
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      height: 1.2,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),

            // ── Content ───────────────────────────────────────────────────
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
                children: [
                  _buildHelpSection(
                    isRTL,
                    isRTL ? 'كيف أطلب؟' : 'How to Order?',
                    isRTL
                        ? 'تصفح الأطباق المتاحة، أضف إلى السلة، واطلب من طاهٍ من اختيارك.'
                        : 'Browse available dishes, add to cart, and order from a cook of your choice.',
                  ),
                  _buildHelpSection(
                    isRTL,
                    isRTL ? 'الدفع والتوصيل' : 'Payment & Delivery',
                    isRTL
                        ? 'ندعم جميع طرق الدفع. التوصيل متاح في جميع أنحاء المدينة.'
                        : 'We support all payment methods. Delivery is available throughout the city.',
                  ),
                  _buildHelpSection(
                    isRTL,
                    isRTL ? 'تتبع الطلب' : 'Order Tracking',
                    isRTL
                        ? 'تتبع طلبك في الوقت الفعلي من لحظة تأكيده حتى التوصيل.'
                        : 'Track your order in real-time from confirmation to delivery.',
                  ),
                  _buildHelpSection(
                    isRTL,
                    isRTL ? 'اتصل بنا' : 'Contact Us',
                    isRTL
                        ? 'تحتاج للمساعدة؟ تواصل معنا عبر الرسائل أو البريد الإلكتروني.'
                        : 'Need help? Reach out to us via messages or email.',
                  ),
                  const SizedBox(height: 24),
                  // ── Contact Support button ─────────────────────────────
                  Center(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const SupportMessagesScreen(),
                          ),
                        );
                      },
                      icon: const Icon(Icons.support_agent, size: 20),
                      label: Text(
                        isRTL ? 'تواصل مع الدعم' : 'Contact Support',
                        style: const TextStyle(
                            fontSize: 14, fontWeight: FontWeight.w600),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.accentColor,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 32, vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(24),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHelpSection(bool isRTL, String title, String description) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            description,
            style: const TextStyle(
              fontSize: 14,
              color: AppTheme.textSecondary,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}
