import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/language_provider.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({Key? key}) : super(key: key);

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  bool _orderUpdates = true;
  bool _promotions = true;
  bool _newMessages = true;
  bool _newsletter = false;
  bool _soundEnabled = true;
  bool _vibrationEnabled = true;

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.white,
        leading: IconButton(
          icon: Icon(
            isRTL ? Icons.arrow_forward : Icons.arrow_back,
            color: AppTheme.textPrimary,
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          isRTL ? 'الإشعارات' : 'Notifications',
          style: const TextStyle(
            color: AppTheme.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildSection(
            isRTL ? 'إشعارات التطبيق' : 'App Notifications',
            [
              _buildSwitchTile(
                isRTL ? 'تحديثات الطلب' : 'Order Updates',
                isRTL ? 'احصل على إشعارات حول حالة طلبك' : 'Get notified about your order status',
                _orderUpdates,
                (value) => setState(() => _orderUpdates = value),
              ),
              _buildSwitchTile(
                isRTL ? 'العروض الترويجية' : 'Promotions',
                isRTL ? 'تلقي العروض والخصومات الخاصة' : 'Receive special offers and discounts',
                _promotions,
                (value) => setState(() => _promotions = value),
              ),
              _buildSwitchTile(
                isRTL ? 'الرسائل الجديدة' : 'New Messages',
                isRTL ? 'الحصول على إشعارات للرسائل الجديدة' : 'Get notified of new messages',
                _newMessages,
                (value) => setState(() => _newMessages = value),
              ),
              _buildSwitchTile(
                isRTL ? 'النشرة الإخبارية' : 'Newsletter',
                isRTL ? 'تلقي التحديثات والأخبار' : 'Receive updates and news',
                _newsletter,
                (value) => setState(() => _newsletter = value),
              ),
            ],
          ),
          const SizedBox(height: 20),
          _buildSection(
            isRTL ? 'إعدادات الإشعار' : 'Notification Settings',
            [
              _buildSwitchTile(
                isRTL ? 'الصوت' : 'Sound',
                isRTL ? 'تشغيل الصوت للإشعارات' : 'Play sound for notifications',
                _soundEnabled,
                (value) => setState(() => _soundEnabled = value),
              ),
              _buildSwitchTile(
                isRTL ? 'الاهتزاز' : 'Vibration',
                isRTL ? 'اهتز عند الإشعارات' : 'Vibrate on notifications',
                _vibrationEnabled,
                (value) => setState(() => _vibrationEnabled = value),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSection(String title, List<Widget> children) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(
            title,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppTheme.textSecondary,
            ),
          ),
        ),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(children: children),
        ),
      ],
    );
  }

  Widget _buildSwitchTile(
    String title,
    String subtitle,
    bool value,
    Function(bool) onChanged,
  ) {
    return SwitchListTile(
      title: Text(
        title,
        style: const TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w500,
          color: AppTheme.textPrimary,
        ),
      ),
      subtitle: Text(
        subtitle,
        style: const TextStyle(
          fontSize: 12,
          color: AppTheme.textSecondary,
        ),
      ),
      value: value,
      onChanged: onChanged,
      activeTrackColor: AppTheme.accentColor,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
    );
  }
}
