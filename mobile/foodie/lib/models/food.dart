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
  final int? variantsCount; // From /with-stats endpoint (total variants across all offers)

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
    this.variantsCount,
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
    // Safe numeric parsing helpers - handles string or num
    double? toDoubleSafe(dynamic v) {
      if (v is num) return v.toDouble();
      if (v is String) return double.tryParse(v);
      return null;
    }

    int? toIntSafe(dynamic v) {
      if (v is num) return v.toInt();
      if (v is String) return int.tryParse(v);
      return null;
    }

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
      imageUrl: json['adminDish']?['imageUrl'] ?? json['imageUrl'],
      // For AdminDish in list view, use nested adminDish.imageUrl first, fallback to root
      image: json['adminDish']?['imageUrl'] ?? json['imageUrl'],
      orderCount: json['orderCount'] ?? 0,
      isFavorite: false,
      rating: toDoubleSafe(json['rating']) ?? 4.0,
      reviewCount: json['reviewCount'] ?? 0,
      cookCount: toIntSafe(json['offerCount']) ?? 1,
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
      minPrice: toDoubleSafe(json['minPrice']),
      offerCount: toIntSafe(json['offerCount']),
      variantsCount: toIntSafe(json['variantsCount']),
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
final double deliveryFee;
  final int prepTime;
  final int calories;
  final int servingSize; // Number of servings
  final bool isFavorite; // Favorite status for this specific cook's dish
  final int availableQuantity; // Stock available
  
  // PHASE 5: Full offer data including variants, prep config, fulfillment modes
  final Map<String, dynamic>? fullOfferData;

  CookOffer({
    required this.offerId, // PHASE 4
    required this.cookId,
    required this.cookName,
    this.cookImage,
    required this.cookRating,
    required this.cookReviews,
    required this.price,
this.deliveryFee = 0.0,
    required this.prepTime,
    required this.calories,
    this.servingSize = 4,
    this.isFavorite = false,
    this.availableQuantity = 10,
    this.fullOfferData,
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
      // PHASE 5: Store full offer data for accessing variants/prep/fulfillment
      fullOfferData: json,
deliveryFee: (json['deliveryFee'] as num?)?.toDouble() ?? 0.0,
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
  final double deliveryFee; // Added for cart
  final String? countryCode; // Added for cart country sync
  final Map<String, dynamic>? fullOfferData; // Full offer data for prep config

  DishCookVariant({
  required this.cookId,
  required this.cookName,
  required this.cookRating,
  required this.price,
  required this.images,
   this.deliveryFee = 0.0,
   this.countryCode,
   this.fullOfferData,
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
  final String? descriptionEn;
  final String? descriptionAr;
  final String? longDescription;
  final String? longDescriptionEn;
  final String? longDescriptionAr;
  final double price;
  final double deliveryFee;
  final int prepTime;
  final String? portionSize;
  final int? calories;
  final List<String> images;
  final CookInfo cook;
  final String? adminDishId;
  final int? stock; // Dual lookup: DishOffer stock first, then Product
  
  // PHASE 5: Portion variants support
  final List<Map<String, dynamic>>? variants;
  
  // PHASE 5: Prep time and fulfillment modes
  final Map<String, dynamic>? prepReadyConfig;
  final Map<String, dynamic>? fulfillmentModes;

  DishOffer({
    required this.id,
    required this.name,
    this.nameAr,
    this.description,
    this.descriptionEn,
    this.descriptionAr,
    this.longDescription,
    this.longDescriptionEn,
    this.longDescriptionAr,
    required this.price,
    this.deliveryFee = 0.0,
    required this.prepTime,
    this.portionSize,
    this.calories,
    this.images = const [],
    required this.cook,
    this.adminDishId,
    this.stock,
    this.variants,
    this.prepReadyConfig,
    this.fulfillmentModes,
  });

  factory DishOffer.fromJson(Map<String, dynamic> json) {
    final cookJson = json['cook'];
    final adminDishJson = json['adminDish'] as Map<String, dynamic>?;
    return DishOffer(
      id: json['_id'] ?? json['id'] ?? '',
      name: json['name'] ?? '',
      nameAr: json['nameAr'],
      description: json['description'],
      descriptionEn: adminDishJson?['descriptionEn'],
      descriptionAr: adminDishJson?['descriptionAr'],
      longDescription: json['longDescription'],
      longDescriptionEn: adminDishJson?['longDescriptionEn'],
      longDescriptionAr: adminDishJson?['longDescriptionAr'],
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      prepTime: json['prepTime'] ?? 30,
      deliveryFee: (json['deliveryFee'] as num?)?.toDouble() ?? 0.0,
      portionSize: json['portionSize'],
      calories: json['calories'],
      images: (json['images'] as List<dynamic>?)
          ?.map((i) => i.toString())
          .toList() ?? [],
      cook: CookInfo.fromJson(cookJson ?? {}),
      adminDishId: json['adminDishId'] ?? json['adminDish']?['_id'],
      stock: json['stock'],
      // PHASE 5: Parse variants if present
      variants: (json['variants'] as List<dynamic>?)
          ?.map((v) => Map<String, dynamic>.from(v as Map<dynamic, dynamic>))
          .toList(),
      // PHASE 5: Parse prep/fulfillment configs
      prepReadyConfig: json['prepReadyConfig'] as Map<String, dynamic>?,
      fulfillmentModes: json['fulfillmentModes'] as Map<String, dynamic>?,
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
  final Map<String, dynamic>? location; // {lat, lng}
  final String? countryCode;

  CookInfo({
    required this.id,
    required this.name,
    this.storeName,
    this.profilePhoto,
    this.rating,
    this.ratingsCount,
    this.location,
   this.countryCode,
  });

  factory CookInfo.fromJson(Map<String, dynamic> json) => CookInfo(
    id: json['_id'] ?? json['id'] ?? '',
    name: json['name'] ?? '',
   storeName: json['storeName'],
   profilePhoto: json['profilePhoto'],
   rating: (json['rating'] as num?)?.toDouble(),
   ratingsCount: json['ratingsCount'] ?? json['ratings']?['count'],
    location: json['location'] as Map<String, dynamic>?,
   countryCode: json['countryCode'],
  );
}
