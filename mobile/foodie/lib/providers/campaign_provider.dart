import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';

class CampaignProvider with ChangeNotifier {
  List<dynamic> _campaigns = [];
  bool _isLoading = false;
  String? _error;

  List<dynamic> get campaigns => _campaigns;
  bool get isLoading => _isLoading;
  String? get error => _error;

  String get _baseUrl => ApiConfig.baseUrl;

  Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_token');
  }

  Future<void> fetchCampaigns() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final token = await _getToken();
      final response = await http.get(
        Uri.parse('$_baseUrl/public/campaigns'),
        headers: token != null ? {'Authorization': 'Bearer $token'} : {},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true) {
          _campaigns = (data['data'] as List)
              .where((c) => c['status'] == 'ACTIVE')
              .toList();
        }
      }
    } catch (e) {
      _error = e.toString();
      print('Campaign fetch error: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
