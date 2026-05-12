import 'package:flutter/material.dart';

/// Shared responsive scaling helper.
///
/// All design dimensions are authored at a 375 px baseline width
/// (iPhone SE / standard mobile canvas).
///
/// Usage:
/// ```dart
/// // Consistent horizontal content padding on any page
/// padding: const EdgeInsets.symmetric(horizontal: AppScale.contentPadding)
///
/// // Available content width after both side paddings
/// final double w = AppScale.contentWidth(context);
///
/// // Scale any design value linearly from the 375 baseline
/// final double iconSize = AppScale.s(context, 24.0);
///
/// // Same but clamped to a min/max range
/// final double navHeight = AppScale.sc(context, 79.0, 68.0, 100.0);
/// ```
///
/// NOTE: Safe-area values (viewPadding.top / viewPadding.bottom) are
/// physical device constants and must never be multiplied by [factor].
abstract class AppScale {
  /// Design baseline width in logical pixels.
  static const double baseline = 375;

  /// Standard horizontal content padding used on all full-screen pages.
  /// 24 px each side → 48 px total → content area = screenWidth − 48.
  static const double contentPadding = 24;

  /// Linear scale factor for the current device (screenWidth / 375).
  static double factor(BuildContext context) =>
      MediaQuery.of(context).size.width / baseline;

  /// Available content width after subtracting both side paddings.
  static double contentWidth(BuildContext context) =>
      MediaQuery.of(context).size.width - contentPadding * 2;

  /// Scale [value] linearly from the 375 baseline.
  static double s(BuildContext context, double value) =>
      value * factor(context);

  /// Scale [value] and clamp the result between [min] and [max].
  static double sc(
    BuildContext context,
    double value,
    double min,
    double max,
  ) =>
      s(context, value).clamp(min, max);
}
