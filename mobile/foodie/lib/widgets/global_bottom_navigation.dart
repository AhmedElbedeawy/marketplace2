import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/language_provider.dart';
import '../utils/app_scale.dart';
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

    // Safe area inset is NOT scaled — it is a fixed device value.
    final double safeBottom = MediaQuery.of(context).viewPadding.bottom;

    // Check if user is an active cook
    final user = authProvider.user;
    final isActiveCook =
        user?.roleCookStatus != null && user?.roleCookStatus == 'active';

    // Nav bar icon-area height: 79dp at 375px (= previous 95dp outer − 16dp bottom pad).
    // Clamped so it never collapses on very small screens or balloons on tablets.
    final double navContentHeight = AppScale.sc(context, 79, 68, 100);
    final double hPad = AppScale.sc(context, 12, 8, 20);

    return Container(
      decoration: BoxDecoration(
        image: DecorationImage(
          image: AssetImage(
            isActiveCook
                ? 'assets/navigation/NavC.png'
                : 'assets/navigation/NavF.png',
          ),
          // BoxFit.fill stretches the image to cover the full container
          // (icon area + safe area below), keeping the background seamless.
          fit: BoxFit.fill,
          colorFilter: ColorFilter.mode(
            Colors.white.withValues(alpha: 1),
            BlendMode.modulate,
          ),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // ── Icon row ────────────────────────────────────────────────────
          // Fixed-height container so icons are always vertically centred
          // and never pushed around by the home indicator safe area.
          SizedBox(
            height: navContentHeight,
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: hPad),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // Slot 1: Home
                  // Bottom-aligned with 3px base gap so text baseline matches
                  // Cook Hub text (which is centred in its larger column).
                  Expanded(
                    flex: 1,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Center(
                          child: _buildStandardNavItem(
                            context: context,
                            tab: NavigationTab.home,
                            imagePath:
                                navigationProvider.activeTab == NavigationTab.home
                                    ? 'assets/navigation/homeA.png'
                                    : 'assets/navigation/home.png',
                            label: languageProvider.isArabic ? 'الرئيسية' : 'Home',
                            isActive:
                                navigationProvider.activeTab == NavigationTab.home,
                            navigationProvider: navigationProvider,
                          ),
                        ),
                        const SizedBox(height: 3),
                      ],
                    ),
                  ),
                  // Slot 2: Menu
                  Expanded(
                    flex: 1,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Center(
                          child: _buildStandardNavItem(
                            context: context,
                            tab: NavigationTab.menu,
                            imagePath:
                                navigationProvider.activeTab == NavigationTab.menu
                                    ? 'assets/navigation/MenuA.png'
                                    : 'assets/navigation/menu.png',
                            label: languageProvider.isArabic ? 'القائمة' : 'Menu',
                            isActive:
                                navigationProvider.activeTab == NavigationTab.menu,
                            navigationProvider: navigationProvider,
                          ),
                        ),
                        const SizedBox(height: 3),
                      ],
                    ),
                  ),
                  // Slot 3: Cook Hub (true centre, active cooks only)
                  Expanded(
                    flex: 1,
                    child: Center(
                      child: isActiveCook
                          ? _buildCookHubItem(
                              context: context,
                              isActive: navigationProvider.activeTab ==
                                  NavigationTab.cookHub,
                              navigationProvider: navigationProvider,
                              languageProvider: languageProvider,
                            )
                          : const SizedBox.shrink(),
                    ),
                  ),
                  // Slot 4: Favorites
                  Expanded(
                    flex: 1,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Center(
                          child: _buildStandardNavItem(
                            context: context,
                            tab: NavigationTab.favorite,
                            imagePath: navigationProvider.activeTab ==
                                    NavigationTab.favorite
                                ? 'assets/navigation/favoriteA.png'
                                : 'assets/navigation/favorite.png',
                            label:
                                languageProvider.isArabic ? 'المفضلة' : 'Favorite',
                            isActive: navigationProvider.activeTab ==
                                NavigationTab.favorite,
                            navigationProvider: navigationProvider,
                          ),
                        ),
                        const SizedBox(height: 3),
                      ],
                    ),
                  ),
                  // Slot 5: Cart
                  Expanded(
                    flex: 1,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Center(
                          child: _buildStandardNavItem(
                            context: context,
                            tab: NavigationTab.cart,
                            imagePath:
                                navigationProvider.activeTab == NavigationTab.cart
                                    ? 'assets/navigation/cartA.png'
                                    : 'assets/navigation/cart.png',
                            label: languageProvider.isArabic ? 'السلة' : 'Cart',
                            isActive:
                                navigationProvider.activeTab == NavigationTab.cart,
                            navigationProvider: navigationProvider,
                            badgeCount: cart.totalItems,
                          ),
                        ),
                        const SizedBox(height: 3),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          // ── Home indicator space ─────────────────────────────────────────
          // Placed BELOW the icon row so icons stay vertically centred
          // in the visible nav bar area regardless of device safe area.
          SizedBox(height: safeBottom),
        ],
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
    final double iconSize = AppScale.sc(context, 24, 20, 32);
    final double fontSize = AppScale.sc(context, 12, 10, 14);
    final double gap = AppScale.sc(context, 4, 2, 6);

    return GestureDetector(
      onTap: () => _handleNavTap(context, tab, navigationProvider),
      behavior: HitTestBehavior.opaque,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              SizedBox(
                width: iconSize,
                height: iconSize,
                child: ColorFiltered(
                  colorFilter: ColorFilter.mode(
                    isActive
                        ? const Color(0xFFFF7A00)
                        : const Color(0xFF969494),
                    BlendMode.srcIn,
                  ),
                  child: Image.asset(
                    imagePath,
                    width: iconSize,
                    height: iconSize,
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
                      color: Color(0xFFFF7A00),
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
          SizedBox(height: gap),
          Text(
            label,
            style: TextStyle(
              fontSize: fontSize,
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

  // Cook Hub item (large icon centred in dedicated slot)
  Widget _buildCookHubItem({
    required BuildContext context,
    required bool isActive,
    required NavigationProvider navigationProvider,
    required LanguageProvider languageProvider,
  }) {
    final double cookIconSize = AppScale.sc(context, 54, 44, 68);
    final double fontSize = AppScale.sc(context, 12, 10, 14);
    // gap reduced from 7→6 to compensate for the 1px top offset below,
    // keeping total column height (1+icon+gap+text) identical so Cook Hub
    // text stays at the same vertical position as before.
    final double gap = AppScale.sc(context, 6, 3, 9);

    return GestureDetector(
      onTap: () =>
          _handleNavTap(context, NavigationTab.cookHub, navigationProvider),
      behavior: HitTestBehavior.opaque,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // 1px offset shifts the image down without moving the text.
          const SizedBox(height: 1),
          Image.asset(
            isActive
                ? 'assets/navigation/CookA.png'
                : 'assets/navigation/Cook.png',
            width: cookIconSize,
            height: cookIconSize,
            fit: BoxFit.contain,
          ),
          SizedBox(height: gap),
          Text(
            languageProvider.isArabic ? 'مطبخي' : 'Cook Hub',
            style: TextStyle(
              fontSize: fontSize,
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

  void _handleNavTap(
    BuildContext context,
    NavigationTab tab,
    NavigationProvider navigationProvider,
  ) {
    // If tapping the current tab, do nothing
    if (navigationProvider.activeTab == tab) {
      return;
    }

    // Update the active tab and set as origin
    navigationProvider.setActiveTab(tab, setAsOrigin: true);

    // Navigate based on the tab
    switch (tab) {
      case NavigationTab.home:
        Navigator.of(context).popUntil((route) => route.isFirst);
        break;

      case NavigationTab.menu:
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
          if (navigationProvider.activeTab == NavigationTab.menu) {
            navigationProvider.resetToHome();
          }
        });
        break;

      case NavigationTab.favorite:
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
          if (navigationProvider.activeTab == NavigationTab.favorite) {
            navigationProvider.resetToHome();
          }
        });
        break;

      case NavigationTab.cart:
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
          if (navigationProvider.activeTab == NavigationTab.cart) {
            navigationProvider.resetToHome();
          }
        });
        break;

      case NavigationTab.cookHub:
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
          if (navigationProvider.activeTab == NavigationTab.cookHub) {
            navigationProvider.resetToHome();
          }
        });
        break;

      case NavigationTab.none:
        break;
    }
  }
}
