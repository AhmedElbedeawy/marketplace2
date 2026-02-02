import 'package:flutter/material.dart';

enum NavigationTab {
  home,
  menu,
  favorite,
  cart,
  none, // For screens that don't have a nav tab (e.g., dish detail)
}

class NavigationProvider extends ChangeNotifier {
  NavigationTab _activeTab = NavigationTab.home;
  NavigationTab _originTab = NavigationTab.home; // Track where subpages were opened from

  NavigationTab get activeTab => _activeTab;
  NavigationTab get originTab => _originTab;

  void setActiveTab(NavigationTab tab, {bool setAsOrigin = false}) {
    if (_activeTab != tab) {
      _activeTab = tab;
      if (setAsOrigin) {
        _originTab = tab;
      }
      notifyListeners();
    }
  }

  void setOriginTab(NavigationTab tab) {
    _originTab = tab;
  }

  void resetToHome() {
    setActiveTab(NavigationTab.home, setAsOrigin: true);
  }

  void returnToOrigin() {
    setActiveTab(_originTab);
  }

  int get activeIndex {
    switch (_activeTab) {
      case NavigationTab.home:
        return 0;
      case NavigationTab.menu:
        return 1;
      case NavigationTab.favorite:
        return 2;
      case NavigationTab.cart:
        return 3;
      case NavigationTab.none:
        return -1;
    }
  }
}
