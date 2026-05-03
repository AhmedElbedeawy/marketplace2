import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../../config/api_config.dart';
import '../cook/cook_profile_screen.dart' as public_cook;
import '../../config/theme.dart';
import '../../providers/language_provider.dart';
import '../../providers/auth_provider.dart';
import '../cook_hub/invoices_payouts_page.dart';
import '../cook_hub/marketing_page.dart';
import '../orders/foodie_my_orders_screen.dart';
import 'profile_screen.dart';
import 'addresses_screen.dart';
import 'payment_methods_screen.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;
    final authProvider = context.watch<AuthProvider>();
    final isCook = authProvider.user?.roleCookStatus == 'active';

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
          isRTL ? 'الحساب' : 'Account',
          style: const TextStyle(
            color: AppTheme.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildSection(
            isRTL ? 'الحساب' : 'Account',
            [
              _buildSettingItem(
                Icons.person_outline,
                isRTL ? 'الملف الشخصي' : 'Profile',
                () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (context) => const ProfileScreen()),
                  );
                },
              ),
              _buildSettingItem(
                Icons.receipt_long_outlined,
                isRTL ? 'طلباتي' : 'My Orders',
                () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (context) => const FoodieMyOrdersScreen()),
                  );
                },
              ),
              _buildSettingItem(
                Icons.location_on_outlined,
                isRTL ? 'العناوين' : 'Addresses',
                () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (context) => const AddressesScreen()),
                  );
                },
              ),
              _buildSettingItem(
                Icons.payment_outlined,
                isRTL ? 'طرق الدفع' : 'Payment Methods',
                () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (context) => const PaymentMethodsScreen()),
                  );
                },
              ),
            ],
          ),
          if (isCook) ...[
            const SizedBox(height: 20),
            _buildSection(
              isRTL ? 'طاهي' : 'Cook',
              [
                _buildSettingItem(
                  Icons.store_outlined,
                  isRTL ? 'ملف الطاهي' : 'Cook Profile',
                  () => _openCookPublicProfile(context, authProvider),
                ),
                _buildSettingItem(
                  Icons.account_balance_wallet_outlined,
                  isRTL ? 'الفواتير والمدفوعات' : 'Invoices & Payouts',
                  () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (context) => const InvoicesPayoutsPage()),
                    );
                  },
                ),
                _buildSettingItem(
                  Icons.campaign_outlined,
                  isRTL ? 'التسويق' : 'Marketing',
                  () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (context) => const MarketingPage()),
                    );
                  },
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _openCookPublicProfile(
      BuildContext context, AuthProvider authProvider) async {
    final token = authProvider.token;
    final userId = authProvider.user?.id;
    if (token == null || userId == null) return;

    try {
      final resp = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/cooks/user/$userId'),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (!context.mounted) return;
      if (resp.statusCode == 200) {
        final data = jsonDecode(resp.body)['data'] as Map<String, dynamic>;
        final cookId = data['_id'] as String? ?? '';
        final cookName = (data['storeName'] as String?) ??
            (data['userId']?['name'] as String?) ??
            'Kitchen';
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => public_cook.CookProfileScreen(
              cookId: cookId,
              cookName: cookName,
              isSelfView: true,
            ),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not load cook profile')),
        );
      }
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not load cook profile')),
      );
    }
  }

  Widget _buildSection(String title, List<Widget> children) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(
            title,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppTheme.textSecondary,
            ),
          ),
        ),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(children: children),
        ),
      ],
    );
  }

  Widget _buildSettingItem(
    IconData icon,
    String title,
    VoidCallback onTap, {
    Widget? trailing,
  }) {
    return ListTile(
      leading: Icon(icon, color: AppTheme.textPrimary, size: 22),
      title: Text(
        title,
        style: const TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w500,
          color: AppTheme.textPrimary,
        ),
      ),
      trailing: trailing ??
          const Icon(Icons.arrow_forward_ios,
              size: 14, color: AppTheme.textSecondary),
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
    );
  }
}
