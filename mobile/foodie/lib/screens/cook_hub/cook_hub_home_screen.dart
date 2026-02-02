import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/language_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/app_mode_provider.dart';
import '../dashboard/dashboard_screen.dart';
import '../orders/orders_screen.dart';
import '../../screens/messages/messages_screen.dart';
import '../../screens/settings/settings_screen.dart';

class CookHubHomeScreen extends StatefulWidget {
  const CookHubHomeScreen({Key? key}) : super(key: key);

  @override
  State<CookHubHomeScreen> createState() => _CookHubHomeScreenState();
}

class _CookHubHomeScreenState extends State<CookHubHomeScreen> {
  int _selectedIndex = 0;
  final PageController _pageController = PageController();

  final List<Widget> _screens = [
    const DashboardScreen(),
    const OrdersScreen(),
    const Center(child: Text('Menu Screen - Coming Soon')),
    const MessagesScreen(),
    const SettingsScreen(),
  ];

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final authProvider = context.watch<AuthProvider>();
    final isRTL = languageProvider.isArabic;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        elevation: 1,
        backgroundColor: Colors.white,
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(Icons.menu, color: AppTheme.textPrimary),
            onPressed: () => Scaffold.of(context).openDrawer(),
          ),
        ),
        title: Row(
          children: [
            const Icon(Icons.restaurant, color: AppTheme.accentColor, size: 24),
            const SizedBox(width: 8),
            Text(
              isRTL ? 'لوحة التحكم' : 'Cook Hub',
              style: const TextStyle(
                color: AppTheme.textPrimary,
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: Stack(
              children: [
                Padding(
                  padding: const EdgeInsets.all(8),
                  child: Image.asset(
                    'assets/icons/notifications.png',
                    width: 24,
                    height: 24,
                    fit: BoxFit.contain,
                    errorBuilder: (_, __, ___) => const Icon(
                      Icons.notifications_none,
                      color: AppTheme.textPrimary,
                      size: 22,
                    ),
                  ),
                ),
                Positioned(
                  right: 0,
                  top: 0,
                  child: Container(
                    padding: const EdgeInsets.all(2),
                    decoration: BoxDecoration(
                      color: Colors.red,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    constraints: const BoxConstraints(
                      minWidth: 12,
                      minHeight: 12,
                    ),
                    child: const Text(
                      '3',
                      style: TextStyle(color: Colors.white, fontSize: 8),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
              ],
            ),
            onPressed: () {},
          ),
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
            decoration: BoxDecoration(
              border: Border.all(color: const Color(0xFFE5E7EB), width: 2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: InkWell(
              onTap: () => languageProvider.toggleLanguage(),
              borderRadius: BorderRadius.circular(8),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                child: Text(
                  languageProvider.isArabic ? 'AR' : 'EN',
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                    color: AppTheme.textPrimary,
                  ),
                ),
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.account_circle, color: AppTheme.textPrimary),
            onPressed: () {},
          ),
        ],
      ),
      drawer: CookHubDrawer(
        isRTL: isRTL,
        currentIndex: _selectedIndex,
        onItemTap: (index) {
          setState(() {
            _selectedIndex = index;
          });
          _pageController.jumpToPage(index);
          Navigator.pop(context);
        },
        onLogout: () {
          authProvider.logout();
          Navigator.of(context).pushReplacementNamed('/login');
        },
      ),
      body: PageView(
        controller: _pageController,
        physics: const NeverScrollableScrollPhysics(),
        onPageChanged: (index) {
          setState(() {
            _selectedIndex = index;
          });
        },
        children: _screens,
      ),
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        currentIndex: _selectedIndex,
        selectedItemColor: AppTheme.accentColor,
        unselectedItemColor: AppTheme.textSecondary,
        selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
        unselectedLabelStyle: const TextStyle(fontSize: 12),
        onTap: (index) {
          setState(() {
            _selectedIndex = index;
          });
          _pageController.jumpToPage(index);
        },
        items: [
          BottomNavigationBarItem(
            icon: const Icon(Icons.dashboard_outlined),
            activeIcon: const Icon(Icons.dashboard),
            label: isRTL ? 'نظرة عامة' : 'Overview',
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.shopping_cart_outlined),
            activeIcon: const Icon(Icons.shopping_cart),
            label: isRTL ? 'الطلبات' : 'Orders',
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.restaurant_menu_outlined),
            activeIcon: const Icon(Icons.restaurant_menu),
            label: isRTL ? 'القائمة' : 'Menu',
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.message_outlined),
            activeIcon: const Icon(Icons.message),
            label: isRTL ? 'الرسائل' : 'Messages',
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.settings_outlined),
            activeIcon: const Icon(Icons.settings),
            label: isRTL ? 'الإعدادات' : 'Settings',
          ),
        ],
      ),
    );
  }
}

class CookHubDrawer extends StatelessWidget {
  final bool isRTL;
  final int currentIndex;
  final Function(int) onItemTap;
  final VoidCallback onLogout;

  const CookHubDrawer({
    Key? key,
    required this.isRTL,
    required this.currentIndex,
    required this.onItemTap,
    required this.onLogout,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final appModeProvider = context.watch<AppModeProvider>();

    return Drawer(
      child: Container(
        color: AppTheme.primaryColor,
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            Container(
              height: 180,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    AppTheme.accentColor.withValues(alpha: 0.8),
                    AppTheme.accentColor,
                  ],
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  const CircleAvatar(
                    radius: 30,
                    backgroundColor: Colors.white,
                    child: Icon(Icons.restaurant, size: 30, color: AppTheme.accentColor),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    isRTL ? 'لوحة تحكم الطاهي' : 'Cook Dashboard',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            _buildDrawerItem(
              context,
              icon: Icons.dashboard_outlined,
              title: isRTL ? 'نظرة عامة' : 'Dashboard',
              index: 0,
            ),
            _buildDrawerItem(
              context,
              icon: Icons.shopping_cart_outlined,
              title: isRTL ? 'الطلبات' : 'Orders',
              index: 1,
            ),
            _buildDrawerItem(
              context,
              icon: Icons.restaurant_menu_outlined,
              title: isRTL ? 'القائمة' : 'Menu',
              index: 2,
            ),
            _buildDrawerItem(
              context,
              icon: Icons.message_outlined,
              title: isRTL ? 'الرسائل' : 'Messages',
              index: 3,
            ),
            _buildDrawerItem(
              context,
              icon: Icons.settings_outlined,
              title: isRTL ? 'الإعدادات' : 'Settings',
              index: 4,
            ),
            const Divider(color: Colors.white30, height: 32, thickness: 1),
            ListTile(
              leading: const Icon(Icons.swap_horiz, color: Colors.white),
              title: Text(
                isRTL ? 'التحويل إلى Foodie' : 'Switch to Foodie View',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                ),
              ),
              onTap: () {
                Navigator.pop(context);
                appModeProvider.switchToFoodie();
              },
            ),
            ListTile(
              leading: const Icon(Icons.logout, color: Colors.white),
              title: Text(
                isRTL ? 'تسجيل الخروج' : 'Log Out',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                ),
              ),
              onTap: onLogout,
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
    required int index,
  }) {
    final isSelected = currentIndex == index;
    
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: isSelected ? AppTheme.accentColor.withValues(alpha: 0.2) : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
      ),
      child: ListTile(
        leading: Icon(
          icon,
          color: isSelected ? AppTheme.accentColor : Colors.white,
        ),
        title: Text(
          title,
          style: TextStyle(
            color: isSelected ? AppTheme.accentColor : Colors.white,
            fontSize: 15,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
          ),
        ),
        onTap: () => onItemTap(index),
      ),
    );
  }
}
