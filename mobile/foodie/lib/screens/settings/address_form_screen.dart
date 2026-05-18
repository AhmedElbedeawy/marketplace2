import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/language_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/address_provider.dart';
import '../../widgets/map_picker.dart';

class AddressFormScreen extends StatefulWidget {
  final String? addressId; // If provided, edit mode

  const AddressFormScreen({Key? key, this.addressId}) : super(key: key);

  @override
  State<AddressFormScreen> createState() => _AddressFormScreenState();
}

class _AddressFormScreenState extends State<AddressFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _addressLine1Controller = TextEditingController();
  final _addressLine2Controller = TextEditingController();
  final _cityController = TextEditingController();
  final _deliveryNotesController = TextEditingController();

  String _selectedLabel = 'Home';
  String _selectedCountry = 'SA'; // country code only — avoids Map equality assertion
  double? _selectedLat;
  double? _selectedLng;
  bool _locationChanged = false;

  bool _isLoading = false;
  bool _isEditMode = false;
  String? _error;

  final List<String> _availableLabels = ['Home', 'Work', 'Other'];
  final List<Map<String, String>> _availableCountries = [
    {'code': 'SA', 'name': 'Saudi Arabia'},
    {'code': 'AE', 'name': 'UAE'},
    {'code': 'EG', 'name': 'Egypt'},
    {'code': 'KW', 'name': 'Kuwait'},
  ];

  @override
  void initState() {
    super.initState();
    _isEditMode = widget.addressId != null;
    if (_isEditMode) {
      _loadAddress();
    }
  }

  Future<void> _loadAddress() async {
    setState(() => _isLoading = true);

    final addressProvider = context.read<AddressProvider>();
    final address = addressProvider.addresses.firstWhere(
      (addr) => addr.id == widget.addressId,
      orElse: () => throw Exception('Address not found'),
    );

    setState(() {
      _addressLine1Controller.text = address.addressLine1;
      _addressLine2Controller.text = address.addressLine2 ?? '';
      _cityController.text = address.city;
      _deliveryNotesController.text = address.deliveryNotes ?? '';
      _selectedLabel = address.label;
      _selectedCountry = _availableCountries.any((c) => c['code'] == address.countryCode)
          ? address.countryCode
          : (_availableCountries.first['code'] ?? 'SA');
      _selectedLat = address.lat;
      _selectedLng = address.lng;
      _isLoading = false;
    });
  }

  Future<void> _pickLocation() async {
    final languageProvider = context.read<LanguageProvider>();
    final isRTL = languageProvider.isArabic;

    final result = await Navigator.push<dynamic>(
      context,
      MaterialPageRoute(
        builder: (context) => MapPicker(
          initialLat: _selectedLat ?? 24.7136,
          initialLng: _selectedLng ?? 46.6753,
          title: isRTL ? 'اختر الموقع' : 'Select Location',
        ),
      ),
    );

    if (result != null && mounted) {
      setState(() {
        _selectedLat = result.latitude;
        _selectedLng = result.longitude;
        _locationChanged = true;
      });
    }
  }

  Future<void> _saveAddress() async {
    if (!_formKey.currentState!.validate()) return;

    if (_selectedLat == null || _selectedLng == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            context.read<LanguageProvider>().isArabic
                ? 'يرجى اختيار الموقع من الخريطة'
                : 'Please select location from map',
          ),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    final authProvider = context.read<AuthProvider>();
    final token = authProvider.token;

    if (token == null) {
      setState(() {
        _error = 'Not authenticated';
        _isLoading = false;
      });
      return;
    }

    final addressProvider = context.read<AddressProvider>();

    try {
      if (_isEditMode) {
        // Update existing address
        final success = await addressProvider.updateAddress(
          token: token,
          id: widget.addressId!,
          addressLine1: _addressLine1Controller.text,
          addressLine2: _addressLine2Controller.text.isEmpty
              ? null
              : _addressLine2Controller.text,
          city: _cityController.text,
          countryCode: _selectedCountry,
          label: _selectedLabel,
          deliveryNotes: _deliveryNotesController.text.isEmpty
              ? null
              : _deliveryNotesController.text,
          lat: _selectedLat!,
          lng: _selectedLng!,
        );

        if (success && mounted) {
          Navigator.pop(context, true);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                context.read<LanguageProvider>().isArabic
                    ? 'تم تحديث العنوان'
                    : 'Address updated',
              ),
              backgroundColor: Colors.green,
            ),
          );
        } else if (mounted) {
          setState(() {
            _error = 'Failed to update address';
            _isLoading = false;
          });
        }
      } else {
        // Create new address
        final newAddress = await addressProvider.createAddress(
          token: token,
          addressLine1: _addressLine1Controller.text,
          addressLine2: _addressLine2Controller.text.isEmpty
              ? null
              : _addressLine2Controller.text,
          city: _cityController.text,
          countryCode: _selectedCountry,
          label: _selectedLabel,
          deliveryNotes: _deliveryNotesController.text.isEmpty
              ? null
              : _deliveryNotesController.text,
          lat: _selectedLat!,
          lng: _selectedLng!,
        );

        if (newAddress != null && mounted) {
          Navigator.pop(context, true);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                context.read<LanguageProvider>().isArabic
                    ? 'تم إضافة العنوان'
                    : 'Address added',
              ),
              backgroundColor: Colors.green,
            ),
          );
        } else if (mounted) {
          setState(() {
            _error = 'Failed to create address';
            _isLoading = false;
          });
        }
      }
    } catch (err) {
      if (mounted) {
        setState(() {
          _error = err.toString();
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;

    // Shared header row — same structure as Menu / Cart / Favorites
    Widget headerRow = Padding(
      padding: const EdgeInsets.only(top: 16, left: 24, right: 24, bottom: 8),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Icon(
              isRTL ? Icons.arrow_forward : Icons.arrow_back,
              color: AppTheme.textPrimary,
              size: 24,
            ),
          ),
          const SizedBox(width: 24),
          Expanded(
            child: Text(
              isRTL
                  ? (_isEditMode ? 'تعديل العنوان' : 'إضافة عنوان جديد')
                  : (_isEditMode ? 'Edit Address' : 'New Address'),
              style: const TextStyle(
                color: AppTheme.textPrimary,
                fontSize: 18,
                fontWeight: FontWeight.w700,
                height: 1.2,
              ),
            ),
          ),
          TextButton(
            onPressed: _isLoading ? null : _saveAddress,
            child: Text(
              isRTL ? 'حفظ' : 'Save',
              style: const TextStyle(
                color: AppTheme.accentColor,
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
          ),
        ],
      ),
    );

    if (_isLoading && _isEditMode) {
      return Scaffold(
        backgroundColor: AppTheme.backgroundColor,
        body: SafeArea(
          child: Column(
            children: [
              headerRow,
              const Expanded(child: Center(child: CircularProgressIndicator())),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: SafeArea(
        child: Column(
          children: [
            headerRow,
            Expanded(
              child: Form(
                key: _formKey,
                child: ListView(
                  padding: const EdgeInsets.all(16),
          children: [
            // Address Line 1
            _fieldLabel(isRTL ? 'العنوان (السطر 1)' : 'Address Line 1'),
            const SizedBox(height: 6),
            TextFormField(
              controller: _addressLine1Controller,
              decoration: InputDecoration(
                hintText: isRTL ? 'أدخل العنوان' : 'Enter address',
                hintStyle: _hintStyle,
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return isRTL ? ' مطلوب' : 'Required';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),

            // Address Line 2 (Optional)
            _fieldLabel(isRTL ? 'العنوان (السطر 2 - اختياري)' : 'Address Line 2 (Optional)'),
            const SizedBox(height: 6),
            TextFormField(
              controller: _addressLine2Controller,
              decoration: InputDecoration(
                hintText: isRTL ? 'شقة، طابق، إلخ' : 'Apt, Floor, etc.',
                hintStyle: _hintStyle,
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
            const SizedBox(height: 16),

            // City
            _fieldLabel(isRTL ? 'المدينة' : 'City'),
            const SizedBox(height: 6),
            TextFormField(
              controller: _cityController,
              decoration: InputDecoration(
                hintText: isRTL ? 'أدخل المدينة' : 'Enter city',
                hintStyle: _hintStyle,
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return isRTL ? 'مطلوب' : 'Required';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),

            // Label Dropdown
            _fieldLabel(isRTL ? 'التصنيف' : 'Label'),
            const SizedBox(height: 6),
            DropdownButtonFormField<String>(
              initialValue: _selectedLabel,
              decoration: InputDecoration(
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
              items: _availableLabels.map((label) {
                return DropdownMenuItem(
                  value: label,
                  child: Text(isRTL ? _getLabelAr(label) : label),
                );
              }).toList(),
              onChanged: (value) {
                setState(() {
                  _selectedLabel = value!;
                });
              },
            ),
            const SizedBox(height: 16),

            // Country Dropdown
            _fieldLabel(isRTL ? 'الدولة' : 'Country'),
            const SizedBox(height: 6),
            DropdownButtonFormField<String>(
              initialValue: _selectedCountry,
              decoration: InputDecoration(
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
              items: _availableCountries.map((country) {
                return DropdownMenuItem<String>(
                  value: country['code']!,
                  child: Text(country['name']!),
                );
              }).toList(),
              onChanged: (value) {
                setState(() {
                  _selectedCountry = value!;
                });
              },
            ),
            const SizedBox(height: 16),

            // Delivery Notes
            _fieldLabel(isRTL ? 'ملاحظات التوصيل (اختياري)' : 'Delivery Notes (Optional)'),
            const SizedBox(height: 6),
            TextFormField(
              controller: _deliveryNotesController,
              maxLines: 3,
              decoration: InputDecoration(
                hintText: isRTL ? 'أي تعليمات إضافية...' : 'Any special instructions...',
                hintStyle: _hintStyle,
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Location Picker
            GestureDetector(
              onTap: _pickLocation,
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.dividerColor),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.map, color: AppTheme.accentColor),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isRTL ? 'اختر الموقع على الخريطة' : 'Select Location on Map',
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 15,
                            ),
                          ),
                          if (_selectedLat != null && _selectedLng != null) ...[
                            const SizedBox(height: 4),
                            Text(
                              '${_selectedLat!.toStringAsFixed(6)}, ${_selectedLng!.toStringAsFixed(6)}',
                              style: const TextStyle(
                                color: AppTheme.textSecondary,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    Icon(
                      isRTL ? Icons.arrow_forward : Icons.arrow_back,
                      color: AppTheme.textSecondary,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Error Message
            if (_error != null) ...[
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Text(
                  _error!,
                  style: const TextStyle(color: Colors.red),
                  textAlign: TextAlign.center,
                ),
              ),
            ],

            // Save Button
            ElevatedButton(
              onPressed: _isLoading ? null : _saveAddress,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.accentColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: _isLoading
                  ? const CircularProgressIndicator(color: Colors.white)
                  : Text(
                      isRTL ? 'حفظ العنوان' : 'Save Address',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
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
    );
  }

  static const TextStyle _hintStyle = TextStyle(
    color: Color(0xFF969494),
    fontSize: 14,
  );

  static Widget _fieldLabel(String text) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w500,
        color: AppTheme.textPrimary,
      ),
    );
  }

  String _getLabelAr(String label) {
    switch (label) {
      case 'Home':
        return 'منزل';
      case 'Work':
        return 'عمل';
      case 'Other':
        return 'أخرى';
      default:
        return label;
    }
  }

  @override
  void dispose() {
    _addressLine1Controller.dispose();
    _addressLine2Controller.dispose();
    _cityController.dispose();
    _deliveryNotesController.dispose();
    super.dispose();
  }
}
