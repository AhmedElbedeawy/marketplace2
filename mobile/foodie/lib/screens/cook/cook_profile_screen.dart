import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:firebase_auth/firebase_auth.dart' as import_firebase_auth;
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../config/theme.dart';
import '../../config/api_config.dart';
import '../../providers/language_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/food_provider.dart';
import '../../providers/address_provider.dart';
import '../../providers/favorite_provider.dart';
import '../../models/food.dart';
import '../../utils/image_url_utils.dart';
import '../../widgets/map_picker.dart';
import '../menu/dish_detail_screen.dart';
import '../reviews/cook_order_selection_screen.dart';

class CookProfileScreen extends StatefulWidget {
  final String cookId;
  final String cookName;
  final bool isSelfView;

  const CookProfileScreen({
    Key? key,
    required this.cookId,
    required this.cookName,
    this.isSelfView = false,
  }) : super(key: key);

  @override
  State<CookProfileScreen> createState() => _CookProfileScreenState();
}

class _CookProfileScreenState extends State<CookProfileScreen>
    with SingleTickerProviderStateMixin {
  int _selectedTab = 0; // 0 = Menu, 1 = Reviews
  bool _isLoading = true;
  String? _error;
  CookInfo? _cook;
  List<Food> _dishes = [];

  // Reviews data
  Map<String, dynamic>? _ratingSummary;
  List<Map<String, dynamic>> _reviews = [];
  bool _isLoadingReviews = false;

  // Self-view edit state
  final ImagePicker _imagePicker = ImagePicker();
  bool _uploadingPhoto = false;

  // Self-profile data fetched from /cooks/user/:userId (not available in list API)
  String? _selfPhone;
  String? _selfBio;
  String? _selfExpertise;
  String? _selfCity;
  String? _selfArea;
  String? _selfStreet;
  String? _selfBuilding;

  @override
  void initState() {
    super.initState();
    _loadCookData();
  }

  Future<void> _loadCookData() async {
    final foodProvider = Provider.of<FoodProvider>(context, listen: false);
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final addressProvider = Provider.of<AddressProvider>(context, listen: false);
    final headers = authProvider.getAuthHeaders();
    final lat = addressProvider.defaultAddress?.lat;
    final lng = addressProvider.defaultAddress?.lng;

    try {
      // Fetch cooks list to get cook info
      await foodProvider.fetchCooks(headers: headers, lat: lat, lng: lng);

      // Find the cook
      final cook = foodProvider.cooks.firstWhere(
        (c) => c.id == widget.cookId,
        orElse: () => CookInfo(id: widget.cookId, name: widget.cookName),
      );

      // Fetch cook's dishes
      await foodProvider.fetchCookDishes(
        cookId: widget.cookId,
        headers: headers,
      );

      // Load reviews
      await _loadReviews();

      // For self-view, fetch full cook record to get bio, phone, expertise
      if (widget.isSelfView) {
        final authProvider = Provider.of<AuthProvider>(context, listen: false);
        final token = authProvider.token;
        final userId = authProvider.user?.id;
        if (token != null && userId != null) {
          try {
            final selfResp = await http.get(
              Uri.parse('${ApiConfig.baseUrl}/cooks/user/$userId'),
              headers: {'Authorization': 'Bearer $token'},
            );
            if (selfResp.statusCode == 200) {
              final data = jsonDecode(selfResp.body)['data'] as Map<String, dynamic>;
              _selfBio = data['bio'] as String?;
              _selfCity = data['city'] as String?;
              _selfArea = data['area'] as String?;
              _selfStreet = data['street'] as String?;
              _selfBuilding = data['building'] as String?;
              final rawPhone = data['userId'] is Map
                  ? data['userId']['phone']
                  : data['phone'];
              _selfPhone = rawPhone as String?;
              final rawExp = data['expertise'];
              if (rawExp is List && rawExp.isNotEmpty) {
                final first = rawExp.first;
                _selfExpertise = first is Map
                    ? (first['name'] ?? first['nameEn'] ?? first.toString())
                    : first.toString();
              } else if (rawExp is String) {
                _selfExpertise = rawExp;
              }
            }
          } catch (_) {
            // non-fatal: self-profile data just won't pre-populate
          }
        }
      }

      if (mounted) {
        setState(() {
          _cook = cook;
          _dishes = foodProvider.cookDishes;
          _isLoading = false;
          _error = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to load cook data';
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _loadReviews() async {
    setState(() => _isLoadingReviews = true);

    try {
      // Load rating summary
      final summaryResponse = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/ratings/cook/${widget.cookId}/summary'),
      );

      if (summaryResponse.statusCode == 200) {
        final data = json.decode(summaryResponse.body);
        if (data['success']) {
          _ratingSummary = data['data'];
        }
      }

      // Load reviews list
      final reviewsResponse = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/ratings/cook/${widget.cookId}/reviews?limit=20'),
      );

      if (reviewsResponse.statusCode == 200) {
        final data = json.decode(reviewsResponse.body);
        if (data['success'] && data['data'] != null) {
          _reviews = List<Map<String, dynamic>>.from(data['data']['reviews'] ?? []);
        }
      }
    } catch (e) {
      debugPrint('Error loading reviews: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoadingReviews = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;

    return Scaffold(
      backgroundColor: const Color(0xFFF7F7F7),
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
                      isRTL ? Icons.arrow_forward : Icons.arrow_back,
                      color: AppTheme.textPrimary,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 24),
                  Expanded(
                    child: Text(
                      isRTL ? 'ملف الطاهي' : 'Cook Profile',
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
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                      ? Center(child: Text(_error!))
                      : Column(
                          children: [
                            _buildCookCard(isRTL),
                            _buildTabs(isRTL),
                            Expanded(
                              child: _selectedTab == 0
                                  ? _buildMenuTab(isRTL)
                                  : _buildReviewsTab(isRTL),
                            ),
                          ],
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCookCard(bool isRTL) {
    if (_cook == null) return const SizedBox.shrink();

    final cookName = _cook!.storeName?.isNotEmpty == true
        ? _cook!.storeName!
        : _cook!.name;
    final expertiseDisplay = _selfExpertise ??
        (_cook!.expertise.isNotEmpty ? _cook!.expertise.first : null) ??
        (isRTL ? 'متعدد التخصصات' : 'Multi-Specialty');
    final bioText = _selfBio ??
        _cook!.bio ??
        (isRTL
            ? 'طاهي محترف يقدم أطباق شهية بلمسة منزلية'
            : 'Professional cook offering delicious homemade dishes');

    return Container(
      margin: const EdgeInsets.fromLTRB(24, 16, 24, 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Main content row
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Cook image — tappable in self-view to change photo
              GestureDetector(
                onTap: widget.isSelfView && !_uploadingPhoto ? _pickCookImage : null,
                child: Stack(
                  children: [
                    Container(
                      width: 96,
                      height: 96,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE0E0E0), width: 1),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(11),
                        child: _uploadingPhoto
                            ? const Center(child: CircularProgressIndicator())
                            : SmartImage(
                                imageUrl: _cook!.profilePhoto,
                                width: 96,
                                height: 96,
                                placeholder: Container(
                                  color: const Color(0xFFF5F5F5),
                                  child: const Icon(Icons.person, size: 44, color: Color(0xFF969494)),
                                ),
                              ),
                      ),
                    ),
                    if (widget.isSelfView)
                      Positioned(
                        bottom: 2,
                        right: 2,
                        child: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: const BoxDecoration(
                            color: AppTheme.accentColor,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.camera_alt, size: 14, color: Colors.white),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 14),
              // Cook info — reserve right margin for favorite button
              Expanded(
                child: Padding(
                  padding: EdgeInsets.only(right: widget.isSelfView ? 0 : 52),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Cook name (display only — edited via unified Edit Profile sheet)
                      Text(
                        cookName,
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.textPrimary,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      // Specialty (display only — edited via unified sheet)
                      Text(
                        expertiseDisplay,
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF7D7C7C),
                        ),
                      ),
                      const SizedBox(height: 6),
                      // Rating + dish count row
                      Row(
                        children: [
                          const Icon(Icons.star, size: 14, color: Color(0xFFFF7A00)),
                          const SizedBox(width: 3),
                          Text(
                            '${_cook!.rating?.toStringAsFixed(1) ?? '0.0'} (${_cook!.ratingsCount ?? 0})',
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFF7D7C7C),
                            ),
                          ),
                          const SizedBox(width: 10),
                          const Icon(Icons.restaurant_menu, size: 13, color: Color(0xFF969494)),
                          const SizedBox(width: 3),
                          Text(
                            '${_dishes.length} ${isRTL ? 'طبق' : 'dishes'}',
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFF7D7C7C),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      // Bio (display only — edited via unified sheet)
                      Text(
                        bioText,
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF7D7C7C),
                          height: 1.4,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      // Update Location — separate flow, self-view only
                      if (widget.isSelfView) ...[
                        const SizedBox(height: 8),
                        GestureDetector(
                          onTap: _pickLocation,
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.my_location,
                                size: 13,
                                color: AppTheme.accentColor,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                isRTL ? 'تحديث الموقع' : 'Update Location',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppTheme.accentColor,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),

          // ONE edit button for self-view (top-right corner)
          if (widget.isSelfView)
            Positioned(
              top: 0,
              right: 0,
              child: GestureDetector(
                onTap: () => _openEditProfileSheet(isRTL),
                child: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: AppTheme.accentColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.edit_outlined, size: 18, color: AppTheme.accentColor),
                ),
              ),
            ),

          // Favorite icon button — top-right, no background circle
          if (!widget.isSelfView)
            Positioned(
              top: 4,
              right: 4,
              child: Consumer<FavoriteProvider>(
                builder: (context, favoriteProvider, _) {
                  final isFavorite = favoriteProvider.isCookFavorite(widget.cookId);
                  return GestureDetector(
                    onTap: () async {
                      await favoriteProvider.toggleCookFavorite(widget.cookId);
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              isFavorite
                                  ? (isRTL ? 'تمت الإزالة من المفضلة' : 'Removed from favorites')
                                  : (isRTL ? 'تمت الإضافة إلى المفضلة' : 'Added to favorites'),
                              style: const TextStyle(
                                color: Color(0xFFFF7A00),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            duration: const Duration(seconds: 1),
                            backgroundColor: Colors.white,
                            behavior: SnackBarBehavior.floating,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            elevation: 8,
                          ),
                        );
                      }
                    },
                    child: Icon(
                      isFavorite ? Icons.favorite : Icons.favorite_border,
                      color: const Color(0xFFFF7A00),
                      size: 28,
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _pickCookImage() async {
    final image = await _imagePicker.pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (image == null || !mounted) return;
    final token = context.read<AuthProvider>().token;
    if (token == null) return;
    setState(() => _uploadingPhoto = true);
    try {
      final bytes = await image.readAsBytes();
      final base64Image = 'data:image/jpeg;base64,${base64Encode(bytes)}';
      final response = await http.put(
        Uri.parse(ApiConfig.cookProfilePhoto),
        headers: {'Authorization': 'Bearer $token', 'Content-Type': 'application/json'},
        body: jsonEncode({'profilePhoto': base64Image}),
      );
      if (!mounted) return;
      if (response.statusCode == 200) {
        await _loadCookData();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(context.read<LanguageProvider>().isArabic ? 'تم تحديث الصورة' : 'Photo updated'),
            backgroundColor: Colors.green,
          ));
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('Failed (${response.statusCode})'),
            backgroundColor: Colors.red,
          ));
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red));
      }
    } finally {
      if (mounted) setState(() => _uploadingPhoto = false);
    }
  }

  // ─── Separate location update flow — NOT part of the edit sheet ───────────
  Future<void> _pickLocation() async {
    final cook = _cook;
    final lat = (cook?.location?['lat'] as num?)?.toDouble() ?? 24.7136;
    final lng = (cook?.location?['lng'] as num?)?.toDouble() ?? 46.6753;
    final result = await Navigator.push<LatLng>(
      context,
      MaterialPageRoute(
        builder: (_) => MapPicker(initialLat: lat, initialLng: lng),
      ),
    );
    if (result == null || !mounted) return;
    final token = context.read<AuthProvider>().token;
    if (token == null) return;
    try {
      final response = await http.put(
        Uri.parse(ApiConfig.cookProfile),
        headers: {'Authorization': 'Bearer $token', 'Content-Type': 'application/json'},
        body: jsonEncode({
          'location': {'lat': result.latitude, 'lng': result.longitude},
        }),
      );
      if (response.statusCode == 200 && mounted) {
        final isRTL = context.read<LanguageProvider>().isArabic;
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(isRTL ? 'تم تحديث الموقع' : 'Location updated'),
          backgroundColor: Colors.green,
        ));
      }
    } catch (_) {}
  }

  // ─── Reusable text field for the unified edit sheet ───────────────────────
  Widget _sheetField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    int maxLines = 1,
    TextInputType? keyboardType,
    String? hint,
  }) {
    return TextField(
      controller: controller,
      maxLines: maxLines,
      keyboardType: keyboardType,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        // Point 7: keep hint/placeholder grey at all times, including after focus.
        hintStyle: const TextStyle(color: Color(0xFF9E9E9E)),
        prefixIcon: Icon(icon, size: 18),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      ),
    );
  }

  // ─── Unified Edit Profile sheet — ONE button, ONE sheet, ONE Save ──────────
  void _openEditProfileSheet(bool isRTL) {
    final cookName = _cook?.storeName?.isNotEmpty == true
        ? _cook!.storeName!
        : _cook?.name ?? '';

    final storeNameCtrl  = TextEditingController(text: cookName);
    final expertiseCtrl  = TextEditingController(text: _selfExpertise ?? '');
    final bioCtrl        = TextEditingController(text: _selfBio ?? '');
    final phoneCtrl      = TextEditingController(text: _selfPhone ?? '');
    final streetCtrl     = TextEditingController(text: _selfStreet ?? '');
    final areaCtrl       = TextEditingController(text: _selfArea ?? '');
    final cityCtrl       = TextEditingController(text: _selfCity ?? '');
    final buildingCtrl   = TextEditingController(text: _selfBuilding ?? '');

    bool saving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          // ── Save all text/address fields ─────────────────────────────────
          // Location coordinates are managed separately via the Update Location
          // button — they are NOT included here.
          Future<void> saveAll() async {
            final token = context.read<AuthProvider>().token;
            if (token == null) return;

            final newPhone     = phoneCtrl.text.trim();
            final originalPhone = _selfPhone ?? '';
            final phoneChanged = newPhone.isNotEmpty && newPhone != originalPhone;

            // Phone changed → verify first before saving anything
            if (phoneChanged) {
              final verified = await _verifyPhoneInline(newPhone, isRTL);
              if (!verified) return; // user cancelled or verification failed
            }

            setSheetState(() => saving = true);

            try {
              final body = <String, dynamic>{
                'storeName' : storeNameCtrl.text.trim(),
                'expertise' : [expertiseCtrl.text.trim()],
                'bio'       : bioCtrl.text.trim(),
                'city'      : cityCtrl.text.trim(),
                'area'      : areaCtrl.text.trim(),
                'street'    : streetCtrl.text.trim(),
                'building'  : buildingCtrl.text.trim(),
              };

              final response = await http.put(
                Uri.parse(ApiConfig.cookProfile),
                headers: {
                  'Authorization': 'Bearer $token',
                  'Content-Type': 'application/json',
                },
                body: jsonEncode(body),
              );

              if (!mounted) return;

              if (response.statusCode == 200) {
                // Reflect changes locally without waiting for a full reload
                setState(() {
                  _selfExpertise = expertiseCtrl.text.trim();
                  _selfBio       = bioCtrl.text.trim();
                  _selfCity      = cityCtrl.text.trim();
                  _selfArea      = areaCtrl.text.trim();
                  _selfStreet    = streetCtrl.text.trim();
                  _selfBuilding  = buildingCtrl.text.trim();
                  if (phoneChanged) _selfPhone = newPhone;
                });
                Navigator.pop(sheetCtx);
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                  content: Text(isRTL ? 'تم حفظ التغييرات' : 'Changes saved'),
                  backgroundColor: Colors.green,
                ));
                // Reload to refresh kitchen name in the card header
                await _loadCookData();
              } else {
                final errMsg = (jsonDecode(response.body)['message'] ?? 'Save failed').toString();
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                    content: Text(errMsg),
                    backgroundColor: Colors.red,
                  ));
                }
                setSheetState(() => saving = false);
              }
            } catch (e) {
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                  content: Text('${isRTL ? "خطأ" : "Error"}: $e'),
                  backgroundColor: Colors.red,
                ));
              }
              setSheetState(() => saving = false);
            }
          }

          // ── Sheet UI ─────────────────────────────────────────────────────
          return Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            ),
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(context).viewInsets.bottom + 24,
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        isRTL ? 'تعديل الملف الشخصي' : 'Edit Profile',
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      GestureDetector(
                        onTap: () => Navigator.pop(sheetCtx),
                        child: const Icon(Icons.close, color: Color(0xFF7D7C7C)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Kitchen name
                  _sheetField(
                    controller: storeNameCtrl,
                    label: isRTL ? 'اسم المطبخ' : 'Kitchen Name',
                    icon: Icons.store_outlined,
                  ),
                  const SizedBox(height: 12),

                  // Expertise
                  _sheetField(
                    controller: expertiseCtrl,
                    label: isRTL ? 'التخصص' : 'Expertise',
                    icon: Icons.restaurant_outlined,
                  ),
                  const SizedBox(height: 12),

                  // Bio
                  _sheetField(
                    controller: bioCtrl,
                    label: isRTL ? 'نبذة عن المطبخ' : 'About your kitchen',
                    icon: Icons.info_outline,
                    maxLines: 3,
                  ),
                  const SizedBox(height: 12),

                  // Phone
                  _sheetField(
                    controller: phoneCtrl,
                    label: isRTL ? 'رقم الهاتف (مع رمز الدولة)' : 'Phone (with country code)',
                    icon: Icons.phone_outlined,
                    keyboardType: TextInputType.phone,
                    hint: '+966XXXXXXXXX',
                  ),
                  if (_selfPhone == null || (_selfPhone?.isEmpty ?? true))
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        isRTL
                            ? 'تغيير رقم الهاتف يتطلب رمز تحقق SMS'
                            : 'Changing phone requires SMS verification',
                        style: const TextStyle(
                          fontSize: 11,
                          color: Color(0xFF7D7C7C),
                        ),
                      ),
                    ),
                  const SizedBox(height: 12),

                  // Street
                  _sheetField(
                    controller: streetCtrl,
                    label: isRTL ? 'الشارع' : 'Street',
                    icon: Icons.streetview_outlined,
                  ),
                  const SizedBox(height: 12),

                  // Area / Neighbourhood
                  _sheetField(
                    controller: areaCtrl,
                    label: isRTL ? 'الحي / المنطقة' : 'Area / Neighbourhood',
                    icon: Icons.location_city_outlined,
                  ),
                  const SizedBox(height: 12),

                  // City
                  _sheetField(
                    controller: cityCtrl,
                    label: isRTL ? 'المدينة' : 'City',
                    icon: Icons.apartment_outlined,
                  ),
                  const SizedBox(height: 12),

                  // Building / details (optional)
                  _sheetField(
                    controller: buildingCtrl,
                    label: isRTL
                        ? 'رقم المبنى / تفاصيل إضافية (اختياري)'
                        : 'Building / Additional details (optional)',
                    icon: Icons.business_outlined,
                  ),
                  const SizedBox(height: 20),

                  // ONE Save button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: saving ? null : saveAll,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.accentColor,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: saving
                          ? const SizedBox(
                              height: 18,
                              width: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : Text(
                              isRTL ? 'حفظ' : 'Save',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  // ─── Phone verification flow (called from unified sheet Save) ──────────────
  Future<bool> _verifyPhoneInline(String phone, bool isRTL) async {
    final completer = Completer<bool>();

    await import_firebase_auth.FirebaseAuth.instance.verifyPhoneNumber(
      phoneNumber: phone,
      verificationCompleted: (credential) async {
        // Auto-verified on Android — sign in immediately
        try {
          final userCred = await import_firebase_auth.FirebaseAuth.instance
              .signInWithCredential(credential);
          final idToken = await userCred.user?.getIdToken();
          if (idToken != null && mounted) {
            final token = context.read<AuthProvider>().token;
            final resp = await http.post(
              Uri.parse('${ApiConfig.baseUrl}/auth/verify-phone'),
              headers: {
                'Authorization': 'Bearer $token',
                'Content-Type': 'application/json',
              },
              body: jsonEncode({'idToken': idToken}),
            );
            if (!completer.isCompleted) {
              completer.complete(resp.statusCode == 200);
            }
          } else {
            if (!completer.isCompleted) completer.complete(false);
          }
        } catch (_) {
          if (!completer.isCompleted) completer.complete(false);
        }
      },
      verificationFailed: (e) {
        if (!completer.isCompleted) completer.complete(false);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(e.message ?? 'Verification failed'),
            backgroundColor: Colors.red,
          ));
        }
      },
      codeSent: (verificationId, _) {
        if (mounted) {
          _showOtpDialog(verificationId, isRTL, completer);
        }
      },
      codeAutoRetrievalTimeout: (_) {
        if (!completer.isCompleted) completer.complete(false);
      },
    );

    return completer.future;
  }

  void _showOtpDialog(
    String verificationId,
    bool isRTL,
    Completer<bool> completer,
  ) {
    final otpCtrl = TextEditingController();
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogCtx) => AlertDialog(
        title: Text(isRTL ? 'رمز التحقق' : 'Verification Code'),
        content: TextField(
          controller: otpCtrl,
          keyboardType: TextInputType.number,
          maxLength: 6,
          autofocus: true,
          decoration: InputDecoration(
            hintText: isRTL ? 'أدخل الرمز المكون من 6 أرقام' : 'Enter 6-digit code',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(dialogCtx);
              if (!completer.isCompleted) completer.complete(false);
            },
            child: Text(isRTL ? 'إلغاء' : 'Cancel'),
          ),
          TextButton(
            onPressed: () async {
              final smsCode = otpCtrl.text.trim();
              if (smsCode.isEmpty) return;
              Navigator.pop(dialogCtx);
              try {
                final credential = import_firebase_auth.PhoneAuthProvider.credential(
                  verificationId: verificationId,
                  smsCode: smsCode,
                );
                final userCred = await import_firebase_auth.FirebaseAuth.instance
                    .signInWithCredential(credential);
                final idToken = await userCred.user?.getIdToken();
                if (idToken != null && mounted) {
                  final token = context.read<AuthProvider>().token;
                  final resp = await http.post(
                    Uri.parse('${ApiConfig.baseUrl}/auth/verify-phone'),
                    headers: {
                      'Authorization': 'Bearer $token',
                      'Content-Type': 'application/json',
                    },
                    body: jsonEncode({'idToken': idToken}),
                  );
                  if (!completer.isCompleted) {
                    completer.complete(resp.statusCode == 200);
                  }
                } else {
                  if (!completer.isCompleted) completer.complete(false);
                }
              } catch (e) {
                if (!completer.isCompleted) completer.complete(false);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                    content: Text('${isRTL ? "خطأ" : "Error"}: $e'),
                    backgroundColor: Colors.red,
                  ));
                }
              }
            },
            child: Text(
              isRTL ? 'تحقق' : 'Verify',
              style: const TextStyle(
                color: AppTheme.accentColor,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabs(bool isRTL) {
    return Container(
      color: Colors.transparent,
      child: Row(
        children: [
          Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _selectedTab = 0),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(
                      color: _selectedTab == 0
                          ? AppTheme.accentColor
                          : Colors.transparent,
                      width: 3,
                    ),
                  ),
                ),
                child: Text(
                  isRTL ? 'قائمة الطعام' : 'Menu',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: _selectedTab == 0 ? FontWeight.w600 : FontWeight.w500,
                    color: _selectedTab == 0
                        ? AppTheme.accentColor
                        : const Color(0xFF7D7C7C),
                  ),
                ),
              ),
            ),
          ),
          Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _selectedTab = 1),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(
                      color: _selectedTab == 1
                          ? AppTheme.accentColor
                          : Colors.transparent,
                      width: 3,
                    ),
                  ),
                ),
                child: Text(
                  isRTL ? 'التقييمات' : 'Reviews',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: _selectedTab == 1 ? FontWeight.w600 : FontWeight.w500,
                    color: _selectedTab == 1
                        ? AppTheme.accentColor
                        : const Color(0xFF7D7C7C),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMenuTab(bool isRTL) {
    if (_dishes.isEmpty) {
      return Center(
        child: Text(
          isRTL ? 'لا توجد أطباق' : 'No dishes available',
          style: const TextStyle(
            fontSize: 16,
            color: Color(0xFF7D7C7C),
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 16),
      itemCount: _dishes.length,
      itemBuilder: (context, index) {
        return _buildDishCard(_dishes[index], isRTL);
      },
    );
  }

  Widget _buildDishCard(Food dish, bool isRTL) {
    final dishName = isRTL ? (dish.nameAr ?? dish.name) : dish.name;

    return GestureDetector(
      onTap: () {
        final adminDishId = dish.adminDishId ?? dish.id;
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => DishDetailScreen(
              adminDishId: adminDishId,
              dishName: dishName,
              initialCookId: widget.cookId,
            ),
          ),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFF0F0F0), width: 1),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Dish image — rounded left corners, taller crop
            ClipRRect(
              borderRadius: const BorderRadius.horizontal(left: Radius.circular(15)),
              child: SmartImage(
                imageUrl: dish.image,
                width: 110,
                height: 110,
                fit: BoxFit.cover,
                placeholder: Container(
                  width: 110,
                  height: 110,
                  color: const Color(0xFFF5F5F5),
                  child: const Icon(Icons.restaurant, size: 36, color: Color(0xFF969494)),
                ),
              ),
            ),
            // Dish info
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      dishName,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.textPrimary,
                        height: 1.3,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (dish.description.isNotEmpty) ...[
                      const SizedBox(height: 5),
                      Text(
                        dish.description,
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF969494),
                          height: 1.3,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
            ),
            // Price — right-aligned, orange
            Padding(
              padding: const EdgeInsets.only(right: 14),
              child: Text(
                '${dish.price.toStringAsFixed(2)} SAR',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.accentColor,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReviewsTab(bool isRTL) {
    if (_isLoadingReviews) {
      return const Center(child: CircularProgressIndicator());
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 16),
      children: [
        // Rating summary block
        _buildRatingSummary(isRTL),
        const SizedBox(height: 16),
        // Sort row
        _buildSortRow(isRTL),
        const SizedBox(height: 16),
        // Reviews list
        if (_reviews.isEmpty)
          Center(
            child: Text(
              isRTL ? 'لا توجد تقييمات بعد' : 'No reviews yet',
              style: const TextStyle(
                fontSize: 16,
                color: Color(0xFF7D7C7C),
              ),
            ),
          )
        else
          ..._reviews.map((review) => _buildReviewCard(review, isRTL)).toList(),
      ],
    );
  }

  Widget _buildRatingSummary(bool isRTL) {
    final averageRating = _ratingSummary?['averageRating']?.toDouble() ?? 0.0;
    final totalReviews = _ratingSummary?['totalReviews'] ?? 0;
    final starDistribution = Map<String, int>.from(
      _ratingSummary?['starDistribution'] ?? {'5': 0, '4': 0, '3': 0, '2': 0, '1': 0},
    );

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Row(
            children: [
              // Left: Large rating
              SizedBox(
                width: 80,
                child: Column(
                  children: [
                    Text(
                      averageRating.toStringAsFixed(1),
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(5, (index) {
                        return Icon(
                          index < averageRating.floor()
                              ? Icons.star
                              : Icons.star_border,
                          size: 12,
                          color: const Color(0xFFFF7A00),
                        );
                      }),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      isRTL ? 'من 5' : 'out of 5',
                      style: const TextStyle(
                        fontSize: 11,
                        color: Color(0xFF7D7C7C),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              // Middle: Star breakdown bars
              Expanded(
                child: Column(
                  children: [5, 4, 3, 2, 1].map((star) {
                    final count = starDistribution[star.toString()] ?? 0;
                    final percentage = totalReviews > 0
                        ? (count / totalReviews * 100).toInt()
                        : 0;

                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 2),
                      child: Row(
                        children: [
                          Text(
                            '$star',
                            style: const TextStyle(
                              fontSize: 11,
                              color: Color(0xFF7D7C7C),
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Icon(Icons.star, size: 10, color: Color(0xFFFF7A00)),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Container(
                              height: 6,
                              decoration: BoxDecoration(
                                color: const Color(0xFFE0E0E0),
                                borderRadius: BorderRadius.circular(3),
                              ),
                              child: FractionallySizedBox(
                                alignment: Alignment.centerLeft,
                                widthFactor: percentage / 100,
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFF7A00),
                                    borderRadius: BorderRadius.circular(3),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(width: 16),
              // Right: Percentages
              SizedBox(
                width: 40,
                child: Column(
                  children: [5, 4, 3, 2, 1].map((star) {
                    final count = starDistribution[star.toString()] ?? 0;
                    final percentage = totalReviews > 0
                        ? (count / totalReviews * 100).toInt()
                        : 0;

                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 2),
                      child: Text(
                        '$percentage%',
                        style: const TextStyle(
                          fontSize: 11,
                          color: Color(0xFF7D7C7C),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Write a Review button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                // Navigate to order selection screen for this cook
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => CookOrderSelectionScreen(
                      cookId: widget.cookId,
                      cookName: widget.cookName,
                    ),
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFFF7A00),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: Text(
                isRTL ? 'كتابة تقييم' : 'Write a Review',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSortRow(bool isRTL) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          isRTL ? 'ترتيب حسب: الأحدث' : 'Sort by: Most Recent',
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            color: Color(0xFF7D7C7C),
          ),
        ),
        GestureDetector(
          onTap: () {
            // TODO: Show sort options
          },
          child: Text(
            isRTL ? 'عرض الكل' : 'View All',
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppTheme.accentColor,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildReviewCard(Map<String, dynamic> review, bool isRTL) {
    final reviewer = Map<String, dynamic>.from(review['reviewer'] ?? {});
    final reviewerName = reviewer['name'] ?? (isRTL ? 'مجهول' : 'Anonymous');
    // Pick avatar in priority order (profilePhoto first, matching server field names).
    final rawAvatar = (reviewer['profilePhoto'] ??
                       reviewer['profileImage'] ??
                       reviewer['avatar'] ??
                       reviewer['image'])
        ?.toString() ?? '';
    // Build the URL that SmartImage will receive.
    // • data:image/ → pass as-is (SmartImage uses Image.memory for base64).
    // • Everything else → resolve to absolute, then coerce http→https so iOS
    //   ATS doesn't silently drop the request. SmartImage handles GCS proxy,
    //   /uploads/ paths, error fallback internally.
    String reviewerAvatar = '';
    if (rawAvatar.isNotEmpty) {
      if (rawAvatar.startsWith('data:image/')) {
        reviewerAvatar = rawAvatar; // base64 — SmartImage handles it directly
      } else {
        String resolved = getAbsoluteUrl(rawAvatar);
        if (resolved.startsWith('http://')) {
          resolved = 'https://${resolved.substring(7)}';
        }
        reviewerAvatar = resolved; // may be https://, /uploads/ resolved, etc.
      }
    }
    final overallRating = (review['overallRating'] ?? 0).toDouble();
    final overallReview = review['overallReview'] ?? '';
    final createdAt = review['createdAt'] != null
        ? DateTime.parse(review['createdAt'])
        : null;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Reviewer header
          Row(
            children: [
              // Avatar — SmartImage handles all URL variants (base64, GCS
              // proxied, /uploads/ resolved, https://) and falls back to the
              // placeholder when the URL is empty or fails to load.
              SizedBox(
                width: 36,
                height: 36,
                child: ClipOval(
                  child: SmartImage(
                    imageUrl: reviewerAvatar.isNotEmpty ? reviewerAvatar : null,
                    width: 36,
                    height: 36,
                    fit: BoxFit.cover,
                    placeholder: Container(
                      color: const Color(0xFFE0E0E0),
                      child: const Icon(Icons.person, size: 22, color: Color(0xFF9E9E9E)),
                    ),
                    errorWidget: Container(
                      color: const Color(0xFFE0E0E0),
                      child: const Icon(Icons.person, size: 22, color: Color(0xFF9E9E9E)),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              // Name and date
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      reviewerName,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    if (createdAt != null)
                      Text(
                        '${createdAt.day}/${createdAt.month}/${createdAt.year}',
                        style: const TextStyle(
                          fontSize: 11,
                          color: Color(0xFF7D7C7C),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          // Stars
          Row(
            children: List.generate(5, (index) {
              return Icon(
                index < overallRating.floor()
                    ? Icons.star
                    : Icons.star_border,
                size: 12,
                color: const Color(0xFFFF7A00),
              );
            }),
          ),
          const SizedBox(height: 8),
          // Review text
          if (overallReview.isNotEmpty)
            Text(
              overallReview,
              style: const TextStyle(
                fontSize: 12,
                color: AppTheme.textPrimary,
              ),
            ),
          const SizedBox(height: 12),
          // Bottom action row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildActionItem(Icons.thumb_up_outlined, isRTL ? 'مفيد' : 'Helpful'),
              _buildActionItem(Icons.reply_outlined, isRTL ? 'رد' : 'Reply'),
              _buildActionItem(Icons.chat_bubble_outline, isRTL ? 'تعليق' : 'Comment'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActionItem(IconData icon, String label) {
    return GestureDetector(
      onTap: () {
        // UI only - no action in Phase 3
        debugPrint('👆 [REVIEW ACTION] $label tapped');
      },
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: const Color(0xFF7D7C7C)),
          const SizedBox(width: 4),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              color: Color(0xFF7D7C7C),
            ),
          ),
        ],
      ),
    );
  }
}
