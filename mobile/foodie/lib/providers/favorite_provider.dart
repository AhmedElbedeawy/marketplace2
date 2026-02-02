import 'package:flutter/material.dart';
import '../models/food.dart';

class FavoriteProvider extends ChangeNotifier {
  final Set<String> _favoriteDishIds = {};

  Set<String> get favoriteDishIds => _favoriteDishIds;

  bool isFavorite(String dishId) {
    return _favoriteDishIds.contains(dishId);
  }

  void toggleFavorite(String dishId) {
    if (_favoriteDishIds.contains(dishId)) {
      _favoriteDishIds.remove(dishId);
    } else {
      _favoriteDishIds.add(dishId);
    }
    notifyListeners();
  }

  void addFavorite(String dishId) {
    _favoriteDishIds.add(dishId);
    notifyListeners();
  }

  void removeFavorite(String dishId) {
    _favoriteDishIds.remove(dishId);
    notifyListeners();
  }

  List<Food> getFavoriteDishes(List<Food> allDishes) {
    return allDishes.where((dish) => _favoriteDishIds.contains(dish.id)).toList();
  }
}
