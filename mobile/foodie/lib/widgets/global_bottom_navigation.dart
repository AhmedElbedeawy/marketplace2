import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/language_provider.dart';
import '../providers/navigation_provider.dart';
import '../screens/menu/menu_screen.dart';
import '../screens/cart/cart_screen.dart';
import '../screens/favorites/favorites_screen.dart';

class GlobalBottomNavigation extends StatelessWidget {
  const GlobalBottomNavigation({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final navigationProvider = context.watch<NavigationProvider>();
    final isRTL = languageProvider.isArabic;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.9),
        border: const Border(
          top: BorderSide(
            color: Color(0xFF969494),
            width: 1,
          ),
        ),
      ),
      child: SafeArea(
        child: Container(
          height: 70,
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildNavItem(
                context: context,
                tab: NavigationTab.home,
                imagePath: 'assets/navigation/home.png',
                label: isRTL ? 'الرئيسية' : 'Home',
                isActive: navigationProvider.activeTab == NavigationTab.home,
                navigationProvider: navigationProvider,
              ),
              _buildNavItem(
                context: context,
                tab: NavigationTab.menu,
                imagePath: 'assets/navigation/menu.png',
                label: isRTL ? 'القائمة' : 'Menu',
                isActive: navigationProvider.activeTab == NavigationTab.menu,
                navigationProvider: navigationProvider,
              ),
              _buildNavItem(
                context: context,
                tab: NavigationTab.favorite,
                imagePath: 'assets/navigation/favorite.png',
                label: isRTL ? 'المفضلة' : 'Favorite',
                isActive: navigationProvider.activeTab == NavigationTab.favorite,
                navigationProvider: navigationProvider,
              ),
              _buildNavItem(
                context: context,
                tab: NavigationTab.cart,
                imagePath: 'assets/navigation/cart.png',
                label: isRTL ? 'السلة' : 'Cart',
                isActive: navigationProvider.activeTab == NavigationTab.cart,
                navigationProvider: navigationProvider,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required BuildContext context,
    required NavigationTab tab,
    required String imagePath,
    required String label,
    required bool isActive,
    required NavigationProvider navigationProvider,
  }) {
    return GestureDetector(
      onTap: () => _handleNavTap(context, tab, navigationProvider),
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 35,
              height: 35,
              decoration: BoxDecoration(
                color: isActive ? const Color(0xFFFCD535) : Colors.transparent,
                borderRadius: BorderRadius.circular(7),
              ),
              alignment: Alignment.center,
              child: ColorFiltered(
                colorFilter: ColorFilter.mode(
                  isActive ? Colors.white : const Color(0xFF969494),
                  BlendMode.srcIn,
                ),
                child: Image.asset(
                  imagePath,
                  width: 22,
                  height: 22,
                  fit: BoxFit.contain,
                ),
              ),
            ),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
                color: isActive ? const Color(0xFFFCD535) : const Color(0xFF969494),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _handleNavTap(BuildContext context, NavigationTab tab, NavigationProvider navigationProvider) {
    // If tapping the current tab, do nothing
    if (navigationProvider.activeTab == tab) {
      return;
    }

    // Update the active tab and set as origin
    navigationProvider.setActiveTab(tab, setAsOrigin: true);

    // Navigate based on the tab
    switch (tab) {
      case NavigationTab.home:
        // Pop until we reach the home screen
        Navigator.of(context).popUntil((route) => route.isFirst);
        break;
        
      case NavigationTab.menu:
        // Navigate to menu screen
        Navigator.of(context).popUntil((route) => route.isFirst);
        Navigator.push(
          context,
          PageRouteBuilder(
            pageBuilder: (context, animation, secondaryAnimation) => const MenuScreen(),
            transitionDuration: Duration.zero,
            reverseTransitionDuration: Duration.zero,
          ),
        ).then((_) {
          // Reset to home if user pops back
          if (navigationProvider.activeTab == NavigationTab.menu) {
            navigationProvider.resetToHome();
          }
        });
        break;
        
      case NavigationTab.favorite:
        // Navigate to favorites screen
        Navigator.of(context).popUntil((route) => route.isFirst);
        Navigator.push(
          context,
          PageRouteBuilder(
            pageBuilder: (context, animation, secondaryAnimation) => const FavoritesScreen(),
            transitionDuration: Duration.zero,
            reverseTransitionDuration: Duration.zero,
          ),
        ).then((_) {
          // Reset to home if user pops back
          if (navigationProvider.activeTab == NavigationTab.favorite) {
            navigationProvider.resetToHome();
          }
        });
        break;
        
      case NavigationTab.cart:
        // Navigate to cart screen
        Navigator.of(context).popUntil((route) => route.isFirst);
        Navigator.push(
          context,
          PageRouteBuilder(
            pageBuilder: (context, animation, secondaryAnimation) => const CartScreen(),
            transitionDuration: Duration.zero,
            reverseTransitionDuration: Duration.zero,
          ),
        ).then((_) {
          // Reset to home if user pops back
          if (navigationProvider.activeTab == NavigationTab.cart) {
            navigationProvider.resetToHome();
          }
        });
        break;
        
      case NavigationTab.none:
        // Do nothing
        break;
    }
  }
}