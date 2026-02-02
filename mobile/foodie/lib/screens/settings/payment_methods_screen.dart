import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/language_provider.dart';

class PaymentMethodsScreen extends StatelessWidget {
  const PaymentMethodsScreen({Key? key}) : super(key: key);

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
          isRTL ? 'طرق الدفع' : 'Payment Methods',
          style: const TextStyle(
            color: AppTheme.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add, color: AppTheme.accentColor),
            onPressed: () {
              _showAddPaymentDialog(context, isRTL);
            },
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildPaymentCard(
            context,
            isRTL,
            icon: Icons.credit_card,
            title: isRTL ? 'بطاقة ائتمان' : 'Credit Card',
            subtitle: '•••• •••• •••• 1234',
            isDefault: true,
          ),
          _buildPaymentCard(
            context,
            isRTL,
            icon: Icons.account_balance_wallet,
            title: isRTL ? 'Apple Pay' : 'Apple Pay',
            subtitle: isRTL ? 'iPhone الخاص بك' : 'Your iPhone',
            isDefault: false,
          ),
          _buildPaymentCard(
            context,
            isRTL,
            icon: Icons.money,
            title: isRTL ? 'الدفع عند الاستلام' : 'Cash on Delivery',
            subtitle: isRTL ? 'ادفع عند الاستلام' : 'Pay when you receive',
            isDefault: false,
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentCard(
    BuildContext context,
    bool isRTL, {
    required IconData icon,
    required String title,
    required String subtitle,
    required bool isDefault,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: isDefault
            ? Border.all(color: AppTheme.accentColor, width: 2)
            : null,
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
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              color: AppTheme.accentColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: AppTheme.accentColor, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    if (isDefault) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppTheme.accentColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          isRTL ? 'افتراضي' : 'Default',
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.accentColor,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppTheme.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          PopupMenuButton(
            icon: const Icon(Icons.more_vert, color: AppTheme.textSecondary),
            itemBuilder: (context) => [
              PopupMenuItem(
                child: Text(isRTL ? 'تعيين كافتراضي' : 'Set as default'),
                onTap: () {
                  final messenger = ScaffoldMessenger.of(context);
                  Future.delayed(Duration.zero, () {
                    messenger.showSnackBar(
                      SnackBar(
                        content: Text(
                          isRTL ? 'تم التعيين كافتراضي' : 'Set as default',
                        ),
                        backgroundColor: Colors.green,
                      ),
                    );
                  });
                },
              ),
              PopupMenuItem(
                child: Text(
                  isRTL ? 'حذف' : 'Delete',
                  style: const TextStyle(color: Colors.red),
                ),
                onTap: () {
                  WidgetsBinding.instance.addPostFrameCallback((_) {
                    if (context.mounted) {
                      _showDeleteDialog(context, isRTL);
                    }
                  });
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showAddPaymentDialog(BuildContext context, bool isRTL) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(isRTL ? 'إضافة طريقة دفع' : 'Add Payment Method'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.credit_card, color: AppTheme.accentColor),
              title: Text(isRTL ? 'بطاقة ائتمان/خصم' : 'Credit/Debit Card'),
              onTap: () {
                Navigator.pop(context);
                _showCardDetailsDialog(context, isRTL);
              },
            ),
            ListTile(
              leading: const Icon(Icons.account_balance_wallet, color: AppTheme.accentColor),
              title: Text(isRTL ? 'Apple Pay' : 'Apple Pay'),
              onTap: () {
                Navigator.pop(context);
                final scaffoldMessenger = ScaffoldMessenger.of(context);
                scaffoldMessenger.showSnackBar(
                  SnackBar(
                    content: Text(isRTL ? 'تمت إضافة Apple Pay' : 'Apple Pay added'),
                    backgroundColor: Colors.green,
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showCardDetailsDialog(BuildContext context, bool isRTL) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(isRTL ? 'تفاصيل البطاقة' : 'Card Details'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              decoration: InputDecoration(
                labelText: isRTL ? 'رقم البطاقة' : 'Card Number',
                prefixIcon: const Icon(Icons.credit_card),
              ),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    decoration: InputDecoration(
                      labelText: isRTL ? 'انتهاء الصلاحية' : 'Expiry',
                      hintText: 'MM/YY',
                    ),
                    keyboardType: TextInputType.datetime,
                  ),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: TextField(
                    decoration: InputDecoration(
                      labelText: 'CVV',
                    ),
                    keyboardType: TextInputType.number,
                    obscureText: true,
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(isRTL ? 'إلغاء' : 'Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              final scaffoldMessenger = ScaffoldMessenger.of(context);
              scaffoldMessenger.showSnackBar(
                SnackBar(
                  content: Text(isRTL ? 'تمت إضافة البطاقة' : 'Card added'),
                  backgroundColor: Colors.green,
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.accentColor,
              foregroundColor: Colors.white,
            ),
            child: Text(isRTL ? 'إضافة' : 'Add'),
          ),
        ],
      ),
    );
  }

  void _showDeleteDialog(BuildContext context, bool isRTL) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(isRTL ? 'حذف طريقة الدفع' : 'Delete Payment Method'),
        content: Text(
          isRTL
              ? 'هل أنت متأكد من حذف طريقة الدفع هذه؟'
              : 'Are you sure you want to delete this payment method?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(isRTL ? 'إلغاء' : 'Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              final scaffoldMessenger = ScaffoldMessenger.of(context);
              scaffoldMessenger.showSnackBar(
                SnackBar(
                  content: Text(isRTL ? 'تم الحذف' : 'Deleted'),
                  backgroundColor: Colors.red,
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: Text(isRTL ? 'حذف' : 'Delete'),
          ),
        ],
      ),
    );
  }
}
