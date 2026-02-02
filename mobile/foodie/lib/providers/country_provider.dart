import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/country_context.dart';

class CountryProvider with ChangeNotifier {
  final SharedPreferences _prefs;
  static const String _key = 'platformCountryCode';
  
  String _countryCode;

  CountryProvider(this._prefs) : _countryCode = _prefs.getString(_key) ?? 'EG';

  String get countryCode => _countryCode;
  
  CountryContext get context => CountryContextHelper.getContext(_countryCode);
  String get currencyCode => context.currencyCode;

  String getLocalizedCurrency(bool isArabic) {
    if (isArabic) {
      if (_countryCode == 'EG') return 'جنيه';
      if (_countryCode == 'AE') return 'درهم';
      if (_countryCode == 'KW') return 'دينار';
      if (_countryCode == 'QA') return 'ريال';
      return 'ريال'; // SA
    }
    return currencyCode;
  }

  Future<void> setCountry(String code) async {
    final normalizedCode = code.toUpperCase().trim();
    if (_countryCode == normalizedCode) return;
    
    _countryCode = normalizedCode;
    await _prefs.setString(_key, _countryCode);
    notifyListeners();
  }
}
