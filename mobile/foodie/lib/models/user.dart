class User {
  final String id;
  final String email;
  final String name;
  final String? phone;
  final String? profileImage;
  final String role;
  final DateTime createdAt;

  User({
    required this.id,
    required this.email,
    required this.name,
    this.phone,
    this.profileImage,
    required this.role,
    required this.createdAt,
  });

  factory User.fromJson(Map<String, dynamic> json) => User(
      id: json['_id'] ?? '',
      email: json['email'] ?? '',
      name: json['name'] ?? '',
      phone: json['phone'],
      profileImage: json['profileImage'],
      role: json['role'] ?? 'user',
      createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toString()),
    );

  Map<String, dynamic> toJson() => {
    '_id': id,
    'email': email,
    'name': name,
    'phone': phone,
    'profileImage': profileImage,
    'role': role,
    'createdAt': createdAt.toIso8601String(),
  };
}
