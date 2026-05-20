import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/language_provider.dart';
import '../../providers/offer_provider.dart';
import '../../config/api_config.dart';
import '../../widgets/app_toggle.dart';
import 'create_offer_screen.dart';
import '../menu/dish_detail_screen.dart';

class _DishCardData {
  final Map<String, dynamic> rawDish;
  final String? imageUrl;
  final String nameEn;
  final String nameAr;
  final String priceStr;
  final bool showDeliveryFee;
  final String deliveryFeeStr;
  final String stockStr;
  final bool isActive;

  const _DishCardData({
    required this.rawDish,
    this.imageUrl,
    required this.nameEn,
    required this.nameAr,
    required this.priceStr,
    required this.showDeliveryFee,
    required this.deliveryFeeStr,
    required this.stockStr,
    required this.isActive,
  });
}

class MenuPage extends StatefulWidget {
  const MenuPage({Key? key}) : super(key: key);

  @override
  State<MenuPage> createState() => _MenuPageState();
}

class _MenuPageState extends State<MenuPage> {
  List<Map<String, dynamic>> _dishes = [];
  bool _isLoading = false;
  String? _error;
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();
  final Map<String, int> _previousStocks = {};
  // Refine filters
  String _orderTypeFilter = 'all';   // 'all' | 'pickup' | 'delivery'
  String _priceRange      = 'any';   // 'any' | 'under30' | '30to60' | 'over60'
  String _prepTimeFilter  = 'any';   // 'any' | 'under30' | '30to60' | 'over60'
  // Cached filtered result — recomputed only when inputs change
  List<Map<String, dynamic>> _cachedFilteredDishes = [];
  // Pre-computed display data — recomputed alongside _cachedFilteredDishes
  List<_DishCardData> _cachedDisplayData = [];
  // Staleness guard — skip re-fetch if dishes loaded within last 60 seconds
  DateTime? _lastFetchTime;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _fetchDishes());
  }

  List<Map<String, dynamic>> get _filteredDishes => _cachedFilteredDishes;

  void _recomputeFilteredDishes() {
    List<Map<String, dynamic>> result = _dishes;

    // Order-type filter (pickup / delivery / all)
    if (_orderTypeFilter != 'all') {
      result = result.where((dish) {
        final mode = (dish['fulfillmentMode'] as String? ?? '').toLowerCase();
        return mode == _orderTypeFilter || mode == 'both';
      }).toList();
    }

    // Price range filter
    if (_priceRange != 'any') {
      result = result.where((dish) {
        final allVariants = dish['variants'] as List? ?? [];
        final price = allVariants.isNotEmpty
            ? ((allVariants.first['price'] as num?)?.toDouble() ?? 0.0)
            : ((dish['price'] as num?)?.toDouble() ?? 0.0);
        switch (_priceRange) {
          case 'under30': return price < 30;
          case '30to60':  return price >= 30 && price <= 60;
          case 'over60':  return price > 60;
          default: return true;
        }
      }).toList();
    }

    // Preparation-time filter (minutes)
    if (_prepTimeFilter != 'any') {
      result = result.where((dish) {
        final prepCfg = dish['prepReadyConfig'] as Map<String, dynamic>?;
        final mins = (prepCfg?['prepTimeMinutes'] as num?)?.toDouble() ?? 0;
        switch (_prepTimeFilter) {
          case 'under30': return mins > 0 && mins < 30;
          case '30to60':  return mins >= 30 && mins <= 60;
          case 'over60':  return mins > 60;
          default: return true;
        }
      }).toList();
    }

    // Search query
    if (_searchQuery.isNotEmpty) {
      final query = _searchQuery.toLowerCase();
      result = result.where((dish) {
        try {
          final adminDishObj = dish['adminDish'];
          String nameEn = '';
          String nameAr = '';

          if (adminDishObj is Map<String, dynamic>) {
            nameEn = (adminDishObj['nameEn'] ?? '').toString().toLowerCase();
            nameAr = (adminDishObj['nameAr'] ?? '').toString().toLowerCase();
          } else if (adminDishObj is List && adminDishObj.isNotEmpty) {
            final first = adminDishObj.first;
            if (first is Map<String, dynamic>) {
              nameEn = (first['nameEn'] ?? '').toString().toLowerCase();
              nameAr = (first['nameAr'] ?? '').toString().toLowerCase();
            }
          }

          if (nameEn.isEmpty && nameAr.isEmpty) {
            nameEn = (dish['nameEn'] ?? '').toString().toLowerCase();
            nameAr = (dish['nameAr'] ?? '').toString().toLowerCase();
          }

          String category = '';
          if (adminDishObj is Map) {
            final categoryObj = adminDishObj['category'];
            if (categoryObj is Map) {
              category = (categoryObj['nameEn'] ?? '').toString().toLowerCase();
            } else if (categoryObj is String) {
              category = categoryObj.toLowerCase();
            }
          }

          return nameEn.contains(query) || nameAr.contains(query) || category.contains(query);
        } catch (_) {
          return false;
        }
      }).toList();
    }

    _cachedFilteredDishes = result;
    _cachedDisplayData = result.map(_toDishCardData).toList();
  }

  _DishCardData _toDishCardData(Map<String, dynamic> dish) {
    final adminDish = dish['adminDish'] as Map<String, dynamic>? ?? {};

    String? rawImageUrl;
    final imagesArray = dish['images'];
    if (imagesArray is List && imagesArray.isNotEmpty) {
      rawImageUrl = imagesArray[0] as String?;
    } else {
      final adminUrl = adminDish['imageUrl'] as String?;
      if (adminUrl != null && adminUrl.isNotEmpty) rawImageUrl = adminUrl;
    }

    final String? imageUrl = rawImageUrl != null && rawImageUrl.isNotEmpty
        ? ApiConfig.normalizeImageUrl(rawImageUrl)
        : null;

    final allVariants = dish['variants'] as List? ?? [];
    final double price = allVariants.isNotEmpty
        ? ((allVariants.first['price'] as num?)?.toDouble() ?? 0.0)
        : ((dish['price'] as num?)?.toDouble() ?? 0.0);
    final int stock = allVariants.isNotEmpty
        ? ((allVariants.first['stock'] as num?)?.toInt() ?? 0)
        : ((dish['stock'] as num?)?.toInt() ?? 0);
    final double deliveryFee = (dish['deliveryFee'] as num?)?.toDouble() ?? 0.0;

    return _DishCardData(
      rawDish: dish,
      imageUrl: imageUrl,
      nameEn: (adminDish['nameEn'] as String?) ??
          (adminDish['nameAr'] as String?) ??
          'Unknown Dish',
      nameAr: (adminDish['nameAr'] as String?) ??
          (adminDish['nameEn'] as String?) ??
          'Unknown Dish',
      priceStr: 'SAR ${price.toStringAsFixed(2)}',
      showDeliveryFee: deliveryFee > 0,
      deliveryFeeStr:
          deliveryFee > 0 ? 'SAR ${deliveryFee.toStringAsFixed(2)}' : '',
      stockStr: '$stock left',
      isActive: dish['isActive'] as bool? ?? true,
    );
  }

  void _showRefineSheet(BuildContext context) {
    final isRTL = context.read<LanguageProvider>().isArabic;
    // Local copies — only committed on Apply
    String orderType = _orderTypeFilter;
    String priceRange = _priceRange;
    String prepTime  = _prepTimeFilter;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          Widget chipRow({
            required String label,
            required List<Map<String, String>> options,
            required String selected,
            required void Function(String) onSelect,
          }) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF2D2F2F))),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 4,
                  children: options.map((opt) {
                    final isSelected = selected == opt['value'];
                    return ChoiceChip(
                      label: Text(opt['label']!),
                      selected: isSelected,
                      selectedColor: const Color(0xFFFF7A00),
                      backgroundColor: const Color(0xFFF1F1F1),
                      labelStyle: TextStyle(
                        color: isSelected ? Colors.white : const Color(0xFF2D2F2F),
                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                        fontSize: 13,
                      ),
                      side: BorderSide.none,
                      onSelected: (_) =>
                          setSheetState(() => onSelect(opt['value']!)),
                    );
                  }).toList(),
                ),
              ],
            );
          }

          final bottomInset = MediaQuery.of(ctx).viewInsets.bottom +
              MediaQuery.of(ctx).padding.bottom +
              20;

          return SingleChildScrollView(
            padding: EdgeInsets.fromLTRB(20, 20, 20, bottomInset),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Handle bar
                Center(
                  child: Container(
                    width: 40, height: 4,
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFD9D9D9),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                // Title + Reset
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      isRTL ? 'تصفية النتائج' : 'Refine',
                      style: const TextStyle(
                          fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    TextButton(
                      onPressed: () => setSheetState(() {
                        orderType = 'all';
                        priceRange = 'any';
                        prepTime  = 'any';
                      }),
                      child: Text(
                        isRTL ? 'إعادة تعيين' : 'Reset',
                        style: const TextStyle(color: Color(0xFFFF7A00)),
                      ),
                    ),
                  ],
                ),
                const Divider(height: 24),

                // 1. Order Type
                chipRow(
                  label: isRTL ? 'نوع الطلب' : 'Order Type',
                  options: [
                    {'value': 'all',      'label': isRTL ? 'الكل'   : 'All'},
                    {'value': 'pickup',   'label': isRTL ? 'استلام' : 'Pickup'},
                    {'value': 'delivery', 'label': isRTL ? 'توصيل'  : 'Delivery'},
                  ],
                  selected: orderType,
                  onSelect: (v) => orderType = v,
                ),
                const SizedBox(height: 20),

                // 2. Price Range (SAR)
                chipRow(
                  label: isRTL ? 'نطاق السعر (ريال)' : 'Price Range (SAR)',
                  options: [
                    {'value': 'any',     'label': isRTL ? 'الكل'       : 'Any'},
                    {'value': 'under30', 'label': isRTL ? 'أقل من 30'  : 'Under 30'},
                    {'value': '30to60',  'label': isRTL ? '30 – 60'    : '30 – 60'},
                    {'value': 'over60',  'label': isRTL ? 'أكثر من 60' : 'Over 60'},
                  ],
                  selected: priceRange,
                  onSelect: (v) => priceRange = v,
                ),
                const SizedBox(height: 20),

                // 3. Preparation Time
                chipRow(
                  label: isRTL ? 'وقت التحضير' : 'Preparation Time',
                  options: [
                    {'value': 'any',     'label': isRTL ? 'الكل'        : 'Any'},
                    {'value': 'under30', 'label': isRTL ? 'أقل من 30 د' : '< 30 min'},
                    {'value': '30to60',  'label': isRTL ? '30 – 60 د'   : '30 – 60 min'},
                    {'value': 'over60',  'label': isRTL ? 'أكثر من 60 د': '> 60 min'},
                  ],
                  selected: prepTime,
                  onSelect: (v) => prepTime = v,
                ),
                const SizedBox(height: 28),

                // Apply button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFFF7A00),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: () {
                      Navigator.pop(ctx);
                      setState(() {
                        _orderTypeFilter = orderType;
                        _priceRange      = priceRange;
                        _prepTimeFilter  = prepTime;
                        _recomputeFilteredDishes();
                      });
                    },
                    child: Text(
                      isRTL ? 'تطبيق' : 'Apply',
                      style: const TextStyle(
                          fontSize: 16, fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _fetchDishes() async {
    final authProvider = context.read<AuthProvider>();
    final token = authProvider.token;
    if (token == null) return;

    if (_dishes.isNotEmpty &&
        _lastFetchTime != null &&
        DateTime.now().difference(_lastFetchTime!).inSeconds < 60) {
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await http.get(
        // No 'active' filter — cook sees ALL their offers, including inactive ones.
        // Inactive offers are shown greyed-out with toggle OFF; they are hidden from foodies by the backend.
        Uri.parse('${ApiConfig.baseUrl}/dish-offers/my'),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);

        if (data is List) {
          final List<Map<String, dynamic>> offers =
              data.cast<Map<String, dynamic>>();

          final Map<String, Map<String, dynamic>> groupedDishes = {};

          for (final offer in offers) {
            String? adminDishId;
            Map<String, dynamic>? adminDishObj;

            if (offer['adminDish'] is Map) {
              adminDishObj = offer['adminDish'] as Map<String, dynamic>;
              adminDishId = adminDishObj['_id'] as String?;
            }
            adminDishId ??= offer['adminDishId'] as String?;
            adminDishId ??= offer['_id'] as String?;

            if (adminDishId == null) continue;

            if (adminDishObj == null && offer['adminDish'] is Map) {
              adminDishObj = offer['adminDish'] as Map<String, dynamic>;
            }

            if (!groupedDishes.containsKey(adminDishId)) {
              groupedDishes[adminDishId] = {
                ...offer,
                'allOffers': [offer],
              };
            } else {
              groupedDishes[adminDishId]!['allOffers'] = [
                ...groupedDishes[adminDishId]!['allOffers'] as List,
                offer,
              ];

              final existingVariants =
                  groupedDishes[adminDishId]!['variants'] as List? ?? [];
              final newVariants = offer['variants'] as List? ?? [];
              if (newVariants.isNotEmpty) {
                groupedDishes[adminDishId]!['variants'] = [
                  ...existingVariants,
                  ...newVariants,
                ];
              }

              final currentImages =
                  groupedDishes[adminDishId]!['images'] as List? ?? [];
              final newImages = offer['images'] as List? ?? [];
              if (newImages.isNotEmpty && currentImages.isEmpty) {
                groupedDishes[adminDishId]!['images'] = newImages;
              }
            }
          }

          if (!mounted) return;
          setState(() {
            _dishes = groupedDishes.values.toList();
            _lastFetchTime = DateTime.now();
            _isLoading = false;
            _recomputeFilteredDishes();
          });
          // Precache first batch of dish images after list is built
          _precacheDishImages();
        }
      } else {
        if (!mounted) return;
        setState(() {
          _error = 'Failed to load menu items: ${response.statusCode}';
          _isLoading = false;
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Error loading menu: $e';
        _isLoading = false;
      });
    }
  }

  void _showItemActions(_DishCardData data, bool isRTL) {
    // Use precomputed values — no recomputation on sheet open
    final previewName = isRTL ? data.nameAr : data.nameEn;
    final previewImageUrl = data.imageUrl;
    final previewPriceStr = data.priceStr;

    // Use rawDish for edit/delete operations (needs full offer data)
    final allOffers = data.rawDish['allOffers'] as List? ?? [data.rawDish];
    final firstOffer = (allOffers.isNotEmpty ? allOffers.first : data.rawDish)
        as Map<String, dynamic>;
    final adminDish = firstOffer['adminDish'] ?? {};

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 8),
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFDDDDDD),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              // Preview header (image + name + price)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                child: Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: previewImageUrl != null
                          ? CachedNetworkImage(
                              imageUrl: previewImageUrl,
                              width: 56,
                              height: 56,
                              fit: BoxFit.cover,
                              errorWidget: (_, __, ___) => Container(
                                width: 56,
                                height: 56,
                                color: const Color(0xFFF5F5F5),
                                child: const Icon(Icons.restaurant, size: 24, color: Colors.grey),
                              ),
                            )
                          : Container(
                              width: 56,
                              height: 56,
                              color: const Color(0xFFF5F5F5),
                              child: const Icon(Icons.restaurant, size: 24, color: Colors.grey),
                            ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            previewName,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                              color: Color(0xFF2D2F2F),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            previewPriceStr,
                            style: const TextStyle(
                              color: Color(0xFF904800),
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              const Divider(height: 1),
              // View Dish (cook preview — view-only, no Add to Cart)
              ListTile(
                leading: const Icon(Icons.visibility_outlined, color: Color(0xFFFF7A00)),
                title: Text(
                  isRTL ? 'عرض الطبق' : 'View Dish',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  final adminDishId = (adminDish['_id'] ?? adminDish['id'])?.toString() ?? '';
                  final cookEntity = firstOffer['cook'];
                  final cookId = cookEntity is Map
                      ? ((cookEntity['_id'] ?? cookEntity['id'])?.toString())
                      : cookEntity?.toString();
                  if (adminDishId.isNotEmpty) {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => DishDetailScreen(
                          adminDishId: adminDishId,
                          dishName: previewName,
                          initialCookId: cookId,
                          viewOnly: true,
                          isCookPreview: true,
                        ),
                      ),
                    );
                  }
                },
              ),
              const Divider(height: 1),
              // Edit
              ListTile(
                leading: const Icon(Icons.edit_outlined, color: Color(0xFF904800)),
                title: Text(
                  isRTL ? 'تعديل' : 'Edit',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  _openOfferScreen(firstOffer, OfferMode.edit, isRTL);
                },
              ),
              const Divider(height: 1),
              // Delete
              ListTile(
                leading: const Icon(Icons.delete_outline, color: Colors.red),
                title: Text(
                  isRTL ? 'حذف' : 'Delete',
                  style: const TextStyle(
                    color: Colors.red,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  _confirmDelete(firstOffer, isRTL);
                },
              ),
              const Divider(height: 1),
              // Sell Similar
              ListTile(
                leading: const Icon(Icons.copy_outlined, color: Color(0xFF27AE60)),
                title: Text(
                  isRTL ? 'بيع مشابه' : 'Sell Similar',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  _openOfferScreen(firstOffer, OfferMode.sellSimilar, isRTL);
                },
              ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }

  Future<void> _openOfferScreen(
      Map<String, dynamic> offer, OfferMode mode, bool isRTL) async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => CreateOfferScreen(
          existingOffer: offer,
          mode: mode,
        ),
      ),
    );
    if (result == true && mounted) {
      _fetchDishes();
    }
  }

  void _confirmDelete(Map<String, dynamic> offer, bool isRTL) {
    final dishId = offer['_id'] as String?;
    if (dishId == null) return;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(isRTL ? 'تأكيد الحذف' : 'Confirm Delete'),
        content: Text(
          isRTL
              ? 'هل تريد حذف هذا الطبق من قائمتك؟ لن يؤثر هذا على الطلبات السابقة.'
              : 'Remove this dish from your menu? Past orders will not be affected.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(isRTL ? 'إلغاء' : 'Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              _deleteOffer(dishId, isRTL);
            },
            child: Text(
              isRTL ? 'حذف' : 'Delete',
              style: const TextStyle(color: Colors.red),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteOffer(String offerId, bool isRTL) async {
    final authProvider = context.read<AuthProvider>();
    final offerProvider = context.read<OfferProvider>();
    final token = authProvider.token;
    if (token == null) return;

    final success = await offerProvider.deleteOffer(token, offerId);

    if (!mounted) return;

    if (success) {
      await _fetchDishes();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(isRTL ? 'تم حذف الطبق' : 'Offer deleted'),
              backgroundColor: Colors.green),
        );
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(offerProvider.error ?? (isRTL ? 'فشل الحذف' : 'Failed to delete')),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isRTL = context.watch<LanguageProvider>().isArabic;

    if (_isLoading && _dishes.isEmpty) {
      return _buildMenuSkeleton();
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 48, color: Colors.grey[600]),
            const SizedBox(height: 16),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Text(
                _error!,
                style: TextStyle(color: Colors.grey[600]),
                textAlign: TextAlign.center,
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _fetchDishes,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_filteredDishes.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.restaurant_menu, size: 48, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              _searchQuery.isNotEmpty
                  ? (isRTL ? 'لا توجد نتائج' : 'No menu items found')
                  : (isRTL ? 'لا توجد أطباق بعد' : 'No menu items yet'),
              style: TextStyle(fontSize: 16, color: Colors.grey[600]),
            ),
            if (_searchQuery.isEmpty) ...[
              const SizedBox(height: 8),
              Text(
                isRTL
                    ? 'أضف طبقك الأول للبدء في البيع'
                    : 'Add your first dish to start selling',
                style: TextStyle(fontSize: 14, color: Colors.grey[500]),
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: () => _openOfferScreen({}, OfferMode.create, isRTL),
                icon: const Icon(Icons.add),
                label: Text(isRTL ? 'أضف طبقك الأول' : 'Add Your First Dish'),
              ),
            ],
          ],
        ),
      );
    }

    return Column(
      children: [
        _buildMenuHeader(isRTL),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _fetchDishes,
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
              itemCount: _cachedFilteredDishes.length,
              itemBuilder: (context, index) {
                final data = _cachedDisplayData[index];
                return RepaintBoundary(
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: GestureDetector(
                      onTap: () => _showItemActions(data, isRTL),
                      child: _buildDishCard(data, isRTL),
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildMenuHeader(bool isRTL) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
        // Search & Refine row
        Row(
          children: [
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFEBEBEB)),
                ),
                child: TextField(
                  controller: _searchController,
                  onChanged: (value) => setState(() {
                    _searchQuery = value;
                    _recomputeFilteredDishes();
                  }),
                  decoration: InputDecoration(
                    hintText: isRTL ? 'ابحث في القائمة...' : 'Search menu items...',
                    hintStyle: const TextStyle(color: Color(0xFF969494), fontSize: 14),
                    prefixIcon: const Icon(Icons.search, color: Color(0xFF969494), size: 20),
                    filled: true,
                    fillColor: const Color(0xFFE7E7E7),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: () => _showRefineSheet(context),
              child: Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: const Color(0xFFFF7A00),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.tune, color: Colors.white, size: 24),
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),
        // Menu title & + New button
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isRTL ? 'القائمة' : 'Menu',
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF2D2F2F),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  isRTL
                      ? 'إدارة قائمتك وإنشاء أطباق جديدة 📋'
                      : 'Manage your menu and Create new dishes 📋',
                  style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                ),
              ],
            ),
            GestureDetector(
              onTap: () => _openOfferScreen({}, OfferMode.create, isRTL),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFF27AE60),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.add, color: Colors.white, size: 18),
                    const SizedBox(width: 6),
                    Text(
                      isRTL ? 'جديد' : 'New',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),
      ],
      ),
    );
  }

  Widget _buildDishCard(_DishCardData data, bool isRTL) {
    final dishName = isRTL ? data.nameAr : data.nameEn;

    return Card(
      margin: EdgeInsets.zero,
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFEBEBEB), width: 1),
      ),
      clipBehavior: Clip.antiAlias,
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Thumbnail
            Container(
              width: 68,
              height: 68,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFEBEBEB), width: 1),
              ),
              clipBehavior: Clip.antiAlias,
              child: data.imageUrl != null && data.imageUrl!.isNotEmpty
                  ? CachedNetworkImage(
                      imageUrl: data.imageUrl!,
                      width: 68,
                      height: 68,
                      fit: BoxFit.cover,
                      placeholder: (context, url) => Container(
                        color: const Color(0xFFF5F5F5),
                        child: const Center(
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Color(0xFF904800),
                          ),
                        ),
                      ),
                      errorWidget: (context, url, error) => Container(
                        color: const Color(0xFFF5F5F5),
                        child: Icon(Icons.restaurant, size: 24, color: Colors.grey[400]),
                      ),
                    )
                  : Container(
                      color: const Color(0xFFF5F5F5),
                      child: Icon(Icons.restaurant, size: 24, color: Colors.grey[400]),
                    ),
            ),

            const SizedBox(width: 12),

            // Details
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    dishName,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF2D2F2F),
                    ),
                    overflow: TextOverflow.ellipsis,
                    maxLines: 2,
                  ),
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 8,
                    runSpacing: 2,
                    children: [
                      Text(
                        data.priceStr,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFFFF7A00),
                        ),
                      ),
                      if (data.showDeliveryFee) ...[
                        Icon(Icons.local_shipping, size: 11, color: Colors.grey[600]),
                        Text(
                          data.deliveryFeeStr,
                          style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    data.stockStr,
                    style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                  ),
                ],
              ),
            ),

            const SizedBox(width: 12),

            AppToggle(
              value: data.isActive,
              onChanged: (_) => _toggleOfferActive(data.rawDish),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _toggleOfferActive(Map<String, dynamic> dish) async {
    final dishId = dish['_id'] as String?;
    if (dishId == null) return;

    final authProvider = context.read<AuthProvider>();
    final token = authProvider.token;
    if (token == null) return;

    final bool currentlyActive = dish['isActive'] as bool? ?? true;
    final bool newActive = !currentlyActive;

    // Optimistic UI update
    setState(() {
      final idx = _dishes.indexWhere((d) => d['_id'] == dishId);
      if (idx != -1) _dishes[idx]['isActive'] = newActive;
      _recomputeFilteredDishes();
    });

    try {
      // Backend route: PUT /dish-offers/:id (uses multer multipart).
      // Send isActive as a multipart text field — Joi.boolean() converts 'true'/'false' strings.
      final request = http.MultipartRequest(
        'PUT',
        Uri.parse('${ApiConfig.baseUrl}/dish-offers/$dishId'),
      );
      request.headers['Authorization'] = 'Bearer $token';
      request.fields['isActive'] = newActive.toString();

      final streamed = await request.send();
      final response = await http.Response.fromStream(streamed);

      if (!mounted) return;

      if (response.statusCode != 200) {
        // Revert on failure
        setState(() {
          final idx = _dishes.indexWhere((d) => d['_id'] == dishId);
          if (idx != -1) _dishes[idx]['isActive'] = currentlyActive;
          _recomputeFilteredDishes();
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update offer visibility (${response.statusCode})')),
        );
      }
    } catch (e) {
      if (!mounted) return;
      // Revert on error
      setState(() {
        final idx = _dishes.indexWhere((d) => d['_id'] == dishId);
        if (idx != -1) _dishes[idx]['isActive'] = currentlyActive;
        _recomputeFilteredDishes();
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    }
  }

  Future<void> _toggleStock(Map<String, dynamic> dish, int stock) async {
    final dishId = dish['_id'] as String?;
    if (dishId == null) return;

    final authProvider = context.read<AuthProvider>();
    final token = authProvider.token;
    if (token == null) return;

    int newStock;
    if (stock > 0) {
      _previousStocks[dishId] = stock;
      newStock = 0;
    } else {
      if (!_previousStocks.containsKey(dishId)) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('No previous stock value available')),
          );
        }
        return;
      }
      newStock = _previousStocks[dishId]!;
    }

    try {
      final response = await http.patch(
        Uri.parse('${ApiConfig.baseUrl}/dish-offers/$dishId/stock'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode({'stock': newStock}),
      );

      if (!mounted) return;

      if (response.statusCode == 200) {
        setState(() {
          final idx = _dishes.indexWhere((d) => d['_id'] == dishId);
          if (idx != -1) {
            _dishes[idx]['stock'] = newStock;
          }
          _recomputeFilteredDishes();
        });
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to update availability')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  void _precacheDishImages() {
    for (final data in _cachedDisplayData.take(8)) {
      final url = data.imageUrl;
      if (url == null || url.isEmpty) continue;
      precacheImage(CachedNetworkImageProvider(url), context);
    }
  }

  Widget _buildMenuSkeleton() {
    return _SkeletonPulse(
      builder: (color) {
        Widget box(double w, double h, {double r = 8}) => Container(
          width: w,
          height: h,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(r),
          ),
        );
        Widget fakeCard() => Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            children: [
              box(72, 72, r: 12),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    box(140, 14),
                    const SizedBox(height: 8),
                    box(90, 12),
                    const SizedBox(height: 6),
                    box(60, 12),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              box(36, 36, r: 18),
            ],
          ),
        );
        return ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
          physics: const NeverScrollableScrollPhysics(),
          children: [fakeCard(), fakeCard(), fakeCard(), fakeCard(), fakeCard()],
        );
      },
    );
  }
}

class _SkeletonPulse extends StatefulWidget {
  final Widget Function(Color color) builder;
  const _SkeletonPulse({required this.builder});

  @override
  State<_SkeletonPulse> createState() => _SkeletonPulseState();
}

class _SkeletonPulseState extends State<_SkeletonPulse>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (_, __) {
        final color = Color.lerp(
          const Color(0xFFEEEEEE),
          const Color(0xFFD4D4D4),
          _ctrl.value,
        )!;
        return widget.builder(color);
      },
    );
  }
}
