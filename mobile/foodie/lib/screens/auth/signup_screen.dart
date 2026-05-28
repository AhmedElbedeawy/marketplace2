import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../config/api_config.dart';
import '../../config/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/language_provider.dart';
import '../../utils/auth_validators.dart';
import '../../utils/image_url_utils.dart';
import '../../widgets/app_toggle.dart';
import '../../widgets/map_picker.dart';
import '../../widgets/phone_verification_widget.dart';

class SignUpScreen extends StatefulWidget {
  const SignUpScreen({Key? key}) : super(key: key);

  @override
  State<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends State<SignUpScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _emailOrPhoneController;
  late TextEditingController _passwordController;
  late TextEditingController _confirmPasswordController;
  // Cook fields
  late TextEditingController _storeNameController;
  late TextEditingController _cityController;
  late TextEditingController _addressLine1Controller;
  late TextEditingController _addressLine2Controller;
  late TextEditingController _deliveryNotesController;
  late TextEditingController _bioController;
  String _selectedCookLabel = 'Home';
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _agreedToTerms = false;
  bool _requestCook = false;
  // Phone signup OTP gate: show verification widget before registering
  bool _showPhoneVerification = false;
  bool _phoneVerified = false;

  // Cook expertise
  List<Map<String, dynamic>> _expertiseOptions = [];
  final List<String> _selectedExpertise = [];
  bool _loadingExpertise = false;

  // Cook location
  double _cookLat = 0;
  double _cookLng = 0;
  bool _locationPicked = false;
  String _cookCountryCode = 'SA';

  // Kitchen image
  String? _kitchenImageBase64;
  bool _pickingImage = false;

  // Questionnaire
  String _experienceLevel = '';
  String _totalOrders = '';
  String _dailyOrders = '';
  final List<String> _fulfillmentMethods = [];

  final ImagePicker _imagePicker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController();
    _emailOrPhoneController = TextEditingController();
    _passwordController = TextEditingController();
    _confirmPasswordController = TextEditingController();
    _storeNameController = TextEditingController();
    _cityController = TextEditingController();
    _addressLine1Controller = TextEditingController();
    _addressLine2Controller = TextEditingController();
    _deliveryNotesController = TextEditingController();
    _bioController = TextEditingController();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailOrPhoneController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _storeNameController.dispose();
    _cityController.dispose();
    _addressLine1Controller.dispose();
    _addressLine2Controller.dispose();
    _deliveryNotesController.dispose();
    _bioController.dispose();
    super.dispose();
  }

  Future<void> _fetchExpertise() async {
    if (_expertiseOptions.isNotEmpty || _loadingExpertise) return;
    setState(() => _loadingExpertise = true);
    try {
      final response = await http.get(Uri.parse(ApiConfig.getExpertise));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final list = data is List ? data : (data['data'] ?? data['expertise'] ?? []);
        if (mounted) {
          setState(() {
            _expertiseOptions = List<Map<String, dynamic>>.from(list);
          });
        }
      }
    } catch (_) {}
    if (mounted) setState(() => _loadingExpertise = false);
  }

  Future<void> _pickKitchenImage() async {
    final image = await _imagePicker.pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (image == null || !mounted) return;
    setState(() => _pickingImage = true);
    try {
      final bytes = await image.readAsBytes();
      setState(() {
        _kitchenImageBase64 = 'data:image/jpeg;base64,${base64Encode(bytes)}';
        _pickingImage = false;
      });
    } catch (_) {
      if (mounted) setState(() => _pickingImage = false);
    }
  }

  String? _getRedirectTo() {
    final args = ModalRoute.of(context)?.settings.arguments;
    if (args is Map) return args['redirectTo'] as String?;
    return null;
  }

  void _navigateAfterAuth() {
    final redirectTo = _getRedirectTo();
    if (redirectTo != null) {
      Navigator.of(context).pushReplacementNamed(redirectTo);
    } else {
      Navigator.of(context).pushReplacementNamed('/home');
    }
  }

  void _handleSignUp() async {
    if (!_formKey.currentState!.validate()) return;

    if (!_agreedToTerms) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Please agree to Terms and Conditions'),
        backgroundColor: AppTheme.errorColor,
      ));
      return;
    }

    if (_passwordController.text != _confirmPasswordController.text) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Passwords do not match'),
        backgroundColor: AppTheme.errorColor,
      ));
      return;
    }

    if (_requestCook && !_locationPicked) {
      final isRTL = context.read<LanguageProvider>().isArabic;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(isRTL
            ? 'يرجى تحديد موقع المطبخ على الخريطة'
            : 'Please pick your kitchen location on the map'),
        backgroundColor: AppTheme.errorColor,
      ));
      return;
    }

    final credential = _emailOrPhoneController.text.trim();
    final isPhone = AuthValidators.isValidPhoneNumber(credential);

    // Phone signup: require OTP verification before registering
    if (isPhone && !_phoneVerified) {
      setState(() => _showPhoneVerification = true);
      return;
    }

    await _doRegister();
  }

  Future<void> _doRegister() async {
    final authProvider = context.read<AuthProvider>();
    final success = await authProvider.register(
      name: _nameController.text.trim(),
      email: _emailOrPhoneController.text.trim(),
      password: _passwordController.text,
      requestCook: _requestCook,
      storeName: _requestCook ? _storeNameController.text.trim() : null,
      expertise: _requestCook ? _selectedExpertise : null,
      bio: _requestCook ? _bioController.text.trim() : null,
      city: _requestCook ? _cityController.text.trim() : null,
      addressLine1: _requestCook ? _addressLine1Controller.text.trim() : null,
      addressLine2: _requestCook && _addressLine2Controller.text.trim().isNotEmpty ? _addressLine2Controller.text.trim() : null,
      label: _requestCook ? _selectedCookLabel : null,
      deliveryNotes: _requestCook && _deliveryNotesController.text.trim().isNotEmpty ? _deliveryNotesController.text.trim() : null,
      lat: (_requestCook && _locationPicked) ? _cookLat : null,
      lng: (_requestCook && _locationPicked) ? _cookLng : null,
      cookCountryCode: _requestCook ? _cookCountryCode : null,
      kitchenImage: _requestCook ? _kitchenImageBase64 : null,
      questionnaire: _requestCook ? {
        'experienceLevel': _experienceLevel,
        'totalOrders': _totalOrders,
        'dailyOrders': _dailyOrders,
        'fulfillmentMethods': _fulfillmentMethods,
      } : null,
    );

    if (success && mounted) {
      _navigateAfterAuth();
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(authProvider.error ?? 'Registration failed'),
        backgroundColor: AppTheme.errorColor,
      ));
    }
  }

  void _handleGoogleSignUp() async {
    final authProvider = context.read<AuthProvider>();
    final success = await authProvider.loginWithGoogle();
    if (!mounted) return;

    if (success) {
      _navigateAfterAuth();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(authProvider.error ?? 'Google sign up failed'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
    }
  }

  Widget _buildSocialButton({
    required String icon,
    required String text,
    required VoidCallback? onPressed,
    required Color backgroundColor,
    required Color textColor,
  }) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        color: backgroundColor,
        border: Border.all(color: const Color(0xFFE0E0E0), width: 1),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 14),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Image.asset(
                  icon,
                  width: 20,
                  height: 20,
                ),
                const SizedBox(width: 12),
                Text(
                  text,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: textColor,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final authProvider = context.watch<AuthProvider>();
    final isRTL = languageProvider.isArabic;

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(isRTL),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        isRTL ? 'إنشاء حساب جديد' : 'Create Account',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        isRTL
                            ? 'استمر لاستكشاف الأطباق المنزلية'
                            : 'Continue to explore homemade dishes',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w400,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 32),
                      _buildTextField(
                        controller: _nameController,
                        label: isRTL ? 'الاسم الكامل' : 'Full Name',
                        icon: Icons.person_outline,
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return isRTL ? 'الرجاء إدخال الاسم' : 'Please enter your name';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      _buildTextField(
                        controller: _emailOrPhoneController,
                        label: isRTL ? 'البريد الإلكتروني أو رقم الهاتف' : 'Email or phone number',
                        icon: Icons.email_outlined,
                        keyboardType: TextInputType.emailAddress,
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return isRTL ? 'الرجاء إدخال البريد الإلكتروني أو رقم الهاتف' : 'Please enter email or phone number';
                          }
                          if (!AuthValidators.isValidEmailOrPhone(value)) {
                            return isRTL ? 'بريد إلكتروني أو رقم هاتف غير صحيح' : 'Invalid email or phone number';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      _buildTextField(
                        controller: _passwordController,
                        label: isRTL ? 'كلمة المرور' : 'Password',
                        icon: Icons.lock_outlined,
                        obscureText: _obscurePassword,
                        suffixIcon: IconButton(
                          icon: Icon(
                            _obscurePassword ? Icons.visibility_off : Icons.visibility,
                          ),
                          onPressed: () {
                            setState(() {
                              _obscurePassword = !_obscurePassword;
                            });
                          },
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return isRTL ? 'الرجاء إدخال كلمة المرور' : 'Please enter password';
                          }
                          if (value.length < 6) {
                            return isRTL ? 'كلمة المرور قصيرة جداً' : 'Password too short';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      _buildTextField(
                        controller: _confirmPasswordController,
                        label: isRTL ? 'تأكيد كلمة المرور' : 'Confirm Password',
                        icon: Icons.lock_outlined,
                        obscureText: _obscureConfirmPassword,
                        suffixIcon: IconButton(
                          icon: Icon(
                            _obscureConfirmPassword ? Icons.visibility_off : Icons.visibility,
                          ),
                          onPressed: () {
                            setState(() {
                              _obscureConfirmPassword = !_obscureConfirmPassword;
                            });
                          },
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return isRTL ? 'الرجاء تأكيد كلمة المرور' : 'Please confirm password';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              isRTL ? 'طلب الانضمام كشيف' : 'Request to join as a Cook',
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                            ),
                          ),
                          const SizedBox(width: 16),
                          AppToggle(
                            value: _requestCook,
                            onChanged: (value) {
                              setState(() {
                                _requestCook = value;
                              });
                              if (value) _fetchExpertise();
                            },
                          ),
                        ],
                      ),
                      if (_requestCook) ...[
                        const SizedBox(height: 20),
                        _buildSectionLabel(isRTL ? 'معلومات المطبخ' : 'Kitchen Info', isRTL),
                        const SizedBox(height: 12),
                        _buildTextField(
                          controller: _storeNameController,
                          label: isRTL ? 'اسم المطبخ' : 'Kitchen Name',
                          validator: (value) {
                            if (_requestCook && (value == null || value.isEmpty)) {
                              return isRTL ? 'الرجاء إدخال اسم المطبخ' : 'Please enter kitchen name';
                            }
                            return null;
                          },
                        ),
                        // Address block — unified order: Line1/Line2/City/Country/Label/Notes/Map
                        const SizedBox(height: 12),
                        _buildTextField(
                          controller: _addressLine1Controller,
                          label: isRTL ? 'سطر العنوان الأول' : 'Address Line 1',
                          hint: isRTL ? 'أدخل العنوان' : 'Enter address',
                        ),
                        const SizedBox(height: 12),
                        _buildTextField(
                          controller: _addressLine2Controller,
                          label: isRTL ? 'سطر العنوان الثاني (اختياري)' : 'Address Line 2 (Optional)',
                          hint: isRTL ? 'شقة، طابق...' : 'Apt, Floor, etc.',
                        ),
                        const SizedBox(height: 12),
                        _buildTextField(
                          controller: _cityController,
                          label: isRTL ? 'المدينة' : 'City',
                          validator: (value) {
                            if (_requestCook && (value == null || value.isEmpty)) {
                              return isRTL ? 'الرجاء إدخال المدينة' : 'Please enter city';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 12),
                        DropdownButtonFormField<String>(
                          value: _cookCountryCode,
                          decoration: InputDecoration(
                            labelText: isRTL ? 'الدولة' : 'Country',
                            filled: true,
                            fillColor: Colors.white,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide.none,
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(color: Color(0xFFE0E0E0)),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: AppTheme.accentColor),
                            ),
                          ),
                          items: [
                            DropdownMenuItem(value: 'SA', child: Text(isRTL ? 'المملكة العربية السعودية' : 'Saudi Arabia')),
                            DropdownMenuItem(value: 'AE', child: Text(isRTL ? 'الإمارات' : 'UAE')),
                            DropdownMenuItem(value: 'EG', child: Text(isRTL ? 'مصر' : 'Egypt')),
                            DropdownMenuItem(value: 'KW', child: Text(isRTL ? 'الكويت' : 'Kuwait')),
                          ],
                          onChanged: (value) {
                            if (value != null) setState(() => _cookCountryCode = value);
                          },
                        ),
                        const SizedBox(height: 12),
                        DropdownButtonFormField<String>(
                          value: _selectedCookLabel,
                          decoration: InputDecoration(
                            labelText: isRTL ? 'التصنيف' : 'Label',
                            filled: true,
                            fillColor: Colors.white,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide.none,
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(color: Color(0xFFE0E0E0)),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: AppTheme.accentColor),
                            ),
                          ),
                          items: [
                            DropdownMenuItem(value: 'Home', child: Text(isRTL ? 'المنزل' : 'Home')),
                            DropdownMenuItem(value: 'Work', child: Text(isRTL ? 'العمل' : 'Work')),
                            DropdownMenuItem(value: 'Other', child: Text(isRTL ? 'أخرى' : 'Other')),
                          ],
                          onChanged: (value) {
                            if (value != null) setState(() => _selectedCookLabel = value);
                          },
                        ),
                        const SizedBox(height: 12),
                        _buildTextField(
                          controller: _deliveryNotesController,
                          label: isRTL ? 'ملاحظات التوصيل (اختياري)' : 'Delivery Notes (Optional)',
                          hint: isRTL ? 'أي تعليمات خاصة...' : 'Any special instructions...',
                          maxLines: 3,
                        ),
                        const SizedBox(height: 12),
                        // Map location picker
                        OutlinedButton.icon(
                          onPressed: () async {
                            final result = await Navigator.push<LatLng>(
                              context,
                              MaterialPageRoute(
                                builder: (_) => MapPicker(
                                  initialLat: _locationPicked ? _cookLat : 24.7136,
                                  initialLng: _locationPicked ? _cookLng : 46.6753,
                                  title: isRTL ? 'اختر موقع المطبخ' : 'Pick Kitchen Location',
                                ),
                              ),
                            );
                            if (result != null && mounted) {
                              setState(() {
                                _cookLat = result.latitude;
                                _cookLng = result.longitude;
                                _locationPicked = true;
                              });
                            }
                          },
                          icon: Icon(_locationPicked ? Icons.check_circle_outline : Icons.map_outlined,
                              color: _locationPicked ? Colors.green : AppTheme.accentColor),
                          label: Text(
                            _locationPicked
                                ? (isRTL ? 'تم تحديد الموقع ✓' : 'Location picked ✓')
                                : (isRTL ? 'تحديد موقع المطبخ على الخريطة' : 'Pick Kitchen Location on Map'),
                            style: TextStyle(
                              color: _locationPicked ? Colors.green : AppTheme.accentColor,
                            ),
                          ),
                          style: OutlinedButton.styleFrom(
                            side: BorderSide(color: _locationPicked ? Colors.green : AppTheme.accentColor),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                        const SizedBox(height: 12),
                        // Kitchen image picker
                        GestureDetector(
                          onTap: _pickingImage ? null : _pickKitchenImage,
                          child: Container(
                            height: 120,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: const Color(0xFFE0E0E0)),
                            ),
                            child: _pickingImage
                                ? const Center(child: CircularProgressIndicator())
                                : _kitchenImageBase64 != null
                                    ? ClipRRect(
                                        borderRadius: BorderRadius.circular(11),
                                        child: Image(
                                          image: getImageProvider(_kitchenImageBase64!),
                                          width: double.infinity,
                                          height: 120,
                                          fit: BoxFit.cover,
                                        ),
                                      )
                                    : Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          const Icon(Icons.add_photo_alternate_outlined, size: 36, color: Color(0xFF9E9E9E)),
                                          const SizedBox(height: 6),
                                          Text(
                                            isRTL ? 'أضف صورة المطبخ' : 'Add Kitchen Photo',
                                            style: const TextStyle(fontSize: 13, color: Color(0xFF9E9E9E)),
                                          ),
                                        ],
                                      ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        // Expertise multi-select
                        _buildSectionLabel(isRTL ? 'التخصص' : 'Expertise', isRTL),
                        const SizedBox(height: 8),
                        if (_loadingExpertise)
                          const Center(child: CircularProgressIndicator())
                        else if (_expertiseOptions.isEmpty)
                          TextButton.icon(
                            onPressed: _fetchExpertise,
                            icon: const Icon(Icons.refresh, size: 16),
                            label: Text(isRTL ? 'إعادة تحميل قائمة التخصصات' : 'Reload expertise list'),
                          )
                        else
                          Wrap(
                                    spacing: 8,
                                    runSpacing: 8,
                                    children: _expertiseOptions.map((opt) {
                                      final id = opt['_id']?.toString() ?? opt['name']?.toString() ?? '';
                                      final label = isRTL
                                          ? (opt['nameAr'] ?? opt['name'] ?? id)
                                          : (opt['name'] ?? id);
                                      final selected = _selectedExpertise.contains(id);
                                      return FilterChip(
                                        label: Text(label.toString()),
                                        selected: selected,
                                        onSelected: (val) {
                                          setState(() {
                                            if (val) {
                                              _selectedExpertise.add(id);
                                            } else {
                                              _selectedExpertise.remove(id);
                                            }
                                          });
                                        },
                                        selectedColor: AppTheme.accentColor.withValues(alpha: 0.2),
                                        checkmarkColor: AppTheme.accentColor,
                                        labelStyle: TextStyle(
                                          color: selected ? AppTheme.accentColor : AppTheme.textSecondary,
                                          fontSize: 13,
                                        ),
                                      );
                                    }).toList(),
                                  ),
                        const SizedBox(height: 12),
                        _buildTextField(
                          controller: _bioController,
                          label: isRTL ? 'نبذة عن المطبخ' : 'About your kitchen',
                          icon: Icons.info_outline,
                          keyboardType: TextInputType.multiline,
                        ),
                        const SizedBox(height: 20),
                        _buildSectionLabel(isRTL ? 'استبيان الانضمام' : 'Cook Questionnaire', isRTL),
                        const SizedBox(height: 12),
                        _buildRadioGroup(
                          label: isRTL ? 'مستوى الخبرة' : 'Experience Level',
                          value: _experienceLevel,
                          options: [
                            _RadioOption('beginner', isRTL ? 'مبتدئ' : 'Beginner'),
                            _RadioOption('intermediate', isRTL ? 'متوسط' : 'Intermediate'),
                            _RadioOption('professional', isRTL ? 'محترف' : 'Professional'),
                          ],
                          onChanged: (v) => setState(() => _experienceLevel = v),
                        ),
                        const SizedBox(height: 12),
                        _buildRadioGroup(
                          label: isRTL ? 'إجمالي الطلبات السابقة' : 'Total Previous Orders',
                          value: _totalOrders,
                          options: [
                            const _RadioOption('0-100', '0 - 100'),
                            const _RadioOption('100-500', '100 - 500'),
                            const _RadioOption('500-1000', '500 - 1000'),
                            const _RadioOption('1000+', '1000+'),
                          ],
                          onChanged: (v) => setState(() => _totalOrders = v),
                        ),
                        const SizedBox(height: 12),
                        _buildRadioGroup(
                          label: isRTL ? 'الطلبات اليومية المتوقعة' : 'Expected Daily Orders',
                          value: _dailyOrders,
                          options: [
                            const _RadioOption('1-5', '1 - 5'),
                            const _RadioOption('5-15', '5 - 15'),
                            const _RadioOption('15-30', '15 - 30'),
                            const _RadioOption('30+', '30+'),
                          ],
                          onChanged: (v) => setState(() => _dailyOrders = v),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          isRTL ? 'طرق التوصيل' : 'Fulfillment Methods',
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
                        ),
                        const SizedBox(height: 6),
                        ...[
                          _CheckOption('delivery', isRTL ? 'توصيل' : 'Delivery'),
                          _CheckOption('pickup', isRTL ? 'استلام' : 'Pickup'),
                        ].map((opt) => CheckboxListTile(
                              title: Text(opt.label, style: const TextStyle(fontSize: 14)),
                              value: _fulfillmentMethods.contains(opt.value),
                              onChanged: (val) {
                                setState(() {
                                  if (val == true) {
                                    _fulfillmentMethods.add(opt.value);
                                  } else {
                                    _fulfillmentMethods.remove(opt.value);
                                  }
                                });
                              },
                              activeColor: AppTheme.accentColor,
                              contentPadding: EdgeInsets.zero,
                              dense: true,
                            )),
                      ],
                      const SizedBox(height: 20),
                      Row(
                        children: [
                          SizedBox(
                            width: 24,
                            height: 24,
                            child: Checkbox(
                              value: _agreedToTerms,
                              onChanged: (value) {
                                setState(() {
                                  _agreedToTerms = value ?? false;
                                });
                              },
                              activeColor: AppTheme.accentColor,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(4),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: GestureDetector(
                              onTap: () {
                                setState(() {
                                  _agreedToTerms = !_agreedToTerms;
                                });
                              },
                              child: Text.rich(
                                TextSpan(
                                  text: isRTL ? 'أوافق على ' : 'I agree to ',
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w400,
                                    color: AppTheme.textSecondary,
                                  ),
                                  children: [
                                    TextSpan(
                                      text: isRTL ? 'الشروط والأحكام' : 'Terms & Conditions',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w600,
                                        color: AppTheme.accentColor,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 32),
                      // Phone signup: show OTP widget inline before allowing submit
                      if (_showPhoneVerification && !_phoneVerified) ...[
                        PhoneVerificationWidget(
                          initialPhone: _emailOrPhoneController.text.trim(),
                          titleOverride: isRTL
                              ? 'تحقق من رقم هاتفك للمتابعة'
                              : 'Verify your phone number to continue',
                          onVerified: () {
                            setState(() {
                              _phoneVerified = true;
                              _showPhoneVerification = false;
                            });
                            _doRegister();
                          },
                          onCancelled: () => setState(() => _showPhoneVerification = false),
                        ),
                        const SizedBox(height: 16),
                      ],
                      ElevatedButton(
                        onPressed: authProvider.isLoading ? null : _handleSignUp,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFFF7A00),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        child: authProvider.isLoading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : Text(
                                isRTL ? 'إنشاء حساب' : 'Sign Up',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.white,
                                ),
                              ),
                      ),
                      const SizedBox(height: 24),
                      Row(
                        children: [
                          const Expanded(child: Divider(color: Color(0xFFD9D9D9), height: 1)),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            child: Text(
                              isRTL ? 'أو' : 'Or',
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                                color: Color(0xFF747474),
                              ),
                            ),
                          ),
                          const Expanded(child: Divider(color: Color(0xFFD9D9D9), height: 1)),
                        ],
                      ),
                      const SizedBox(height: 30),
                      _buildSocialButton(
                        icon: 'assets/icons/Google.png',
                        text: isRTL ? 'إنشاء حساب عبر جوجل' : 'Sign up with Google',
                        onPressed: authProvider.isLoading ? null : () => _handleGoogleSignUp(),
                        backgroundColor: Colors.white,
                        textColor: const Color(0xFF747474),
                      ),
                      const SizedBox(height: 30),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            isRTL ? 'لديك حساب بالفعل؟ ' : 'Already have an account? ',
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w400,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                          TextButton(
                            onPressed: () {
                              Navigator.pop(context);
                            },
                            child: Text(
                              isRTL ? 'تسجيل الدخول' : 'Sign In',
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.accentColor,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionLabel(String text, bool isRTL) {
    return Text(
      text,
      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
    );
  }

  Widget _buildRadioGroup({
    required String label,
    required String value,
    required List<_RadioOption> options,
    required void Function(String) onChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
        const SizedBox(height: 4),
        Wrap(
          spacing: 8,
          children: options.map((opt) {
            final selected = value == opt.value;
            return ChoiceChip(
              label: Text(opt.label),
              selected: selected,
              onSelected: (_) => onChanged(opt.value),
              selectedColor: AppTheme.accentColor.withValues(alpha: 0.2),
              labelStyle: TextStyle(
                color: selected ? AppTheme.accentColor : AppTheme.textSecondary,
                fontSize: 13,
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildHeader(bool isRTL) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      child: Row(
        children: [
          IconButton(
            icon: Icon(
              Icons.arrow_back,
              color: AppTheme.textPrimary,
              size: 24,
            ),
            onPressed: () => Navigator.pop(context),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
          ),
        ],
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    IconData? icon,
    String? hint,
    bool obscureText = false,
    int? maxLines,
    Widget? suffixIcon,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      obscureText: obscureText,
      keyboardType: keyboardType,
      maxLines: obscureText ? 1 : (maxLines ?? 1),
      minLines: 1,
      validator: validator,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        hintStyle: const TextStyle(color: Colors.grey),
        labelStyle: const TextStyle(color: Colors.grey),
        prefixIcon: icon != null ? Icon(icon) : null,
        suffixIcon: suffixIcon,
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppTheme.dividerColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppTheme.dividerColor),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppTheme.accentColor, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppTheme.errorColor),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppTheme.errorColor, width: 2),
        ),
      ),
    );
  }
}

class _RadioOption {
  final String value;
  final String label;
  const _RadioOption(this.value, this.label);
}

class _CheckOption {
  final String value;
  final String label;
  const _CheckOption(this.value, this.label);
}
