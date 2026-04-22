import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/language_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/order_provider.dart';
import '../../models/order.dart';
import 'review_submission_screen.dart';

class CookOrderSelectionScreen extends StatefulWidget {
  final String cookId;
  final String? cookName;

  const CookOrderSelectionScreen({
    Key? key,
    required this.cookId,
    this.cookName,
  }) : super(key: key);

  @override
  State<CookOrderSelectionScreen> createState() => _CookOrderSelectionScreenState();
}

class _CookOrderSelectionScreenState extends State<CookOrderSelectionScreen> {
  List<Order> _eligibleOrders = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadEligibleOrders();
  }

  Future<void> _loadEligibleOrders() async {
    final orderProvider = Provider.of<OrderProvider>(context, listen: false);
    final authProvider = Provider.of<AuthProvider>(context, listen: false);

    try {
      // Fetch orders if not already loaded
      if (orderProvider.orders.isEmpty && authProvider.token != null) {
        await orderProvider.fetchOrders(authProvider.token!);
      }

      // Filter to completed orders with items from this cook
      debugPrint('🔍 CookOrderSelection: Filtering orders for cook ${widget.cookId}');
      debugPrint('🔍 Total orders in provider: ${orderProvider.orders.length}');
      
      final eligibleOrders = orderProvider.orders.where((order) {
        // Must be completed/delivered/pickedup
        if (!['completed', 'delivered', 'pickedup'].contains(order.status.toLowerCase())) {
          return false;
        }

        // Must have items from this cook
        bool hasCookItems = false;
        for (final subOrder in order.subOrders) {
          debugPrint('  📋 SubOrder cookId: ${subOrder.cookId}, status: ${order.status}');
          if (subOrder.cookId.toString() == widget.cookId) {
            // Check if subOrder has items
            if (subOrder.items.isNotEmpty) {
              debugPrint('  ✅ Found eligible order: ${order.id}');
              hasCookItems = true;
              break;
            }
          }
        }

        return hasCookItems;
      }).toList();
      
      debugPrint('🔍 Eligible orders found: ${eligibleOrders.length}');

      if (mounted) {
        setState(() {
          _eligibleOrders = eligibleOrders;
          _isLoading = false;
        });

        // If only one order, go directly to review
        if (_eligibleOrders.length == 1) {
          _openReviewScreen(_eligibleOrders.first);
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _openReviewScreen(Order order) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ReviewSubmissionScreen(
          order: order,
          cookId: widget.cookId,
          cookName: widget.cookName,
        ),
      ),
    );
  }

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
          isRTL ? 'اختر طلب للتقييم' : 'Select Order to Review',
          style: const TextStyle(
            color: AppTheme.textPrimary,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _eligibleOrders.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.receipt_long,
                          size: 64,
                          color: Colors.grey[400],
                        ),
                        const SizedBox(height: 16),
                        Text(
                          isRTL
                              ? 'لا توجد طلبات مكتملة للتقييم من ${widget.cookName ?? 'هذا الطاهي'}'
                              : 'No completed orders to review from ${widget.cookName ?? 'this cook'}',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 16,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _eligibleOrders.length,
                  itemBuilder: (context, index) {
                    final order = _eligibleOrders[index];
                    return _buildOrderCard(order, isRTL);
                  },
                ),
    );
  }

  Widget _buildOrderCard(Order order, bool isRTL) {
    // Find the subOrder for this cook
    final cookSubOrder = order.subOrders.firstWhere(
      (sub) => sub.cookId.toString() == widget.cookId,
    );

    final shortId = order.id.length > 6 ? order.id.substring(order.id.length - 6) : order.id;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => _openReviewScreen(order),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    isRTL ? 'طلب #$shortId' : 'Order #$shortId',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.green.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text(
                      'Completed',
                      style: TextStyle(
                        color: Colors.green,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              
              // Cook name + amount
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    isRTL ? 'من ${cookSubOrder.cookName ?? 'الشيف'}' : 'From ${cookSubOrder.cookName ?? 'Cook'}',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey[700],
                    ),
                  ),
                  Text(
                    '${cookSubOrder.totalAmount.toStringAsFixed(2)} SAR',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      color: AppTheme.accentColor,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              
              // Date
              Row(
                children: [
                  Icon(Icons.access_time, size: 14, color: Colors.grey[600]),
                  const SizedBox(width: 4),
                  Text(
                    _formatDate(order.createdAt.toIso8601String()),
                    style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              
              // Tap to review prompt
              Center(
                child: Text(
                  isRTL ? 'اضغط لتقييم' : 'Tap to Review',
                  style: const TextStyle(
                    color: AppTheme.accentColor,
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDate(String? dateString) {
    if (dateString == null) return '';
    try {
      final date = DateTime.parse(dateString);
      return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    } catch (e) {
      return '';
    }
  }
}
