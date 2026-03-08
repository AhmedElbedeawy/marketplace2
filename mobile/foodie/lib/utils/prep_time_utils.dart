
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
  static PrepTimeResult computePrepTime(Map<String, dynamic>? config, {bool isRTL = false}) {
    if (config == null || config.isEmpty) {
      // No config - use default 30 min
      return PrepTimeResult(
        prepTimeMinutes: 30,
        prepTimeText: '30 min',
      );
    }

    final optionType = config['optionType'] as String?;

    if (optionType == 'cutoff') {
      return _computeCutoffTimes(config, isRTL: isRTL);
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
  /// Returns normalized prep time for batching (not absolute time difference)
  static PrepTimeResult _computeCutoffTimes(Map<String, dynamic> config, {bool isRTL = false}) {
    final cutoffTime = config['cutoffTime'] as String? ?? '23:59';
    final beforeCutoffReadyTime = config['beforeCutoffReadyTime'] as String? ?? '23:59';

    final now = DateTime.now();
    final nowMinutes = now.hour * 60 + now.minute;

    // Parse times
    final cutoffParts = cutoffTime.split(':').map((s) => int.tryParse(s) ?? 0).toList();
    final readyParts = beforeCutoffReadyTime.split(':').map((s) => int.tryParse(s) ?? 0).toList();

    final cutoffMins = cutoffParts.length >= 2 ? cutoffParts[0] * 60 + cutoffParts[1] : 0;
    final readyMins = readyParts.length >= 2 ? readyParts[0] * 60 + readyParts[1] : 0;

    // Determine mode: If readyTime < cutoffTime, it's NEXT-DAY MODE
    final isNextDayMode = readyMins < cutoffMins;

    final cutoffTimeStr = _formatTime(cutoffParts);
    final readyTimeStr = _formatTime(readyParts);

    int prepTimeMinutes;
    String prepTimeText;

    if (isNextDayMode) {
      // NEXT-DAY MODE: readyTime < cutoffTime
      // Use fixed prep time based on time of day (not absolute difference)
      // If ordering now, will be ready tomorrow at readyTime
      // Use reasonable fixed time: (24 - currentHour) + readyHour, min 12 hours, max 24 hours
      final hoursUntilMidnight = 24 - now.hour;
      prepTimeMinutes = (hoursUntilMidnight * 60 + readyMins).clamp(720, 1440);
      prepTimeText = isRTL 
        ? 'اطلب قبل $cutoffTimeStr اليوم، استقبل بحلول $readyTimeStr غداً'
        : 'Order before $cutoffTimeStr today, ready by $readyTimeStr tomorrow';
    } else {
      // SAME-DAY MODE: readyTime >= cutoffTime
      // Use the actual difference, clamped to reasonable range
      if (nowMinutes <= cutoffMins) {
        if (nowMinutes > readyMins) {
          // Already past ready time, will be tomorrow - use min 30 min
          prepTimeMinutes = 30;
          prepTimeText = isRTL 
            ? 'اطلب قبل $cutoffTimeStr اليوم، استقبل بحلول $readyTimeStr غداً'
            : 'Order before $cutoffTimeStr today, ready by $readyTimeStr tomorrow';
        } else {
          // Ready today - use actual difference, min 15 min, max 4 hours
          prepTimeMinutes = (readyMins - nowMinutes).clamp(15, 240);
          prepTimeText = isRTL 
            ? 'اطلب قبل $cutoffTimeStr اليوم، استقبل بحلول $readyTimeStr اليوم'
            : 'Order before $cutoffTimeStr today, ready by $readyTimeStr today';
        }
      } else {
        // After cutoff - will be tomorrow, use min 30 min
        prepTimeMinutes = 30;
        prepTimeText = isRTL 
          ? 'اطلب قبل $cutoffTimeStr اليوم، استقبل بحلول $readyTimeStr غداً'
          : 'Order before $cutoffTimeStr today, ready by $readyTimeStr tomorrow';
      }
    }

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
}
