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

  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocus = FocusNode();
  String _searchQuery = '';

  // Filter / sort state — driven by the orange filter button
  String _filterMode = 'all';    // 'all' | 'unread'
  String _sortMode  = 'newest';  // 'newest' | 'oldest'

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() {
      setState(() => _searchQuery = _searchController.text.toLowerCase().trim());
    });
    _fetchInbox();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocus.dispose();
    super.dispose();
  }

  // ── Data ──────────────────────────────────────────────────────────────────

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
        // Backend: { success, data: { conversations: [...], pagination } }
        final inner = data['data'] as Map<String, dynamic>? ?? {};
        setState(() {
          _messages = inner['conversations'] as List<dynamic>? ?? [];
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

  List<dynamic> get _filtered {
    var list = List<dynamic>.from(_messages);

    // 1. Filter by unread
    if (_filterMode == 'unread') {
      list = list.where((m) {
        final int unread = ((m['unreadCount'] ?? 0) as num).toInt();
        return unread > 0;
      }).toList();
    }

    // 2. Search query
    if (_searchQuery.isNotEmpty) {
      list = list.where((m) {
        final partner = m['partner'] as Map<String, dynamic>? ?? {};
        final lastMsg = m['lastMessage'] as Map<String, dynamic>? ?? {};
        final name = (partner['name'] ?? '').toString().toLowerCase();
        final body = (lastMsg['body'] ?? '').toString().toLowerCase();
        return name.contains(_searchQuery) || body.contains(_searchQuery);
      }).toList();
    }

    // 3. Sort — API already returns newest-first; only re-sort for 'oldest'
    if (_sortMode == 'oldest') {
      list = list.reversed.toList();
    }

    return list;
  }

  // ── Filter sheet ──────────────────────────────────────────────────────────

  void _showFilterSheet() {
    // Capture current values so the sheet can start pre-selected
    String sheetFilter = _filterMode;
    String sheetSort   = _sortMode;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) {
        return StatefulBuilder(
          builder: (ctx, setSheetState) {
            return Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Drag handle
                  Center(
                    child: Container(
                      width: 40, height: 4,
                      decoration: BoxDecoration(
                        color: Colors.grey[300],
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // ── Show ─────────────────────────────────────────────
                  const Text(
                    'Show',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      _filterChip(
                        label: 'All Messages',
                        selected: sheetFilter == 'all',
                        onTap: () => setSheetState(() => sheetFilter = 'all'),
                      ),
                      const SizedBox(width: 10),
                      _filterChip(
                        label: 'Unread Only',
                        selected: sheetFilter == 'unread',
                        onTap: () => setSheetState(() => sheetFilter = 'unread'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // ── Sort ─────────────────────────────────────────────
                  const Text(
                    'Sort By',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      _filterChip(
                        label: 'Newest First',
                        selected: sheetSort == 'newest',
                        onTap: () => setSheetState(() => sheetSort = 'newest'),
                      ),
                      const SizedBox(width: 10),
                      _filterChip(
                        label: 'Oldest First',
                        selected: sheetSort == 'oldest',
                        onTap: () => setSheetState(() => sheetSort = 'oldest'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // ── Apply button ──────────────────────────────────────
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.pop(ctx);
                        setState(() {
                          _filterMode = sheetFilter;
                          _sortMode   = sheetSort;
                        });
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.accentColor,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 0,
                      ),
                      child: const Text(
                        'Apply',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _filterChip({
    required String label,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? AppTheme.accentColor : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: selected ? Colors.white : AppTheme.textSecondary,
          ),
        ),
      ),
    );
  }

  // ── Compose ───────────────────────────────────────────────────────────────

  void _openCompose() {
    final token = context.read<AuthProvider>().token ?? '';
    showModalBottomSheet<Map<String, String>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ComposeSheet(token: token),
    ).then((result) {
      if (result != null && mounted) {
        Navigator.pushNamed(context, '/message-thread', arguments: result);
      }
    });
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;

    Widget listBody;
    if (_isLoading) {
      listBody = const Center(child: CircularProgressIndicator());
    } else if (_error != null) {
      listBody = Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 48, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              _error ?? 'Error loading messages',
              style: const TextStyle(color: AppTheme.textSecondary),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _fetchInbox,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.accentColor,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    } else {
      final conversations = _filtered;
      listBody = RefreshIndicator(
        onRefresh: _fetchInbox,
        color: AppTheme.accentColor,
        child: conversations.isEmpty
            ? Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.mail_outline, size: 64, color: Colors.grey[400]),
                    const SizedBox(height: 16),
                    Text(
                      _searchQuery.isNotEmpty
                          ? (isRTL ? 'لا توجد نتائج' : 'No results found')
                          : (isRTL ? 'لا توجد رسائل بعد' : 'No messages yet'),
                      style: const TextStyle(
                          color: AppTheme.textSecondary, fontSize: 16),
                    ),
                  ],
                ),
              )
            : ListView.builder(
                padding: const EdgeInsets.fromLTRB(24, 8, 24, 100),
                itemCount: conversations.length,
                itemBuilder: (context, index) =>
                    _buildMessageCard(conversations[index], isRTL),
              ),
      );
    }

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      // Orange circular FAB — compose new message
      floatingActionButton: FloatingActionButton(
        onPressed: _openCompose,
        backgroundColor: AppTheme.accentColor,
        elevation: 4,
        shape: const CircleBorder(),
        child: const Icon(Icons.edit_outlined, color: Colors.white, size: 22),
      ),
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Header row — back arrow + title only ───────────────────────
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
                  Text(
                    isRTL ? 'مركز الرسائل' : 'Message Center',
                    style: const TextStyle(
                      color: AppTheme.textPrimary,
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      height: 1.2,
                    ),
                  ),
                ],
              ),
            ),

            // ── Search + filter row ────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 14, 24, 8),
              child: Row(
                children: [
                  // Search bar — matches Menu page design exactly
                  Expanded(
                    child: TextField(
                      controller: _searchController,
                      focusNode: _searchFocus,
                      style: const TextStyle(
                          fontSize: 14, color: AppTheme.textPrimary),
                      decoration: InputDecoration(
                        hintText:
                            isRTL ? 'بحث في الرسائل...' : 'Search messages...',
                        hintStyle: const TextStyle(
                            color: Color(0xFF969494), fontSize: 14),
                        prefixIcon: const Icon(Icons.search,
                            color: Color(0xFF969494), size: 20),
                        filled: true,
                        fillColor: const Color(0xFFE7E7E7),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide:
                              const BorderSide(color: Color(0xFFEBEBEB)),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide:
                              const BorderSide(color: Color(0xFFEBEBEB)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide:
                              const BorderSide(color: Color(0xFFEBEBEB)),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 10),
                        isDense: true,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),

                  // Orange rounded-square filter button — matches Foodie Menu page
                  GestureDetector(
                    onTap: _showFilterSheet,
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: (_filterMode != 'all' || _sortMode != 'newest')
                            ? AppTheme.accentColor
                            : AppTheme.accentColor,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                            color: AppTheme.accentColor.withValues(alpha: 0.30),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.tune,
                        color: Colors.white,
                        size: 20,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // ── List ───────────────────────────────────────────────────────
            Expanded(child: listBody),
          ],
        ),
      ),
    );
  }

  // ── Conversation card ─────────────────────────────────────────────────────

  Widget _buildMessageCard(dynamic message, bool isRTL) {
    final partner = message['partner'] as Map<String, dynamic>? ?? {};
    final lastMsg = message['lastMessage'] as Map<String, dynamic>? ?? {};
    // toString() keeps Map<String, String> for route arguments
    final from = (partner['name'] ?? 'Unknown').toString();
    final fromId = (partner['_id'] ?? '').toString();
    final body = (lastMsg['body'] ?? '').toString();
    final int unreadCount =
        ((message['unreadCount'] ?? 0) as num).toInt();
    final bool isRead = unreadCount == 0;
    final timestamp = (lastMsg['createdAt'] ?? '').toString();
    final String initial =
        from.isNotEmpty ? from[0].toUpperCase() : '?';

    return GestureDetector(
      onTap: () {
        if (fromId.isEmpty) return;
        Navigator.pushNamed(
          context,
          '/message-thread',
          arguments: <String, String>{
            'conversationId': fromId,
            'conversationName': from,
          },
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
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
            // Avatar — initial letter, orange when unread
            CircleAvatar(
              radius: 26,
              backgroundColor: !isRead
                  ? AppTheme.accentColor
                  : const Color(0xFFEEEEEE),
              child: Text(
                initial,
                style: TextStyle(
                  color: !isRead ? Colors.white : AppTheme.textSecondary,
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(width: 12),

            // Name + preview
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    from,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: !isRead
                          ? FontWeight.w700
                          : FontWeight.w500,
                      color: AppTheme.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    body.length > 55
                        ? '${body.substring(0, 55)}...'
                        : body.isEmpty
                            ? (isRTL ? 'لا توجد رسائل' : 'No messages')
                            : body,
                    style: TextStyle(
                      fontSize: 13,
                      color: !isRead
                          ? AppTheme.textPrimary
                          : AppTheme.textSecondary,
                      fontWeight: !isRead
                          ? FontWeight.w500
                          : FontWeight.w400,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),

            // Timestamp + unread badge
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  _formatTime(timestamp),
                  style: TextStyle(
                    fontSize: 11,
                    color: !isRead
                        ? AppTheme.accentColor
                        : AppTheme.textSecondary,
                    fontWeight: !isRead
                        ? FontWeight.w600
                        : FontWeight.w400,
                  ),
                ),
                if (unreadCount > 0) ...[
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppTheme.accentColor,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    constraints:
                        const BoxConstraints(minWidth: 20, minHeight: 20),
                    child: Text(
                      unreadCount > 9 ? '9+' : unreadCount.toString(),
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
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

// ─── Compose sheet ────────────────────────────────────────────────────────────
// Opened by the FAB. Fetches GET /messages/contacts (order-history contacts).
// Pops with Map<String, String> { conversationId, conversationName } on select.

class _ComposeSheet extends StatefulWidget {
  final String token;
  const _ComposeSheet({required this.token});

  @override
  State<_ComposeSheet> createState() => _ComposeSheetState();
}

class _ComposeSheetState extends State<_ComposeSheet> {
  final TextEditingController _searchController = TextEditingController();
  List<dynamic> _contacts = [];
  List<dynamic> _filtered = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_filter);
    _fetchContacts();
  }

  @override
  void dispose() {
    _searchController.removeListener(_filter);
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchContacts() async {
    try {
      final response = await http.get(
        Uri.parse(ApiConfig.messageContacts()),
        headers: {'Authorization': 'Bearer ${widget.token}'},
      );
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        // Backend: { success, data: [...contacts] }
        final list = data['data'] as List<dynamic>? ?? [];
        setState(() {
          _contacts = list;
          _filtered = list;
          _isLoading = false;
        });
      } else {
        throw Exception('Failed to load contacts');
      }
    } catch (err) {
      setState(() {
        _error = err.toString();
        _isLoading = false;
      });
    }
  }

  void _filter() {
    final q = _searchController.text.toLowerCase();
    setState(() {
      _filtered = q.isEmpty
          ? _contacts
          : _contacts.where((c) {
              final name = (c['name'] ?? '').toString().toLowerCase();
              return name.contains(q);
            }).toList();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.6,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          // Drag handle
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey[300],
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 16),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 24),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'New Message',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.textPrimary,
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Container(
              height: 44,
              decoration: BoxDecoration(
                color: const Color(0xFFD9D9D9),
                borderRadius: BorderRadius.circular(12),
              ),
              child: TextField(
                controller: _searchController,
                style: const TextStyle(
                    fontSize: 14, color: AppTheme.textPrimary),
                decoration: const InputDecoration(
                  hintText: 'Search...',
                  hintStyle:
                      TextStyle(color: Color(0xFF969494), fontSize: 14),
                  prefixIcon: Icon(Icons.search,
                      color: Color(0xFF969494), size: 20),
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  contentPadding: EdgeInsets.symmetric(vertical: 12),
                  isDense: true,
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? Center(
                        child: Text(_error!,
                            style: const TextStyle(
                                color: AppTheme.textSecondary)))
                    : _filtered.isEmpty
                        ? const Center(
                            child: Text('No contacts found',
                                style: TextStyle(
                                    color: AppTheme.textSecondary)))
                        : ListView.builder(
                            padding:
                                const EdgeInsets.symmetric(horizontal: 16),
                            itemCount: _filtered.length,
                            itemBuilder: (context, index) {
                              final contact = _filtered[index];
                              final name =
                                  (contact['name'] ?? 'Unknown').toString();
                              final id =
                                  (contact['_id'] ?? '').toString();
                              final label =
                                  (contact['label'] ?? '').toString();
                              final String initial = name.isNotEmpty
                                  ? name[0].toUpperCase()
                                  : '?';
                              return ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: AppTheme.accentColor
                                      .withValues(alpha: 0.12),
                                  child: Text(
                                    initial,
                                    style: const TextStyle(
                                      color: AppTheme.accentColor,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 16,
                                    ),
                                  ),
                                ),
                                title: Text(
                                  name,
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w500,
                                    color: AppTheme.textPrimary,
                                  ),
                                ),
                                subtitle: label.isNotEmpty
                                    ? Text(label,
                                        style: const TextStyle(
                                            fontSize: 12,
                                            color: AppTheme.textSecondary))
                                    : null,
                                onTap: () => Navigator.pop(
                                  context,
                                  <String, String>{
                                    'conversationId': id,
                                    'conversationName': name,
                                  },
                                ),
                              );
                            },
                          ),
          ),
        ],
      ),
    );
  }
}
