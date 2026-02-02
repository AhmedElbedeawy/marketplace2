import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/language_provider.dart';

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.white,
        leading: IconButton(
          icon: Icon(
            isRTL ? Icons.arrow_forward : Icons.arrow_back,
            color: AppTheme.textPrimary,
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          isRTL ? 'سياسة الخصوصية' : 'Privacy Policy',
          style: const TextStyle(
            color: AppTheme.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Container(
          padding: const EdgeInsets.all(20),
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
                isRTL ? 'آخر تحديث: 15 نوفمبر 2025' : 'Last Updated: November 15, 2025',
                style: const TextStyle(
                  fontSize: 12,
                  color: AppTheme.textSecondary,
                ),
              ),
              const SizedBox(height: 20),
              _buildSection(
                isRTL ? '1. المقدمة' : '1. Introduction',
                isRTL
                    ? 'نحن نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية. توضح سياسة الخصوصية هذه كيفية جمع معلوماتك الشخصية واستخدامها ومشاركتها وحمايتها عند استخدام تطبيق Foodie.'
                    : 'We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, share, and protect your personal information when you use the Foodie app.',
              ),
              _buildSection(
                isRTL ? '2. المعلومات التي نجمعها' : '2. Information We Collect',
                isRTL
                    ? 'نقوم بجمع معلومات مختلفة لتوفير خدماتنا وتحسينها:\n\n• معلومات الحساب (الاسم، البريد الإلكتروني، رقم الهاتف)\n• معلومات الطلب (تفاصيل الطلب، عنوان التسليم)\n• معلومات الدفع (محفوظة بشكل آمن من خلال معالجي الدفع)\n• بيانات الاستخدام (كيفية تفاعلك مع التطبيق)'
                    : 'We collect various information to provide and improve our services:\n\n• Account Information (name, email, phone number)\n• Order Information (order details, delivery address)\n• Payment Information (securely stored through payment processors)\n• Usage Data (how you interact with the app)',
              ),
              _buildSection(
                isRTL ? '3. كيفية استخدام معلوماتك' : '3. How We Use Your Information',
                isRTL
                    ? 'نستخدم معلوماتك من أجل:\n\n• معالجة وتنفيذ طلباتك\n• تحسين خدماتنا وتجربة المستخدم\n• التواصل معك بشأن الطلبات والعروض\n• منع الاحتيال وضمان الأمان\n• الامتثال للالتزامات القانونية'
                    : 'We use your information to:\n\n• Process and fulfill your orders\n• Improve our services and user experience\n• Communicate with you about orders and offers\n• Prevent fraud and ensure security\n• Comply with legal obligations',
              ),
              _buildSection(
                isRTL ? '4. مشاركة المعلومات' : '4. Information Sharing',
                isRTL
                    ? 'نحن لا نبيع معلوماتك الشخصية. قد نشارك معلوماتك مع:\n\n• الطهاة لتنفيذ طلباتك\n• مقدمي خدمات الدفع لمعالجة المعاملات\n• مقدمي الخدمات الذين يساعدوننا في العمليات\n• السلطات القانونية عند الاقتضاء'
                    : 'We do not sell your personal information. We may share your information with:\n\n• Cooks to fulfill your orders\n• Payment service providers to process transactions\n• Service providers who assist in operations\n• Legal authorities when required',
              ),
              _buildSection(
                isRTL ? '5. أمن البيانات' : '5. Data Security',
                isRTL
                    ? 'نستخدم تدابير أمنية مناسبة لحماية معلوماتك الشخصية من الوصول غير المصرح به أو التعديل أو الكشف أو التدمير. ومع ذلك، لا يوجد نظام آمن تمامًا.'
                    : 'We use appropriate security measures to protect your personal information from unauthorized access, modification, disclosure, or destruction. However, no system is completely secure.',
              ),
              _buildSection(
                isRTL ? '6. حقوقك' : '6. Your Rights',
                isRTL
                    ? 'لديك الحق في:\n\n• الوصول إلى بياناتك الشخصية\n• تصحيح المعلومات غير الدقيقة\n• طلب حذف بياناتك\n• الاعتراض على معالجة معينة\n• سحب الموافقة في أي وقت'
                    : 'You have the right to:\n\n• Access your personal data\n• Correct inaccurate information\n• Request deletion of your data\n• Object to certain processing\n• Withdraw consent at any time',
              ),
              _buildSection(
                isRTL ? '7. اتصل بنا' : '7. Contact Us',
                isRTL
                    ? 'إذا كان لديك أي أسئلة حول سياسة الخصوصية هذه، يرجى الاتصال بنا على:\n\nالبريد الإلكتروني: privacy@foodie.com\nالهاتف: 4567 123 11 966+'
                    : 'If you have any questions about this privacy policy, please contact us at:\n\nEmail: privacy@foodie.com\nPhone: +966 11 123 4567',
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSection(String title, String content) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
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
            content,
            style: const TextStyle(
              fontSize: 14,
              color: AppTheme.textSecondary,
              height: 1.6,
            ),
          ),
        ],
      ),
    );
  }
}
