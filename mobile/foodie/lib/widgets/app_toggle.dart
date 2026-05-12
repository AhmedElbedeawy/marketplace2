import 'package:flutter/material.dart';

/// Unified app-wide toggle switch.
///
/// Matches the Refine Action Sheet (Popularity section) switch style exactly:
/// - Active track:   Color(0xFFFF7A00)  (app orange)
/// - Inactive track: Color(0xFFE0E0E0)  (light grey)
/// - Knob: white circle — 24 × 24 px in BOTH active and inactive states
/// - No track border / outline
///
/// Using a custom paint widget instead of Flutter's native Switch guarantees
/// identical knob size in both states — Flutter M3's Switch reduces the thumb
/// size when the control is off, which violates the design spec.
class AppToggle extends StatelessWidget {
  final bool value;
  final ValueChanged<bool> onChanged;

  const AppToggle({
    Key? key,
    required this.value,
    required this.onChanged,
  }) : super(key: key);

  // Track dimensions match the reference switch at Transform.scale(0.8):
  // Flutter default Switch is ~60 × 36 logical px → at 0.8 ≈ 48 × 29.
  // We use 52 × 32 to give the knob comfortable padding inside the track.
  static const double _trackW = 52;
  static const double _trackH = 32;
  static const double _knobSize = 24;
  static const double _knobMargin = 4; // horizontal gap between knob and track edge

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => onChanged(!value),
      child: Container(
        width: _trackW,
        height: _trackH,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(_trackH / 2),
          color: value ? const Color(0xFFFF7A00) : const Color(0xFFE0E0E0),
        ),
        child: AnimatedAlign(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeInOut,
          alignment: value ? Alignment.centerRight : Alignment.centerLeft,
          child: Container(
            width: _knobSize,
            height: _knobSize,
            margin: const EdgeInsets.symmetric(horizontal: _knobMargin),
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.white,
            ),
          ),
        ),
      ),
    );
  }
}
