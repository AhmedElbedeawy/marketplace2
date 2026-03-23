import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../config/theme.dart';
import '../../../providers/language_provider.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/app_mode_provider.dart';
import '../../../providers/navigation_provider.dart';
import '../../menu/menu_screen.dart';
import '../../orders/orders_screen.dart';

/// Tabs available in Cook Hub top slider
enum CookHubTab {
  overview,
  orders,
  menu,
  marketing,
}

/// Shared Cook Hub Shell - Provides consistent header and top slider across all Cook Hub pages
/// Based on cook_hub_overview_with_icon Stitch design
class CookHubShell extends StatelessWidget {
  final CookHubTab activeTab;
  final Widget child;

  const CookHubShell({
    Key? key,
    required this.activeTab,
    required this.child,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;

    return Scaffold(
      backgroundColor: const Color(0xFFF6F6F6),
      // Header with original mobile app actions (burger, notifications, profile)
      appBar: AppBar(
        elevation: 0,
        backgroundColor: const Color(0xFFF6F6F6),
        leading: Builder(
          builder: (context) => IconButton(
            icon: Image.asset(
              'assets/icons/Burger.png',
              width: 24,
              height: 24,
            ),
            onPressed: () => Scaffold.of(context).openDrawer(),
          ),
        ),
        title: Row(
          children: [
            const Icon(Icons.restaurant, color: Color(0xFFFCD535), size: 24),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  isRTL ? 'لوحة التحكم' : 'Cook Hub',
                  style: const TextStyle(
                    color: Color(0xFF2D2F2F),
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  isRTL ? 'أدوات الطاهي' : 'manageYourHomeKitchen',
                  style: const TextStyle(
                    fontSize: 10,
                    color: Color(0xFF757575),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          // Notifications
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
                      color: Color(0xFF2D2F2F),
                      size: 22,
                    ),
                  ),
                ),
                Positioned(
                  right: 0,
                  top: 0,
                  child: Container(
                    padding: const EdgeInsets.all(2),
                    decoration: const BoxDecoration(
                      color: Colors.red,
                      shape: BoxShape.circle,
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
          // Profile
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
            icon: const Icon(Icons.account_circle, color: Color(0xFF2D2F2F)),
            onPressed: () {},
          ),
        ],
      ),
      body: Column(
        children: [
          // Top Slider (Segmented Control)
          _buildTopSlider(context, isRTL),
          // Page Content
          Expanded(child: child),
        ],
      ),
    );
  }

  Widget _buildTopSlider(BuildContext context, bool isRTL) {
    final tabs = [
      {'en': 'Overview', 'ar': 'نظرة عامة'},
      {'en': 'Orders', 'ar': 'الطلبات'},
      {'en': 'Menu', 'ar': 'القائمة'},
      {'en': 'Marketing', 'ar': 'التسويق'},
    ];

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: List.generate(tabs.length, (index) {
            final isSelected = index == activeTab.index;
            final label = isRTL ? tabs[index]['ar']! : tabs[index]['en']!;

            return Padding(
              padding: EdgeInsets.only(
                left: isRTL ? 0 : 8,
                right: isRTL ? 8 : 0,
              ),
              child: _buildTabChip(
                context,
                label,
                isSelected,
                () => _selectTab(context, index),
              ),
            );
          }),
        ),
      ),
    );
  }

  Widget _buildTabChip(BuildContext context, String label, bool isSelected, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF333333) : const Color(0xFFE7E8E8),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: isSelected ? Colors.white : const Color(0xFF5A5C5C),
          ),
        ),
      ),
    );
  }

  void _selectTab(BuildContext context, int index) {
    final navigationProvider = context.read<NavigationProvider>();
    
    switch (index) {
      case 0: // Overview
        // Already on overview
        break;
      case 1: // Orders
        Navigator.push(
          context,
          PageRouteBuilder(
            pageBuilder: (context, animation, secondaryAnimation) => 
                const CookHubOrdersWrapper(),
            transitionDuration: Duration.zero,
            reverseTransitionDuration: Duration.zero,
          ),
        );
        break;
      case 2: // Menu
        Navigator.push(
          context,
          PageRouteBuilder(
            pageBuilder: (context, animation, secondaryAnimation) => 
                const CookHubMenuWrapper(),
            transitionDuration: Duration.zero,
            reverseTransitionDuration: Duration.zero,
          ),
        );
        break;
      case 3: // Marketing
        // TODO: Navigate to Marketing screen
        break;
    }
  }
}

/// Wrapper for Orders screen to apply Cook Hub shell
class CookHubOrdersWrapper extends StatelessWidget {
  const CookHubOrdersWrapper({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return const CookHubShell(
      activeTab: CookHubTab.orders,
      child: OrdersScreen(), // Reuse existing OrdersScreen
    );
  }
}

/// Wrapper for Menu screen to apply Cook Hub shell
class CookHubMenuWrapper extends StatelessWidget {
  const CookHubMenuWrapper({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return const CookHubShell(
      activeTab: CookHubTab.menu,
      child: CookMenuScreen(), // Reuse existing CookMenuScreen
    );
  }
}
