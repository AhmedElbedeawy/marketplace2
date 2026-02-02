class ApiConfig {
  // Backend API Base URL
  static const String baseUrl = 'http://localhost:5005/api';
  
  // Static assets base URL (for /uploads/ paths)
  static const String staticBaseUrl = 'http://localhost:5005';
  
  // Endpoints
  static const String authLogin = '$baseUrl/auth/login';
  static const String authRegister = '$baseUrl/auth/register';
  static const String authSocialLogin = '$baseUrl/auth/social-login';
  static const String authLogout = '$baseUrl/auth/logout';
  static const String authRefresh = '$baseUrl/auth/refresh-token';
  
  // AdminDish endpoints (PHASE 3/4: 2-layer model)
  static const String getFeaturedAdminDishes = '$baseUrl/public/admin-dishes/featured';
  static const String getAdminDishesWithStats = '$baseUrl/public/admin-dishes/with-stats';
  
  // DishOffer endpoints (PHASE 3/4: 2-layer model)
  static const String getOffersByAdminDish = '$baseUrl/dish-offers/by-admin-dish/';
  
  // Legacy Product endpoints (kept for backward compatibility)
  static const String getProducts = '$baseUrl/products';
  static const String getProductById = '$baseUrl/products/';
  static const String getPopularDishes = '$baseUrl/products/popular';
  
  // Cooks
  static const String getCooks = '$baseUrl/cooks';
  static const String getTopRatedCooks = '$baseUrl/cooks/top-rated';
  
  // Categories
  static const String getCategories = '$baseUrl/categories';
  
  // Cart & Orders
  static const String getCart = '$baseUrl/cart';
  static const String addToCart = '$baseUrl/cart/add';
  static const String checkout = '$baseUrl/orders';
  static const String getOrders = '$baseUrl/orders';
  static const String getOrderById = '$baseUrl/orders/';
  
  // Favorites
  static const String getFavorites = '$baseUrl/favorites';
  static const String addFavorite = '$baseUrl/favorites';
  static const String removeFavorite = '$baseUrl/favorites/';
  
  // Messages
  static const String getMessages = '$baseUrl/messages';
  static const String sendMessage = '$baseUrl/messages';
  
  // User
  static const String getUserProfile = '$baseUrl/user/profile';
  static const String updateUserProfile = '$baseUrl/user/profile';
  
  // Timeouts
  static const int connectTimeout = 30000;
  static const int receiveTimeout = 30000;
  
  // Socket IO
  static const String socketUrl = 'http://localhost:5005';
}
