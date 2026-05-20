import 'package:flutter/material.dart';
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
