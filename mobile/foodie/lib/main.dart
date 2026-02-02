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

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => LanguageProvider(prefs)),
        ChangeNotifierProvider(create: (_) => AuthProvider(prefs)),
        ChangeNotifierProvider(create: (_) => AppModeProvider(prefs)),
        ChangeNotifierProvider(create: (_) => FoodProvider()),
        ChangeNotifierProvider(create: (_) => FilterProvider()),
        ChangeNotifierProvider(create: (_) => CountryProvider(prefs)),
        ChangeNotifierProxyProvider<CountryProvider, CartProvider>(
          create: (_) => CartProvider(prefs),
          update: (_, country, cart) => cart!..updateCountry(country.countryCode),
        ),
        ChangeNotifierProvider(create: (_) => MessageProvider()),
        ChangeNotifierProvider(create: (_) => OrderProvider()),
        ChangeNotifierProvider(create: (_) => MenuProvider()),
        ChangeNotifierProvider(create: (_) => NotificationProvider()),
        ChangeNotifierProvider(create: (_) => NavigationProvider()),
        ChangeNotifierProvider(create: (_) => FavoriteProvider()),
        ChangeNotifierProvider(create: (_) => MenuStateProvider()),
        ChangeNotifierProvider(create: (_) => CheckoutProvider()),
        ChangeNotifierProxyProvider<AuthProvider, AddressProvider>(
          create: (_) => AddressProvider(Provider.of<AuthProvider>(_, listen: false)),
          update: (_, auth, address) => AddressProvider(auth),
        ),
      ],
      child: const FoodieApp(),
    ),
  );
}
