import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import '../../config/theme.dart';
import '../../config/api_config.dart';
import '../../providers/language_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/cook_profile_provider.dart';
import '../../widgets/map_picker.dart';
import '../../widgets/phone_verification_widget.dart';

class CookProfileScreen extends StatefulWidget {
  const CookProfileScreen({Key? key}) : super(key: key);

  @override
  State<CookProfileScreen> createState() => _CookProfileScreenState();
}

class _CookProfileScreenState extends State<CookProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _storeNameController = TextEditingController();
  final _bioController = TextEditingController();
  final _cityController = TextEditingController();
  final _addressLine1Controller = TextEditingController();
  final _addressLine2Controller = TextEditingController();
  final _deliveryNotesController = TextEditingController();
  String _selectedLabel = 'Home';
  String _selectedCountryCode = 'SA';
  String? _currentPhone;

  bool _isLoading = true;
  bool _isSaving = false;
  String? _error;
  String? _success;

  List<String> _selectedExpertise = [];
  List<String> _selectedFulfillment = [];
  List<String> _availableExpertise = [];

  // Location state - no hardcoded defaults
  double? _selectedLat;
  double? _selectedLng;
  bool _locationChanged = false;
  bool _expertiseDropdownOpen = false;

  // Profile photo state
  String? _profilePhotoUrl;
  XFile? _newProfilePhoto;
  final ImagePicker _imagePicker = ImagePicker();
  bool _uploadingPhoto = false;

  @override
  void initState() {
    super.initState();
    _loadProfile();
    _loadExpertise();
  }

  Future<void> _loadExpertise() async {
    try {
      final response =
          await http.get(Uri.parse('${ApiConfig.baseUrl}/expertise'));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true && data['data'] != null) {
          setState(() {
            _availableExpertise = List<String>.from(data['data']);
          });
        }
      }
    } catch (e) {
      debugPrint('Error loading expertise: $e');
    }
  }

  Future<void> _loadProfile() async {
    final authProvider = context.read<AuthProvider>();
    final token = authProvider.token;

    if (token == null) {
      setState(() {
        _error = 'Not authenticated';
        _isLoading = false;
      });
      return;
    }

    final profileProvider = context.read<CookProfileProvider>();
    await profileProvider.fetchProfile(token);

    setState(() {
      _isLoading = false;
      _storeNameController.text = profileProvider.storeName ?? '';
      _bioController.text = profileProvider.bio ?? '';
      _cityController.text = profileProvider.city ?? '';
      _addressLine1Controller.text = profileProvider.addressLine1 ?? '';
      _addressLine2Controller.text = profileProvider.addressLine2 ?? '';
      _deliveryNotesController.text = profileProvider.deliveryNotes ?? '';
      _selectedLabel = profileProvider.label ?? 'Home';
      _selectedCountryCode = profileProvider.countryCode ?? 'SA';
      _currentPhone = profileProvider.phone;
      _selectedExpertise = List<String>.from(profileProvider.expertise);
      _selectedFulfillment =
          List<String>.from(profileProvider.fulfillmentMethods);
      // Load location - use null if not set (no hardcoded defaults)
      _selectedLat = profileProvider.lat != 0 ? profileProvider.lat : null;
      _selectedLng = profileProvider.lng != 0 ? profileProvider.lng : null;
      _profilePhotoUrl = profileProvider.profilePhoto;
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

  Future<void> _pickProfilePhoto() async {
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
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: Text(isRTL ? 'التقط صورة' : 'Take Photo'),
              onTap: () async {
                Navigator.pop(context);
                final image = await _imagePicker.pickImage(
                  source: ImageSource.camera,
                  imageQuality: 80,
                  maxWidth: 800,
                  maxHeight: 800,
                );
                if (image != null) {
                  await _uploadProfilePhoto(image);
                }
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: Text(isRTL ? 'اختر من المكتبة' : 'Choose from Library'),
              onTap: () async {
                Navigator.pop(context);
                final image = await _imagePicker.pickImage(
                  source: ImageSource.gallery,
                  imageQuality: 80,
                  maxWidth: 800,
                  maxHeight: 800,
                );
                if (image != null) {
                  await _uploadProfilePhoto(image);
                }
              },
            ),
            if (_profilePhotoUrl != null || _newProfilePhoto != null)
              ListTile(
                leading: const Icon(Icons.delete, color: Colors.red),
                title: Text(
                  isRTL ? 'إزالة الصورة' : 'Remove Photo',
                  style: const TextStyle(color: Colors.red),
                ),
                onTap: () {
                  Navigator.pop(context);
                  setState(() {
                    _newProfilePhoto = null;
                    _profilePhotoUrl = null;
                  });
                },
              ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Future<void> _uploadProfilePhoto(XFile image) async {
    final authProvider = context.read<AuthProvider>();
    final token = authProvider.token;
    if (token == null) return;

    setState(() => _uploadingPhoto = true);

    try {
      // Convert image to base64
      final bytes = await image.readAsBytes();
      final base64Image = 'data:image/jpeg;base64,${base64Encode(bytes)}';

      final response = await http.put(
        Uri.parse(ApiConfig.cookProfilePhoto),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode({'profilePhoto': base64Image}),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        setState(() {
          _profilePhotoUrl = data['profilePhoto'] ?? base64Image;
          _newProfilePhoto = null;
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Profile photo updated'),
              backgroundColor: Colors.green,
            ),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to update photo: ${response.statusCode}'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error uploading photo: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      setState(() => _uploadingPhoto = false);
    }
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    final authProvider = context.read<AuthProvider>();
    final token = authProvider.token;

    if (token == null) {
      setState(() => _error = 'Not authenticated');
      return;
    }

    setState(() {
      _isSaving = true;
      _error = null;
      _success = null;
    });

    final profileProvider = context.read<CookProfileProvider>();
    final success = await profileProvider.updateCookProfile(
      token: token,
      storeName: _storeNameController.text,
      bio: _bioController.text,
      expertise: _selectedExpertise,
      city: _cityController.text,
      addressLine1: _addressLine1Controller.text,
      addressLine2: _addressLine2Controller.text,
      label: _selectedLabel,
      countryCode: _selectedCountryCode,
      deliveryNotes: _deliveryNotesController.text,
      fulfillmentMethods: _selectedFulfillment,
      // Only include location if explicitly set or changed
      lat: (_selectedLat != null && _selectedLat != 0) ? _selectedLat : null,
      lng: (_selectedLng != null && _selectedLng != 0) ? _selectedLng : null,
    );

    setState(() {
      _isSaving = false;
      if (success) {
        _success = 'Profile updated successfully';
      } else {
        _error = profileProvider.error ?? 'Failed to update profile';
      }
    });
  }


  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;

    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: Text(isRTL ? 'الملف الشخصي' : 'Profile')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: Text(isRTL ? 'الملف الشخصي للطاهي' : 'Cook Profile'),
        backgroundColor: Colors.white,
        foregroundColor: AppTheme.textPrimary,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Profile Photo
              Center(
                child: GestureDetector(
                  onTap: _uploadingPhoto ? null : _pickProfilePhoto,
                  child: Stack(
                    children: [
                      CircleAvatar(
                        radius: 50,
                        backgroundColor: Colors.grey.shade200,
                        backgroundImage: _profilePhotoUrl != null
                            ? NetworkImage(_profilePhotoUrl!.startsWith('http')
                                ? _profilePhotoUrl!
                                : '${ApiConfig.staticBaseUrl}$_profilePhotoUrl')
                            : null,
                        child: _profilePhotoUrl == null && !_uploadingPhoto
                            ? const Icon(Icons.person,
                                size: 50, color: Colors.grey)
                            : null,
                      ),
                      if (_uploadingPhoto)
                        const Positioned.fill(
                          child: CircleAvatar(
                            backgroundColor: Colors.black45,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2,
                            ),
                          ),
                        ),
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: const BoxDecoration(
                            color: AppTheme.accentColor,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.camera_alt,
                            color: Colors.white,
                            size: 16,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Center(
                child: Text(
                  isRTL ? 'اضغط لتغيير الصورة' : 'Tap to change photo',
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                ),
              ),
              const SizedBox(height: 24),

              // Success/Error messages
              if (_success != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.green.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.green),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.check_circle, color: Colors.green),
                      const SizedBox(width: 8),
                      Expanded(child: Text(_success!)),
                    ],
                  ),
                ),

              if (_error != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error, color: Colors.red),
                      const SizedBox(width: 8),
                      Expanded(child: Text(_error!)),
                    ],
                  ),
                ),

              // Kitchen Name
              _buildSectionTitle(isRTL ? 'معلومات المطعم' : 'Restaurant Info'),
              const SizedBox(height: 12),
              TextFormField(
                controller: _storeNameController,
                decoration: InputDecoration(
                  labelText: isRTL ? 'اسم المطبخ' : 'Kitchen Name',
                  labelStyle: const TextStyle(color: Color(0xFF9E9E9E)),
                  floatingLabelStyle: const TextStyle(color: Color(0xFF9E9E9E)),
                  hintText: isRTL ? 'أدخل اسم مطبخك' : 'Enter your kitchen name',
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return isRTL
                        ? 'يرجى إدخال اسم المطبخ'
                        : 'Please enter kitchen name';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Bio
              TextFormField(
                controller: _bioController,
                minLines: 1,
                maxLines: 6,
                keyboardType: TextInputType.multiline,
                decoration: InputDecoration(
                  labelText: isRTL ? 'نبذة عن المطبخ' : 'About your kitchen',
                  labelStyle: const TextStyle(color: Color(0xFF9E9E9E)),
                  floatingLabelStyle: const TextStyle(color: Color(0xFF9E9E9E)),
                  hintText: isRTL
                      ? 'أخبرنا عن مطبخك وأسلوبك في الطبخ...'
                      : 'Tell customers about your kitchen and cooking style...',
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Address Line 1
              TextFormField(
                controller: _addressLine1Controller,
                decoration: InputDecoration(
                  labelText: isRTL ? 'سطر العنوان الأول (الحي / المنطقة)' : 'Address Line 1 (Area / District)',
                  labelStyle: const TextStyle(color: Color(0xFF9E9E9E)),
                  floatingLabelStyle: const TextStyle(color: Color(0xFF9E9E9E)),
                  hintText: isRTL ? 'مثال: حي النزهة، شارع الملك فهد' : 'e.g., Al-Nuzha District, King Fahd Road',
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // Address Line 2
              TextFormField(
                controller: _addressLine2Controller,
                decoration: InputDecoration(
                  labelText: isRTL ? 'سطر العنوان الثاني (اختياري)' : 'Address Line 2 (Optional)',
                  labelStyle: const TextStyle(color: Color(0xFF9E9E9E)),
                  floatingLabelStyle: const TextStyle(color: Color(0xFF9E9E9E)),
                  hintText: isRTL ? 'رقم المبنى، الشقة، معلم قريب...' : 'Building no., apartment, nearby landmark...',
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // City
              TextFormField(
                controller: _cityController,
                decoration: InputDecoration(
                  labelText: isRTL ? 'المدينة' : 'City',
                  labelStyle: const TextStyle(color: Color(0xFF9E9E9E)),
                  floatingLabelStyle: const TextStyle(color: Color(0xFF9E9E9E)),
                  hintText: isRTL ? 'أدخل المدينة' : 'Enter city',
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // Country
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: DropdownButtonFormField<String>(
                  value: _selectedCountryCode,
                  decoration: InputDecoration(
                    labelText: isRTL ? 'الدولة' : 'Country',
                    labelStyle: const TextStyle(color: Color(0xFF9E9E9E)),
                    border: InputBorder.none,
                  ),
                  items: [
                    DropdownMenuItem(value: 'SA', child: Text(isRTL ? 'المملكة العربية السعودية' : 'Saudi Arabia')),
                    DropdownMenuItem(value: 'AE', child: Text(isRTL ? 'الإمارات' : 'UAE')),
                    DropdownMenuItem(value: 'EG', child: Text(isRTL ? 'مصر' : 'Egypt')),
                    DropdownMenuItem(value: 'KW', child: Text(isRTL ? 'الكويت' : 'Kuwait')),
                  ],
                  onChanged: (v) => setState(() => _selectedCountryCode = v ?? 'SA'),
                ),
              ),
              const SizedBox(height: 12),

              // Address Label
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: DropdownButtonFormField<String>(
                  value: _selectedLabel,
                  decoration: InputDecoration(
                    labelText: isRTL ? 'تصنيف العنوان' : 'Address Label',
                    labelStyle: const TextStyle(color: Color(0xFF9E9E9E)),
                    border: InputBorder.none,
                  ),
                  items: [
                    DropdownMenuItem(value: 'Home', child: Text(isRTL ? 'المنزل' : 'Home')),
                    DropdownMenuItem(value: 'Work', child: Text(isRTL ? 'العمل' : 'Work')),
                    DropdownMenuItem(value: 'Other', child: Text(isRTL ? 'أخرى' : 'Other')),
                  ],
                  onChanged: (v) => setState(() => _selectedLabel = v ?? 'Home'),
                ),
              ),
              const SizedBox(height: 12),

              // Delivery Notes
              TextFormField(
                controller: _deliveryNotesController,
                decoration: InputDecoration(
                  labelText: isRTL ? 'ملاحظات التوصيل (اختياري)' : 'Delivery Notes (Optional)',
                  labelStyle: const TextStyle(color: Color(0xFF9E9E9E)),
                  floatingLabelStyle: const TextStyle(color: Color(0xFF9E9E9E)),
                  hintText: isRTL ? 'أي تعليمات إضافية للتوصيل...' : 'Any extra delivery instructions...',
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // Location Picker
              GestureDetector(
                onTap: _pickLocation,
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.location_on,
                        color: (_selectedLat != null && _selectedLng != null)
                            ? AppTheme.accentColor
                            : Colors.grey,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: (_selectedLat != null && _selectedLng != null)
                            ? Text(
                                '${_selectedLat!.toStringAsFixed(4)}, ${_selectedLng!.toStringAsFixed(4)}',
                                style: const TextStyle(
                                  fontSize: 14,
                                  color: AppTheme.textPrimary,
                                ),
                              )
                            : Text(
                                isRTL
                                    ? 'اختر الموقع على الخريطة'
                                    : 'Set location on map',
                                style: TextStyle(color: Colors.grey.shade600),
                              ),
                      ),
                      const Icon(Icons.chevron_right),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Expertise — inline expandable dropdown
              _buildSectionTitle(isRTL ? 'التخصص' : 'Expertise'),
              const SizedBox(height: 12),
              Column(
                children: [
                  // Tappable field row
                  GestureDetector(
                    onTap: () => setState(() => _expertiseDropdownOpen = !_expertiseDropdownOpen),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.only(
                          topLeft: const Radius.circular(12),
                          topRight: const Radius.circular(12),
                          bottomLeft: Radius.circular(_expertiseDropdownOpen ? 0 : 12),
                          bottomRight: Radius.circular(_expertiseDropdownOpen ? 0 : 12),
                        ),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: _selectedExpertise.isEmpty
                                ? Text(
                                    isRTL ? 'اختر التخصص' : 'Select expertise',
                                    style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
                                  )
                                : Text(
                                    _selectedExpertise.join(', '),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontSize: 14),
                                  ),
                          ),
                          const SizedBox(width: 8),
                          AnimatedRotation(
                            turns: _expertiseDropdownOpen ? 0.5 : 0,
                            duration: const Duration(milliseconds: 200),
                            child: const Icon(Icons.keyboard_arrow_down, color: Color(0xFF9E9E9E)),
                          ),
                        ],
                      ),
                    ),
                  ),
                  // Expandable checkbox list
                  if (_expertiseDropdownOpen)
                    Container(
                      constraints: const BoxConstraints(maxHeight: 220),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: const BorderRadius.only(
                          bottomLeft: Radius.circular(12),
                          bottomRight: Radius.circular(12),
                        ),
                        border: Border.all(color: const Color(0xFFE0E0E0)),
                      ),
                      child: SingleChildScrollView(
                        child: Column(
                          children: _availableExpertise.map((exp) {
                            final isSelected = _selectedExpertise.contains(exp);
                            return CheckboxListTile(
                              value: isSelected,
                              dense: true,
                              activeColor: AppTheme.accentColor,
                              title: Text(exp, style: const TextStyle(fontSize: 14)),
                              onChanged: (v) {
                                setState(() {
                                  if (v == true) {
                                    _selectedExpertise.add(exp);
                                  } else {
                                    _selectedExpertise.remove(exp);
                                  }
                                });
                              },
                            );
                          }).toList(),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 24),

              // Fulfillment Methods
              _buildSectionTitle(isRTL ? 'طرق التوصيل' : 'Delivery Methods'),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: [
                    _buildCheckboxTile(
                      isRTL ? 'توصيل' : 'Delivery',
                      'delivery',
                      Icons.local_shipping,
                    ),
                    const Divider(),
                    _buildCheckboxTile(
                      isRTL ? 'استلام من المطعم' : 'Pickup',
                      'pickup',
                      Icons.storefront,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Phone Number
              _buildSectionTitle(isRTL ? 'رقم الهاتف' : 'Phone Number'),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.phone_outlined, color: AppTheme.textSecondary, size: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _currentPhone?.isNotEmpty == true
                            ? _currentPhone!
                            : (isRTL ? 'لم يتم إضافة رقم هاتف' : 'No phone number added'),
                        style: TextStyle(
                          fontSize: 14,
                          color: _currentPhone?.isNotEmpty == true
                              ? AppTheme.textPrimary
                              : Colors.grey.shade500,
                        ),
                      ),
                    ),
                    TextButton(
                      onPressed: () => _showPhoneVerificationSheet(isRTL),
                      child: Text(
                        isRTL ? 'تغيير والتحقق' : 'Change & Verify',
                        style: const TextStyle(
                          color: AppTheme.accentColor,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              // Save Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isSaving ? null : _saveProfile,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.accentColor,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: _isSaving
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : Text(
                          isRTL ? 'حفظ التغييرات' : 'Save Changes',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showPhoneVerificationSheet(bool isRTL) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          padding: const EdgeInsets.all(20),
          child: PhoneVerificationWidget(
            titleOverride: isRTL
                ? 'تغيير رقم الهاتف والتحقق منه'
                : 'Change & verify phone number',
            onVerified: () {
              Navigator.pop(context);
              // Reload profile to get the updated phone number
              final token = context.read<AuthProvider>().token;
              if (token != null) {
                context.read<CookProfileProvider>().fetchProfile(token).then((_) {
                  if (mounted) {
                    setState(() {
                      _currentPhone = context.read<CookProfileProvider>().phone;
                    });
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                      content: Text(isRTL
                          ? 'تم التحقق من رقم الهاتف بنجاح'
                          : 'Phone number verified successfully'),
                      backgroundColor: Colors.green,
                    ));
                  }
                });
              }
            },
            onCancelled: () => Navigator.pop(context),
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.bold,
        color: AppTheme.textPrimary,
      ),
    );
  }

  Widget _buildCheckboxTile(String title, String value, IconData icon) {
    final isSelected = _selectedFulfillment.contains(value);
    return GestureDetector(
      onTap: () {
        setState(() {
          if (isSelected) {
            _selectedFulfillment.remove(value);
          } else {
            _selectedFulfillment.add(value);
          }
        });
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: [
            Icon(icon, color: isSelected ? AppTheme.accentColor : Colors.grey),
            const SizedBox(width: 12),
            Expanded(child: Text(title)),
            Checkbox(
              value: isSelected,
              onChanged: (checked) {
                setState(() {
                  if (checked == true) {
                    _selectedFulfillment.add(value);
                  } else {
                    _selectedFulfillment.remove(value);
                  }
                });
              },
              activeColor: AppTheme.accentColor,
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _storeNameController.dispose();
    _bioController.dispose();
    _cityController.dispose();
    _addressLine1Controller.dispose();
    _addressLine2Controller.dispose();
    _deliveryNotesController.dispose();
    super.dispose();
  }
}
