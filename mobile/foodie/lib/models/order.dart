import 'address.dart';

class Order {
  final String id;
  final String status;
  final double totalAmount;
  final DateTime createdAt;
  final Address? deliveryAddress;
  final List<SubOrder> subOrders;
  final VatSnapshot? vatSnapshot;
  final bool? hasIssue;
  final Map<String, dynamic>? issue;

  Order({
    required this.id,
    required this.status,
    required this.totalAmount,
    required this.createdAt,
    this.deliveryAddress,
    this.subOrders = const [],
    this.vatSnapshot,
    this.hasIssue,
    this.issue,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(
      id: json['_id'] ?? json['id'] ?? '',
      status: json['status'] ?? 'pending',
      totalAmount: (json['totalAmount'] ?? 0).toDouble(),
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : DateTime.now(),
      deliveryAddress: json['deliveryAddress'] != null ? Address.fromJson(json['deliveryAddress']) : null,
      subOrders: (json['subOrders'] as List?)?.map((s) => SubOrder.fromJson(s)).toList() ?? [],
      vatSnapshot: json['vatSnapshot'] != null ? VatSnapshot.fromJson(json['vatSnapshot']) : null,
      hasIssue: json['hasIssue'],
      issue: json['issue'],
    );
  }
}

class SubOrder {
  final String id;
  final String cookId;
  final String? cookName; // Added for display
  final String status;
  final double totalAmount;
  final String? fulfillmentMode; // Added: 'pickup' or 'delivery'
  final String? timingPreference; // NEW: 'combined' or 'separate'
  final List<OrderItem> items; // Added: dish items in this subOrder
  final double deliveryFee; // Added: delivery fee for this subOrder
  final CookLocationSnapshot? cookLocationSnapshot;

  SubOrder({
    required this.id,
    required this.cookId,
    this.cookName,
    required this.status,
    required this.totalAmount,
    this.fulfillmentMode,
    this.timingPreference,
    this.items = const [],
    this.deliveryFee = 0,
    this.cookLocationSnapshot,
  });

  factory SubOrder.fromJson(Map<String, dynamic> json) {
    // cook can be an object with name/_id or just a string ID
    final cookData = json['cook'];
    String cookId = '';
    String? cookName;
    
    // Backend now enriches with flat cookName field
    cookName = json['cookName'];
    
    if (cookData is Map<String, dynamic>) {
      cookId = cookData['_id'] ?? '';
      cookName = cookName ?? cookData['name'] ?? cookData['storeName'];
    } else if (cookData is String) {
      cookId = cookData;
    }
    
    // Defensive parsing for items - don't let malformed items break the order
    List<OrderItem> parsedItems = [];
    try {
      final itemsData = json['items'];
      if (itemsData is List) {
        parsedItems = itemsData
            .map((item) {
              try {
                return OrderItem.fromJson(item as Map<String, dynamic>);
              } catch (e) {
                print('⚠️ Failed to parse OrderItem: $e');
                return null;
              }
            })
            .whereType<OrderItem>()
            .toList();
      }
    } catch (e) {
      print('⚠️ Failed to parse SubOrder items: $e');
    }
    
    return SubOrder(
      id: json['_id'] ?? json['id'] ?? '',
      cookId: cookId,
      cookName: cookName,
      status: json['status'] ?? 'order_received',
      totalAmount: (json['totalAmount'] ?? 0).toDouble(),
      fulfillmentMode: json['fulfillmentMode'], // 'pickup' or 'delivery'
      timingPreference: json['timingPreference'], // 'combined' or 'separate'
      items: parsedItems,
      deliveryFee: (json['deliveryFee'] ?? 0).toDouble(),
      cookLocationSnapshot: json['cookLocationSnapshot'] != null 
          ? CookLocationSnapshot.fromJson(json['cookLocationSnapshot']) 
          : null,
    );
  }
}

class OrderItem {
  final String id;
  final String productId;
  final String? dishOfferId;
  final String name; // From productSnapshot
  final String? image; // From productSnapshot
  final int quantity;
  final double price;
  final DateTime? readyAt; // NEW: computed ready time for cutoff rules

  OrderItem({
    required this.id,
    required this.productId,
    this.dishOfferId,
    required this.name,
    this.image,
    required this.quantity,
    required this.price,
    this.readyAt,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    // Defensive parsing - handle all possible shapes
    final productSnapshot = json['productSnapshot'];
    final product = json['product'];
    
    String? productName;
    String? productImage;
    String productId = '';
    
    // Extract from productSnapshot (enriched by backend)
    if (productSnapshot is Map<String, dynamic>) {
      productName = productSnapshot['name'];
      productImage = productSnapshot['image'];
    }
    
    // Fallback to product object
    if ((productName == null || productName.isEmpty) && product is Map<String, dynamic>) {
      productName = product['name'];
      productImage = product['image'];
      productId = product['_id'] ?? '';
    }
    
    // Handle product as string ID (legacy/demo data)
    if (productId.isEmpty) {
      if (product is String) {
        productId = product;
      } else if (json['product'] is String) {
        productId = json['product'];
      }
    }
    
    return OrderItem(
      id: json['_id'] ?? json['id'] ?? '',
      productId: productId,
      dishOfferId: json['dishOffer'],
      name: (productName != null && productName.isNotEmpty) ? productName : 'Unknown Dish',
      image: productImage,
      quantity: (json['quantity'] ?? 1) is int ? json['quantity'] : int.tryParse(json['quantity']?.toString() ?? '1') ?? 1,
      price: (json['price'] ?? 0) is num ? (json['price'] ?? 0).toDouble() : double.tryParse(json['price']?.toString() ?? '0') ?? 0.0,
      readyAt: json['readyAt'] != null ? DateTime.parse(json['readyAt']) : null,
    );
  }
}

class CookLocationSnapshot {
  final double lat;
  final double lng;
  final String address;
  final String city;

  CookLocationSnapshot({
    required this.lat,
    required this.lng,
    required this.address,
    required this.city,
  });

  factory CookLocationSnapshot.fromJson(Map<String, dynamic> json) {
    return CookLocationSnapshot(
      lat: (json['lat'] ?? 0).toDouble(),
      lng: (json['lng'] ?? 0).toDouble(),
      address: json['address'] ?? '',
      city: json['city'] ?? '',
    );
  }
}

class VatSnapshot {
  final double vatAmount;
  final double vatRate;
  final String vatLabel;
  VatSnapshot({
    required this.vatAmount,
    required this.vatRate,
    required this.vatLabel,
  });

  factory VatSnapshot.fromJson(Map<String, dynamic> json) {
    return VatSnapshot(
      vatAmount: (json['vatAmount'] ?? 0).toDouble(),
      vatRate: (json['checkoutVatRateAtOrder'] ?? json['vatRate'] ?? 0).toDouble(),
      vatLabel: json['vatLabel'] ?? 'VAT',
    );
  }
}
