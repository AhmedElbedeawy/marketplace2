import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';
import 'config/theme.dart';
import 'providers/language_provider.dart';
import 'providers/app_mode_provider.dart';
import 'routes/app_routes.dart';
import 'screens/splash/splash_screen.dart';

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
        // Always use main app shell - Cook Hub is now accessed via bottom navigation tab
        return MaterialApp(
          title: 'Foodie',
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
          // Clamp system text scale to prevent RenderFlex overflow on Android
          // when the user has "large font" set in accessibility settings.
          builder: (context, child) {
            final mq = MediaQuery.of(context);
            final theme = Theme.of(context);

            // Patch every TextTheme entry with Arabic-capable font fallbacks.
            // Without this, Inter/Noto Serif (no Arabic glyphs) causes one-frame
            // tofu squares when the locale switches EN→AR before the OS resolves
            // the glyph fallback chain.
            const arabicFallback = [
              'Geeza Pro',        // iOS system Arabic
              'Noto Naskh Arabic', // Android system Arabic
              'Arial',
              'sans-serif',
            ];
            TextStyle _withFallback(TextStyle? s) =>
                (s ?? const TextStyle()).copyWith(fontFamilyFallback: arabicFallback);

            return MediaQuery(
              data: mq.copyWith(
                textScaler: mq.textScaler.clamp(
                  minScaleFactor: 1.0,
                  maxScaleFactor: 1.15,
                ),
              ),
              child: Theme(
                data: theme.copyWith(
                  textTheme: TextTheme(
                    displayLarge:  _withFallback(theme.textTheme.displayLarge),
                    displayMedium: _withFallback(theme.textTheme.displayMedium),
                    displaySmall:  _withFallback(theme.textTheme.displaySmall),
                    headlineLarge: _withFallback(theme.textTheme.headlineLarge),
                    headlineMedium:_withFallback(theme.textTheme.headlineMedium),
                    headlineSmall: _withFallback(theme.textTheme.headlineSmall),
                    titleLarge:    _withFallback(theme.textTheme.titleLarge),
                    titleMedium:   _withFallback(theme.textTheme.titleMedium),
                    titleSmall:    _withFallback(theme.textTheme.titleSmall),
                    bodyLarge:     _withFallback(theme.textTheme.bodyLarge),
                    bodyMedium:    _withFallback(theme.textTheme.bodyMedium),
                    bodySmall:     _withFallback(theme.textTheme.bodySmall),
                    labelLarge:    _withFallback(theme.textTheme.labelLarge),
                    labelMedium:   _withFallback(theme.textTheme.labelMedium),
                    labelSmall:    _withFallback(theme.textTheme.labelSmall),
                  ),
                ),
                // Arabic glyph warm-up: an invisible Opacity(0) widget forces
                // CanvasKit to download and cache the Arabic font on the very
                // first frame — before the user can switch to Arabic locale.
                // Offstage would skip painting; Opacity(0) still paints (and
                // thus triggers the font download) but renders nothing visible.
                child: Stack(
                  children: [
                    child!,
                    // Arabic glyph warm-up: forces the font engine to begin
                    // caching Arabic glyphs on the very first painted frame,
                    // before the user sees any Arabic content.
                    //
                    // Rules that make this work:
                    //   1. left/top >= 0  — Stack clips at its edges (hardEdge).
                    //      Negative coords are never painted → no font load.
                    //   2. opacity > 0.0  — Flutter skips paint entirely when
                    //      opacity == 0.0 exactly → no font load.
                    //   3. fontFamily: 'Noto Naskh Arabic' — names the exact font
                    //      asset CanvasKit needs to fetch, so it targets the right
                    //      download rather than resolving via the fallback chain.
                    //   4. IgnorePointer + ExcludeSemantics — invisible to users
                    //      and accessibility tools; no touch interference.
                    Positioned(
                      left: 0,
                      top: 0,
                      child: IgnorePointer(
                        child: ExcludeSemantics(
                          child: Opacity(
                            opacity: 0.002,
                            child: Text(
                              'أبتثجحخدذرزسشصضطظعغفقكلمنهوي',
                              style: _withFallback(
                                const TextStyle(
                                  fontSize: 1,
                                  fontFamily: 'Noto Naskh Arabic',
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
          // SplashScreen is shown first; it navigates to AppRoutes after its
          // hold period. All app initialization is already complete at this
          // point, so the splash is a pure display hold (no loading state).
          home: const SplashScreen(),
          navigatorObservers: [RouteObserver<ModalRoute<void>>()],
        );
      },
    );
}
