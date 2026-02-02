import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/address.dart';
import 'auth_provider.dart';

class AddressProvider with ChangeNotifier {
  final AuthProvider authProvider;
  List<Address> _addresses = [];
  bool _isLoading = false;
  String? _error;

  AddressProvider(this.authProvider);

  List<Address> get addresses => _addresses;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Address? get defaultAddress {
    try {
      return _addresses.firstWhere((addr) => addr.isDefault);
    } catch (_) {
      return _addresses.isNotEmpty ? _addresses.first : null;
    }
  }

  Future<void> fetchAddresses() async {
    if (authProvider.token == null) return;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/addresses'),
        headers: {
          'Authorization': 'Bearer ${authProvider.token}',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success']) {
          final List<dynamic> addressData = data['data'];
          _addresses = addressData.map((json) => Address.fromJson(json)).toList();
        }
      } else {
        _error = 'Failed to load addresses';
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> addAddress(Address address) async {
    if (authProvider.token == null) return false;

    _isLoading = true;
    notifyListeners();

    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/addresses'),
        headers: {
          'Authorization': 'Bearer ${authProvider.token}',
          'Content-Type': 'application/json',
        },
        body: json.encode(address.toJson()),
      );

      if (response.statusCode == 201) {
        await fetchAddresses();
        return true;
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return false;
  }

  Future<bool> updateAddress(String id, Address address) async {
    if (authProvider.token == null) return false;

    _isLoading = true;
    notifyListeners();

    try {
      final response = await http.put(
        Uri.parse('${ApiConfig.baseUrl}/addresses/$id'),
        headers: {
          'Authorization': 'Bearer ${authProvider.token}',
          'Content-Type': 'application/json',
        },
        body: json.encode(address.toJson()),
      );

      if (response.statusCode == 200) {
        await fetchAddresses();
        return true;
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return false;
  }

  Future<bool> deleteAddress(String id) async {
    if (authProvider.token == null) return false;

    _isLoading = true;
    notifyListeners();

    try {
      final response = await http.delete(
        Uri.parse('${ApiConfig.baseUrl}/addresses/$id'),
        headers: {
          'Authorization': 'Bearer ${authProvider.token}',
        },
      );

      if (response.statusCode == 200) {
        await fetchAddresses();
        return true;
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return false;
  }

  Future<bool> setDefaultAddress(String id) async {
    if (authProvider.token == null) return false;

    _isLoading = true;
    notifyListeners();

    try {
      final response = await http.patch(
        Uri.parse('${ApiConfig.baseUrl}/addresses/$id/default'),
        headers: {
          'Authorization': 'Bearer ${authProvider.token}',
        },
      );

      if (response.statusCode == 200) {
        await fetchAddresses();
        return true;
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return false;
  }
}
