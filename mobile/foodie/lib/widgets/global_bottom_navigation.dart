import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/language_provider.dart';
import '../providers/navigation_provider.dart';
import '../providers/cart_provider.dart';
import '../providers/auth_provider.dart';
import '../screens/menu/menu_screen.dart';
import '../screens/cart/cart_screen.dart';
import '../screens/favorites/favorites_screen.dart';
import '../screens/cook_hub/dashboard_screen.dart';

class GlobalBottomNavigation extends StatelessWidget {
  const GlobalBottomNavigation({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final navigationProvider = context.watch<NavigationProvider>();
    final cart = context.watch<CartProvider>();
    final authProvider = context.watch<AuthProvider>();
    
    // Check if user is an active cook
    final user = authProvider.user;
    final isActiveCook = user?.roleCookStatus != null && user?.roleCookStatus == 'active';

    return Container(
      decoration: BoxDecoration(
        image: DecorationImage(
          image: AssetImage(
            isActiveCook ? 'assets/navigation/NavC.png' : 'assets/navigation/NavF.png',
          ),
          fit: BoxFit.fill,
          colorFilter: ColorFilter.mode(
            Colors.white.withValues(alpha: 1.0),
            BlendMode.modulate,
          ),
        ),
      ),
      child: SafeArea(
        maintainBottomViewPadding: true,
        child: Container(
          height: 95,
          padding: const EdgeInsets.fromLTRB(12, 0, 12, 16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              // Slot 1: Home
              Expanded(
                flex: 1,
                child: Center(
                  child: _buildStandardNavItem(
                    context: context,
                    tab: NavigationTab.home,
                    imagePath: navigationProvider.activeTab == NavigationTab.home 
                        ? 'navigation/homeA.png' 
                        : 'navigation/home.png',
                    label: languageProvider.isArabic ? 'الرئيسية' : 'Home',
                    isActive: navigationProvider.activeTab == NavigationTab.home,
                    navigationProvider: navigationProvider,
                  ),
                ),
              ),
              // Slot 2: Menu
              Expanded(
                flex: 1,
                child: Center(
                  child: _buildStandardNavItem(
                    context: context,
                    tab: NavigationTab.menu,
                    imagePath: navigationProvider.activeTab == NavigationTab.menu 
                        ? 'navigation/MenuA.png' 
                        : 'navigation/menu.png',
                    label: languageProvider.isArabic ? 'القائمة' : 'Menu',
                    isActive: navigationProvider.activeTab == NavigationTab.menu,
                    navigationProvider: navigationProvider,
                  ),
                ),
              ),
              // Slot 3: Cook Hub (true center, only for active cooks)
              Expanded(
                flex: 1,
                child: Center(
                  child: isActiveCook
                      ? _buildCookHubItem(
                          context: context,
                          isActive: navigationProvider.activeTab == NavigationTab.cookHub,
                          navigationProvider: navigationProvider,
                          languageProvider: languageProvider,
                        )
                      : const SizedBox.shrink(),
                ),
              ),
              // Slot 4: Favorites
              Expanded(
                flex: 1,
                child: Center(
                  child: _buildStandardNavItem(
                    context: context,
                    tab: NavigationTab.favorite,
                    imagePath: navigationProvider.activeTab == NavigationTab.favorite 
                        ? 'navigation/favoriteA.png' 
                        : 'navigation/favorite.png',
                    label: languageProvider.isArabic ? 'المفضلة' : 'Favorite',
                    isActive: navigationProvider.activeTab == NavigationTab.favorite,
                    navigationProvider: navigationProvider,
                  ),
                ),
              ),
              // Slot 5: Cart
              Expanded(
                flex: 1,
                child: Center(
                  child: _buildStandardNavItem(
                    context: context,
                    tab: NavigationTab.cart,
                    imagePath: navigationProvider.activeTab == NavigationTab.cart 
                        ? 'navigation/cartA.png' 
                        : 'navigation/cart.png',
                    label: languageProvider.isArabic ? 'السلة' : 'Cart',
                    isActive: navigationProvider.activeTab == NavigationTab.cart,
                    navigationProvider: navigationProvider,
                    badgeCount: cart.totalItems,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Standard nav items (Home, Menu, Favorites, Cart)
  Widget _buildStandardNavItem({
    required BuildContext context,
    required NavigationTab tab,
    required String imagePath,
    required String label,
    required bool isActive,
    required NavigationProvider navigationProvider,
    int? badgeCount,
  }) {
    return GestureDetector(
      onTap: () => _handleNavTap(context, tab, navigationProvider),
      behavior: HitTestBehavior.opaque,
      child: Column(
        mainAxisSize: MainAxisSize.max,
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                width: 24,
                height: 24,
                alignment: Alignment.center,
                child: ColorFiltered(
                  colorFilter: ColorFilter.mode(
                    isActive ? const Color(0xFFFF7A00) : const Color(0xFF969494),
                    BlendMode.srcIn,
                  ),
                  child: Image.asset(
                    imagePath,
                    width: 24,
                    height: 24,
                    fit: BoxFit.contain,
                  ),
                ),
              ),
              if (badgeCount != null && badgeCount > 0)
                Positioned(
                  right: -6,
                  top: -6,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: Colors.red,
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      badgeCount > 99 ? '99+' : badgeCount.toString(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
              color: isActive
                  ? const Color(0xFFFF7A00)
                  : const Color(0xFF969494),
            ),
          ),
        ],
      ),
    );
  }

  // Cook Hub item (large icon centered in dedicated slot)
  Widget _buildCookHubItem({
    required BuildContext context,
    required bool isActive,
    required NavigationProvider navigationProvider,
    required LanguageProvider languageProvider,
  }) {
    return GestureDetector(
      onTap: () => _handleNavTap(context, NavigationTab.cookHub, navigationProvider),
      behavior: HitTestBehavior.opaque,
      child: Column(
        mainAxisSize: MainAxisSize.max,
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
            // Cook Hub image: 54x54 with controlled 1px top padding
            Padding(
              padding: const EdgeInsets.only(top: 1),
              child: Image.asset(
                isActive ? 'navigation/CookA.png' : 'navigation/Cook.png',
                width: 54,
                height: 54,
                fit: BoxFit.contain,
              ),
            ),
            const SizedBox(height: 7),
            Text(
              languageProvider.isArabic ? 'مطبخي' : 'Cook Hub',
              style: TextStyle(
                fontSize: 12,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
                color: isActive
                    ? const Color(0xFFFF7A00)
                    : const Color(0xFF969494),
              ),
            ),
          ],
        ),
    );
  }

  void _handleNavTap(BuildContext context, NavigationTab tab,
      NavigationProvider navigationProvider) {
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
            pageBuilder: (context, animation, secondaryAnimation) =>
                const MenuScreen(),
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
            pageBuilder: (context, animation, secondaryAnimation) =>
                const FavoritesScreen(),
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
            pageBuilder: (context, animation, secondaryAnimation) =>
                const CartScreen(),
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

      case NavigationTab.cookHub:
        // Navigate to Cook Hub dashboard
        Navigator.of(context).popUntil((route) => route.isFirst);
        Navigator.push(
          context,
          PageRouteBuilder(
            pageBuilder: (context, animation, secondaryAnimation) =>
                const DashboardScreen(),
            transitionDuration: Duration.zero,
            reverseTransitionDuration: Duration.zero,
          ),
        ).then((_) {
          // Reset to home if user pops back
          if (navigationProvider.activeTab == NavigationTab.cookHub) {
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
