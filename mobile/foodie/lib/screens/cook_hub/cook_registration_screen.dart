import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../config/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/language_provider.dart';
import 'package:provider/provider.dart';
import '../../widgets/map_picker.dart';

class CookRegistrationScreen extends StatefulWidget {
  const CookRegistrationScreen({Key? key}) : super(key: key);

  @override
  State<CookRegistrationScreen> createState() => _CookRegistrationScreenState();
}

class _CookRegistrationScreenState extends State<CookRegistrationScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _storeNameController;
  late TextEditingController _expertiseController;
  late TextEditingController _bioController;
  late TextEditingController _cityController;
  bool _isLoading = false;
  double _lat = 24.7136;
  double _lng = 46.6753;

  @override
  void initState() {
    super.initState();
    _storeNameController = TextEditingController();
    _expertiseController = TextEditingController();
    _bioController = TextEditingController();
    _cityController = TextEditingController();
  }

  @override
  void dispose() {
    _storeNameController.dispose();
    _expertiseController.dispose();
    _bioController.dispose();
    _cityController.dispose();
    super.dispose();
  }

  void _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    final success = await context.read<AuthProvider>().becomeCook(
      storeName: _storeNameController.text.trim(),
      expertise: _expertiseController.text.trim(),
      bio: _bioController.text.trim(),
      city: _cityController.text.trim(),
      lat: _lat,
      lng: _lng,
    );

    setState(() => _isLoading = false);

    if (success && mounted) {
      Navigator.of(context).pushReplacementNamed('/cook-status');
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.read<AuthProvider>().error ?? 'Registration failed')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isRTL = context.watch<LanguageProvider>().isArabic;

    return Scaffold(
      appBar: AppBar(
        title: Text(isRTL ? 'تسجيل كشيف' : 'Become a Cook'),
        backgroundColor: Colors.white,
        foregroundColor: AppTheme.textPrimary,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                isRTL ? 'أخبرنا عن مطبخك' : 'Tell us about your kitchen',
                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 24),
              TextFormField(
                controller: _storeNameController,
                decoration: InputDecoration(
                  labelText: isRTL ? 'اسم المتجر' : 'Store Name',
                  border: const OutlineInputBorder(),
                ),
                validator: (value) => (value == null || value.isEmpty) 
                  ? (isRTL ? 'الرجاء إدخال اسم المتجر' : 'Please enter store name') 
                  : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _expertiseController,
                decoration: InputDecoration(
                  labelText: isRTL ? 'التخصص' : 'Expertise',
                  border: const OutlineInputBorder(),
                ),
                validator: (value) => (value == null || value.isEmpty) 
                  ? (isRTL ? 'الرجاء إدخال التخصص' : 'Please enter expertise') 
                  : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _cityController,
                decoration: InputDecoration(
                  labelText: isRTL ? 'المدينة' : 'City',
                  border: const OutlineInputBorder(),
                ),
                validator: (value) => (value == null || value.isEmpty) 
                  ? (isRTL ? 'الرجاء إدخال المدينة' : 'Please enter city') 
                  : null,
              ),
              const SizedBox(height: 16),
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
                    });
                  }
                },
                icon: const Icon(Icons.map),
                label: Text(isRTL ? 'تحديد على الخريطة' : 'Pick Kitchen Location'),
              ),
              const SizedBox(height: 16),
              Text(
                'Lat: ${_lat.toStringAsFixed(6)}, Lng: ${_lng.toStringAsFixed(6)}',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _bioController,
                maxLines: 4,
                decoration: InputDecoration(
                  labelText: isRTL ? 'نبذة' : 'Bio',
                  border: const OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _isLoading ? null : _handleSubmit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.orange,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: _isLoading 
                  ? const CircularProgressIndicator(color: Colors.white)
                  : Text(isRTL ? 'إرسال الطلب' : 'Submit Request'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
