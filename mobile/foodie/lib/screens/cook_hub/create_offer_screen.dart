import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import '../../config/theme.dart';
import '../../config/api_config.dart';
import '../../providers/language_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/offer_provider.dart';

enum OfferMode { create, edit, sellSimilar }

class CreateOfferScreen extends StatefulWidget {
  final Map<String, dynamic>? existingOffer;
  final OfferMode mode;
  final String? offerId; // Backward compatibility for older routes/screens

  const CreateOfferScreen({
    Key? key,
    this.existingOffer,
    this.mode = OfferMode.create,
    this.offerId,
  }) : super(key: key);

  @override
  State<CreateOfferScreen> createState() => _CreateOfferScreenState();
}

class _CreateOfferScreenState extends State<CreateOfferScreen> {
  final ImagePicker _imagePicker = ImagePicker();
  final _prepTimeController = TextEditingController(text: '45');
  final _cutoffTimeController = TextEditingController(text: '11:00');
  final _deliveryFeeController = TextEditingController(text: '0');

  String _prepOptionType = 'fixed';
  bool _pickupEnabled = true;
  bool _deliveryEnabled = false;

  final List<String> _portionSizes = [
    'single',
    'small',
    'medium',
    'large',
    'family'
  ];

  List<Map<String, dynamic>> _variants = [
    {
      'portionKey': 'medium',
      'portionLabel': 'Medium',
      'price': '',
      'stock': ''
    },
  ];

  int _currentStep = 0;
  bool _isSaving = false;
  String? _error;
  List<dynamic> _adminDishes = [];
  dynamic _selectedAdminDish;
  List<XFile> _selectedImages = [];
  bool _loadingDishes = false;

  String get _offerId => widget.existingOffer?['_id'] ?? '';

  @override
  void initState() {
    super.initState();
    _prefillFromExisting();
    _loadAdminDishes();
  }

  void _prefillFromExisting() {
    final offer = widget.existingOffer;
    if (offer == null) return;

    // Prep config
    final prepConfig = offer['prepReadyConfig'] as Map<String, dynamic>?;
    if (prepConfig != null) {
      _prepOptionType = prepConfig['optionType'] ?? 'fixed';
      _prepTimeController.text =
          (prepConfig['prepTimeMinutes'] ?? 45).toString();
      _cutoffTimeController.text = prepConfig['cutoffTime'] ?? '11:00';
    }

    // Fulfillment modes
    final fulfillment = offer['fulfillmentModes'] as Map<String, dynamic>?;
    if (fulfillment != null) {
      _pickupEnabled = fulfillment['pickup'] ?? true;
      _deliveryEnabled = fulfillment['delivery'] ?? false;
    }

    // Delivery fee
    final fee = offer['deliveryFee'];
    if (fee != null) {
      _deliveryFeeController.text = fee.toString();
    }

    // Variants
    final rawVariants = offer['variants'] as List?;
    if (rawVariants != null && rawVariants.isNotEmpty) {
      _variants = rawVariants.map<Map<String, dynamic>>((v) {
        return {
          'portionKey': v['portionKey'] ?? 'medium',
          'portionLabel': v['portionLabel'] ?? 'Medium',
          'price': (v['price'] ?? '').toString(),
          'stock': (v['stock'] ?? '').toString(),
        };
      }).toList();
    } else {
      // Fallback to top-level price/stock
      final price = offer['price'];
      final stock = offer['stock'];
      if (price != null || stock != null) {
        _variants = [
          {
            'portionKey': offer['portionSize'] ?? 'medium',
            'portionLabel': _capitalize(offer['portionSize'] ?? 'medium'),
            'price': (price ?? '').toString(),
            'stock': (stock ?? '').toString(),
          }
        ];
      }
    }
  }

  Future<void> _loadAdminDishes() async {
    final authProvider = context.read<AuthProvider>();
    final token = authProvider.token;
    if (token == null) return;

    setState(() => _loadingDishes = true);

    final offerProvider = context.read<OfferProvider>();
    final dishes = await offerProvider.fetchAdminDishes(token);

    // Pre-select the admin dish from existing offer
    dynamic preSelected;
    if (widget.existingOffer != null) {
      final adminDish = widget.existingOffer!['adminDish'];
      final adminDishId = adminDish is Map
          ? adminDish['_id']
          : widget.existingOffer!['adminDishId'];
      if (adminDishId != null) {
        try {
          preSelected = dishes.firstWhere(
            (d) => d['_id'] == adminDishId,
            orElse: () => adminDish is Map ? adminDish : null,
          );
        } catch (_) {
          preSelected = adminDish is Map ? adminDish : null;
        }
      }
    }

    setState(() {
      _adminDishes = dishes;
      _loadingDishes = false;
      if (preSelected != null) _selectedAdminDish = preSelected;
    });
  }

  Future<void> _pickImages() async {
    final images = await _imagePicker.pickMultiImage(
      imageQuality: 80,
      maxWidth: 1200,
      maxHeight: 1200,
    );
    if (images.isNotEmpty) {
      setState(() {
        _selectedImages = [..._selectedImages, ...images].take(5).toList();
      });
    }
  }

  Future<void> _takePhoto() async {
    final image = await _imagePicker.pickImage(
      source: ImageSource.camera,
      imageQuality: 80,
      maxWidth: 1200,
      maxHeight: 1200,
    );
    if (image != null) {
      setState(() {
        _selectedImages = [..._selectedImages, image].take(5).toList();
      });
    }
  }

  void _removeImage(int index) {
    setState(() => _selectedImages.removeAt(index));
  }

  bool _validateStep(int step) {
    switch (step) {
      case 0:
        return _selectedAdminDish != null;
      case 1:
        // In edit mode, existing images on server count — only require if no new images
        return _selectedImages.isNotEmpty ||
            widget.mode == OfferMode.edit;
      case 2:
        return _variants.isNotEmpty &&
            _variants.every((v) => v['price'].toString().isNotEmpty);
      case 3:
        final prepTime = int.tryParse(_prepTimeController.text) ?? 0;
        return prepTime >= 5;
    }
    return true;
  }

  void _addVariant() {
    setState(() {
      _variants.add({
        'portionKey': 'medium',
        'portionLabel': 'Medium',
        'price': '',
        'stock': '',
      });
    });
  }

  void _removeVariant(int index) {
    if (_variants.length > 1) {
      setState(() => _variants.removeAt(index));
    }
  }

  void _updateVariant(int index, String field, dynamic value) {
    setState(() {
      _variants[index][field] = value;
      if (field == 'portionKey') {
        _variants[index]['portionLabel'] = _capitalize(value.toString());
      }
    });
  }

  String _capitalize(String s) =>
      s.isNotEmpty ? s[0].toUpperCase() + s.substring(1) : s;

  Future<void> _saveOffer() async {
    final authProvider = context.read<AuthProvider>();
    final offerProvider = context.read<OfferProvider>();
    final token = authProvider.token;
    if (token == null) {
      setState(() => _error = 'Not authenticated');
      return;
    }

    if (_selectedAdminDish == null) {
      setState(() => _error = 'Please select a dish');
      return;
    }

    setState(() => _isSaving = true);

    try {
      final isEdit = widget.mode == OfferMode.edit;
      final uri = isEdit
          ? Uri.parse(ApiConfig.getOfferById(_offerId))
          : Uri.parse(ApiConfig.createOffer);
      final request = http.MultipartRequest(isEdit ? 'PUT' : 'POST', uri);
      request.headers['Authorization'] = 'Bearer $token';

      request.fields['adminDishId'] = _selectedAdminDish['_id'];

      final variantsData = _variants
          .map((v) => {
                'portionKey': v['portionKey'],
                'portionLabel': v['portionLabel'],
                'price': double.tryParse(v['price']?.toString() ?? '') ?? 0,
                'stock': int.tryParse(v['stock']?.toString() ?? '') ?? 0,
              })
          .toList();

      request.fields['variants'] = json.encode(variantsData);

      if (variantsData.isNotEmpty) {
        request.fields['price'] = variantsData[0]['price'].toString();
        request.fields['stock'] = variantsData[0]['stock'].toString();
        request.fields['portionSize'] = variantsData[0]['portionKey'].toString();
      }

      request.fields['countryCode'] = 'SA';

      final prepConfig = {
        'optionType': _prepOptionType,
        'prepTimeMinutes': int.tryParse(_prepTimeController.text) ?? 45,
        'cutoffTime': _cutoffTimeController.text,
      };
      request.fields['prepReadyConfig'] = json.encode(prepConfig);

      request.fields['fulfillmentModes'] = json.encode({
        'pickup': _pickupEnabled,
        'delivery': _deliveryEnabled,
      });

      request.fields['deliveryFee'] = _deliveryFeeController.text;

      for (var i = 0; i < _selectedImages.length; i++) {
        request.files.add(
          await http.MultipartFile.fromPath('images', _selectedImages[i].path),
        );
      }

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 201 || response.statusCode == 200) {
        await offerProvider.fetchOffers(token);

        if (mounted) {
          final msg = isEdit ? 'Offer updated successfully!' : 'Offer created successfully!';
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(msg)),
          );
          Navigator.pop(context, true);
        }
      } else {
        final data = json.decode(response.body);
        throw Exception(data['message'] ?? 'Failed to save offer');
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isSaving = false;
      });
    }
  }

  @override
  void dispose() {
    _prepTimeController.dispose();
    _cutoffTimeController.dispose();
    _deliveryFeeController.dispose();
    super.dispose();
  }

  String _appBarTitle(bool isRTL) {
    switch (widget.mode) {
      case OfferMode.edit:
        return isRTL ? 'تعديل العرض' : 'Edit Offer';
      case OfferMode.sellSimilar:
        return isRTL ? 'بيع مشابه' : 'Sell Similar';
      case OfferMode.create:
        return isRTL ? 'إنشاء عرض' : 'Create Offer';
    }
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: Text(_appBarTitle(isRTL)),
        backgroundColor: AppTheme.accentColor,
        foregroundColor: Colors.white,
      ),
      body: _isSaving
          ? const Center(child: CircularProgressIndicator())
          : Stepper(
              currentStep: _currentStep,
              onStepContinue: () {
                if (_validateStep(_currentStep)) {
                  if (_currentStep < 3) {
                    setState(() => _currentStep++);
                  } else {
                    _saveOffer();
                  }
                }
              },
              onStepCancel: () {
                if (_currentStep > 0) {
                  setState(() => _currentStep--);
                }
              },
              controlsBuilder: (context, details) {
                return Padding(
                  padding: const EdgeInsets.only(top: 16),
                  child: Row(
                    children: [
                      ElevatedButton(
                        onPressed: details.onStepContinue,
                        child: Text(_currentStep == 3
                            ? (isRTL ? 'حفظ' : 'Save')
                            : (isRTL ? 'التالي' : 'Continue')),
                      ),
                      if (_currentStep > 0)
                        TextButton(
                          onPressed: details.onStepCancel,
                          child: Text(isRTL ? 'السابق' : 'Back'),
                        ),
                    ],
                  ),
                );
              },
              steps: [
                Step(
                  title: Text(isRTL ? 'اختر الطبق' : 'Select Dish'),
                  content: _buildDishSelectionStep(isRTL),
                  isActive: _currentStep >= 0,
                  state: _currentStep > 0 ? StepState.complete : StepState.indexed,
                ),
                Step(
                  title: Text(isRTL ? 'الصور' : 'Images'),
                  content: _buildImageSelectionStep(isRTL),
                  isActive: _currentStep >= 1,
                  state: _currentStep > 1 ? StepState.complete : StepState.indexed,
                ),
                Step(
                  title: Text(isRTL ? 'السعر والمخزون' : 'Price & Stock'),
                  content: _buildPriceStockStep(isRTL),
                  isActive: _currentStep >= 2,
                  state: _currentStep > 2 ? StepState.complete : StepState.indexed,
                ),
                Step(
                  title: Text(isRTL ? 'إعدادات التحضير' : 'Prep Settings'),
                  content: _buildPrepSettingsStep(isRTL),
                  isActive: _currentStep >= 3,
                  state: StepState.indexed,
                ),
              ],
            ),
    );
  }

  Widget _buildDishSelectionStep(bool isRTL) {
    if (_loadingDishes) {
      return const Center(child: CircularProgressIndicator());
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          isRTL ? 'اختر الطبق من القائمة' : 'Select a dish from the menu',
          style: const TextStyle(fontSize: 14),
        ),
        const SizedBox(height: 16),
        if (_adminDishes.isEmpty)
          Center(
            child: Text(isRTL ? 'لا توجد أطباق متاحة' : 'No dishes available'),
          )
        else
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _adminDishes.map<Widget>((dish) {
              final isSelected = _selectedAdminDish?['_id'] == dish['_id'];
              return ChoiceChip(
                label: Text(dish['nameEn'] ?? dish['nameAr'] ?? dish['name'] ?? 'Dish'),
                selected: isSelected,
                onSelected: (selected) {
                  setState(() {
                    _selectedAdminDish = selected ? dish : null;
                  });
                },
                selectedColor: AppTheme.accentColor,
                labelStyle: TextStyle(
                  color: isSelected ? Colors.white : AppTheme.textPrimary,
                ),
              );
            }).toList(),
          ),
      ],
    );
  }

  Widget _buildImageSelectionStep(bool isRTL) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (widget.mode == OfferMode.edit && _selectedImages.isEmpty) ...[
          Text(
            isRTL
                ? 'الصور الحالية محفوظة. أضف صوراً جديدة لاستبدالها.'
                : 'Existing images are saved. Add new images to replace them.',
            style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
          ),
          const SizedBox(height: 12),
        ],
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _pickImages,
                icon: const Icon(Icons.photo_library),
                label: Text(isRTL ? 'اختر صور' : 'Choose Images'),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _takePhoto,
                icon: const Icon(Icons.camera_alt),
                label: Text(isRTL ? 'التقط صورة' : 'Take Photo'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        if (_selectedImages.isEmpty)
          Center(
            child: Text(
              isRTL ? 'لم تختر أي صور' : 'No images selected',
              style: const TextStyle(color: AppTheme.textSecondary),
            ),
          )
        else
          SizedBox(
            height: 100,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: _selectedImages.length,
              itemBuilder: (context, index) {
                return Stack(
                  children: [
                    Container(
                      width: 100,
                      height: 100,
                      margin: const EdgeInsets.only(right: 8),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(8),
                        image: DecorationImage(
                          image: FileImage(File(_selectedImages[index].path)),
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                    Positioned(
                      top: 4,
                      right: 12,
                      child: GestureDetector(
                        onTap: () => _removeImage(index),
                        child: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: const BoxDecoration(
                            color: Colors.red,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.close, size: 16, color: Colors.white),
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
      ],
    );
  }

  Widget _buildPriceStockStep(bool isRTL) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          isRTL ? 'الخيارات والأسعار' : 'Variants & Pricing',
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 8),
        Text(
          isRTL
              ? 'أضف أحجام مختلفة مع أسعار وكميات منفصلة'
              : 'Add different sizes with separate prices and stock',
          style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
        ),
        const SizedBox(height: 12),
        ...List.generate(_variants.length, (index) {
          final variant = _variants[index];
          return _buildVariantCard(index, variant, isRTL);
        }),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: _addVariant,
          icon: const Icon(Icons.add),
          label: Text(isRTL ? 'إضافة حجم جديد' : 'Add Another Size'),
          style: OutlinedButton.styleFrom(
            foregroundColor: AppTheme.accentColor,
            side: const BorderSide(color: AppTheme.accentColor),
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  Widget _buildVariantCard(int index, Map<String, dynamic> variant, bool isRTL) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  isRTL ? 'الحجم ${index + 1}' : 'Variant ${index + 1}',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                if (_variants.length > 1)
                  IconButton(
                    icon: const Icon(Icons.delete_outline, color: Colors.red),
                    onPressed: () => _removeVariant(index),
                    constraints: const BoxConstraints(),
                    padding: EdgeInsets.zero,
                  ),
              ],
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: variant['portionKey'],
              decoration: InputDecoration(
                labelText: isRTL ? 'الحجم' : 'Size',
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              ),
              items: _portionSizes.map((size) {
                return DropdownMenuItem(
                  value: size,
                  child: Text(_capitalize(size)),
                );
              }).toList(),
              onChanged: (value) {
                if (value != null) _updateVariant(index, 'portionKey', value);
              },
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    initialValue: variant['price'],
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      labelText: isRTL ? 'السعر (SAR)' : 'Price (SAR)',
                      prefixText: 'SAR ',
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    ),
                    onChanged: (value) => _updateVariant(index, 'price', value),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    initialValue: variant['stock'],
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      labelText: isRTL ? 'الكمية' : 'Stock',
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    ),
                    onChanged: (value) => _updateVariant(index, 'stock', value),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPrepSettingsStep(bool isRTL) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          isRTL ? 'إعدادات وقت التحضير' : 'Prep Time Settings',
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 16),
        Text(isRTL ? 'نوع التحضير' : 'Prep Type',
            style: const TextStyle(fontWeight: FontWeight.w500)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: [
            ChoiceChip(
              label: Text(isRTL ? 'محدد' : 'Fixed'),
              selected: _prepOptionType == 'fixed',
              onSelected: (selected) {
                if (selected) setState(() => _prepOptionType = 'fixed');
              },
              selectedColor: AppTheme.accentColor,
            ),
            ChoiceChip(
              label: Text(isRTL ? 'محدود' : 'Range'),
              selected: _prepOptionType == 'range',
              onSelected: (selected) {
                if (selected) setState(() => _prepOptionType = 'range');
              },
              selectedColor: AppTheme.accentColor,
            ),
            ChoiceChip(
              label: Text(isRTL ? 'بموعد قطع' : 'Cutoff'),
              selected: _prepOptionType == 'cutoff',
              onSelected: (selected) {
                if (selected) setState(() => _prepOptionType = 'cutoff');
              },
              selectedColor: AppTheme.accentColor,
            ),
          ],
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _prepTimeController,
          keyboardType: TextInputType.number,
          decoration: InputDecoration(
            labelText: isRTL ? 'وقت التحضير (دقائق)' : 'Prep Time (minutes)',
            helperText: isRTL ? 'الحد الأدنى 5 دقائق' : 'Minimum 5 minutes',
          ),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _cutoffTimeController,
          decoration: InputDecoration(
            labelText: isRTL ? 'وقت القطع' : 'Cutoff Time',
            helperText: isRTL ? 'مثال: 11:00' : 'Example: 11:00',
          ),
        ),
        const SizedBox(height: 16),
        Text(isRTL ? 'طرق التوصيل' : 'Fulfillment Modes',
            style: const TextStyle(fontWeight: FontWeight.w500)),
        const SizedBox(height: 8),
        SwitchListTile(
          title: Text(isRTL ? 'استلام من المطعم' : 'Pickup'),
          value: _pickupEnabled,
          onChanged: (value) => setState(() => _pickupEnabled = value),
          contentPadding: EdgeInsets.zero,
        ),
        SwitchListTile(
          title: Text(isRTL ? 'توصيل' : 'Delivery'),
          value: _deliveryEnabled,
          onChanged: (value) => setState(() => _deliveryEnabled = value),
          contentPadding: EdgeInsets.zero,
        ),
        if (_deliveryEnabled) ...[
          const SizedBox(height: 16),
          TextField(
            controller: _deliveryFeeController,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              labelText: isRTL ? 'رسوم التوصيل (SAR)' : 'Delivery Fee (SAR)',
            ),
          ),
        ],
        if (_error != null) ...[
          const SizedBox(height: 16),
          Text(
            _error!,
            style: const TextStyle(color: Colors.red),
          ),
        ],
      ],
    );
  }
}
