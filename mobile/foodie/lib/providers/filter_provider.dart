import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class FilterProvider extends ChangeNotifier {
  // Price Range Filter
  double _minPrice = 0;
  double _maxPrice = 500;

  // Category Filter
  final List<String> _selectedCategories = [];

  // Cook Name Filter
  String _cookNameFilter = '';

  // Order Type Toggle
  String _orderType = 'All'; // All, Delivery, Pickup

  // Delivery Time Filter
  String _deliveryTime = '60'; // in minutes

  // Prep Time Filter
  String _prepTime = '60'; // in minutes

  // Distance Filter
  double _distance = 30; // in km

  // Browsing location — persisted via SharedPreferences (browsing_lat / browsing_lng)
  // null = not set (user has no browsing location)
  double? _browsingLat;
  double? _browsingLng;

  // Popularity Toggles
  bool _showOnlyPopularCooks = false;
  bool _showOnlyPopularDishes = false;

  // Sorting
  String _sortBy = 'Recommended'; // Recommended, Rating, Price (Low–High), Price (High–Low), Delivery Time, Distance

  // Getters
  double get minPrice => _minPrice;
  double get maxPrice => _maxPrice;
  List<String> get selectedCategories => _selectedCategories;
  String get cookNameFilter => _cookNameFilter;
  String get orderType => _orderType;
  String get deliveryTime => _deliveryTime;
  String get prepTime => _prepTime;
  double get distance => _distance;
  double? get browsingLat => _browsingLat;
  double? get browsingLng => _browsingLng;
  bool get showOnlyPopularCooks => _showOnlyPopularCooks;
  bool get showOnlyPopularDishes => _showOnlyPopularDishes;
  String get sortBy => _sortBy;

  // Check if any filters are active
  bool get hasActiveFilters =>
      _minPrice > 0 ||
      _maxPrice < 500 ||
      _selectedCategories.isNotEmpty ||
      _cookNameFilter.isNotEmpty ||
      _orderType != 'All' ||
      _deliveryTime != '60' ||
      _prepTime != '60' ||
      _distance < 30 ||
      _showOnlyPopularCooks ||
      _showOnlyPopularDishes ||
      _sortBy != 'Recommended';

  // Setters
  void setPriceRange(double min, double max) {
    _minPrice = min;
    _maxPrice = max;
    notifyListeners();
  }

  void toggleCategory(String category) {
    if (_selectedCategories.contains(category)) {
      _selectedCategories.remove(category);
    } else {
      _selectedCategories.add(category);
    }
    notifyListeners();
  }

  void setCookNameFilter(String name) {
    _cookNameFilter = name;
    notifyListeners();
  }

  void setOrderType(String type) {
    _orderType = type;
    notifyListeners();
  }

  void setDeliveryTime(String time) {
    _deliveryTime = time;
    notifyListeners();
  }

  void setPrepTime(String time) {
    _prepTime = time;
    notifyListeners();
  }

  void setDistance(double dist) {
    _distance = dist;
    notifyListeners();
  }

  /// Load persisted browsing location from SharedPreferences on app start
  Future<void> loadBrowsingLocation() async {
    final prefs = await SharedPreferences.getInstance();
    final lat = prefs.getDouble('browsing_lat');
    final lng = prefs.getDouble('browsing_lng');
    if (lat != null && lng != null) {
      _browsingLat = lat;
      _browsingLng = lng;
      notifyListeners();
    }
  }

  /// Save a new browsing location (called after user picks from map)
  Future<void> saveBrowsingLocation(double lat, double lng) async {
    _browsingLat = lat;
    _browsingLng = lng;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble('browsing_lat', lat);
    await prefs.setDouble('browsing_lng', lng);
    notifyListeners();
  }

  /// Clear browsing location (e.g., after user adds a real address)
  Future<void> clearBrowsingLocation() async {
    _browsingLat = null;
    _browsingLng = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('browsing_lat');
    await prefs.remove('browsing_lng');
    notifyListeners();
  }

  void setShowOnlyPopularCooks(bool value) {
    _showOnlyPopularCooks = value;
    notifyListeners();
  }

  void setShowOnlyPopularDishes(bool value) {
    _showOnlyPopularDishes = value;
    notifyListeners();
  }

  void setSortBy(String sort) {
    _sortBy = sort;
    notifyListeners();
  }

  void clearAllFilters() {
    _minPrice = 0;
    _maxPrice = 500;
    _selectedCategories.clear();
    _cookNameFilter = '';
    _orderType = 'All';
    _deliveryTime = '60';
    _prepTime = '60';
    _distance = 30;
    _showOnlyPopularCooks = false;
    _showOnlyPopularDishes = false;
    _sortBy = 'Recommended';
    notifyListeners();
  }

  // Check if category is selected
  bool isCategorySelected(String category) {
    return _selectedCategories.contains(category);
  }
}
