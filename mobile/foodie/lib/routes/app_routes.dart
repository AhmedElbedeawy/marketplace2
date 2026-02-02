import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/signup_screen.dart';
import '../screens/main/home_screen.dart';
import '../screens/cook_hub/cook_status_screen.dart';
import '../screens/cook_hub/suspended_screen.dart';
import '../screens/cook_hub/cook_registration_screen.dart';
import '../screens/checkout/checkout_screen.dart';
import '../screens/checkout/order_success_screen.dart';
import '../screens/order/order_details_screen.dart';
import '../screens/cook_hub/offers_screen.dart';
import '../screens/cook_hub/cook_account_status_screen.dart';
import '../screens/notifications/announcement_details_screen.dart';
import '../screens/cook_hub/reviews_screen.dart';
import '../screens/cook_hub/payouts_screen.dart';
import '../screens/help/support_messages_screen.dart';

class AppRoutes extends StatelessWidget {
  const AppRoutes({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) => Consumer<AuthProvider>(
      builder: (context, authProvider, _) => Navigator(
          onGenerateRoute: (settings) {
            if (authProvider.isAuthenticated) {
              // Authenticated routes
              switch (settings.name) {
                case '/cook-status':
                  return MaterialPageRoute(
                    builder: (_) => const CookStatusScreen(),
                  );
                case '/suspended':
                  return MaterialPageRoute(
                    builder: (_) => const SuspendedScreen(),
                  );
                case '/suspension-details':
                  return MaterialPageRoute(
                    builder: (_) => const SuspendedScreen(),
                  );
                case '/cook-registration':
                  return MaterialPageRoute(
                    builder: (_) => const CookRegistrationScreen(),
                  );
                case '/cook/account-status':
                  return MaterialPageRoute(
                    builder: (_) => const CookAccountStatusScreen(),
                  );
                case '/checkout':
                  return MaterialPageRoute(
                    builder: (_) => const CheckoutScreen(),
                  );
                case '/order-success':
                  final orderId = settings.arguments as String;
                  return MaterialPageRoute(
                    builder: (_) => OrderSuccessScreen(orderId: orderId),
                  );
                case '/order-details':
                case '/orders':
                  final orderId = settings.arguments as String;
                  return MaterialPageRoute(
                    builder: (_) => OrderDetailsScreen(orderId: orderId),
                  );
                case '/offers':
                  return MaterialPageRoute(
                    builder: (_) => const OffersScreen(),
                  );
                case '/cook/reviews':
                  return MaterialPageRoute(
                    builder: (_) => const ReviewsScreen(),
                  );
                case '/cook/payouts':
                  return MaterialPageRoute(
                    builder: (_) => const PayoutsScreen(),
                  );
                case '/support/messages':
                  return MaterialPageRoute(
                    builder: (_) => const SupportMessagesScreen(),
                  );
                case '/announcement-details':
                  final announcementId = settings.arguments as String;
                  return MaterialPageRoute(
                    builder: (_) => AnnouncementDetailsScreen(announcementId: announcementId),
                  );
                case '/home':
                default:
                  return MaterialPageRoute(
                    builder: (_) => const HomeScreen(),
                  );
              }
            } else {
              // Not authenticated - show login/signup
              switch (settings.name) {
                case '/signup':
                  return MaterialPageRoute(
                    builder: (_) => const SignUpScreen(),
                  );
                case '/login':
                default:
                  return MaterialPageRoute(
                    builder: (_) => const LoginScreen(),
                  );
              }
            }
          },
        ),
    );
}
