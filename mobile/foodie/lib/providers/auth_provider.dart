import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../config/api_config.dart';
import '../utils/auth_validators.dart';
import '../services/social_auth_service.dart';
import 'country_provider.dart';

class AuthProvider extends ChangeNotifier {
  final SharedPreferences _prefs;
  final CountryProvider _countryProvider;
  User? _user;
  String? _token;
  bool _isLoading = false;
  String? _error;

  AuthProvider(this._prefs, this._countryProvider) {
    _loadToken();
  }

  User? get user => _user;
  String? get token => _token;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _token != null;

  /// True for the Apple App Review / demo account. Mirrors the server-side
  /// login bypass so the checkout OTP gate is never shown, regardless of
  /// whatever isPhoneVerified value is cached in SharedPreferences.
  /// Normal users are unaffected — this only matches the single demo email.
  static const String _demoEmail = 'demo@eltekkeya.com';
  bool get isDemoAccount =>
      _user?.email.toLowerCase() == _demoEmail;

  void _loadToken() {
    _token = _prefs.getString('authToken');
    final userData = _prefs.getString('userData');
    if (userData != null) {
      _user = User.fromJson(jsonDecode(userData));
    }

    debugPrint('=== TOKEN LOADED FROM STORAGE ===');
    debugPrint('Token exists: ${_token != null}');
    debugPrint('Token value: ${_token?.substring(0, _token!.length > 30 ? 30 : _token!.length)}...');
    debugPrint('Token length: ${_token?.length}');
    debugPrint('User ID: ${_user?.id}');
    debugPrint('User role: ${_user?.role}');

    // Refresh the profile in the background on every cold start so that
    // stale cached fields (e.g. isPhoneVerified written before a backend
    // fix was deployed) are corrected without requiring a re-login.
    if (_token != null) {
      Future.microtask(() => fetchUserProfile());
    }
  }

  Future<bool> login({required String email, required String password}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // Validate input is either email or phone
      if (!AuthValidators.isValidEmailOrPhone(email)) {
        _error = 'Please enter a valid email or phone number';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      final countryCode = _countryProvider.countryCode;
      final credential = email.trim();
      final isPhone = AuthValidators.isValidPhoneNumber(credential);
      final response = await http.post(
        Uri.parse(ApiConfig.authLogin),
        headers: {
          'Content-Type': 'application/json',
          'x-country-code': countryCode.toUpperCase(),
        },
        body: jsonEncode({
          'email': credential,
          if (isPhone) 'phone': credential,
          'password': password,
        }),
      ).timeout(
        const Duration(seconds: 30),
        onTimeout: () => throw Exception('Connection timeout'),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _token = data['token'];
        _user = User.fromJson(data['user']);

        debugPrint('=== LOGIN SUCCESS ===');
        debugPrint('Token received: ${_token?.substring(0, _token!.length > 30 ? 30 : _token!.length)}...');
        debugPrint('Token length: ${_token?.length}');
        debugPrint('User ID: ${_user?.id}');
        debugPrint('User role: ${_user?.role}');
        debugPrint('User isCook: ${_user?.roleCookStatus}');

        await _prefs.setString('authToken', _token!);
        await _prefs.setString('userData', jsonEncode(_user!.toJson()));
        
        debugPrint('Token saved to SharedPreferences');

        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        final errorData = jsonDecode(response.body);
        _error = errorData['message'] ?? 'Login failed';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Error: ${e.toString()}';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> register({
    required String email,
    required String password,
    required String name,
    bool requestCook = false,
    String? storeName,
    List<String>? expertise,
    String? bio,
    String? city,
    String? addressLine1,
    String? addressLine2,
    String? label,
    String? deliveryNotes,
    double? lat,
    double? lng,
    String? kitchenImage,
    String? cookCountryCode,
    Map<String, dynamic>? questionnaire,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // Validate input is either email or phone
      if (!AuthValidators.isValidEmailOrPhone(email)) {
        _error = 'Please enter a valid email or phone number';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      final countryCode = _countryProvider.countryCode;
      final credential = email.trim();
      final isPhone = AuthValidators.isValidPhoneNumber(credential);
      final response = await http.post(
        Uri.parse(ApiConfig.authRegister),
        headers: {
          'Content-Type': 'application/json',
          'x-country-code': countryCode.toUpperCase(),
        },
        body: jsonEncode({
          'email': credential,
          if (isPhone) 'phone': credential,
          'password': password,
          'name': name,
          'role': 'foodie',
          'requestCook': requestCook,
          if (requestCook) 'storeName': storeName,
          if (requestCook && expertise != null && expertise.isNotEmpty) 'expertise': expertise,
          if (requestCook && bio != null) 'bio': bio,
          if (requestCook && city != null) 'city': city,
          if (requestCook && addressLine1 != null) 'addressLine1': addressLine1,
          if (requestCook && addressLine2 != null) 'addressLine2': addressLine2,
          if (requestCook && label != null) 'label': label,
          if (requestCook && deliveryNotes != null && deliveryNotes.isNotEmpty) 'deliveryNotes': deliveryNotes,
          if (requestCook && lat != null) 'lat': lat,
          if (requestCook && lng != null) 'lng': lng,
          if (requestCook && cookCountryCode != null) 'countryCode': cookCountryCode,
          // kitchenImage is NOT sent here — Joi schema rejects unknown fields.
          // Upload kitchen image separately after registration via /cook/profile/photo.
          if (requestCook && questionnaire != null) 'questionnaire': questionnaire,
        }),
      ).timeout(
        const Duration(seconds: 30),
        onTimeout: () => throw Exception('Connection timeout'),
      );

      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        _token = data['token'];
        _user = User.fromJson(data['user']);

        await _prefs.setString('authToken', _token!);
        await _prefs.setString('userData', jsonEncode(_user!.toJson()));

        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        try {
          final errorData = jsonDecode(response.body);
          _error = errorData['message'] as String? ?? 'Registration failed';
        } catch (_) {
          _error = 'Registration failed';
        }
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Error: ${e.toString()}';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> becomeCook({
    required String storeName,
    required String expertise,
    required String bio,
    String? city,
    double? lat,
    double? lng,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/auth/become-cook'),
        headers: getAuthHeaders(),
        body: jsonEncode({
          'storeName': storeName,
          'expertise': expertise,
          'bio': bio,
          'city': city,
          'lat': lat,
          'lng': lng,
        }),
      ).timeout(
        const Duration(seconds: 30),
        onTimeout: () => throw Exception('Connection timeout'),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        // becomeCook response is partial — no isPhoneVerified field.
        // Pass existingIsPhoneVerified so the field absence does not
        // corrupt the locally verified state.
        _user = User.fromJson(
          data['user'],
          existingIsPhoneVerified: _user?.isPhoneVerified,
        );
        await _prefs.setString('userData', jsonEncode(_user!.toJson()));

        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        final data = jsonDecode(response.body);
        _error = data['message'] ?? 'Request failed';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Error: ${e.toString()}';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> socialLogin({required SocialAuthUser socialUser}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final countryCode = _countryProvider.countryCode;
      
      // Call backend social login endpoint
      final response = await http.post(
        Uri.parse(ApiConfig.authSocialLogin),
        headers: {
          'Content-Type': 'application/json',
          'x-country-code': countryCode.toUpperCase(),
        },
        body: jsonEncode({
          'id': socialUser.id,
          'name': socialUser.name,
          // Apple omits email on every login after the first. Exclude the key
          // entirely when empty so the backend Joi schema does not reject the request.
          if (socialUser.email.isNotEmpty) 'email': socialUser.email,
          'profileImage': socialUser.profileImageUrl,
          'provider': socialUser.provider,
          'accessToken': socialUser.accessToken,
        }),
      ).timeout(
        const Duration(seconds: 30),
        onTimeout: () => throw Exception('Connection timeout'),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        _token = data['token'];
        _user = User.fromJson(data['user']);

        await _prefs.setString('authToken', _token!);
        await _prefs.setString('userData', jsonEncode(_user!.toJson()));

        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        final errorData = jsonDecode(response.body);
        _error = errorData['message'] ?? 'Social login failed';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Error: ${e.toString()}';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Login with Google
  Future<bool> loginWithGoogle() async {
    final socialUser = await SocialAuthService.loginWithGoogle();
    if (socialUser != null) {
      return socialLogin(socialUser: socialUser);
    }
    _error = 'Google login cancelled or failed';
    notifyListeners();
    return false;
  }

  /// Login with Apple (iOS only)
  Future<bool> loginWithApple() async {
    final socialUser = await SocialAuthService.loginWithApple();
    if (socialUser != null) {
      return socialLogin(socialUser: socialUser);
    }
    _error = 'Apple login cancelled or failed';
    notifyListeners();
    return false;
  }

  /// Delete the currently authenticated account.
  /// Clears local session on success regardless of backend response
  /// to ensure the user is always logged out after requesting deletion.
  Future<bool> deleteAccount() async {
    if (_token == null) return false;
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await http.delete(
        Uri.parse('${ApiConfig.baseUrl}/auth/account'),
        headers: getAuthHeaders(),
      ).timeout(const Duration(seconds: 30));

      // Accept 200 or 204 as success
      final success =
          response.statusCode == 200 || response.statusCode == 204;

      if (!success) {
        try {
          final body = jsonDecode(response.body);
          _error = body['message'] ?? 'Failed to delete account';
        } catch (_) {
          _error = 'Failed to delete account';
        }
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      // Network error — still clear local session so the user is not stuck
      debugPrint('deleteAccount error: $e');
    }

    // Always clear local session after deletion attempt.
    // logoutGoogle already swallows errors internally; guard again just in case.
    try { await SocialAuthService.logoutGoogle(); } catch (_) {}
    _token = null;
    _user = null;
    await _prefs.remove('authToken');
    await _prefs.remove('userData');
    _isLoading = false;
    notifyListeners();
    return true;
  }

  /// Verify phone number via Firebase Phone Auth idToken.
  /// Calls POST /auth/verify-phone (protected route).
  /// Returns true and updates local user on success.
  /// On failure the existing phone/isPhoneVerified state is preserved.
  Future<bool> verifyPhone(String idToken) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/auth/verify-phone'),
        headers: getAuthHeaders(),
        body: jsonEncode({'idToken': idToken}),
      ).timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _user = User.fromJson(data['user']);
        await _prefs.setString('userData', jsonEncode(_user!.toJson()));
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        final errorData = jsonDecode(response.body);
        _error = errorData['message'] ?? 'Phone verification failed';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Error: ${e.toString()}';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Logout all social sessions.
  /// Google sign-out failure must not block the local-state clear in [logout].
  Future<void> logoutSocial() async {
    try { await SocialAuthService.logoutGoogle(); } catch (_) {}
    await logout();
  }

  Future<void> logout() async {
    _token = null;
    _user = null;
    await _prefs.remove('authToken');
    await _prefs.remove('userData');
    notifyListeners();
  }

  Future<void> fetchUserProfile() async {
    if (_token == null) return;
    try {
      final response = await http.get(
        Uri.parse(ApiConfig.getUserProfile),
        headers: {'Authorization': 'Bearer $_token', 'Content-Type': 'application/json'},
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final userData = data['user'] ?? data;
        // Pass existingIsPhoneVerified so that any backend endpoint that
        // omits the field does not reset a previously verified state to false.
        // If the endpoint explicitly returns isPhoneVerified (as the fixed
        // /users/profile now does), that authoritative value is used instead.
        _user = User.fromJson(
          userData,
          existingIsPhoneVerified: _user?.isPhoneVerified,
        );
        await _prefs.setString('userData', jsonEncode(_user!.toJson()));
        notifyListeners();
      }
    } catch (_) {}
  }

  /// Immediately updates the cook status on the cached user object and
  /// persists it to SharedPreferences. Used after cook registration so
  /// _CookHubTab switches to _PendingCookView without relying on a
  /// separate fetchUserProfile() call that could fail silently.
  Future<void> updateCookStatus(String status) async {
    if (_user == null) return;
    _user = User(
      id: _user!.id,
      email: _user!.email,
      name: _user!.name,
      phone: _user!.phone,
      isPhoneVerified: _user!.isPhoneVerified,
      profileImage: _user!.profileImage,
      role: _user!.role,
      roleCookStatus: status,
      createdAt: _user!.createdAt,
    );
    await _prefs.setString('userData', jsonEncode(_user!.toJson()));
    notifyListeners();
  }

  Map<String, String> getAuthHeaders() {
    final countryCode = _countryProvider.countryCode;
    final headers = {
      'Content-Type': 'application/json',
      'x-country-code': countryCode.toUpperCase(),
      if (_token != null) 'Authorization': 'Bearer $_token',
    };
    
    debugPrint('=== AUTH HEADERS ===');
    debugPrint('Token in headers: ${_token != null}');
    debugPrint('Authorization header: ${headers['Authorization']?.substring(0, 40)}...');
    
    return headers;
  }
}

class User {
  final String id;
  final String email;
  final String name;
  final String? phone;
  final bool isPhoneVerified;
  final String? profileImage;
  final String role;
  final String roleCookStatus;
  final DateTime createdAt;

  User({
    required this.id,
    required this.email,
    required this.name,
    this.phone,
    this.isPhoneVerified = false,
    this.profileImage,
    required this.role,
    this.roleCookStatus = 'none',
    required this.createdAt,
  });

  /// Parse a user from a JSON map.
  ///
  /// [existingIsPhoneVerified] — the caller's currently cached value.
  /// Rule: if the JSON *explicitly* contains `isPhoneVerified`, that value is
  /// used (server is authoritative). If the field is *absent* (partial
  /// response like becomeCook, fetchUserProfile from an older backend, etc.),
  /// the existing cached value is preserved instead of defaulting to false.
  /// This prevents partial API responses from silently corrupting a previously
  /// verified state.
  factory User.fromJson(
    Map<String, dynamic> json, {
    bool? existingIsPhoneVerified,
  }) =>
      User(
        id: json['_id'] ?? '',
        email: json['email'] ?? '',
        name: json['name'] ?? '',
        phone: json['phone'],
        isPhoneVerified: json.containsKey('isPhoneVerified')
            ? json['isPhoneVerified'] == true
            : (existingIsPhoneVerified ?? false),
        // Server returns profilePhoto; also check profileImage for legacy cached data
        profileImage: json['profilePhoto'] ?? json['profileImage'] ?? json['avatar'],
        role: json['role'] ?? 'user',
        roleCookStatus: json['role_cook_status'] ?? 'none',
        createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toString()),
      );

  Map<String, dynamic> toJson() => {
    '_id': id,
    'email': email,
    'name': name,
    'phone': phone,
    'isPhoneVerified': isPhoneVerified,
    'profilePhoto': profileImage,
    'role': role,
    'role_cook_status': roleCookStatus,
    'createdAt': createdAt.toIso8601String(),
  };
}
