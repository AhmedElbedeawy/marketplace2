import 'dart:async';
import 'package:flutter/material.dart';
import '../../routes/app_routes.dart';

/// Full-screen splash shown once at app launch.
///
/// Sizing rules (device AR = screen width ÷ screen height):
///
///   AR >= 375/812  →  fitWidth + Alignment.topCenter
///     Scale the image so its width equals the screen width.
///     The image may be taller than the screen; overflow is hidden
///     from the bottom only (top-aligned crop).
///
///   AR <  375/812  →  fitHeight + Alignment.center
///     Scale the image so its height equals the screen height.
///     The image may be wider than the screen; overflow is hidden
///     equally from the left and right edges (centered crop).
///
/// 375/812 is the logical-pixel AR of the iPhone X — the design baseline
/// for the splash artwork. The image aspect ratio is always preserved;
/// no stretching or distortion occurs in either mode.
class SplashScreen extends StatefulWidget {
  const SplashScreen({Key? key}) : super(key: key);

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  // How long to display the splash before entering the app.
  // All initialization (fonts, Firebase, SharedPreferences) is already
  // complete by the time runApp is called, so this is a pure display hold.
  static const Duration _kSplashDuration = Duration(seconds: 2);

  // Reference aspect ratio: iPhone X logical-pixel dimensions (375 × 812).
  static const double _kReferenceAR = 375.0 / 812.0; // ≈ 0.4621

  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer(_kSplashDuration, _navigateToApp);
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _navigateToApp() {
    if (!mounted) return;
    // rootNavigator: true targets the MaterialApp navigator so AppRoutes —
    // which owns its own nested Navigator — sits at the correct stack level,
    // matching the architecture that existed before the splash was introduced.
    Navigator.of(context, rootNavigator: true).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (_, __, ___) => const AppRoutes(),
        // No animation: the app shell appears instantly after the hold.
        transitionDuration: Duration.zero,
        reverseTransitionDuration: Duration.zero,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final double deviceAR = size.width / size.height;

    final bool fitHeight = deviceAR >= _kReferenceAR;

    // BoxFit.fitWidth: scales the image to fill the container's width;
    //   any excess height is hidden by the widget's own paint bounds.
    //   Alignment.topCenter keeps the top of the image visible; the bottom
    //   is cropped.
    //
    // BoxFit.fitHeight: scales the image to fill the container's height;
    //   any excess width is hidden by the widget's own paint bounds.
    //   Alignment.center distributes the hidden width equally on both sides.
    //
    // Image.asset clips its own content to the widget's layout bounds, so
    // no explicit ClipRect is needed.
    return Scaffold(
      backgroundColor: const Color(0xFFEAC58F),
      body: SizedBox.expand(
        child: Image.asset(
          'assets/images/Splash.jpg',
          fit: fitHeight ? BoxFit.fitWidth : BoxFit.fitHeight,
          alignment: fitHeight ? Alignment.topCenter : Alignment.center,
        ),
      ),
    );
  }
}
