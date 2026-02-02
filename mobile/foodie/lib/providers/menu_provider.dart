import 'package:flutter/material.dart';

class Product {
  final String id;
  final String name;
  final String description;
  final double price;
  final String category;
  final bool available;

  Product({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.category,
    required this.available,
  });
}

class MenuProvider extends ChangeNotifier {
  final List<Product> _products = [];
  bool _isLoading = false;
  String? _error;

  List<Product> get products => _products;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchProducts(String token) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // Mock implementation - replace with actual API call
      await Future.delayed(const Duration(seconds: 1));
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = 'Failed to fetch products';
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> createProduct({
    required String name,
    required String description,
    required double price,
    required String category,
    required String token,
  }) async {
    try {
      // Mock implementation - replace with actual API call
      await Future.delayed(const Duration(seconds: 1));
      notifyListeners();
    } catch (e) {
      _error = 'Failed to create product';
      notifyListeners();
    }
  }

  Future<void> updateProduct({
    required String productId,
    required String name,
    required String description,
    required double price,
    required String category,
    required String token,
  }) async {
    try {
      // Mock implementation - replace with actual API call
      await Future.delayed(const Duration(seconds: 1));
      notifyListeners();
    } catch (e) {
      _error = 'Failed to update product';
      notifyListeners();
    }
  }

  Future<void> deleteProduct(String productId, String token) async {
    try {
      // Mock implementation - replace with actual API call
      await Future.delayed(const Duration(seconds: 1));
      notifyListeners();
    } catch (e) {
      _error = 'Failed to delete product';
      notifyListeners();
    }
  }
}
