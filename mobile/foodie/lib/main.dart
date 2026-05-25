import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';
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
import 'providers/offer_provider.dart';
import 'providers/cook_profile_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Pre-load all fonts used by the app before runApp so the first frame
  // renders with the correct typefaces and no visible font swap occurs.
  //
  // Inter — app-wide body/UI font (ThemeData.fontFamily + all textTheme styles).
  //   ThemeData is constructed inside runApp, AFTER pendingFonts() returns, so
  //   the 15 GoogleFonts.inter() calls in theme.dart would otherwise fire too
  //   late and every screen would flash from OS-default → Inter on first render.
  //
  // Poppins — login screen brand title ("ElTekkeya").
  //
  // Cardo / OoohBaby / ScheherazadeNew / Marhey — decorative hero dish card fonts.
  //
  // On first launch each font is downloaded once and cached on device.
  // All subsequent launches serve from cache and this block is near-instant.
  GoogleFonts.inter();
  // Each call must match the exact FontWeight used in the UI.
  // google_fonts loads a separate .ttf file per weight; calling with no
  // arguments (default = w400) does NOT pre-load a bold variant, leaving
  // the bold file to be fetched asynchronously on first render → visible flash.
  GoogleFonts.poppins(fontWeight: FontWeight.w700);         // login "ElTekkeya" title
  GoogleFonts.instrumentSans(fontWeight: FontWeight.bold);  // hero card dish name (EN + AR)
  GoogleFonts.ooohBaby();                                   // hero card description (EN) — w400
  GoogleFonts.marhey();                                     // hero card description (AR) — w400
  await GoogleFonts.pendingFonts();

  // Pre-decode Splash.jpg into PaintingBinding.imageCache before runApp.
  // Image.asset checks the cache synchronously during the first build, so if
  // the decoded frame is already present SplashScreen renders the image on
  // frame 1 with no background-only flash. The pattern mirrors pendingFonts()
  // above: register the work, await completion, then proceed to runApp.
  final ImageStream splashStream =
      const AssetImage('assets/images/Splash.jpg').resolve(ImageConfiguration.empty);
  final Completer<void> splashReady = Completer<void>();
  final ImageStreamListener splashListener = ImageStreamListener(
    (_, __) { if (!splashReady.isCompleted) splashReady.complete(); },
    onError: (_, __) { if (!splashReady.isCompleted) splashReady.complete(); },
  );
  splashStream.addListener(splashListener);
  await splashReady.future;
  splashStream.removeListener(splashListener);

  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  // Lock the app to portrait-up on Android and iOS.
  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
    statusBarBrightness: Brightness.light,
  ));
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
        ChangeNotifierProvider(create: (_) => OfferProvider()),
        ChangeNotifierProvider(create: (_) => CookProfileProvider()),
        ChangeNotifierProxyProvider<AuthProvider, CookDashboardProvider>(
          create: (context) => CookDashboardProvider(context.read<AuthProvider>()),
          update: (_, auth, cookDash) => cookDash!..fetchDashboardData(cookId: auth.user?.id),
        ),
      ],
      child: const FoodieApp(),
    ),
  );
}
