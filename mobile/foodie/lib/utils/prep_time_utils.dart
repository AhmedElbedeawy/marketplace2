/// Computes prep time and readyAt from prepReadyConfig
/// Mirrors web computeCutoffTimes() function
class PrepTimeResult {
  final int prepTimeMinutes;
  final String prepTimeText;
  final DateTime? readyAt;

  PrepTimeResult({
    required this.prepTimeMinutes,
    required this.prepTimeText,
    this.readyAt,
  });
}

class PrepTimeUtils {
  /// Compute prep time from prepReadyConfig
  /// [config] - prepReadyConfig from offer
  /// [isRTL] - whether to show Arabic text
  static PrepTimeResult computePrepTime(Map<String, dynamic>? config, {bool isRTL = false, String? cookCountryCode}) {
    if (config == null || config.isEmpty) {
      // No config - use default 30 min
      return PrepTimeResult(
        prepTimeMinutes: 30,
        prepTimeText: '30 min',
      );
    }

    final optionType = config['optionType'] as String?;

    if (optionType == 'cutoff') {
      return _computeCutoffTimes(config, isRTL: isRTL, cookCountryCode: cookCountryCode);
    } else if (optionType == 'fixed') {
      final minutes = config['prepTimeMinutes'] as int? ?? 30;
      return PrepTimeResult(
        prepTimeMinutes: minutes,
        prepTimeText: '$minutes min',
      );
    } else if (optionType == 'range') {
      final minMin = config['prepTimeMinMinutes'] as int? ?? 30;
      final maxMin = config['prepTimeMaxMinutes'] as int? ?? 60;
      return PrepTimeResult(
        prepTimeMinutes: ((minMin + maxMin) / 2).round(),
        prepTimeText: '$minMin-$maxMin min',
      );
    }

    // Fallback to default
    return PrepTimeResult(
      prepTimeMinutes: 30,
      prepTimeText: '30 min',
    );
  }

  /// Compute cutoff times - mirrors web computeCutoffTimes()
  /// Uses cook's timezone for accurate local time calculations
  static PrepTimeResult _computeCutoffTimes(Map<String, dynamic> config, {bool isRTL = false, String? cookCountryCode}) {
    final cutoffTime = config['cutoffTime'] as String? ?? '23:59';
    final beforeCutoffReadyTime = config['beforeCutoffReadyTime'] as String? ?? '23:59';

    // Get current time in cook's timezone (as minutes from midnight)
    final nowInCookTimezone = _getDateTimeInCookTimezone(cookCountryCode);
    final nowMinutes = nowInCookTimezone.hour * 60 + nowInCookTimezone.minute;
    final cookToday = DateTime(nowInCookTimezone.year, nowInCookTimezone.month, nowInCookTimezone.day);

    // Parse times (format: 'HH:MM')
    final cutoffParts = cutoffTime.split(':').map((s) => int.tryParse(s) ?? 0).toList();
    final readyParts = beforeCutoffReadyTime.split(':').map((s) => int.tryParse(s) ?? 0).toList();

    // Calculate minutes-of-day for comparison
    final cutoffMins = cutoffParts.length >= 2 ? cutoffParts[0] * 60 + cutoffParts[1] : 0;
    final readyMins = readyParts.length >= 2 ? readyParts[0] * 60 + readyParts[1] : 0;

    // Determine mode: If readyTime < cutoffTime, it's NEXT-DAY MODE
    final isNextDayMode = readyMins < cutoffMins;

    // Create today@cutoff and today@ready using cook's timezone
    final todayCutoff = DateTime(
      cookToday.year, cookToday.month, cookToday.day,
      cutoffParts.length >= 2 ? cutoffParts[0] : 0,
      cutoffParts.length >= 2 ? cutoffParts[1] : 0,
    );
    final todayReady = DateTime(
      cookToday.year, cookToday.month, cookToday.day,
      readyParts.length >= 2 ? readyParts[0] : 0,
      readyParts.length >= 2 ? readyParts[1] : 0,
    );

    DateTime readyAt;
    bool isTomorrow = false;
    String cutoffDayText = '';
    String readyDayText = '';

    if (isNextDayMode) {
      // NEXT-DAY MODE: readyTime < cutoffTime
      // Always ready tomorrow regardless of when ordered
      readyAt = DateTime(
        cookToday.year, cookToday.month, cookToday.day + 1,
        readyParts.length >= 2 ? readyParts[0] : 0,
        readyParts.length >= 2 ? readyParts[1] : 0,
      );
      isTomorrow = true;
      cutoffDayText = isRTL ? ' اليوم' : ' today';
      readyDayText = isRTL ? ' غداً' : ' tomorrow';
    } else {
      // SAME-DAY MODE: readyTime >= cutoffTime
      if (nowInCookTimezone.isBefore(todayCutoff)) {
        if (nowInCookTimezone.isAfter(todayReady)) {
          // Already past ready time, will be tomorrow
          readyAt = DateTime(
            cookToday.year, cookToday.month, cookToday.day + 1,
            readyParts.length >= 2 ? readyParts[0] : 0,
            readyParts.length >= 2 ? readyParts[1] : 0,
          );
          isTomorrow = true;
          cutoffDayText = isRTL ? ' اليوم' : ' today';
          readyDayText = isRTL ? ' غداً' : ' tomorrow';
        } else {
          // Ready today
          readyAt = todayReady;
          isTomorrow = false;
          cutoffDayText = isRTL ? ' اليوم' : ' today';
          readyDayText = isRTL ? ' اليوم' : ' today';
        }
      } else {
        // After cutoff - will be tomorrow
        readyAt = DateTime(
          cookToday.year, cookToday.month, cookToday.day + 1,
          readyParts.length >= 2 ? readyParts[0] : 0,
          readyParts.length >= 2 ? readyParts[1] : 0,
        );
        isTomorrow = true;
        cutoffDayText = isRTL ? ' اليوم' : ' today';
        readyDayText = isRTL ? ' غداً' : ' tomorrow';
      }
    }

    // Calculate prepTimeMinutes (ceil of minutes until ready)
    final diffMs = readyAt.millisecondsSinceEpoch - nowInCookTimezone.millisecondsSinceEpoch;
    final prepTimeMinutes = (diffMs / 60000).ceil();

    // Build prepTimeText with correct today/tomorrow wording
    final cutoffTimeStr = _formatTime(cutoffParts);
    final readyTimeStr = _formatTime(readyParts);
    final prepTimeText = isRTL 
      ? 'اطلب قبل $cutoffTimeStr$cutoffDayText، استقبل بحلول $readyTimeStr$readyDayText'
      : 'Order before $cutoffTimeStr$cutoffDayText, ready by $readyTimeStr$readyDayText';

    return PrepTimeResult(
      prepTimeMinutes: prepTimeMinutes,
      prepTimeText: prepTimeText,
    );
  }

  static String _formatTime(List<int> parts) {
    if (parts.length >= 2) {
      return '${parts[0].toString().padLeft(2, '0')}:${parts[1].toString().padLeft(2, '0')}';
    }
    return '00:00';
  }

  /// Get current DateTime in cook's timezone based on country code
  /// This is a simplified version - uses UTC offset approximation
  static DateTime _getDateTimeInCookTimezone(String? countryCode) {
    if (countryCode == null) {
      return DateTime.now();
    }

    // Map country codes to UTC offsets (simplified - doesn't handle DST)
    final utcOffsets = {
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

    final offset = utcOffsets[countryCode] ?? 0;
    
    // Get device local time and apply offset to get cook's timezone time
    // local time = UTC + offset, so to get "local" in cook timezone: local = deviceLocal + (cookOffset - deviceOffset)
    // Simplified: just get current device time and treat it as cook time when no countryCode
    // For proper conversion: deviceLocalTime + (cookOffset - deviceOffset)
    final deviceNow = DateTime.now();
    final deviceOffset = deviceNow.timeZoneOffset.inHours;
    
    // Calculate what time it would be in cook's timezone
    final adjustedHour = deviceNow.hour + (offset - deviceOffset);
    
    // Handle day wrap
    int dayOffset = 0;
    final int adjustedMinute = deviceNow.minute;
    int finalHour = adjustedHour;
    
    if (adjustedHour >= 24) {
      finalHour = adjustedHour - 24;
      dayOffset = 1;
    } else if (adjustedHour < 0) {
      finalHour = adjustedHour + 24;
      dayOffset = -1;
    }
    
    final result = DateTime(deviceNow.year, deviceNow.month, deviceNow.day + dayOffset, finalHour, adjustedMinute);
    return result;
  }

  /// Get icon card text based on prepReadyConfig option type
  /// Fixed: 30 min
  /// Range: show max only → 40 min
  /// Cutoff: convert minutes to H + min format → 3H 30 min (NEVER clock times)
  static String getIconCardText(Map<String, dynamic>? config, int defaultPrepTime, {String? cookCountryCode}) {

  // If config is not ready yet, show nothing
  if (config == null || config.isEmpty) {
    return '';
  }

  final optionType = config['optionType'] as String?;

  if (optionType == null) {
    return '';
  }

    if (optionType == 'fixed') {
      final minutes = config['prepTimeMinutes'] as int? ?? defaultPrepTime;
      return '$minutes min';
    } else if (optionType == 'range') {
      final maxMin = config['prepTimeMaxMinutes'] as int? ?? 60;
      return '$maxMin min';
    } else if (optionType == 'cutoff') {
      // For cutoff: MUST have cookCountryCode to compute correctly
      // If not available yet, return loading placeholder - never show backend value
      if (cookCountryCode == null) {
        return ''; // Empty while loading - will update when data is ready
      }
      
      // For cutoff: use the COMPUTED prep duration (not static backend value)
      // Call computePrepTime to get the actual calculated duration based on current time
      final result = computePrepTime(config, cookCountryCode: cookCountryCode);
      final minutes = result.prepTimeMinutes;
      
      // Format as H + min (e.g., "3H 30 min", "17H 30 min") - NEVER show clock times
      if (minutes > 0) {
        final hours = minutes ~/ 60;
        final mins = minutes % 60;
        if (hours > 0 && mins > 0) {
          return '${hours}H $mins min';
        } else if (hours > 0) {
          return '${hours}H';
        }
        return '$minutes min';
      }
      // If no valid prepTime, show "-" (not a time)
      return '-';
    }

    return '';
  }

  /// Get full prep time display text for description section
  /// Format: "Prep Time: Ready in 30 min" or "Prep Time: Ready in 20-40 min" or "Prep Time: Order before 16:00, Ready by 18:00"
  static String getPrepTimeDisplayText(Map<String, dynamic>? config, int defaultPrepTime, {bool isRTL = false, bool includeLabel = true}) {
  if (config == null || config.isEmpty) {
      // Don't show backend default value - return empty to indicate loading
    return '';
    }

  final optionType = config['optionType'] as String?;

  if (optionType == null || optionType.isEmpty) {
      // Don't show backend default value - return empty to indicate loading
    return '';
    }

   if (optionType == 'fixed') {
     final minutes = config['prepTimeMinutes'] as int? ?? defaultPrepTime;
     final prefix = isRTL ? 'م готов в ' : 'Ready in ';
    if (includeLabel) {
       return 'Prep Time: $prefix$minutes min';
      }
     return '$prefix$minutes min';
    } else if (optionType == 'range') {
     final minMin = config['prepTimeMinMinutes'] as int? ?? 30;
     final maxMin = config['prepTimeMaxMinutes'] as int? ?? 60;
     final prefix = isRTL ? 'م готов в' : 'Ready in ';
    if (includeLabel) {
       return 'Prep Time: $prefix$minMin-$maxMin min';
      }
     return '$prefix$minMin-$maxMin min';
    } else if (optionType == 'cutoff') {
     final cutoffTime = config['cutoffTime'] as String? ?? '23:59';
     final readyTime = config['beforeCutoffReadyTime'] as String? ?? '23:59';
     final cutoffPrefix = isRTL ? 'اطلب قبل ' : 'Order before ';
    final readyPrefix = isRTL ? '، جاهز بحلول ' : ', Ready by ';
    final separator = isRTL ? ' • ' : ' • ';
    if (includeLabel) {
       return 'Prep Time: $cutoffPrefix$cutoffTime$readyPrefix$readyTime';
      }
    return '$cutoffPrefix$cutoffTime$separator${readyPrefix.trim()}$readyTime';
    }

  final prefix = isRTL ? 'م готов в' : 'Ready in ';
  if (includeLabel) {
    return 'Prep Time: $prefix$defaultPrepTime min';
    }
  return '$prefix$defaultPrepTime min';
  }

  /// Get cutoff ready time as "Ready by <day> <HH:mm>"
  /// Uses the same cutoff calculation logic as _computeCutoffTimes
  /// Returns formatted string like "Ready by Monday 16:00" or "Ready by الثلاثاء ٢٣:٥٩"
  static String getCutoffReadyByText(Map<String, dynamic> config, {bool isRTL = false, String? cookCountryCode}) {
    final cutoffTime = config['cutoffTime'] as String? ?? '23:59';
    final beforeCutoffReadyTime = config['beforeCutoffReadyTime'] as String? ?? '23:59';

    // Get current time in cook's timezone
    final nowInCookTimezone = _getDateTimeInCookTimezone(cookCountryCode);
    final cookToday = DateTime(nowInCookTimezone.year, nowInCookTimezone.month, nowInCookTimezone.day);

    // Parse times (format: 'HH:MM')
    final cutoffParts = cutoffTime.split(':').map((s) => int.tryParse(s) ?? 0).toList();
    final readyParts = beforeCutoffReadyTime.split(':').map((s) => int.tryParse(s) ?? 0).toList();

    // Calculate minutes-of-day for comparison
    final cutoffMins = cutoffParts.length >= 2 ? cutoffParts[0] * 60 + cutoffParts[1] : 0;
    final readyMins = readyParts.length >= 2 ? readyParts[0] * 60 + readyParts[1] : 0;

    // Determine mode: If readyTime < cutoffTime, it's NEXT-DAY MODE
    final isNextDayMode = readyMins < cutoffMins;

    // Create today@cutoff and today@ready
    final todayCutoff = DateTime(
      cookToday.year, cookToday.month, cookToday.day,
      cutoffParts.length >= 2 ? cutoffParts[0] : 0,
      cutoffParts.length >= 2 ? cutoffParts[1] : 0,
    );

    DateTime readyAt;

    if (isNextDayMode) {
      // NEXT-DAY MODE: readyTime < cutoffTime
      // Always ready tomorrow regardless of when ordered
      readyAt = DateTime(
        cookToday.year, cookToday.month, cookToday.day + 1,
        readyParts.length >= 2 ? readyParts[0] : 0,
        readyParts.length >= 2 ? readyParts[1] : 0,
      );
    } else {
      // SAME-DAY MODE: readyTime >= cutoffTime
      if (nowInCookTimezone.isBefore(todayCutoff)) {
        if (nowInCookTimezone.isAfter(DateTime(
          cookToday.year, cookToday.month, cookToday.day,
          readyParts.length >= 2 ? readyParts[0] : 0,
          readyParts.length >= 2 ? readyParts[1] : 0,
        ))) {
          // Already past ready time, will be tomorrow
          readyAt = DateTime(
            cookToday.year, cookToday.month, cookToday.day + 1,
            readyParts.length >= 2 ? readyParts[0] : 0,
            readyParts.length >= 2 ? readyParts[1] : 0,
          );
        } else {
          // Ready today
          readyAt = DateTime(
            cookToday.year, cookToday.month, cookToday.day,
            readyParts.length >= 2 ? readyParts[0] : 0,
            readyParts.length >= 2 ? readyParts[1] : 0,
          );
        }
      } else {
        // After cutoff - will be tomorrow
        readyAt = DateTime(
          cookToday.year, cookToday.month, cookToday.day + 1,
          readyParts.length >= 2 ? readyParts[0] : 0,
          readyParts.length >= 2 ? readyParts[1] : 0,
        );
      }
    }

    // Format day name and time
    final dayName = _formatDayName(readyAt, isRTL);
    final timeStr = _formatTime(readyParts);

    return isRTL ? 'جاهز بحلول $dayName $timeStr' : 'Ready by $dayName $timeStr';
  }

  /// Format day name in EN or AR
  static String _formatDayName(DateTime date, bool isRTL) {
    if (isRTL) {
      const arabicDays = [
        'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء',
        'الخميس', 'الجمعة', 'السبت'
      ];
      return arabicDays[date.weekday % 7];
    } else {
      const englishDays = [
        'Monday', 'Tuesday', 'Wednesday', 'Thursday',
        'Friday', 'Saturday', 'Sunday'
      ];
      return englishDays[date.weekday - 1];
    }
  }
}
