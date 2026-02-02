/**
 * Prep Ready Time Utilities
 * 
 * Shared pure JS utilities for calculating dish preparation and ready times.
 * Used by backend controllers and frontend clients.
 * 
 * Supported prep configurations:
 * - fixed: Fixed prep time (e.g., 45 mins)
 * - range: Range of prep times (e.g., 30-60 mins)
 * - cutoff: Cutoff-based rule with before/after times
 */

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
 * Format minutes from midnight to HH:MM
 * @param {number} minutes - Minutes from midnight
 * @returns {string} Time in format "HH:MM"
 */
function minutesToTimeStr(minutes) {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Calculate ready time for an order based on prepReadyConfig
 * 
 * @param {Object} prepReadyConfig - The prep configuration
 * @param {Date} orderTime - When the order was placed (default: now)
 * @returns {Object} Ready time calculation result
 */
function calculateReadyTime(prepReadyConfig, orderTime = new Date()) {
  const config = prepReadyConfig || { optionType: 'fixed', prepTimeMinutes: 45 };
  const orderMinutes = orderTime.getHours() * 60 + orderTime.getMinutes();
  
  const result = {
    optionType: config.optionType,
    orderTime: orderTime.toISOString(),
    computedAt: new Date().toISOString()
  };
  
  switch (config.optionType) {
    case 'fixed':
      // Simple: order time + fixed prep time
      const fixedMinutes = config.prepTimeMinutes || 45;
      result.readyAt = new Date(orderTime.getTime() + fixedMinutes * 60000).toISOString();
      result.displayText = `${fixedMinutes} mins`;
      result.isRange = false;
      break;
      
    case 'range':
      // Range: order time + min/max prep time
      const minMinutes = config.prepTimeMinMinutes || 30;
      const maxMinutes = config.prepTimeMinutes || 60;
      result.readyAt = new Date(orderTime.getTime() + maxMinutes * 60000).toISOString();
      result.readyAtMin = new Date(orderTime.getTime() + minMinutes * 60000).toISOString();
      result.displayText = `${minMinutes}-${maxMinutes} mins`;
      result.isRange = true;
      break;
      
    case 'cutoff':
      // Cutoff-based: check if order is before/after cutoff time
      const cutoffMinutes = parseTimeToMinutes(config.cutoffTime);
      const afterCutoffReadyMinutes = parseTimeToMinutes(config.afterCutoffReadyTime);
      
      if (orderMinutes >= cutoffMinutes) {
        // After cutoff: ready next day at fixed time
        const nextDay = new Date(orderTime);
        nextDay.setDate(nextDay.getDate() + 1);
        const [hours, mins] = config.afterCutoffReadyTime.split(':').map(Number);
        nextDay.setHours(hours, mins, 0, 0);
        
        result.readyAt = nextDay.toISOString();
        result.displayText = `Ready tomorrow at ${config.afterCutoffReadyTime}`;
        result.isNextDay = true;
        result.beforeCutoff = false;
      } else {
        // Before cutoff: ready at cutoff time + buffer
        const readyToday = new Date(orderTime);
        const [hours, mins] = config.cutoffTime.split(':').map(Number);
        readyToday.setHours(hours, mins, 0, 0);
        
        // Add buffer (half the time until cutoff)
        const bufferMinutes = Math.max(0, (cutoffMinutes - orderMinutes) / 2);
        readyToday.setMinutes(readyToday.getMinutes() + bufferMinutes);
        
        result.readyAt = readyToday.toISOString();
        result.displayText = `Ready by ${config.cutoffTime}`;
        result.isNextDay = false;
        result.beforeCutoff = true;
      }
      result.cutoffTime = config.cutoffTime;
      result.afterCutoffReadyTime = config.afterCutoffReadyTime;
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

/**
 * Format prep ready display text for UI
 * 
 * @param {Object} prepReadyConfig - The prep configuration
 * @param {string} language - 'en' or 'ar'
 * @returns {string} Localized display text
 */
function formatPrepReadyDisplay(prepReadyConfig, language = 'en') {
  const config = prepReadyConfig || { optionType: 'fixed', prepTimeMinutes: 45 };
  
  const isRTL = language === 'ar';
  const minsLabel = isRTL ? 'دقيقة' : 'mins';
  const minsRangeLabel = isRTL ? 'دقيقة - ' : '-';
  const readyByLabel = isRTL ? 'جاهز بحلول' : 'Ready by';
  const tomorrowLabel = isRTL ? 'غداً عند' : 'Ready tomorrow at';
  const sameDayLabel = isRTL ? 'نفس اليوم عند' : 'Same day at';
  
  switch (config.optionType) {
    case 'fixed':
      return `${config.prepTimeMinutes || 45} ${minsLabel}`;
      
    case 'range':
      const min = config.prepTimeMinMinutes || 30;
      const max = config.prepTimeMinutes || 60;
      return isRTL ? `${max}-${min} ${minsLabel}` : `${min}-${max} ${minsLabel}`;
      
    case 'cutoff':
      if (config.cutoffTime && config.afterCutoffReadyTime) {
        return `${readyByLabel} ${config.cutoffTime} / ${tomorrowLabel} ${config.afterCutoffReadyTime}`;
      }
      return `${config.prepTimeMinutes || 45} ${minsLabel}`;
      
    default:
      return `${config.prepTimeMinutes || 45} ${minsLabel}`;
  }
}

/**
 * Validate prep ready config
 * 
 * @param {Object} prepReadyConfig - The prep configuration to validate
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
function validatePrepReadyConfig(prepReadyConfig) {
  const errors = [];
  
  if (!prepReadyConfig) {
    return { isValid: false, errors: ['Config is required'] };
  }
  
  const { optionType, prepTimeMinutes, prepTimeMinMinutes, cutoffTime, afterCutoffReadyTime } = prepReadyConfig;
  
  if (!optionType || !['fixed', 'range', 'cutoff'].includes(optionType)) {
    errors.push('optionType must be: fixed, range, or cutoff');
  }
  
  if (optionType === 'fixed' || optionType === 'range') {
    if (!prepTimeMinutes || prepTimeMinutes < 5 || prepTimeMinutes > 1440) {
      errors.push('prepTimeMinutes must be between 5 and 1440 (24 hours)');
    }
  }
  
  if (optionType === 'range') {
    if (!prepTimeMinMinutes || prepTimeMinMinutes < 5 || prepTimeMinMinutes > prepTimeMinutes) {
      errors.push('prepTimeMinMinutes must be between 5 and prepTimeMinutes');
    }
  }
  
  if (optionType === 'cutoff') {
    if (!cutoffTime || !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(cutoffTime)) {
      errors.push('cutoffTime must be in HH:MM format');
    }
    if (!afterCutoffReadyTime || !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(afterCutoffReadyTime)) {
      errors.push('afterCutoffReadyTime must be in HH:MM format');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Check if current time is before cutoff
 * 
 * @param {string} cutoffTime - Cutoff time in HH:MM format
 * @param {Date} checkTime - Time to check (default: now)
 * @returns {boolean} True if before cutoff
 */
function isBeforeCutoff(cutoffTime, checkTime = new Date()) {
  const cutoffMinutes = parseTimeToMinutes(cutoffTime);
  const currentMinutes = checkTime.getHours() * 60 + checkTime.getMinutes();
  return currentMinutes < cutoffMinutes;
}

module.exports = {
  parseTimeToMinutes,
  minutesToTimeStr,
  calculateReadyTime,
  formatPrepReadyDisplay,
  validatePrepReadyConfig,
  isBeforeCutoff
};
