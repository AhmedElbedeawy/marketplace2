class CheckoutSession {
  final String id;
  final String status;
  final List<CartItem> cartSnapshot;
  final AddressSnapshot? addressSnapshot;
  final PricingBreakdown pricingBreakdown;
  final AppliedCoupon? appliedCoupon;
  final String paymentMethod;
  final String paymentStatus;
  final DateTime createdAt;

  CheckoutSession({
    required this.id,
    required this.status,
    required this.cartSnapshot,
    this.addressSnapshot,
    required this.pricingBreakdown,
    this.appliedCoupon,
    required this.paymentMethod,
    required this.paymentStatus,
    required this.createdAt,
  });

  factory CheckoutSession.fromJson(Map<String, dynamic> json) {
    return CheckoutSession(
      id: json['_id'] ?? '',
      status: json['status'] ?? 'DRAFT',
      cartSnapshot: (json['cartSnapshot'] as List?)
          ?.map((item) => CartItem.fromJson(item))
          .toList() ?? [],
      addressSnapshot: json['addressSnapshot'] != null
          ? AddressSnapshot.fromJson(json['addressSnapshot'])
          : null,
      pricingBreakdown: PricingBreakdown.fromJson(json['pricingBreakdown'] ?? {}),
      appliedCoupon: json['appliedCoupon'] != null
          ? AppliedCoupon.fromJson(json['appliedCoupon'])
          : null,
      paymentMethod: json['paymentMethod'] ?? 'CASH',
      paymentStatus: json['paymentStatus'] ?? 'UNPAID',
      createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toIso8601String()),
    );
  }
}

class CartItem {
  final String dishId;
  final String dishName;
  final String cookId;
  final int quantity;
  final double unitPrice;
  final String? notes;

  CartItem({
    required this.dishId,
    required this.dishName,
    required this.cookId,
    required this.quantity,
    required this.unitPrice,
    this.notes,
  });

  factory CartItem.fromJson(Map<String, dynamic> json) {
    return CartItem(
      dishId: json['dish'] ?? '',
      dishName: json['dishName'] ?? '',
      cookId: json['cook'] ?? '',
      quantity: json['quantity'] ?? 1,
      unitPrice: (json['unitPrice'] ?? 0).toDouble(),
      notes: json['notes'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'dishId': dishId,
      'cookId': cookId,
      'quantity': quantity,
      'unitPrice': unitPrice,
      'notes': notes ?? '',
    };
  }
}

class AddressSnapshot {
  final String fullAddress;
  final String city;
  final String? deliveryNotes;

  AddressSnapshot({
    required this.fullAddress,
    required this.city,
    this.deliveryNotes,
  });

  factory AddressSnapshot.fromJson(Map<String, dynamic> json) {
    return AddressSnapshot(
      fullAddress: json['fullAddress'] ?? '',
      city: json['city'] ?? '',
      deliveryNotes: json['deliveryNotes'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'fullAddress': fullAddress,
      'city': city,
      'coordinates': {'lat': 0, 'lng': 0},
      'deliveryNotes': deliveryNotes ?? '',
    };
  }
}

class PricingBreakdown {
  final double subtotal;
  final double couponDiscount;
  final double autoDiscount;
  final double deliveryFee;
  final double vatAmount;
  final double netTotal;
  final double total;
  final double? vatRate;
  final String? vatLabel;
  final String? currencyCode;
  final String? countryCode;
  final Map<String, dynamic>? debug;

  PricingBreakdown({
    required this.subtotal,
    required this.couponDiscount,
    required this.autoDiscount,
    required this.deliveryFee,
    required this.vatAmount,
    required this.netTotal,
    required this.total,
    this.vatRate,
    this.vatLabel,
    this.currencyCode,
    this.countryCode,
    this.debug,
  });

  factory PricingBreakdown.fromJson(Map<String, dynamic> json) {
    return PricingBreakdown(
      subtotal: (json['subtotal'] ?? 0).toDouble(),
      couponDiscount: (json['couponDiscount'] ?? 0).toDouble(),
      autoDiscount: (json['autoDiscount'] ?? 0).toDouble(),
      deliveryFee: (json['deliveryFee'] ?? 0).toDouble(),
      vatAmount: (json['vatAmount'] ?? 0).toDouble(),
      netTotal: (json['netTotal'] ?? 0).toDouble(),
      total: (json['total'] ?? 0).toDouble(),
      vatRate: (json['vatRate'] ?? 0).toDouble(),
      vatLabel: json['vatLabel'],
      currencyCode: json['currencyCode'],
      countryCode: json['countryCode'],
      debug: json['debug'] is Map<String, dynamic> ? json['debug'] : null,
    );
  }
}

class AppliedCoupon {
  final String code;
  final String campaignId;
  final double discountAmount;

  AppliedCoupon({
    required this.code,
    required this.campaignId,
    required this.discountAmount,
  });

  factory AppliedCoupon.fromJson(Map<String, dynamic> json) {
    return AppliedCoupon(
      code: json['code'] ?? '',
      campaignId: json['campaignId'] ?? '',
      discountAmount: (json['discountAmount'] ?? 0).toDouble(),
    );
  }
}
