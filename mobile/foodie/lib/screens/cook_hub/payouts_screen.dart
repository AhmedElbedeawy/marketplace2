import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import '../../config/theme.dart';
import '../../config/api_config.dart';
import '../../providers/language_provider.dart';
import '../../providers/auth_provider.dart';

class PayoutsScreen extends StatefulWidget {
  const PayoutsScreen({super.key});

  @override
  State<PayoutsScreen> createState() => _PayoutsScreenState();
}

class _PayoutsScreenState extends State<PayoutsScreen> {
  List<dynamic> _invoices = [];
  bool _isLoading = true;
  String? _error;
  dynamic _selectedInvoice;

  @override
  void initState() {
    super.initState();
    _fetchInvoices();
  }

  Future<void> _fetchInvoices() async {
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
        Uri.parse(ApiConfig.cookInvoices()),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        setState(() {
          _invoices = data['data'] ?? data ?? [];
          _isLoading = false;
        });
      } else {
        throw Exception('Failed to load invoices');
      }
    } catch (err) {
      setState(() {
        _error = err.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _fetchInvoiceDetails(String invoiceId) async {
    final authProvider = context.read<AuthProvider>();
    final token = authProvider.token;

    try {
      final response = await http.get(
        Uri.parse(ApiConfig.invoiceById(invoiceId)),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        setState(() {
          _selectedInvoice = data['data'];
        });
        _showInvoiceDetails();
      }
    } catch (err) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load invoice details'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _downloadPdf(String invoiceId, String invoiceNumber) async {
    final authProvider = context.read<AuthProvider>();
    final token = authProvider.token;

    try {
      // For web view - open in browser
      final url =
          Uri.parse('${ApiConfig.baseUrl}${ApiConfig.invoicePdf(invoiceId)}');
      final headers = {'Authorization': 'Bearer $token'};

      // Construct URL with auth token for download
      final downloadUrl = '${url.toString()}?token=${Uri.encodeComponent(token ?? '')}';

      if (await canLaunchUrl(Uri.parse(downloadUrl))) {
        await launchUrl(
          Uri.parse(downloadUrl),
          mode: LaunchMode.externalApplication,
        );
      }
    } catch (err) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to download PDF: $err'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _showInvoiceDetails() {
    if (_selectedInvoice == null) return;

    final languageProvider = context.read<LanguageProvider>();
    final isRTL = languageProvider.isArabic;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
          left: 16,
          right: 16,
          top: 16,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  isRTL ? 'تفاصيل الفاتورة' : 'Invoice Details',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const Divider(),
            const SizedBox(height: 16),
            _buildDetailRow(
              isRTL ? 'رقم الفاتورة' : 'Invoice #',
              _selectedInvoice['invoiceNumber'] ?? 'N/A',
            ),
            _buildDetailRow(
              isRTL ? 'الحالة' : 'Status',
              _getStatusLabel(_selectedInvoice['status']),
            ),
            _buildDetailRow(
              isRTL ? 'الفترة' : 'Period',
              '${_formatDate(_selectedInvoice['periodStart'])} - ${_formatDate(_selectedInvoice['periodEnd'])}',
            ),
            _buildDetailRow(
              isRTL ? 'الإجمالي' : 'Gross Amount',
              '${_selectedInvoice['grossAmount']?.toStringAsFixed(2) ?? '0.00'} SAR',
            ),
            _buildDetailRow(
              isRTL ? 'العمولة' : 'Commission',
              '${_selectedInvoice['commissionAmount']?.toStringAsFixed(2) ?? '0.00'} SAR',
            ),
            _buildDetailRow(
              isRTL ? 'صافي الدفع' : 'Net Amount',
              '${_selectedInvoice['netAmount']?.toStringAsFixed(2) ?? '0.00'} SAR',
              isAccent: true,
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                if (_selectedInvoice['paymentLink'] != null)
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () async {
                        if (await canLaunchUrl(
                            Uri.parse(_selectedInvoice['paymentLink']))) {
                          await launchUrl(
                              Uri.parse(_selectedInvoice['paymentLink']),
                              mode: LaunchMode.externalApplication);
                        }
                      },
                      icon: const Icon(Icons.payment),
                      label: Text(isRTL ? 'دفع الفاتورة' : 'Pay Invoice'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.accentColor,
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ),
                if (_selectedInvoice['paymentLink'] == null)
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _downloadPdf(
                        _selectedInvoice['_id'],
                        _selectedInvoice['invoiceNumber'],
                      ),
                      icon: const Icon(Icons.picture_as_pdf),
                      label: Text(isRTL ? 'تحميل PDF' : 'Download PDF'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppTheme.accentColor,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, {bool isAccent = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(color: AppTheme.textSecondary),
          ),
          Text(
            value,
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: isAccent ? AppTheme.accentColor : AppTheme.textPrimary,
            ),
          ),
        ],
      ),
    );
  }

  String _getStatusLabel(String? status) {
    final languageProvider = context.read<LanguageProvider>();
    final isRTL = languageProvider.isArabic;

    switch (status) {
      case 'paid':
        return isRTL ? 'مدفوعة' : 'Paid';
      case 'issued':
        return isRTL ? 'صادرة' : 'Issued';
      case 'locked':
        return isRTL ? 'مقفلة' : 'Locked';
      case 'void':
        return isRTL ? 'ملغاة' : 'Void';
      default:
        return status ?? 'N/A';
    }
  }

  String _formatDate(String? dateString) {
    if (dateString == null) return 'N/A';
    final date = DateTime.parse(dateString);
    return '${date.day}/${date.month}/${date.year}';
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
          title: Text(
            isRTL ? 'الفواتير والدفعات' : 'Invoices & Payouts',
            style: const TextStyle(
              color: AppTheme.textPrimary,
              fontSize: 20,
              fontWeight: FontWeight.w700,
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
          backgroundColor: Colors.white,
          elevation: 0,
          title: Text(
            isRTL ? 'الفواتير والدفعات' : 'Invoices & Payouts',
            style: const TextStyle(
              color: AppTheme.textPrimary,
              fontSize: 20,
              fontWeight: FontWeight.w700,
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
                _error ?? 'Error loading invoices',
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
        backgroundColor: Colors.white,
        elevation: 0,
        title: Text(
          isRTL ? 'الفواتير والدفعات' : 'Invoices & Payouts',
          style: const TextStyle(
            color: AppTheme.textPrimary,
            fontSize: 20,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _fetchInvoices,
        child: ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: _invoices.length,
          itemBuilder: (context, index) {
            final invoice = _invoices[index];
            return Card(
              color: Colors.white,
              margin: const EdgeInsets.only(bottom: 12),
              child: ListTile(
                onTap: () => _fetchInvoiceDetails(invoice['_id']),
                title: Text(
                  '${isRTL ? 'فاتورة' : 'Invoice'} #${invoice['invoiceNumber'] ?? 'N/A'}',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 4),
                    Text(
                      '${_formatDate(invoice['periodStart'])} - ${_formatDate(invoice['periodEnd'])}',
                      style: const TextStyle(fontSize: 12),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: _getStatusColor(invoice['status'])
                            .withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        _getStatusLabel(invoice['status']),
                        style: TextStyle(
                          color: _getStatusColor(invoice['status']),
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                trailing: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '${invoice['netAmount']?.toStringAsFixed(2) ?? '0.00'} SAR',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: AppTheme.accentColor,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _formatDate(invoice['issueDate']),
                      style: const TextStyle(
                          fontSize: 11, color: AppTheme.textSecondary),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Color _getStatusColor(String? status) {
    switch (status) {
      case 'paid':
        return Colors.green;
      case 'issued':
        return Colors.orange;
      case 'locked':
        return Colors.red;
      case 'void':
        return Colors.grey;
      default:
        return Colors.blue;
    }
  }
}
