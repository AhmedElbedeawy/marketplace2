import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../config/theme.dart';
import '../../providers/language_provider.dart';
import '../../providers/notification_provider.dart';
import '../../utils/arabic_utils.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({Key? key}) : super(key: key);

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    // Trigger API fetch on every open so the list is always fresh.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        context.read<NotificationProvider>().fetchNotifications();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 16, left: 24, right: 24),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Icon(
                      Icons.arrow_back,
                      color: AppTheme.textPrimary,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 24),
                  Expanded(
                    child: Text(
                      isRTL ? 'الإشعارات' : 'Notifications',
                      style: const TextStyle(
                        color: AppTheme.textPrimary,
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        height: 1.2,
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
            ),
            Expanded(child: _buildNotificationsList(context, isRTL)),
          ],
        ),
      ),
      bottomNavigationBar: _buildBottomNav(context, isRTL),
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
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 16),
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
    final (:icon, :color) = _getIconAndColor(notification);

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
            color: Colors.white,
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
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 24),
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
                            _localizeTitle(notification, isRTL),
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
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Expanded(
                          child: Text(
                            _localizeMessage(notification, isRTL),
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.textSecondary,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
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
        return Icons.receipt_long;          // new order received
      case NotificationType.order_update:
        return Icons.notifications_active;  // order status changed (ready/preparing)
      case NotificationType.order_issue:
      case NotificationType.issue_update:
      case NotificationType.issue:
        return Icons.report_problem_outlined;
      case NotificationType.dish:
        return Icons.restaurant_menu;
      case NotificationType.promotion:
        return Icons.local_offer;
      case NotificationType.system:
        return Icons.info_outline;
      case NotificationType.announcement:
        return Icons.campaign;
      case NotificationType.rating:
        return Icons.star_outline;
      case NotificationType.rating_reply:
        return Icons.rate_review;
      case NotificationType.payout:
        return Icons.account_balance_wallet; // payment/earnings
      case NotificationType.payout_failed:
        return Icons.money_off;
      case NotificationType.account_warning:
        return Icons.warning_amber_rounded;
      case NotificationType.account_restriction:
        return Icons.block;
      case NotificationType.support_message:
        return Icons.headset_mic;            // support headset
    }
  }

  // Returns icon and color that further differ based on title/message content
  // when the type alone is too coarse (e.g. all order_updates look the same).
  ({IconData icon, Color color}) _getIconAndColor(AppNotification n) {
    final title = n.title.toLowerCase();
    final msg   = n.message.toLowerCase();

    // Delivery states — override order_update with more specific icons
    if (n.type == NotificationType.order || n.type == NotificationType.order_update) {
      if (title.contains('deliver') || msg.contains('deliver') ||
          title.contains('out for') || msg.contains('out for')) {
        return (icon: Icons.delivery_dining, color: const Color(0xFF3B82F6));
      }
      if (title.contains('ready') || msg.contains('ready')) {
        return (icon: Icons.check_circle_outline, color: const Color(0xFFFF7A00));
      }
      if (title.contains('prepar') || msg.contains('prepar') ||
          title.contains('cooking') || msg.contains('cooking')) {
        return (icon: Icons.outdoor_grill, color: const Color(0xFFFF7A00));
      }
      if (title.contains('picked') || msg.contains('picked') ||
          title.contains('pickup') || msg.contains('pickup')) {
        return (icon: Icons.storefront, color: const Color(0xFF10B981));
      }
      if (title.contains('complet') || msg.contains('complet') ||
          title.contains('delivered') || msg.contains('delivered')) {
        return (icon: Icons.task_alt, color: const Color(0xFF10B981));
      }
      if (title.contains('cancel') || msg.contains('cancel')) {
        return (icon: Icons.cancel_outlined, color: const Color(0xFFEF4444));
      }
      // Generic new order
      return (icon: Icons.receipt_long, color: const Color(0xFF10B981));
    }

    // Fallback to type-level mapping
    return (icon: _getNotificationIcon(n.type), color: _getNotificationColor(n.type));
  }

  Color _getNotificationColor(NotificationType type) {
    switch (type) {
      case NotificationType.order:
        return const Color(0xFF10B981); // green — new order
      case NotificationType.order_update:
        return const Color(0xFFFF7A00); // orange — ready/preparing update
      case NotificationType.order_issue:
      case NotificationType.issue_update:
      case NotificationType.issue:
        return const Color(0xFFF59E0B); // amber — issue/warning
      case NotificationType.dish:
        return const Color(0xFFFF7A00); // orange — dish/menu
      case NotificationType.promotion:
        return const Color(0xFFE94057); // red-pink — promo
      case NotificationType.system:
        return const Color(0xFFFF7A00); // orange — general/info
      case NotificationType.announcement:
        return const Color(0xFF9C27B0); // purple — broadcast
      case NotificationType.rating:
      case NotificationType.rating_reply:
        return const Color(0xFFFBBF24); // yellow-amber — star rating
      case NotificationType.payout:
        return const Color(0xFF9C27B0); // purple — payment/earnings
      case NotificationType.payout_failed:
        return const Color(0xFFEF4444); // red — failed payment
      case NotificationType.account_warning:
        return const Color(0xFFF59E0B); // amber — warning
      case NotificationType.account_restriction:
        return const Color(0xFFEF4444); // red — restriction
      case NotificationType.support_message:
        return const Color(0xFF0D9488); // teal — support reply
    }
  }

  // Translates known English order-status phrases to Arabic for RTL mode.
  String _localizeTitle(AppNotification n, bool isRTL) {
    if (!isRTL) return n.title;
    // Try text-based match first, then fall back to type
    final textResult = _localizeNotificationText(n.title, isRTL);
    if (textResult != n.title) return textResult;
    return _typeBasedTitle(n.type);
  }

  String _typeBasedTitle(NotificationType type) {
    switch (type) {
      case NotificationType.order: return 'إشعار طلب';
      case NotificationType.order_update: return 'تحديث الطلب';
      case NotificationType.order_issue: return 'مشكلة في الطلب';
      case NotificationType.rating: return 'تقييم جديد';
      case NotificationType.rating_reply: return 'رد على تقييمك';
      case NotificationType.payout: return 'مستحقات مالية';
      case NotificationType.payout_failed: return 'فشل صرف المستحقات';
      case NotificationType.promotion: return 'عرض خاص';
      case NotificationType.announcement: return 'إعلان';
      case NotificationType.system: return 'إشعار النظام';
      case NotificationType.issue: return 'مشكلة';
      case NotificationType.issue_update: return 'تحديث المشكلة';
      case NotificationType.account_warning: return 'تحذير للحساب';
      case NotificationType.account_restriction: return 'تقييد الحساب';
      case NotificationType.support_message: return 'رسالة الدعم';
      default: return 'إشعار';
    }
  }

  String _localizeMessage(AppNotification n, bool isRTL) {
    if (!isRTL) return n.message;
    // Try text-based match first (covers exact/keyword matches)
    final textResult = _localizeNotificationText(n.message, isRTL);
    if (textResult != n.message) return textResult;
    // Fall back to type-based canonical message
    return _typeBasedMessage(n.type);
  }

  String _typeBasedMessage(NotificationType type) {
    switch (type) {
      case NotificationType.order: return 'لديك تحديث على طلبك';
      case NotificationType.order_update: return 'تم تحديث حالة طلبك';
      case NotificationType.order_issue: return 'هناك مشكلة في طلبك، يرجى المراجعة';
      case NotificationType.rating: return 'وصلك تقييم جديد من أحد العملاء';
      case NotificationType.rating_reply: return 'تم الرد على تقييمك';
      case NotificationType.payout: return 'تمت معالجة مستحقاتك المالية';
      case NotificationType.payout_failed: return 'فشل صرف مستحقاتك، يرجى التحقق من بيانات الحساب';
      case NotificationType.promotion: return 'لديك عرض خاص، اضغط للتفاصيل';
      case NotificationType.announcement: return 'تحقق من آخر الإعلانات';
      case NotificationType.system: return 'رسالة من النظام';
      case NotificationType.issue: return 'تم الإبلاغ عن مشكلة في طلبك';
      case NotificationType.issue_update: return 'تم تحديث حالة المشكلة المُبلَّغ عنها';
      case NotificationType.account_warning: return 'يرجى مراجعة حسابك';
      case NotificationType.account_restriction: return 'تم تقييد حسابك مؤقتاً، تواصل مع الدعم';
      case NotificationType.support_message: return 'وصلتك رسالة جديدة من فريق الدعم';
      default: return 'اضغط لعرض التفاصيل';
    }
  }

  // Only translates recognised strings; unknown text is returned unchanged.
  String _localizeNotificationText(String text, bool isRTL) {
    if (!isRTL) return text;

    // Exact-match titles
    const Map<String, String> _exactTitles = {
      'Order Placed': 'تم تقديم الطلب',
      'Order Confirmed': 'تم تأكيد الطلب',
      'Order Accepted': 'تم قبول الطلب',
      'Order Rejected': 'تم رفض الطلب',
      'Order Declined': 'تم رفض الطلب',
      'Order Ready': 'طلبك جاهز',
      'Order Delivered': 'تم توصيل الطلب',
      'Order Cancelled': 'تم إلغاء الطلب',
      'Order Out for Delivery': 'طلبك في الطريق',
      'Order Refunded': 'تم استرداد الطلب',
      'Order Completed': 'اكتمل الطلب',
      'Order Received': 'تم استلام الطلب',
      'Order In Progress': 'الطلب قيد التحضير',
      'New Order': 'طلب جديد',
      'New Order Received': 'تم استلام طلب جديد',
      'Payment Failed': 'فشل الدفع',
      'Payment Successful': 'تمت عملية الدفع',
      'Order Pending': 'الطلب قيد الانتظار',
      'Order Preparing': 'جارٍ تحضير طلبك',
      'Order Picked Up': 'تم استلام الطلب',
      'Rating Received': 'وصلك تقييم جديد',
      'New Message': 'رسالة جديدة',
      'Offer Expired': 'انتهت صلاحية العرض',
      'Offer Updated': 'تم تحديث العرض',
      'Account Verified': 'تم التحقق من حسابك',
    };

    if (_exactTitles.containsKey(text)) return _exactTitles[text]!;

    // Keyword-based fallback — handles messages with dynamic content like order numbers
    final lower = text.toLowerCase();

    if (lower.contains('order') || lower.contains('طلب')) {
      if (lower.contains('delivered') || lower.contains('deliver')) return 'تم توصيل طلبك';
      if (lower.contains('cancelled') || lower.contains('canceled')) return 'تم إلغاء طلبك';
      if (lower.contains('confirmed') || lower.contains('accepted')) return 'تم تأكيد طلبك';
      if (lower.contains('rejected') || lower.contains('declined')) return 'تم رفض طلبك';
      if (lower.contains('ready') && lower.contains('pickup')) return 'طلبك جاهز للاستلام';
      if (lower.contains('ready')) return 'طلبك جاهز';
      if (lower.contains('out for delivery')) return 'طلبك في الطريق إليك';
      if (lower.contains('picked up')) return 'تم استلام الطلب';
      if (lower.contains('placed') || lower.contains('received')) return 'تم تقديم طلبك بنجاح';
      if (lower.contains('refunded') || lower.contains('refund')) return 'تم استرداد مبلغ طلبك';
      if (lower.contains('completed') || lower.contains('complete')) return 'اكتمل الطلب';
      if (lower.contains('in progress') || lower.contains('preparing') || lower.contains('being cooked')) return 'طلبك قيد التحضير';
      if (lower.contains('pending')) return 'طلبك قيد الانتظار';
      if (lower.contains('new')) return 'وصلك طلب جديد';
    }

    if (lower.contains('payment')) {
      if (lower.contains('failed') || lower.contains('error')) return 'فشلت عملية الدفع';
      if (lower.contains('successful') || lower.contains('success') || lower.contains('completed')) return 'تمت عملية الدفع';
    }

    if (lower.contains('rating') || lower.contains('review')) return 'وصلك تقييم جديد';
    if (lower.contains('message')) return 'وصلتك رسالة جديدة';
    if (lower.contains('account') && lower.contains('verified')) return 'تم التحقق من حسابك';
    if (lower.contains('offer') && lower.contains('expired')) return 'انتهت صلاحية العرض';

    return text;
  }

  String _formatTimeAgo(DateTime timestamp, bool isRTL) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inMinutes < 1) {
      return isRTL ? 'الآن' : 'Just now';
    } else if (difference.inMinutes < 60) {
      return isRTL
          ? 'منذ ${toArabicNumerals(difference.inMinutes.toString())} دقيقة'
          : '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return isRTL
          ? 'منذ ${toArabicNumerals(difference.inHours.toString())} ساعة'
          : '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      return isRTL
          ? 'منذ ${toArabicNumerals(difference.inDays.toString())} يوم'
          : '${difference.inDays}d ago';
    } else {
      return DateFormat('d MMM', isRTL ? 'ar' : 'en').format(timestamp);
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
