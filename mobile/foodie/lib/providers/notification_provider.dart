import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';

class NotificationProvider extends ChangeNotifier {
  List<AppNotification> _notifications = [];
  bool _isLoading = false;
  String? _error;

  List<AppNotification> get notifications => _notifications;
  
  int get unreadCount => _notifications.where((n) => !n.isRead).length;
  
  bool get isLoading => _isLoading;
  
  String? get error => _error;

  // Get API URL from config
  String get _baseUrl => ApiConfig.baseUrl;

  // Helper to get auth token
  Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_token');
  }

  // Helper for API headers
  Future<Map<String, String>> _getHeaders() async {
    final token = await _getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  // Fetch notifications from API
  Future<void> fetchNotifications({int page = 1, bool unreadOnly = false}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final headers = await _getHeaders();
      final queryParams = {
        'page': page.toString(),
        'limit': '20',
        if (unreadOnly) 'unreadOnly': 'true',
      };
      
      final uri = Uri.parse('$_baseUrl/notifications')
          .replace(queryParameters: queryParams);

      final response = await http.get(uri, headers: headers);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final notificationsJson = data['data']['notifications'] as List;
        
        if (page == 1) {
          _notifications = notificationsJson
              .map((json) => AppNotification.fromJson(json))
              .toList();
        } else {
          _notifications.addAll(
            notificationsJson.map((json) => AppNotification.fromJson(json)).toList()
          );
        }
      } else {
        _error = 'Failed to fetch notifications';
      }
    } catch (e) {
      _error = 'Error connecting to server';
      print('Notification fetch error: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Mark a notification as read
  Future<bool> markAsRead(String id) async {
    try {
      final headers = await _getHeaders();
      final response = await http.patch(
        Uri.parse('$_baseUrl/notifications/$id/read'),
        headers: headers,
        body: json.encode({}),
      );

      if (response.statusCode == 200) {
        final index = _notifications.indexWhere((n) => n.id == id);
        if (index != -1) {
          _notifications[index].isRead = true;
          notifyListeners();
        }
        return true;
      }
      return false;
    } catch (e) {
      print('Mark as read error: $e');
      return false;
    }
  }

  // Mark all notifications as read
  Future<bool> markAllAsRead() async {
    try {
      final headers = await _getHeaders();
      final response = await http.patch(
        Uri.parse('$_baseUrl/notifications/read-all'),
        headers: headers,
        body: json.encode({}),
      );

      if (response.statusCode == 200) {
        for (final notification in _notifications) {
          notification.isRead = true;
        }
        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      print('Mark all as read error: $e');
      return false;
    }
  }

  // Delete a notification
  Future<bool> deleteNotification(String id) async {
    try {
      final headers = await _getHeaders();
      final response = await http.delete(
        Uri.parse('$_baseUrl/notifications/$id'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        _notifications.removeWhere((n) => n.id == id);
        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      print('Delete notification error: $e');
      return false;
    }
  }

  // Update FCM token
  Future<bool> updateFCMToken(String token) async {
    try {
      final headers = await _getHeaders();
      final response = await http.post(
        Uri.parse('$_baseUrl/notifications/fcm-token'),
        headers: headers,
        body: json.encode({'fcmToken': token}),
      );
      return response.statusCode == 200;
    } catch (e) {
      print('Update FCM token error: $e');
      return false;
    }
  }

  // Get notification settings
  Future<NotificationSettings> getSettings() async {
    try {
      final headers = await _getHeaders();
      final response = await http.get(
        Uri.parse('$_baseUrl/notifications/settings'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return NotificationSettings.fromJson(data['data']);
      }
      return NotificationSettings.defaults();
    } catch (e) {
      print('Get settings error: $e');
      return NotificationSettings.defaults();
    }
  }

  // Update notification settings
  Future<bool> updateSettings(NotificationSettings settings) async {
    try {
      final headers = await _getHeaders();
      final response = await http.put(
        Uri.parse('$_baseUrl/notifications/settings'),
        headers: headers,
        body: json.encode(settings.toJson()),
      );
      return response.statusCode == 200;
    } catch (e) {
      print('Update settings error: $e');
      return false;
    }
  }

  // Handle notification tap - navigate using deepLink
  void handleNotificationTap(BuildContext context, AppNotification notification) async {
    // Mark as read (don't await - it's background)
    markAsRead(notification.id);
    
    // Navigate based on deepLink
    if (notification.deepLink != null && notification.deepLink!.isNotEmpty) {
      final deepLink = notification.deepLink!;
      
      // Parse deepLink and navigate
      if (deepLink.startsWith('/orders/')) {
        // Order details: /orders/:orderId
        final orderId = deepLink.replaceFirst('/orders/', '');
        Navigator.pushNamed(context, '/order-details', arguments: orderId);
      } else if (deepLink == '/cook/reviews') {
        Navigator.pushNamed(context, '/cook/reviews');
      } else if (deepLink == '/cook/payouts') {
        Navigator.pushNamed(context, '/cook/payouts');
      } else if (deepLink.startsWith('/support/messages')) {
        Navigator.pushNamed(context, '/support/messages');
      } else if (deepLink.startsWith('/cook/')) {
        // Cook profile/menu: /cook/:id/menu
        final cookId = deepLink.replaceFirst('/cook/', '').replaceFirst('/menu', '');
        Navigator.pushNamed(context, '/foodie/kitchen/$cookId');
      } else if (deepLink == '/offers') {
        // Offers page
        Navigator.pushNamed(context, '/offers');
      } else if (deepLink == '/cook/account-status') {
        // Cook account status
        Navigator.pushNamed(context, '/cook/account-status');
      } else if (deepLink == '/account/suspension') {
        // Suspension details
        Navigator.pushNamed(context, '/suspension-details');
      } else if (deepLink.startsWith('/announcements/')) {
        // Announcement details
        final announcementId = deepLink.replaceFirst('/announcements/', '');
        Navigator.pushNamed(context, '/announcement-details', arguments: announcementId);
      } else if (deepLink.startsWith('/admin/issues/')) {
        // Admin issue details (admin only)
        final issueId = deepLink.replaceFirst('/admin/issues/', '');
        Navigator.pushNamed(context, '/admin/issues/$issueId');
      } else if (deepLink == '/admin/issues') {
        // Admin issues list
        Navigator.pushNamed(context, '/admin/issues');
      } else {
        // Default: navigate to home
        Navigator.pushNamedAndRemoveUntil(context, '/home', (route) => false);
      }
    } else {
      // No deepLink - go to notifications screen
      Navigator.pushNamed(context, '/notifications');
    }
  }
}

enum NotificationType {
  order,
  dish,
  promotion,
  system,
  issue,
  announcement,
  rating,
  rating_reply,
  payout,
  payout_failed,
  order_update,
  order_issue,
  issue_update,
  account_warning,
  account_restriction,
  support_message,
}

class AppNotification {
  final String id;
  final String title;
  final String message;
  final DateTime timestamp;
  bool isRead;
  final NotificationType type;
  final String? deepLink;
  final String? entityType;
  final String? entityId;

  AppNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.timestamp,
    this.isRead = false,
    required this.type,
    this.deepLink,
    this.entityType,
    this.entityId,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['_id'] ?? json['id'] ?? '',
      title: json['title'] ?? '',
      message: json['message'] ?? '',
      timestamp: json['createdAt'] != null 
          ? DateTime.parse(json['createdAt']) 
          : DateTime.now(),
      isRead: json['isRead'] ?? false,
      type: _parseNotificationType(json['type'] ?? 'system'),
      deepLink: json['deepLink'],
      entityType: json['entityType'],
      entityId: json['entityId']?.toString(),
    );
  }

  static NotificationType _parseNotificationType(String type) {
    switch (type.toLowerCase()) {
      case 'order':
        return NotificationType.order;
      case 'dish':
        return NotificationType.dish;
      case 'promotion':
        return NotificationType.promotion;
      case 'issue':
        return NotificationType.issue;
      case 'announcement':
        return NotificationType.announcement;
      case 'rating':
        return NotificationType.rating;
      case 'rating_reply':
        return NotificationType.rating_reply;
      case 'payout':
        return NotificationType.payout;
      case 'payout_failed':
        return NotificationType.payout_failed;
      case 'order_update':
        return NotificationType.order_update;
      case 'order_issue':
        return NotificationType.order_issue;
      case 'issue_update':
        return NotificationType.issue_update;
      case 'account_warning':
        return NotificationType.account_warning;
      case 'account_restriction':
        return NotificationType.account_restriction;
      case 'support_message':
        return NotificationType.support_message;
      default:
        return NotificationType.system;
    }
  }
}

class NotificationSettings {
  bool pushEnabled;
  bool emailEnabled;
  bool orderNotifications;
  bool promotionNotifications;
  bool favoriteCookNotifications;
  bool systemNotifications;

  NotificationSettings({
    required this.pushEnabled,
    required this.emailEnabled,
    required this.orderNotifications,
    required this.promotionNotifications,
    required this.favoriteCookNotifications,
    required this.systemNotifications,
  });

  factory NotificationSettings.defaults() {
    return NotificationSettings(
      pushEnabled: true,
      emailEnabled: false,
      orderNotifications: true,
      promotionNotifications: true,
      favoriteCookNotifications: true,
      systemNotifications: true,
    );
  }

  factory NotificationSettings.fromJson(Map<String, dynamic> json) {
    final settings = json['settings'] ?? json;
    return NotificationSettings(
      pushEnabled: settings['pushEnabled'] ?? true,
      emailEnabled: settings['emailEnabled'] ?? false,
      orderNotifications: settings['orderNotifications'] ?? true,
      promotionNotifications: settings['promotionNotifications'] ?? true,
      favoriteCookNotifications: settings['favoriteCookNotifications'] ?? true,
      systemNotifications: settings['systemNotifications'] ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'pushEnabled': pushEnabled,
      'emailEnabled': emailEnabled,
      'orderNotifications': orderNotifications,
      'promotionNotifications': promotionNotifications,
      'favoriteCookNotifications': favoriteCookNotifications,
      'systemNotifications': systemNotifications,
    };
  }
}
