import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import '../../config/theme.dart';
import '../../config/api_config.dart';
import '../../providers/language_provider.dart';
import '../../providers/auth_provider.dart';

class MessagesScreen extends StatefulWidget {
  const MessagesScreen({Key? key}) : super(key: key);

  @override
  State<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends State<MessagesScreen> {
  List<dynamic> _messages = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchInbox();
  }

  Future<void> _fetchInbox() async {
    final authProvider = context.read<AuthProvider>();
    final token = authProvider.token;

    if (token == null) {
      setState(() {
        _error = 'Not authenticated';
        _isLoading = false;
      });
      return;
    }

    try {
      final response = await http.get(
        Uri.parse(ApiConfig.messageInbox()),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        setState(() {
          _messages = data['data'] ?? data ?? [];
          _isLoading = false;
        });
      } else {
        throw Exception('Failed to load messages');
      }
    } catch (err) {
      setState(() {
        _error = err.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;

    if (_isLoading) {
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
            isRTL ? 'الرسائل' : 'Messages',
            style: const TextStyle(
              color: AppTheme.textPrimary,
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null) {
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
            isRTL ? 'الرسائل' : 'Messages',
            style: const TextStyle(
              color: AppTheme.textPrimary,
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 48, color: Colors.grey[400]),
              const SizedBox(height: 16),
              Text(
                _error ?? 'Error loading messages',
                style: const TextStyle(color: AppTheme.textSecondary),
              ),
            ],
          ),
        ),
      );
    }

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
          isRTL ? 'الرسائل' : 'Messages',
          style: const TextStyle(
            color: AppTheme.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _fetchInbox,
        child: _messages.isEmpty
            ? Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.mail_outline,
                      size: 64,
                      color: Colors.grey[400],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      isRTL ? 'لا توجد رسائل بعد' : 'No messages yet',
                      style: const TextStyle(
                        color: AppTheme.textSecondary,
                        fontSize: 16,
                      ),
                    ),
                  ],
                ),
              )
            : ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: _messages.length,
                itemBuilder: (context, index) {
                  final message = _messages[index];
                  return _buildMessageCard(message, isRTL);
                },
              ),
      ),
    );
  }

  Widget _buildMessageCard(dynamic message, bool isRTL) {
    final subject = isRTL
        ? (message['subjectAr'] ?? message['subject'] ?? '')
        : (message['subject'] ?? message['subjectAr'] ?? '');
    final body = isRTL
        ? (message['bodyAr'] ?? message['body'] ?? '')
        : (message['body'] ?? message['bodyAr'] ?? '');
    final from = message['fromName'] ?? message['from'] ?? 'Unknown';
    final fromId =
        message['fromId'] ?? message['senderId'] ?? message['_id'] ?? '';
    final isRead = message['isRead'] ?? false;
    final timestamp = message['createdAt'] ?? '';

    return GestureDetector(
      onTap: () {
        Navigator.pushNamed(
          context,
          '/message-thread',
          arguments: {
            'conversationId': fromId,
            'conversationName': from,
          },
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
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
        child: Row(
          children: [
            CircleAvatar(
              radius: 24,
              backgroundColor: isRead
                  ? AppTheme.dividerColor
                  : AppTheme.accentColor.withValues(alpha: 0.1),
              child: Icon(
                isRead ? Icons.person : Icons.markunread_mailbox,
                color: isRead ? AppTheme.textSecondary : AppTheme.accentColor,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    from,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  if (subject.isNotEmpty)
                    Text(
                      subject,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                  if (subject.isEmpty || body.isNotEmpty)
                    Text(
                      body.length > 50 ? '${body.substring(0, 50)}...' : body,
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppTheme.textSecondary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  _formatTime(timestamp),
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppTheme.textSecondary,
                  ),
                ),
                if (!isRead)
                  Container(
                    margin: const EdgeInsets.only(top: 4),
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: AppTheme.accentColor,
                      shape: BoxShape.circle,
                    ),
                  ),
              ],
            ),
          ],
        ),
      ), // End GestureDetector
    ); // End method
  }

  String _formatTime(String dateString) {
    if (dateString.isEmpty) return '';
    try {
      final date = DateTime.parse(dateString);
      final now = DateTime.now();
      final diff = now.difference(date);

      if (diff.inMinutes < 60) {
        return '${diff.inMinutes}m';
      } else if (diff.inHours < 24) {
        return '${diff.inHours}h';
      } else if (diff.inDays < 7) {
        return '${diff.inDays}d';
      } else {
        return '${date.day}/${date.month}';
      }
    } catch (e) {
      return '';
    }
  }
}
