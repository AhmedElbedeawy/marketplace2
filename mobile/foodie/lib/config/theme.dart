import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Global Typography System for Mobile App
/// Implements Arabic typography rule: Arabic font sizes = EnglishBaseFontSize * 1.10 (10% increase)
class TypographySystem {
  /// Get font size based on language and base size
  static double getFontSize(double baseSize, String languageCode) {
    if (languageCode == 'ar') {
      return baseSize * 1.10; // 10% increase for Arabic
    }
    return baseSize;
  }

  /// Get text style with language-appropriate sizing
  static TextStyle getTextStyle({
    required double baseSize,
    required String languageCode,
    FontWeight fontWeight = FontWeight.w400,
    Color color = Colors.black,
    FontStyle fontStyle = FontStyle.normal,
  }) {
    return GoogleFonts.inter(
      fontSize: getFontSize(baseSize, languageCode),
      fontWeight: fontWeight,
      color: color,
      fontStyle: fontStyle,
    );
  }

  /// Get Arabic-appropriate font size for a given role
  static double getRoleFontSize(String role, String languageCode) {
    double baseSize;
    
    switch (role) {
      case 'display':
        baseSize = 32.0;
        break;
      case 'h1':
        baseSize = 28.0;
        break;
      case 'h2':
        baseSize = 24.0;
        break;
      case 'h3':
        baseSize = 20.0;
        break;
      case 'h4':
        baseSize = 18.0;
        break;
      case 'body':
        baseSize = 16.0;
        break;
      case 'bodySmall':
        baseSize = 14.0;
        break;
      case 'caption':
        baseSize = 12.0;
        break;
      case 'button':
        baseSize = 14.0;
        break;
      case 'label':
        baseSize = 12.0;
        break;
      default:
        baseSize = 16.0; // default body size
        break;
    }
    
    return getFontSize(baseSize, languageCode);
  }
}

class AppTheme {
  // Colors - Exact design specifications
  static const Color primaryColor = Color(0xFF333333); // Dark charcoal grey
  static const Color accentColor = Color(0xFFFCD535); // Yellow accent for active states
  static const Color backgroundColor = Color(0xFFF5F5F5); // Light grey background
  static const Color surfaceColor = Color(0xFFFFFFFF);
  static const Color dividerColor = Color(0xFFE0E0E0);
  static const Color textPrimary = Color(0xFF000000); // True black
  static const Color textSecondary = Color(0xFF555555); // Medium grey
  static const Color textHint = Color(0xFF999999);
  static const Color successColor = Color(0xFF27AE60);
  static const Color warningColor = Color(0xFFF39C12);
  static const Color errorColor = Color(0xFFE74C3C);
  static const Color searchBarBg = Color(0xFFD9D9D9); // Search bar background
  static const Color searchIconColor = Color(0xFF969494); // Search icon color
  static const Color filterButtonBg = Color(0xFFFCD535); // Filter button background

  // Light Theme
  static ThemeData get lightTheme => ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      primaryColor: primaryColor,
      scaffoldBackgroundColor: backgroundColor,
      fontFamily: GoogleFonts.inter().fontFamily,
      appBarTheme: AppBarTheme(
        backgroundColor: surfaceColor,
        elevation: 1,
        shadowColor: const Color(0x1A000000),
        iconTheme: const IconThemeData(color: primaryColor),
        titleTextStyle: GoogleFonts.inter(
          color: primaryColor,
          fontSize: 18,
          fontWeight: FontWeight.w600,
        ),
      ),
      colorScheme: const ColorScheme.light(
        primary: primaryColor,
        secondary: accentColor,
        surface: surfaceColor,
      ),
      textTheme: TextTheme(
        displayLarge: GoogleFonts.inter(
          fontSize: TypographySystem.getFontSize(32, 'en'), // Will be adjusted by language provider
          fontWeight: FontWeight.w600,
          color: textPrimary,
        ),
        displayMedium: GoogleFonts.inter(
          fontSize: TypographySystem.getFontSize(28, 'en'), // Will be adjusted by language provider
          fontWeight: FontWeight.w600,
          color: textPrimary,
        ),
        displaySmall: GoogleFonts.inter(
          fontSize: TypographySystem.getFontSize(24, 'en'), // Will be adjusted by language provider
          fontWeight: FontWeight.w600,
          color: textPrimary,
        ),
        headlineMedium: GoogleFonts.inter(
          fontSize: TypographySystem.getFontSize(20, 'en'), // Will be adjusted by language provider
          fontWeight: FontWeight.w600,
          color: textPrimary,
        ),
        headlineSmall: GoogleFonts.inter(
          fontSize: TypographySystem.getFontSize(18, 'en'), // Will be adjusted by language provider
          fontWeight: FontWeight.w600,
          color: textPrimary,
        ),
        titleLarge: GoogleFonts.inter(
          fontSize: TypographySystem.getFontSize(16, 'en'), // Will be adjusted by language provider
          fontWeight: FontWeight.w600,
          color: textPrimary,
        ),
        titleMedium: GoogleFonts.inter(
          fontSize: TypographySystem.getFontSize(14, 'en'), // Will be adjusted by language provider
          fontWeight: FontWeight.w600,
          color: textPrimary,
        ),
        titleSmall: GoogleFonts.inter(
          fontSize: TypographySystem.getFontSize(12, 'en'), // Will be adjusted by language provider
          fontWeight: FontWeight.w600,
          color: textSecondary,
        ),
        bodyLarge: GoogleFonts.inter(
          fontSize: TypographySystem.getFontSize(16, 'en'), // Will be adjusted by language provider
          fontWeight: FontWeight.w600,
          color: textPrimary,
        ),
        bodyMedium: GoogleFonts.inter(
          fontSize: TypographySystem.getFontSize(14, 'en'), // Will be adjusted by language provider
          fontWeight: FontWeight.w600,
          color: textPrimary,
        ),
        bodySmall: GoogleFonts.inter(
          fontSize: TypographySystem.getFontSize(12, 'en'), // Will be adjusted by language provider
          fontWeight: FontWeight.w600,
          color: textSecondary,
        ),
        labelLarge: GoogleFonts.inter(
          fontSize: TypographySystem.getFontSize(14, 'en'), // Will be adjusted by language provider
          fontWeight: FontWeight.w600,
          color: textPrimary,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: backgroundColor,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: dividerColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: dividerColor),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: accentColor, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: errorColor),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: errorColor, width: 2),
        ),
        hintStyle: const TextStyle(color: textHint),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: accentColor,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          elevation: 0,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: accentColor,
          side: const BorderSide(color: accentColor),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: dividerColor,
        thickness: 1,
      ),
    );

  // Dark Theme
  static ThemeData get darkTheme => ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      primaryColor: const Color(0xFFF5F5F5),
      scaffoldBackgroundColor: const Color(0xFF121212),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFF1E1E1E),
        elevation: 1,
        shadowColor: Color(0x1A000000),
      ),
      colorScheme: const ColorScheme.dark(
        primary: Color(0xFFF5F5F5),
        secondary: accentColor,
        surface: Color(0xFF1E1E1E),
      ),
    );
}
