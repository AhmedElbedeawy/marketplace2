import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import '../../config/theme.dart';
import '../../config/api_config.dart';
import '../../providers/language_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/message.dart' as msg;

class MessageThreadScreen extends StatefulWidget {
  final String conversationId;
  final String conversationName;
  /// Optional: when navigating from an order context (cook→foodie or foodie→cook)
  /// pass these so the backend can authorize the message even when role flags are missing.
  final String? contextType;
  final String? contextId;

  const MessageThreadScreen({
    Key? key,
    required this.conversationId,
    required this.conversationName,
    this.contextType,
    this.contextId,
  }) : super(key: key);

  @override
  State<MessageThreadScreen> createState() => _MessageThreadScreenState();
}

class _MessageThreadScreenState extends State<MessageThreadScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  List<msg.Message> _messages = [];
  bool _isLoading = true;
  bool _isSending = false;
  String? _error;

  // Light peach for sent bubbles — keeps the orange brand without full saturation
  static const Color _sentBubble = Color(0xFFFFF0E8);

  @override
  void initState() {
    super.initState();
    _fetchConversation();
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  // ── Data ──────────────────────────────────────────────────────────────────

  Future<void> _fetchConversation() async {
    final authProvider = context.read<AuthProvider>();
    final token = authProvider.token;

    if (token == null) {
      setState(() {
        _error = 'Please log in to continue.';
        _isLoading = false;
      });
      return;
    }

    try {
      final response = await http.get(
        Uri.parse(ApiConfig.messageConversation(widget.conversationId)),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        // Backend: { success, data: { partner, messages: [...], pagination } }
        final inner = data['data'] as Map<String, dynamic>? ?? {};
        final messagesList = inner['messages'] as List<dynamic>? ?? [];

        setState(() {
          _messages = messagesList
              .map((m) =>
                  msg.Message.fromJson(m as Map<String, dynamic>))
              .toList();
          _isLoading = false;
        });

        // Mark messages as read (PATCH /messages/read/:partnerUserId)
        _markAsRead(token);

        // Scroll to latest after render
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (_scrollController.hasClients) {
            _scrollController.animateTo(
              _scrollController.position.maxScrollExtent,
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeOut,
            );
          }
        });
      } else {
        throw Exception('Could not load messages. Pull down to retry.');
      }
    } catch (err) {
      setState(() {
        _error = err.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _markAsRead(String token) async {
    try {
      await http.patch(
        Uri.parse(ApiConfig.messageMarkRead(widget.conversationId)),
        headers: {'Authorization': 'Bearer $token'},
      );
    } catch (_) {
      // Non-fatal — silent fail
    }
  }

  Future<void> _sendMessage() async {
    final content = _messageController.text.trim();
    if (content.isEmpty) return;

    final authProvider = context.read<AuthProvider>();
    final token = authProvider.token;

    if (token == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Please log in to continue.', style: TextStyle(color: Colors.white)),
        backgroundColor: Color(0xFFDC2626),
        behavior: SnackBarBehavior.floating,
      ));
      return;
    }

    // Defensive: bail out before the network call if the recipient is missing or
    // is the same as the current user (backend returns 400 for both — surface a
    // clear message locally instead of a vague 'Failed to send message').
    final recipientId = widget.conversationId.trim();
    final currentUserId = authProvider.user?.id?.toString() ?? '';
    if (recipientId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Recipient not found. Please try again.', style: TextStyle(color: Colors.white)),
        backgroundColor: Color(0xFFDC2626),
        behavior: SnackBarBehavior.floating,
      ));
      return;
    }
    if (currentUserId.isNotEmpty && recipientId == currentUserId) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('You can\'t send a message to yourself.', style: TextStyle(color: Colors.white)),
        backgroundColor: Color(0xFFDC2626),
        behavior: SnackBarBehavior.floating,
      ));
      return;
    }

    setState(() => _isSending = true);

    try {
      // Backend (server/controllers/messageController.js sendMessage):
      //   required: recipientId, body  (body must be non-empty after trim)
      //   optional: subject, contextType, contextId
      // Build the payload to match exactly — string-typed everywhere, no nulls.
      final payload = <String, dynamic>{
        'recipientId': recipientId,
        'subject': content.length > 50 ? content.substring(0, 50) : content,
        'body': content,
      };
      final ctxType = widget.contextType?.trim();
      final ctxId = widget.contextId?.trim();
      if (ctxType != null && ctxType.isNotEmpty) payload['contextType'] = ctxType;
      if (ctxId != null && ctxId.isNotEmpty) payload['contextId'] = ctxId;

      final response = await http.post(
        Uri.parse(ApiConfig.messageSend()),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode(payload),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        _messageController.clear();
        await _fetchConversation();
      } else {
        // Surface the real backend error so the user (and we) can see why it failed.
        String serverMessage = 'HTTP ${response.statusCode}';
        try {
          final decoded = json.decode(response.body);
          if (decoded is Map && decoded['message'] is String) {
            serverMessage = decoded['message'] as String;
          }
        } catch (_) {/* response wasn't JSON */}
        throw Exception(serverMessage);
      }
    } catch (err) {
      if (mounted) {
        final msg = err is Exception ? err.toString().replaceFirst('Exception: ', '') : err.toString();
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(msg, style: const TextStyle(color: Colors.white)),
          backgroundColor: const Color(0xFFDC2626),
          behavior: SnackBarBehavior.floating,
        ));
      }
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;
    final authProvider = context.watch<AuthProvider>();
    final currentUserId = authProvider.user?.id;

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: SafeArea(
        child: Column(
          children: [
            // ── Header ─────────────────────────────────────────────────────
            Padding(
              padding:
                  const EdgeInsets.only(top: 16, left: 24, right: 24, bottom: 8),
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
                  // Partner avatar initial
                  CircleAvatar(
                    radius: 18,
                    backgroundColor:
                        AppTheme.accentColor.withValues(alpha: 0.15),
                    child: Text(
                      widget.conversationName.isNotEmpty
                          ? widget.conversationName[0].toUpperCase()
                          : '?',
                      style: const TextStyle(
                        color: AppTheme.accentColor,
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      widget.conversationName,
                      style: const TextStyle(
                        color: AppTheme.textPrimary,
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                        height: 1.2,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),

            // Thin divider under header
            Container(
              height: 1,
              color: AppTheme.dividerColor,
            ),

            // ── Messages list ──────────────────────────────────────────────
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.error_outline,
                                  size: 48, color: Colors.grey[400]),
                              const SizedBox(height: 16),
                              Padding(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 32),
                                child: Text(
                                  _error ?? 'Error loading messages',
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(
                                      color: AppTheme.textSecondary),
                                ),
                              ),
                              const SizedBox(height: 16),
                              ElevatedButton(
                                onPressed: _fetchConversation,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppTheme.accentColor,
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(
                                      borderRadius:
                                          BorderRadius.circular(10)),
                                ),
                                child: const Text('Retry'),
                              ),
                            ],
                          ),
                        )
                      : _messages.isEmpty
                          ? Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.chat_bubble_outline,
                                      size: 64, color: Colors.grey[400]),
                                  const SizedBox(height: 16),
                                  Text(
                                    isRTL
                                        ? 'لا توجد رسائل بعد'
                                        : 'No messages yet',
                                    style: const TextStyle(
                                        color: AppTheme.textSecondary,
                                        fontSize: 16),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    isRTL
                                        ? 'ابدأ المحادثة أدناه'
                                        : 'Start the conversation below',
                                    style: const TextStyle(
                                        color: AppTheme.textSecondary,
                                        fontSize: 13),
                                  ),
                                ],
                              ),
                            )
                          : RefreshIndicator(
                              onRefresh: _fetchConversation,
                              color: AppTheme.accentColor,
                              child: ListView.builder(
                                controller: _scrollController,
                                padding: const EdgeInsets.fromLTRB(
                                    16, 16, 16, 16),
                                itemCount: _messages.length,
                                itemBuilder: (context, index) {
                                  final message = _messages[index];
                                  final isMe =
                                      message.senderId == currentUserId;
                                  // Show date separator when date changes
                                  final showDate = index == 0 ||
                                      !_sameDay(_messages[index - 1].timestamp,
                                          message.timestamp);
                                  return Column(
                                    children: [
                                      if (showDate)
                                        _buildDateSeparator(
                                            message.timestamp),
                                      _buildMessageBubble(
                                          message, isMe, isRTL),
                                    ],
                                  );
                                },
                              ),
                            ),
            ),

            // ── Input bar ─────────────────────────────────────────────────
            Container(
              padding: const EdgeInsets.symmetric(
                  horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.06),
                    blurRadius: 12,
                    offset: const Offset(0, -3),
                  ),
                ],
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  // Text input
                  Expanded(
                    child: Container(
                      constraints: const BoxConstraints(maxHeight: 120),
                      decoration: BoxDecoration(
                        color: AppTheme.backgroundColor,
                        borderRadius: BorderRadius.circular(24),
                      ),
                      child: TextField(
                        controller: _messageController,
                        maxLines: null,
                        textInputAction: TextInputAction.send,
                        onSubmitted: (_) => _sendMessage(),
                        style: const TextStyle(
                            fontSize: 14, color: AppTheme.textPrimary),
                        decoration: InputDecoration(
                          hintText: isRTL
                              ? 'اكتب رسالة...'
                              : 'Type a message...',
                          hintStyle: const TextStyle(
                              color: AppTheme.textSecondary,
                              fontSize: 14),
                          border: InputBorder.none,
                          enabledBorder: InputBorder.none,
                          focusedBorder: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 18, vertical: 10),
                          isDense: true,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  // Orange circular send button
                  GestureDetector(
                    onTap: _isSending ? null : _sendMessage,
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: _isSending
                            ? AppTheme.accentColor.withValues(alpha: 0.5)
                            : AppTheme.accentColor,
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: _isSending
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Icon(Icons.send_rounded,
                                color: Colors.white, size: 20),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  Widget _buildDateSeparator(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);
    String label;
    if (diff.inDays == 0) {
      label = 'Today';
    } else if (diff.inDays == 1) {
      label = 'Yesterday';
    } else if (diff.inDays < 7) {
      const days = [
        'Monday', 'Tuesday', 'Wednesday',
        'Thursday', 'Friday', 'Saturday', 'Sunday'
      ];
      label = days[date.weekday - 1];
    } else {
      label = '${date.day}/${date.month}/${date.year}';
    }
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Row(
        children: [
          const Expanded(child: Divider(color: Color(0xFFE0E0E0))),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 11,
                color: AppTheme.textSecondary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          const Expanded(child: Divider(color: Color(0xFFE0E0E0))),
        ],
      ),
    );
  }

  bool _sameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  Widget _buildMessageBubble(
      msg.Message message, bool isMe, bool isRTL) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        mainAxisAlignment:
            isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          // Received: small avatar initial
          if (!isMe) ...[
            CircleAvatar(
              radius: 14,
              backgroundColor: const Color(0xFFEEEEEE),
              child: Text(
                widget.conversationName.isNotEmpty
                    ? widget.conversationName[0].toUpperCase()
                    : '?',
                style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textSecondary),
              ),
            ),
            const SizedBox(width: 6),
          ],

          // Bubble
          ConstrainedBox(
            constraints: BoxConstraints(
              maxWidth: MediaQuery.of(context).size.width * 0.68,
            ),
            child: Container(
              padding: const EdgeInsets.symmetric(
                  horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                // Sent: light peach — Received: white
                color: isMe ? _sentBubble : Colors.white,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(18),
                  topRight: const Radius.circular(18),
                  bottomLeft: Radius.circular(isMe ? 18 : 4),
                  bottomRight: Radius.circular(isMe ? 4 : 18),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: isMe
                    ? CrossAxisAlignment.end
                    : CrossAxisAlignment.start,
                children: [
                  Text(
                    message.content,
                    style: const TextStyle(
                      fontSize: 14,
                      color: AppTheme.textPrimary,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _formatTime(message.timestamp),
                    style: const TextStyle(
                      fontSize: 10,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ),

          if (isMe) const SizedBox(width: 4),
        ],
      ),
    );
  }

  String _formatTime(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inMinutes < 1) {
      return 'Just now';
    } else if (diff.inHours < 1) {
      return '${diff.inMinutes}m ago';
    } else if (diff.inDays < 1) {
      // HH:MM
      final h = date.hour.toString().padLeft(2, '0');
      final m = date.minute.toString().padLeft(2, '0');
      return '$h:$m';
    } else if (diff.inDays < 7) {
      return '${diff.inDays}d ago';
    } else {
      return '${date.day}/${date.month}';
    }
  }
}
