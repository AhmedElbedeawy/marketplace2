import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/language_provider.dart';
import '../../providers/notification_provider.dart';

class AnnouncementDetailsScreen extends StatefulWidget {
  final String announcementId;

  const AnnouncementDetailsScreen({
    super.key,
    required this.announcementId,
  });

  @override
  State<AnnouncementDetailsScreen> createState() => _AnnouncementDetailsScreenState();
}

class _AnnouncementDetailsScreenState extends State<AnnouncementDetailsScreen> {
  bool _isLoading = true;
  String _title = '';
  String _message = '';
  String _error = '';

  @override
  void initState() {
    super.initState();
    _loadAnnouncementDetails();
  }

  Future<void> _loadAnnouncementDetails() async {
    try {
      final notificationProvider = Provider.of<NotificationProvider>(
        context,
        listen: false,
      );

      // Find the notification by ID
      final notification = notificationProvider.notifications.firstWhere(
        (n) => n.id == widget.announcementId,
        orElse: () => throw Exception('Announcement not found'),
      );

      setState(() {
        _title = notification.title;
        _message = notification.message;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load announcement details';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = Provider.of<LanguageProvider>(context);
    final isRTL = languageProvider.isArabic;

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          isRTL ? 'تفاصيل الإعلان' : 'Announcement Details',
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.accentColor))
          : _error.isNotEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.error_outline, size: 64, color: Colors.grey[400]),
                      const SizedBox(height: 16),
                      Text(
                        _error,
                        style: const TextStyle(
                          fontSize: 16,
                          color: Color(0xFF7D7C7C),
                        ),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadAnnouncementDetails,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.accentColor,
                        ),
                        child: Text(
                          isRTL ? 'إعادة المحاولة' : 'Retry',
                          style: const TextStyle(color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Title
                      Text(
                        _title,
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 16),
                      // Message body
                      Text(
                        _message,
                        style: const TextStyle(
                          fontSize: 16,
                          height: 1.6,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
    );
  }
}
