import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../providers/language_provider.dart';
import '../providers/notification_provider.dart';
import '../providers/auth_provider.dart';
import '../screens/notifications/notifications_screen.dart';
import '../screens/settings/settings_screen.dart';
import '../utils/image_url_utils.dart';

class SharedAppHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final IconData? leadingIcon;
  final bool showBackButton;
  final bool showNotificationIcon;
  final bool showBurgerMenu;
  final VoidCallback? onBackPressed;
  final VoidCallback? onMenuPressed;
  final double headerTopPadding;

  const SharedAppHeader({
    Key? key,
    required this.title,
    this.subtitle,
    this.leadingIcon,
    this.showBackButton = false,
    this.showNotificationIcon = false,
    this.showBurgerMenu = false,
    this.onBackPressed,
    this.onMenuPressed,
    this.headerTopPadding = 16,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;

    // SafeArea(bottom:false) composes correctly whether or not there is an
    // outer SafeArea: the inner one consumes whatever top padding remains.
    // This eliminates AppBar's NavigationToolbar centering which was placing
    // content 22-30px too low compared to Menu/Cart/Favorites on native iOS.
    return SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.only(top: 16, left: 24, right: 24, bottom: 16),
        child: Row(
          children: [
            // Leading: burger or back arrow
            if (showBurgerMenu)
              Builder(
                builder: (BuildContext ctx) {
                  return IconButton(
                    icon: Image.asset(
                      'assets/icons/Burger.png',
                      width: 24,
                      height: 24,
                    ),
                    onPressed: onMenuPressed ?? () => Scaffold.of(ctx).openDrawer(),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  );
                },
              )
            else if (showBackButton)
              IconButton(
                icon: Icon(
                  isRTL ? Icons.arrow_forward : Icons.arrow_back,
                  color: AppTheme.textPrimary,
                  size: 24,
                ),
                onPressed: onBackPressed ?? () => Navigator.pop(context),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            // 24px gap — same geometry as all back-arrow and home pages
            if (showBurgerMenu || showBackButton) const SizedBox(width: 24),
            // Title + subtitle
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      if (leadingIcon != null) ...[
                        Container(
                          width: 24,
                          height: 24,
                          margin: const EdgeInsets.only(right: 8),
                          child: Icon(
                            leadingIcon,
                            color: AppTheme.accentColor,
                            size: 20,
                          ),
                        ),
                      ],
                      Text(
                        title,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.textPrimary,
                          height: 1.2,
                        ),
                      ),
                    ],
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      subtitle!,
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF7D7C7C),
                        height: 1.2,
                        letterSpacing: -0.4,
                        fontFamily: 'Inter',
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ],
              ),
            ),
            // Right icons: bell + avatar (only when showNotificationIcon)
            if (showNotificationIcon) ...[
              const SizedBox(width: 8),
              Consumer<NotificationProvider>(
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
                    child: Stack(
                      clipBehavior: Clip.none,
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: AppTheme.backgroundColor,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Padding(
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
                        ),
                        if (unreadCount > 0)
                          Positioned(
                            top: -2,
                            right: -2,
                            child: Container(
                              padding: const EdgeInsets.all(4),
                              decoration: const BoxDecoration(
                                color: Color(0xFFFF7A00),
                                shape: BoxShape.circle,
                              ),
                              constraints: const BoxConstraints(
                                minWidth: 18,
                                minHeight: 18,
                              ),
                              child: Text(
                                unreadCount > 9 ? '9+' : '$unreadCount',
                                style: const TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.white,
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ),
                          ),
                      ],
                    ),
                  );
                },
              ),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (context) => const SettingsScreen())),
                child: Consumer<AuthProvider>(
                  builder: (context, authProvider, _) {
                    final profileImg = authProvider.user?.profileImage;
                    final hasValidImage = profileImg != null && profileImg.isNotEmpty;
                    return CircleAvatar(
                      radius: 18,
                      backgroundColor: AppTheme.dividerColor,
                      backgroundImage: hasValidImage ? getImageProvider(profileImg) : null,
                      child: hasValidImage ? null : const Icon(Icons.person, color: AppTheme.textSecondary, size: 20),
                    );
                  },
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
