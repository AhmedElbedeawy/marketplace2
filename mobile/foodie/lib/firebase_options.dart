// firebase_options.dart
// Hand-authored from native config files (GoogleService-Info.plist,
// google-services.json) and the registered web Firebase app.
// Do NOT run flutterfire configure — it would overwrite this file and
// may change package version constraints.

import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not configured for this platform.',
        );
    }
  }

  /// Web app registered in Firebase Console → Project settings → Your apps
  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyBWv-wNGNhe_6WIS0sF6oxqvT-OBuYJTKk',
    appId: '1:967620840459:web:f3bae3ef46704646808b0e',
    messagingSenderId: '967620840459',
    projectId: 'eltekkeya',
    authDomain: 'eltekkeya.firebaseapp.com',
    storageBucket: 'eltekkeya.firebasestorage.app',
  );

  /// iOS — values from ios/Runner/GoogleService-Info.plist
  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyAtMTVwK1Ft-raKdRKFqdNpAJL-ATp5a40',
    appId: '1:967620840459:ios:62d166363981c0b4808b0e',
    messagingSenderId: '967620840459',
    projectId: 'eltekkeya',
    storageBucket: 'eltekkeya.firebasestorage.app',
    iosBundleId: 'com.eltekkeya.app',
  );

  /// Android — values from android/app/google-services.json
  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyAsNDiZtR9tzSd_W0F_bIX1YreHqD8VjGI',
    appId: '1:967620840459:android:51026bf1c50a3424808b0e',
    messagingSenderId: '967620840459',
    projectId: 'eltekkeya',
    storageBucket: 'eltekkeya.firebasestorage.app',
  );
}
