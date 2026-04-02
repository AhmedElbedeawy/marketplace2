import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/language_provider.dart';
import '../widgets/shared_app_header.dart';

/// CookHubShell - Shared structure for all Cook Hub pages
/// 
/// Provides:
/// 1. Global app header with burger menu, Cook Hub title, notifications
/// 2. Top tabs (Overview, Menu, Marketing)
/// 3. Content area (changes based on selected tab)
/// 
/// NOTE: Uses existing app top bar (burger/notifications/account) from parent Scaffold
class CookHubShell extends StatelessWidget {
  final Widget content;
  final int activeTabIndex;
  final Function(int) onTabSelected;

  const CookHubShell({
    Key? key,
    required this.content,
    required this.activeTabIndex,
    required this.onTabSelected,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;

    return Column(
      children: [
        // Global App Header with Cook Hub branding
        SharedAppHeader(
          title: isRTL ? 'مطبخي' : 'Cook Hub',
          subtitle: isRTL ? 'أدر مطبخك المنزلي' : 'Manage Your Home Kitchen',
          leadingIcon: Icons.restaurant_menu,
          showBurgerMenu: true,
          showNotificationIcon: true,
        ),
        
        // Top Tabs
        _buildTopTabs(isRTL),
        
        // Content Area
        Expanded(child: content),
      ],
    );
  }



  Widget _buildTopTabs(bool isRTL) {
    final tabs = [
      if (isRTL) 'نظرة عامة' else 'Overview',
      if (isRTL) 'الطلبات' else 'Orders',
      if (isRTL) 'القائمة' else 'Menu',
      if (isRTL) 'التسويق' else 'Marketing',
      if (isRTL) 'الفواتير والدفعات' else 'Invoices & Payouts',
    ];

    print('🏷️ [SHELL] Building tabs with activeTabIndex: $activeTabIndex');

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: Row(
          textDirection: isRTL ? TextDirection.rtl : TextDirection.ltr,
          children: List.generate(tabs.length, (index) {
            final isActive = index == activeTabIndex;
            
            print('🔘 [TAB $index] Label: "${tabs[index]}", isActive: $isActive');
            
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: GestureDetector(
                onTap: () {
                  print('👆 [TAB $index] Tapped - calling onTabSelected($index)');
                  onTabSelected(index);
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  decoration: BoxDecoration(
                    color: isActive ? const Color(0xFF2D2F2F) : const Color(0xFFE7E8E8),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    tabs[index],
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: isActive ? Colors.white : const Color(0xFF6B6B6B),
                    ),
                  ),
                ),
              ),
            );
          }),
        ),
      ),
    );
  }
}
