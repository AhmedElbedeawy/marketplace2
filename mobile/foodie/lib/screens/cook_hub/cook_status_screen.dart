import 'package:flutter/material.dart';
import '../../config/theme.dart';
import '../../providers/language_provider.dart';
import 'package:provider/provider.dart';

class CookStatusScreen extends StatelessWidget {
  const CookStatusScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isRTL = context.watch<LanguageProvider>().isArabic;

    return Scaffold(
      appBar: AppBar(
        title: Text(isRTL ? 'حالة الطلب' : 'Request Status'),
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
              const Icon(Icons.pending_actions, size: 80, color: Colors.orange),
              const SizedBox(height: 24),
              Text(
                isRTL ? 'طلبك قيد المراجعة' : 'Your Request is Pending',
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              Text(
                isRTL 
                  ? 'شكراً لاهتمامك بالانضمام إلينا كشيف. فريقنا يقوم بمراجعة طلبك حالياً وسنخطرك بمجرد اتخاذ قرار.'
                  : 'Thank you for your interest in joining as a cook. Our team is currently reviewing your request and we will notify you once a decision is made.',
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
