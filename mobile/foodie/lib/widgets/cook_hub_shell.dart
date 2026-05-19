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
          leadingIcon: Icons.restaurant,
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
      isRTL ? 'نظرة عامة' : 'Overview',
      isRTL ? 'الطلبات' : 'Orders',
      isRTL ? 'القائمة' : 'Menu',
    ];

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      height: 44,
      decoration: BoxDecoration(
        color: const Color(0xFFF1F1F1),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Padding(
        padding: const EdgeInsets.all(4),
        child: Row(
          textDirection: isRTL ? TextDirection.rtl : TextDirection.ltr,
          children: List.generate(tabs.length, (index) {
            final isActive = index == activeTabIndex;
            return Expanded(
              child: GestureDetector(
                onTap: () => onTabSelected(index),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  decoration: BoxDecoration(
                    color: isActive ? const Color(0xFF2D2F2F) : Colors.transparent,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    tabs[index],
                    style: TextStyle(
                      fontSize: 13,
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
