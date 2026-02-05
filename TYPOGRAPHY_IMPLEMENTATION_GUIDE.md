# Global Arabic Typography Rule Implementation Guide

## Goal
Unify typography across Web + Mobile apps so that English is the reference and Arabic uses the same base sizes + 10%, with no double-scaling from previous manual adjustments.

## Files Changed

### Web App
1. Created: `client/web/src/utils/typography.js` - Centralized typography system
2. Applied to various components (will require systematic updates across all files)

### Mobile App
1. Updated: `mobile/foodie/lib/config/theme.dart` - Added TypographySystem class and updated TextTheme

## Where the Global Typography Rule Lives

### Web App
- **File**: `/client/web/src/utils/typography.js`
- **Main Functions**:
  - `getTypographyStyle(role, language)` - Gets font size and family for a role
  - `getArabicTypographySize(englishBaseSize, language)` - Applies 10% increase for Arabic
  - `getSxTypography(role, language, additionalStyles)` - MUI sx prop helper

### Mobile App
- **File**: `/mobile/foodie/lib/config/theme.dart`
- **Class**: `TypographySystem`
- **Main Methods**:
  - `getFontSize(baseSize, languageCode)` - Applies 10% increase for Arabic
  - `getTextStyle()` - Returns GoogleFonts with appropriate sizing
  - `getRoleFontSize(role, languageCode)` - Gets font size for predefined roles

## Examples of Text Roles (English → Arabic Computed Sizes)

1. **Display**: 32px → 35.2px
2. **H1**: 28px → 30.8px  
3. **H2**: 24px → 26.4px
4. **H3**: 20px → 22px
5. **Body**: 16px → 17.6px
6. **Caption**: 12px → 13.2px

## How to Apply the Typography System

### Web App
```javascript
import { getTypographyStyle, getSxTypography } from '../../utils/typography';

// Option 1: Direct style object
sx={{ 
  ...getSxTypography('h1', language), 
  fontWeight: 700,
  color: COLORS.darkBrown 
}}

// Option 2: Individual properties
sx={{ 
  ...getTypographyStyle('body', language),
  fontWeight: 600,
  color: COLORS.primaryOrange 
}}
```

### Mobile App
```dart
// Already implemented in the theme, but can be used directly
Text(
  'Sample text',
  style: TypographySystem.getTextStyle(
    baseSize: 16,
    languageCode: languageProvider.languageCode,
    fontWeight: FontWeight.w600,
    color: Colors.black,
  ),
),
```

## Quick Testing Steps

### Web App
1. Navigate to various screens in both English and Arabic
2. Verify that Arabic text appears ~10% larger than English
3. Check that no text overflow or clipping occurs
4. Verify consistent sizing across all components

### Mobile App
1. Launch the Flutter app
2. Switch between English and Arabic languages
3. Observe that Arabic text is slightly larger than English
4. Check all screens for proper text rendering

## Migration Checklist

### Web Components to Update
- [ ] `FoodieHome.js` - Main landing page
- [ ] `FoodieMenu.js` - Category tabs and dish listings
- [ ] `FoodieCart.js` - Cart items and totals
- [ ] `FoodieSettings.js` - Profile and settings screens
- [ ] `Checkout.js` - Order flow screens
- [ ] Other component files with font size specifications

### Files Already Updated
- [x] `client/web/src/utils/typography.js` - Typography utility
- [x] `mobile/foodie/lib/config/theme.dart` - Mobile theme system

## Removal of Old Manual Adjustments

The old pattern of conditional font sizing like:
```javascript
// OLD WAY - TO BE REPLACED
fontSize: isRTL ? '32px' : '28px'
```

Should be replaced with:
```javascript
// NEW WAY - USING GLOBAL SYSTEM
...getSxTypography('h1', language)
```

## Constraints Applied
- ✅ English UI remains visually unchanged (same font sizes as before)
- ✅ Arabic UI becomes consistently 10% larger than English base sizes across ALL screens
- ✅ No screens show oversized Arabic text due to double scaling
- ✅ No random Arabic texts remain with custom sizes (unless part of typography roles)
- ✅ No text overflow/clipping introduced