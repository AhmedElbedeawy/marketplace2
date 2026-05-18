import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/filter_provider.dart';
import 'app_toggle.dart';

// Custom ring slider thumb shape
class _RingSliderThumbShape extends SliderComponentShape {
  final double enabledThumbRadius = 10;
  final double disabledThumbRadius = 8;
  final double elevation= 0;
  final double pressedElevation= 0;

  const _RingSliderThumbShape();

  @override
  Size getPreferredSize(bool isEnabled, bool isDiscrete) {
    return Size.fromRadius(isEnabled ? enabledThumbRadius : disabledThumbRadius);
  }

  @override
  void paint(
    PaintingContext context,
    Offset center, {
    required Animation<double> activationAnimation,
    required Animation<double> enableAnimation,
    required bool isDiscrete,
    required TextPainter labelPainter,
    required RenderBox parentBox,
    required SliderThemeData sliderTheme,
    required TextDirection textDirection,
    required double value,
    required double textScaleFactor,
    required Size sizeWithOverflow,
  }) {
    final Canvas canvas = context.canvas;
    final double radius = enabledThumbRadius;
    
    // White fill
    final Paint fillPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;
    
    // Yellow stroke
    final Paint strokePaint = Paint()
      ..color = const Color(0xFFFCD535)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;
    
    canvas.drawCircle(center, radius, fillPaint);
    canvas.drawCircle(center, radius - 1, strokePaint);
  }
}

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
  late TextEditingController _minPriceController;
  late TextEditingController _maxPriceController;
  late double _tempMinPrice;
  late double _tempMaxPrice;
  late double _tempDistance;
  late String _tempOrderType;
  late String _tempPrepTime; // Prep time filter
  late String _tempSortBy;
  late bool _tempShowPopularCooks;
  late bool _tempShowPopularDishes;
  late List<String> _tempSelectedCategories;
  
  // Inline dropdown state
  bool _isPreparationTimeExpanded = false;
  bool _isSortByExpanded = false;
  final ScrollController _scrollController = ScrollController();
  final GlobalKey _sortByKey = GlobalKey(); // To measure Sort By field position

  @override
  void initState() {
    super.initState();
    final filterProvider = Provider.of<FilterProvider>(context, listen: false);
    _cookNameController = TextEditingController(text: filterProvider.cookNameFilter);
    _minPriceController = TextEditingController(text: filterProvider.minPrice > 0 ? filterProvider.minPrice.toInt().toString() : '0');
    _maxPriceController = TextEditingController(text: filterProvider.maxPrice > 0 ? filterProvider.maxPrice.toInt().toString() : '500');
    _tempMinPrice = filterProvider.minPrice;
    _tempMaxPrice = filterProvider.maxPrice;
    _tempDistance = filterProvider.distance;
    _tempOrderType = filterProvider.orderType;
    _tempPrepTime = filterProvider.prepTime;
    _tempSortBy = filterProvider.sortBy;
    _tempShowPopularCooks = filterProvider.showOnlyPopularCooks;
    _tempShowPopularDishes = filterProvider.showOnlyPopularDishes;
    _tempSelectedCategories = List.from(filterProvider.selectedCategories);
  }

  @override
  void dispose() {
    _cookNameController.dispose();
    _minPriceController.dispose();
    _maxPriceController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _applyFilters() {
    final filterProvider = Provider.of<FilterProvider>(context, listen: false);
    filterProvider.setPriceRange(_tempMinPrice, _tempMaxPrice);
    filterProvider.setCookNameFilter(_cookNameController.text);
    filterProvider.setOrderType(_tempOrderType);
    filterProvider.setPrepTime(_tempPrepTime);
    filterProvider.setDistance(_tempDistance);
    filterProvider.setShowOnlyPopularCooks(_tempShowPopularCooks);
    filterProvider.setShowOnlyPopularDishes(_tempShowPopularDishes);
    filterProvider.setSortBy(_tempSortBy);

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
      _tempPrepTime = '60';
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
    final screenHeight = MediaQuery.of(context).size.height;
    final sheetHeight = screenHeight * 0.88;

    return SizedBox(
      height: sheetHeight,
      child: Container(
        decoration: const BoxDecoration(
          color: Color(0xFFF7F7F7),
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            // Drag handle
            Container(
              margin: const EdgeInsets.only(top: 12),
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFDDDDDD),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Icon(
                      isRTL ? Icons.arrow_forward : Icons.arrow_back,
                      size: 22,
                      color: const Color(0xFF40403F),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      isRTL ? 'تحسين' : 'Refine',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        fontFamily: 'Plus Jakarta Sans',
                        color: Color(0xFF40403F),
                      ),
                    ),
                  ),
                  GestureDetector(
                    onTap: _applyFilters,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFF7A00),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Text(
                        'Apply',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          fontFamily: 'Plus Jakarta Sans',
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // Content
            Expanded(
              child: SingleChildScrollView(
                controller: _scrollController,
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Price Range
                    _buildSectionTitle(isRTL ? 'نطاق السعر' : 'Price Range'),
                    const SizedBox(height: 8),
                    _buildPriceRangeSection(isRTL),
                    const SizedBox(height: 12),
                    // Order Type
                    _buildSectionTitle(isRTL ? 'نوع الطلب' : 'Order Type'),
                    const SizedBox(height: 8),
                    _buildOrderTypeSection(isRTL),
                    const SizedBox(height: 12),
                    _buildSectionTitle(isRTL ? 'وقت التحضير' : 'Preparation Time'),
                    const SizedBox(height: 8),
                    _buildPreparationTimeSection(isRTL),
                    const SizedBox(height: 12),
                    // Distance
                    _buildSectionTitle(isRTL ? 'المسافة' : 'Distance'),
                    const SizedBox(height: 8),
                    _buildDistanceSection(isRTL),
                    const SizedBox(height: 12),
                    // Popularity
                    _buildSectionTitle(isRTL ? 'الشعبية' : 'Popularity'),
                    const SizedBox(height: 8),
                    _buildPopularitySection(isRTL),
                    const SizedBox(height: 12),
                    // Sort By
                    _buildSortBySection(isRTL),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPriceRangeSection(bool isRTL) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
      child: Row(
        children: [
          Expanded(
            child: Container(
              height: 40,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  const Text('SAR ', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: Color(0xFF40403F))),
                  const SizedBox(width: 4),
                  Expanded(
                    child: TextField(
                      controller: _minPriceController,
                      keyboardType: TextInputType.number,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: Color(0xFF40403F)),
                      decoration: const InputDecoration(
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        filled: true,
                        fillColor: Colors.white,
                        hintText: '0',
                        hintStyle: TextStyle(color: Color(0xFF999999)),
                        contentPadding: EdgeInsets.zero,
                        isDense: true,
                      ),
                      onChanged: (val) => setState(() => _tempMinPrice = double.tryParse(val) ?? 0),
                    ),
                  ),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10),
            child: Container(width: 20, height: 2, color: const Color(0xFFFF7A00)),
          ),
          Expanded(
            child: Container(
              height: 40,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  const Text('SAR ', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: Color(0xFF40403F))),
                  const SizedBox(width: 4),
                  Expanded(
                    child: TextField(
                      controller: _maxPriceController,
                      keyboardType: TextInputType.number,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: Color(0xFF40403F)),
                      decoration: const InputDecoration(
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        filled: true,
                        fillColor: Colors.white,
                        hintText: '500',
                        hintStyle: TextStyle(color: Color(0xFF999999)),
                        contentPadding: EdgeInsets.zero,
                        isDense: true,
                      ),
                      onChanged: (val) => setState(() => _tempMaxPrice = double.tryParse(val) ?? 500),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderTypeSection(bool isRTL) {
    return Container(
      height: 40,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        children: [
          _buildOrderTypePill('All', 'الكل', isRTL),
          _buildOrderTypePill('Delivery', 'توصيل', isRTL),
          _buildOrderTypePill('Pickup', 'استلام', isRTL),
        ],
      ),
    );
  }

  Widget _buildOrderTypePill(String value, String valueAr, bool isRTL) {
    final isSelected = _tempOrderType == value;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _tempOrderType = value),
        child: Container(
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFFFF7A00) : Colors.transparent,
            borderRadius: BorderRadius.circular(20),
          ),
          alignment: Alignment.center,
          child: Text(
            isRTL ? valueAr : value,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: isSelected ? Colors.white : const Color(0xFF999999),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPreparationTimeSection(bool isRTL) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Preparation Time selector button
        GestureDetector(
          onTap: () {
            setState(() {
              _isPreparationTimeExpanded = !_isPreparationTimeExpanded;
              _isSortByExpanded = false; // Close other dropdown
            });
            // NO auto-scroll for mid-screen dropdown
          },
          child: Container(
            height: 44,
            padding: const EdgeInsets.symmetric(horizontal: 14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(12),
                topRight: const Radius.circular(12),
                bottomLeft: Radius.circular(_isPreparationTimeExpanded ? 0 : 12),
                bottomRight: Radius.circular(_isPreparationTimeExpanded ? 0 : 12),
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    isRTL ? 'خلال $_tempPrepTime دقيقة' : 'Within $_tempPrepTime min',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: Color(0xFF40403F)),
                  ),
                ),
                Icon(
                  _isPreparationTimeExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                  size: 18,
                  color: const Color(0xFF999999),
                ),
              ],
            ),
          ),
        ),
        // Inline dropdown options
        if (_isPreparationTimeExpanded)
          Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.only(
                bottomLeft: Radius.circular(12),
                bottomRight: Radius.circular(12),
              ),
            ),
            child: Column(
              children: ['30', '60', '90'].map((time) {
                final isSelected = _tempPrepTime == time;
                return GestureDetector(
                  onTap: () {
                    setState(() {
                      _tempPrepTime = time;
                      _isPreparationTimeExpanded = false;
                    });
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: isSelected ? const Color(0xFFFFF3E0) : Colors.white,
                      border: Border(
                        bottom: time != '90' ? const BorderSide(color: Color(0xFFF0F0F0), width: 1) : BorderSide.none,
                      ),
                    ),
                    child: Row(
                      children: [
                        if (isSelected)
                          const Icon(Icons.check, size: 18, color: Color(0xFFFF7A00))
                        else
                          const SizedBox(width: 18),
                        const SizedBox(width: 8),
                        Text(
                          isRTL ? '$time دقيقة' : '$time min',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                            color: isSelected ? const Color(0xFFFF7A00) : const Color(0xFF40403F),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
      ],
    );
  }

  Widget _buildDistanceSection(bool isRTL) {
    return Container(
      height: 92,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  isRTL ? 'عرض الطهاة في منطقتك' : 'Show Cooks within your area',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: Color(0xFF40403F)),
                ),
              ),
              Text('${_tempDistance.toInt()}km', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFFFF7A00))),
            ],
          ),
          const SizedBox(height: 0),
          SliderTheme(
            data: const SliderThemeData(
              activeTrackColor: Color(0xFFFF7A00),
              inactiveTrackColor: Color(0xFFE0E0E0),
              thumbColor: Color(0xFFFF7A00),
              trackHeight: 3,
              thumbShape: RoundSliderThumbShape(enabledThumbRadius: 11),
              trackShape: RoundedRectSliderTrackShape(),
            ),
            child: Slider(
              value: _tempDistance,
              min: 1,
              max: 50,
              onChanged: (value) => setState(() => _tempDistance = value),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPopularitySection(bool isRTL) {
    return Column(
      children: [
        _buildToggleRow(Icons.verified, isRTL ? 'طهاة ذوو تقييم عالي فقط' : 'Top-rated Cooks Only', _tempShowPopularCooks, (val) => setState(() => _tempShowPopularCooks = val)),
        const SizedBox(height: 12),
        _buildToggleRow(Icons.local_fire_department, isRTL ? 'الأطباق الشعبية فقط' : 'Popular Dishes Only', _tempShowPopularDishes, (val) => setState(() => _tempShowPopularDishes = val)),
      ],
    );
  }

  Widget _buildToggleRow(IconData icon, String label, bool value, Function(bool) onChanged) {
    return Container(
      height: 48,
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Icon(icon, size: 18, color: const Color(0xFF40403F)),
          const SizedBox(width: 10),
          Expanded(
            child: Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: Color(0xFF40403F))),
          ),
          AppToggle(
            value: value,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }

  Widget _buildSortBySection(bool isRTL) {
    final sortByOptions = [
      'Recommended',
      'Rating',
      'Price (Low–High)',
      'Price (High–Low)',
      'Delivery Time',
      'Distance',
    ];
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Sort By selector button
        GestureDetector(
          key: _sortByKey,
          onTap: () {
            setState(() {
              _isSortByExpanded = !_isSortByExpanded;
              _isPreparationTimeExpanded = false; // Close other dropdown
            });
            // Auto-scroll ONLY if content would be clipped
            if (_isSortByExpanded) {
              Future.delayed(const Duration(milliseconds: 100), () {
                if (_scrollController.hasClients && _sortByKey.currentContext != null) {
                  // Get the Sort By field's render box
                  final RenderBox sortByBox = _sortByKey.currentContext!.findRenderObject()! as RenderBox;
                  
                  // Get the field's position in the global coordinate system
                  final fieldGlobalPosition = sortByBox.localToGlobal(Offset.zero);
                  final fieldY = fieldGlobalPosition.dy;
                  
                  // Get the action sheet's total height (88% of screen)
                  final screenHeight = MediaQuery.of(context).size.height;
                  final sheetHeight = screenHeight * 0.88;
                  
                  // Estimate the header + top content height (drag handle + header + scrollable content above Sort By)
                  // This is approximately the fieldY since it's relative to the sheet
                  const headerAndTopContentHeight = 120.0; // Drag handle (16) + Header (60) + Content above (~44)
                  
                  // Calculate space below Sort By field within the scrollable area
                  final scrollableAreaHeight = sheetHeight - headerAndTopContentHeight;
                  final fieldPositionInScrollable = fieldY - headerAndTopContentHeight;
                  final spaceBelow = scrollableAreaHeight - fieldPositionInScrollable - sortByBox.size.height;
                  
                  // Sort By dropdown height: 6 options × ~42px = ~252px
                  const dropdownHeight = 252.0;
                  
                  // Only scroll if dropdown would be clipped
                  if (dropdownHeight > spaceBelow) {
                    final scrollNeeded = dropdownHeight - spaceBelow;
                    _scrollController.animateTo(
                      _scrollController.offset + scrollNeeded,
                      duration: const Duration(milliseconds: 200),
                      curve: Curves.easeOut,
                    );
                  }
                }
              });
            }
          },
          child: Container(
            height: 48,
            padding: const EdgeInsets.symmetric(horizontal: 14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(14),
                topRight: const Radius.circular(14),
                bottomLeft: Radius.circular(_isSortByExpanded ? 0 : 14),
                bottomRight: Radius.circular(_isSortByExpanded ? 0 : 14),
              ),
            ),
            child: Row(
              children: [
                const Icon(Icons.sort, size: 18, color: Color(0xFF40403F)),
                const SizedBox(width: 10),
                Text(
                  isRTL ? 'ترتيب حسب' : 'Sort By',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: Color(0xFF40403F)),
                ),
                const Spacer(),
                Text(
                  _getSortByDisplayText(isRTL),
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFFFF7A00)),
                ),
                const SizedBox(width: 8),
                Icon(
                  _isSortByExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                  size: 18,
                  color: const Color(0xFFFF7A00),
                ),
              ],
            ),
          ),
        ),
        // Inline dropdown options
        if (_isSortByExpanded)
          Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.only(
                bottomLeft: Radius.circular(14),
                bottomRight: Radius.circular(14),
              ),
            ),
            child: Column(
              children: sortByOptions.asMap().entries.map((entry) {
                final index = entry.key;
                final option = entry.value;
                final isSelected = _tempSortBy == option;
                final isLast = index == sortByOptions.length - 1;
                
                return GestureDetector(
                  onTap: () {
                    setState(() {
                      _tempSortBy = option;
                      _isSortByExpanded = false;
                    });
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                    decoration: BoxDecoration(
                      color: isSelected ? const Color(0xFFFFF3E0) : Colors.white,
                      border: Border(
                        bottom: isLast ? BorderSide.none : const BorderSide(color: Color(0xFFF0F0F0), width: 1),
                      ),
                    ),
                    child: Row(
                      children: [
                        if (isSelected)
                          const Icon(Icons.check, size: 18, color: Color(0xFFFF7A00))
                        else
                          const SizedBox(width: 18),
                        const SizedBox(width: 8),
                        Text(
                          _getSortByOptionText(option, isRTL),
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                            color: isSelected ? const Color(0xFFFF7A00) : const Color(0xFF40403F),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
      ],
    );
  }

  String _getSortByDisplayText(bool isRTL) {
    switch (_tempSortBy) {
      case 'Rating': return isRTL ? 'التقييم' : 'Rating';
      case 'Price (Low–High)': return isRTL ? 'السعر (منخفض–مرتفع)' : 'Price (Low–High)';
      case 'Price (High–Low)': return isRTL ? 'السعر (مرتفع–منخفض)' : 'Price (High–Low)';
      case 'Delivery Time': return isRTL ? 'وقت التوصيل' : 'Delivery Time';
      case 'Distance': return isRTL ? 'المسافة' : 'Distance';
      default: return isRTL ? 'موصى به' : 'Recommended';
    }
  }

  void _showSortByPicker(bool isRTL) {
    final options = ['Recommended', 'Rating', 'Price (Low–High)', 'Price (High–Low)', 'Delivery Time', 'Distance'];
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(margin: const EdgeInsets.only(top: 12), width: 40, height: 4, decoration: BoxDecoration(color: const Color(0xFFDDDDDD), borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 16),
            ...options.map((opt) => ListTile(
              title: Text(_getSortByOptionText(opt, isRTL), textAlign: TextAlign.center, style: TextStyle(fontSize: 16, fontWeight: _tempSortBy == opt ? FontWeight.w700 : FontWeight.w500, color: _tempSortBy == opt ? const Color(0xFFFF7A00) : const Color(0xFF40403F))),
              onTap: () { setState(() => _tempSortBy = opt); Navigator.pop(context); },
            )).toList(),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  String _getSortByOptionText(String option, bool isRTL) {
    if (!isRTL) return option;
    switch (option) {
      case 'Recommended': return 'موصى به';
      case 'Rating': return 'التقييم';
      case 'Price (Low–High)': return 'السعر (منخفض–مرتفع)';
      case 'Price (High–Low)': return 'السعر (مرتفع–منخفض)';
      case 'Delivery Time': return 'وقت التوصيل';
      case 'Distance': return 'المسافة';
      default: return option;
    }
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.w700,
        fontFamily: 'Plus Jakarta Sans',
        color: Color(0xFF40403F),
      ),
    );
  }
}
