import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../config/api_config.dart';
import '../utils/auth_validators.dart';
import '../services/social_auth_service.dart';

class AuthProvider extends ChangeNotifier {
  final SharedPreferences _prefs;
  User? _user;
  String? _token;
  bool _isLoading = false;
  String? _error;

  AuthProvider(this._prefs) {
    _loadToken();
  }

  User? get user => _user;
  String? get token => _token;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _token != null;

  void _loadToken() {
    _token = _prefs.getString('authToken');
    final userData = _prefs.getString('userData');
    if (userData != null) {
      _user = User.fromJson(jsonDecode(userData));
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

      final countryCode = _prefs.getString('platformCountryCode') ?? 'EG';
      final response = await http.post(
        Uri.parse(ApiConfig.authLogin),
        headers: {
          'Content-Type': 'application/json',
          'x-country-code': countryCode.toUpperCase(),
        },
        body: jsonEncode({
          'email': email.trim(),
          'phone': email.trim(), // Send as both - backend will determine which to use
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

        await _prefs.setString('authToken', _token!);
        await _prefs.setString('userData', jsonEncode(_user!.toJson()));

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
    String? expertise,
    String? bio,
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

      final countryCode = _prefs.getString('platformCountryCode') ?? 'EG';
      final response = await http.post(
        Uri.parse(ApiConfig.authRegister),
        headers: {
          'Content-Type': 'application/json',
          'x-country-code': countryCode.toUpperCase(),
        },
        body: jsonEncode({
          'email': email.trim(),
          'phone': email.trim(), // Send as both - backend will determine which to use
          'password': password,
          'name': name,
          'role': 'foodie',
          'requestCook': requestCook,
          if (requestCook) 'storeName': storeName,
          if (requestCook) 'expertise': expertise,
          if (requestCook) 'bio': bio,
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
        _error = 'Registration failed';
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
        _user = User.fromJson(data['user']);
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
      // Demo mode - accept social login directly
      _token = 'demo_token_${socialUser.provider}';
      _user = User(
        id: socialUser.id,
        name: socialUser.name,
        email: socialUser.email,
        phone: '',
        profileImage: socialUser.profileImageUrl,
        role: 'customer',
        createdAt: DateTime.now(),
      );

      await _prefs.setString('authToken', _token!);
      await _prefs.setString('userData', jsonEncode(_user!.toJson()));

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = 'Error: ${e.toString()}';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Login with Facebook
  Future<bool> loginWithFacebook() async {
    final socialUser = await SocialAuthService.loginWithFacebook();
    if (socialUser != null) {
      return socialLogin(socialUser: socialUser);
    }
    _error = 'Facebook login cancelled or failed';
    notifyListeners();
    return false;
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

  /// Logout all social sessions
  Future<void> logoutSocial() async {
    await SocialAuthService.logoutFacebook();
    await SocialAuthService.logoutGoogle();
    await logout();
  }

  Future<void> logout() async {
    _token = null;
    _user = null;
    await _prefs.remove('authToken');
    await _prefs.remove('userData');
    notifyListeners();
  }

  Map<String, String> getAuthHeaders() {
    final countryCode = _prefs.getString('platformCountryCode') ?? 'EG';
    return {
      'Content-Type': 'application/json',
      'x-country-code': countryCode.toUpperCase(),
      if (_token != null) 'Authorization': 'Bearer $_token',
    };
  }
}

class User {
  final String id;
  final String email;
  final String name;
  final String? phone;
  final String? profileImage;
  final String role;
  final String roleCookStatus;
  final DateTime createdAt;

  User({
    required this.id,
    required this.email,
    required this.name,
    this.phone,
    this.profileImage,
    required this.role,
    this.roleCookStatus = 'none',
    required this.createdAt,
  });

  factory User.fromJson(Map<String, dynamic> json) => User(
      id: json['_id'] ?? '',
      email: json['email'] ?? '',
      name: json['name'] ?? '',
      phone: json['phone'],
      profileImage: json['profileImage'],
      role: json['role'] ?? 'user',
      roleCookStatus: json['role_cook_status'] ?? 'none',
      createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toString()),
    );

  Map<String, dynamic> toJson() => {
    '_id': id,
    'email': email,
    'name': name,
    'phone': phone,
    'profileImage': profileImage,
    'role': role,
    'role_cook_status': roleCookStatus,
    'createdAt': createdAt.toIso8601String(),
  };
}
