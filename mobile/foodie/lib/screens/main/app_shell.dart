import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/navigation_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/language_provider.dart';
import '../../config/theme.dart';
import '../../widgets/global_bottom_navigation.dart';
import 'home_screen.dart';
import '../menu/menu_screen.dart';
import '../favorites/favorites_screen.dart';
import '../cart/cart_screen.dart';
import '../cook_hub/dashboard_screen.dart';
import '../cook_hub/cook_registration_screen.dart';

class AppShell extends StatelessWidget {
  const AppShell({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final nav = context.watch<NavigationProvider>();

    return Scaffold(
      body: IndexedStack(
        index: nav.shellIndex,
        children: const [
          HomeScreen(),
          MenuScreen(),
          _CookHubTab(),
          FavoritesScreen(),
          CartScreen(),
        ],
      ),
      bottomNavigationBar: const GlobalBottomNavigation(),
    );
  }
}

/// Routes to the correct Cook Hub child based on roleCookStatus.
///
/// active    → DashboardScreen (full cook dashboard + APIs)
/// pending   → _PendingCookView (no dashboard APIs, safe inline widget)
/// rejected  → _PendingCookView (same, shows rejected message)
/// suspended → _PendingCookView (same, shows suspended message)
/// none/null → CookRegistrationScreen (new registration form)
class _CookHubTab extends StatelessWidget {
  const _CookHubTab({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final cookStatus = user?.roleCookStatus;

    if (cookStatus == 'active') return const DashboardScreen();

    // Non-null, non-active status — user has applied but is not yet approved.
    // Do NOT render DashboardScreen here: it calls cook-only APIs that return
    // 403 for pending accounts, causing errors and potential blank screens.
    if (cookStatus == 'pending' ||
        cookStatus == 'rejected' ||
        cookStatus == 'suspended') {
      return _PendingCookView(cookStatus: cookStatus!);
    }

    // No application yet.
    return const CookRegistrationScreen();
  }
}

/// Inline Cook Hub tab widget for non-active cook accounts.
/// Embedded directly in the IndexedStack — has NO AppBar back button so it
/// can never trigger a Navigator.pop() on the root route.
class _PendingCookView extends StatelessWidget {
  final String cookStatus;
  const _PendingCookView({Key? key, required this.cookStatus}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isRTL = context.watch<LanguageProvider>().isArabic;
    final nav = context.read<NavigationProvider>();

    final IconData icon;
    final Color iconColor;
    final String title;
    final String body;

    switch (cookStatus) {
      case 'rejected':
        icon = Icons.cancel_outlined;
        iconColor = const Color(0xFFDC2626);
        title = isRTL ? 'تم رفض طلبك' : 'Application Not Approved';
        body = isRTL
            ? 'للأسف لم يتم قبول طلبك في الوقت الحالي. يمكنك التواصل مع الدعم لمزيد من التفاصيل.'
            : 'Unfortunately your cook application was not approved at this time. Please contact support for more details.';
        break;
      case 'suspended':
        icon = Icons.pause_circle_outline;
        iconColor = const Color(0xFFDC2626);
        title = isRTL ? 'حسابك موقوف' : 'Account Suspended';
        body = isRTL
            ? 'تم إيقاف حسابك مؤقتاً. يرجى التواصل مع الدعم لمعرفة السبب والحل.'
            : 'Your cook account has been suspended. Please contact support for more details.';
        break;
      case 'pending':
      default:
        icon = Icons.pending_actions_outlined;
        iconColor = const Color(0xFFFF7A00);
        title = isRTL ? 'طلبك قيد المراجعة' : 'Your Request is Pending';
        body = isRTL
            ? 'شكراً لانضمامك! فريقنا يراجع طلبك حالياً. سنخطرك فور اتخاذ قرار.'
            : 'Thank you for applying! Our team is reviewing your request and will notify you once a decision is made.';
        break;
    }

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, size: 80, color: iconColor),
                const SizedBox(height: 24),
                Text(
                  title,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  body,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 15,
                    color: AppTheme.textSecondary,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 40),
                // Take user to Home — safe navigation that never touches the
                // Navigator stack (avoids blank-screen on pop from empty stack).
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => nav.setActiveTab(
                      NavigationTab.home,
                      setAsOrigin: true,
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.accentColor,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Text(
                      isRTL ? 'العودة إلى الرئيسية' : 'Go to Home',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
