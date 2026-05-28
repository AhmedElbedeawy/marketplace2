/// Social Authentication Service
/// Handles Google and Apple Sign-In integrations

import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';

class SocialAuthService {
  // Google Sign-In.
  // serverClientId is required on Android to exchange the auth code for a
  // server-verifiable token, but the google_sign_in_web plugin asserts that
  // serverClientId must be null on Flutter Web.  Use kIsWeb to conditionally
  // omit it so the static initialiser never crashes on Web.
  // On iOS the CLIENT_ID is read from GoogleService-Info.plist automatically.
  static final GoogleSignIn _googleSignIn = kIsWeb
      ? GoogleSignIn(scopes: ['email'])
      : GoogleSignIn(
          serverClientId:
              '967620840459-1e6v1jl8hm58sempdug4moqc0efpm988.apps.googleusercontent.com',
          scopes: ['email'],
        );

  /// Login with Google
  /// Returns user data if successful, null if failed or cancelled
  static Future<SocialAuthUser?> loginWithGoogle() async {
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

  /// Login with Apple (iOS only natively; skipped on Android/Web)
  /// Returns user data if successful, null if failed or cancelled
  static Future<SocialAuthUser?> loginWithApple() async {
    // Apple Sign-In is only available on iOS 13+ natively.
    // On Android/Web the sign_in_with_apple package can use a web-based flow,
    // but that requires a backend redirect service. We restrict to iOS for now.
    if (!kIsWeb && !Platform.isIOS) {
      debugPrint('Apple Sign-In is only supported on iOS in this version.');
      return null;
    }

    try {
      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
      );

      // Apple only provides name on the very first sign-in.
      // On subsequent logins givenName/familyName will be null.
      final givenName = credential.givenName ?? '';
      final familyName = credential.familyName ?? '';
      final fullName =
          ('$givenName $familyName').trim().isEmpty ? 'Apple User' : '$givenName $familyName'.trim();

      return SocialAuthUser(
        id: credential.userIdentifier ?? '',
        name: fullName,
        email: credential.email ?? '',
        profileImageUrl: '',
        provider: 'apple',
        accessToken: credential.identityToken ?? '',
      );
    } on SignInWithAppleAuthorizationException catch (e) {
      if (e.code == AuthorizationErrorCode.canceled) {
        debugPrint('Apple Sign-In cancelled by user.');
        return null;
      }
      debugPrint('Apple Sign-In error: ${e.message}');
      return null;
    } catch (e) {
      debugPrint('Apple Sign-In unexpected error: $e');
      return null;
    }
  }

  /// Logout from Google.
  /// Failures are silently swallowed — Google sign-out must never block the
  /// local auth-state clear that follows this call in AuthProvider.
  static Future<void> logoutGoogle() async {
    try {
      await _googleSignIn.signOut();
    } catch (e) {
      debugPrint('Google sign-out error (non-fatal): $e');
    }
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
  final String provider; // 'google' or 'apple'
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
