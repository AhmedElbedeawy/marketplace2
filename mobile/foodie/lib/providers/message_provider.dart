import 'package:flutter/material.dart';

class Message {
  final String id;
  final String sender;
  final String content;
  final DateTime timestamp;
  final bool isRead;

  Message({
    required this.id,
    required this.sender,
    required this.content,
    required this.timestamp,
    required this.isRead,
  });
}

class MessageProvider extends ChangeNotifier {
  final List<Message> _messages = [];
  bool _isLoading = false;
  String? _error;

  List<Message> get messages => _messages;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchMessages(String token) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // Mock implementation - replace with actual API call
      await Future.delayed(const Duration(seconds: 1));
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = 'Failed to fetch messages';
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> sendMessage({
    required String recipientId,
    required String content,
    required String token,
  }) async {
    try {
      // Mock implementation - replace with actual API call
      await Future.delayed(const Duration(seconds: 1));
      notifyListeners();
    } catch (e) {
      _error = 'Failed to send message';
      notifyListeners();
    }
  }
}
