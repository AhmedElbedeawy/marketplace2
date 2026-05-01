class CartItem {
  final String id;
  final String foodId; // offerId = DishOffer._id
  final String foodName;
  final double price;
  int quantity;
  final String cookId; // kitchenId = Cook._id
  final String cookName;
  final String? countryCode;
  final String? dishId; // AdminDish._id
  final String? portionKey;
  final String? fulfillmentMode;
  final double? priceAtAdd;
  final double deliveryFee; // Per-item delivery fee (0 for pickup)
  final int prepTime; // Prep time in minutes (computed from offer)
  final String? photoUrl; // Dish image for cart display
  final String? extras; // Normalized JSON string of extra IDs (for cart identity)
  final String? pickupLocationId; // Pickup location ID (for cart identity)
  final int? currentStock; // Live stock level (updated on cart refresh)

  CartItem({
   required this.id,
   required this.foodId,
   required this.foodName,
   required this.price,
   required this.quantity,
   required this.cookId,
   required this.cookName,
   this.countryCode,
   this.dishId,
   this.portionKey,
   this.fulfillmentMode,
   this.priceAtAdd,
   this.deliveryFee = 0.0,
   this.prepTime = 30,
   this.photoUrl,
   this.extras,
   this.pickupLocationId,
   this.currentStock,
  });

  double get subtotal => price * quantity;

  factory CartItem.fromJson(Map<String, dynamic> json) => CartItem(
     id: json['_id'] ?? json['id'] ?? '',
    foodId: json['foodId'] ?? json['offerId'] ?? '',
    foodName: json['foodName'] ?? json['name'] ?? '',
     price: (json['price'] as num?)?.toDouble() ?? 0.0,
    quantity: json['quantity'] ?? 1,
    cookId: json['cookId'] ?? json['kitchenId'] ?? '',
    cookName: json['cookName'] ?? json['kitchenName'] ?? '',
    countryCode: json['countryCode'],
     dishId: json['dishId'],
    portionKey: json['portionKey'],
    fulfillmentMode: json['fulfillmentMode'],
     priceAtAdd: (json['priceAtAdd'] as num?)?.toDouble(),
    deliveryFee: (json['deliveryFee'] as num?)?.toDouble() ?? 0.0,
    prepTime: json['prepTime'] ?? json['prepTimeMinutes'] ?? 30,
    photoUrl: json['photoUrl'] ?? json['imageUrl'] ?? json['image'],
    extras: json['extras'],
    pickupLocationId: json['pickupLocationId'] ?? json['cookLocationId'],
    currentStock: json['currentStock'] as int?,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'offerId': foodId,
    'foodId': foodId,
    'foodName': foodName,
    'name': foodName,
    'price': price,
    'quantity': quantity,
    'cookId': cookId,
    'kitchenId': cookId,
    'cookName': cookName,
    'kitchenName': cookName,
    'countryCode': countryCode,
    'dishId': dishId,
    'portionKey': portionKey,
    'fulfillmentMode': fulfillmentMode,
    'priceAtAdd': priceAtAdd ?? price,
    'deliveryFee': deliveryFee,
    'prepTime': prepTime,
    'photoUrl': photoUrl,
    'extras': extras,
    'pickupLocationId': pickupLocationId,
    'currentStock': currentStock,
  };
}