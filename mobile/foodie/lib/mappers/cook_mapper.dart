import '../models/food.dart';

// ── Self-profile editable fields ──────────────────────────────────────────────

class CookSelfProfileData {
  final String? phone;
  final String? bio;
  final String? expertise; // first expertise display name (legacy, kept for compat)
  final String? storeName; // kitchen name — needed for optimistic UI update
  final List<String> expertiseIds; // all selected expertise ObjectIds
  final List<Map<String, dynamic>> expertiseEntries; // [{_id, name, nameAr}] for card display
  final String? city;
  final String? area;
  final String? street;
  final String? building;

  const CookSelfProfileData({
    this.phone,
    this.bio,
    this.expertise,
    this.storeName,
    this.expertiseIds = const [],
    this.expertiseEntries = const [],
    this.city,
    this.area,
    this.street,
    this.building,
  });
}

// ── Per-screen view model for CookProfileScreen ───────────────────────────────
// Single object delivered to the UI — no separate snapshot + selfProfile.

class CookProfileViewModel {
  final CookInfo cook;
  final List<Food> dishes;
  final Map<String, dynamic>? ratingSummary;
  final List<Map<String, dynamic>> reviews;
  final DateTime fetchedAt;
  final CookSelfProfileData? selfProfile;

  const CookProfileViewModel({
    required this.cook,
    required this.dishes,
    this.ratingSummary,
    required this.reviews,
    required this.fetchedAt,
    this.selfProfile,
  });

  CookProfileViewModel withSelfProfile(CookSelfProfileData? profile) {
    return CookProfileViewModel(
      cook: cook,
      dishes: dishes,
      ratingSummary: ratingSummary,
      reviews: reviews,
      fetchedAt: fetchedAt,
      selfProfile: profile,
    );
  }
}

// ── Pure mapper: raw HTTP data → CookProfileViewModel ─────────────────────────
// Called once after all parallel fetches complete. O(n) over cooks list only.

CookProfileViewModel buildCookProfileViewModel({
  required String cookId,
  required String cookName,
  required List<CookInfo> cooks,
  required List<Food> dishes,
  required Map<String, dynamic>? ratingSummary,
  required List<Map<String, dynamic>> reviews,
  CookSelfProfileData? selfProfile,
}) {
  final cook = cooks.firstWhere(
    (c) => c.id == cookId,
    orElse: () => CookInfo(id: cookId, name: cookName),
  );
  return CookProfileViewModel(
    cook: cook,
    dishes: dishes,
    ratingSummary: ratingSummary,
    reviews: reviews,
    fetchedAt: DateTime.now(),
    selfProfile: selfProfile,
  );
}
