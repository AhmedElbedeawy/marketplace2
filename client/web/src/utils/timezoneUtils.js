/**
 * Timezone Utilities - Frontend Display Only
 * 
 * Maps cook's country code to IANA timezone IDs for DISPLAY PURPOSES ONLY.
 * readyAt computation/storage is done by the BACKEND only.
 * 
 * Timezone mapping (IANA timezone IDs):
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
export function getTimezoneId(countryCode) {
  if (!countryCode) return 'Asia/Riyadh';
  
  const country = countryCode.toUpperCase().trim();
  return TIMEZONE_IDS[country] || 'Asia/Riyadh';
}

/**
 * Get current time in cook's timezone using Intl API
 * @param {string} countryCode - Cook's country code
 * @returns {Date} Current time in cook's timezone
 */
export function getNowInCookTimezone(countryCode) {
  const timezone = getTimezoneId(countryCode);
  
  // Use Intl.DateTimeFormat to get current time in target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(new Date());
  const getPart = (type) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);
  
  // Create date from timezone parts
  const cookTime = new Date(getPart('year'), getPart('month') - 1, getPart('day'), getPart('hour'), getPart('minute'), getPart('second'));
  
  return cookTime;
}

/**
 * Get current "minutes from midnight" in cook's timezone
 * Used for comparing with cutoff/ready times
 * @param {string} countryCode - Cook's country code
 * @returns {number} Minutes from midnight in cook's timezone
 */
export function getCookTimeMinutesFromMidnight(countryCode) {
  const now = getNowInCookTimezone(countryCode);
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Get today's date components in cook's timezone
 * @param {string} countryCode - Cook's country code
 * @returns {Object} { year, month, day }
 */
export function getCookToday(countryCode) {
  const now = getNowInCookTimezone(countryCode);
  return {
    year: now.getFullYear(),
    month: now.getMonth(),
    day: now.getDate()
  };
}

/**
 * Format a time for display in a specific timezone
 * @param {Date} date - Date to format
 * @param {string} countryCode - Cook's country code
 * @param {string} format - 'time' or 'datetime'
 * @returns {string} Formatted string
 */
export function formatInCookTimezone(date, countryCode, format = 'time') {
  const timezone = getTimezoneId(countryCode);
  
  const options = {
    time: { hour: '2-digit', minute: '2-digit', hour12: false },
    datetime: { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }
  }[format];
  
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    ...options
  }).format(date);
}

/**
 * Create a Date representing a specific time in cook's timezone
 * @param {number} hours - Hours (0-23)
 * @param {number} minutes - Minutes (0-59)
 * @param {string} countryCode - Cook's country code
 * @param {number} dayOffset - Days from today (0=today, 1=tomorrow)
 * @returns {Date} Date in cook's timezone
 */
export function createCookTimeDate(hours, minutes, countryCode, dayOffset = 0) {
  const { year, month, day } = getCookToday(countryCode);
  const timezone = getTimezoneId(countryCode);
  
  // Create date at the target time in cook's timezone
  // First create in UTC, then interpret with timezone
  const targetDate = new Date(year, month, day + dayOffset, hours, minutes, 0);
  
  // Get the ISO string in the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Parse the formatted parts
  const parts = formatter.formatToParts(targetDate);
  const getPart = (type) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);
  
  // Create a Date that represents this time in cook's timezone
  return new Date(Date.UTC(getPart('year'), getPart('month') - 1, getPart('day'), getPart('hour'), getPart('minute')));
}

/**
 * Check if a time is before/after cutoff in cook's timezone
 * Used for display logic (today/tomorrow text)
 * @param {string} cutoffTime - Cutoff time in HH:MM format
 * @param {string} countryCode - Cook's country code
 * @returns {Object} { isBeforeCutoff, currentMinutes, cutoffMinutes }
 */
export function isBeforeCutoffInCookTimezone(cutoffTime, countryCode) {
  const currentMinutes = getCookTimeMinutesFromMidnight(countryCode);
  const [hours, mins] = (cutoffTime || '23:59').split(':').map(Number);
  const cutoffMinutes = hours * 60 + mins;
  
  return {
    isBeforeCutoff: currentMinutes < cutoffMinutes,
    currentMinutes,
    cutoffMinutes
  };
}
