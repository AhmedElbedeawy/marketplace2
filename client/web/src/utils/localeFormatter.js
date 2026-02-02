/**
 * Locale Formatter Utilities
 * Formats dates, numbers, and currency based on current language
 */

/**
 * Format date according to locale
 * @param {string|Date} date - Date to format
 * @param {string} language - 'en' or 'ar'
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date
 */
export const formatDate = (date, language = 'en', options = {}) => {
  const locale = language === 'ar' ? 'ar-EG' : 'en-US';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...options
  };
  
  return new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj);
};

/**
 * Format date and time according to locale
 * @param {string|Date} date - Date to format
 * @param {string} language - 'en' or 'ar'
 * @returns {string} Formatted date and time
 */
export const formatDateTime = (date, language = 'en') => {
  const locale = language === 'ar' ? 'ar-SA' : 'en-SA';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const dateOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };
  
  const timeOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };
  
  const datePart = new Intl.DateTimeFormat(locale, dateOptions).format(dateObj);
  const timePart = new Intl.DateTimeFormat(locale, timeOptions).format(dateObj);
  
  return `${datePart} - ${timePart}`;
};

/**
 * Format number according to locale
 * @param {number} number - Number to format
 * @param {string} language - 'en' or 'ar'
 * @param {object} options - Intl.NumberFormat options
 * @returns {string} Formatted number
 */
export const formatNumber = (number, language = 'en', options = {}) => {
  const locale = language === 'ar' ? 'ar-EG' : 'en-US';
  return new Intl.NumberFormat(locale, options).format(number);
};

/**
 * Format currency according to locale
 * @param {number} amount - Amount to format
 * @param {string} language - 'en' or 'ar'
 * @param {string} currency - Currency code (default: 'SAR')
 * @returns {string} Formatted currency
 */
export const formatCurrency = (amount, language = 'en', currency = 'SAR') => {
  const val = Number(amount) || 0;
  
  if (language === 'ar') {
    const arCurrency = currency === 'SAR' ? 'ر.س' : 
                      (currency === 'EGP' ? 'ج.م' : 
                      (currency === 'AED' ? 'د.إ' : 
                      (currency === 'KWD' ? 'د.ك' : 
                      (currency === 'QAR' ? 'ر.ق' : currency))));
    
    const formatted = new Intl.NumberFormat('ar-SA', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(val);
    
    return `${formatted} ${arCurrency}`;
  }
  
  return `${currency} ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(val)}`;
};

/**
 * Format percentage according to locale
 * @param {number} value - Value to format as percentage
 * @param {string} language - 'en' or 'ar'
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage
 */
export const formatPercentage = (value, language = 'en', decimals = 0) => {
  const locale = language === 'ar' ? 'ar-EG' : 'en-US';
  
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value / 100);
};

/**
 * Get numeric characters based on language
 * For Arabic, optionally use Eastern Arabic numerals (٠١٢٣٤٥٦٧٨٩)
 * @param {string|number} value - Value to convert
 * @param {string} language - 'en' or 'ar'
 * @param {boolean} useEasternArabic - Use Eastern Arabic numerals
 * @returns {string} Converted number
 */
export const convertNumerals = (value, language = 'en', useEasternArabic = true) => {
  if (language !== 'ar' || !useEasternArabic) {
    return String(value);
  }
  
  const easternArabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(value).replace(/\d/g, (digit) => easternArabicNumerals[digit]);
};
