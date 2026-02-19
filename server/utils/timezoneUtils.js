/**
 * Backend Timezone Utilities - Server-Side Computation
 * 
 * Uses IANA timezone IDs for accurate timezone handling.
 * This module is used by the backend to compute readyAt in cook's timezone.
 * 
 * Timezone mapping (IANA IDs):
 * - EG → Africa/Cairo
 * - SA → Asia/Riyadh
 * - AE → Asia/Dubai
 * - KW → Asia/Kuwait
 * - QA → Asia/Qatar
 */

// IANA timezone IDs for supported countries
const TIMEZONE_IDS = {
  'EG': 'Africa/Cairo',
  'SA': 'Asia/Riyadh',
  'AE': 'Asia/Dubai',
  'KW': 'Asia/Kuwait',
  'QA': 'Asia/Qatar'
};

/**
 * Get IANA timezone ID from country code
 * @param {string} countryCode - Two-letter country code (e.g., 'SA', 'EG')
 * @returns {string} IANA timezone ID (defaults to Asia/Riyadh)
 */
function getTimezoneId(countryCode) {
  if (!countryCode) return 'Asia/Riyadh';
  
  const country = countryCode.toUpperCase().trim();
  return TIMEZONE_IDS[country] || 'Asia/Riyadh';
}

/**
 * Parse HH:MM time string to minutes from midnight
 * @param {string} timeStr - Time in format "HH:MM"
 * @returns {number} Minutes from midnight
 */
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, mins] = timeStr.split(':').map(Number);
  return hours * 60 + mins;
}

/**
 * Get current time in cook's timezone
 * Returns object with hours, minutes, and day info
 * @param {string} countryCode - Cook's country code
 * @returns {Object} { hours, minutes, day, month, year }
 */
function getNowInCookTimezone(countryCode) {
  const timezone = getTimezoneId(countryCode);
  
  // Use toLocaleString with timezone option to get current time in target timezone
  const now = new Date();
  
  // Get time components in target timezone
  const options = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  
  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(now);
  const getPart = (type) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);
  
  return {
    hours: getPart('hour'),
    minutes: getPart('minute'),
    day: getPart('day'),
    month: getPart('month') - 1, // JavaScript months are 0-indexed
    year: getPart('year'),
    dayOfWeek: now.toLocaleString('en-US', { timeZone: timezone, weekday: 'short' })
  };
}

/**
 * Get current minutes from midnight in cook's timezone
 * @param {string} countryCode - Cook's country code
 * @returns {number} Minutes from midnight
 */
function getCookTimeMinutesFromMidnight(countryCode) {
  const cookTime = getNowInCookTimezone(countryCode);
  return cookTime.hours * 60 + cookTime.minutes;
}

/**
 * Calculate readyAt based on cutoff config using cook's timezone
 * 
 * @param {Object} config - prepReadyConfig from dish offer
 * @param {string} cookCountryCode - Cook's country code for timezone
 * @param {Date} orderTime - When the order was placed (default: now)
 * @returns {Object} Ready time calculation result
 */
function calculateReadyTimeWithTimezone(config, cookCountryCode, orderTime = new Date()) {
  const prepReadyConfig = config || { optionType: 'fixed', prepTimeMinutes: 45 };
  const countryCode = cookCountryCode || 'SA';
  
  // Get current time in cook's timezone
  const cookNow = getNowInCookTimezone(countryCode);
  const orderMinutes = cookNow.hours * 60 + cookNow.minutes;
  
  // Create order time in cook's timezone
  const orderTimeInCookTz = new Date(cookNow.year, cookNow.month, cookNow.day, cookNow.hours, cookNow.minutes, 0);
  
  const result = {
    optionType: prepReadyConfig.optionType,
    orderTime: orderTime.toISOString(),
    computedAt: new Date().toISOString(),
    timezone: getTimezoneId(countryCode)
  };
  
  switch (prepReadyConfig.optionType) {
    case 'fixed':
      // Simple: order time + fixed prep time
      const fixedMinutes = prepReadyConfig.prepTimeMinutes || 45;
      result.readyAt = new Date(orderTime.getTime() + fixedMinutes * 60000).toISOString();
      result.displayText = `${fixedMinutes} mins`;
      result.isRange = false;
      break;
      
    case 'range':
      // Range: order time + min/max prep time
      const minMinutes = prepReadyConfig.prepTimeMinMinutes || 30;
      const maxMinutes = prepReadyConfig.prepTimeMinutes || 60;
      result.readyAt = new Date(orderTime.getTime() + maxMinutes * 60000).toISOString();
      result.readyAtMin = new Date(orderTime.getTime() + minMinutes * 60000).toISOString();
      result.displayText = `${minMinutes}-${maxMinutes} mins`;
      result.isRange = true;
      break;
      
    case 'cutoff':
      // Cutoff-based: uses BEFORE cutoff time (beforeCutoffReadyTime)
      // This matches frontend display logic
      const cutoffMinutes = parseTimeToMinutes(prepReadyConfig.cutoffTime);
      const beforeCutoffReadyMinutes = parseTimeToMinutes(prepReadyConfig.beforeCutoffReadyTime);
      
      // Determine if in next-day mode: readyTime < cutoffTime
      const isNextDayMode = beforeCutoffReadyMinutes < cutoffMinutes;
      
      if (isNextDayMode) {
        // NEXT-DAY MODE: readyTime < cutoffTime
        // Always ready tomorrow regardless of when ordered
        const tomorrow = new Date(orderTimeInCookTz);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const [hours, mins] = prepReadyConfig.beforeCutoffReadyTime.split(':').map(Number);
        tomorrow.setHours(hours, mins, 0, 0);
        
        // Convert back to UTC for storage
        result.readyAt = tomorrow.toISOString();
        result.displayText = `Ready tomorrow at ${prepReadyConfig.beforeCutoffReadyTime}`;
        result.isNextDay = true;
        result.beforeCutoff = true;
      } else {
        // SAME-DAY MODE: readyTime >= cutoffTime
        if (orderMinutes >= cutoffMinutes) {
          // After cutoff: ready next day
          const nextDay = new Date(orderTimeInCookTz);
          nextDay.setDate(nextDay.getDate() + 1);
          
          const [hours, mins] = (prepReadyConfig.afterCutoffReadyTime || prepReadyConfig.beforeCutoffReadyTime).split(':').map(Number);
          nextDay.setHours(hours, mins, 0, 0);
          
          result.readyAt = nextDay.toISOString();
          result.displayText = `Ready tomorrow at ${prepReadyConfig.afterCutoffReadyTime || prepReadyConfig.beforeCutoffReadyTime}`;
          result.isNextDay = true;
          result.beforeCutoff = false;
        } else {
          // Before cutoff: ready today at ready time
          const readyToday = new Date(orderTimeInCookTz);
          
          const [hours, mins] = prepReadyConfig.beforeCutoffReadyTime.split(':').map(Number);
          readyToday.setHours(hours, mins, 0, 0);
          
          result.readyAt = readyToday.toISOString();
          result.displayText = `Ready today at ${prepReadyConfig.beforeCutoffReadyTime}`;
          result.isNextDay = false;
          result.beforeCutoff = true;
        }
      }
      result.cutoffTime = prepReadyConfig.cutoffTime;
      result.beforeCutoffReadyTime = prepReadyConfig.beforeCutoffReadyTime;
      break;
      
    default:
      // Default fallback: 45 mins
      const defaultMinutes = 45;
      result.readyAt = new Date(orderTime.getTime() + defaultMinutes * 60000).toISOString();
      result.displayText = `${defaultMinutes} mins`;
      result.isRange = false;
  }
  
  return result;
}

module.exports = {
  getTimezoneId,
  getNowInCookTimezone,
  getCookTimeMinutesFromMidnight,
  parseTimeToMinutes,
  calculateReadyTimeWithTimezone
};
