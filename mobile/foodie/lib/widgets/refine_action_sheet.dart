import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/filter_provider.dart';
import '../providers/country_provider.dart';

class RefineActionSheet extends StatefulWidget {
  final Function()? onApply;
  final List<String>? categories;

  const RefineActionSheet({
    Key? key,
    this.onApply,
    this.categories,
  }) : super(key: key);

  @override
  State<RefineActionSheet> createState() => _RefineActionSheetState();
}

class _RefineActionSheetState extends State<RefineActionSheet> {
  late TextEditingController _cookNameController;
  late double _tempMinPrice;
  late double _tempMaxPrice;
  late double _tempDistance;
  late String _tempOrderType;
  late String _tempDeliveryTime;
  late String _tempSortBy;
  late bool _tempShowPopularCooks;
  late bool _tempShowPopularDishes;
  late List<String> _tempSelectedCategories;

  @override
  void initState() {
    super.initState();
    final filterProvider = Provider.of<FilterProvider>(context, listen: false);
    _cookNameController = TextEditingController(text: filterProvider.cookNameFilter);
    _tempMinPrice = filterProvider.minPrice;
    _tempMaxPrice = filterProvider.maxPrice;
    _tempDistance = filterProvider.distance;
    _tempOrderType = filterProvider.orderType;
    _tempDeliveryTime = filterProvider.deliveryTime;
    _tempSortBy = filterProvider.sortBy;
    _tempShowPopularCooks = filterProvider.showOnlyPopularCooks;
    _tempShowPopularDishes = filterProvider.showOnlyPopularDishes;
    _tempSelectedCategories = List.from(filterProvider.selectedCategories);
  }

  @override
  void dispose() {
    _cookNameController.dispose();
    super.dispose();
  }

  void _applyFilters() {
    final filterProvider = Provider.of<FilterProvider>(context, listen: false);
    filterProvider.setPriceRange(_tempMinPrice, _tempMaxPrice);
    filterProvider.setCookNameFilter(_cookNameController.text);
    filterProvider.setOrderType(_tempOrderType);
    filterProvider.setDeliveryTime(_tempDeliveryTime);
    filterProvider.setDistance(_tempDistance);
    filterProvider.setShowOnlyPopularCooks(_tempShowPopularCooks);
    filterProvider.setShowOnlyPopularDishes(_tempShowPopularDishes);
    filterProvider.setSortBy(_tempSortBy);

    // Update categories
    for (final String category in _tempSelectedCategories) {
      if (!filterProvider.isCategorySelected(category)) {
        filterProvider.toggleCategory(category);
      }
    }
    for (final String category in filterProvider.selectedCategories) {
      if (!_tempSelectedCategories.contains(category)) {
        filterProvider.toggleCategory(category);
      }
    }

    Navigator.pop(context);
    if (widget.onApply != null) {
      widget.onApply!();
    }
  }

  void _clearAllFilters() {
    setState(() {
      _tempMinPrice = 0;
      _tempMaxPrice = 500;
      _tempDistance = 30;
      _tempOrderType = 'All';
      _tempDeliveryTime = '60';
      _tempSortBy = 'Recommended';
      _tempShowPopularCooks = false;
      _tempShowPopularDishes = false;
      _tempSelectedCategories.clear();
      _cookNameController.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    final isRTL = Directionality.of(context) == TextDirection.rtl;
    final categories = widget.categories ?? [];
    final screenHeight = MediaQuery.of(context).size.height;
    final sheetHeight = screenHeight * 0.88;
    const spacingValue = 6.0; // Compressed spacing

    return SizedBox(
      height: sheetHeight,
      child: Container(
        decoration: const BoxDecoration(
          color: Color(0xFFFFFFFF),
          borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
        ),
        child: Padding(
          padding: const EdgeInsets.only(
            left: 20,
            right: 20,
            top: 12,
            bottom: 12,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.max,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    isRTL ? 'تحسين' : 'Refine',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF40403F),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Color(0xFF40403F)),
                    onPressed: () => Navigator.pop(context),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
              const SizedBox(height: spacingValue),

              // Price Range Filter
              Text(
                isRTL ? 'نطاق السعر' : 'Price Range',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF40403F),
                ),
              ),
              const SizedBox(height: spacingValue),
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Min',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w400,
                            color: Color(0xFF40403F),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Container(
                          height: 44,
                          decoration: BoxDecoration(
                            border: Border.all(color: const Color(0xFFE0E0E0)),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: TextField(
                            decoration: InputDecoration(
                              border: InputBorder.none,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                              hintText: '0 ${context.watch<CountryProvider>().currencyCode}',
                              hintStyle: const TextStyle(
                                fontSize: 14,
                                color: Color(0xFF747474),
                              ),
                            ),
                            style: const TextStyle(
                              fontSize: 14,
                              color: Color(0xFF40403F),
                            ),
                            keyboardType: TextInputType.number,
                            onChanged: (value) {
                              final parsed = double.tryParse(value);
                              if (parsed != null) {
                                setState(() {
                                  _tempMinPrice = parsed;
                                });
                              }
                            },
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Max',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w400,
                            color: Color(0xFF40403F),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Container(
                          height: 44,
                          decoration: BoxDecoration(
                            border: Border.all(color: const Color(0xFFE0E0E0)),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: TextField(
                            decoration: InputDecoration(
                              border: InputBorder.none,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                              hintText: '${context.watch<CountryProvider>().currencyCode} 500',
                              hintStyle: const TextStyle(
                                fontSize: 14,
                                color: Color(0xFF747474),
                              ),
                            ),
                            style: const TextStyle(
                              fontSize: 14,
                              color: Color(0xFF40403F),
                            ),
                            keyboardType: TextInputType.number,
                            onChanged: (value) {
                              final parsed = double.tryParse(value);
                              if (parsed != null) {
                                setState(() {
                                  _tempMaxPrice = parsed;
                                });
                              }
                            },
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: spacingValue),

              // Category Filter
              Text(
                isRTL ? 'الفئات' : 'Categories',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF40403F),
                ),
              ),
              const SizedBox(height: spacingValue),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: categories.map((category) {
                    final isSelected = _tempSelectedCategories.contains(category);
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: GestureDetector(
                        onTap: () {
                          setState(() {
                            if (isSelected) {
                              _tempSelectedCategories.remove(category);
                            } else {
                              _tempSelectedCategories.add(category);
                            }
                          });
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(
                            color: isSelected ? const Color(0xFFFCD535) : Colors.white,
                            border: Border.all(
                              color: isSelected ? const Color(0xFFFCD535) : const Color(0xFFD9D9D9),
                            ),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            category,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: Color(0xFF40403F),
                            ),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: spacingValue),

              // Order Type Toggle
              Text(
                isRTL ? 'نوع الطلب' : 'Order Type',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF40403F),
                ),
              ),
              const SizedBox(height: spacingValue),
              Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _tempOrderType = 'All'),
                      child: Container(
                        height: 40,
                        decoration: BoxDecoration(
                          color: _tempOrderType == 'All' ? const Color(0xFFFCD535) : Colors.white,
                          border: Border.all(
                            color: _tempOrderType == 'All' ? const Color(0xFFFCD535) : const Color(0xFFD0D0D0),
                          ),
                          borderRadius: const BorderRadius.only(
                            topLeft: Radius.circular(8),
                            bottomLeft: Radius.circular(8),
                          ),
                        ),
                        alignment: Alignment.center,
                        child: const Text(
                          'All',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF40403F),
                          ),
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _tempOrderType = 'Delivery'),
                      child: Container(
                        height: 40,
                        decoration: BoxDecoration(
                          color: _tempOrderType == 'Delivery' ? const Color(0xFFFCD535) : Colors.white,
                          border: Border.all(
                            color: _tempOrderType == 'Delivery' ? const Color(0xFFFCD535) : const Color(0xFFD0D0D0),
                          ),
                        ),
                        alignment: Alignment.center,
                        child: const Text(
                          'Delivery',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF40403F),
                          ),
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _tempOrderType = 'Pickup'),
                      child: Container(
                        height: 40,
                        decoration: BoxDecoration(
                          color: _tempOrderType == 'Pickup' ? const Color(0xFFFCD535) : Colors.white,
                          border: Border.all(
                            color: _tempOrderType == 'Pickup' ? const Color(0xFFFCD535) : const Color(0xFFD0D0D0),
                          ),
                          borderRadius: const BorderRadius.only(
                            topRight: Radius.circular(8),
                            bottomRight: Radius.circular(8),
                          ),
                        ),
                        alignment: Alignment.center,
                        child: const Text(
                          'Pickup',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF40403F),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: spacingValue),

              // Delivery Time Filter
              Text(
                isRTL ? 'وقت التوصيل' : 'Delivery Time',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF40403F),
                ),
              ),
              const SizedBox(height: spacingValue),
              Container(
                height: 44,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  border: Border.all(color: const Color(0xFFD9D9D9)),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: DropdownButton<String>(
                  isExpanded: true,
                  value: _tempDeliveryTime,
                  underline: const SizedBox(),
                  icon: const Icon(Icons.keyboard_arrow_down, color: Color(0xFF747474), size: 20),
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF40403F),
                  ),
                  items: ['15', '30', '45', '60'].map((time) {
                    return DropdownMenuItem(
                      value: time,
                      child: Text(isRTL ? 'خلال $time دقيقة' : 'Within $time min'),
                    );
                  }).toList(),
                  onChanged: (value) {
                    if (value != null) {
                      setState(() {
                        _tempDeliveryTime = value;
                      });
                    }
                  },
                ),
              ),
              const SizedBox(height: spacingValue),

              // Distance Filter
              Text(
                isRTL ? 'المسافة' : 'Distance',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF40403F),
                ),
              ),
              const SizedBox(height: spacingValue),
              SliderTheme(
                data: SliderThemeData(
                  activeTrackColor: const Color(0xFF747474),
                  inactiveTrackColor: const Color(0xFFE5E5E5),
                  thumbColor: const Color(0xFF5A5A5A),
                  overlayColor: const Color(0xFF747474).withValues(alpha: 0.2),
                  trackHeight: 3,
                ),
                child: Slider(
                  value: _tempDistance,
                  min: 1,
                  max: 50,
                  divisions: 49,
                  onChanged: (value) {
                    setState(() {
                      _tempDistance = value;
                    });
                  },
                ),
              ),
              Center(
                child: Text(
                  isRTL ? 'إظهار الطهاة في غضون ${_tempDistance.toStringAsFixed(0)} كم' : 'Show Cooks within ${_tempDistance.toStringAsFixed(0)} km',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w400,
                    color: Color(0xFF747474),
                  ),
                ),
              ),
              const SizedBox(height: spacingValue),

              // Popularity Toggles
              Text(
                isRTL ? 'الشهرة' : 'Popularity',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF40403F),
                ),
              ),
              const SizedBox(height: spacingValue),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      'Show only Popular Cooks',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w400,
                        color: _tempShowPopularCooks ? const Color(0xFF40403F) : const Color(0xFF747474),
                      ),
                    ),
                  ),
                  Transform.scale(
                    scale: 0.75,
                    child: Switch(
                      value: _tempShowPopularCooks,
                      onChanged: (value) {
                        setState(() {
                          _tempShowPopularCooks = value;
                        });
                      },
                      activeThumbColor: const Color(0xFF40403F),
                      activeTrackColor: const Color(0xFFFCD535),
                      inactiveThumbColor: const Color(0xFF40403F),
                      inactiveTrackColor: Colors.white,
                      trackOutlineColor: WidgetStateProperty.resolveWith<Color?>((states) {
                        if (!states.contains(WidgetState.selected)) {
                          return const Color(0xFF40403F);
                        }
                        return null;
                      }),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: spacingValue),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      'Show only Featured Dishes',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w400,
                        color: _tempShowPopularDishes ? const Color(0xFF40403F) : const Color(0xFF747474),
                      ),
                    ),
                  ),
                  Transform.scale(
                    scale: 0.75,
                    child: Switch(
                      value: _tempShowPopularDishes,
                      onChanged: (value) {
                        setState(() {
                          _tempShowPopularDishes = value;
                        });
                      },
                      activeThumbColor: const Color(0xFF40403F),
                      activeTrackColor: const Color(0xFFFCD535),
                      inactiveThumbColor: const Color(0xFF40403F),
                      inactiveTrackColor: Colors.white,
                      trackOutlineColor: WidgetStateProperty.resolveWith<Color?>((states) {
                        if (!states.contains(WidgetState.selected)) {
                          return const Color(0xFF40403F);
                        }
                        return null;
                      }),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: spacingValue),

              // Sorting Feature
              Text(
                isRTL ? 'الترتيب' : 'Sort By',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF40403F),
                ),
              ),
              const SizedBox(height: spacingValue),
              Container(
                height: 44,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  border: Border.all(color: const Color(0xFFD9D9D9)),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: DropdownButton<String>(
                  isExpanded: true,
                  value: _tempSortBy,
                  underline: const SizedBox(),
                  icon: const Icon(Icons.keyboard_arrow_down, color: Color(0xFF747474), size: 20),
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF40403F),
                  ),
                  items: [
                    'Recommended',
                    'Rating',
                    'Price (Low–High)',
                    'Price (High–Low)',
                    'Delivery Time',
                    'Distance'
                  ].map((sort) {
                    return DropdownMenuItem(
                      value: sort,
                      child: Text(sort),
                    );
                  }).toList(),
                  onChanged: (value) {
                    if (value != null) {
                      setState(() {
                        _tempSortBy = value;
                      });
                    }
                  },
                ),
              ),
              const Spacer(),

              // Action Buttons
              Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: _clearAllFilters,
                      child: Container(
                        height: 42,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          border: Border.all(color: const Color(0xFF40403F)),
                          borderRadius: BorderRadius.circular(24),
                        ),
                        alignment: Alignment.center,
                        child: const Text(
                          'Clear',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF40403F),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: GestureDetector(
                      onTap: _applyFilters,
                      child: Container(
                        height: 42,
                        decoration: BoxDecoration(
                          color: const Color(0xFFFCD535),
                          borderRadius: BorderRadius.circular(24),
                        ),
                        alignment: Alignment.center,
                        child: const Text(
                          'Apply',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF40403F),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
