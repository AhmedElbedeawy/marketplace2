class Message {
  final String id;
  final String senderId;
  final String senderName;
  final String recipientId;
  final String recipientName;
  final String content;
  final DateTime timestamp;
  final bool isRead;

  Message({
    required this.id,
    required this.senderId,
    required this.senderName,
    required this.recipientId,
    required this.recipientName,
    required this.content,
    required this.timestamp,
    this.isRead = false,
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: json['_id'] ?? json['id'] ?? '',
      senderId: json['sender']?['_id'] ?? json['senderId'] ?? json['sender'] ?? '',
      senderName: json['sender']?['name'] ?? json['senderName'] ?? 'Unknown',
      recipientId: json['recipient']?['_id'] ?? json['recipientId'] ?? json['recipient'] ?? '',
      recipientName: json['recipient']?['name'] ?? json['recipientName'] ?? 'Unknown',
      content: json['content'] ?? json['message'] ?? json['body'] ?? '',
      timestamp: json['timestamp'] != null
          ? DateTime.parse(json['timestamp'])
          : json['createdAt'] != null
              ? DateTime.parse(json['createdAt'])
              : DateTime.now(),
      isRead: json['isRead'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'senderId': senderId,
      'senderName': senderName,
      'recipientId': recipientId,
      'recipientName': recipientName,
      'content': content,
      'timestamp': timestamp.toIso8601String(),
      'isRead': isRead,
    };
  }
}
