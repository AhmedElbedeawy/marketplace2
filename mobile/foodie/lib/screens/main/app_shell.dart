import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/navigation_provider.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/global_bottom_navigation.dart';
import 'home_screen.dart';
import '../menu/menu_screen.dart';
import '../favorites/favorites_screen.dart';
import '../cart/cart_screen.dart';
import '../cook_hub/dashboard_screen.dart';
import '../cook_hub/cook_registration_screen.dart';

class AppShell extends StatelessWidget {
  const AppShell({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final nav = context.watch<NavigationProvider>();

    return Scaffold(
      body: IndexedStack(
        index: nav.shellIndex,
        children: const [
          HomeScreen(),
          MenuScreen(),
          _CookHubTab(),
          FavoritesScreen(),
          CartScreen(),
        ],
      ),
      bottomNavigationBar: const GlobalBottomNavigation(),
    );
  }
}

// Reads AuthProvider and renders the correct Cook Hub child without pushing a route.
class _CookHubTab extends StatelessWidget {
  const _CookHubTab({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final isActiveCook =
        user?.roleCookStatus != null && user?.roleCookStatus == 'active';

    return isActiveCook
        ? const DashboardScreen()
        : const CookRegistrationScreen();
  }
}
