class CartItem {
  final String id;
  final String foodId; // PHASE 4: offerId = DishOffer._id
  final String foodName;
  final double price;
  int quantity;
  final String cookId; // PHASE 4: kitchenId = Cook._id
  final String cookName;
  final String? countryCode;
  final String? dishId; // PHASE 4: AdminDish._id (for 2-layer cart mapping)

  CartItem({
    required this.id,
    required this.foodId,
    required this.foodName,
    required this.price,
    required this.quantity,
    required this.cookId,
    required this.cookName,
    this.countryCode,
    this.dishId, // PHASE 4
  });

  double get subtotal => price * quantity;

  factory CartItem.fromJson(Map<String, dynamic> json) => CartItem(
      id: json['_id'] ?? '',
      foodId: json['foodId'] ?? '',
      foodName: json['foodName'] ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      quantity: json['quantity'] ?? 1,
      cookId: json['cookId'] ?? '',
      cookName: json['cookName'] ?? '',
      countryCode: json['countryCode'],
      dishId: json['dishId'], // PHASE 4
    );

  Map<String, dynamic> toJson() => {
    '_id': id,
    'foodId': foodId,
    'foodName': foodName,
    'price': price,
    'quantity': quantity,
    'cookId': cookId,
    'cookName': cookName,
    'countryCode': countryCode,
    'dishId': dishId, // PHASE 4
  };
}
