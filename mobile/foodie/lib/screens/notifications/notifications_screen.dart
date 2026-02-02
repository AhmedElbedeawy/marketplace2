import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../config/theme.dart';
import '../../providers/language_provider.dart';
import '../../providers/notification_provider.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(context, isRTL),
            Expanded(
              child: _buildNotificationsList(context, isRTL),
            ),
          ],
        ),
      ),
      bottomNavigationBar: _buildBottomNav(context, isRTL),
    );
  }

  Widget _buildHeader(BuildContext context, bool isRTL) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      child: Row(
        children: [
          IconButton(
            icon: Icon(
              isRTL ? Icons.arrow_forward : Icons.arrow_back,
              color: AppTheme.textPrimary,
              size: 24,
            ),
            onPressed: () => Navigator.pop(context),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              isRTL ? 'الإشعارات' : 'Notifications',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: AppTheme.textPrimary,
              ),
            ),
          ),
          Consumer<NotificationProvider>(
            builder: (context, notificationProvider, _) {
              if (notificationProvider.unreadCount > 0) {
                return TextButton(
                  onPressed: () => notificationProvider.markAllAsRead(),
                  child: Text(
                    isRTL ? 'قراءة الكل' : 'Mark all read',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.accentColor,
                    ),
                  ),
                );
              }
              return const SizedBox.shrink();
            },
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationsList(BuildContext context, bool isRTL) {
    return Consumer<NotificationProvider>(
      builder: (context, notificationProvider, _) {
        if (notificationProvider.notifications.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.notifications_none,
                  size: 100,
                  color: AppTheme.textSecondary,
                ),
                const SizedBox(height: 16),
                Text(
                  isRTL ? 'لا توجد إشعارات' : 'No notifications',
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  isRTL ? 'ستظهر إشعاراتك هنا' : 'Your notifications will appear here',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w400,
                    color: AppTheme.textSecondary,
                  ),
                ),
              ],
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(20),
          itemCount: notificationProvider.notifications.length,
          itemBuilder: (context, index) {
            final notification = notificationProvider.notifications[index];
            return _buildNotificationCard(
              context,
              notification,
              isRTL,
              notificationProvider,
            );
          },
        );
      },
    );
  }

  Widget _buildNotificationCard(
    BuildContext context,
    AppNotification notification,
    bool isRTL,
    NotificationProvider provider,
  ) {
    final timeAgo = _formatTimeAgo(notification.timestamp, isRTL);

    return Dismissible(
      key: Key(notification.id),
      direction: DismissDirection.endToStart,
      background: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: AppTheme.errorColor,
          borderRadius: BorderRadius.circular(16),
        ),
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      onDismissed: (_) {
        provider.deleteNotification(notification.id);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(isRTL ? 'تم حذف الإشعار' : 'Notification deleted'),
            duration: const Duration(seconds: 2),
          ),
        );
      },
      child: GestureDetector(
        onTap: () => provider.handleNotificationTap(context, notification),
        child: Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: notification.isRead 
                ? Colors.white 
                : AppTheme.accentColor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.06),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: _getNotificationColor(notification.type).withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  _getNotificationIcon(notification.type),
                  color: _getNotificationColor(notification.type),
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            notification.title,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                        ),
                        if (!notification.isRead)
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: AppTheme.accentColor,
                              shape: BoxShape.circle,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      notification.message,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textSecondary,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      timeAgo,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF969494),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  IconData _getNotificationIcon(NotificationType type) {
    switch (type) {
      case NotificationType.order:
        return Icons.shopping_bag;
      case NotificationType.dish:
        return Icons.restaurant_menu;
      case NotificationType.promotion:
        return Icons.local_offer;
      case NotificationType.system:
        return Icons.info;
      case NotificationType.issue:
        return Icons.warning;
      case NotificationType.announcement:
        return Icons.campaign;
      case NotificationType.rating:
      case NotificationType.rating_reply:
        return Icons.star;
      case NotificationType.payout:
      case NotificationType.payout_failed:
        return Icons.payments;
      case NotificationType.order_update:
        return Icons.update;
      case NotificationType.order_issue:
      case NotificationType.issue_update:
        return Icons.report_problem;
      case NotificationType.account_warning:
      case NotificationType.account_restriction:
        return Icons.admin_panel_settings;
      case NotificationType.support_message:
        return Icons.support_agent;
    }
  }

  Color _getNotificationColor(NotificationType type) {
    switch (type) {
      case NotificationType.order:
        return AppTheme.successColor;
      case NotificationType.dish:
        return AppTheme.accentColor;
      case NotificationType.promotion:
        return const Color(0xFFE94057);
      case NotificationType.system:
        return const Color(0xFF2196F3);
      case NotificationType.issue:
        return const Color(0xFFFF9800);
      case NotificationType.announcement:
        return const Color(0xFF9C27B0);
      case NotificationType.rating:
      case NotificationType.rating_reply:
        return Colors.amber;
      case NotificationType.payout:
        return Colors.green;
      case NotificationType.payout_failed:
        return Colors.red;
      case NotificationType.order_update:
        return Colors.blue;
      case NotificationType.order_issue:
      case NotificationType.issue_update:
        return Colors.orange;
      case NotificationType.account_warning:
        return Colors.orange;
      case NotificationType.account_restriction:
        return Colors.red;
      case NotificationType.support_message:
        return Colors.teal;
    }
  }

  String _formatTimeAgo(DateTime timestamp, bool isRTL) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inMinutes < 1) {
      return isRTL ? 'الآن' : 'Just now';
    } else if (difference.inMinutes < 60) {
      return isRTL 
          ? 'منذ ${difference.inMinutes} دقيقة'
          : '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return isRTL 
          ? 'منذ ${difference.inHours} ساعة'
          : '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      return isRTL 
          ? 'منذ ${difference.inDays} يوم'
          : '${difference.inDays}d ago';
    } else {
      return DateFormat('MMM dd').format(timestamp);
    }
  }

  Widget _buildBottomNav(BuildContext context, bool isRTL) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.9),
        border: Border(
          top: BorderSide(
            color: Colors.black.withValues(alpha: 0.08),
            width: 1,
          ),
        ),
      ),
      child: SafeArea(
        child: Container(
          height: 85,
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildNavItem(
                context,
                index: 0,
                imagePath: 'assets/navigation/home.png',
                label: isRTL ? 'الرئيسية' : 'Home',
                isRTL: isRTL,
              ),
              _buildNavItem(
                context,
                index: 1,
                imagePath: 'assets/navigation/menu.png',
                label: isRTL ? 'القائمة' : 'Menu',
                isRTL: isRTL,
              ),
              _buildNavItem(
                context,
                index: 2,
                imagePath: 'assets/navigation/favorite.png',
                label: isRTL ? 'المفضلة' : 'Favorite',
                isRTL: isRTL,
              ),
              _buildNavItem(
                context,
                index: 3,
                imagePath: 'assets/navigation/cart.png',
                label: isRTL ? 'السلة' : 'Cart',
                isRTL: isRTL,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(
    BuildContext context, {
    required int index,
    required String imagePath,
    required String label,
    required bool isRTL,
  }) {
    return GestureDetector(
      onTap: () {
        if (index == 0) {
          Navigator.popUntil(context, (route) => route.isFirst);
        }
      },
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: Colors.transparent,
                borderRadius: BorderRadius.circular(8),
              ),
              alignment: Alignment.center,
              child: ColorFiltered(
                colorFilter: const ColorFilter.mode(
                  Color(0xFF969494),
                  BlendMode.srcIn,
                ),
                child: Image.asset(
                  imagePath,
                  width: 24,
                  height: 24,
                  fit: BoxFit.contain,
                ),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w400,
                color: Color(0xFF969494),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
