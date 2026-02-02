import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/language_provider.dart';

class TermsConditionsScreen extends StatelessWidget {
  const TermsConditionsScreen({Key? key}) : super(key: key);

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
          isRTL ? 'الشروط والأحكام' : 'Terms & Conditions',
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
                isRTL ? '1. قبول الشروط' : '1. Acceptance of Terms',
                isRTL
                    ? 'باستخدام تطبيق Foodie، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على هذه الشروط، يرجى عدم استخدام التطبيق.'
                    : 'By using the Foodie app, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the app.',
              ),
              _buildSection(
                isRTL ? '2. استخدام الخدمة' : '2. Use of Service',
                isRTL
                    ? 'يجب عليك:\n\n• تقديم معلومات دقيقة وكاملة\n• الحفاظ على أمان حسابك\n• عدم استخدام الخدمة لأغراض غير قانونية\n• احترام حقوق الملكية الفكرية\n• عدم التدخل في تشغيل التطبيق'
                    : 'You must:\n\n• Provide accurate and complete information\n• Maintain the security of your account\n• Not use the service for illegal purposes\n• Respect intellectual property rights\n• Not interfere with the app\'s operation',
              ),
              _buildSection(
                isRTL ? '3. الطلبات والدفع' : '3. Orders and Payment',
                isRTL
                    ? '• جميع الطلبات تخضع للتوفر والتأكيد\n• الأسعار قابلة للتغيير دون إشعار مسبق\n• أنت مسؤول عن جميع الرسوم المرتبطة بطلبك\n• يمكن إلغاء الطلبات وفقًا لسياسة الإلغاء\n• المبالغ المستردة تُعالج حسب سياسة الاسترداد'
                    : '• All orders are subject to availability and confirmation\n• Prices are subject to change without notice\n• You are responsible for all charges associated with your order\n• Orders can be cancelled per the cancellation policy\n• Refunds are processed according to the refund policy',
              ),
              _buildSection(
                isRTL ? '4. مسؤولية الطهاة' : '4. Cook Responsibility',
                isRTL
                    ? 'الطهاة مسؤولون عن:\n\n• جودة ونظافة الطعام\n• الامتثال لمعايير سلامة الأغذية\n• التسليم في الوقت المحدد\n• الوصف الدقيق للوجبات\n• معالجة شكاوى العملاء'
                    : 'Cooks are responsible for:\n\n• Food quality and hygiene\n• Compliance with food safety standards\n• Timely delivery\n• Accurate description of meals\n• Handling customer complaints',
              ),
              _buildSection(
                isRTL ? '5. الإلغاء والاسترداد' : '5. Cancellation and Refunds',
                isRTL
                    ? '• يمكن للعملاء إلغاء الطلبات قبل قبول الطاهي\n• بمجرد قبول الطلب، قد تُطبق رسوم الإلغاء\n• تُعالج المبالغ المستردة في غضون 5-7 أيام عمل\n• في حالة وجود مشاكل في الجودة، اتصل بالدعم فورًا\n• القرار النهائي بشأن المبالغ المستردة يعود لـ Foodie'
                    : '• Customers can cancel orders before cook acceptance\n• Once accepted, cancellation fees may apply\n• Refunds are processed within 5-7 business days\n• For quality issues, contact support immediately\n• Final refund decision rests with Foodie',
              ),
              _buildSection(
                isRTL ? '6. إخلاء المسؤولية' : '6. Disclaimer',
                isRTL
                    ? 'Foodie هي منصة تربط بين الطهاة والعملاء. نحن لسنا مسؤولين عن:\n\n• جودة أو سلامة الطعام المُعد من قبل الطهاة\n• الحساسية الغذائية أو ردود الفعل\n• التأخير في التسليم خارج نطاق سيطرتنا\n• النزاعات بين العملاء والطهاة'
                    : 'Foodie is a platform connecting cooks and customers. We are not responsible for:\n\n• Quality or safety of food prepared by cooks\n• Food allergies or reactions\n• Delivery delays beyond our control\n• Disputes between customers and cooks',
              ),
              _buildSection(
                isRTL ? '7. التغييرات على الشروط' : '7. Changes to Terms',
                isRTL
                    ? 'نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سيتم إخطارك بالتغييرات الجوهرية. استمرارك في استخدام التطبيق بعد التغييرات يعني قبولك للشروط الجديدة.'
                    : 'We reserve the right to modify these terms at any time. You will be notified of significant changes. Your continued use of the app after changes means acceptance of the new terms.',
              ),
              _buildSection(
                isRTL ? '8. اتصل بنا' : '8. Contact Us',
                isRTL
                    ? 'للأسئلة حول هذه الشروط، اتصل بنا على:\n\nالبريد الإلكتروني: legal@foodie.com\nالهاتف: 4567 123 11 966+'
                    : 'For questions about these terms, contact us at:\n\nEmail: legal@foodie.com\nPhone: +966 11 123 4567',
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
