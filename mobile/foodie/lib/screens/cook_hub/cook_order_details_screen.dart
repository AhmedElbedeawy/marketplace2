import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import '../../config/theme.dart';
import '../../config/api_config.dart';
import '../../providers/language_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/order_provider.dart';

class CookOrderDetailsScreen extends StatefulWidget {
  final String orderId;

  const CookOrderDetailsScreen({Key? key, required this.orderId})
      : super(key: key);

  @override
  State<CookOrderDetailsScreen> createState() => _CookOrderDetailsScreenState();
}

class _CookOrderDetailsScreenState extends State<CookOrderDetailsScreen> {
  dynamic _orderData;
  bool _isLoading = true;
  String? _error;
  bool _isUpdating = false;

  @override
  void initState() {
    super.initState();
    _fetchOrderDetails();
  }

  Future<void> _fetchOrderDetails() async {
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
        Uri.parse(ApiConfig.getCookOrderDetails(widget.orderId)),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        setState(() {
          _orderData = data['data'] ?? data;
          _isLoading = false;
        });
      } else {
        throw Exception('Failed to load order details');
      }
    } catch (err) {
      setState(() {
        _error = err.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _updateOrderStatus(String subOrderId, String newStatus) async {
    final authProvider = context.read<AuthProvider>();
    final token = authProvider.token;

    if (token == null) return;

    setState(() => _isUpdating = true);

    try {
      final response = await http.put(
        Uri.parse(ApiConfig.updateSubOrderStatus(subOrderId)),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode({'status': newStatus}),
      );

      if (response.statusCode == 200) {
        // Refresh order details
        await _fetchOrderDetails();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(_getStatusUpdateMessage(newStatus)),
              backgroundColor: Colors.green,
            ),
          );
        }
      } else {
        throw Exception('Failed to update status');
      }
    } catch (err) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update status: $err'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      setState(() => _isUpdating = false);
    }
  }

  String _getStatusUpdateMessage(String status) {
    final languageProvider = context.read<LanguageProvider>();
    final isRTL = languageProvider.isArabic;

    switch (status) {
      case 'order_received':
        return isRTL ? 'تم استلام الطلب' : 'Order received';
      case 'preparing':
        return isRTL ? 'قيد التحضير' : 'Preparing';
      case 'ready':
        return isRTL ? 'جاهز للاستلام' : 'Ready for pickup';
      case 'completed':
        return isRTL ? 'تم التوصيل' : 'Delivered';
      default:
        return isRTL ? 'تم التحديث' : 'Updated';
    }
  }

  void _showStatusActionSheet(String subOrderId, String currentStatus) {
    final languageProvider = context.read<LanguageProvider>();
    final isRTL = languageProvider.isArabic;

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                isRTL ? 'تحديث حالة الطلب' : 'Update Order Status',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const Divider(),
            if (currentStatus == 'order_received') ...[
              ListTile(
                leading:
                    const Icon(Icons.check_circle, color: AppTheme.accentColor),
                title: Text(isRTL ? 'بدء التحضير' : 'Start Preparing'),
                onTap: () {
                  Navigator.pop(context);
                  _updateOrderStatus(subOrderId, 'preparing');
                },
              ),
            ],
            if (currentStatus == 'preparing') ...[
              ListTile(
                leading:
                    const Icon(Icons.restaurant, color: AppTheme.accentColor),
                title: Text(isRTL ? 'وضع جاهز' : 'Mark as Ready'),
                onTap: () {
                  Navigator.pop(context);
                  _updateOrderStatus(subOrderId, 'ready');
                },
              ),
            ],
            if (currentStatus == 'ready') ...[
              ListTile(
                leading: const Icon(Icons.delivery_dining,
                    color: AppTheme.successColor),
                title: Text(isRTL ? 'إكمال الطلب' : 'Complete Order'),
                onTap: () {
                  Navigator.pop(context);
                  _updateOrderStatus(subOrderId, 'completed');
                },
              ),
            ],
            ListTile(
              leading: const Icon(Icons.close, color: Colors.red),
              title: Text(isRTL ? 'إلغاء' : 'Cancel'),
              onTap: () => Navigator.pop(context),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;

    if (_isLoading) {
      return Scaffold(
        backgroundColor: AppTheme.backgroundColor,
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          leading: IconButton(
            icon: Icon(
              isRTL ? Icons.arrow_forward : Icons.arrow_back,
              color: AppTheme.textPrimary,
            ),
            onPressed: () => Navigator.pop(context),
          ),
        ),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null || _orderData == null) {
      return Scaffold(
        backgroundColor: AppTheme.backgroundColor,
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          leading: IconButton(
            icon: Icon(
              isRTL ? Icons.arrow_forward : Icons.arrow_back,
              color: AppTheme.textPrimary,
            ),
            onPressed: () => Navigator.pop(context),
          ),
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 48, color: Colors.grey[400]),
              const SizedBox(height: 16),
              Text(
                _error ?? 'Order not found',
                style: const TextStyle(color: AppTheme.textSecondary),
              ),
            ],
          ),
        ),
      );
    }

    final subOrders = _orderData['subOrders'] ?? [];
    final status = _orderData['status'];

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Text(
          isRTL ? 'تفاصيل الطلب' : 'Order Details',
          style: const TextStyle(
            color: AppTheme.textPrimary,
            fontSize: 20,
            fontWeight: FontWeight.w700,
          ),
        ),
        leading: IconButton(
          icon: Icon(
            isRTL ? Icons.arrow_forward : Icons.arrow_back,
            color: AppTheme.textPrimary,
          ),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _fetchOrderDetails,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Order ID and Status
            Card(
              color: Colors.white,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '#${widget.orderId.substring(widget.orderId.length - 6)}',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: _getStatusColor(status).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          _getStatusLabel(status),
                          style: TextStyle(
                            color: _getStatusColor(status),
                            fontWeight: FontWeight.w600,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ), // Column closing
            ), // Padding closing
            ), // Card closing
            const SizedBox(height: 16),

            // Sub-orders (items)
            ...subOrders.map((subOrder) => _buildSubOrderCard(subOrder)),
          ],
        ),
      ),
    );
  }

  Widget _buildSubOrderCard(dynamic subOrder) {
    final languageProvider = context.read<LanguageProvider>();
    final isRTL = languageProvider.isArabic;
    final items = subOrder['items'] ?? [];
    final subOrderId = subOrder['_id'] ?? subOrder['id'];
    final subStatus = subOrder['status'];

    return Card(
      color: Colors.white,
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  isRTL ? 'تفاصيل الصنف' : 'Item Details',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                if (_isUpdating)
                  const CircularProgressIndicator(strokeWidth: 2)
                else
                  ElevatedButton.icon(
                    onPressed: () =>
                        _showStatusActionSheet(subOrderId, subStatus),
                    icon: const Icon(Icons.edit, size: 16),
                    label: Text(isRTL ? 'تحديث الحالة' : 'Update Status'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.accentColor,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            ...items.map((item) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    children: [
                      Text(
                        '${item['quantity']}x ',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      Expanded(
                        child: Text(item['name'] ?? 'Item'),
                      ),
                    ],
                  ),
                )),
            const Divider(),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  isRTL ? 'المجموع' : 'Total',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                Text(
                  '${subOrder['totalAmount']?.toStringAsFixed(2) ?? '0.00'} SAR',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: AppTheme.accentColor,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'pending':
        return Colors.orange;
      case 'confirmed':
        return Colors.blue;
      case 'preparing':
        return Colors.amber;
      case 'ready':
        return Colors.green;
      case 'completed':
        return Colors.teal;
      case 'cancelled':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String _getStatusLabel(String status) {
    final languageProvider = context.read<LanguageProvider>();
    final isRTL = languageProvider.isArabic;

    switch (status) {
      case 'pending':
        return isRTL ? 'قيد الانتظار' : 'Pending';
      case 'confirmed':
        return isRTL ? 'مؤكد' : 'Confirmed';
      case 'preparing':
        return isRTL ? 'قيد التحضير' : 'Preparing';
      case 'ready':
        return isRTL ? 'جاهز' : 'Ready';
      case 'completed':
        return isRTL ? 'مكتمل' : 'Completed';
      case 'cancelled':
        return isRTL ? 'ملغي' : 'Cancelled';
      default:
        return status;
    }
  }
}
