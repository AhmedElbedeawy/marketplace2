import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/language_provider.dart';
import '../../config/api_config.dart';

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
  int? _expandedCardIndex; // Track which card is expanded
  final Map<String, int> _previousStocks = {}; // Track previous stock values for toggle

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _fetchDishes();
  }

  // Filter dishes based on search query
  List<Map<String, dynamic>> get _filteredDishes {
    if (_searchQuery.isEmpty) return _dishes;
    
    return _dishes.where((dish) {
      // Grouped dish has adminDish object with nameEn/nameAr/category
      final adminDish = dish['adminDish'] as Map<String, dynamic>?;
      final nameEn = (adminDish?['nameEn'] ?? '').toString().toLowerCase();
      final nameAr = (adminDish?['nameAr'] ?? '').toString().toLowerCase();
      final category = (adminDish?['category']?['nameEn'] ?? '').toString().toLowerCase();
      
      final query = _searchQuery.toLowerCase();
      return nameEn.contains(query) || nameAr.contains(query) || category.contains(query);
    }).toList();
  }

  Future<void> _fetchDishes() async {
    final authProvider = context.read<AuthProvider>();
    final token = authProvider.token;

    if (token == null) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // Fetch cook's dish offers (includes all variants/portions)
      // Use ?active=true to match web app behavior - only show active offers
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/dish-offers/my?active=true'),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        
        if (data is List) {
          final List<Map<String, dynamic>> offers = data.cast<Map<String, dynamic>>();
          
          print('📡 [MENU] Received ${offers.length} offers from API');
          
          // Debug: print each offer's adminDish info
          for (var i = 0; i < offers.length; i++) {
            final offer = offers[i];
            final adminDish = offer['adminDish'];
            final adminDishId = offer['adminDishId'];
            final dishName = adminDish?['nameEn'] ?? 'UNKNOWN';
            print('  Offer $i: adminDish=${adminDish?.toString().substring(0, 50)}..., adminDishId=$adminDishId, name=$dishName');
          }
          
          // GROUP offers by adminDishId to match web app behavior
          // Multiple variants/portions of same dish → single grouped row
          final Map<String, Map<String, dynamic>> groupedDishes = {};
          
          for (final offer in offers) {
            // Try multiple ways to get adminDishId
            String? adminDishId;
            Map<String, dynamic>? adminDishObj;
            
            // Option 1: adminDish is populated object with _id
            if (offer['adminDish'] is Map) {
              adminDishObj = offer['adminDish'] as Map<String, dynamic>;
              adminDishId = adminDishObj['_id'] as String?;
            }
            
            // Option 2: adminDishId field directly
            adminDishId ??= offer['adminDishId'] as String?;
            
            // Option 3: Try to get from _id field
            adminDishId ??= offer['_id'] as String?;
            
            if (adminDishId == null) {
              print('⚠️ [MENU] Skipping offer without adminDishId: ${offer['_id']}');
              continue; // Skip offers without admin dish
            }
            
            // Get adminDish info for grouping key and name
            if (adminDishObj == null && offer['adminDish'] is Map) {
              adminDishObj = offer['adminDish'] as Map<String, dynamic>;
            }
            
            final String displayName = adminDishObj?['nameEn'] ?? adminDishObj?['nameAr'] ?? 'Unknown';
            print('🔑 [MENU] Grouping by adminDishId: $adminDishId -> $displayName');
            
            if (!groupedDishes.containsKey(adminDishId)) {
              // First offer for this admin dish - use as base
              groupedDishes[adminDishId] = {
                ...offer,
                'allOffers': [offer], // Collect all offers for this dish
              };
              print('  ✅ Created new group for: $displayName');
            } else {
              // Additional offer/variant for same admin dish
              groupedDishes[adminDishId]!['allOffers'] = [
                ...groupedDishes[adminDishId]!['allOffers'] as List, 
                offer
              ];
              
              // Merge variants from this offer
              final existingVariants = groupedDishes[adminDishId]!['variants'] as List? ?? [];
              final newVariants = offer['variants'] as List? ?? [];
              if (newVariants.isNotEmpty) {
                groupedDishes[adminDishId]!['variants'] = [
                  ...existingVariants,
                  ...newVariants
                ];
              }
              print('  ➕ Added variant to existing group: $displayName (now ${(groupedDishes[adminDishId]!['allOffers'] as List).length} offers)');
            }
          }
          
          print('📊 [MENU] Final grouped dishes: ${groupedDishes.length} unique dishes');
          
          setState(() {
            _dishes = groupedDishes.values.toList();
          });
        }
      } else {
        setState(() {
          _error = 'Failed to load menu items: ${response.statusCode}';
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Error loading menu: $e';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    // Loading state
    if (_isLoading && _dishes.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    // Error state
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

    // Empty state
    if (_filteredDishes.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.restaurant_menu, size: 48, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              _searchQuery.isNotEmpty ? 'No menu items found' : 'No menu items yet',
              style: TextStyle(fontSize: 16, color: Colors.grey[600]),
            ),
            if (_searchQuery.isEmpty) ...[
              const SizedBox(height: 8),
              Text(
                'Add your first dish to start selling',
                style: TextStyle(fontSize: 14, color: Colors.grey[500]),
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: () {
                  // TODO: Navigate to add dish screen
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Add Dish - Coming Soon')),
                  );
                },
                icon: const Icon(Icons.add),
                label: const Text('Add Your First Dish'),
              ),
            ],
          ],
        ),
      );
    }

    // Display dishes list
    return RefreshIndicator(
      onRefresh: _fetchDishes,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Search & Refine row
          Row(
            children: [
              // Search bar
              Expanded(
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFEBEBEB)),
                  ),
                  child: TextField(
                    controller: _searchController,
                    onChanged: (value) {
                      setState(() => _searchQuery = value);
                    },
                    decoration: InputDecoration(
                      hintText: 'Search menu items...',
                      hintStyle: TextStyle(color: Colors.grey[400], fontSize: 13),
                      prefixIcon: const Icon(Icons.search, color: Color(0xFF904800), size: 20),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                  ),
                ),
              ),
              
              const SizedBox(width: 8),
              
              // Refine button
              GestureDetector(
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Filter options coming soon')),
                  );
                },
                child: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: const Color(0xFFFCD535),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.tune, color: Color(0xFF2D2F2F), size: 24),
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 20),
          
          // Menu title & Add Dish button
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              // Title and subtitle
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Menu',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF2D2F2F),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Manage your menu and Create new dishes 📋',
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
              
              // + Dish button
              GestureDetector(
                onTap: () {
                  // TODO: Navigate to create dish screen
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Create Dish - Coming Soon')),
                  );
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF27AE60),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.add, color: Colors.white, size: 18),
                      SizedBox(width: 6),
                      Text(
                        'Dish',
                        style: TextStyle(
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
          
          // Dishes list
          ..._filteredDishes.asMap().entries.map((entry) {
            final index = entry.key;
            final dish = entry.value;
            return GestureDetector(
              onTap: () {
                setState(() {
                  _expandedCardIndex = _expandedCardIndex == index ? null : index;
                });
              },
              child: _buildDishCard(dish, index),
            );
          }).toList(),
        ],
      ),
    );
  }

  Widget _buildDishCard(Map<String, dynamic> dish, int index) {
    final bool isExpanded = _expandedCardIndex == index;
    
    // Extract dish data from grouped offer structure
    // dish now represents a GROUPED admin dish with all its offers
    final adminDish = dish['adminDish'] ?? {};
    final String? imageUrl = dish['images']?.isNotEmpty == true 
        ? dish['images'][0] 
        : (adminDish['imageUrl']?.isNotEmpty == true ? adminDish['imageUrl'] : null);
    final String dishName = Localizations.localeOf(context).languageCode == 'ar' 
        ? (adminDish['nameAr'] ?? adminDish['nameEn'] ?? 'Unknown Dish')
        : (adminDish['nameEn'] ?? adminDish['nameAr'] ?? 'Unknown Dish');
    
    // Use first variant's price/stock as display values (or merge logic can be added later)
    final allVariants = dish['variants'] as List? ?? [];
    final double price = allVariants.isNotEmpty 
        ? (allVariants.first['price'] ?? 0.0)
        : (dish['price'] ?? 0.0);
    final int stock = allVariants.isNotEmpty 
        ? (allVariants.first['stock'] ?? 0)
        : (dish['stock'] ?? 0);
    final double deliveryFee = dish['deliveryFee'] ?? 0.0;
    
    // All variants are available for future use in card expansion or edit flow
    // final hasVariants = allVariants.length > 1;
    
    return Card(
      margin: EdgeInsets.zero,
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFEBEBEB), width: 1),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Left: Small square thumbnail (56x56)
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFEBEBEB), width: 1),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: imageUrl != null
                      ? Image.network(
                          imageUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) {
                            debugPrint('Image blocked by CORS (expected in local preview): $imageUrl');
                            return Container(
                              color: const Color(0xFFF5F5F5),
                              child: Icon(Icons.restaurant, size: 20, color: Colors.grey[400]),
                            );
                          },
                          loadingBuilder: (context, child, loadingProgress) {
                            if (loadingProgress == null) return child;
                            return Container(
                              color: const Color(0xFFF5F5F5),
                              child: Center(
                                child: CircularProgressIndicator(
                                  value: loadingProgress.expectedTotalBytes != null
                                      ? loadingProgress.cumulativeBytesLoaded / loadingProgress.expectedTotalBytes!
                                      : null,
                                  strokeWidth: 2,
                                  color: Colors.grey[300],
                                ),
                              ),
                            );
                          },
                        )
                      : Container(
                          color: const Color(0xFFF5F5F5),
                          child: Icon(Icons.restaurant, size: 20, color: Colors.grey[400]),
                        ),
                ),
                
                const SizedBox(width: 16),
                
                // Middle: Details column
                Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Dish name
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
                      
                      const SizedBox(height: 6),
                      
                      // Price and meta info row
                      Wrap(
                        spacing: 8,
                        runSpacing: 4,
                        children: [
                          // Price
                          Text(
                            'SAR ${price.toStringAsFixed(2)}',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF904800),
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                          
                          // Delivery fee (only if > 0)
                          if (deliveryFee > 0) ...[
                            Icon(Icons.local_shipping, size: 11, color: Colors.grey[600]),
                            Text(
                              'SAR ${deliveryFee.toStringAsFixed(2)}',
                              style: TextStyle(
                                fontSize: 11,
                                color: Colors.grey[600],
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                          
                          // Stock count
                          Text(
                            '$stock left',
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.grey[600],
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                      
                      const SizedBox(height: 8),
                      
                      // Status badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: stock > 0 ? const Color(0xFFF0FDF4) : const Color(0xFFF5F5F5),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          stock > 0 ? 'AVAILABLE' : 'OUT OF STOCK',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            color: stock > 0 ? const Color(0xFF16A34A) : Colors.grey[600],
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                
                const SizedBox(width: 12),
                
                // Right: Toggle switch (moved next to status)
                GestureDetector(
                  onTap: () async {
                    final dishId = dish['_id'];
                    if (dishId == null) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Invalid dish ID')),
                      );
                      return;
                    }
                                  
                    try {
                      final authProvider = context.read<AuthProvider>();
                      final token = authProvider.token;
                                    
                      if (token == null) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Authentication required')),
                        );
                        return;
                      }
                                    
                      // Determine new stock value
                      int newStock;
                      if (stock > 0) {
                        // Turning OFF: store current stock and set to 0
                        _previousStocks[dishId] = stock;
                        newStock = 0;
                      } else {
                        // Turning ON: restore previous stock if exists
                        if (_previousStocks.containsKey(dishId)) {
                          newStock = _previousStocks[dishId]!;
                        } else {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('No previous stock value available')),
                          );
                          return;
                        }
                      }
                                    
                      // Call PATCH API to update stock
                      final response = await http.patch(
                        Uri.parse('${ApiConfig.baseUrl}/dish-offers/$dishId/stock'),
                        headers: {
                          'Authorization': 'Bearer $token',
                          'Content-Type': 'application/json',
                        },
                        body: json.encode({'stock': newStock}),
                      );
                                    
                      if (response.statusCode == 200) {
                        // Update local state
                        setState(() {
                          final index = _dishes.indexWhere((d) => d['_id'] == dishId);
                          if (index != -1) {
                            _dishes[index]['stock'] = newStock;
                          }
                        });
                                      
                        if (!mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(newStock > 0 ? 'Dish is now available' : 'Dish is out of stock'),
                          ),
                        );
                      } else {
                        if (!mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Failed to update availability')),
                        );
                      }
                    } catch (e) {
                      debugPrint('Toggle error: $e');
                      if (!mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Error: $e')),
                      );
                    }
                  },
                  child: Container(
                    width: 40,
                    height: 20,
                    decoration: BoxDecoration(
                      color: stock > 0 ? const Color(0xFF27AE60).withOpacity(0.2) : Colors.grey[300],
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Stack(
                      children: [
                        Positioned(
                          left: stock > 0 ? 18 : 2,
                          top: 2,
                          child: Container(
                            width: 16,
                            height: 16,
                            decoration: BoxDecoration(
                              color: stock > 0 ? const Color(0xFF27AE60) : Colors.grey[500],
                              shape: BoxShape.circle,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (isExpanded)
            _buildExpandedSectionContent(),
        ],
      ),
    );
  }

  Widget _buildExpandedSectionContent() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        color: Color(0xFFF9FAFB),
        border: Border(
          top: BorderSide(color: Color(0xFFEBEBEB), width: 1),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Dish details placeholder
          Text(
            'Edit dish details, pricing, and availability settings.',
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 12),
          
          // Edit link
          InkWell(
            onTap: () {
              // Navigate to edit dish page
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Edit dish - Coming soon')),
              );
            },
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.edit, size: 16, color: Color(0xFF904800)),
                SizedBox(width: 6),
                Text(
                  'Edit',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF904800),
                    decoration: TextDecoration.underline,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
