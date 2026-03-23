import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/food.dart';

class CookProfileProvider extends ChangeNotifier {
  bool _isLoading = false;
  String? _error;

  // User profile fields
  String? _userId;
  String? _name;
  String? _email;
  String? _phone;
  String? _profilePhoto;
  String? _roleCookStatus;

  // Cook profile fields
  String? _storeName;
  List<String> _expertise = [];
  List<String> _fulfillmentMethods = [];
  String? _city;
  double _lat = 24.7136;
  double _lng = 46.6753;

  // Getters
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isCook => _roleCookStatus != null && _roleCookStatus != 'none';

  // User fields
  String? get userId => _userId;
  String? get name => _name;
  String? get email => _email;
  String? get phone => _phone;
  String? get profilePhoto => _profilePhoto;

  // Cook fields
  String? get storeName => _storeName;
  List<String> get expertise => _expertise;
  List<String> get fulfillmentMethods => _fulfillmentMethods;
  String? get city => _city;
  double get lat => _lat;
  double get lng => _lng;

  /// Fetch user and cook profile from API
  Future<void> fetchProfile(String token) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await http.get(
        Uri.parse(ApiConfig.userProfile),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        _userId = data['_id'] ?? data['id'];
        _name = data['name'];
        _email = data['email'];
        _phone = data['phone'];
        _profilePhoto = data['profilePhoto'];
        _roleCookStatus = data['role_cook_status'];

        // Cook-specific fields
        if (_roleCookStatus != null && _roleCookStatus != 'none') {
          _storeName = data['storeName'];
          _expertise = _parseStringList(data['expertise']);
          _fulfillmentMethods =
              _parseStringList(data['questionnaire']?['fulfillmentMethods']);
          _city = data['city'];
          if (data['location'] != null) {
            _lat = (data['location']['lat'] ?? 24.7136).toDouble();
            _lng = (data['location']['lng'] ?? 46.6753).toDouble();
          }
        }
      } else {
        _error = 'Failed to load profile';
      }
    } catch (e) {
      _error = 'Error loading profile: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  List<String> _parseStringList(dynamic value) {
    if (value == null) return [];
    if (value is List) return List<String>.from(value);
    if (value is String) return [value];
    return [];
  }

  /// Update cook profile
  Future<bool> updateCookProfile({
    required String token,
    String? storeName,
    List<String>? expertise,
    String? city,
    double? lat,
    double? lng,
    List<String>? fulfillmentMethods,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final body = <String, dynamic>{};
      if (storeName != null) body['storeName'] = storeName;
      if (expertise != null) body['expertise'] = expertise;
      if (city != null) body['city'] = city;
      if (lat != null && lng != null) {
        body['location'] = {'lat': lat, 'lng': lng};
      }
      if (fulfillmentMethods != null) {
        body['questionnaire'] = {'fulfillmentMethods': fulfillmentMethods};
      }

      final response = await http.put(
        Uri.parse(ApiConfig.cookProfile),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode(body),
      );

      if (response.statusCode == 200) {
        // Update local state
        if (storeName != null) _storeName = storeName;
        if (expertise != null) _expertise = expertise;
        if (city != null) _city = city;
        if (lat != null) _lat = lat;
        if (lng != null) _lng = lng;
        if (fulfillmentMethods != null) {
          _fulfillmentMethods = fulfillmentMethods;
        }

        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        final data = json.decode(response.body);
        _error = data['message'] ?? 'Failed to update profile';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Error updating profile: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Update profile photo
  Future<bool> updateProfilePhoto(String token, String photoData) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await http.put(
        Uri.parse(ApiConfig.cookProfilePhoto),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode({'profilePhoto': photoData}),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        _profilePhoto = data['profilePhoto'] ?? photoData;
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        final data = json.decode(response.body);
        _error = data['message'] ?? 'Failed to update photo';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Error updating photo: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Toggle fulfillment method
  void toggleFulfillmentMethod(String method) {
    if (_fulfillmentMethods.contains(method)) {
      _fulfillmentMethods.remove(method);
    } else {
      _fulfillmentMethods.add(method);
    }
    notifyListeners();
  }

  /// Toggle expertise
  void toggleExpertise(String exp) {
    if (_expertise.contains(exp)) {
      _expertise.remove(exp);
    } else {
      _expertise.add(exp);
    }
    notifyListeners();
  }
}
