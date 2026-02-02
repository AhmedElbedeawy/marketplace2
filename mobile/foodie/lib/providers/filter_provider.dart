import 'package:flutter/material.dart';

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

  // Distance Filter
  double _distance = 30; // in km

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
  double get distance => _distance;
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

  void setDistance(double dist) {
    _distance = dist;
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
