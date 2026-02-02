import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/language_provider.dart';
import 'profile_screen.dart';
import 'addresses_screen.dart';
import 'payment_methods_screen.dart';
import 'notifications_screen.dart';
import 'about_app_screen.dart';
import 'privacy_policy_screen.dart';
import 'terms_conditions_screen.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({Key? key}) : super(key: key);

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
          isRTL ? 'الإعدادات' : 'Settings',
          style: const TextStyle(
            color: AppTheme.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildSection(
            isRTL ? 'الحساب' : 'Account',
            [
              _buildSettingItem(
                Icons.person_outline,
                isRTL ? 'الملف الشخصي' : 'Profile',
                () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const ProfileScreen()),
                  );
                },
              ),
              _buildSettingItem(
                Icons.location_on_outlined,
                isRTL ? 'العناوين' : 'Addresses',
                () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const AddressesScreen()),
                  );
                },
              ),
              _buildSettingItem(
                Icons.payment_outlined,
                isRTL ? 'طرق الدفع' : 'Payment Methods',
                () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const PaymentMethodsScreen()),
                  );
                },
              ),
            ],
          ),
          const SizedBox(height: 20),
          _buildSection(
            isRTL ? 'التفضيلات' : 'Preferences',
            [
              _buildSettingItem(
                Icons.notifications_outlined,
                isRTL ? 'الإشعارات' : 'Notifications',
                () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const NotificationsScreen()),
                  );
                },
                trailing: Switch(
                  value: true,
                  onChanged: (value) {},
                  activeTrackColor: AppTheme.accentColor,
                ),
              ),
              _buildSettingItem(
                Icons.language,
                isRTL ? 'اللغة' : 'Language',
                () {
                  languageProvider.toggleLanguage();
                },
                trailing: Text(
                  isRTL ? 'العربية' : 'English',
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppTheme.textSecondary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          _buildSection(
            isRTL ? 'معلومات' : 'Information',
            [
              _buildSettingItem(
                Icons.info_outline,
                isRTL ? 'عن التطبيق' : 'About App',
                () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const AboutAppScreen()),
                  );
                },
              ),
              _buildSettingItem(
                Icons.privacy_tip_outlined,
                isRTL ? 'سياسة الخصوصية' : 'Privacy Policy',
                () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const PrivacyPolicyScreen()),
                  );
                },
              ),
              _buildSettingItem(
                Icons.description_outlined,
                isRTL ? 'الشروط والأحكام' : 'Terms & Conditions',
                () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const TermsConditionsScreen()),
                  );
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSection(String title, List<Widget> children) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(
            title,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppTheme.textSecondary,
            ),
          ),
        ),
        Container(
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
          child: Column(children: children),
        ),
      ],
    );
  }

  Widget _buildSettingItem(
    IconData icon,
    String title,
    VoidCallback onTap, {
    Widget? trailing,
  }) {
    return ListTile(
      leading: Icon(icon, color: AppTheme.textPrimary, size: 22),
      title: Text(
        title,
        style: const TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w500,
          color: AppTheme.textPrimary,
        ),
      ),
      trailing: trailing ??
          const Icon(Icons.arrow_forward_ios, size: 14, color: AppTheme.textSecondary),
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
    );
  }
}
