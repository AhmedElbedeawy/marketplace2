import 'package:flutter/material.dart';

/// Provider to persist Menu page state across navigation
/// State resets only when app is fully closed
class MenuStateProvider extends ChangeNotifier {
  String? _selectedCategoryId;
  double _categoryScrollOffset = 0;
  double _dishListScrollOffset = 0;
  bool _isDelivery = true;

  // Getters
  String? get selectedCategoryId => _selectedCategoryId;
  double get categoryScrollOffset => _categoryScrollOffset;
  double get dishListScrollOffset => _dishListScrollOffset;
  bool get isDelivery => _isDelivery;

  // Check if state has been initialized
  bool get hasState => _selectedCategoryId != null;

  /// Save the selected category
  void saveSelectedCategory(String categoryId) {
    _selectedCategoryId = categoryId;
    notifyListeners();
  }

  /// Save category slider scroll position
  void saveCategoryScrollOffset(double offset) {
    _categoryScrollOffset = offset;
    // Don't notify listeners for scroll updates to avoid unnecessary rebuilds
  }

  /// Save dish list scroll position
  void saveDishListScrollOffset(double offset) {
    _dishListScrollOffset = offset;
    // Don't notify listeners for scroll updates to avoid unnecessary rebuilds
  }

  /// Save delivery/pickup toggle state
  void saveDeliveryState(bool isDelivery) {
    _isDelivery = isDelivery;
    notifyListeners();
  }

  /// Clear all state (called when app is closed)
  void clearState() {
    _selectedCategoryId = null;
    _categoryScrollOffset = 0.0;
    _dishListScrollOffset = 0.0;
    _isDelivery = true;
    notifyListeners();
  }

  /// Reset state to defaults (for testing or manual reset)
  void resetToDefaults() {
    clearState();
  }
}
