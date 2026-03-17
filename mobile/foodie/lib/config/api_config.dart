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
  // Use eltekkeya.com (NOT api domain) for static assets
  static String get staticBaseUrl {
    return 'https://eltekkeya.com';
  }

  // Endpoints
  static String get authLogin => '$baseUrl/auth/login';
  static String get authRegister => '$baseUrl/auth/register';
  static String get authSocialLogin => '$baseUrl/auth/social-login';
  static String get authLogout => '$baseUrl/auth/logout';
  static String get authRefresh => '$baseUrl/auth/refresh-token';

  // AdminDish endpoints (PHASE 3/4: 2-layer model)
  static String get getFeaturedAdminDishes =>
      '$baseUrl/public/admin-dishes/featured';
  static String get getAdminDishesWithStats =>
      '$baseUrl/public/admin-dishes/with-stats';

  // DishOffer endpoints (PHASE 3/4: 2-layer model)
  static String get getOffersByAdminDish =>
    '$baseUrl/dish-offers/by-admin-dish/';

  // Legacy Product endpoints (kept for backward compatibility)
  static String get getProducts => '$baseUrl/products';
  static String get getProductById => '$baseUrl/products/';
  static String get getPopularDishes => '$baseUrl/products/popular';

  // Cooks
  static String get getCooks => '$baseUrl/cooks';
  static String get getTopRatedCooks => '$baseUrl/cooks/top-rated';

  // Cook Hub - Dashboard & Orders
  static String get cookOrders => '$baseUrl/cook/orders';
  static String get cookSalesSummary => '$baseUrl/cook/sales-summary';
  static String get cookOrderStats => '$baseUrl/cook/order-stats';

  // Cook Hub - Profile
  static String get cookProfile => '$baseUrl/cooks/profile';
  static String get cookProfilePhoto => '$baseUrl/cooks/profile-photo';
  static String get userProfile => '$baseUrl/users/profile';

  // Cook Hub - Menu (cook's dish offers)
  static String get cookMenu => '$baseUrl/dish-offers/my';
  static String get createOffer => '$baseUrl/dish-offers';
  static String getOfferById(String id) => '$baseUrl/dish-offers/$id';
  static String getOfferStock(String id) => '$baseUrl/dish-offers/$id/stock';
  static String deleteOffer(String id) => '$baseUrl/dish-offers/$id';

  // Admin Dishes (for offer creation - select dish)
  static String get adminDishes => '$baseUrl/admin-dishes';

  // Cook Hub - Orders & Status Updates
  static String get cookOrdersEndpoint => '$baseUrl/orders/cook/orders';
  static String cookOrderDetails(String id) =>
      '$baseUrl/orders/cook/orders/$id';
  static String getCookOrderDetails(String id) =>
      '$baseUrl/orders/cook/orders/$id';
  static String updateSubOrderStatus(String subOrderId) =>
      '$baseUrl/orders/sub-order/$subOrderId/status';

  // Cook Hub - Invoices & Payouts
  static String cookInvoices() => '$baseUrl/cook/invoices';
  static String invoiceById(String id) => '$baseUrl/cook/invoices/$id';
  static String invoicePdf(String id) => '$baseUrl/cook/invoices/$id/pdf';

  // Reviews & Ratings
  static String getOrderRating(String orderId) =>
      '$baseUrl/ratings/order/$orderId';
  static String getOrderRatingStatus(String orderId) =>
      '$baseUrl/ratings/order/$orderId/status';
  static String replyToRating(String ratingId) =>
      '$baseUrl/ratings/$ratingId/reply';

  // Messages
  static String messageInbox() => '$baseUrl/message/inbox';
  static String messageConversation(String userId) =>
      '$baseUrl/message/conversation/$userId';
  static String messageSend() => '$baseUrl/message/send';
  static String messageMarkRead(String senderId) =>
      '$baseUrl/message/read/$senderId';

  // Notifications
  static String notifications() => '$baseUrl/notifications';
  static String markNotificationRead(String id) =>
      '$baseUrl/notifications/$id/read';
  static String markAllNotificationsRead() => '$baseUrl/notifications/read-all';
  static String deleteNotification(String id) => '$baseUrl/notifications/$id';

  // Categories
  static String get getCategories => '$baseUrl/categories';

  // Cart & Orders
  static String get getCart => '$baseUrl/cart';
  static String get addToCart => '$baseUrl/cart/add';
  static String get checkout => '$baseUrl/orders';
  static String get getOrders => '$baseUrl/orders';
  static String get getOrderById => '$baseUrl/orders/';

  // Favorites
  static String getFavorites() => '$baseUrl/favorites';
  static String favoriteProducts() => '$baseUrl/favorites/products';
  static String favoriteCooks() => '$baseUrl/favorites/cooks';
  static String toggleFavoriteProduct() => '$baseUrl/favorites/product';
  static String toggleFavoriteCook() => '$baseUrl/favorites/cook';

  // User
  static String get getUserProfile => '$baseUrl/users/profile';
  static String get updateUserProfile => '$baseUrl/users/profile';

  // Addresses
  static String getAddresses() => '$baseUrl/addresses';
  static String createAddress() => '$baseUrl/addresses';
  static String updateAddress(String id) => '$baseUrl/addresses/$id';
  static String deleteAddress(String id) => '$baseUrl/addresses/$id';
  static String setDefaultAddress(String id) =>
      '$baseUrl/addresses/$id/default';

  // Timeouts
  static const int connectTimeout = 30000;
  static const int receiveTimeout = 30000;

  // Socket IO - always use production for web preview
  static String get socketUrl {
    return 'https://api.eltekkeya.com';
  }
}
