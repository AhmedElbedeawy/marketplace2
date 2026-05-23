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
import '../../utils/arabic_utils.dart';
import '../../utils/image_url_utils.dart';
import '../../widgets/map_picker.dart';
import '../menu/dish_detail_screen.dart';
import '../reviews/cook_order_selection_screen.dart';

class CookProfileScreen extends StatefulWidget {
  final String cookId;
  final String cookName;
  final bool isSelfView;
  final int initialTab;

  const CookProfileScreen({
    Key? key,
    required this.cookId,
    required this.cookName,
    this.isSelfView = false,
    this.initialTab = 0,
  }) : super(key: key);

  @override
  State<CookProfileScreen> createState() => _CookProfileScreenState();
}

class _CookProfileScreenState extends State<CookProfileScreen>
    with SingleTickerProviderStateMixin {
  late int _selectedTab; // 0 = Reviews, 1 = Menu
  bool _isLoading = true;
  String? _error;

  // Self-view edit state (pure UI state — not data)
  final ImagePicker _imagePicker = ImagePicker();
  bool _uploadingPhoto = false;

  @override
  void initState() {
    super.initState();
    _selectedTab = widget.initialTab;
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadCookData());
  }

  Future<void> _loadCookData() async {
    final foodProvider = Provider.of<FoodProvider>(context, listen: false);
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final addressProvider = Provider.of<AddressProvider>(context, listen: false);

    // Hydration guard: if provider already holds a fresh snapshot, skip network entirely.
    final existing = foodProvider.cookViewModelFor(widget.cookId);
    if (existing != null &&
        DateTime.now().difference(existing.fetchedAt).inSeconds < 120) {
      if (mounted) {
        _precacheCookImages(existing);
        setState(() => _isLoading = false);
      }
      return;
    }

    final headers = authProvider.getAuthHeaders();
    final lat = addressProvider.defaultAddress?.lat;
    final lng = addressProvider.defaultAddress?.lng;

    try {
      final snapshotFuture = foodProvider.fetchCookSnapshot(
        cookId: widget.cookId,
        cookName: widget.cookName,
        headers: headers,
        lat: lat,
        lng: lng,
      );

      if (widget.isSelfView) {
        final token = authProvider.token;
        final userId = authProvider.user?.id;
        if (token != null && userId != null) {
          await Future.wait([
            snapshotFuture,
            foodProvider.fetchSelfProfile(userId: userId, token: token),
          ]);
        } else {
          await snapshotFuture;
        }
      } else {
        await snapshotFuture;
      }

      if (mounted) {
        final snapshot = foodProvider.cookViewModelFor(widget.cookId);
        if (snapshot != null) _precacheCookImages(snapshot);
        setState(() => _isLoading = false);
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

  void _precacheCookImages(CookProfileViewModel snapshot) {
    // Cook avatar
    final avatarRaw = snapshot.cook.profilePhoto ?? '';
    if (avatarRaw.isNotEmpty && !avatarRaw.startsWith('assets/') && !avatarRaw.startsWith('data:')) {
      final url = getAbsoluteUrl(avatarRaw);
      final resolved = isGcsUrl(url) ? proxyGcsUrl(url) : url;
      if (resolved.startsWith('http')) precacheImage(NetworkImage(resolved), context);
    }
    // First 8 dish images
    for (final dish in snapshot.dishes.take(8)) {
      final raw = dish.image ?? dish.imageUrl ?? '';
      if (raw.isEmpty || raw.startsWith('assets/') || raw.startsWith('data:')) continue;
      final url = getAbsoluteUrl(raw);
      final resolved = isGcsUrl(url) ? proxyGcsUrl(url) : url;
      if (resolved.startsWith('http')) precacheImage(NetworkImage(resolved), context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final isRTL = languageProvider.isArabic;
    final foodProvider = context.watch<FoodProvider>();
    final snapshot = foodProvider.cookViewModelFor(widget.cookId);

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
                      Icons.arrow_back,
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
                  ? _buildProfileSkeleton()
                  : _error != null
                      ? Center(child: Text(_error!))
                      : snapshot == null
                          ? Center(child: Text(isRTL ? 'فشل التحميل' : 'Load failed'))
                          : Column(
                              children: [
                                _buildCookCard(isRTL, snapshot),
                                _buildTabs(isRTL),
                                Expanded(
                                  child: _selectedTab == 0
                                      ? _buildReviewsTab(isRTL, snapshot)
                                      : _buildMenuTab(isRTL, snapshot),
                                ),
                              ],
                            ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileSkeleton() {
    return _SkeletonPulse(
      builder: (color) {
        Widget box(double w, double h, {double r = 8}) => Container(
          width: w,
          height: h,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(r),
          ),
        );

        Widget fakeItem() => Container(
          margin: const EdgeInsets.fromLTRB(24, 0, 24, 12),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              box(80, 80, r: 12),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    box(160, 14, r: 6),
                    const SizedBox(height: 7),
                    box(100, 11, r: 6),
                    const SizedBox(height: 7),
                    box(64, 14, r: 6),
                  ],
                ),
              ),
            ],
          ),
        );

        return SingleChildScrollView(
          physics: const NeverScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Cook card
              Container(
                margin: const EdgeInsets.fromLTRB(24, 16, 24, 8),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Avatar
                    Container(
                      width: 96,
                      height: 96,
                      decoration: BoxDecoration(
                        color: color,
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    const SizedBox(width: 14),
                    // Info
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          box(140, 16),
                          const SizedBox(height: 6),
                          box(80, 12),
                          const SizedBox(height: 8),
                          Row(children: [
                            box(100, 12),
                            const SizedBox(width: 10),
                            box(70, 12),
                          ]),
                          const SizedBox(height: 8),
                          box(180, 12, r: 6),
                          const SizedBox(height: 5),
                          box(140, 12, r: 6),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              // Tabs
              Row(
                children: [
                  Expanded(
                    child: Container(
                      height: 44,
                      decoration: BoxDecoration(
                        border: Border(
                          bottom: BorderSide(color: color, width: 3),
                        ),
                      ),
                      alignment: Alignment.center,
                      child: box(64, 12),
                    ),
                  ),
                  Expanded(
                    child: Container(
                      height: 44,
                      alignment: Alignment.center,
                      child: box(64, 12),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              // Content rows
              fakeItem(),
              fakeItem(),
              fakeItem(),
              fakeItem(),
            ],
          ),
        );
      },
    );
  }

  Widget _buildCookCard(bool isRTL, CookProfileViewModel snapshot) {
    final selfProfile = snapshot.selfProfile;
    final cook = snapshot.cook;
    // Kitchen name: prefer selfProfile (reflects optimistic update) over stale CookInfo
    final cookName = selfProfile?.storeName?.isNotEmpty == true
        ? selfProfile!.storeName!
        : (cook.storeName?.isNotEmpty == true ? cook.storeName! : cook.name);

    // Expertise display: use all entries from selfProfile when available
    String _expertiseRaw;
    if (selfProfile != null && selfProfile.expertiseEntries.isNotEmpty) {
      // Build display from all populated expertise entries
      final names = selfProfile.expertiseEntries.map((e) {
        final raw = isRTL
            ? (e['nameAr']?.toString() ?? e['name']?.toString() ?? '')
            : (e['name']?.toString() ?? '');
        return raw;
      }).where((n) => n.isNotEmpty).toList();
      _expertiseRaw = names.isNotEmpty ? names.join(' · ') : 'Multi-Specialty';
    } else {
      // Fallback to CookInfo expertise list
      final rawList = cook.expertise
          .where((e) => !(e.length == 24 && RegExp(r'^[0-9a-fA-F]+$').hasMatch(e)))
          .toList();
      _expertiseRaw = rawList.isNotEmpty ? rawList.join(' · ') : 'Multi-Specialty';
    }
    // Guard: single-value ObjectId fallback
    if (_expertiseRaw.length == 24 && RegExp(r'^[0-9a-fA-F]+$').hasMatch(_expertiseRaw)) {
      _expertiseRaw = 'Multi-Specialty';
    }
    const _expertiseTranslations = <String, String>{
      'multi-specialty': 'متعدد التخصصات',
      'multi specialty': 'متعدد التخصصات',
      'saudi': 'مطبخ سعودي',
      'saudi cuisine': 'مطبخ سعودي',
      'arabic': 'مطبخ عربي',
      'arabic cuisine': 'مطبخ عربي',
      'lebanese': 'مطبخ لبناني',
      'lebanese cuisine': 'مطبخ لبناني',
      'egyptian': 'مطبخ مصري',
      'egyptian cuisine': 'مطبخ مصري',
      'indian': 'مطبخ هندي',
      'indian cuisine': 'مطبخ هندي',
      'italian': 'مطبخ إيطالي',
      'italian cuisine': 'مطبخ إيطالي',
      'asian': 'مطبخ آسيوي',
      'asian cuisine': 'مطبخ آسيوي',
      'mediterranean': 'مطبخ متوسطي',
      'mediterranean cuisine': 'مطبخ متوسطي',
      'turkish': 'مطبخ تركي',
      'turkish cuisine': 'مطبخ تركي',
      'mexican': 'مطبخ مكسيكي',
      'mexican cuisine': 'مطبخ مكسيكي',
      'american': 'مطبخ أمريكي',
      'american cuisine': 'مطبخ أمريكي',
      'breakfast': 'وجبات الإفطار',
      'desserts': 'حلويات',
      'sweets': 'حلويات',
      'grills': 'مشويات',
      'grilled': 'مشويات',
      'seafood': 'مأكولات بحرية',
      'healthy': 'أكل صحي',
      'healthy food': 'أكل صحي',
      'vegetarian': 'نباتي',
      'vegan': 'نباتي صرف',
      'pastry': 'معجنات',
      'bakery': 'مخبوزات',
      'home cooking': 'طبخ بيتي',
      'homemade': 'طبخ بيتي',
    };
    // When expertiseEntries are available, Arabic names are already resolved inside
    // _expertiseRaw — skip the static translation map to avoid double-translating.
    // Only apply the map for the legacy fallback path (CookInfo single-string).
    final expertiseDisplay = (selfProfile != null && selfProfile.expertiseEntries.isNotEmpty)
        ? _expertiseRaw
        : (isRTL
            ? (_expertiseTranslations[_expertiseRaw.toLowerCase()] ?? _expertiseRaw)
            : _expertiseRaw);
    final bioText = selfProfile?.bio ??
        cook.bio ??
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
                                imageUrl: cook.profilePhoto,
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
              // Cook info — reserve trailing margin for favorite button
              Expanded(
                child: Padding(
                  padding: EdgeInsetsDirectional.only(end: widget.isSelfView ? 0 : 52),
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
                            isRTL
                                ? '${toArabicNumerals(cook.rating?.toStringAsFixed(1) ?? '0.0')} (${toArabicNumerals((cook.ratingsCount ?? 0).toString())})'
                                : '${cook.rating?.toStringAsFixed(1) ?? '0.0'} (${cook.ratingsCount ?? 0})',
                            style: TextStyle(
                              fontSize: arabicNumFontSize(12, isRTL),
                              color: const Color(0xFF7D7C7C),
                            ),
                          ),
                          const SizedBox(width: 10),
                          const Icon(Icons.restaurant_menu, size: 13, color: Color(0xFF969494)),
                          const SizedBox(width: 3),
                          Text(
                            isRTL
                                ? '${toArabicNumerals(snapshot.dishes.length.toString())} طبق'
                                : '${snapshot.dishes.length} dishes',
                            style: TextStyle(
                              fontSize: arabicNumFontSize(12, isRTL),
                              color: const Color(0xFF7D7C7C),
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

          // ONE edit button for self-view (trailing corner, RTL-aware)
          if (widget.isSelfView)
            Positioned(
              top: 0,
              right: isRTL ? null : 0,
              left: isRTL ? 0 : null,
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

          // Favorite icon button — trailing corner, RTL-aware
          if (!widget.isSelfView)
            Positioned(
              top: 4,
              right: isRTL ? null : 4,
              left: isRTL ? 4 : null,
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
    final cook = context.read<FoodProvider>().cookViewModelFor(widget.cookId)?.cook;
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
        hintStyle: const TextStyle(color: Color(0xFF9E9E9E)),
        labelStyle: const TextStyle(color: Color(0xFF9E9E9E)),
        floatingLabelStyle: const TextStyle(color: Color(0xFF9E9E9E)),
        prefixIcon: Icon(icon, size: 18),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      ),
    );
  }

  // ─── Unified Edit Profile sheet — ONE button, ONE sheet, ONE Save ──────────
  void _openEditProfileSheet(bool isRTL) {
    final foodProvider = context.read<FoodProvider>();
    final viewModel = foodProvider.cookViewModelFor(widget.cookId);
    final selfProfile = viewModel?.selfProfile;
    final cook = viewModel?.cook;
    // Prefer selfProfile.storeName (updated after save) over stale CookInfo.storeName
    final cookName = selfProfile?.storeName?.isNotEmpty == true
        ? selfProfile!.storeName!
        : (cook?.storeName?.isNotEmpty == true ? cook!.storeName! : cook?.name ?? '');

    final storeNameCtrl  = TextEditingController(text: cookName);
    final bioCtrl        = TextEditingController(text: selfProfile?.bio ?? '');
    final phoneCtrl      = TextEditingController(text: selfProfile?.phone ?? '');
    final streetCtrl     = TextEditingController(text: selfProfile?.street ?? '');
    final areaCtrl       = TextEditingController(text: selfProfile?.area ?? '');
    final cityCtrl       = TextEditingController(text: selfProfile?.city ?? '');
    final buildingCtrl   = TextEditingController(text: selfProfile?.building ?? '');

    // ── Expertise multi-select state ─────────────────────────────────────────
    // Seed from selfProfile.expertiseIds which holds the actual ObjectId strings
    // parsed by fetchSelfProfile. Falls back to empty if not yet loaded.
    List<String> selectedExpertiseIds = List<String>.from(
      selfProfile?.expertiseIds ?? [],
    );

    List<Map<String, dynamic>> expertiseOptions = [];
    bool expertiseLoading = true;

    bool saving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) => StatefulBuilder(
        builder: (ctx, setSheetState) {

          // Fetch expertise options once when sheet first builds
          if (expertiseLoading && expertiseOptions.isEmpty) {
            http.get(Uri.parse(ApiConfig.getExpertise)).then((resp) {
              if (resp.statusCode == 200) {
                final body = jsonDecode(resp.body);
                if (body['success'] == true && body['data'] is List) {
                  setSheetState(() {
                    expertiseOptions = List<Map<String, dynamic>>.from(body['data']);
                    expertiseLoading = false;
                  });
                } else {
                  setSheetState(() => expertiseLoading = false);
                }
              } else {
                setSheetState(() => expertiseLoading = false);
              }
            }).catchError((_) {
              setSheetState(() => expertiseLoading = false);
            });
          }

          // ── Save all text/address fields ─────────────────────────────────
          // Location coordinates are managed separately via the Update Location
          // button — they are NOT included here.
          Future<void> saveAll() async {
            final token = context.read<AuthProvider>().token;
            if (token == null) return;

            final newPhone     = phoneCtrl.text.trim();
            final originalPhone = selfProfile?.phone ?? '';
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
                'expertise' : selectedExpertiseIds,
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
                // Build expertise entries from currently selected IDs + loaded options
                final newEntries = selectedExpertiseIds
                    .map((id) {
                      final match = expertiseOptions.firstWhere(
                        (e) => e['_id'] == id,
                        orElse: () => {'_id': id, 'name': id, 'nameAr': id},
                      );
                      return {
                        '_id': id,
                        'name': match['name']?.toString() ?? id,
                        'nameAr': match['nameAr']?.toString() ?? match['name']?.toString() ?? id,
                      };
                    })
                    .toList();

                // Reflect changes via provider — triggers rebuild immediately
                context.read<FoodProvider>().updateSelfProfile(CookSelfProfileData(
                  storeName: storeNameCtrl.text.trim(),
                  expertise: newEntries.isNotEmpty
                      ? (newEntries.first['name'] ?? '')
                      : null,
                  expertiseIds: selectedExpertiseIds,
                  expertiseEntries: newEntries,
                  bio: bioCtrl.text.trim(),
                  city: cityCtrl.text.trim(),
                  area: areaCtrl.text.trim(),
                  street: streetCtrl.text.trim(),
                  building: buildingCtrl.text.trim(),
                  phone: phoneChanged ? newPhone : selfProfile?.phone,
                ));
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

                  // Expertise — multi-select chips
                  Text(
                    isRTL ? 'التخصص' : 'Expertise',
                    style: const TextStyle(
                      fontSize: 13,
                      color: Color(0xFF9E9E9E),
                    ),
                  ),
                  const SizedBox(height: 8),
                  expertiseLoading
                      ? const Center(
                          child: SizedBox(
                            height: 24,
                            width: 24,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                        )
                      : Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: expertiseOptions.map((cat) {
                            final id = cat['_id'] as String? ?? '';
                            final label = isRTL
                                ? (cat['nameAr'] ?? cat['name'] ?? id)
                                : (cat['name'] ?? id);
                            final isSelected = selectedExpertiseIds.contains(id);
                            return GestureDetector(
                              onTap: () {
                                setSheetState(() {
                                  if (isSelected) {
                                    selectedExpertiseIds = List.from(selectedExpertiseIds)..remove(id);
                                  } else {
                                    selectedExpertiseIds = List.from(selectedExpertiseIds)..add(id);
                                  }
                                });
                              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                decoration: BoxDecoration(
                                  color: isSelected ? AppTheme.accentColor : const Color(0xFFF5F5F5),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(
                                    color: isSelected ? AppTheme.accentColor : const Color(0xFFE0E0E0),
                                  ),
                                ),
                                child: Text(
                                  label.toString(),
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: isSelected ? Colors.white : AppTheme.textPrimary,
                                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
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
                  if (selfProfile?.phone == null || (selfProfile?.phone?.isEmpty ?? true))
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
                  isRTL ? 'التقييمات' : 'Reviews',
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
                  isRTL ? 'قائمة الطعام' : 'Menu',
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

  Widget _buildMenuTab(bool isRTL, CookProfileViewModel snapshot) {
    if (snapshot.dishes.isEmpty) {
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
      itemCount: snapshot.dishes.length,
      itemBuilder: (context, index) {
        return _buildDishCard(snapshot.dishes[index], isRTL);
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
                        isRTL ? (dish.descriptionAr ?? dish.description) : dish.description,
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
            // Price — direction-aware, orange
            Padding(
              padding: const EdgeInsetsDirectional.only(end: 14),
              child: Text(
                isRTL ? 'ر.س ${toArabicNumerals(dish.price.toStringAsFixed(2))}' : '${dish.price.toStringAsFixed(2)} SAR',
                style: TextStyle(
                  fontSize: arabicNumFontSize(14, isRTL),
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

  Widget _buildReviewsTab(bool isRTL, CookProfileViewModel snapshot) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildRatingSummary(isRTL, snapshot.ratingSummary),
              const SizedBox(height: 16),
              _buildSortRow(isRTL),
            ],
          ),
        ),
        Expanded(
          child: snapshot.reviews.isEmpty
              ? Center(
                  child: Text(
                    isRTL ? 'لا توجد تقييمات بعد' : 'No reviews yet',
                    style: const TextStyle(
                      fontSize: 16,
                      color: Color(0xFF7D7C7C),
                    ),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
                  itemCount: snapshot.reviews.length,
                  itemBuilder: (context, index) {
                    return _buildReviewCard(snapshot.reviews[index], isRTL);
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildRatingSummary(bool isRTL, Map<String, dynamic>? ratingSummary) {
    final averageRating = ratingSummary?['averageRating']?.toDouble() ?? 0.0;
    final totalReviews = ratingSummary?['totalReviews'] ?? 0;
    final starDistribution = Map<String, int>.from(
      ratingSummary?['starDistribution'] ?? {'5': 0, '4': 0, '3': 0, '2': 0, '1': 0},
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
                      isRTL ? toArabicNumerals(averageRating.toStringAsFixed(1)) : averageRating.toStringAsFixed(1),
                      style: TextStyle(
                        fontSize: arabicNumFontSize(20, isRTL),
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
                      isRTL ? 'من ٥' : 'out of 5',
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
                            isRTL ? toArabicNumerals('$star') : '$star',
                            style: TextStyle(
                              fontSize: arabicNumFontSize(11, isRTL),
                              color: const Color(0xFF7D7C7C),
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
                        isRTL ? '${toArabicNumerals('$percentage')}٪' : '$percentage%',
                        style: TextStyle(
                          fontSize: arabicNumFontSize(11, isRTL),
                          color: const Color(0xFF7D7C7C),
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
                        isRTL
                            ? toArabicNumerals('${createdAt.day}/${createdAt.month}/${createdAt.year}')
                            : '${createdAt.day}/${createdAt.month}/${createdAt.year}',
                        style: TextStyle(
                          fontSize: arabicNumFontSize(11, isRTL),
                          color: const Color(0xFF7D7C7C),
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

class _SkeletonPulse extends StatefulWidget {
  final Widget Function(Color color) builder;
  const _SkeletonPulse({required this.builder});

  @override
  State<_SkeletonPulse> createState() => _SkeletonPulseState();
}

class _SkeletonPulseState extends State<_SkeletonPulse>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (_, __) => widget.builder(
        Color.lerp(
          const Color(0xFFEEEEEE),
          const Color(0xFFD4D4D4),
          _ctrl.value,
        )!,
      ),
    );
  }
}
