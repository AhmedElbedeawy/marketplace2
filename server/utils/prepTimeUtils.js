/**
 * Prep Time Calculation Utility
 * Mirrors PrepTimeUtils.computePrepTime() from Flutter frontend
 * Used for backend aggregate calculations in menu endpoint
 */

/**
 * Compute prep time minutes from prepReadyConfig
 * Returns the same result as PrepTimeUtils.computePrepTime().prepTimeMinutes
 * 
 * @param {Object} prepReadyConfig - The prepReadyConfig from DishOffer
 * @param {String} countryCode - Cook's country code for timezone calculation
 * @returns {Number} Prep time in minutes
 */
function computePrepTimeMinutes(prepReadyConfig, countryCode) {
  if (!prepReadyConfig || Object.keys(prepReadyConfig).length === 0) {
    return 30; // Default
  }

  const optionType = prepReadyConfig.optionType;

  if (optionType === 'cutoff') {
    return computeCutoffPrepTime(prepReadyConfig, countryCode);
  } else if (optionType === 'fixed') {
    return prepReadyConfig.prepTimeMinutes || 30;
  } else if (optionType === 'range') {
    const minMin = prepReadyConfig.prepTimeMinMinutes || 30;
    const maxMin = prepReadyConfig.prepTimeMaxMinutes || 60;
    // Same rule as Flutter: midpoint rounded
    return Math.round((minMin + maxMin) / 2);
  }

  return 30; // Fallback
}

/**
 * Compute cutoff prep time - mirrors PrepTimeUtils._computeCutoffTimes()
 * Calculates actual minutes until ready based on current time in cook's timezone
 */
function computeCutoffPrepTime(config, countryCode) {
  const cutoffTime = config.cutoffTime || '23:59';
  const beforeCutoffReadyTime = config.beforeCutoffReadyTime || '23:59';

  // Get current time in cook's timezone
  const nowInCookTimezone = getDateTimeInCookTimezone(countryCode);
  const nowMinutes = nowInCookTimezone.getHours() * 60 + nowInCookTimezone.getMinutes();

  // Parse times (format: 'HH:MM')
  const cutoffParts = cutoffTime.split(':').map(s => parseInt(s, 10) || 0);
  const readyParts = beforeCutoffReadyTime.split(':').map(s => parseInt(s, 10) || 0);

  // Calculate minutes-of-day
  const cutoffMins = cutoffParts.length >= 2 ? cutoffParts[0] * 60 + cutoffParts[1] : 0;
  const readyMins = readyParts.length >= 2 ? readyParts[0] * 60 + readyParts[1] : 0;

  // Determine mode: If readyTime < cutoffTime, it's NEXT-DAY MODE
  const isNextDayMode = readyMins < cutoffMins;

  // Create today dates
  const cookToday = new Date(nowInCookTimezone.getFullYear(), nowInCookTimezone.getMonth(), nowInCookTimezone.getDate());
  
  let readyAt;
  
  if (isNextDayMode) {
    // NEXT-DAY MODE: Always ready tomorrow
    readyAt = new Date(
      cookToday.getFullYear(),
      cookToday.getMonth(),
      cookToday.getDate() + 1,
      readyParts.length >= 2 ? readyParts[0] : 0,
      readyParts.length >= 2 ? readyParts[1] : 0
    );
  } else {
    // SAME-DAY MODE
    const todayCutoff = new Date(
      cookToday.getFullYear(),
      cookToday.getMonth(),
      cookToday.getDate(),
      cutoffParts.length >= 2 ? cutoffParts[0] : 0,
      cutoffParts.length >= 2 ? cutoffParts[1] : 0
    );
    
    const todayReady = new Date(
      cookToday.getFullYear(),
      cookToday.getMonth(),
      cookToday.getDate(),
      readyParts.length >= 2 ? readyParts[0] : 0,
      readyParts.length >= 2 ? readyParts[1] : 0
    );

    if (nowInCookTimezone < todayCutoff) {
      if (nowInCookTimezone > todayReady) {
        // Already past ready time, will be tomorrow
        readyAt = new Date(
          cookToday.getFullYear(),
          cookToday.getMonth(),
          cookToday.getDate() + 1,
          readyParts.length >= 2 ? readyParts[0] : 0,
          readyParts.length >= 2 ? readyParts[1] : 0
        );
      } else {
        // Ready today
        readyAt = todayReady;
      }
    } else {
      // After cutoff - will be tomorrow
      readyAt = new Date(
        cookToday.getFullYear(),
        cookToday.getMonth(),
        cookToday.getDate() + 1,
        readyParts.length >= 2 ? readyParts[0] : 0,
        readyParts.length >= 2 ? readyParts[1] : 0
      );
    }
  }

  // Calculate prepTimeMinutes (ceil of minutes until ready)
  const diffMs = readyAt.getTime() - nowInCookTimezone.getTime();
  const prepTimeMinutes = Math.ceil(diffMs / 60000);

  return prepTimeMinutes;
}

/**
 * Get current DateTime in cook's timezone based on country code
 * Mirrors PrepTimeUtils._getDateTimeInCookTimezone()
 */
function getDateTimeInCookTimezone(countryCode) {
  if (!countryCode) {
    return new Date();
  }

  // Map country codes to UTC offsets (same as Flutter version)
  const utcOffsets = {
    'SA': 3,  // Saudi Arabia (KSA)
    'AE': 4,  // UAE
    'KW': 3,  // Kuwait
    'QA': 3,  // Qatar
    'BH': 3,  // Bahrain
    'OM': 4,  // Oman
    'JO': 3,  // Jordan
    'LB': 2,  // Lebanon
    'EG': 2,  // Egypt
    'US': -5, // US Eastern (approximate)
    'GB': 0,  // UK
    'FR': 1,  // France
    'DE': 1,  // Germany
  };

  const offset = utcOffsets[countryCode] || 0;
  
  // Get current UTC time
  const now = new Date();
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  
  // Apply cook's timezone offset
  const cookTime = new Date(utcTime + (offset * 3600000));
  
  return cookTime;
}

module.exports = {
  computePrepTimeMinutes,
  computeCutoffPrepTime,
  getDateTimeInCookTimezone
};
