class Category {
  final String id;
  final String name; // Legacy field for backward compatibility
  final String nameEn;
  final String nameAr;
  final String description;
  final String descriptionAr;
  final CategoryIcons icons;
  final String color;
  final int sortOrder;
  final int dishCount;
  final bool isActive;

  Category({
    required this.id,
    String? name,
    String? nameEn,
    String? nameAr,
    String? description,
    String? descriptionAr,
    CategoryIcons? icons,
    String? color,
    int? sortOrder,
    int? dishCount,
    bool? isActive,
  })  : name = name ?? nameEn ?? '',
        nameEn = nameEn ?? name ?? '',
        nameAr = nameAr ?? name ?? '',
        description = description ?? '',
        descriptionAr = descriptionAr ?? '',
        icons = icons ?? CategoryIcons(),
        color = color ?? '#FFB973',
        sortOrder = sortOrder ?? 0,
        dishCount = dishCount ?? 0,
        isActive = isActive ?? true;

  String getName(bool isArabic) => isArabic ? nameAr : nameEn;

  // Get the mobile icon URL or fallback
  String get iconMobile => icons.mobile.isNotEmpty ? icons.mobile : icons.web;

  // Get the web icon URL
  String get iconWeb => icons.web;

  factory Category.fromJson(Map<String, dynamic> json) => Category(
        id: json['_id'] ?? json['id'] ?? '',
        name: json['name'] ?? '',
        nameEn: json['nameEn'] ?? json['name'] ?? '',
        nameAr: json['nameAr'] ?? json['name'] ?? '',
        description: json['description'] ?? '',
        descriptionAr: json['descriptionAr'] ?? '',
        icons: CategoryIcons.fromJson(json['icons'] ?? {}),
        color: json['color'] ?? '#FFB973',
        sortOrder: json['sortOrder'] ?? 0,
        dishCount: json['dishCount'] ?? 0,
        isActive: json['isActive'] ?? true,
      );

  Map<String, dynamic> toJson() => {
        '_id': id,
        'name': name,
        'nameEn': nameEn,
        'nameAr': nameAr,
        'description': description,
        'descriptionAr': descriptionAr,
        'icons': icons.toJson(),
        'color': color,
        'sortOrder': sortOrder,
        'dishCount': dishCount,
        'isActive': isActive,
      };
}

// Category icons for web and mobile
class CategoryIcons {
  final String web;
  final String mobile;

  CategoryIcons({
    this.web = '',
    this.mobile = '',
  });

  factory CategoryIcons.fromJson(Map<String, dynamic> json) => CategoryIcons(
        web: json['web'] ?? '',
        mobile: json['mobile'] ?? '',
      );

  Map<String, dynamic> toJson() => {
        'web': web,
        'mobile': mobile,
      };

  bool get isEmpty => web.isEmpty && mobile.isEmpty;

  bool get isNotEmpty => !isEmpty;
}

// Default/fallback categories for when API is unavailable
class DefaultCategories {
  static const List<Map<String, dynamic>> categories = [
    {
      'id': '1',
      'nameEn': 'Roasted',
      'nameAr': 'محمرات',
      'icons': {'web': 'assets/categories/Roasted.png', 'mobile': 'assets/categories/Roasted.png'}
    },
    {
      'id': '2',
      'nameEn': 'Grilled',
      'nameAr': 'مشويات',
      'icons': {'web': 'assets/categories/Grilled.png', 'mobile': 'assets/categories/Grilled.png'}
    },
    {
      'id': '3',
      'nameEn': 'Casseroles',
      'nameAr': 'طواجن',
      'icons': {'web': 'assets/categories/Casseroles.png', 'mobile': 'assets/categories/Casseroles.png'}
    },
    {
      'id': '4',
      'nameEn': 'Traditional',
      'nameAr': 'تقليدية',
      'icons': {'web': 'assets/categories/Traditional.png', 'mobile': 'assets/categories/Traditional.png'}
    },
    {
      'id': '5',
      'nameEn': 'Fried',
      'nameAr': 'مقليات',
      'icons': {'web': 'assets/categories/Fried.png', 'mobile': 'assets/categories/Fried.png'}
    },
    {
      'id': '6',
      'nameEn': 'Oven',
      'nameAr': 'اكلات بالفرن',
      'icons': {'web': 'assets/categories/Oven.png', 'mobile': 'assets/categories/Oven.png'}
    },
    {
      'id': '7',
      'nameEn': 'Sides',
      'nameAr': 'اطباق جانبية',
      'icons': {'web': 'assets/categories/Sides.png', 'mobile': 'assets/categories/Sides.png'}
    },
  ];

  static List<Category> getCategories() {
    return categories.map((c) => Category.fromJson(c)).toList();
  }
}
