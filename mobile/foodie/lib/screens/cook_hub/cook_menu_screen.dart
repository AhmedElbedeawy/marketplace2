import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import '../../config/theme.dart';
import '../../config/api_config.dart';
import '../../providers/language_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/offer_provider.dart';
import 'create_offer_screen.dart';
import '../menu/dish_detail_screen.dart';

class CookMenuScreen extends StatefulWidget {
  const CookMenuScreen({Key? key}) : super(key: key);

  @override
  State<CookMenuScreen> createState() => _CookMenuScreenState();
}

class _CookMenuScreenState extends State<CookMenuScreen> {
  List<dynamic> _menuItems = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadMenuItems();
  }

  Future<void> _loadMenuItems() async {
    final authProvider = context.read<AuthProvider>();
    final token = authProvider.token;

    if (token == null) {
      setState(() {
        _error = 'Not authenticated';
        _isLoading = false;
      });
      return;
    }

    try {
      final response = await http.get(
        Uri.parse(ApiConfig.cookMenu),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final offers = data['offers'] ?? data ?? [];
        setState(() {
          _menuItems = List<dynamic>.from(offers);
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = 'Failed to load menu items';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Error loading menu: $e';
        _isLoading = false;
      });
    }
  }

  void _showItemActions(Map<String, dynamic> item) {
    final isRTL = context.read<LanguageProvider>().isArabic;

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.network(
                      _getImageUrl(item),
                      width: 60,
                      height: 60,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        width: 60,
                        height: 60,
                        color: Colors.grey.shade200,
                        child: const Icon(Icons.restaurant),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _getItemTitle(item),
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          '${item['price'] ?? 0} SAR',
                          style: const TextStyle(
                            color: AppTheme.accentColor,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            ListTile(
              leading: const Icon(Icons.visibility_outlined),
              title: Text(isRTL ? 'عرض الطبق' : 'View Dish'),
              onTap: () {
                Navigator.pop(context);
                final adminDish = item['adminDish'];
                final adminDishId = adminDish?['_id']?.toString() ?? '';
                final dishName = _getItemTitle(item);
                if (adminDishId.isEmpty) return;
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => DishDetailScreen(
                      adminDishId: adminDishId,
                      dishName: dishName,
                      isCookPreview: true,
                    ),
                  ),
                );
              },
            ),
            ListTile(
              leading: const Icon(Icons.inventory),
              title: Text(isRTL ? 'تعديل المخزون' : 'Edit Stock'),
              onTap: () {
                Navigator.pop(context);
                _showStockEditSheet(item);
              },
            ),
            ListTile(
              leading: const Icon(Icons.edit),
              title: Text(isRTL ? 'تعديل' : 'Edit'),
              onTap: () {
                Navigator.pop(context);
                _navigateToEdit(item);
              },
            ),
            ListTile(
              leading: Icon(
                item['isActive'] == true
                    ? Icons.pause_circle_outline
                    : Icons.play_circle_outline,
              ),
              title: Text(
                item['isActive'] == true
                    ? (isRTL ? 'إيقاف مؤقت' : 'Pause')
                    : (isRTL ? 'تفعيل' : 'Activate'),
              ),
              onTap: () {
                Navigator.pop(context);
                _toggleOfferActive(item);
              },
            ),
            ListTile(
              leading: const Icon(Icons.delete, color: Colors.red),
              title: Text(
                isRTL ? 'حذف' : 'Delete',
                style: const TextStyle(color: Colors.red),
              ),
              onTap: () {
                Navigator.pop(context);
                _confirmDelete(item);
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  void _navigateToEdit(Map<String, dynamic> item) {
    final offerId = item['_id'];
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => CreateOfferScreen(offerId: offerId),
      ),
    ).then((result) {
      if (result == true) {
        _loadMenuItems();
      }
    });
  }

  void _showStockEditSheet(Map<String, dynamic> item) {
    final isRTL = context.read<LanguageProvider>().isArabic;
    final currentStock = item['stock'] ?? 0;
    final stockController =
        TextEditingController(text: currentStock.toString());

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
          left: 16,
          right: 16,
          top: 16,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              isRTL ? 'تعديل المخزون' : 'Edit Stock',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: stockController,
              keyboardType: TextInputType.number,
              autofocus: true,
              decoration: InputDecoration(
                labelText: isRTL ? 'الكمية المتوفرة' : 'Available Quantity',
                filled: true,
                fillColor: Colors.grey.shade100,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    child: Text(isRTL ? 'إلغاء' : 'Cancel'),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () async {
                      Navigator.pop(context);
                      await _updateStock(
                          item, int.tryParse(stockController.text) ?? 0);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.accentColor,
                    ),
                    child: Text(
                      isRTL ? 'حفظ' : 'Save',
                      style: const TextStyle(color: Colors.white),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Future<void> _updateStock(Map<String, dynamic> item, int newStock) async {
    final authProvider = context.read<AuthProvider>();
    final token = authProvider.token;
    if (token == null) return;

    final offerId = item['_id'];

    final offerProvider = context.read<OfferProvider>();
    final success = await offerProvider.updateStock(token, offerId, newStock);

    if (success) {
      await _loadMenuItems();
      if (mounted) {
        final isRTL = context.read<LanguageProvider>().isArabic;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(isRTL ? 'تم تحديث المخزون' : 'Stock updated'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(offerProvider.error ?? 'Failed to update stock'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _toggleOfferActive(Map<String, dynamic> item) async {
    final authProvider = context.read<AuthProvider>();
    final token = authProvider.token;
    if (token == null) return;

    final offerId = item['_id'];
    final currentActive = item['isActive'] ?? true;
    final newActive = !currentActive;

    final offerProvider = context.read<OfferProvider>();
    final success = await offerProvider.toggleActive(token, offerId);

    if (success) {
      // Refresh the menu
      await _loadMenuItems();
      if (mounted) {
        final isRTL = context.read<LanguageProvider>().isArabic;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(newActive
                ? (isRTL ? 'تم تفعيل العرض' : 'Offer activated')
                : (isRTL ? 'تم إيقاف العرض' : 'Offer paused')),
            backgroundColor: Colors.green,
          ),
        );
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(offerProvider.error ?? 'Failed to update offer'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _confirmDelete(Map<String, dynamic> item) {
    final isRTL = context.read<LanguageProvider>().isArabic;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(isRTL ? 'حذف العرض' : 'Delete Offer'),
        content: Text(isRTL
            ? 'هل أنت متأكد من حذف هذا العرض؟'
            : 'Are you sure you want to delete this offer?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(isRTL ? 'إلغاء' : 'Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _deleteOffer(item);
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

  Future<void> _deleteOffer(Map<String, dynamic> item) async {
    final authProvider = context.read<AuthProvider>();
    final token = authProvider.token;
    if (token == null) return;

    final offerId = item['_id'];

    final offerProvider = context.read<OfferProvider>();
    final success = await offerProvider.deleteOffer(token, offerId);

    if (success) {
      // Refresh the menu
      await _loadMenuItems();
      if (mounted) {
        final isRTL = context.read<LanguageProvider>().isArabic;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(isRTL ? 'تم حذف العرض' : 'Offer deleted'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(offerProvider.error ?? 'Failed to delete offer'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  String _getImageUrl(Map<String, dynamic> item) {
    final images = item['images'];
    if (images != null && images is List && images.isNotEmpty) {
      return images[0].toString().startsWith('http')
          ? images[0]
          : '${ApiConfig.staticBaseUrl}${images[0]}';
    }
    final adminDish = item['adminDish'];
    if (adminDish != null && adminDish['imageUrl'] != null) {
      return adminDish['imageUrl'].toString().startsWith('http')
          ? adminDish['imageUrl']
          : '${ApiConfig.staticBaseUrl}${adminDish['imageUrl']}';
    }
    return '';
  }

  String _getItemTitle(Map<String, dynamic> item) {
    final isRTL = context.read<LanguageProvider>().isArabic;
    final adminDish = item['adminDish'];
    if (adminDish != null) {
      return isRTL
          ? (adminDish['nameAr'] ?? adminDish['nameEn'] ?? 'Untitled')
          : (adminDish['nameEn'] ?? adminDish['nameAr'] ?? 'Untitled');
    }
    return item['name'] ?? 'Untitled';
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: Text(isRTL ? 'قائمة الطعام' : 'My Menu'),
        backgroundColor: Colors.white,
        foregroundColor: AppTheme.textPrimary,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadMenuItems,
          ),
        ],
      ),
      body: _buildBody(isRTL),
      floatingActionButton: FloatingActionButton(
        onPressed: _navigateToCreate,
        backgroundColor: AppTheme.accentColor,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  void _navigateToCreate() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const CreateOfferScreen()),
    );

    if (result == true) {
      // Refresh menu after creating offer
      await _loadMenuItems();
    }
  }

  Widget _buildBody(bool isRTL) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 48, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            Text(_error!),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadMenuItems,
              child: Text(isRTL ? 'إعادة المحاولة' : 'Retry'),
            ),
          ],
        ),
      );
    }

    if (_menuItems.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.restaurant_menu, size: 64, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            Text(
              isRTL ? 'قائمة الطعام فارغة' : 'No menu items yet',
              style: const TextStyle(
                fontSize: 18,
                color: Colors.grey,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              isRTL
                  ? 'أضف الأطباق من الإدارة لإظهارها هنا'
                  : 'Add dishes from admin to show here',
              style: const TextStyle(color: Colors.grey),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadMenuItems,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _menuItems.length,
        itemBuilder: (context, index) {
          final item = _menuItems[index];
          return _buildMenuItemCard(item, isRTL);
        },
      ),
    );
  }

  Widget _buildMenuItemCard(Map<String, dynamic> item, bool isRTL) {
    final isActive = item['isActive'] ?? true;
    final price = item['price'] ?? 0;
    final discount = item['discount'] ?? 0;
    final finalPrice = discount > 0 ? price - (price * discount / 100) : price;

    return GestureDetector(
      onTap: () => _showItemActions(item),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(12)),
              child: Stack(
                children: [
                  Image.network(
                    _getImageUrl(item),
                    height: 150,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      height: 150,
                      color: Colors.grey.shade200,
                      child: const Center(
                        child: Icon(Icons.restaurant,
                            size: 48, color: Colors.grey),
                      ),
                    ),
                  ),
                  if (!isActive)
                    Container(
                      height: 150,
                      color: Colors.black.withValues(alpha: 0.5),
                      child: const Center(
                        child: Text(
                          'PAUSED',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 18,
                          ),
                        ),
                      ),
                    ),
                  if (discount > 0)
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.red,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          '-$discount%',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          _getItemTitle(item),
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (!isActive)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade200,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            isRTL ? 'متوقف' : 'Paused',
                            style: TextStyle(
                              fontSize: 10,
                              color: Colors.grey.shade700,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      if (discount > 0) ...[
                        Text(
                          '${price.toStringAsFixed(2)} SAR',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey.shade500,
                            decoration: TextDecoration.lineThrough,
                          ),
                        ),
                        const SizedBox(width: 8),
                      ],
                      Text(
                        '${finalPrice.toStringAsFixed(2)} SAR',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color:
                              discount > 0 ? Colors.red : AppTheme.accentColor,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.inventory_2_outlined,
                          size: 14, color: Colors.grey),
                      const SizedBox(width: 4),
                      Text(
                        '${item['stock'] ?? 0} ${isRTL ? 'متوفر' : 'in stock'}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.grey,
                        ),
                      ),
                      const Spacer(),
                      const Icon(Icons.more_vert, color: Colors.grey),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
