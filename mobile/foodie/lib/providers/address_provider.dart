import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/address.dart';

class AddressProvider extends ChangeNotifier {
  List<Address> _addresses = [];
  Address? _selectedAddress;
  bool _isLoading = false;
  String? _error;

  List<Address> get addresses => _addresses;
  Address? get selectedAddress => _selectedAddress;
  bool get isLoading => _isLoading;
  String? get error => _error;

  /// Fetch all user addresses
  Future<void> fetchAddresses([String? token]) async {
    if (token == null) {
      _isLoading = false;
      _error = 'Token required';
      notifyListeners();
      return;
    }
    
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await http.get(
        Uri.parse(ApiConfig.getAddresses()),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final addressesJson = data['data'] ?? data ?? [];

        _addresses =
            addressesJson.map((json) => Address.fromJson(json)).toList();

        // Auto-select default address
        _selectedAddress = _addresses.firstWhere(
          (addr) => addr.isDefault,
          orElse: () =>
              _addresses.isNotEmpty ? _addresses.first : _addresses[0],
        );
      } else {
        throw Exception('Failed to load addresses');
      }
    } catch (err) {
      _error = err.toString();
      debugPrint('Error fetching addresses: $err');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Create new address
  Future<Address?> createAddress({
    required String token,
    required String addressLine1,
    String? addressLine2,
    required String city,
    required String countryCode,
    required String label,
    String? deliveryNotes,
    required double lat,
    required double lng,
  }) async {
    try {
      final response = await http.post(
        Uri.parse(ApiConfig.createAddress()),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode({
          'addressLine1': addressLine1,
          'addressLine2': addressLine2,
          'city': city,
          'countryCode': countryCode,
          'label': label,
          'deliveryNotes': deliveryNotes,
          'lat': lat,
          'lng': lng,
        }),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = json.decode(response.body);
        final newAddress = Address.fromJson(data['data'] ?? data);

        _addresses.add(newAddress);
        notifyListeners();

        return newAddress;
      } else {
        throw Exception('Failed to create address');
      }
    } catch (err) {
      _error = err.toString();
      debugPrint('Create address error: $err');
      return null;
    }
  }

  /// Update existing address
  Future<bool> updateAddress({
    required String token,
    required String id,
    required String addressLine1,
    String? addressLine2,
    required String city,
    required String countryCode,
    required String label,
    String? deliveryNotes,
    required double lat,
    required double lng,
  }) async {
    try {
      final response = await http.put(
        Uri.parse(ApiConfig.updateAddress(id)),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode({
          'addressLine1': addressLine1,
          'addressLine2': addressLine2,
          'city': city,
          'countryCode': countryCode,
          'label': label,
          'deliveryNotes': deliveryNotes,
          'lat': lat,
          'lng': lng,
        }),
      );

      if (response.statusCode == 200) {
        // Refresh addresses
        await fetchAddresses(token);
        return true;
      } else {
        throw Exception('Failed to update address');
      }
    } catch (err) {
      _error = err.toString();
      debugPrint('Update address error: $err');
      return false;
    }
  }

  /// Delete address
  Future<bool> deleteAddress(String token, String id) async {
    try {
      final response = await http.delete(
        Uri.parse(ApiConfig.deleteAddress(id)),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        _addresses.removeWhere((addr) => addr.id == id);
        if (_selectedAddress?.id == id) {
          _selectedAddress = _addresses.isNotEmpty ? _addresses.first : null;
        }
        notifyListeners();
        return true;
      } else {
        throw Exception('Failed to delete address');
      }
    } catch (err) {
      _error = err.toString();
      debugPrint('Delete address error: $err');
      return false;
    }
  }

  /// Set as default address
  Future<bool> setAsDefault(String token, String id) async {
    try {
      final response = await http.patch(
        Uri.parse(ApiConfig.setDefaultAddress(id)),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        await fetchAddresses(token);
        return true;
      } else {
        throw Exception('Failed to set as default');
      }
    } catch (err) {
      _error = err.toString();
      debugPrint('Set default error: $err');
      return false;
    }
  }

  void setSelectedAddress(Address? address) {
    _selectedAddress = address;
    notifyListeners();
  }

  // Alias for setAsDefault
  Future<bool> setDefaultAddress(String token, String id) async {
    return await setAsDefault(token, id);
  }

  // Alias for createAddress
  Future<Address?> addAddress({
    required String token,
    required String addressLine1,
    String? addressLine2,
    required String city,
    required String countryCode,
    required String label,
    String? deliveryNotes,
    required double lat,
    required double lng,
  }) async {
    return await createAddress(
      token: token,
      addressLine1: addressLine1,
      addressLine2: addressLine2,
      city: city,
      countryCode: countryCode,
      label: label,
      deliveryNotes: deliveryNotes,
      lat: lat,
      lng: lng,
    );
  }

  // Get default address helper
  Address? get defaultAddress {
    if (_addresses.isEmpty) return null;
    
    try {
      return _addresses.firstWhere((addr) => addr.isDefault);
    } catch (e) {
      return _addresses.first;
    }
  }
}
