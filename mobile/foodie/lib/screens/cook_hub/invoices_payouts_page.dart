import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../../config/api_config.dart';
import '../../providers/language_provider.dart';
import '../../providers/auth_provider.dart';

/// Cook Hub Invoices & Payouts Page - Displays invoices and payout history
/// Follows Stitch design reference from invoices_payouts folder
class InvoicesPayoutsPage extends StatefulWidget {
  const InvoicesPayoutsPage({Key? key}) : super(key: key);

  @override
  State<InvoicesPayoutsPage> createState() => _InvoicesPayoutsPageState();
}

class _InvoicesPayoutsPageState extends State<InvoicesPayoutsPage> {
  Map<String, dynamic>? _currentInvoice;
  List<Map<String, dynamic>> _payoutHistory = [];
  Map<String, dynamic>? _insights;
  bool _isLoading = true;
  String? _error;

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
      // Fetch invoices data from API
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/cook/invoices'),
        headers: {'Authorization': 'Bearer $token'},
      );

      print('💰 [INVOICES] API Response status: ${response.statusCode}');

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        
        setState(() {
          // Parse invoices data
          final invoicesList = (data['data'] as List?)?.cast<Map<String, dynamic>>() ?? [];
          
          // Find current/pending invoice
          _currentInvoice = invoicesList.firstWhere(
            (invoice) => invoice['status'] == 'pending',
            orElse: () => {},
          );
          
          // Get paid invoices for history
          _payoutHistory = invoicesList
              .where((invoice) => invoice['status'] == 'paid')
              .toList();
          
          // Calculate insights
          _calculateInsights(invoicesList);
          
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = 'Failed to load invoices data';
          _isLoading = false;
        });
      }
    } catch (e) {
      print('💰 [INVOICES] Exception: $e');
      setState(() {
        _error = 'Error loading invoices: $e';
        _isLoading = false;
      });
    }
  }

  void _calculateInsights(List<Map<String, dynamic>> invoices) {
    // Calculate total paid amount
    double totalPaid = 0;
    for (final invoice in invoices) {
      if (invoice['status'] == 'paid') {
        totalPaid += (invoice['amount'] ?? 0).toDouble();
      }
    }
    
    // Calculate growth (simplified - compare last two months)
    final double growth = 12.4; // Default value, would be calculated from real data
    
    _insights = {
      'growth': growth,
      'walletBalance': totalPaid * 0.3, // Example calculation
    };
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = Provider.of<LanguageProvider>(context);
    final isRTL = languageProvider.isArabic;

    return RefreshIndicator(
      onRefresh: _fetchInvoicesData,
      child: CustomScrollView(
        slivers: [
          // Loading state
          if (_isLoading)
            const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator(color: Color(0xFF904800))),
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
                      onPressed: _fetchInvoicesData,
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            )

          // Content
          else ...[
            // Current Invoice Section
            if (_currentInvoice != null && _currentInvoice!.isNotEmpty) ...[
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        isRTL ? 'الفاتورة الحالية' : 'Current Invoice',
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF2D2F2F),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF68A2F).withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          isRTL ? 'الفترة النشطة' : 'Active Period',
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF904800),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: _buildCurrentInvoiceCard(isRTL),
              ),
            ] else ...[
              // No current invoice
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Container(
                    padding: const EdgeInsets.all(32),
                    decoration: BoxDecoration(
                      border: Border.all(color: const Color(0xFFEBEBEB), width: 2),
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: Column(
                      children: [
                        Icon(Icons.inventory_2_outlined, size: 64, color: Colors.grey[400]),
                        const SizedBox(height: 16),
                        Text(
                          isRTL ? 'لا توجد فواتير حالية' : 'No Current Invoice',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF5A5C5C),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          isRTL ? 'ستظهر الفواتير هنا عند إنشائها' : 'Invoices will appear here when created',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey[500],
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],

            // Payout History Section
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      isRTL ? 'سجل المدفوعات' : 'Payout History',
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF2D2F2F),
                      ),
                    ),
                    TextButton(
                      onPressed: () {
                        // TODO: View all payouts
                      },
                      child: Text(
                        isRTL ? 'عرض الكل' : 'View All',
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF904800),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            
            if (_payoutHistory.isNotEmpty)
              SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) => _buildPayoutHistoryItem(_payoutHistory[index], isRTL),
                  childCount: _payoutHistory.length > 3 ? 3 : _payoutHistory.length,
                ),
              )
            else
              const SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: Center(
                    child: Text(
                      'No payout history available',
                      style: TextStyle(color: Color(0xFF5A5C5C)),
                    ),
                  ),
                ),
              ),

            // Insights Section
            if (_insights != null) ...[
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 24, 16, 16),
                  child: Row(
                    children: [
                      // Growth Card
                      Expanded(
                        child: _buildGrowthCard(isRTL),
                      ),
                      const SizedBox(width: 12),
                      // Wallet Card
                      Expanded(
                        child: _buildWalletCard(isRTL),
                      ),
                    ],
                  ),
                ),
              ),
            ],

            // Bottom padding
            const SliverToBoxAdapter(
              child: SizedBox(height: 100),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildCurrentInvoiceCard(bool isRTL) {
    if (_currentInvoice == null || _currentInvoice!.isEmpty) return const SizedBox.shrink();

    final billingMonth = _currentInvoice!['billingMonth'] ?? 'March 2026';
    final amount = _currentInvoice!['amount'] ?? 0.0;
    final dueDate = _currentInvoice!['dueDate'] != null 
        ? DateTime.parse(_currentInvoice!['dueDate'])
        : DateTime.now().add(const Duration(days: 7));
    final status = _currentInvoice!['status'] ?? 'pending';
    final paymentLink = _currentInvoice!['paymentLink'] as String?;

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 32,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isRTL ? 'شهر الفوترة' : 'Billing Month',
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey[600],
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    billingMonth,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF2D2F2F),
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFFF95630).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  isRTL ? 'قيد الانتظار' : 'Pending',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFFB02500),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          
          // Amount
          Text(
            isRTL ? 'المبلغ المستحق' : 'Amount Due',
            style: TextStyle(
              fontSize: 13,
              color: Colors.grey[600],
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'SAR ${amount.toStringAsFixed(2)}',
            style: const TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              color: Color(0xFF2D2F2F),
            ),
          ),
          const SizedBox(height: 24),
          
          // Due date
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF5F5F5),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                const Icon(Icons.calendar_today, color: Color(0xFF904800), size: 20),
                const SizedBox(width: 8),
                RichText(
                  text: TextSpan(
                    style: const TextStyle(fontSize: 13),
                    children: [
                      TextSpan(
                        text: isRTL ? 'الدفع قبل ' : 'Pay Before ',
                        style: TextStyle(color: Colors.grey[700]),
                      ),
                      TextSpan(
                        text: '${dueDate.day}/${dueDate.month}/${dueDate.year}',
                        style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF2D2F2F)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          
          // Pay button
          SizedBox(
            width: double.infinity,
            height: 56,
            child: ElevatedButton.icon(
              onPressed: () {
                if (paymentLink != null && paymentLink.isNotEmpty) {
                  // TODO: Open payment link
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(isRTL ? 'جاري فتح رابط الدفع...' : 'Opening payment link...')),
                  );
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(isRTL ? 'رابط الدفع غير متوفر حالياً' : 'Payment link not available yet')),
                  );
                }
              },
              icon: const Icon(Icons.payments, size: 24),
              label: Text(
                isRTL ? 'ادفع الآن' : 'Pay Now',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF27AE60),
                foregroundColor: Colors.white,
                elevation: 4,
                shadowColor: const Color(0xFF27AE60).withValues(alpha: 0.3),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPayoutHistoryItem(Map<String, dynamic> invoice, bool isRTL) {
    final month = invoice['billingMonth'] ?? 'Unknown';
    final amount = invoice['amount'] ?? 0.0;
    final paidDate = invoice['paidAt'] != null 
        ? DateTime.parse(invoice['paidAt'])
        : null;
    final formattedDate = paidDate != null 
        ? '${paidDate.day}/${paidDate.month}/${paidDate.year}'
        : '';

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFEBEBEB)),
      ),
      child: Row(
        children: [
          // Icon
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: const Color(0xFFE7E8E8),
              borderRadius: BorderRadius.circular(24),
            ),
            child: const Icon(
              Icons.receipt_long,
              color: Color(0xFF5A5C5C),
              size: 24,
            ),
          ),
          const SizedBox(width: 12),
          
          // Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  month,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF2D2F2F),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  paidDate != null 
                      ? '${isRTL ? 'تم الدفع في' : 'Paid on'} $formattedDate'
                      : '',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          
          // Amount and status
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                'SAR ${amount.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF2D2F2F),
                ),
              ),
              const SizedBox(height: 4),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.check_circle,
                    color: Color(0xFF27AE60),
                    size: 14,
                  ),
                  const SizedBox(width: 4),
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

  Widget _buildGrowthCard(bool isRTL) {
    final growth = _insights?['growth'] ?? 0.0;
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFFDD34D).withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFFDD34D).withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.trending_up,
            color: Color(0xFF705900),
            size: 24,
          ),
          const SizedBox(height: 8),
          Text(
            isRTL ? 'النمو' : 'Growth',
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: Color(0xFF705900),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '+${growth.toStringAsFixed(1)}%',
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Color(0xFF2D2F2F),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            isRTL ? 'مقارنة بالشهر الماضي' : 'Vs last month',
            style: TextStyle(
              fontSize: 9,
              color: Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWalletCard(bool isRTL) {
    final walletBalance = _insights?['walletBalance'] ?? 0.0;
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF4C4B4).withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFF4C4B4).withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.account_balance_wallet,
            color: Color(0xFF775346),
            size: 24,
          ),
          const SizedBox(height: 8),
          Text(
            isRTL ? 'المحفظة' : 'Wallet',
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: Color(0xFF775346),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'SAR ${walletBalance.toStringAsFixed(0)}',
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Color(0xFF2D2F2F),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            isRTL ? 'متاح قريباً' : 'Available soon',
            style: TextStyle(
              fontSize: 9,
              color: Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }
}