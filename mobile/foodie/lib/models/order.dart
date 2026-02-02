import 'address.dart';

class Order {
  final String id;
  final String status;
  final double totalAmount;
  final DateTime createdAt;
  final Address? deliveryAddress;
  final List<SubOrder> subOrders;
  final VatSnapshot? vatSnapshot;

  Order({
    required this.id,
    required this.status,
    required this.totalAmount,
    required this.createdAt,
    this.deliveryAddress,
    this.subOrders = const [],
    this.vatSnapshot,
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
    );
  }
}

class SubOrder {
  final String id;
  final String cookId;
  final String status;
  final double totalAmount;
  final CookLocationSnapshot? cookLocationSnapshot;

  SubOrder({
    required this.id,
    required this.cookId,
    required this.status,
    required this.totalAmount,
    this.cookLocationSnapshot,
  });

  factory SubOrder.fromJson(Map<String, dynamic> json) {
    return SubOrder(
      id: json['_id'] ?? json['id'] ?? '',
      cookId: json['cook']?['_id'] ?? json['cook'] ?? '',
      status: json['status'] ?? 'order_received',
      totalAmount: (json['totalAmount'] ?? 0).toDouble(),
      cookLocationSnapshot: json['cookLocationSnapshot'] != null 
          ? CookLocationSnapshot.fromJson(json['cookLocationSnapshot']) 
          : null,
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
