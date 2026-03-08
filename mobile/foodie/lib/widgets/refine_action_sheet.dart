import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/filter_provider.dart';

// Custom ring slider thumb shape
class _RingSliderThumbShape extends SliderComponentShape {
  final double enabledThumbRadius;
  final double disabledThumbRadius;
  final double elevation;
  final double pressedElevation;

  const _RingSliderThumbShape({
    this.disabledThumbRadius = 8,
  });

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
  late double _tempMinPrice;
  late double _tempMaxPrice;
  late double _tempDistance;
  late String _tempOrderType;
  late String _tempDeliveryTime; // Delivery time filter
  late String _tempPrepTime; // Prep time filter
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
    _tempPrepTime = filterProvider.prepTime;
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
      _tempDeliveryTime = '60';
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
    const sectionSpacing = 12.0;

    return SizedBox(
      height: sheetHeight,
      child: Container(
        decoration: const BoxDecoration(
          color: Color(0xFFFFFFFF),
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            // Drag handle at top
            Container(
              margin: const EdgeInsets.only(top: 10),
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFDDDDDD),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            // Header with X button
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isRTL ? 'تحسين' : 'Refine',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF40403F),
                          ),
                        ),
                        const SizedBox(height: 1),
                        Text(
                          isRTL ? 'حدد الأطباق والطهاة' : 'Narrow dishes and cooks',
                          style: const TextStyle(
                            fontSize: 12,
                            color: Color(0xFF747474),
                          ),
                        ),
                      ],
                    ),
                  ),
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF5F5F5),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Icon(
                        Icons.close,
                        size: 18,
                        color: Color(0xFF747474),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),
            
            // Content - compact inner container
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFEEEEEE)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.02),
                        blurRadius: 4,
                        offset: const Offset(0, 1),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Price Range
                      _buildSectionTitle(isRTL ? 'نطاق السعر' : 'Price Range'),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Expanded(
                            child: _buildPriceInput(
                              label: 'Min',
                              value: _tempMinPrice,
                              onChanged: (val) => setState(() => _tempMinPrice = val),
                              hintPrefix: 'SAR 0',
                            ),
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: _buildPriceInput(
                              label: 'Max',
                              value: _tempMaxPrice,
                              onChanged: (val) => setState(() => _tempMaxPrice = val),
                              hintPrefix: 'SAR 500',
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Container(height: 1, color: const Color(0xFFF5F5F5)),
                      const SizedBox(height: 8),

                      // Fulfilment Type
                      _buildSectionTitle(isRTL ? 'نوع الطلب' : 'Fulfilment Type'),
                      const SizedBox(height: 3),
                      _buildSegmentedControl(
                        options: const ['All', 'Delivery', 'Pickup'],
                        selected: _tempOrderType,
                        onChanged: (val) => setState(() => _tempOrderType = val),
                      ),
                      const SizedBox(height: 8),
                      Container(height: 1, color: const Color(0xFFF5F5F5)),
                      const SizedBox(height: 8),

                      // Prep Time
                      _buildSectionTitle(isRTL ? 'وقت التحضير' : 'Prep Time'),
                      const SizedBox(height: 3),
                      _buildDeliveryTimeChips(
                        selected: _tempPrepTime,
                        onChanged: (val) => setState(() => _tempPrepTime = val),
                        isRTL: isRTL,
                      ),
                      const SizedBox(height: 8),
                      Container(height: 1, color: const Color(0xFFF5F5F5)),
                      const SizedBox(height: 8),

                      // Distance
                      _buildSectionTitle(isRTL ? 'المسافة' : 'Distance'),
                      const SizedBox(height: 3),
                      _buildDistanceSlider(isRTL: isRTL),
                      const SizedBox(height: 6),
                      Container(height: 1, color: const Color(0xFFF5F5F5)),
                      const SizedBox(height: 6),

                      // Preferences
                      _buildSectionTitle(isRTL ? 'التفضيلات' : 'Preferences'),
                      const SizedBox(height: 4),
                      _buildPreferenceRow(
                        label: 'Show only Top-rated Cooks',
                        value: _tempShowPopularCooks,
                        onChanged: (val) => setState(() => _tempShowPopularCooks = val),
                      ),
                      Container(height: 1, color: const Color(0xFFF0F0F0), margin: const EdgeInsets.symmetric(vertical: 4)),
                      _buildPreferenceRow(
                        label: 'Show only Featured Dishes',
                        value: _tempShowPopularDishes,
                        onChanged: (val) => setState(() => _tempShowPopularDishes = val),
                      ),
                      const SizedBox(height: 8),
                      Container(height: 1, color: const Color(0xFFF5F5F5)),
                      const SizedBox(height: 8),

                      // Sort By
                      _buildSectionTitle(isRTL ? 'الترتيب' : 'Sort By'),
                      const SizedBox(height: 3),
                      _buildSortByDropdown(isRTL: isRTL),
                      const SizedBox(height: 2),
                    ],
                  ),
                ),
              ),
            ),

            // Bottom buttons
            Container(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: _clearAllFilters,
                      child: Container(
                        height: 40,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          border: Border.all(color: const Color(0xFFDDDDDD)),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        alignment: Alignment.center,
                        child: const Text(
                          'Clear',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF666666),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: GestureDetector(
                      onTap: _applyFilters,
                      child: Container(
                        height: 40,
                        decoration: BoxDecoration(
                          color: const Color(0xFFFCD535),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        alignment: Alignment.center,
                        child: const Text(
                          'Apply',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF1A1A1A),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: Color(0xFF40403F),
      ),
    );
  }

  Widget _buildPriceInput({
    required String label,
    required double value,
    required Function(double) onChanged,
    required String hintPrefix,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w400,
            color: Color(0xFF999999),
          ),
        ),
        const SizedBox(height: 3),
        Container(
          height: 32,
          decoration: BoxDecoration(
            border: Border.all(color: const Color(0xFFEEEEEE)),
            borderRadius: BorderRadius.circular(6),
          ),
          child: TextField(
            decoration: InputDecoration(
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              hintText: hintPrefix,
              hintStyle: const TextStyle(fontSize: 12, color: Color(0xFFAAAAAA)),
            ),
            style: const TextStyle(fontSize: 12, color: Color(0xFF40403F)),
            keyboardType: TextInputType.number,
            controller: TextEditingController(text: value > 0 ? value.toInt().toString() : ''),
            onChanged: (val) {
              final parsed = double.tryParse(val) ?? 0;
              onChanged(parsed);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildSegmentedControl({
    required List<String> options,
    required String selected,
    required Function(String) onChanged,
  }) {
    return Container(
      height: 32,
      decoration: BoxDecoration(
        color: const Color(0xFFFAFAFA),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFEEEEEE)),
      ),
      child: Row(
        children: options.map((option) {
          final isSelected = selected == option;
          return Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: isSelected ? const Color(0xFFFCD535) : Colors.transparent,
                border: Border(right: option != options.last ? const BorderSide(color: Color(0xFFEEEEEE), width: 1) : BorderSide.none),
              ),
              alignment: Alignment.center,
              child: Text(
                option,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: isSelected ? const Color(0xFF1A1A1A) : const Color(0xFF747474),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildDeliveryTimeChips({
    required String selected,
    required Function(String) onChanged,
    required bool isRTL,
  }) {
    final times = ['30', '60', '90'];
    return Row(
      children: times.map((time) {
        final isSelected = selected == time;
        return Expanded(
          child: Padding(
            padding: EdgeInsets.only(right: time != times.last ? 4 : 0),
            child: GestureDetector(
              onTap: () => onChanged(time),
              child: Container(
                height: 30,
                decoration: BoxDecoration(
                  color: isSelected ? const Color(0xFFFCD535) : Colors.white,
                  border: Border.all(color: isSelected ? const Color(0xFFFCD535) : const Color(0xFFE8E8E8)),
                  borderRadius: BorderRadius.circular(6),
                ),
                alignment: Alignment.center,
                child: Text(
                  isRTL ? 'خلال $time دقيقة' : 'Within $time min',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: isSelected ? const Color(0xFF1A1A1A) : const Color(0xFF747474),
                  ),
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildDistanceSlider({required bool isRTL}) {
    return Column(
      children: [
        SliderTheme(
          data: SliderThemeData(
            activeTrackColor: const Color(0xFFFCD535),
            inactiveTrackColor: const Color(0xFFE8E8E8),
            thumbColor: Colors.white,
            overlayColor: const Color(0xFFFCD535).withValues(alpha: 0.2),
            trackHeight: 4,
            thumbShape: const _RingSliderThumbShape(),
            trackShape: const RoundedRectSliderTrackShape(),
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
        Padding(
          padding: const EdgeInsets.only(top: 2),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('0', style: TextStyle(fontSize: 10, color: Color(0xFFAAAAAA))),
              Text(
                isRTL ? '${_tempDistance.toStringAsFixed(0)} كم' : '${_tempDistance.toStringAsFixed(0)} km',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFFFCD535)),
              ),
              const Text('50', style: TextStyle(fontSize: 10, color: Color(0xFFAAAAAA))),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPreferenceRow({
    required String label,
    required bool value,
    required Function(bool) onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 1),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(
              label,
              style: const TextStyle(fontSize: 12, color: Color(0xFF40403F)),
            ),
          ),
          SizedBox(
            width: 40,
            height: 22,
            child: SwitchTheme(
              data: SwitchThemeData(
                trackOutlineColor: WidgetStateProperty.resolveWith((states) {
                  if (states.contains(WidgetState.selected)) {
                    return const Color(0xFFFCD535);
                  }
                  return Colors.transparent;
                }),
                thumbColor: WidgetStateProperty.resolveWith((states) {
                  if (states.contains(WidgetState.selected)) {
                    return Colors.white;
                  }
                  return Colors.white;
                }),
                trackColor: WidgetStateProperty.resolveWith((states) {
                  if (states.contains(WidgetState.selected)) {
                    return const Color(0xFFFCD535);
                  }
                  return const Color(0xFFE0E0E0);
                }),
              ),
              child: Switch(
                value: value,
                onChanged: onChanged,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSortByDropdown({required bool isRTL}) {
    return Container(
      height: 40,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: const Color(0xFFFAFAFA),
        border: Border.all(color: const Color(0xFFEEEEEE)),
        borderRadius: BorderRadius.circular(8),
      ),
      child: DropdownButton<String>(
        isExpanded: true,
        value: _tempSortBy,
        underline: const SizedBox(),
        icon: const Icon(Icons.keyboard_arrow_down, color: Color(0xFF747474), size: 18),
        style: const TextStyle(fontSize: 13, color: Color(0xFF40403F)),
        items: ['Recommended', 'Rating', 'Price (Low–High)', 'Price (High–Low)', 'Delivery Time', 'Distance'].map((sort) {
          return DropdownMenuItem(value: sort, child: Text(sort));
        }).toList(),
        onChanged: (value) {
          if (value != null) {
            setState(() {
              _tempSortBy = value;
            });
          }
        },
      ),
    );
  }
}
