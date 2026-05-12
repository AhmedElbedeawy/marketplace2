import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';

class OfferProvider extends ChangeNotifier {
  bool _isLoading = false;
  String? _error;

  List<dynamic> _offers = [];
  dynamic _currentOffer;

  List<dynamic> get offers => _offers;
  dynamic get currentOffer => _currentOffer;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchOffers(String token) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await http.get(
        Uri.parse(ApiConfig.cookMenu),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        _offers = data['offers'] ?? data ?? [];
      } else {
        _error = 'Failed to fetch offers';
      }
    } catch (e) {
      _error = 'Error: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchOfferById(String token, String offerId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await http.get(
        Uri.parse(ApiConfig.getOfferById(offerId)),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        _currentOffer = json.decode(response.body);
      } else {
        _error = 'Failed to fetch offer';
      }
    } catch (e) {
      _error = 'Error: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createOffer(String token, Map<String, dynamic> offerData) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final uri = Uri.parse(ApiConfig.createOffer);
      final request = http.MultipartRequest('POST', uri);
      request.headers['Authorization'] = 'Bearer $token';

      offerData.forEach((key, value) {
        if (value is String) {
          request.fields[key] = value;
        } else if (value is num || value is bool) {
          request.fields[key] = value.toString();
        } else if (value is List || value is Map) {
          request.fields[key] = json.encode(value);
        }
      });

      if (offerData['images'] != null) {
        final images = offerData['images'] as List;
        for (var i = 0; i < images.length; i++) {
          if (images[i] is http.MultipartFile) {
            request.files.add(images[i] as http.MultipartFile);
          }
        }
      }

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 201 || response.statusCode == 200) {
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        final data = json.decode(response.body);
        _error = data['message'] ?? 'Failed to create offer';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Error: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateOffer(String token, String offerId, Map<String, dynamic> offerData) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final uri = Uri.parse(ApiConfig.getOfferById(offerId));
      final request = http.MultipartRequest('PUT', uri);
      request.headers['Authorization'] = 'Bearer $token';

      offerData.forEach((key, value) {
        if (value is String) {
          request.fields[key] = value;
        } else if (value is num || value is bool) {
          request.fields[key] = value.toString();
        } else if (value is List || value is Map) {
          request.fields[key] = json.encode(value);
        }
      });

      if (offerData['images'] != null) {
        final images = offerData['images'] as List;
        for (var i = 0; i < images.length; i++) {
          if (images[i] is http.MultipartFile) {
            request.files.add(images[i] as http.MultipartFile);
          }
        }
      }

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        final data = json.decode(response.body);
        _error = data['message'] ?? 'Failed to update offer';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Error: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteOffer(String token, String offerId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await http.delete(
        Uri.parse(ApiConfig.deleteOffer(offerId)),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        _offers.removeWhere((o) => o['_id'] == offerId);
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _error = 'Failed to delete offer';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = 'Error: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<List<dynamic>> fetchAdminDishes(String token) async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.adminDishes}?limit=100'),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['dishes'] ?? data ?? [];
      }
    } catch (e) {
      debugPrint('Error fetching admin dishes: $e');
    }
    return [];
  }

  Future<bool> updateStock(String token, String offerId, int newStock) async {
    _error = null;

    try {
      final response = await http.patch(
        Uri.parse(ApiConfig.getOfferStock(offerId)),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode({'stock': newStock}),
      );

      if (response.statusCode == 200) {
        await fetchOffers(token);
        return true;
      } else {
        _error = 'Failed to update stock';
        return false;
      }
    } catch (e) {
      _error = 'Error: $e';
      return false;
    }
  }

  Future<bool> toggleActive(String token, String offerId) async {
    _error = null;

    try {
      final offer = _offers.firstWhere((o) => o['_id'] == offerId);
      final newStatus = !(offer['isActive'] ?? false);

      final response = await http.patch(
        Uri.parse(ApiConfig.getOfferById(offerId)),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode({'isActive': newStatus}),
      );

      if (response.statusCode == 200) {
        await fetchOffers(token);
        return true;
      } else {
        _error = 'Failed to toggle active status';
        return false;
      }
    } catch (e) {
      _error = 'Error: $e';
      return false;
    }
  }
}
