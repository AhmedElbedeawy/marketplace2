import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../providers/language_provider.dart';
import '../providers/notification_provider.dart';
import '../screens/notifications/notifications_screen.dart';

class SharedAppHeader extends StatelessWidget {
  final String title;
  final bool showBackButton;
  final bool showNotificationIcon;
  final bool showBurgerMenu;
  final VoidCallback? onBackPressed;
  final VoidCallback? onMenuPressed;
  
  const SharedAppHeader({
    Key? key,
    required this.title,
    this.showBackButton = false,
    this.showNotificationIcon = false,
    this.showBurgerMenu = false,
    this.onBackPressed,
    this.onMenuPressed,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;

    return SafeArea(
      child: Container(
        height: 101, // Match Home page AppBar height
        padding: const EdgeInsets.only(left: 4, right: 4), // Match Home page title padding
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start, // Align to top
          children: [
            // Left side: Back button or Burger menu
            if (showBackButton)
              Padding(
                padding: const EdgeInsets.only(top: 37, left: 12), // Match Home page leading position
                child: GestureDetector(
                  onTap: onBackPressed ?? () => Navigator.pop(context),
                  child: Container(
                    width: 40,
                    height: 40,
                    alignment: Alignment.centerLeft,
                    child: Icon(
                      isRTL ? Icons.arrow_forward : Icons.arrow_back,
                      color: AppTheme.textPrimary,
                      size: 24,
                    ),
                  ),
                ),
              )
            else if (showBurgerMenu)
              Padding(
                padding: const EdgeInsets.only(top: 37, left: 12), // Match Home page leading position
                child: GestureDetector(
                  onTap: onMenuPressed ?? () => Scaffold.of(context).openDrawer(),
                  child: Container(
                    width: 40,
                    height: 40,
                    alignment: Alignment.centerLeft,
                    child: const Icon(
                      Icons.menu,
                      color: AppTheme.textPrimary,
                      size: 24,
                    ),
                  ),
                ),
              )
            else
              const SizedBox(width: 52), // 12 padding + 40 width

            // Title
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(top: 37), // Match Home page exact padding
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min, // Match "Hi, Test" Column structure
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 18, // Match "Hi, Test" font size
                        fontWeight: FontWeight.w700,
                        color: AppTheme.textPrimary,
                        height: 1.2, // Match "Hi, Test" line height
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Right side: Notification icon
            if (showNotificationIcon)
              Padding(
                padding: const EdgeInsets.only(top: 37, right: 12), // Match Home page notification position
                child: Consumer<NotificationProvider>(
                  builder: (context, notificationProvider, _) {
                    final unreadCount = notificationProvider.unreadCount;
                    
                    return GestureDetector(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const NotificationsScreen(),
                          ),
                        );
                      },
                      child: Container(
                        width: 40,
                        height: 40,
                        alignment: Alignment.center,
                        child: Stack(
                          clipBehavior: Clip.none,
                          children: [
                            Padding(
                              padding: const EdgeInsets.all(8),
                              child: Image.asset(
                                'assets/icons/notifications.png',
                                width: 24,
                                height: 24,
                                fit: BoxFit.contain,
                              errorBuilder: (_, __, ___) => const Icon(
                                Icons.notifications_outlined,
                                color: AppTheme.textPrimary,
                                size: 22,
                              ),
                            ),
                          ),
                          if (unreadCount > 0)
                              Positioned(
                                right: -2,
                                top: -2,
                                child: Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: const BoxDecoration(
                                    color: Colors.red,
                                    shape: BoxShape.circle,
                                  ),
                                  constraints: const BoxConstraints(
                                    minWidth: 18,
                                    minHeight: 18,
                                  ),
                                  child: Text(
                                    unreadCount > 9 ? '9+' : '$unreadCount',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w600,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              )
            else
              const SizedBox(width: 40),
          ],
        ),
      ),
    );
  }
}
