/**
 * Global Typography System for Web App
 * Implements Arabic typography rule: Arabic font sizes = EnglishBaseFontSize * 1.10 (10% increase)
 */

// Define typography roles with English base sizes
const TYPOGRAPHY_ROLES = {
  display: { english: 32, arabicMultiplier: 1.10 },       // 32 -> 35.2
  h1: { english: 28, arabicMultiplier: 1.10 },            // 28 -> 30.8
  h2: { english: 24, arabicMultiplier: 1.10 },            // 24 -> 26.4
  h3: { english: 20, arabicMultiplier: 1.10 },            // 20 -> 22
  h4: { english: 18, arabicMultiplier: 1.10 },            // 18 -> 19.8
  body: { english: 16, arabicMultiplier: 1.10 },          // 16 -> 17.6
  bodySmall: { english: 14, arabicMultiplier: 1.10 },     // 14 -> 15.4
  caption: { english: 12, arabicMultiplier: 1.10 },       // 12 -> 13.2
  button: { english: 14, arabicMultiplier: 1.10 },        // 14 -> 15.4
  label: { english: 12, arabicMultiplier: 1.10 },         // 12 -> 13.2
};

// Font families
const FONT_FAMILIES = {
  english: 'Inter',
  arabic: 'Inter', // Using Inter for both, but this can be changed to Arabic font if needed
};

/**
 * Get typography style based on role and language
 * @param {string} role - Typography role (display, h1, h2, body, etc.)
 * @param {string} language - Language code ('en' or 'ar')
 * @returns {Object} Style object with fontSize and fontFamily
 */
export const getTypographyStyle = (role, language = 'en') => {
  const roleConfig = TYPOGRAPHY_ROLES[role];
  
  if (!roleConfig) {
    console.warn(`Typography role '${role}' not found, using default`);
    return { fontSize: '16px', fontFamily: FONT_FAMILIES.english };
  }

  const baseSize = roleConfig.english;
  const multiplier = roleConfig.arabicMultiplier || 1.0;
  const fontSize = language === 'ar' ? baseSize * multiplier : baseSize;

  return {
    fontSize: `${fontSize}px`,
    fontFamily: language === 'ar' ? FONT_FAMILIES.arabic : FONT_FAMILIES.english,
  };
};

/**
 * Helper function to apply Arabic typography rule to custom font sizes
 * @param {number} englishBaseSize - Base font size in English
 * @param {string} language - Language code ('en' or 'ar')
 * @returns {string} Font size with 'px' suffix
 */
export const getArabicTypographySize = (englishBaseSize, language = 'en') => {
  if (language === 'ar') {
    return `${englishBaseSize * 1.10}px`;
  }
  return `${englishBaseSize}px`;
};

/**
 * MUI sx prop helper for typography
 * @param {string} role - Typography role
 * @param {string} language - Language code ('en' or 'ar')
 * @param {Object} additionalStyles - Additional style overrides
 * @returns {Object} Combined style object
 */
export const getSxTypography = (role, language = 'en', additionalStyles = {}) => {
  const typographyStyle = getTypographyStyle(role, language);
  return {
    ...typographyStyle,
    ...additionalStyles,
  };
};