import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import '../../config/api_config.dart';
import '../../config/theme.dart';
import '../../providers/language_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/country_provider.dart';
import '../../utils/image_url_utils.dart';
import 'cook_order_details_screen.dart';
import 'package:intl/intl.dart';


/// Inline copy-to-clipboard button.
/// Switches to a green check icon for 1.2 s on tap — no snackbar needed,
/// so the confirmation is always visible even inside a bottom sheet.
class _CopyButton extends StatefulWidget {
  final String copyValue;
  const _CopyButton({required this.copyValue});

  @override
  State<_CopyButton> createState() => _CopyButtonState();
}

class _CopyButtonState extends State<_CopyButton> {
  bool _copied = false;

  Future<void> _onTap() async {
    await Clipboard.setData(ClipboardData(text: widget.copyValue));
    if (!mounted) return;
    setState(() => _copied = true);
    await Future.delayed(const Duration(milliseconds: 1200));
    if (mounted) setState(() => _copied = false);
  }

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: _copied ? null : _onTap,
      borderRadius: BorderRadius.circular(6),
      child: Padding(
        padding: const EdgeInsets.all(4),
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 180),
          child: _copied
              ? const Icon(
                  Icons.check_circle_outline,
                  key: ValueKey('check'),
                  size: 18,
                  color: Color(0xFF16A34A),
                )
              : const Icon(
                  Icons.copy_outlined,
                  key: ValueKey('copy'),
                  size: 18,
                  color: Color(0xFF6B7280),
                ),
        ),
      ),
    );
  }
}

/// Cook Hub Orders Page - Updated with Stitch UI refinements
class CookOrdersPage extends StatefulWidget {
  const CookOrdersPage({Key? key}) : super(key: key);

  @override
  State<CookOrdersPage> createState() => _CookOrdersPageState();
}

class _CookOrdersPageState extends State<CookOrdersPage> {
  List<Map<String, dynamic>> _orders = [];
  bool _isLoading = true;
  String? _error;
  String _searchQuery = '';
  String _filterStatus = 'active'; // 'active', 'completed'
  bool _isSearchFocused = false;
  bool _isClearing = false; // Prevent expansion when clearing
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchOrders();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchOrders() async {
    final authProvider = context.read<AuthProvider>();
    final token = authProvider.token;

    if (token == null) {
      setState(() {
        _error = 'Please log in to continue.';
        _isLoading = false;
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await http.get(
        Uri.parse(ApiConfig.cookOrdersEndpoint),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);

        List<Map<String, dynamic>> orders = [];
        if (data is List) {
          orders = data.cast<Map<String, dynamic>>();
        } else if (data is Map && data.containsKey('orders')) {
          orders = (data['orders'] as List?)?.cast<Map<String, dynamic>>() ?? [];
        } else if (data is Map && data.containsKey('data')) {
          orders = (data['data'] as List?)?.cast<Map<String, dynamic>>() ?? [];
        }

        if (!mounted) return;
        setState(() {
          _orders = orders;
          _isLoading = false;
        });
      } else {
        if (!mounted) return;
        setState(() {
          _error = 'Could not load your orders. Pull down to retry.';
          _isLoading = false;
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Something went wrong. Pull down to retry.';
        _isLoading = false;
      });
    }
  }

  // Get filtered orders
  List<Map<String, dynamic>> get _filteredOrders {
    var filtered = _orders;
    
    // Filter by status category
    if (_filterStatus == 'active') {
      filtered = filtered.where((order) {
        final status = (order['status'] ?? '').toString().toLowerCase();
        return status != 'delivered' && status != 'completed' && status != 'pickedup';
      }).toList();
    } else if (_filterStatus == 'completed') {
      filtered = filtered.where((order) {
        final status = (order['status'] ?? '').toString().toLowerCase();
        return status == 'delivered' || status == 'completed' || status == 'pickedup';
      }).toList();
    }
    
    // Filter by search query - search across all visible order content
    if (_searchQuery.isEmpty) return filtered;
    
    final query = _searchQuery.toLowerCase();
    return filtered.where((order) {
      try {
        // Search in customer name
        final customerName = (order['customer']?['name'] ?? '').toString().toLowerCase();
        
        // Search in order number/ID
        final orderNumber = (order['orderNumber'] ?? order['_id'] ?? '').toString().toLowerCase();
        
        // Search in dish names from items array
        final items = (order['items'] as List?)?.cast<Map<String, dynamic>>() ?? [];
        final dishNames = items.map((item) {
          final productName = (item['productSnapshot']?['name'] ?? 
                              item['product']?['name'] ?? 
                              item['dishName'] ?? '').toString().toLowerCase();
          final notes = (item['notes'] ?? item['specialRequests'] ?? '').toString().toLowerCase();
          return '$productName $notes';
        }).join(' ');
        
        // Search in payment method
        final paymentMethod = (order['paymentMethod'] ?? order['paymentStatus'] ?? '').toString().toLowerCase();
        
        // Search in fulfillment mode
        final fulfillmentMode = (order['fulfillmentMode'] ?? order['deliveryMode'] ?? '').toString().toLowerCase();
        
        // Combine all searchable fields
        final searchableText = '$customerName $orderNumber $dishNames $paymentMethod $fulfillmentMode';
        
        return searchableText.contains(query);
      } catch (e) {
        print('⚠️ [SEARCH ERROR] Error filtering order: $e');
        return false;
      }
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;

    return RefreshIndicator(
      onRefresh: _fetchOrders,
      child: GestureDetector(
        // Tap anywhere outside search bar to unfocus
        onTap: () {
          if (_isSearchFocused) {
            setState(() => _isSearchFocused = false);
            // Unfocus the text field
            FocusScope.of(context).unfocus();
          }
        },
        behavior: HitTestBehavior.translucent,
        child: CustomScrollView(
          slivers: [
          // Search & Filter Bar - Simplified toggle (Styling matches Foodie Menu)
          SliverToBoxAdapter(
            child: Padding(
              // top: 0 — tab bar provides the 16px gap above (its bottom margin).
              // Matches Menu tab spacing exactly (same single source of truth).
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: _isSearchFocused
                  ? TextField(
                      controller: _searchController,
                      onChanged: (value) {
                        setState(() => _searchQuery = value);
                      },
                      onSubmitted: (value) {
                        setState(() => _isSearchFocused = false);
                      },
                      decoration: InputDecoration(
                        hintText: isRTL ? 'بحث...' : 'Search orders...',
                        hintStyle: const TextStyle(color: Color(0xFF969494), fontSize: 14),
                        prefixIcon: const Icon(Icons.search, color: Color(0xFF969494), size: 20),
                        suffixIcon: _searchQuery.isNotEmpty
                            ? GestureDetector(
                                onTap: () {
                                  _searchController.clear();
                                  setState(() => _searchQuery = '');
                                },
                                child: const Icon(Icons.close, color: Color(0xFF969494), size: 20),
                              )
                            : null,
                        filled: true,
                        fillColor: const Color(0xFFE7E7E7),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      ),
                    )
                  // Fixed-height Row: 48 matches TextField's rendered height
                  // (Material touch target baseline with vertical:10 padding).
                  // No IntrinsicHeight — stable, zero layout-pass overhead.
                  : SizedBox(
                      height: 48,
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _searchController,
                              onChanged: (value) {
                                setState(() => _searchQuery = value);
                              },
                              onTap: () {
                                // Don't expand if we're clearing
                                if (!_isClearing) {
                                  setState(() => _isSearchFocused = true);
                                }
                              },
                              decoration: InputDecoration(
                                hintText: isRTL ? 'بحث...' : 'Search orders...',
                                hintStyle: const TextStyle(color: Color(0xFF969494), fontSize: 14),
                                prefixIcon: const Icon(Icons.search, color: Color(0xFF969494), size: 20),
                                suffixIcon: _searchQuery.isNotEmpty
                                    ? GestureDetector(
                                        onTap: () {
                                          setState(() => _isClearing = true);
                                          _searchController.clear();
                                          setState(() {
                                            _searchQuery = '';
                                            _isClearing = false;
                                          });
                                          // Don't expand search bar when clearing
                                        },
                                        child: const Icon(Icons.close, color: Color(0xFF969494), size: 20),
                                      )
                                    : null,
                                filled: true,
                                fillColor: const Color(0xFFE7E7E7),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide.none,
                                ),
                                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                              ),
                            ),
                          ),

                          const SizedBox(width: 12),

                          // Rectangular toggle — stretches to TextField height
                          Container(
                            decoration: BoxDecoration(
                              color: const Color(0xFFE0E0E0),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                GestureDetector(
                                  onTap: () => setState(() => _filterStatus = 'active'),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                    alignment: Alignment.center,
                                    decoration: BoxDecoration(
                                      color: _filterStatus == 'active' ? Colors.white : Colors.transparent,
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      isRTL ? 'نشطة' : 'Active',
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: _filterStatus == 'active' ? FontWeight.bold : FontWeight.normal,
                                        color: _filterStatus == 'active' ? const Color(0xFFF68A2F) : const Color(0xFF5A5C5C),
                                      ),
                                    ),
                                  ),
                                ),
                                GestureDetector(
                                  onTap: () => setState(() => _filterStatus = 'completed'),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                    alignment: Alignment.center,
                                    decoration: BoxDecoration(
                                      color: _filterStatus == 'completed' ? Colors.white : Colors.transparent,
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      isRTL ? 'مكتملة' : 'Completed',
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: _filterStatus == 'completed' ? FontWeight.bold : FontWeight.normal,
                                        color: _filterStatus == 'completed' ? const Color(0xFFF68A2F) : const Color(0xFF5A5C5C),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
            ),
          ),

          // Loading skeleton — matches order card layout
          if (_isLoading)
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        children: [
                          Container(
                            width: 64,
                            height: 64,
                            decoration: BoxDecoration(
                              color: const Color(0xFFE7E7E7),
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(width: 130, height: 14, color: const Color(0xFFE7E7E7)),
                                const SizedBox(height: 8),
                                Container(width: 90, height: 12, color: const Color(0xFFE7E7E7)),
                                const SizedBox(height: 6),
                                Container(width: 70, height: 12, color: const Color(0xFFE7E7E7)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  childCount: 5,
                ),
              ),
            )
          
          // Error state
          else if (_error != null)
            SliverFillRemaining(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.error_outline, size: 48, color: Colors.grey[600]),
                    const SizedBox(height: 16),
                    Text(_error!, style: TextStyle(color: Colors.grey[600])),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: _fetchOrders,
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            )

          // Empty state
          else if (_filteredOrders.isEmpty)
            SliverFillRemaining(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.receipt_long, size: 48, color: Colors.grey[400]),
                    const SizedBox(height: 16),
                    Text(
                      _searchQuery.isNotEmpty 
                          ? (isRTL ? 'لم يتم العثور على طلبات' : 'No orders found')
                          : (isRTL ? 'لا توجد طلبات' : 'No orders yet'),
                      style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                    ),
                  ],
                ),
              ),
            )

          // Orders list
          else
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) => _buildOrderCard(context, _filteredOrders[index], isRTL),
                childCount: _filteredOrders.length,
              ),
            ),

          // Bottom padding
          const SliverToBoxAdapter(
            child: SizedBox(height: 120),
          ),
        ],
      ),
      ),
    );
  }

  Widget _buildOrderCard(BuildContext context, Map<String, dynamic> order, bool isRTL) {
    final orderId = (order['_id'] ?? order['orderNumber'] ?? '').toString();
    final shortId = orderId.length > 6
        ? '#${orderId.substring(orderId.length - 6).toUpperCase()}'
        : '#$orderId';

    DateTime orderDate;
    try {
      orderDate = DateTime.parse(order['createdAt'].toString());
    } catch (_) {
      orderDate = DateTime.now();
    }
    final timeStr = DateFormat('h:mm a').format(orderDate);
    final dateStr = DateFormat('MMM d').format(orderDate);

    final customerName =
        (order['customer'] as Map?)?['name']?.toString() ?? 'Unknown Customer';
    final totalAmount =
        (order['totalAmount'] ?? order['total'] ?? 0.0) as num;
    final status = (order['status'] ?? '').toString().toLowerCase();
    final paymentMethod =
        (order['paymentMethod'] ?? order['paymentStatus'] ?? 'card').toString();
    final fulfillmentMode =
        (order['fulfillmentMode'] ?? order['deliveryMode'] ?? 'delivery').toString();
    final isOverdue = _isOrderOverdue(order);

    final countryProvider = Provider.of<CountryProvider>(context, listen: false);
    final currencySymbol = countryProvider.getLocalizedCurrency(isRTL);

    // Safe cast — JSON decode yields Map<dynamic,dynamic>
    final items = (order['items'] as List?)
            ?.map((e) => Map<String, dynamic>.from(e as Map))
            .toList() ??
        [];
    final rawSubOrders = (order['subOrders'] as List?)
            ?.map((e) => Map<String, dynamic>.from(e as Map))
            .toList() ??
        [];

    // Status badge styling
    String statusText;
    Color statusBg, statusFg;
    switch (status) {
      case 'order_received':
        statusText = isRTL ? 'جديد' : 'NEW';
        statusBg = const Color(0xFFFFF8E1);
        statusFg = const Color(0xFFB45309);
        break;
      case 'preparing':
      case 'cooking':
        statusText = isRTL ? 'قيد التحضير' : 'Preparing';
        statusBg = const Color(0xFFFFEDD5);
        statusFg = const Color(0xFFFF7A00);
        break;
      case 'ready':
        statusText = isRTL ? 'جاهز' : 'Ready';
        statusBg = const Color(0xFFDCFCE7);
        statusFg = const Color(0xFF166534);
        break;
      case 'out_for_delivery':
        statusText = isRTL ? 'في الطريق' : 'En Route';
        statusBg = const Color(0xFFDBEAFE);
        statusFg = const Color(0xFF1E40AF);
        break;
      case 'delivered':
      case 'completed':
      case 'pickedup':
        statusText = isRTL ? 'تم' : 'Done';
        statusBg = const Color(0xFFDCFCE7);
        statusFg = const Color(0xFF166534);
        break;
      case 'cancelled':
        statusText = isRTL ? 'ملغى' : 'Cancelled';
        statusBg = const Color(0xFFFEE2E2);
        statusFg = const Color(0xFF991B1B);
        break;
      default:
        statusText = status.toUpperCase();
        statusBg = const Color(0xFFF0F0F0);
        statusFg = const Color(0xFF5A5C5C);
    }

    // Build flat list of all items (one line each).
    // Items from subOrders get the subOrder's fulfillmentMode injected so the
    // per-line chip can show it even when the item itself doesn't carry the field.
    final allItems = <Map<String, dynamic>>[];
    if (items.isNotEmpty) {
      allItems.addAll(items);
    } else if (rawSubOrders.isNotEmpty) {
      for (final sub in rawSubOrders) {
        final mode = (sub['fulfillmentMode'] ?? '').toString();
        final subItems = (sub['items'] as List?)
                ?.map((e) {
                  final it = Map<String, dynamic>.from(e as Map);
                  if (it['fulfillmentMode'] == null && mode.isNotEmpty) {
                    it['fulfillmentMode'] = mode;
                  }
                  return it;
                })
                .toList() ??
            [];
        allItems.addAll(subItems);
      }
    }

    return GestureDetector(
      onTap: () => _showActionSheet(context, order, isRTL),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
          ],
          border: Border.all(color: const Color(0xFFF0F0F0)),
        ),
        child: Column(
          children: [
            // ── Top: shortId · time, date — status badge
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 11, 14, 9),
              child: Row(
                children: [
                  Text(
                    shortId,
                    style: const TextStyle(
                      fontFamily: 'monospace',
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1F2937),
                    ),
                  ),
                  const SizedBox(width: 5),
                  Text(
                    '· $timeStr, $dateStr',
                    style: const TextStyle(
                        fontSize: 11, color: Color(0xFF9CA3AF)),
                  ),
                  const Spacer(),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: statusBg,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      statusText,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: statusFg,
                        letterSpacing: 0.3,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            Divider(height: 1, thickness: 1, color: Colors.grey[100]),

            // ── Customer name + total in orange
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 8),
              child: Row(
                children: [
                  const Icon(Icons.person_outline,
                      size: 15, color: Color(0xFF9CA3AF)),
                  const SizedBox(width: 5),
                  Expanded(
                    child: Text(
                      customerName,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF1F2937),
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Text(
                    '$currencySymbol ${totalAmount.toStringAsFixed(2)}',
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFFFF7A00),
                    ),
                  ),
                ],
              ),
            ),

            // ── One compact line per item ─────────────────────────────────
            if (allItems.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Column(
                  children: allItems
                      .map((item) => _buildItemLine(item, isRTL))
                      .toList(),
                ),
              )
            else
              const SizedBox(height: 10),

            // ── Footer: payment · fulfillment — overdue badge
            Container(
              padding: const EdgeInsets.fromLTRB(14, 8, 14, 10),
              decoration: BoxDecoration(
                border: Border(top: BorderSide(color: Colors.grey[100]!)),
              ),
              child: Row(
                children: [
                  Icon(
                    paymentMethod.toLowerCase() == 'cash'
                        ? Icons.payments_outlined
                        : Icons.credit_card_outlined,
                    size: 13,
                    color: const Color(0xFF9CA3AF),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    paymentMethod.toLowerCase() == 'cash'
                        ? (isRTL ? 'كاش' : 'Cash')
                        : (isRTL ? 'بطاقة' : 'Card'),
                    style: const TextStyle(
                        fontSize: 11, color: Color(0xFF9CA3AF)),
                  ),
                  const SizedBox(width: 10),
                  Icon(
                    fulfillmentMode.toLowerCase() == 'pickup'
                        ? Icons.takeout_dining_outlined
                        : Icons.delivery_dining_outlined,
                    size: 13,
                    color: const Color(0xFF9CA3AF),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    fulfillmentMode.toLowerCase() == 'pickup'
                        ? (isRTL ? 'استلام' : 'Pickup')
                        : (isRTL ? 'توصيل' : 'Delivery'),
                    style: const TextStyle(
                        fontSize: 11, color: Color(0xFF9CA3AF)),
                  ),
                  const Spacer(),
                  if (isOverdue)
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFB02500),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text(
                        'OVERDUE',
                        style: TextStyle(
                          fontSize: 8,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                          letterSpacing: 0.5,
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

  // ── Compact card helpers ─────────────────────────────────────────────────────

  String _getItemName(Map<String, dynamic> item) {
    return ((item['productSnapshot'] as Map?)?['name'] ??
            (item['product'] as Map?)?['name'] ??
            item['name'] ??
            item['dishName'] ??
            'Item')
        .toString();
  }

  Widget _buildDishThumbnail(Map<String, dynamic> item) {
    final raw = ((item['productSnapshot'] as Map?)?['image'] ??
            (item['product'] as Map?)?['photoUrl'] ??
            item['image'] ??
            '')
        .toString();
    final url = raw.isNotEmpty ? getAbsoluteUrl(raw) : null;
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: Container(
        width: 40,
        height: 40,
        color: const Color(0xFFF5F5F5),
        child: url != null
            ? Image.network(
                url,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => const Icon(
                  Icons.restaurant,
                  size: 20,
                  color: Color(0xFFD1D5DB),
                ),
              )
            : const Icon(Icons.restaurant, size: 20, color: Color(0xFFD1D5DB)),
      ),
    );
  }

  Widget _buildFulfillmentChip(String mode, bool isRTL) {
    final isPickup = mode == 'pickup';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: isPickup
            ? const Color(0xFFF3F4F6)
            : const Color(0xFFF0FDF4),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        isPickup ? (isRTL ? 'استلام' : 'Pickup') : (isRTL ? 'توصيل' : 'Delivery'),
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          color: isPickup ? const Color(0xFF6B7280) : const Color(0xFF16A34A),
        ),
      ),
    );
  }

  // ── One compact line per order item ─────────────────────────────────────────
  Widget _buildItemLine(Map<String, dynamic> item, bool isRTL) {
    final name = _getItemName(item);
    final qty = item['quantity'] ?? 1;
    final portion = (item['portionSize'] ??
            item['portion'] ??
            item['selectedPortion'] ??
            (item['productSnapshot'] as Map?)?['selectedPortion'])
        ?.toString();
    final mode = (item['fulfillmentMode'])?.toString().toLowerCase();

    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 4, 14, 0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          _buildDishThumbnail(item),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF374151),
                  ),
                ),
                Row(
                  children: [
                    Text(
                      'x$qty',
                      style: const TextStyle(
                          fontSize: 11, color: Color(0xFF9CA3AF)),
                    ),
                    if (portion != null && portion.isNotEmpty) ...[
                      const Text(
                        ' · ',
                        style: TextStyle(
                            fontSize: 11, color: Color(0xFF9CA3AF)),
                      ),
                      Text(
                        portion,
                        style: const TextStyle(
                            fontSize: 11, color: Color(0xFF9CA3AF)),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          if (mode != null && mode.isNotEmpty) ...[
            const SizedBox(width: 6),
            _buildFulfillmentChip(mode, isRTL),
          ],
        ],
      ),
    );
  }

  // ── Status helpers ───────────────────────────────────────────────────────────

  // Lower rank = less progress. Used to derive the order-level status from subOrders.
  int _statusRank(String s) {
    const order = [
      'order_received', 'preparing', 'cooking', 'ready',
      'out_for_delivery', 'delivered', 'completed', 'pickedup', 'cancelled',
    ];
    final idx = order.indexOf(s.toLowerCase());
    return idx == -1 ? 99 : idx;
  }

  // Derives the parent order's effective status as the least-advanced subOrder status.
  // For single-subOrder orders this equals newStatus; for multi-subOrder it tracks
  // the "still pending" status so the card badge stays accurate.
  String _deriveOrderStatus(List<Map<String, dynamic>> subOrders) {
    if (subOrders.isEmpty) return 'order_received';
    return subOrders
        .map((s) => (s['status'] ?? 'order_received').toString().toLowerCase())
        .reduce((a, b) => _statusRank(a) <= _statusRank(b) ? a : b);
  }

  bool _isOrderOverdue(Map<String, dynamic> order) {
    final status = (order['status'] ?? '').toString().toLowerCase();
    if (status == 'delivered' || status == 'completed' || status == 'cancelled') return false;
    
    try {
      final createdAt = DateTime.parse(order['createdAt']);
      final prepTime = int.tryParse(order['prepTime'].toString()) ?? 30;
      final readyBy = createdAt.add(Duration(minutes: prepTime));
      return DateTime.now().isAfter(readyBy);
    } catch (_) {
      return false;
    }
  }

  void _showActionSheet(BuildContext context, Map<String, dynamic> order, bool isRTL) {
    final status = (order['status'] ?? '').toString().toLowerCase();
    final orderId = order['_id'] ?? order['orderNumber'] ?? '';
    final subOrders = order['subOrders'] as List<dynamic>?;
    final customerPhone = order['customer']?['phone'] ?? '';
    final customerId = order['customer']?['_id']?.toString() ?? '';
    final customerName = order['customer']?['name'] ?? (isRTL ? 'الزبون' : 'Customer');
    final fulfillmentMode = (order['fulfillmentMode'] ?? order['deliveryMode'] ?? '').toString().toLowerCase();
    
    // For backward compatibility: if no subOrders array, use old approach
    final hasMultipleSubOrders = subOrders != null && subOrders.length > 1;
    
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(40)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Container(
                width: 40,
                height: 5,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
            ),
            
            // Action items - tight fit
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Column(
                children: [
                  _buildActionItem(
                    icon: Icons.visibility,
                    label: isRTL ? 'عرض تفاصيل الطلب' : 'View Order Details',
                    iconColor: const Color(0xFFF28C28),
                    bgColor: const Color(0xFFF5F5F5),
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => CookOrderDetailsScreen(
                            orderId: orderId,
                            initialOrder: order,
                          ),
                        ),
                      ).then((_) => _fetchOrders());
                    },
                  ),
                  
                  // If multiple subOrders, show actions per subOrder group
                  if (hasMultipleSubOrders) ..._buildMultiSubOrderActions(subOrders, isRTL, order: order)
                  else ..._buildSingleSubOrderActions(
                    subOrderId: subOrders != null && subOrders.isNotEmpty
                        ? (subOrders[0]['_id']?.toString() ?? '')
                        : (order['subOrderId']?.toString() ?? ''),
                    status: status,
                    fulfillmentMode: subOrders != null && subOrders.isNotEmpty
                        ? (subOrders[0]['fulfillmentMode'] ?? fulfillmentMode).toString().toLowerCase()
                        : fulfillmentMode,
                    isRTL: isRTL,
                    order: order,
                  ),
                  
                  if (customerId.isNotEmpty)
                    _buildActionItem(
                      icon: Icons.chat_bubble,
                      label: isRTL ? 'تواصل مع الزبون' : 'Contact Foodie',
                      iconColor: const Color(0xFF6B7280),
                      bgColor: const Color(0xFFF5F5F5),
                      onTap: () {
                        Navigator.pop(context);
                        Navigator.pushNamed(
                          context,
                          '/message-thread',
                          arguments: <String, dynamic>{
                            'conversationId': customerId,
                            'conversationName': customerName,
                            // Pass order context so the backend can authorize
                            // cook→foodie messaging even when isCook flag is unset
                            'contextType': 'order_contact',
                            'contextId': orderId,
                          },
                        );
                      },
                    ),
                  
                  const Divider(height: 16),

                  _buildActionItem(
                    icon: Icons.cancel,
                    label: isRTL ? 'إلغاء الطلب' : 'Cancel Order',
                    iconColor: const Color(0xFFEF4444),
                    bgColor: const Color(0xFFFEE2E2),
                    textColor: const Color(0xFFDC2626),
                    onTap: () {
                      Navigator.pop(context);
                      _showCancelDialog(
                        hasMultipleSubOrders ? null : (subOrders != null && subOrders.isNotEmpty 
                            ? (subOrders[0]['_id']?.toString() ?? '')
                            : (order['subOrderId']?.toString() ?? '')),
                        subOrders: hasMultipleSubOrders ? subOrders : null,
                      );
                    },
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  // Build actions for orders with multiple subOrders (mixed pickup/delivery)
  List<Widget> _buildMultiSubOrderActions(List<dynamic> subOrders, bool isRTL, {Map<String, dynamic>? order}) {
    final widgets = <Widget>[];
    
    for (int i = 0; i < subOrders.length; i++) {
      final subOrder = subOrders[i];
      final subOrderId = subOrder['_id']?.toString() ?? '';
      final subOrderStatus = (subOrder['status'] ?? '').toString().toLowerCase();
      final subOrderFulfillment = (subOrder['fulfillmentMode'] ?? 'pickup').toString().toLowerCase();
      
      // Add group header
      if (i > 0) widgets.add(const Divider(height: 24));
      widgets.add(
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: subOrderFulfillment == 'pickup' ? const Color(0xFF6B7280) : const Color(0xFF3B82F6),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      subOrderFulfillment == 'pickup' ? Icons.store : Icons.delivery_dining,
                      size: 12,
                      color: Colors.white,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      subOrderFulfillment == 'pickup' ? (isRTL ? 'استلام' : 'Pickup') : (isRTL ? 'توصيل' : 'Delivery'),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
      
      // Add actions for this subOrder
      widgets.addAll(_buildSingleSubOrderActions(
        subOrderId: subOrderId,
        status: subOrderStatus,
        fulfillmentMode: subOrderFulfillment,
        isRTL: isRTL,
        order: order,
      ));
    }
    
    return widgets;
  }

  // Build actions for a single subOrder — mirrors web state machine exactly:
  // order_received → preparing → ready → out_for_delivery → delivered (delivery)
  //                                     → pickedup (pickup)
  List<Widget> _buildSingleSubOrderActions({
    required String subOrderId,
    required String status,
    required String fulfillmentMode,
    required bool isRTL,
    Map<String, dynamic>? order,
  }) {
    final widgets = <Widget>[];

    // 1. order_received → preparing
    if (status == 'order_received') {
      widgets.add(
        _buildActionItem(
          icon: Icons.restaurant,
          label: isRTL ? 'علّم كجارٍ تحضيره' : 'Mark as Preparing',
          iconColor: const Color(0xFFF59E0B),
          bgColor: const Color(0xFFFEF3C7),
          onTap: () async {
            Navigator.pop(context);
            await _updateOrderStatus(subOrderId, 'preparing');
          },
        ),
      );
    }

    // 2. preparing / cooking → ready
    if (status == 'preparing' || status == 'cooking') {
      widgets.add(
        _buildActionItem(
          icon: Icons.check_circle,
          label: isRTL ? 'علّم كجاهز' : 'Mark as Ready',
          iconColor: const Color(0xFF22C55E),
          bgColor: const Color(0xFFDCFCE7),
          onTap: () async {
            Navigator.pop(context);
            await _updateOrderStatus(subOrderId, 'ready');
          },
        ),
      );
    }

    // 3a. ready + delivery → out_for_delivery
    if (status == 'ready' && fulfillmentMode == 'delivery') {
      widgets.add(
        _buildActionItem(
          icon: Icons.local_shipping,
          label: isRTL ? 'علّم كفي الطريق' : 'Mark as Out for Delivery',
          iconColor: const Color(0xFF3B82F6),
          bgColor: const Color(0xFFDBEAFE),
          onTap: () async {
            Navigator.pop(context);
            await _updateOrderStatus(subOrderId, 'out_for_delivery');
          },
        ),
      );
    }

    // 3b. ready + pickup → pickedup
    if (status == 'ready' && fulfillmentMode == 'pickup') {
      widgets.add(
        _buildActionItem(
          icon: Icons.check_circle,
          label: isRTL ? 'علّم كمستلم' : 'Mark as Picked Up',
          iconColor: const Color(0xFF22C55E),
          bgColor: const Color(0xFFDCFCE7),
          onTap: () async {
            Navigator.pop(context);
            await _updateOrderStatus(subOrderId, 'pickedup');
          },
        ),
      );
    }

    // 4. out_for_delivery → delivered
    if (status == 'out_for_delivery') {
      widgets.add(
        _buildActionItem(
          icon: Icons.check_circle,
          label: isRTL ? 'علّم كمسلم' : 'Mark as Delivered',
          iconColor: const Color(0xFF22C55E),
          bgColor: const Color(0xFFDCFCE7),
          onTap: () async {
            Navigator.pop(context);
            await _updateOrderStatus(subOrderId, 'delivered');
          },
        ),
      );
    }

    // View Shipping Details — delivery orders only
    if (fulfillmentMode == 'delivery') {
      widgets.add(
        _buildActionItem(
          icon: Icons.location_on,
          label: isRTL ? 'عرض تفاصيل الشحن' : 'View Shipping Details',
          iconColor: const Color(0xFF3B82F6),
          bgColor: const Color(0xFFDBEAFE),
          onTap: () {
            Navigator.pop(context);
            _showShippingDetailsSheet(context, order, isRTL);
          },
        ),
      );
    }

    return widgets;
  }

  void _showShippingDetailsSheet(BuildContext context, Map<String, dynamic>? order, bool isRTL) {
    final _rawDelivery = order?['deliveryAddress'];
    final delivery = _rawDelivery != null ? Map<String, dynamic>.from(_rawDelivery as Map) : null;
    final customerName = order?['customer']?['name']?.toString() ?? (isRTL ? 'غير معروف' : 'Unknown');
    final customerPhone = order?['customer']?['phone']?.toString() ?? '';

    final addressLine1 = delivery?['addressLine1']?.toString() ?? '';
    final addressLine2 = delivery?['addressLine2']?.toString() ?? '';
    final city = delivery?['city']?.toString() ?? '';
    final rawCountry = delivery?['countryCode']?.toString() ?? '';
    final countryDisplay = _resolveCountryName(rawCountry);
    final label = delivery?['label']?.toString() ?? '';
    final deliveryNotes = delivery?['deliveryNotes']?.toString() ?? '';
    // lat/lng are top-level fields on deliveryAddress (NOT nested under 'location')
    final lat = (delivery?['lat'] as num?)?.toDouble();
    final lng = (delivery?['lng'] as num?)?.toDouble();
    final hasValidCoords = lat != null && lng != null && !(lat == 0.0 && lng == 0.0);

    // Build the address block exactly as the user entered it — no inline field labels.
    // Order: Label / Line 1 / Line 2 / "City, Country"
    final addressLines = <String>[];
    if (label.isNotEmpty) addressLines.add(label);
    if (addressLine1.isNotEmpty) addressLines.add(addressLine1);
    if (addressLine2.isNotEmpty) addressLines.add(addressLine2);
    final cityCountry = [city, countryDisplay].where((s) => s.isNotEmpty).join(', ');
    if (cityCountry.isNotEmpty) addressLines.add(cityCountry);
    final addressBlock = addressLines.join('\n');
    // Single-line copy payload for clipboard
    final addressClipboard = addressLines.join(', ');

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Drag handle
            Center(
              child: Container(
                width: 40,
                height: 5,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              isRTL ? 'تفاصيل الشحن' : 'Shipping Details',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),

            // Name (no copy icon)
            _buildShippingRow(isRTL ? 'الاسم الكامل' : 'Full Name', customerName),

            // Phone — value with trailing copy icon
            if (customerPhone.isNotEmpty)
              _buildShippingRowWithCopy(
                label: isRTL ? 'رقم الهاتف' : 'Phone',
                value: customerPhone,
                copyValue: customerPhone,
                isRTL: isRTL,
              ),

            // Single address block — no per-field inline labels
            if (addressBlock.isNotEmpty)
              _buildShippingRowWithCopy(
                label: isRTL ? 'العنوان' : 'Address',
                value: addressBlock,
                copyValue: addressClipboard,
                isRTL: isRTL,
              ),

            // Delivery notes — only if present
            if (deliveryNotes.isNotEmpty)
              _buildShippingRow(isRTL ? 'ملاحظات التوصيل' : 'Delivery Notes', deliveryNotes),

            // Map button — kept entirely separate from address block
            if (hasValidCoords) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  icon: const Icon(Icons.map_outlined),
                  label: Text(isRTL ? 'عرض على الخريطة' : 'View on Map'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppTheme.accentColor,
                    side: const BorderSide(color: AppTheme.accentColor),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  onPressed: () async {
                    final uri = Uri.parse('https://www.google.com/maps?q=${lat!},${lng!}');
                    if (await canLaunchUrl(uri)) {
                      await launchUrl(uri, mode: LaunchMode.externalApplication);
                    }
                  },
                ),
              ),
            ],
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  /// Row with the value followed by a copy-to-clipboard icon button.
  /// Confirmation is shown inline (icon → checkmark) so it is always visible
  /// even when this row is inside a bottom sheet.
  Widget _buildShippingRowWithCopy({
    required String label,
    required String value,
    required String copyValue,
    required bool isRTL,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280))),
          const SizedBox(height: 2),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  value,
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500, height: 1.35),
                ),
              ),
              const SizedBox(width: 8),
              _CopyButton(copyValue: copyValue),
            ],
          ),
        ],
      ),
    );
  }

  /// Maps ISO-2 country codes to human-readable names for the Shipping Details sheet.
  /// If the stored value is already a full name (length > 2), it is returned as-is.
  String _resolveCountryName(String raw) {
    if (raw.isEmpty) return '';
    // Already a full name (e.g., "EGYPT", "Saudi Arabia")
    if (raw.length > 2) return raw;
    const codes = <String, String>{
      'SA': 'Saudi Arabia',
      'AE': 'UAE',
      'EG': 'Egypt',
      'KW': 'Kuwait',
      'BH': 'Bahrain',
      'QA': 'Qatar',
      'OM': 'Oman',
      'JO': 'Jordan',
      'LB': 'Lebanon',
      'GB': 'United Kingdom',
      'US': 'United States',
      'DE': 'Germany',
      'FR': 'France',
      'TR': 'Turkey',
      'MA': 'Morocco',
      'TN': 'Tunisia',
      'DZ': 'Algeria',
    };
    return codes[raw.toUpperCase()] ?? raw;
  }

  Widget _buildShippingRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280))),
          const SizedBox(height: 2),
          Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Widget _buildActionItem({
    required IconData icon,
    required String label,
    required Color iconColor,
    required Color bgColor,
    Color? textColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Icon(icon, color: iconColor, size: 22),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: textColor ?? const Color(0xFF2D2F2F),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showCancelDialog(String? subOrderId, {List<dynamic>? subOrders}) {
    // If multiple subOrders, show selector
    if (subOrders != null && subOrders.length > 1) {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Cancel Order Group'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: subOrders.map((sub) {
              final subId = sub['_id']?.toString() ?? '';
              final fulfillment = (sub['fulfillmentMode'] ?? 'pickup').toString().toLowerCase();
              return ListTile(
                leading: Icon(
                  fulfillment == 'pickup' ? Icons.store : Icons.delivery_dining,
                  color: fulfillment == 'pickup' ? const Color(0xFF6B7280) : const Color(0xFF3B82F6),
                ),
                title: Text(fulfillment == 'pickup' ? 'Cancel Pickup' : 'Cancel Delivery'),
                onTap: () {
                  Navigator.pop(context);
                  _confirmCancel(subId);
                },
              );
            }).toList(),
          ),
        ),
      );
    } else if (subOrderId != null && subOrderId.isNotEmpty) {
      _confirmCancel(subOrderId);
    }
  }

  void _confirmCancel(String subOrderId) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel Order'),
        content: const Text('Are you sure you want to cancel this order?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('No'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              await _updateOrderStatus(subOrderId, 'cancelled');
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFEF4444),
            ),
            child: const Text('Yes, Cancel'),
          ),
        ],
      ),
    );
  }

  Future<void> _updateOrderStatus(String orderId, String newStatus) async {
    final authProvider = context.read<AuthProvider>();
    final token = authProvider.token;

    if (token == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please log in to continue.', style: TextStyle(color: Colors.white)),
          backgroundColor: Color(0xFFDC2626),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    try {
      final response = await http.put(
        Uri.parse('${ApiConfig.baseUrl}/orders/sub-order/$orderId/status'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode({'status': newStatus}),
      );

      if (!mounted) return;

      if (response.statusCode == 200) {
        // ── Optimistic local state update ──────────────────────────────────
        // JSON-decoded maps are Map<dynamic,dynamic>; convert with .from() to
        // avoid the '_Map<dynamic,dynamic>' is not a subtype crash on spread.
        // Also sync order-level status so the card badge updates immediately.
        setState(() {
          _orders = _orders.map((order) {
            final o = Map<String, dynamic>.from(order);

            if (o['subOrders'] != null && (o['subOrders'] as List).isNotEmpty) {
              final updatedSubOrders = (o['subOrders'] as List).map((sub) {
                final s = Map<String, dynamic>.from(sub as Map);
                return s['_id'] == orderId
                    ? <String, dynamic>{...s, 'status': newStatus}
                    : s;
              }).toList();

              // Derive order-level status from least-advanced subOrder so the
              // card badge stays accurate without a network round-trip.
              final derivedStatus = _deriveOrderStatus(updatedSubOrders);

              return <String, dynamic>{
                ...o,
                'status': derivedStatus,
                'subOrders': updatedSubOrders,
              };
            }

            // Flat order (no subOrders array) — update directly.
            if (o['_id'] == orderId || o['orderId'] == orderId) {
              return <String, dynamic>{...o, 'status': newStatus};
            }
            return o;
          }).toList();
        });

        // ── Success snackbar — green background + white text ──────────────
        final statusLabel = {
          'preparing': 'Preparing',
          'cooking': 'Preparing',
          'ready': 'Ready',
          'out_for_delivery': 'Out for Delivery',
          'delivered': 'Delivered',
          'pickedup': 'Picked Up',
          'cancelled': 'Cancelled',
        }[newStatus] ?? newStatus;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Order updated: $statusLabel',
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w600,
              ),
            ),
            duration: const Duration(seconds: 2),
            backgroundColor: const Color(0xFF16A34A),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            elevation: 8,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text(
              'Could not update the order. Please try again.',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w600,
              ),
            ),
            duration: const Duration(seconds: 2),
            backgroundColor: const Color(0xFFDC2626),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            elevation: 8,
          ),
        );
      }
    } catch (e) {
      print('❌ [ORDER UPDATE] Error: $e');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text(
            'Could not update the order. Please try again.',
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w600,
            ),
          ),
          duration: const Duration(seconds: 2),
          backgroundColor: const Color(0xFFDC2626),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          elevation: 8,
        ),
      );
    }
  }
}