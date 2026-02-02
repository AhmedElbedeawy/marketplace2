/// Authentication validators for email and phone number formats

class AuthValidators {
  /// Validates if the input is a valid email format
  /// Accepts standard email formats: user@domain.com
  static bool isValidEmail(String input) {
    final emailRegex = RegExp(
      r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
    );
    return emailRegex.hasMatch(input.trim());
  }

  /// Validates if the input is a valid phone number format
  /// Supports:
  /// - International format: +1234567890 or +1-234-567-8900
  /// - Local format: 1234567890 or 123-456-7890
  /// - At least 7 digits for local, 10+ for international
  static bool isValidPhoneNumber(String input) {
    // Remove common formatting characters
    final cleanedPhone = input.replaceAll(RegExp(r'[\s\-\(\)\+]'), '');
    
    // Must contain only digits
    if (!RegExp(r'^\d+$').hasMatch(cleanedPhone)) {
      return false;
    }
    
    // International format: +country_code followed by digits (10+ digits total)
    if (input.startsWith('+')) {
      return cleanedPhone.length >= 10;
    }
    
    // Local format: 7-15 digits
    return cleanedPhone.length >= 7 && cleanedPhone.length <= 15;
  }

  /// Validates if input is either a valid email or valid phone number
  static bool isValidEmailOrPhone(String input) {
    if (input.isEmpty) return false;
    return isValidEmail(input) || isValidPhoneNumber(input);
  }

  /// Determines whether the input is email or phone number
  /// Returns 'email', 'phone', or 'invalid'
  static String identifyCredentialType(String input) {
    if (isValidEmail(input)) {
      return 'email';
    } else if (isValidPhoneNumber(input)) {
      return 'phone';
    }
    return 'invalid';
  }

  /// Sanitizes phone number for API submission
  /// Removes formatting characters but preserves + for international format
  static String sanitizePhoneNumber(String phone) {
    return phone.replaceAll(RegExp(r'[\s\-\(\)]'), '');
  }

  /// Sanitizes email for API submission (trim whitespace)
  static String sanitizeEmail(String email) {
    return email.trim().toLowerCase();
  }
}
