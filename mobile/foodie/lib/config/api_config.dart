import 'package:flutter/foundation.dart';

class ApiConfig {
  // Backend API Base URL - switches based on build mode
  static String get baseUrl {
   if (kReleaseMode) {
  return 'https://api.eltekkeya.com/api';
} else {
  return 'https://api.eltekkeya.com/api';
}
  }
  
  // Static assets base URL (for /uploads/ paths)
  // Always use production for web preview and media URLs
  static String get staticBaseUrl {
    // Always use production for media/ uploads
    return 'https://api.eltekkeya.com';
  }
  
  // Endpoints
  static String get authLogin => '$baseUrl/auth/login';
  static String get authRegister => '$baseUrl/auth/register';
  static String get authSocialLogin => '$baseUrl/auth/social-login';
  static String get authLogout => '$baseUrl/auth/logout';
  static String get authRefresh => '$baseUrl/auth/refresh-token';
  
  // AdminDish endpoints (PHASE 3/4: 2-layer model)
  static String get getFeaturedAdminDishes => '$baseUrl/public/admin-dishes/featured';
  static String get getAdminDishesWithStats => '$baseUrl/public/admin-dishes/with-stats';
  
  // DishOffer endpoints (PHASE 3/4: 2-layer model)
  static String get getOffersByAdminDish => '$baseUrl/dish-offers/by-admin-dish/';
  
  // Legacy Product endpoints (kept for backward compatibility)
  static String get getProducts => '$baseUrl/products';
  static String get getProductById => '$baseUrl/products/';
  static String get getPopularDishes => '$baseUrl/products/popular';
  
  // Cooks
  static String get getCooks => '$baseUrl/cooks';
  static String get getTopRatedCooks => '$baseUrl/cooks/top-rated';
  
  // Categories
  static String get getCategories => '$baseUrl/categories';
  
  // Cart & Orders
  static String get getCart => '$baseUrl/cart';
  static String get addToCart => '$baseUrl/cart/add';
  static String get checkout => '$baseUrl/orders';
  static String get getOrders => '$baseUrl/orders';
  static String get getOrderById => '$baseUrl/orders/';
  
  // Favorites
  static String get getFavorites => '$baseUrl/favorites';
  static String get addFavorite => '$baseUrl/favorites';
  static String get removeFavorite => '$baseUrl/favorites/';
  
  // Messages
  static String get getMessages => '$baseUrl/messages';
  static String get sendMessage => '$baseUrl/messages';
  
  // User
  static String get getUserProfile => '$baseUrl/users/profile';
  static String get updateUserProfile => '$baseUrl/users/profile';
  
  // Timeouts
  static const int connectTimeout = 30000;
  static const int receiveTimeout = 30000;
  
  // Socket IO - always use production for web preview
  static String get socketUrl {
    return 'https://api.eltekkeya.com';
  }
}
