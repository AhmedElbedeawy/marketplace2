class Food {
  final String id;
  final String name;
  final String? nameAr; // PHASE 3: Bilingual support
  final String description;
  final double price;
  final String category;
  final CategoryInfo? categoryInfo; // PHASE 3: Category object from API
  final String? image;
  final String? imageUrl; // PHASE 3: AdminDish imageUrl
  final int orderCount;
  final bool isFavorite;
  final double rating;
  final int reviewCount;
  final int cookCount; // PHASE 3: From offerCount
  final int prepTime;
  final int calories;
  final String servingSize;
  final List<String> ingredients;
  final List<String> images; // PHASE 3: Offer images
  final List<CookOffer> cooks;
  final String? countryCode;
  
  // PHASE 3: 2-layer model fields
  final String? adminDishId; // Reference to AdminDish
  final double? minPrice; // From /with-stats endpoint
  final int? offerCount; // From /with-stats endpoint

  Food({
    required this.id,
    required this.name,
    this.nameAr,
    required this.description,
    required this.price,
    required this.category,
    this.categoryInfo,
    this.image,
    this.imageUrl,
    required this.orderCount,
    required this.isFavorite,
    required this.rating,
    required this.reviewCount,
    required this.cookCount,
    required this.prepTime,
    required this.calories,
    this.servingSize = '1-4 Serving',
    this.ingredients = const [],
    this.images = const [],
    this.cooks = const [],
    this.countryCode,
    this.adminDishId,
    this.minPrice,
    this.offerCount,
  });

  // Factory for legacy Product response
  factory Food.fromProductJson(Map<String, dynamic> json) => Food(
      id: json['_id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      category: json['category'] ?? '',
      image: json['image'],
      orderCount: json['orderCount'] ?? 0,
      isFavorite: json['isFavorite'] ?? false,
      rating: (json['rating'] as num?)?.toDouble() ?? 4.0,
      reviewCount: json['reviewCount'] ?? 0,
      cookCount: json['cookCount'] ?? 1,
      prepTime: json['prepTime'] ?? 30,
      calories: json['calories'] ?? 500,
      servingSize: json['servingSize'] ?? '1-4 Serving',
      ingredients: (json['ingredients'] as List<dynamic>?)
          ?.map((i) => i.toString())
          .toList() ?? [],
      images: (json['images'] as List<dynamic>?)
          ?.map((i) => i.toString())
          .toList() ?? [],
      cooks: (json['cooks'] as List<dynamic>?)
          ?.map((cook) => CookOffer.fromJson(cook))
          .toList() ?? [],
      countryCode: json['countryCode'],
    );

  // Factory for AdminDish response (PHASE 3)
  factory Food.fromAdminDishJson(Map<String, dynamic> json) {
    final categoryJson = json['category'];
    final categoryInfo = categoryJson != null 
        ? CategoryInfo.fromJson(categoryJson)
        : null;
    
    return Food(
      id: json['_id'] ?? json['id'] ?? '',
      name: json['nameEn'] ?? json['name'] ?? '',
      nameAr: json['nameAr'],
      description: json['description'] ?? '',
      price: (json['minPrice'] as num?)?.toDouble() ?? 0.0,
      category: categoryInfo?.id ?? categoryJson?['_id'] ?? '',
      categoryInfo: categoryInfo,
      imageUrl: json['imageUrl'],
      // For AdminDish in list view, use imageUrl as the main image
      image: json['imageUrl'],
      orderCount: json['orderCount'] ?? 0,
      isFavorite: false,
      rating: (json['rating'] as num?)?.toDouble() ?? 4.0,
      reviewCount: json['reviewCount'] ?? 0,
      cookCount: (json['offerCount'] as num?)?.toInt() ?? 1,
      prepTime: json['prepTime'] ?? 30,
      calories: json['calories'] ?? 500,
      servingSize: json['portionSize'] ?? '1-4 Serving',
      ingredients: (json['ingredients'] as List<dynamic>?)
          ?.map((i) => i.toString())
          .toList() ?? [],
      images: (json['images'] as List<dynamic>?)
          ?.map((i) => i.toString())
          .toList() ?? [],
      cooks: [],
      countryCode: json['countryCode'],
      adminDishId: json['_id'] ?? json['id'],
      minPrice: (json['minPrice'] as num?)?.toDouble(),
      offerCount: (json['offerCount'] as num?)?.toInt(),
    );
  }

  // Factory that handles both legacy and new formats
  factory Food.fromJson(Map<String, dynamic> json) {
    // Check if this is an AdminDish response (has nameEn or minPrice)
    if (json.containsKey('nameEn') || json.containsKey('minPrice')) {
      return Food.fromAdminDishJson(json);
    }
    // Otherwise, treat as legacy Product response
    return Food.fromProductJson(json);
  }

  Map<String, dynamic> toJson() => {
    '_id': id,
    'name': name,
    'description': description,
    'price': price,
    'category': category,
    'image': image,
    'orderCount': orderCount,
    'isFavorite': isFavorite,
    'rating': rating,
    'reviewCount': reviewCount,
    'cookCount': cookCount,
    'prepTime': prepTime,
    'calories': calories,
    'servingSize': servingSize,
    'ingredients': ingredients,
    'images': images,
    'cooks': cooks.map((cook) => cook.toJson()).toList(),
    'countryCode': countryCode,
  };
}

class CookOffer {
  final String offerId; // PHASE 4: DishOffer._id
  final String cookId; // Cook._id
  final String cookName;
  final String? cookImage;
  final double cookRating;
  final int cookReviews;
  final double price;
  final int prepTime;
  final int calories;
  final int servingSize; // Number of servings
  final bool isFavorite; // Favorite status for this specific cook's dish
  final int availableQuantity; // Stock available

  CookOffer({
    required this.offerId, // PHASE 4
    required this.cookId,
    required this.cookName,
    this.cookImage,
    required this.cookRating,
    required this.cookReviews,
    required this.price,
    required this.prepTime,
    required this.calories,
    this.servingSize = 4,
    this.isFavorite = false,
    this.availableQuantity = 10,
  });

  factory CookOffer.fromJson(Map<String, dynamic> json) => CookOffer(
      offerId: json['_id'] ?? json['id'] ?? '', // PHASE 4
      cookId: json['cookId'] ?? json['_id'] ?? '',
      cookName: json['cookName'] ?? json['name'] ?? '',
      cookImage: json['cookImage'] ?? json['profileImage'],
      cookRating: (json['cookRating'] as num?)?.toDouble() ?? 4.0,
      cookReviews: json['cookReviews'] ?? json['reviewCount'] ?? 0,
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      prepTime: json['prepTime'] ?? 30,
      calories: json['calories'] ?? 500,
      servingSize: json['servingSize'] ?? 4,
      isFavorite: json['isFavorite'] ?? false,
      availableQuantity: json['availableQuantity'] ?? 10,
    );

  Map<String, dynamic> toJson() => {
    'cookId': cookId,
    'cookName': cookName,
    'cookImage': cookImage,
    'cookRating': cookRating,
    'cookReviews': cookReviews,
    'price': price,
    'prepTime': prepTime,
    'calories': calories,
    'servingSize': servingSize,
    'isFavorite': isFavorite,
    'availableQuantity': availableQuantity,
  };
}

class Chef {
  final String id;
  final String name;
  final String? profileImage;
  final double rating;
  final int reviewCount;
  final String expertise;
  final List<String> specialties;
  final bool isFollowing;
  final int ordersCount;
  final String? bio;
  final String? countryCode;

  Chef({
    required this.id,
    required this.name,
    this.profileImage,
    required this.rating,
    required this.reviewCount,
    required this.expertise,
    required this.specialties,
    required this.isFollowing,
    this.ordersCount = 0,
    this.bio,
    this.countryCode,
  });

  factory Chef.fromJson(Map<String, dynamic> json) => Chef(
      id: json['_id'] ?? '',
      name: json['name'] ?? '',
      profileImage: json['profileImage'],
      rating: (json['rating'] as num?)?.toDouble() ?? 0.0,
      reviewCount: json['reviewCount'] ?? 0,
      expertise: json['expertise'] ?? '',
      specialties: List<String>.from(json['specialties'] ?? []),
      isFollowing: json['isFollowing'] ?? false,
      ordersCount: json['ordersCount'] ?? 0,
      bio: json['bio'],
      countryCode: json['countryCode'],
    );
}

class DishCookVariant {
  final String cookId;
  final String cookName;
  final double cookRating;
  final double price;
  final List<String> images;

  DishCookVariant({
    required this.cookId,
    required this.cookName,
    required this.cookRating,
    required this.price,
    required this.images,
  });
}

// PHASE 3: Category info from AdminDish response
class CategoryInfo {
  final String id;
  final String name;
  final String? nameEn;
  final String? nameAr;
  final String? icon;
  final String? iconWeb;

  CategoryInfo({
    required this.id,
    required this.name,
    this.nameEn,
    this.nameAr,
    this.icon,
    this.iconWeb,
  });

  factory CategoryInfo.fromJson(Map<String, dynamic> json) => CategoryInfo(
    id: json['_id'] ?? json['id'] ?? '',
    name: json['name'] ?? json['nameEn'] ?? '',
    nameEn: json['nameEn'],
    nameAr: json['nameAr'],
    icon: json['icon'],
    iconWeb: json['icons']?['web'] ?? json['iconWeb'],
  );
}

// PHASE 3: DishOffer model for Level 1 popup and cart
class DishOffer {
  final String id;
  final String name;
  final String? nameAr;
  final String? description;
  final double price;
  final int prepTime;
  final String? portionSize;
  final int? calories;
  final List<String> images;
  final CookInfo cook;
  final String? adminDishId;
  final int? stock; // Dual lookup: DishOffer stock first, then Product

  DishOffer({
    required this.id,
    required this.name,
    this.nameAr,
    this.description,
    required this.price,
    required this.prepTime,
    this.portionSize,
    this.calories,
    this.images = const [],
    required this.cook,
    this.adminDishId,
    this.stock,
  });

  factory DishOffer.fromJson(Map<String, dynamic> json) {
    final cookJson = json['cook'];
    return DishOffer(
      id: json['_id'] ?? json['id'] ?? '',
      name: json['name'] ?? '',
      nameAr: json['nameAr'],
      description: json['description'],
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      prepTime: json['prepTime'] ?? 30,
      portionSize: json['portionSize'],
      calories: json['calories'],
      images: (json['images'] as List<dynamic>?)
          ?.map((i) => i.toString())
          .toList() ?? [],
      cook: CookInfo.fromJson(cookJson ?? {}),
      adminDishId: json['adminDishId'] ?? json['adminDish']?['_id'],
      stock: json['stock'],
    );
  }
}

// PHASE 3: Cook info embedded in DishOffer
class CookInfo {
  final String id;
  final String name;
  final String? storeName;
  final String? profilePhoto;
  final double? rating;
  final int? ratingsCount;

  CookInfo({
    required this.id,
    required this.name,
    this.storeName,
    this.profilePhoto,
    this.rating,
    this.ratingsCount,
  });

  factory CookInfo.fromJson(Map<String, dynamic> json) => CookInfo(
    id: json['_id'] ?? json['id'] ?? '',
    name: json['name'] ?? '',
    storeName: json['storeName'],
    profilePhoto: json['profilePhoto'],
    rating: (json['rating'] as num?)?.toDouble(),
    ratingsCount: json['ratingsCount'] ?? json['ratings']?['count'],
  );
}
