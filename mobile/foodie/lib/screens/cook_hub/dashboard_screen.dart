import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/navigation_provider.dart';
import '../../widgets/cook_hub_shell.dart';
import '../../widgets/global_navigation_drawer.dart';
import 'overview_page.dart';
import 'menu_page.dart';
import 'cook_orders_page.dart';

/// Cook Hub Dashboard - Main entry point with tab switching
class DashboardScreen extends StatefulWidget {
  const DashboardScreen({Key? key}) : super(key: key);

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _activeTabIndex = 0; // 0=Overview, 1=Orders, 2=Menu

  late NavigationProvider _navProvider;
  NavigationTab? _prevNavTab;

  @override
  void initState() {
    super.initState();
    // Register listener after the first frame so context is ready.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _navProvider = context.read<NavigationProvider>();
      _prevNavTab = _navProvider.activeTab;
      _navProvider.addListener(_onNavChanged);
    });
  }

  @override
  void dispose() {
    _navProvider.removeListener(_onNavChanged);
    super.dispose();
  }

  /// Reset to Overview (tab 0) whenever the user navigates back to Cook Hub
  /// from any other tab — keeps navigation predictable.
  void _onNavChanged() {
    final current = _navProvider.activeTab;
    if (_prevNavTab != NavigationTab.cookHub &&
        current == NavigationTab.cookHub &&
        mounted) {
      setState(() => _activeTabIndex = 0);
    }
    _prevNavTab = current;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      extendBody: true,
      drawer: const GlobalNavigationDrawer(),
      body: CookHubShell(
        activeTabIndex: _activeTabIndex,
        onTabSelected: (index) {
          setState(() => _activeTabIndex = index);
        },
        content: IndexedStack(
          index: _activeTabIndex,
          children: const [
            OverviewPage(),
            CookOrdersPage(),
            MenuPage(),
          ],
        ),
      ),
    );
  }

}
