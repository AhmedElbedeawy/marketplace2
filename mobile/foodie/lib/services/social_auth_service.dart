/// Social Authentication Service
/// Handles Facebook and Google login integrations
/// Demo mode for testing without actual OAuth credentials

import 'package:flutter/material.dart';
import 'package:flutter_facebook_auth/flutter_facebook_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';

class SocialAuthService {
  // Demo mode flag
  static const bool demoMode = true;

  // Facebook Auth
  static final FacebookAuth _facebookAuth = FacebookAuth.instance;

  // Google Auth - with clientId parameter for web
  static final GoogleSignIn _googleSignIn = GoogleSignIn(
    clientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
    scopes: [
      'email',
      'https://www.googleapis.com/auth/contacts.readonly',
    ],
  );

  /// Login with Facebook
  /// Returns user data if successful, null if failed or cancelled
  static Future<SocialAuthUser?> loginWithFacebook() async {
    // Demo mode - return fake user
    if (demoMode) {
      await Future.delayed(const Duration(seconds: 1));
      return SocialAuthUser(
        id: 'facebook_demo_123',
        name: 'Demo User Facebook',
        email: 'demo.facebook@example.com',
        profileImageUrl: '',
        provider: 'facebook',
        accessToken: 'demo_facebook_token_12345',
      );
    }

    try {
      final result = await _facebookAuth.login();

      if (result.status == LoginStatus.success) {
        final accessToken = result.accessToken?.token ?? '';
        final userData = await _facebookAuth.getUserData();

        return SocialAuthUser(
          id: userData['id'] ?? '',
          name: userData['name'] ?? '',
          email: userData['email'] ?? '',
          profileImageUrl: userData['picture']?['data']?['url'] ?? '',
          provider: 'facebook',
          accessToken: accessToken,
        );
      }
      // User cancelled or login failed
      return null;
    } catch (e) {
      debugPrint('Facebook login error: $e');
      return null;
    }
  }

  /// Login with Google
  /// Returns user data if successful, null if failed or cancelled
  static Future<SocialAuthUser?> loginWithGoogle() async {
    // Demo mode - return fake user
    if (demoMode) {
      await Future.delayed(const Duration(seconds: 1));
      return SocialAuthUser(
        id: 'google_demo_123',
        name: 'Demo User Google',
        email: 'demo.google@example.com',
        profileImageUrl: '',
        provider: 'google',
        accessToken: 'demo_google_token_12345',
      );
    }

    try {
      final googleUser = await _googleSignIn.signIn();

      if (googleUser == null) {
        return null; // User cancelled
      }

      final googleAuth = await googleUser.authentication;

      return SocialAuthUser(
        id: googleUser.id,
        name: googleUser.displayName ?? '',
        email: googleUser.email,
        profileImageUrl: googleUser.photoUrl ?? '',
        provider: 'google',
        accessToken: googleAuth.accessToken ?? '',
      );
    } catch (e) {
      debugPrint('Google login error: $e');
      return null;
    }
  }

  /// Logout from Facebook
  static Future<void> logoutFacebook() async {
    await _facebookAuth.logOut();
  }

  /// Logout from Google
  static Future<void> logoutGoogle() async {
    await _googleSignIn.signOut();
  }

  /// Check if user is already signed in with Google
  static Future<GoogleSignInAccount?> getCurrentGoogleUser() async {
    return _googleSignIn.currentUser;
  }
}

/// Social Authentication User Model
class SocialAuthUser {
  final String id;
  final String name;
  final String email;
  final String profileImageUrl;
  final String provider; // 'facebook' or 'google'
  final String accessToken;

  SocialAuthUser({
    required this.id,
    required this.name,
    required this.email,
    required this.profileImageUrl,
    required this.provider,
    required this.accessToken,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'email': email,
    'profileImageUrl': profileImageUrl,
    'provider': provider,
    'accessToken': accessToken,
  };
}
