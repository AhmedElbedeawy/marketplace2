import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../../config/api_config.dart';
import '../../config/theme.dart';
import '../../providers/language_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/address_provider.dart';
import '../../utils/image_url_utils.dart';
import '../../widgets/phone_verification_widget.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({Key? key}) : super(key: key);

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _emailController;
  late TextEditingController _phoneController;
  final ImagePicker _imagePicker = ImagePicker();
  bool _uploadingPhoto = false;

  @override
  void initState() {
    super.initState();
    final authProvider = context.read<AuthProvider>();
    _nameController = TextEditingController(text: authProvider.user?.name ?? '');
    _emailController = TextEditingController(text: authProvider.user?.email ?? '');
    _phoneController = TextEditingController(text: authProvider.user?.phone ?? '');
    
    // Fetch addresses to get default one
    Future.microtask(() {
      if (mounted) {
        context.read<AddressProvider>().fetchAddresses();
      }
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 16, left: 24, right: 24),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Icon(
                      Icons.arrow_back,
                      color: AppTheme.textPrimary,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 24),
                  Expanded(
                    child: Text(
                      isRTL ? 'الملف الشخصي' : 'Profile',
                      style: const TextStyle(
                        color: AppTheme.textPrimary,
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        height: 1.2,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(child: SingleChildScrollView(
        child: Column(
          children: [
            // Profile Picture Section
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Center(
                child: GestureDetector(
                  onTap: _uploadingPhoto ? null : _pickProfileImage,
                  child: Stack(
                    children: [
                      Consumer<AuthProvider>(
                        builder: (context, authProvider, _) {
                          final profileImage = authProvider.user?.profileImage;
                          final hasValidImage = profileImage != null && profileImage.isNotEmpty;
                          return CircleAvatar(
                            radius: 50,
                            backgroundColor: AppTheme.dividerColor,
                            backgroundImage: hasValidImage ? getImageProvider(profileImage) : null,
                            child: _uploadingPhoto
                                ? const CircularProgressIndicator()
                                : (hasValidImage ? null : const Icon(Icons.person, size: 50, color: AppTheme.textSecondary)),
                          );
                        },
                      ),
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: const BoxDecoration(
                            color: AppTheme.accentColor,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.camera_alt, size: 18, color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            // Form Section
            Form(
              key: _formKey,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 16, 24, 16),
                child: Column(
                  children: [
                    _buildTextField(
                      controller: _nameController,
                      label: isRTL ? 'الاسم' : 'Name',
                      icon: Icons.person_outline,
                    ),
                    const SizedBox(height: 16),
                    _buildTextField(
                      controller: _emailController,
                      label: isRTL ? 'البريد الإلكتروني' : 'Email',
                      icon: Icons.email_outlined,
                      keyboardType: TextInputType.emailAddress,
                    ),
                    const SizedBox(height: 16),
                    // Phone field — read-only; change requires OTP verification
                    Consumer<AuthProvider>(
                      builder: (context, auth, _) {
                        final isVerified = auth.user?.isPhoneVerified == true;
                        final currentPhone = auth.user?.phone ?? '';
                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(12),
                                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 8, offset: const Offset(0, 2))],
                              ),
                              child: ListTile(
                                leading: const Icon(Icons.phone_outlined, color: AppTheme.textSecondary),
                                title: Text(
                                  currentPhone.isNotEmpty ? currentPhone : (isRTL ? 'لا يوجد رقم هاتف' : 'No phone number'),
                                  style: const TextStyle(fontSize: 14),
                                ),
                                trailing: isVerified
                                    ? const Icon(Icons.verified, color: Colors.green, size: 20)
                                    : null,
                                subtitle: isVerified
                                    ? Text(isRTL ? 'تم التحقق' : 'Verified', style: const TextStyle(color: Colors.green, fontSize: 12))
                                    : (currentPhone.isNotEmpty ? Text(isRTL ? 'غير محقق' : 'Not verified', style: const TextStyle(color: Colors.orange, fontSize: 12)) : null),
                              ),
                            ),
                            const SizedBox(height: 8),
                            TextButton.icon(
                              onPressed: () => _showPhoneVerificationDialog(context, isRTL),
                              icon: const Icon(Icons.edit, size: 16, color: AppTheme.accentColor),
                              label: Text(
                                isRTL ? 'تغيير ورقم الهاتف والتحقق منه' : 'Change & verify phone',
                                style: const TextStyle(color: AppTheme.accentColor, fontSize: 13),
                              ),
                            ),
                          ],
                        );
                      },
                    ),
                    const SizedBox(height: 24),
                    
                    // Default Address Display
                    Consumer<AddressProvider>(
                      builder: (context, addressProvider, _) {
                        final defaultAddr = addressProvider.defaultAddress;
                        return Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF9FAFB),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFE5E7EB)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Icon(Icons.location_on, color: AppTheme.accentColor, size: 20),
                                  const SizedBox(width: 8),
                                  Text(
                                    isRTL ? 'عنوان التوصيل الافتراضي' : 'Default Delivery Address',
                                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppTheme.textSecondary),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                defaultAddr != null 
                                  ? '${defaultAddr.label}: ${defaultAddr.addressLine1}, ${defaultAddr.city}'
                                  : (isRTL ? 'لا يوجد عنوان افتراضي محدد' : 'No default address set'),
                                style: const TextStyle(fontSize: 14, color: AppTheme.textPrimary),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                    
                    const SizedBox(height: 24),
                    Consumer<AuthProvider>(
                      builder: (context, authProvider, _) {
                        final isSaving = authProvider.isLoading;
                        return SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: isSaving ? null : () async {
                          if (!_formKey.currentState!.validate()) return;
                          final token = authProvider.token;
                          if (token == null) return;
                          try {
                            final response = await http.put(
                              Uri.parse(ApiConfig.updateUserProfile),
                              headers: {
                                'Authorization': 'Bearer $token',
                                'Content-Type': 'application/json',
                              },
                              body: jsonEncode({
                                'name': _nameController.text.trim(),
                                'email': _emailController.text.trim(),
                              }),
                            );
                            if (!mounted) return;
                            if (response.statusCode == 200) {
                              await authProvider.fetchUserProfile();
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      isRTL ? 'تم حفظ التغييرات بنجاح' : 'Changes saved successfully',
                                    ),
                                    backgroundColor: Colors.green,
                                  ),
                                );
                              }
                            } else {
                              String errMsg = 'Save failed';
                              try {
                                errMsg = jsonDecode(response.body)['message'] ?? errMsg;
                              } catch (_) {}
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(errMsg),
                                    backgroundColor: Colors.red,
                                  ),
                                );
                              }
                            }
                          } catch (e) {
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('${isRTL ? "خطأ" : "Error"}: $e'),
                                  backgroundColor: Colors.red,
                                ),
                              );
                            }
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.accentColor,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: isSaving
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : Text(
                                isRTL ? 'حفظ التغييرات' : 'Save Changes',
                                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                              ),
                      ),
                    );
                      },
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      )),
          ],
        ),
      ),
    );
  }

  Future<void> _pickProfileImage() async {
    final image = await _imagePicker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 85,
    );
    if (image == null || !mounted) return;

    final authProvider = context.read<AuthProvider>();
    final token = authProvider.token;
    if (token == null) return;

    setState(() => _uploadingPhoto = true);
    try {
      final bytes = await image.readAsBytes();
      final base64Image = 'data:image/jpeg;base64,${base64Encode(bytes)}';

      final response = await http.put(
        Uri.parse(ApiConfig.userProfilePhoto),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({'profilePhoto': base64Image}),
      );

      if (!mounted) return;
      if (response.statusCode == 200) {
        // Refresh user profile so the CircleAvatar updates
        await authProvider.fetchUserProfile();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(context.read<LanguageProvider>().isArabic
                  ? 'تم تحديث الصورة بنجاح'
                  : 'Profile photo updated'),
              backgroundColor: Colors.green,
            ),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to update photo (${response.statusCode})'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _uploadingPhoto = false);
    }
  }

  void _showPhoneVerificationDialog(BuildContext context, bool isRTL) {
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
            titleOverride: isRTL ? 'تغيير رقم الهاتف والتحقق منه' : 'Change & verify phone number',
            onVerified: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                content: Text(isRTL ? 'تم التحقق من رقم الهاتف بنجاح' : 'Phone number verified successfully'),
                backgroundColor: Colors.green,
              ));
            },
            onCancelled: () => Navigator.pop(context),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    TextInputType? keyboardType,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: TextFormField(
        controller: controller,
        keyboardType: keyboardType,
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: Icon(icon, color: AppTheme.textSecondary),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
          filled: true,
          fillColor: Colors.white,
        ),
        validator: (value) {
          if (value == null || value.isEmpty) {
            return 'This field is required';
          }
          return null;
        },
      ),
    );
  }
}
