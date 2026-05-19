import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/language_provider.dart';
import '../../widgets/app_toggle.dart';
import 'notifications_screen.dart';
import 'about_app_screen.dart';
import 'privacy_policy_screen.dart';
import 'terms_conditions_screen.dart';

class AppSettingsScreen extends StatelessWidget {
  const AppSettingsScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
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
                      Icons.arrow_back,
                      color: AppTheme.textPrimary,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 24),
                  Expanded(
                    child: Text(
                      isRTL ? 'الإعدادات' : 'Settings',
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
              child: ListView(
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 16),
        children: [
          _buildSection(
            isRTL ? 'التفضيلات' : 'Preferences',
            [
              _buildSettingItem(
                Icons.notifications_outlined,
                isRTL ? 'الإشعارات' : 'Notifications',
                () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (context) => const NotificationsScreen()),
                  );
                },
                trailing: AppToggle(
                  value: true,
                  onChanged: (_) {},
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
                    MaterialPageRoute(
                        builder: (context) => const AboutAppScreen()),
                  );
                },
              ),
              _buildSettingItem(
                Icons.privacy_tip_outlined,
                isRTL ? 'سياسة الخصوصية' : 'Privacy Policy',
                () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (context) => const PrivacyPolicyScreen()),
                  );
                },
              ),
              _buildSettingItem(
                Icons.description_outlined,
                isRTL ? 'الشروط والأحكام' : 'Terms & Conditions',
                () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (context) => const TermsConditionsScreen()),
                  );
                },
              ),
            ],
          ),
          const SizedBox(height: 20),
          _buildDeleteAccountButton(context, isRTL),
        ],
      ),
            ),
          ],
        ),
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
          const Icon(Icons.arrow_forward_ios,
              size: 14, color: AppTheme.textSecondary),
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
    );
  }

  Widget _buildDeleteAccountButton(BuildContext context, bool isRTL) {
    return Container(
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
      child: ListTile(
        leading: const Icon(Icons.delete_forever_outlined,
            color: Colors.red, size: 22),
        title: Text(
          isRTL ? 'حذف الحساب' : 'Delete Account',
          style: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w500,
            color: Colors.red,
          ),
        ),
        trailing: const SizedBox.shrink(),
        onTap: () => _confirmDeleteAccount(context, isRTL),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      ),
    );
  }

  void _confirmDeleteAccount(BuildContext context, bool isRTL) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(isRTL ? 'حذف الحساب' : 'Delete Account'),
        content: Text(
          isRTL
              ? 'هل أنت متأكد من حذف حسابك؟ لا يمكن التراجع عن هذا الإجراء.'
              : 'Are you sure you want to delete your account? This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: Text(
              isRTL ? 'إلغاء' : 'Cancel',
              style: const TextStyle(color: Colors.grey),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            onPressed: () async {
              Navigator.pop(dialogContext);
              final auth = context.read<AuthProvider>();
              final success = await auth.deleteAccount();
              if (!context.mounted) return;
              if (success) {
                Navigator.of(context)
                    .pushNamedAndRemoveUntil('/login', (route) => false);
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      auth.error ??
                          (isRTL
                              ? 'فشل حذف الحساب'
                              : 'Failed to delete account'),
                    ),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            },
            child: Text(isRTL ? 'حذف' : 'Delete'),
          ),
        ],
      ),
    );
  }
}
