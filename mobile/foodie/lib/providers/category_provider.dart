import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../models/category.dart';

class CategoryProvider with ChangeNotifier {
  List<Category> _categories = [];
  bool _isLoading = false;
  String? _error;

  List<Category> get categories => _categories;
  bool get isLoading => _isLoading;
  String? get error => _error;

  // Base URL for API - should be configured via environment/config
  static const String baseUrl = 'http://localhost:5005/api';

  Future<void> fetchCategories() async {
    if (_isLoading) return;
    
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await http.get(
        Uri.parse('$baseUrl/categories'),
        headers: {'Content-Type': 'application/json'},
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        
        if (data.isNotEmpty) {
          _categories = data.map((json) => Category.fromJson(json)).toList();
          // Sort by sortOrder
          _categories.sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
        } else {
          // Fallback to default categories if API returns empty
          _categories = DefaultCategories.getCategories();
        }
      } else {
        _error = 'Failed to fetch categories: ${response.statusCode}';
        _categories = DefaultCategories.getCategories();
      }
    } catch (e) {
      _error = 'Error fetching categories: $e';
      // Fallback to default categories on error
      _categories = DefaultCategories.getCategories();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Category? getCategoryById(String id) {
    try {
      return _categories.firstWhere((cat) => cat.id == id);
    } catch (e) {
      return null;
    }
  }

  List<Category> getActiveCategories() {
    return _categories.where((cat) => cat.isActive).toList();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
