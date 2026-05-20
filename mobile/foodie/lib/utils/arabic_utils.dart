String toArabicNumerals(String input) {
  const _western = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const _arabic = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  var result = input;
  for (var i = 0; i < _western.length; i++) {
    result = result.replaceAll(_western[i], _arabic[i]);
  }
  return result;
}

String localizeNumber(num value, bool isRTL, {int decimals = 0}) {
  final text = decimals > 0 ? value.toStringAsFixed(decimals) : value.toStringAsFixed(0);
  return isRTL ? toArabicNumerals(text) : text;
}

/// Returns 110% of [base] font size in Arabic mode, unchanged otherwise.
double arabicNumFontSize(double base, bool isRTL) => isRTL ? base * 1.1 : base;
