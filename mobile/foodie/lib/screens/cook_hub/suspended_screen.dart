import 'package:flutter/material.dart';
import '../../config/theme.dart';
import '../../providers/language_provider.dart';
import 'package:provider/provider.dart';

class SuspendedScreen extends StatelessWidget {
  const SuspendedScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isRTL = context.watch<LanguageProvider>().isArabic;

    return Scaffold(
      appBar: AppBar(
        title: Text(isRTL ? 'تنبيه' : 'Notice'),
        backgroundColor: Colors.white,
        foregroundColor: AppTheme.textPrimary,
        elevation: 0,
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.block, size: 80, color: Colors.red),
              const SizedBox(height: 24),
              Text(
                isRTL ? 'تم تعليق حساب الشيف' : 'Cook Account Suspended',
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.red),
              ),
              const SizedBox(height: 16),
              Text(
                isRTL 
                  ? 'تم تعليق وصولك إلى مركز الشيف مؤقتاً. يمكنك الاستمرار في استخدام التطبيق كعميل (Foodie). يرجى الاتصال بالدعم لمزيد من المعلومات.'
                  : 'Your access to the Cook Hub has been temporarily suspended. You can still use the app as a Foodie. Please contact support for more information.',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 16, color: Colors.grey),
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: () => Navigator.of(context).pop(),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.orange,
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
                ),
                child: Text(isRTL ? 'العودة' : 'Back'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
