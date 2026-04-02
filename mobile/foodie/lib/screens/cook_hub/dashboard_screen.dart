import 'package:flutter/material.dart';
import '../../widgets/cook_hub_shell.dart';
import '../../widgets/global_bottom_navigation.dart';
import '../../widgets/global_navigation_drawer.dart';
import 'overview_page.dart';
import 'menu_page.dart';
import 'cook_orders_page.dart';
import 'marketing_page.dart';
import 'payouts_screen.dart';

/// Cook Hub Dashboard - Main entry point with tab switching
class DashboardScreen extends StatefulWidget {
  const DashboardScreen({Key? key}) : super(key: key);

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _activeTabIndex = 0; // 0=Overview, 1=Orders, 2=Menu, 3=Marketing, 4=Invoices & Payouts

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      extendBody: true,
      drawer: const GlobalNavigationDrawer(),
      body: CookHubShell(
        activeTabIndex: _activeTabIndex,
        onTabSelected: (index) {
          print('👆 [TAB TAPPED] Index tapped: $index');
          setState(() {
            _activeTabIndex = index;
            print('✅ [STATE UPDATED] _activeTabIndex set to: $_activeTabIndex');
          });
        },
        content: _buildContent(),
      ),
      bottomNavigationBar: const GlobalBottomNavigation(),
    );
  }

  Widget _buildContent() {
    print('🎨 [RENDER] Building content for _activeTabIndex: $_activeTabIndex');
    
    switch (_activeTabIndex) {
      case 0: // Overview
        print('📺 [SCREEN] Rendering OverviewPage');
        return const OverviewPage();
      case 1: // Orders
        print('📋 [SCREEN] Rendering CookOrdersPage');
        return const CookOrdersPage();
      case 2: // Menu
        print('🍽️ [SCREEN] Rendering MenuPage');
        return const MenuPage();
      case 3: // Marketing
        print('📢 [SCREEN] Rendering MarketingPage');
        return const MarketingPage();
      case 4: // Invoices & Payouts
        print('💰 [SCREEN] Rendering PayoutsScreen');
        return const PayoutsScreen();
      default:
        print('❌ [ERROR] Unknown tab index: $_activeTabIndex');
        return const SizedBox.shrink();
    }
  }
}
