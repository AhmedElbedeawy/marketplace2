import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LanguageProvider extends ChangeNotifier {
  final SharedPreferences _prefs;
  String _languageCode = 'en';

  LanguageProvider(this._prefs) {
    _loadLanguage();
  }

  String get languageCode => _languageCode;
  bool get isArabic => _languageCode == 'ar';

  Locale get locale => Locale(_languageCode, _languageCode == 'ar' ? 'SA' : 'US');

  static const Map<String, Map<String, Map<String, String>>> expertiseData = {
    'en': {
      'pastry_bakery': {'title': 'Pastry & Bakery', 'description': 'Specializes in baking all kinds of bread and basic pastries.'},
      'oriental_pastry': {'title': 'Oriental Pastry', 'description': 'Specializes in oriental desserts such as Kunafa, Baklava, and Qatayef.'},
      'appetizer_salad': {'title': 'Appetizer & Salad', 'description': 'Specializes in appetizers, salads, and cold dishes.'},
      'meat': {'title': 'Meat', 'description': 'Specializes in meats, related sauces, and grilled dishes.'},
      'fish_seafood': {'title': 'Fish & Seafood', 'description': 'Specializes in fish and seafood dishes.'},
      'vegetable_vegetarian': {'title': 'Vegetable & Vegetarian', 'description': 'Specializes in vegetarian dishes, rice, grains, and pasta.'},
      'fast_food': {'title': 'Fast Food / Line Cook', 'description': 'Specializes in specific quick dishes.'},
      'multi_specialty': {'title': 'Multi-Specialty', 'description': 'Specializes in multiple kitchen disciplines.'},
    },
    'ar': {
      'pastry_bakery': {'title': 'المخبوزات والمعجنات', 'description': 'متخصص في صناعة جميع أنواع الخبر والمعجنات الأساسية.'},
      'oriental_pastry': {'title': 'الحلويات الشرقية', 'description': 'متخصص في الحلويات الشرقية مثل الكنافة والبقلاوة والقطايف.'},
      'appetizer_salad': {'title': 'المقبلات / السلطات', 'description': 'متخصص في تحضير المقبلات والسلطات والأطباق الباردة.'},
      'meat': {'title': 'شيف لحوم', 'description': 'متخصص في اللحوم والصلصات المتعلقة بها والمشاوي.'},
      'fish_seafood': {'title': 'السمك والمأكولات البحرية', 'description': 'متخصص في الأسماك والمأكولات البحرية.'},
      'vegetable_vegetarian': {'title': 'شيف خضار / نباتي', 'description': 'متخصص في الخضار والأطباق النباتية والأرز والحبوب والمعكرونة.'},
      'fast_food': {'title': 'شيف أطباق سريعة', 'description': 'متخصص في أطباق محددة سريعة التحضير.'},
      'multi_specialty': {'title': 'متعدد التخصصات', 'description': 'شيف شامل متعدد التخصصات.'},
    },
  };

  String getExpertiseTitle(String key) {
    return expertiseData[_languageCode]?[key]?['title'] ?? key;
  }

  String getExpertiseDescription(String key) {
    return expertiseData[_languageCode]?[key]?['description'] ?? '';
  }

  void _loadLanguage() {
    _languageCode = _prefs.getString('languageCode') ?? 'en';
    notifyListeners();
  }

  void setLanguage(String code) {
    if (code != _languageCode) {
      _languageCode = code;
      _prefs.setString('languageCode', code);
      notifyListeners();
    }
  }

  void toggleLanguage() {
    setLanguage(isArabic ? 'en' : 'ar');
  }
}
