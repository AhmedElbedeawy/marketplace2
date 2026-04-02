import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../providers/language_provider.dart';
import '../providers/auth_provider.dart';
import '../screens/orders/orders_screen.dart';
import '../screens/messages/messages_screen.dart';
import '../screens/favorites/favorites_screen.dart';
import '../screens/settings/settings_screen.dart';

/// Global Navigation Drawer - Used across all app sections including Cook Hub
/// This is the ONE menu that should be used everywhere (no duplicate menus)
class GlobalNavigationDrawer extends StatelessWidget {
  const GlobalNavigationDrawer({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final authProvider = context.watch<AuthProvider>();
    final isRTL = languageProvider.isArabic;

    return Drawer(
      child: Container(
        color: Colors.white.withValues(alpha: 0.9), // 90% opacity (10% transparency)
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            // Slim header with back arrow
            Container(
              height: 90,
              padding: const EdgeInsets.only(left: 16, top: 45),
              alignment: Alignment.centerLeft,
              child: Row(
                children: [
                  IconButton(
                    icon: Icon(isRTL ? Icons.arrow_forward : Icons.arrow_back, size: 22),
                    onPressed: () => Navigator.pop(context),
                    padding: EdgeInsets.zero,
                    color: AppTheme.textPrimary,
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
            const Divider(height: 1, thickness: 1),
            const SizedBox(height: 8),
            
            // Orders History
            _buildDrawerItem(
              context,
              icon: Icons.history,
              title: isRTL ? 'سجل الطلبات' : 'Orders History',
              onTap: () {
                Navigator.pop(context);
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const OrdersScreen()),
                );
              },
            ),
            
            // Messages
            _buildDrawerItem(
              context,
              icon: Icons.message_outlined,
              title: isRTL ? 'الرسائل' : 'Messages',
              onTap: () {
                Navigator.pop(context);
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const MessagesScreen()),
                );
              },
            ),
            
            // Favorites
            _buildDrawerItem(
              context,
              icon: Icons.favorite_border,
              title: isRTL ? 'المفضلة' : 'Favorites',
              onTap: () {
                Navigator.pop(context);
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const FavoritesScreen()),
                );
              },
            ),
            
            const Divider(height: 1, thickness: 1),
            
            // Settings
            _buildDrawerItem(
              context,
              icon: Icons.settings_outlined,
              title: isRTL ? 'الإعدادات' : 'Settings',
              onTap: () {
                Navigator.pop(context);
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const SettingsScreen()),
                );
              },
            ),
            
            // Help & Support
            _buildDrawerItem(
              context,
              icon: Icons.help_outline,
              title: isRTL ? 'المساعدة والدعم' : 'Help & Support',
              onTap: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(isRTL ? 'قريباً...' : 'Coming soon...')),
                );
              },
            ),
            
            // Logout
            _buildDrawerItem(
              context,
              icon: Icons.logout,
              title: isRTL ? 'تسجيل الخروج' : 'Logout',
              isDestructive: true,
              onTap: () {
                Navigator.pop(context);
                _showLogoutDialog(context, authProvider);
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDrawerItem(
    BuildContext context, {
    required IconData icon,
    required String title,
    required VoidCallback onTap,
    bool isDestructive = false,
  }) {
    return ListTile(
      leading: Icon(
        icon,
        color: isDestructive ? const Color(0xFFE94057) : AppTheme.textPrimary,
        size: 22,
      ),
      title: Text(
        title,
        style: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: isDestructive ? const Color(0xFFE94057) : AppTheme.textPrimary,
        ),
      ),
      onTap: onTap,
    );
  }

  void _showLogoutDialog(BuildContext context, AuthProvider authProvider) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(context.watch<LanguageProvider>().isArabic ? 'تسجيل الخروج' : 'Logout'),
        content: Text(context.watch<LanguageProvider>().isArabic ? 'هل أنت متأكد؟' : 'Are you sure?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(context.watch<LanguageProvider>().isArabic ? 'إلغاء' : 'Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context); // Close dialog
              authProvider.logout(); // Perform logout
              // Navigate to login screen
              Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFE94057),
            ),
            child: Text(context.watch<LanguageProvider>().isArabic ? 'خروج' : 'Logout'),
          ),
        ],
      ),
    );
  }
}
