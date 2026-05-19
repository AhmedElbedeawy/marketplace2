import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import 'dart:convert';
import '../../config/api_config.dart';
import '../../config/theme.dart';
import '../../providers/language_provider.dart';
import '../../providers/auth_provider.dart';

class InvoicesPayoutsPage extends StatefulWidget {
  const InvoicesPayoutsPage({Key? key}) : super(key: key);

  @override
  State<InvoicesPayoutsPage> createState() => _InvoicesPayoutsPageState();
}

class _InvoicesPayoutsPageState extends State<InvoicesPayoutsPage> {
  // Current unpaid invoice (status: draft | issued | locked | overdue)
  Map<String, dynamic>? _currentInvoice;
  // Paid invoice history
  List<Map<String, dynamic>> _paidHistory = [];
  bool _isLoading = true;
  String? _error;

  static const _unpaidStatuses = {'draft', 'issued', 'locked', 'overdue'};

  @override
  void initState() {
    super.initState();
    _fetchInvoicesData();
  }

  Future<void> _fetchInvoicesData() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final token = authProvider.token;

    if (token == null) {
      setState(() {
        _error = 'Authentication required';
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
        Uri.parse(ApiConfig.cookInvoices()),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final list = (data['data'] as List?)?.cast<Map<String, dynamic>>() ?? [];

        setState(() {
          // Most recent unpaid invoice — sorted by server descending already
          _currentInvoice = list.firstWhere(
            (inv) => _unpaidStatuses.contains(inv['status']),
            orElse: () => <String, dynamic>{},
          );
          if (_currentInvoice!.isEmpty) _currentInvoice = null;

          _paidHistory = list
              .where((inv) => inv['status'] == 'paid')
              .toList();

          _isLoading = false;
        });
      } else {
        setState(() {
          _error = 'Failed to load invoices';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Error: $e';
        _isLoading = false;
      });
    }
  }

  Future<void> _openPaymentLink(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) return;
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  String _formatPeriod(String? periodMonth) {
    if (periodMonth == null) return '';
    try {
      final d = DateTime.parse('$periodMonth-01');
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      return '${months[d.month - 1]} ${d.year}';
    } catch (_) {
      return periodMonth;
    }
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = Provider.of<LanguageProvider>(context);
    final isRTL = languageProvider.isArabic;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
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
                      isRTL ? 'الفواتير والمدفوعات' : 'Invoices & Payouts',
                      style: const TextStyle(
                        color: AppTheme.textPrimary,
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        height: 1.2,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: RefreshIndicator(
        onRefresh: _fetchInvoicesData,
        child: CustomScrollView(
          slivers: [
            if (_isLoading)
              const SliverFillRemaining(
                child: Center(
                  child: CircularProgressIndicator(color: Color(0xFF904800)),
                ),
              )

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
                        onPressed: _fetchInvoicesData,
                        child: Text(isRTL ? 'إعادة المحاولة' : 'Retry'),
                      ),
                    ],
                  ),
                ),
              )

            else if (_currentInvoice == null && _paidHistory.isEmpty)
              SliverFillRemaining(
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.inventory_2_outlined,
                            size: 64, color: Colors.grey[400]),
                        const SizedBox(height: 16),
                        Text(
                          isRTL ? 'لا توجد فواتير بعد' : 'No invoices yet',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF5A5C5C),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          isRTL
                              ? 'ستظهر فواتيرك الشهرية هنا'
                              : 'Your monthly invoices will appear here',
                          style: TextStyle(fontSize: 14, color: Colors.grey[500]),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                ),
              )

            else ...[
              // ── Current / unpaid invoice ──────────────────────────────
              if (_currentInvoice != null) ...[
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(24, 16, 24, 8),
                    child: Text(
                      isRTL ? 'الفاتورة الحالية' : 'Current Invoice',
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF2D2F2F),
                      ),
                    ),
                  ),
                ),
                SliverToBoxAdapter(
                  child: _buildCurrentInvoiceCard(_currentInvoice!, isRTL),
                ),
              ],

              // ── Payout history ────────────────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 24, 24, 8),
                  child: Text(
                    isRTL ? 'سجل المدفوعات' : 'Payout History',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF2D2F2F),
                    ),
                  ),
                ),
              ),
              if (_paidHistory.isNotEmpty)
                SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) =>
                        _buildHistoryRow(_paidHistory[index], isRTL),
                    childCount: _paidHistory.length,
                  ),
                )
              else
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Center(
                      child: Text(
                        isRTL
                            ? 'لا يوجد سجل مدفوعات حتى الآن'
                            : 'No paid invoices yet',
                        style: const TextStyle(color: Color(0xFF5A5C5C)),
                      ),
                    ),
                  ),
                ),

              const SliverToBoxAdapter(child: SizedBox(height: 100)),
            ],
          ],
        ),
      ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCurrentInvoiceCard(Map<String, dynamic> invoice, bool isRTL) {
    final period     = _formatPeriod(invoice['periodMonth'] as String?);
    final amountDue  = (invoice['amountDue']        ?? 0).toDouble();
    final gross      = (invoice['grossAmount']      ?? 0).toDouble();
    final commission = (invoice['commissionAmount'] ?? 0).toDouble();
    final commRate   = (invoice['commissionRate']   ?? 0).toDouble();
    final vat        = (invoice['vatAmount']        ?? 0).toDouble();
    final currency   = invoice['currency']          ?? 'SAR';
    final status     = (invoice['status'] as String?) ?? '';
    final paymentLink = invoice['paymentLink'] as String?;
    final dueAt = invoice['dueAt'] != null
        ? DateTime.tryParse(invoice['dueAt'])
        : null;

    final isOverdue = status == 'overdue' ||
        (dueAt != null && dueAt.isBefore(DateTime.now()));

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 4),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 24,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                period,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF2D2F2F),
                ),
              ),
              _statusChip(status, isRTL, isOverdue),
            ],
          ),
          const SizedBox(height: 16),

          // Amount due
          Text(
            isRTL ? 'المبلغ المستحق' : 'Amount Due',
            style: TextStyle(fontSize: 12, color: Colors.grey[600]),
          ),
          const SizedBox(height: 4),
          Text(
            '$currency ${amountDue.toStringAsFixed(2)}',
            style: const TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              color: Color(0xFF2D2F2F),
            ),
          ),
          const SizedBox(height: 16),

          // Breakdown
          _buildBreakdownRow(
            isRTL ? 'إجمالي مبيعاتك' : 'Your gross sales',
            '$currency ${gross.toStringAsFixed(2)}',
            Colors.grey[700]!,
          ),
          _buildBreakdownRow(
            isRTL
                ? 'رسوم المنصة (${commRate.toStringAsFixed(1)}%)'
                : 'Platform fee (${commRate.toStringAsFixed(1)}%)',
            '− $currency ${commission.toStringAsFixed(2)}',
            const Color(0xFF904800),
          ),
          if (vat > 0)
            _buildBreakdownRow(
              isRTL ? 'ضريبة القيمة المضافة' : 'VAT',
              '− $currency ${vat.toStringAsFixed(2)}',
              const Color(0xFF904800),
            ),
          const Divider(height: 20),

          // Due date
          if (dueAt != null) ...[
            Row(
              children: [
                Icon(
                  Icons.calendar_today,
                  size: 14,
                  color: isOverdue ? Colors.red : Colors.grey[600],
                ),
                const SizedBox(width: 6),
                Text(
                  '${isRTL ? 'الدفع قبل' : 'Due'} ${dueAt.day}/${dueAt.month}/${dueAt.year}',
                  style: TextStyle(
                    fontSize: 12,
                    color: isOverdue ? Colors.red : Colors.grey[600],
                    fontWeight: isOverdue ? FontWeight.bold : FontWeight.normal,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
          ],

          // Pay button
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton.icon(
              onPressed: (paymentLink != null && paymentLink.isNotEmpty)
                  ? () => _openPaymentLink(paymentLink)
                  : null,
              icon: const Icon(Icons.payments, size: 22),
              label: Text(
                isRTL ? 'ادفع الفاتورة' : 'Pay My Invoice',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF27AE60),
                foregroundColor: Colors.white,
                disabledBackgroundColor: Colors.grey[300],
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
          if (paymentLink == null || paymentLink.isEmpty) ...[
            const SizedBox(height: 8),
            Center(
              child: Text(
                isRTL
                    ? 'رابط الدفع سيُضاف قريباً من الإدارة'
                    : 'Payment link will be added by admin soon',
                style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildBreakdownRow(String label, String value, Color valueColor) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: 13, color: Colors.grey[600])),
          Text(
            value,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: valueColor,
            ),
          ),
        ],
      ),
    );
  }

  Widget _statusChip(String status, bool isRTL, bool isOverdue) {
    Color bg;
    Color fg;
    String label;

    if (isOverdue || status == 'overdue') {
      bg = Colors.red.withValues(alpha: 0.12);
      fg = Colors.red[700]!;
      label = isRTL ? 'متأخر' : 'Overdue';
    } else if (status == 'issued' || status == 'locked') {
      bg = const Color(0xFFF95630).withValues(alpha: 0.1);
      fg = const Color(0xFFB02500);
      label = isRTL ? 'مستحق' : 'Due';
    } else {
      bg = Colors.orange.withValues(alpha: 0.1);
      fg = Colors.orange[800]!;
      label = isRTL ? 'قيد الإعداد' : 'Pending';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: fg),
      ),
    );
  }

  Widget _buildHistoryRow(Map<String, dynamic> invoice, bool isRTL) {
    final period   = _formatPeriod(invoice['periodMonth'] as String?);
    final amount   = (invoice['amountDue'] ?? 0).toDouble();
    final currency = invoice['currency'] ?? 'SAR';
    final paidAt   = invoice['paidAt'] != null
        ? DateTime.tryParse(invoice['paidAt'])
        : null;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 5),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFEBEBEB)),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: const Color(0xFFE7F8EF),
              borderRadius: BorderRadius.circular(22),
            ),
            child: const Icon(
              Icons.receipt_long,
              color: Color(0xFF27AE60),
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  period,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF2D2F2F),
                  ),
                ),
                if (paidAt != null) ...[
                  const SizedBox(height: 3),
                  Text(
                    '${isRTL ? 'تم الدفع في' : 'Paid'} ${paidAt.day}/${paidAt.month}/${paidAt.year}',
                    style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                  ),
                ],
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '$currency ${amount.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF2D2F2F),
                ),
              ),
              const SizedBox(height: 3),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.check_circle,
                      color: Color(0xFF27AE60), size: 12),
                  const SizedBox(width: 3),
                  Text(
                    isRTL ? 'مدفوع' : 'Paid',
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF27AE60),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}
