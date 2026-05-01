import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'app.dart';
import 'providers/auth_provider.dart';
import 'providers/language_provider.dart';
import 'providers/food_provider.dart';
import 'providers/filter_provider.dart';
import 'providers/cart_provider.dart';
import 'providers/message_provider.dart';
import 'providers/app_mode_provider.dart';
import 'providers/order_provider.dart';
import 'providers/menu_provider.dart';
import 'providers/notification_provider.dart';
import 'providers/navigation_provider.dart';
import 'providers/favorite_provider.dart';
import 'providers/menu_state_provider.dart';
import 'providers/checkout_provider.dart';
import 'providers/country_provider.dart';
import 'providers/address_provider.dart';
import 'providers/cook_dashboard_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => LanguageProvider(prefs)),
        ChangeNotifierProvider(create: (_) => CountryProvider(prefs)),
        ChangeNotifierProvider(
          create: (context) => AuthProvider(prefs, context.read<CountryProvider>()),
        ),
        ChangeNotifierProvider(create: (_) => AppModeProvider(prefs)),
        ChangeNotifierProvider(create: (_) => FoodProvider(prefs)),
        ChangeNotifierProvider(create: (_) => FilterProvider()),
        ChangeNotifierProxyProvider2<CountryProvider, AuthProvider, CartProvider>(
          create: (_) => CartProvider(prefs),
          update: (_, country, auth, cart) => cart!
            ..updateCountry(country.countryCode)
            ..setUserId(auth.user?.id),
        ),
        ChangeNotifierProvider(create: (_) => MessageProvider()),
        ChangeNotifierProvider(create: (_) => OrderProvider()),
        ChangeNotifierProvider(create: (_) => MenuProvider()),
        ChangeNotifierProvider(create: (_) => NotificationProvider()),
        ChangeNotifierProvider(create: (_) => NavigationProvider()),
        ChangeNotifierProvider(create: (_) {
          final provider = FavoriteProvider();
          provider.init(); // Load persisted favorites
          return provider;
        }),
        ChangeNotifierProvider(create: (_) => MenuStateProvider()),
        ChangeNotifierProvider(create: (_) => CheckoutProvider()),
        ChangeNotifierProvider(create: (_) => AddressProvider()),
        ChangeNotifierProxyProvider<AuthProvider, CookDashboardProvider>(
          create: (context) => CookDashboardProvider(context.read<AuthProvider>()),
          update: (_, auth, cookDash) => cookDash!..fetchDashboardData(cookId: auth.user?.id),
        ),
      ],
      child: const FoodieApp(),
    ),
  );
}
