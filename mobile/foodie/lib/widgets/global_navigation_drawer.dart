import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../providers/language_provider.dart';
import '../providers/auth_provider.dart';
import '../providers/country_provider.dart';
import '../screens/orders/orders_screen.dart';
import '../screens/messages/messages_screen.dart';
import '../screens/settings/app_settings_screen.dart';

/// Global Navigation Drawer - Used across all app sections including Cook Hub
class GlobalNavigationDrawer extends StatelessWidget {
  const GlobalNavigationDrawer({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final authProvider = context.watch<AuthProvider>();
    final countryProvider = context.watch<CountryProvider>();
    final isRTL = languageProvider.isArabic;

    return Drawer(
      backgroundColor: const Color(0xFFF5F5F7),
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 8, 16, 4),
              child: Row(
                children: [
                  IconButton(
                    icon: Icon(
                      isRTL ? Icons.arrow_forward : Icons.arrow_back,
                      size: 22,
                      color: AppTheme.textPrimary,
                    ),
                    onPressed: () => Navigator.pop(context),
                    padding: EdgeInsets.zero,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    isRTL ? 'القائمة' : 'Menu',
                    style: const TextStyle(
                      fontSize: 19,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),

            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: [
                  // ── Quick Access ──────────────────────────────────
                  _sectionLabel(isRTL ? 'وصول سريع' : 'Quick Access'),
                  _buildGroup([
                    _buildItem(
                      context,
                      icon: Icons.history,
                      title: isRTL ? 'سجل الطلبات' : 'Orders History',
                      onTap: () {
                        Navigator.pop(context);
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (context) => const OrdersScreen()),
                        );
                      },
                    ),
                    _divider(),
                    _buildItem(
                      context,
                      icon: Icons.message_outlined,
                      title: isRTL ? 'الرسائل' : 'Messages',
                      onTap: () {
                        Navigator.pop(context);
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (context) => const MessagesScreen()),
                        );
                      },
                    ),
                    _divider(),
                    _buildItem(
                      context,
                      icon: Icons.help_outline,
                      title: isRTL ? 'المساعدة' : 'Help',
                      onTap: () {
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                              content: Text(
                                  isRTL ? 'قريباً...' : 'Coming soon...')),
                        );
                      },
                    ),
                  ]),
                  const SizedBox(height: 20),

                  // ── App Preferences ───────────────────────────────
                  _sectionLabel(
                      isRTL ? 'تفضيلات التطبيق' : 'App Preferences'),
                  _buildGroup([
                    _buildItem(
                      context,
                      icon: Icons.language,
                      title: isRTL ? 'اللغة' : 'Language',
                      trailing: Text(
                        isRTL ? 'العربية' : 'English',
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                      onTap: () => languageProvider.toggleLanguage(),
                    ),
                    _divider(),
                    _buildItem(
                      context,
                      icon: Icons.flag_outlined,
                      title: isRTL ? 'الدولة' : 'Country',
                      trailing: Text(
                        countryProvider.countryCode,
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                      onTap: () {},
                    ),
                    _divider(),
                    _buildItem(
                      context,
                      icon: Icons.settings_outlined,
                      title: isRTL ? 'الإعدادات' : 'Settings',
                      onTap: () {
                        Navigator.pop(context);
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (context) =>
                                  const AppSettingsScreen()),
                        );
                      },
                    ),
                  ]),
                  const SizedBox(height: 20),

                  // ── Account Action ────────────────────────────────
                  _sectionLabel(
                      isRTL ? 'إجراءات الحساب' : 'Account Action'),
                  _buildGroup([
                    _buildItem(
                      context,
                      icon: Icons.logout,
                      title: isRTL ? 'تسجيل الخروج' : 'Log out',
                      isDestructive: true,
                      onTap: () {
                        Navigator.pop(context);
                        _showLogoutDialog(context, authProvider);
                      },
                    ),
                  ]),
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _sectionLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 8),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: AppTheme.textSecondary,
          letterSpacing: 0.4,
        ),
      ),
    );
  }

  Widget _buildGroup(List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(children: children),
    );
  }

  Widget _divider() {
    return const Divider(
      height: 1,
      thickness: 0.5,
      indent: 52,
      endIndent: 0,
      color: Color(0xFFE5E7EB),
    );
  }

  Widget _buildItem(
    BuildContext context, {
    required IconData icon,
    required String title,
    required VoidCallback onTap,
    Widget? trailing,
    bool isDestructive = false,
  }) {
    final color = isDestructive ? const Color(0xFFE94057) : AppTheme.textPrimary;
    return ListTile(
      leading: Icon(icon, color: color, size: 22),
      title: Text(
        title,
        style: TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w500,
          color: color,
        ),
      ),
      trailing: trailing ??
          (isDestructive
              ? null
              : const Icon(Icons.arrow_forward_ios,
                  size: 13, color: AppTheme.textSecondary)),
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
      minLeadingWidth: 20,
    );
  }

  void _showLogoutDialog(BuildContext context, AuthProvider authProvider) {
    final isRTL = context.read<LanguageProvider>().isArabic;
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(isRTL ? 'تسجيل الخروج' : 'Log out'),
        content: Text(isRTL ? 'هل أنت متأكد؟' : 'Are you sure?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(isRTL ? 'إلغاء' : 'Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              authProvider.logout();
              Navigator.of(context).pushNamedAndRemoveUntil(
                  '/login', (route) => false);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFE94057),
            ),
            child: Text(isRTL ? 'خروج' : 'Log out'),
          ),
        ],
      ),
    );
  }
}
