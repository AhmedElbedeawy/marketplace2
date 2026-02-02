import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum AppMode { foodie, cookHub }

class AppModeProvider extends ChangeNotifier {
  static const String _modeKey = 'app_mode';
  final SharedPreferences _prefs;
  AppMode _currentMode;

  AppModeProvider(this._prefs) : _currentMode = AppMode.foodie {
    _loadMode();
  }

  AppMode get currentMode => _currentMode;
  bool get isFoodieMode => _currentMode == AppMode.foodie;
  bool get isCookHubMode => _currentMode == AppMode.cookHub;

  void _loadMode() {
    final savedMode = _prefs.getString(_modeKey);
    if (savedMode == 'cookHub') {
      _currentMode = AppMode.cookHub;
    } else {
      _currentMode = AppMode.foodie; // Default to Foodie
    }
    notifyListeners();
  }

  Future<void> switchToFoodie() async {
    _currentMode = AppMode.foodie;
    await _prefs.setString(_modeKey, 'foodie');
    notifyListeners();
  }

  Future<void> switchToCookHub() async {
    _currentMode = AppMode.cookHub;
    await _prefs.setString(_modeKey, 'cookHub');
    notifyListeners();
  }

  Future<void> toggleMode() async {
    if (_currentMode == AppMode.foodie) {
      await switchToCookHub();
    } else {
      await switchToFoodie();
    }
  }
}
