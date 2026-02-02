class Address {
  final String id;
  final String label;
  final String addressLine1;
  final String? addressLine2;
  final String city;
  final String countryCode;
  final double lat;
  final double lng;
  final String? deliveryNotes;
  final bool isDefault;

  Address({
    required this.id,
    required this.label,
    required this.addressLine1,
    this.addressLine2,
    required this.city,
    required this.countryCode,
    required this.lat,
    required this.lng,
    this.deliveryNotes,
    required this.isDefault,
  });

  factory Address.fromJson(Map<String, dynamic> json) {
    return Address(
      id: json['_id'] ?? '',
      label: json['label'] ?? '',
      addressLine1: json['addressLine1'] ?? '',
      addressLine2: json['addressLine2'],
      city: json['city'] ?? '',
      countryCode: json['countryCode'] ?? 'SA',
      lat: (json['lat'] ?? 0.0).toDouble(),
      lng: (json['lng'] ?? 0.0).toDouble(),
      deliveryNotes: json['deliveryNotes'],
      isDefault: json['isDefault'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'label': label,
      'addressLine1': addressLine1,
      'addressLine2': addressLine2,
      'city': city,
      'countryCode': countryCode,
      'lat': lat,
      'lng': lng,
      'deliveryNotes': deliveryNotes,
      'isDefault': isDefault,
    };
  }
}
