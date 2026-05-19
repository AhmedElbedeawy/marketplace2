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

  // For Flutter Web, use server proxy to avoid CORS issues with GCS
  // kIsWeb is true when running in browser
  static String get imageProxyUrl {
    if (kIsWeb) {
      return 'https://api.eltekkeya.com';
    }
    return staticBaseUrl;
  }

  // Normalize image URL to handle relative paths
  static String normalizeImageUrl(String? imagePath) {
    if (imagePath == null || imagePath.isEmpty) {
      return '';
    }
    
    // Already absolute URL
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      // For Flutter Web, route GCS URLs through server proxy to bypass CORS
      if (kIsWeb && (
          imagePath.contains('storage.googleapis.com') ||
          imagePath.contains('firebasestorage.googleapis.com'))) {
        // Extract path from GCS URL and route through proxy
        // Example: https://storage.googleapis.com/eltekkeya.firebasestorage.app/offers/xxx.jpg
        // Becomes: https://api.eltekkeya.com/proxy-image?url=<encoded>
        return '$imageProxyUrl/proxy-image?url=${Uri.encodeComponent(imagePath)}';
      }
      
      // /uploads/ paths on eltekkeya.com should work (server has CORS enabled)
      if (imagePath.startsWith('https://eltekkeya.com/uploads/')) {
        return imagePath;
      }
      
      return imagePath;
    }
    
    // Uploaded asset - prepend static base URL
    if (imagePath.startsWith('/uploads/')) {
      return '$staticBaseUrl$imagePath';
    }
    
    // Asset path - return as-is
    if (imagePath.startsWith('/assets/')) {
      return imagePath;
    }
    
    // Relative path without leading / - assume it's an asset
    return '/assets/dishes/$imagePath';
  }

  // Endpoints
  static String get authLogin => '$baseUrl/auth/login';
  static String get authRegister => '$baseUrl/auth/register';
  static String get authSocialLogin => '$baseUrl/auth/social-login';
  static String get authLogout => '$baseUrl/auth/logout';
  static String get authRefresh => '$baseUrl/auth/refresh-token';
  static String get authDeleteAccount => '$baseUrl/auth/account';

  // AdminDish endpoints (PHASE 3/4: 2-layer model)
  static String get getFeaturedAdminDishes =>
      '$baseUrl/public/admin-dishes/featured';
  static String get getAdminDishesWithStats =>
      '$baseUrl/public/admin-dishes/with-stats';

  // DishOffer endpoints (PHASE 3/4: 2-layer model)
  static String get getOffersByAdminDish =>
    '$baseUrl/dish-offers/by-admin-dish/';
  static String get getOffersByCook =>
    '$baseUrl/dish-offers/by-cook/';

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
  static String get userProfilePhoto => '$baseUrl/users/profile-photo';

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

  // Cook Hub - Marketing (campaign impact dashboard)
  static String cookMarketingDashboard() => '$baseUrl/campaigns/impact/my-dishes';

  // Cook Hub - Invoices & Payouts
  static String cookInvoices() => '$baseUrl/invoices/cook/invoices';
  static String invoiceById(String id) => '$baseUrl/invoices/cook/invoices/$id';
  static String invoicePdf(String id) => '$baseUrl/invoices/cook/invoices/$id/pdf';

  // Reviews & Ratings
  static String getOrderRating(String orderId) =>
      '$baseUrl/ratings/order/$orderId';
  static String getOrderRatingStatus(String orderId) =>
      '$baseUrl/ratings/order/$orderId/status';
  static String replyToRating(String ratingId) =>
      '$baseUrl/ratings/$ratingId/reply';

  // Messages
  static String messageInbox() => '$baseUrl/messages/inbox';
  static String messageConversation(String userId) =>
      '$baseUrl/messages/conversation/$userId';
  static String messageSend() => '$baseUrl/messages/send';
  static String messageMarkRead(String senderId) =>
      '$baseUrl/messages/read/$senderId';
  static String messageContacts() => '$baseUrl/messages/contacts';

  // Support Team chat
  static String supportThreadSend() => '$baseUrl/support/thread/message';
  static String supportThread() => '$baseUrl/support/thread';
  static String supportMarkRead() => '$baseUrl/support/thread/read';

  // Notifications
  static String notifications() => '$baseUrl/notifications';
  static String markNotificationRead(String id) =>
      '$baseUrl/notifications/$id/read';
  static String markAllNotificationsRead() => '$baseUrl/notifications/read-all';
  static String deleteNotification(String id) => '$baseUrl/notifications/$id';

  // Expertise (cook specialties — public read)
  static String get getExpertise => '$baseUrl/expertise';

  // Categories
  static String get getCategories => '$baseUrl/categories';

  // Cart & Orders
  static String get getCart => '$baseUrl/cart';
  static String get addToCart => '$baseUrl/cart/add';
  static String get syncCart => '$baseUrl/cart/sync';
  // CRITICAL: Refresh cart stock on cart open (adjusts quantities, removes out-of-stock)
  static String get refreshCartStock => '$baseUrl/cart/refresh-stock';
  // CRITICAL: Validate cart stock before checkout (blocks if insufficient)
  static String get validateCartStock => '$baseUrl/cart/validate-stock';
  
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

  // Google Places proxy — key stays server-side, never in the app
  static String placesAutocomplete() => '$baseUrl/places/autocomplete';
  static String placesDetails() => '$baseUrl/places/details';

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
