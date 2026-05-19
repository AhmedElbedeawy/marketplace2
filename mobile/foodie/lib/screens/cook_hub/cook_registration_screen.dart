import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../config/api_config.dart';
import '../../config/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/language_provider.dart';
import '../../widgets/map_picker.dart';

class CookRegistrationScreen extends StatefulWidget {
  const CookRegistrationScreen({Key? key}) : super(key: key);

  @override
  State<CookRegistrationScreen> createState() => _CookRegistrationScreenState();
}

class _CookRegistrationScreenState extends State<CookRegistrationScreen> {
  int _activeStep = 0;
  bool _isLoading = false;
  String? _error;

  // Step 1 — Kitchen Info
  final _storeNameController = TextEditingController();
  final _cityController = TextEditingController();
  final _bioController = TextEditingController();
  double _lat = 24.7136;
  double _lng = 46.6753;
  bool _locationPicked = false;
  List<String> _selectedExpertise = [];
  List<Map<String, dynamic>> _expertiseOptions = [];
  bool _loadingExpertise = false;

  // Step 2 — Kitchen Photo
  String? _kitchenImageBase64;
  bool _pickingImage = false;
  final ImagePicker _imagePicker = ImagePicker();

  // Step 3 — Questionnaire
  String? _experienceLevel;
  String? _totalOrders;
  String? _dailyOrders;
  List<String> _fulfillmentMethods = [];

  @override
  void initState() {
    super.initState();
    _fetchExpertise();
  }

  @override
  void dispose() {
    _storeNameController.dispose();
    _cityController.dispose();
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
      if (mounted) {
        setState(() {
          _kitchenImageBase64 = 'data:image/jpeg;base64,${base64Encode(bytes)}';
          _pickingImage = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _pickingImage = false);
    }
  }

  bool _validateStep1(bool isRTL) {
    if (_storeNameController.text.trim().isEmpty) {
      setState(() => _error = isRTL ? 'الرجاء إدخال اسم المطبخ' : 'Please enter your kitchen name');
      return false;
    }
    if (_selectedExpertise.isEmpty) {
      setState(() => _error = isRTL ? 'الرجاء اختيار تخصص واحد على الأقل' : 'Please select at least one expertise');
      return false;
    }
    if (_cityController.text.trim().isEmpty) {
      setState(() => _error = isRTL ? 'الرجاء إدخال المدينة' : 'Please enter your city');
      return false;
    }
    if (!_locationPicked) {
      setState(() => _error = isRTL ? 'يرجى تحديد موقع المطبخ على الخريطة' : 'Please pick your kitchen location on the map');
      return false;
    }
    return true;
  }

  bool _validateStep2(bool isRTL) {
    if (_kitchenImageBase64 == null) {
      setState(() => _error = isRTL ? 'الرجاء رفع صورة للمطبخ' : 'Please upload a kitchen photo');
      return false;
    }
    return true;
  }

  void _handleNext(bool isRTL) {
    setState(() => _error = null);
    if (_activeStep == 0 && !_validateStep1(isRTL)) return;
    if (_activeStep == 1 && !_validateStep2(isRTL)) return;
    if (_activeStep < 2) setState(() => _activeStep++);
  }

  void _handleBack() {
    setState(() {
      _error = null;
      if (_activeStep > 0) _activeStep--;
    });
  }

  Future<void> _handleSubmit(bool isRTL) async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final authProvider = context.read<AuthProvider>();
      final token = authProvider.token;
      if (token == null) throw Exception('Not authenticated');

      final body = jsonEncode({
        'storeName': _storeNameController.text.trim(),
        'expertise': _selectedExpertise,
        'bio': _bioController.text.trim(),
        'city': _cityController.text.trim(),
        'lat': _lat,
        'lng': _lng,
        'location': {'lat': _lat, 'lng': _lng},
        if (_kitchenImageBase64 != null) 'profilePhoto': _kitchenImageBase64,
        'questionnaire': {
          'experienceLevel': _experienceLevel ?? '',
          'totalOrders': _totalOrders ?? '',
          'dailyOrders': _dailyOrders ?? '',
          'fulfillmentMethods': _fulfillmentMethods,
        },
      });

      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/cooks/register'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: body,
      ).timeout(const Duration(seconds: 30));

      if (response.statusCode == 200 || response.statusCode == 201) {
        // Refresh user state
        await authProvider.fetchUserProfile();
        if (mounted) {
          Navigator.of(context).pushReplacementNamed('/cook-status');
        }
      } else {
        final data = jsonDecode(response.body);
        setState(() => _error = data['message'] ?? (isRTL ? 'فشل إرسال الطلب' : 'Registration failed'));
      }
    } catch (e) {
      setState(() => _error = isRTL ? 'حدث خطأ، يرجى المحاولة لاحقاً' : 'An error occurred. Please try again.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isRTL = context.watch<LanguageProvider>().isArabic;

    final steps = [
      isRTL ? 'معلومات المطبخ' : 'Kitchen Info',
      isRTL ? 'صور المطبخ' : 'Kitchen Photo',
      isRTL ? 'استبيان' : 'Questionnaire',
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF8F8F8),
      appBar: AppBar(
        title: Text(isRTL ? 'سجل كشيف' : 'Become a Cook'),
        backgroundColor: Colors.white,
        foregroundColor: AppTheme.textPrimary,
        elevation: 0,
      ),
      body: Column(
        children: [
          // Step indicator
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: List.generate(steps.length, (i) {
                final isActive = i == _activeStep;
                final isDone = i < _activeStep;
                return Expanded(
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Container(
                                  width: 28,
                                  height: 28,
                                  decoration: BoxDecoration(
                                    color: isDone || isActive
                                        ? const Color(0xFFFF7A00)
                                        : const Color(0xFFE0E0E0),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Center(
                                    child: isDone
                                        ? const Icon(Icons.check, size: 16, color: Colors.white)
                                        : Text(
                                            '${i + 1}',
                                            style: TextStyle(
                                              color: isActive ? Colors.white : const Color(0xFF9E9E9E),
                                              fontWeight: FontWeight.bold,
                                              fontSize: 13,
                                            ),
                                          ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              steps[i],
                              style: TextStyle(
                                fontSize: 11,
                                color: isActive || isDone
                                    ? const Color(0xFFFF7A00)
                                    : const Color(0xFF9E9E9E),
                                fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),
                      if (i < steps.length - 1)
                        Container(
                          width: 24,
                          height: 2,
                          color: i < _activeStep
                              ? const Color(0xFFFF7A00)
                              : const Color(0xFFE0E0E0),
                        ),
                    ],
                  ),
                );
              }),
            ),
          ),

          // Content
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (_error != null)
                    Container(
                      width: double.infinity,
                      margin: const EdgeInsets.only(bottom: 16),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFEBEE),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFEF9A9A)),
                      ),
                      child: Text(
                        _error!,
                        style: const TextStyle(color: Color(0xFFC62828), fontSize: 13),
                      ),
                    ),

                  if (_activeStep == 0) _buildStep1(isRTL),
                  if (_activeStep == 1) _buildStep2(isRTL),
                  if (_activeStep == 2) _buildStep3(isRTL),
                ],
              ),
            ),
          ),

          // Nav buttons
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            child: SafeArea(
              top: false,
              child: Row(
                children: [
                  if (_activeStep > 0)
                    OutlinedButton(
                      onPressed: _isLoading ? null : _handleBack,
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFFE0E0E0)),
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: Text(
                        isRTL ? 'رجوع' : 'Back',
                        style: const TextStyle(color: AppTheme.textSecondary),
                      ),
                    ),
                  if (_activeStep > 0) const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _isLoading
                          ? null
                          : () {
                              if (_activeStep < 2) {
                                _handleNext(isRTL);
                              } else {
                                _handleSubmit(isRTL);
                              }
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFFF7A00),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        elevation: 0,
                      ),
                      child: _isLoading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : Text(
                              _activeStep < 2
                                  ? (isRTL ? 'التالي' : 'Next')
                                  : (isRTL ? 'إرسال الطلب' : 'Submit Application'),
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                                fontSize: 15,
                              ),
                            ),
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

  Widget _buildStep1(bool isRTL) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionLabel(isRTL ? 'اسم المطبخ *' : 'Kitchen Name *'),
        const SizedBox(height: 8),
        TextFormField(
          controller: _storeNameController,
          textDirection: isRTL ? TextDirection.rtl : TextDirection.ltr,
          decoration: _inputDecoration(
            hint: isRTL ? 'مثال: مطبخ أم حسن' : 'e.g., Um Hassan\'s Kitchen',
          ),
        ),
        const SizedBox(height: 20),

        _sectionLabel(isRTL ? 'التخصص *' : 'Area of Expertise *'),
        const SizedBox(height: 8),
        if (_loadingExpertise)
          const Center(child: CircularProgressIndicator(color: Color(0xFFFF7A00)))
        else if (_expertiseOptions.isEmpty)
          TextButton.icon(
            onPressed: _fetchExpertise,
            icon: const Icon(Icons.refresh, size: 16, color: Color(0xFFFF7A00)),
            label: Text(
              isRTL ? 'إعادة تحميل قائمة التخصصات' : 'Reload expertise list',
              style: const TextStyle(color: Color(0xFFFF7A00)),
            ),
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
                selectedColor: const Color(0xFFFF7A00).withValues(alpha: 0.15),
                checkmarkColor: const Color(0xFFFF7A00),
                backgroundColor: const Color(0xFFF5F5F5),
                labelStyle: TextStyle(
                  color: selected ? const Color(0xFFFF7A00) : AppTheme.textSecondary,
                  fontSize: 13,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                  side: BorderSide(
                    color: selected ? const Color(0xFFFF7A00) : Colors.transparent,
                  ),
                ),
              );
            }).toList(),
          ),
        const SizedBox(height: 20),

        _sectionLabel(isRTL ? 'المدينة *' : 'City *'),
        const SizedBox(height: 8),
        TextFormField(
          controller: _cityController,
          textDirection: isRTL ? TextDirection.rtl : TextDirection.ltr,
          decoration: _inputDecoration(
            hint: isRTL ? 'مثال: الرياض، القاهرة' : 'e.g., Riyadh, Cairo',
          ),
        ),
        const SizedBox(height: 20),

        OutlinedButton.icon(
          onPressed: () async {
            final LatLng? result = await Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => MapPicker(
                  initialLat: _lat,
                  initialLng: _lng,
                  title: isRTL ? 'اختر موقع المطبخ' : 'Pick Kitchen Location',
                ),
              ),
            );
            if (result != null) {
              setState(() {
                _lat = result.latitude;
                _lng = result.longitude;
                _locationPicked = true;
              });
            }
          },
          style: OutlinedButton.styleFrom(
            side: const BorderSide(color: Color(0xFFFF7A00)),
            foregroundColor: const Color(0xFFFF7A00),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          ),
          icon: const Icon(Icons.map_outlined, size: 18),
          label: Text(isRTL ? 'تحديد موقع المطبخ على الخريطة' : 'Pick Kitchen Location on Map'),
        ),
        const SizedBox(height: 6),
        Text(
          'Lat: ${_lat.toStringAsFixed(4)}, Lng: ${_lng.toStringAsFixed(4)}',
          style: const TextStyle(fontSize: 12, color: Color(0xFF9E9E9E)),
        ),
        const SizedBox(height: 20),

        _sectionLabel(isRTL ? 'نبذة (اختياري)' : 'Bio (Optional)'),
        const SizedBox(height: 8),
        TextFormField(
          controller: _bioController,
          textDirection: isRTL ? TextDirection.rtl : TextDirection.ltr,
          minLines: 1,
          maxLines: 8,
          keyboardType: TextInputType.multiline,
          decoration: _inputDecoration(
            hint: isRTL
                ? 'أخبرنا عن نفسك وعن أسلوبك في الطبخ...'
                : 'Tell us about yourself and your cooking style...',
          ),
        ),
      ],
    );
  }

  Widget _buildStep2(bool isRTL) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Text(
          isRTL
              ? 'ارفع صورة لمطبخك أو صورة تعبر عن عملك'
              : 'Upload a photo of your kitchen or a representative image',
          style: const TextStyle(fontSize: 14, color: Color(0xFF6B7280)),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 24),

        GestureDetector(
          onTap: _pickingImage ? null : _pickKitchenImage,
          child: Container(
            width: 180,
            height: 214,
            decoration: BoxDecoration(
              color: const Color(0xFFF5F5F5),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: _kitchenImageBase64 != null
                    ? const Color(0xFFFF7A00)
                    : const Color(0xFFE0E0E0),
                width: _kitchenImageBase64 != null ? 2 : 1,
                style: _kitchenImageBase64 == null ? BorderStyle.solid : BorderStyle.solid,
              ),
            ),
            clipBehavior: Clip.antiAlias,
            child: _pickingImage
                ? const Center(child: CircularProgressIndicator(color: Color(0xFFFF7A00)))
                : _kitchenImageBase64 != null
                    ? Image.memory(
                        base64Decode(_kitchenImageBase64!.split(',').last),
                        fit: BoxFit.cover,
                      )
                    : Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.add_photo_alternate_outlined,
                              size: 40, color: Color(0xFFBDBDBD)),
                          const SizedBox(height: 8),
                          Text(
                            isRTL ? 'اضغط لإضافة صورة' : 'Tap to add photo',
                            style: const TextStyle(fontSize: 12, color: Color(0xFF9E9E9E)),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
          ),
        ),
        const SizedBox(height: 16),

        ElevatedButton.icon(
          onPressed: _pickingImage ? null : _pickKitchenImage,
          style: ElevatedButton.styleFrom(
            backgroundColor: _kitchenImageBase64 != null
                ? const Color(0xFFF5F5F5)
                : const Color(0xFFFF7A00),
            foregroundColor: _kitchenImageBase64 != null
                ? const Color(0xFFFF7A00)
                : Colors.white,
            elevation: 0,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          ),
          icon: Icon(_kitchenImageBase64 != null ? Icons.edit : Icons.upload),
          label: Text(
            _kitchenImageBase64 != null
                ? (isRTL ? 'تغيير الصورة' : 'Change Photo')
                : (isRTL ? 'رفع صورة' : 'Upload Photo'),
          ),
        ),
      ],
    );
  }

  Widget _buildStep3(bool isRTL) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFFFF3E0),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: const Color(0xFFFFCC80)),
          ),
          child: Text(
            isRTL
                ? 'الإجابة على هذه الأسئلة تزيد من فرصك في القبول.'
                : 'Answering these questions increases your chances of approval.',
            style: const TextStyle(fontSize: 13, color: Color(0xFFE65100)),
          ),
        ),
        const SizedBox(height: 20),

        _buildRadioGroup(
          isRTL: isRTL,
          question: isRTL
              ? '١. ما هي مدة خبرتك في بيع الطعام؟'
              : '1. How long have you been selling food?',
          value: _experienceLevel,
          options: [
            _Opt('Just starting', isRTL ? 'بدأت للتو' : 'Just starting'),
            _Opt('Less than 1 year', isRTL ? 'أقل من سنة' : 'Less than 1 year'),
            _Opt('1-3 years', isRTL ? '1-3 سنوات' : '1-3 years'),
            _Opt('3+ years', isRTL ? 'أكثر من 3 سنوات' : '3+ years'),
          ],
          onChanged: (v) => setState(() => _experienceLevel = v),
        ),
        const SizedBox(height: 20),

        _buildRadioGroup(
          isRTL: isRTL,
          question: isRTL
              ? '٢. كم عدد الطلبات التي نفذتها إجمالاً؟'
              : '2. How many orders have you fulfilled in total?',
          value: _totalOrders,
          options: [
            _Opt('Less than 50', isRTL ? 'أقل من 50' : 'Less than 50'),
            _Opt('50-200', '50 - 200'),
            _Opt('200-500', '200 - 500'),
            _Opt('500+', '500+'),
          ],
          onChanged: (v) => setState(() => _totalOrders = v),
        ),
        const SizedBox(height: 20),

        _buildRadioGroup(
          isRTL: isRTL,
          question: isRTL
              ? '٣. كم طلباً تخطط لتنفيذه يومياً؟'
              : '3. How many orders are you planning to fulfill daily?',
          value: _dailyOrders,
          options: [
            _Opt('Less than 10', isRTL ? 'أقل من 10' : 'Less than 10'),
            _Opt('10-20', '10 - 20'),
            _Opt('20-30', '20 - 30'),
            _Opt('30+', '30+'),
          ],
          onChanged: (v) => setState(() => _dailyOrders = v),
        ),
        const SizedBox(height: 20),

        _sectionLabel(isRTL ? '٤. طرق استلام الطلبات' : '4. Fulfillment Methods'),
        const SizedBox(height: 8),
        ...[
          _Opt('delivery', isRTL ? 'توصيل' : 'Delivery'),
          _Opt('pickup', isRTL ? 'استلام' : 'Pickup'),
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
              activeColor: const Color(0xFFFF7A00),
              contentPadding: EdgeInsets.zero,
              dense: true,
              controlAffinity: isRTL
                  ? ListTileControlAffinity.trailing
                  : ListTileControlAffinity.leading,
            )),
      ],
    );
  }

  Widget _buildRadioGroup({
    required bool isRTL,
    required String question,
    required String? value,
    required List<_Opt> options,
    required ValueChanged<String?> onChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          question,
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
        ),
        const SizedBox(height: 6),
        ...options.map((opt) => RadioListTile<String>(
              title: Text(opt.label, style: const TextStyle(fontSize: 14)),
              value: opt.value,
              groupValue: value,
              onChanged: onChanged,
              activeColor: const Color(0xFFFF7A00),
              contentPadding: EdgeInsets.zero,
              dense: true,
            )),
      ],
    );
  }

  Widget _sectionLabel(String text) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w600,
        color: AppTheme.textSecondary,
      ),
    );
  }

  InputDecoration _inputDecoration({String? hint}) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: Color(0xFFBDBDBD), fontSize: 14),
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Color(0xFFE0E0E0)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Color(0xFFE0E0E0)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Color(0xFFFF7A00), width: 1.5),
      ),
    );
  }
}

class _Opt {
  final String value;
  final String label;
  const _Opt(this.value, this.label);
}
