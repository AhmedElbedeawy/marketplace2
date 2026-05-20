import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/language_provider.dart';
import '../utils/arabic_utils.dart';
import '../utils/app_scale.dart';
import '../providers/navigation_provider.dart';
import '../providers/cart_provider.dart';
import '../providers/auth_provider.dart';

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

    // Check if user is an active cook (affects Cook Hub tap destination only).
    final user = authProvider.user;
    final isActiveCook =
        user?.roleCookStatus != null && user?.roleCookStatus == 'active';

    // Nav bar icon-area height: 85dp at 375px (+6dp for Cook Hub overflow fix and
    // label baseline alignment). Extra space appears above standard icons (they
    // are bottom-aligned); Cook Hub icon stays pinned to the top.
    final double navContentHeight = AppScale.sc(context, 85, 74, 106);
    final double hPad = AppScale.sc(context, 12, 8, 20);
    // Cook Hub icon is 2px larger than before; its top half floats above the white rect.
    final double cookIconSize = AppScale.sc(context, 56, 46, 70);

    // Total height of the nav container (icon area + device safe area).
    final double totalHeight = navContentHeight + safeBottom;
    // White rectangle starts at cookIconSize/2 so the icon's top half floats above it.
    final double rectTop = cookIconSize / 2;

    return SizedBox(
      height: totalHeight,
      child: Stack(
        children: [
          // ── Native white background rectangle ──────────────────────────
          Positioned(
            top: rectTop,
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(
                  top: BorderSide(color: Color(0xFF969494), width: 1),
                ),
              ),
            ),
          ),
          // ── Icon row + home indicator ──────────────────────────────────
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                height: navContentHeight,
                child: Padding(
                  padding: EdgeInsets.symmetric(horizontal: hPad),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Slot 1: Home — bottom-aligned
                      Expanded(
                        flex: 1,
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            Center(
                              child: _buildStandardNavItem(
                                context: context,
                                tab: NavigationTab.home,
                                imagePath: navigationProvider.activeTab ==
                                        NavigationTab.home
                                    ? 'assets/navigation/homeA.png'
                                    : 'assets/navigation/home.png',
                                label: languageProvider.isArabic
                                    ? 'الرئيسية'
                                    : 'Home',
                                isActive: navigationProvider.activeTab ==
                                    NavigationTab.home,
                                navigationProvider: navigationProvider,
                              ),
                            ),
                            const SizedBox(height: 3),
                          ],
                        ),
                      ),
                      // Slot 2: Menu — bottom-aligned
                      Expanded(
                        flex: 1,
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            Center(
                              child: _buildStandardNavItem(
                                context: context,
                                tab: NavigationTab.menu,
                                imagePath: navigationProvider.activeTab ==
                                        NavigationTab.menu
                                    ? 'assets/navigation/MenuA.png'
                                    : 'assets/navigation/menu.png',
                                label: languageProvider.isArabic
                                    ? 'القائمة'
                                    : 'Menu',
                                isActive: navigationProvider.activeTab ==
                                    NavigationTab.menu,
                                navigationProvider: navigationProvider,
                              ),
                            ),
                            const SizedBox(height: 3),
                          ],
                        ),
                      ),
                      // Slot 3: Cook Hub — top-aligned so icon floats above white rect
                      Expanded(
                        flex: 1,
                        child: _buildCookHubItem(
                          context: context,
                          isActive: navigationProvider.activeTab ==
                              NavigationTab.cookHub,
                          isActiveCook: isActiveCook,
                          navigationProvider: navigationProvider,
                          languageProvider: languageProvider,
                          cookIconSize: cookIconSize,
                        ),
                      ),
                      // Slot 4: Favorites — bottom-aligned
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
                                label: languageProvider.isArabic
                                    ? 'المفضلة'
                                    : 'Favorite',
                                isActive: navigationProvider.activeTab ==
                                    NavigationTab.favorite,
                                navigationProvider: navigationProvider,
                              ),
                            ),
                            const SizedBox(height: 3),
                          ],
                        ),
                      ),
                      // Slot 5: Cart — bottom-aligned
                      Expanded(
                        flex: 1,
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            Center(
                              child: _buildStandardNavItem(
                                context: context,
                                tab: NavigationTab.cart,
                                imagePath: navigationProvider.activeTab ==
                                        NavigationTab.cart
                                    ? 'assets/navigation/cartA.png'
                                    : 'assets/navigation/cart.png',
                                label:
                                    languageProvider.isArabic ? 'السلة' : 'Cart',
                                isActive: navigationProvider.activeTab ==
                                    NavigationTab.cart,
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
              // Home indicator space — below icon row, inside the white rect.
              SizedBox(height: safeBottom),
            ],
          ),
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
                    child: Builder(builder: (ctx) {
                      final isArabic = ctx.read<LanguageProvider>().isArabic;
                      final raw = badgeCount! > 99 ? '99+' : badgeCount.toString();
                      return Text(
                        isArabic ? toArabicNumerals(raw) : raw,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                        ),
                      );
                    }),
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

  // Cook Hub item.
  // Layout uses Spacer so the label baseline exactly matches the standard items'
  // bottom-3px position regardless of font metrics or screen size — no pixel math needed.
  // The icon is pinned to the top; crossAxisAlignment.stretch on the parent Row
  // gives this Column the full navContentHeight to work with.
  Widget _buildCookHubItem({
    required BuildContext context,
    required bool isActive,
    required bool isActiveCook,
    required NavigationProvider navigationProvider,
    required LanguageProvider languageProvider,
    required double cookIconSize,
  }) {
    final double fontSize = AppScale.sc(context, 12, 10, 14);

    return GestureDetector(
      onTap: () =>
          _handleNavTap(context, NavigationTab.cookHub, navigationProvider),
      behavior: HitTestBehavior.opaque,
      // Column fills the full navContentHeight supplied by stretch on the Row.
      child: Column(
        // mainSize defaults to max — fills available height.
        children: [
          // Icon pinned to the very top, horizontally centred.
          Center(
            child: Image.asset(
              isActive
                  ? 'assets/navigation/CookA.png'
                  : 'assets/navigation/Cook.png',
              width: cookIconSize,
              height: cookIconSize,
              fit: BoxFit.contain,
            ),
          ),
          // Spacer pushes label to the same bottom-3px position as standard items.
          const Spacer(),
          Center(
            child: Text(
              languageProvider.isArabic ? 'مطبخي' : 'Cook Hub',
              style: TextStyle(
                fontSize: fontSize,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
                color: isActive
                    ? const Color(0xFFFF7A00)
                    : const Color(0xFF969494),
              ),
            ),
          ),
          // 3px gap at bottom — matches every other nav item's SizedBox(height:3).
          const SizedBox(height: 3),
        ],
      ),
    );
  }

  void _handleNavTap(
    BuildContext context,
    NavigationTab tab,
    NavigationProvider navigationProvider,
  ) {
    if (navigationProvider.activeTab == tab) return;

    // Pop any detail screens pushed on top of AppShell, then switch the IndexedStack slot.
    Navigator.of(context).popUntil((route) => route.isFirst);
    navigationProvider.setActiveTab(tab, setAsOrigin: true);
  }
}
