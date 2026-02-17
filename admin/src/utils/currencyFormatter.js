/**
 * Currency Formatter Utility
 * Maps country codes to currency symbols and formats amounts
 */

const currencyMap = {
  'SA': { symbol: 'ر.س', code: 'SAR', locale: 'ar-SA' },
  'AE': { symbol: 'د.إ', code: 'AED', locale: 'ar-AE' },
  'EG': { symbol: 'ج.م', code: 'EGP', locale: 'ar-EG' },
  'KW': { symbol: 'د.ك', code: 'KWD', locale: 'ar-KW' },
  'QA': { symbol: 'ر.ق', code: 'QAR', locale: 'ar-QA' },
  'JO': { symbol: 'د.ا', code: 'JOD', locale: 'ar-JO' },
  'BH': { symbol: 'د.ب', code: 'BHD', locale: 'ar-BH' },
  'OM': { symbol: 'ر.ع.', code: 'OMR', locale: 'ar-OM' },
};

export const getCurrencySymbol = (countryCode) => {
  const normalizedCode = (countryCode || 'SA').toUpperCase();
  return currencyMap[normalizedCode]?.symbol || '$';
};

export const formatCurrency = (amount, countryCode, showCode = false) => {
  if (amount === null || amount === undefined) return '-';
  const symbol = getCurrencySymbol(countryCode);
  const formatted = Number(amount).toFixed(2);
  const currencyCode = currencyMap[(countryCode || 'SA').toUpperCase()]?.code;
  return showCode ? `${formatted} ${currencyCode}` : `${symbol} ${formatted}`;
};

export default {
  getCurrencySymbol,
  formatCurrency,
};
