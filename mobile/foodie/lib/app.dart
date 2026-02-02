import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';
import 'config/theme.dart';
import 'providers/language_provider.dart';
import 'providers/app_mode_provider.dart';
import 'routes/app_routes.dart';
import 'screens/cook_hub/cook_hub_home_screen.dart';

// Custom page transition builder with no animation
class NoTransitionBuilder extends PageTransitionsBuilder {
  const NoTransitionBuilder();

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    return child;
  }
}

class FoodieApp extends StatelessWidget {
  const FoodieApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) => Consumer2<LanguageProvider, AppModeProvider>(
      builder: (context, languageProvider, appModeProvider, _) {
        // Determine which home screen to show based on app mode
        final Widget homeScreen = appModeProvider.isCookHubMode
            ? const CookHubHomeScreen()
            : const AppRoutes();

        return MaterialApp(
          title: appModeProvider.isCookHubMode ? 'Cook Hub' : 'Foodie',
          theme: AppTheme.lightTheme.copyWith(
            pageTransitionsTheme: const PageTransitionsTheme(
              builders: {
                TargetPlatform.android: NoTransitionBuilder(),
                TargetPlatform.iOS: NoTransitionBuilder(),
                TargetPlatform.linux: NoTransitionBuilder(),
                TargetPlatform.macOS: NoTransitionBuilder(),
                TargetPlatform.windows: NoTransitionBuilder(),
              },
            ),
          ),
          darkTheme: AppTheme.darkTheme.copyWith(
            pageTransitionsTheme: const PageTransitionsTheme(
              builders: {
                TargetPlatform.android: NoTransitionBuilder(),
                TargetPlatform.iOS: NoTransitionBuilder(),
                TargetPlatform.linux: NoTransitionBuilder(),
                TargetPlatform.macOS: NoTransitionBuilder(),
                TargetPlatform.windows: NoTransitionBuilder(),
              },
            ),
          ),
          themeMode: ThemeMode.system,
          locale: languageProvider.locale,
          localizationsDelegates: const [
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          supportedLocales: const [
            Locale('en', 'US'),
            Locale('ar', 'SA'),
          ],
          home: homeScreen,
          navigatorObservers: [RouteObserver<ModalRoute<void>>()],
        );
      },
    );
}
