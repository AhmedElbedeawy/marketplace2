# OAuth Social Login Setup Guide

## 📋 OVERVIEW

This guide covers the complete setup for Google Sign-In and Facebook Login across all platforms (Android, iOS, Web).

**Current Status:** Code is fully implemented, OAuth credentials need to be configured.

---

## 🔵 PART 1: GOOGLE SIGN-IN SETUP

### Step 1: Create Google Cloud Project

1. Go to: https://console.cloud.google.com/
2. Click "Select a project" → "New Project"
3. Name: "ElTekkeya Foodie"
4. Click "Create"
5. Select the project when created

### Step 2: Enable Required APIs

1. Go to: https://console.cloud.google.com/apis/library
2. Search for and enable:
   - ✅ Google+ API
   - ✅ Google People API

### Step 3: Configure OAuth Consent Screen

1. Go to: https://console.cloud.google.com/apis/credentials/consent
2. Select **"External"** user type
3. Fill in:
   - **App name**: ElTekkeya Foodie
   - **User support email**: your-email@example.com
   - **Developer contact email**: your-email@example.com
   - **App logo**: (optional) Upload your logo
   - **App domain**: (optional for testing)
4. Click "Save and Continue"
5. **Scopes**: Click "Add or Remove Scopes" and add:
   - ✅ `email`
   - ✅ `profile`
   - ✅ `openid`
   - ✅ `https://www.googleapis.com/auth/contacts.readonly`
6. Click "Update" → "Save and Continue"
7. **Test users**: Add your test email addresses
8. Click "Save and Continue" → "Back to Dashboard"

### Step 4: Create OAuth Client IDs

#### A. For Web (Flutter Web Preview)

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
3. Application type: **Web application**
4. Name: `Foodie Web`
5. **Authorized JavaScript origins**:
   ```
   http://localhost:51348
   http://localhost:8080
   http://localhost:3000
   ```
   Add your production domain later (e.g., `https://foodie.eltekkeya.com`)
6. **Authorized redirect URIs**: Leave empty for now
7. Click **"Create"**
8. **SAVE THE CLIENT ID** (looks like: `123456789-abc123def456.apps.googleusercontent.com`)

#### B. For Android

1. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
2. Application type: **Android**
3. Name: `Foodie Android`
4. **Package name**: `com.example.foodie`
5. **Get SHA-1 fingerprint**:
   ```bash
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```
6. Copy the SHA-1 certificate fingerprint (looks like: `AA:BB:CC:DD:EE:FF:11:22:33:...`)
7. Paste it in the SHA-1 field
8. Click **"Create"**
9. **SAVE THE CLIENT ID**

#### C. For iOS

1. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
2. Application type: **iOS**
3. Name: `Foodie iOS`
4. **Bundle ID**: `com.example.foodie`
5. Click **"Create"**
6. **SAVE THE CLIENT ID**

### Step 5: Update Code with Google Client IDs

#### File 1: `mobile/foodie/lib/services/social_auth_service.dart` (Line 19)

```dart
static final GoogleSignIn _googleSignIn = GoogleSignIn(
  clientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com', // ← REPLACE THIS
  scopes: [
    'email',
    'https://www.googleapis.com/auth/contacts.readonly',
  ],
);
```

**Replace with**: Your **Web** client ID from Step 4A

#### File 2: `mobile/foodie/web/index.html` (Line 22)

```html
<meta name="google-signin-client_id" content="YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com">
```

**Replace with**: Your **Web** client ID from Step 4A

---

## 🔵 PART 2: FACEBOOK LOGIN SETUP

### Step 1: Create Facebook App

1. Go to: https://developers.facebook.com/
2. Click **"My Apps"** → **"Create App"**
3. Select use case: **"Other"** → **"Next"**
4. App type: **"Consumer"** → **"Next"**
5. Fill in:
   - **App name**: ElTekkeya Foodie
   - **App contact email**: your-email@example.com
6. Click **"Create App"**
7. Complete security check

### Step 2: Add Facebook Login Product

1. In your app dashboard, click **"+ Add Product"**
2. Find **"Facebook Login"** → Click **"Set Up"**
3. Select platform when prompted (we'll configure all three below)

### Step 3: Configure Facebook Login for Web

1. Go to: Facebook Login → **Settings**
2. **Valid OAuth Redirect URIs**:
   ```
   http://localhost:51348
   http://localhost:8080
   http://localhost:3000
   ```
   Add your production domain later
3. **Client OAuth Login**: ✅ Enabled
4. **Embedded Browser OAuth Login**: ✅ Enabled
5. **Web OAuth Login**: ✅ Enabled
6. Click **"Save Changes"**

### Step 4: Configure Facebook Login for Android

1. Go to: Facebook Login → **Settings** → **Android**
2. Add your Android package:
   - **Google Play Package Name**: `com.example.foodie`
   - **Class Name**: `com.example.foodie.MainActivity`
3. **Get Key Hashes**:
   ```bash
   # Debug key hash
   keytool -exportcert -alias androiddebugkey -keystore ~/.android/debug.keystore | openssl sha1 -binary | openssl base64
   
   # Output will look like: abc123def456==
   ```
4. Add the **Key Hash** to Facebook
5. **Single Sign On**: ✅ Enabled (optional)
6. Click **"Save Changes"**

### Step 5: Configure Facebook Login for iOS

1. Go to: Facebook Login → **Settings** → **iOS**
2. **Bundle ID**: `com.example.foodie`
3. **iPhone Store ID**: (leave empty for now)
4. **iPad Store ID**: (leave empty for now)
5. Click **"Save Changes"**

### Step 6: Get Facebook App ID and Client Token

1. Go to: **Settings** → **Basic**
2. **Copy the App ID** (looks like: `123456789012345`)
3. Go to: **Settings** → **Advanced**
4. Scroll to **Security** section
5. **Copy the Client Token** (looks like: `abc123def456ghi789`)

### Step 7: Update Code with Facebook Credentials

#### File 3: `mobile/foodie/android/app/src/main/res/values/strings.xml` (Lines 4-6)

```xml
<string name="facebook_app_id">YOUR_FACEBOOK_APP_ID</string>
<string name="facebook_client_token">YOUR_FACEBOOK_CLIENT_TOKEN</string>
```

**Replace with**: 
- `facebook_app_id`: Your App ID from Step 6
- `facebook_client_token`: Your Client Token from Step 6

#### File 4: `mobile/foodie/ios/Runner/Info.plist` (Lines 26, 29, 30)

```xml
<string>fbYOUR_FACEBOOK_APP_ID</string>
...
<key>FacebookAppID</key>
<string>YOUR_FACEBOOK_APP_ID</string>
```

**Replace with**: Your App ID from Step 6 (prefix with `fb` for URL scheme)

---

## 📱 PART 3: PLATFORM-SPECIFIC REQUIREMENTS

### Android Requirements

✅ **Already configured in code:**
- AndroidManifest.xml has Facebook meta-data tags
- strings.xml created with placeholders
- Package name: `com.example.foodie`

**What you need:**
1. SHA-1 fingerprint (from debug keystore)
2. Add to Google Cloud Console (Android OAuth client)
3. Add to Facebook Developers (Android Key Hash)

### iOS Requirements

✅ **Already configured in code:**
- Info.plist has Facebook configuration entries
- URL schemes for Facebook callback
- LSApplicationQueriesSchemes for Facebook app detection

**What you need:**
1. Bundle ID: `com.example.foodie` (already set)
2. Add to Google Cloud Console (iOS OAuth client)
3. Add to Facebook Developers (iOS Bundle ID)

### Web Requirements

✅ **Already configured in code:**
- web/index.html has Google Sign-In meta tag
- Flutter web bootstrap configured

**What you need:**
1. Add localhost origins to Google Cloud Console
2. Add localhost redirect URIs to Facebook Login settings

---

## 🧪 PART 4: TESTING CONFIGURATION

### Minimal Setup for Testing

You can test with **minimal configuration** using only **Web platform**:

#### Option A: Test on Flutter Web (Easiest)

**Required:**
1. ✅ Google Web Client ID only
2. ✅ Facebook App ID only

**Steps:**
1. Complete Step 4A (Google Web Client ID)
2. Complete Step 3 (Facebook Web OAuth Redirect URIs)
3. Update `social_auth_service.dart` line 19 with Google Web Client ID
4. Update `web/index.html` line 22 with Google Web Client ID
5. Run Flutter web:
   ```bash
   cd mobile/foodie
   flutter run -d chrome
   ```

**Test Flow:**
- Click "Continue with Google" → Google popup appears
- Sign in with test user
- Should redirect to `/home`
- Check backend logs: User created or logged in

#### Option B: Test on Android Emulator

**Required:**
1. ✅ Google Android Client ID + SHA-1
2. ✅ Facebook App ID + Key Hash

**Steps:**
1. Get SHA-1 fingerprint (see Android section above)
2. Get Facebook Key Hash (see Facebook Android section above)
3. Complete all Android configurations
4. Update `strings.xml` with Facebook credentials
5. Run on emulator:
   ```bash
   flutter run -d <emulator_id>
   ```

---

## 🔍 PART 5: VERIFICATION CHECKLIST

### After Configuration, Verify:

#### Google Sign-In
- [ ] Google Cloud Project created
- [ ] OAuth Consent Screen configured
- [ ] Test users added
- [ ] Web Client ID created → Added to code
- [ ] Android Client ID created (if testing Android)
- [ ] iOS Client ID created (if testing iOS)
- [ ] SHA-1 fingerprint added (Android only)

#### Facebook Login
- [ ] Facebook App created
- [ ] Facebook Login product added
- [ ] Web OAuth Redirect URIs added
- [ ] Android package + Key Hash added (if testing Android)
- [ ] iOS Bundle ID added (if testing iOS)
- [ ] App ID added to code
- [ ] Client Token added to code (Android only)

#### Backend
- [ ] Backend server running
- [ ] `/auth/social-login` endpoint accessible
- [ ] MongoDB connected
- [ ] JWT secret configured in `.env`

---

## 📝 PART 6: QUICK REFERENCE - FILES TO UPDATE

| File | Line(s) | What to Update | Where to Get Value |
|------|---------|----------------|-------------------|
| `lib/services/social_auth_service.dart` | 19 | Google Client ID | Google Cloud Console → Credentials |
| `web/index.html` | 22 | Google Client ID | Google Cloud Console → Credentials (Web) |
| `android/app/src/main/res/values/strings.xml` | 4 | Facebook App ID | Facebook Developers → Settings → Basic |
| `android/app/src/main/res/values/strings.xml` | 6 | Facebook Client Token | Facebook Developers → Settings → Advanced |
| `ios/Runner/Info.plist` | 26, 29 | Facebook App ID | Facebook Developers → Settings → Basic |

---

## 🚀 PART 7: TESTING STEPS

### Test Google Sign-In

1. **Start backend server:**
   ```bash
   cd server
   npm start
   ```

2. **Run Flutter web:**
   ```bash
   cd mobile/foodie
   flutter run -d chrome
   ```

3. **On login screen:**
   - Click "Continue with Google"
   - Google popup should appear
   - Select account or sign in
   - Should redirect to home screen

4. **Verify in backend logs:**
   - Check for POST `/auth/social-login` request
   - Verify user created in MongoDB
   - Verify JWT token returned

### Test Facebook Login

1. Same as above, but click "Continue with Facebook"
2. Facebook login dialog should appear
3. Sign in with Facebook account
4. Should redirect to home screen

---

## ⚠️ TROUBLESHOOTING

### Google Sign-In Issues

**Error: "Development console is not configured"**
- Solution: Complete OAuth Consent Screen setup
- Add test users

**Error: "Invalid client ID"**
- Solution: Check Client ID in `social_auth_service.dart`
- Ensure it ends with `.apps.googleusercontent.com`

**Error: "SHA-1 mismatch" (Android)**
- Solution: Regenerate SHA-1 fingerprint
- Update in Google Cloud Console

### Facebook Login Issues

**Error: "App not setup"**
- Solution: Go to Facebook App → App Review → Make app public
- Or add test users in Roles → Test Users

**Error: "Invalid redirect URI"**
- Solution: Add your localhost URL to Facebook Login → Settings
- Format: `http://localhost:51348`

**Error: "Key hash doesn't match" (Android)**
- Solution: Regenerate key hash
- Ensure using debug keystore for development

---

## 📚 RESOURCES

- Google Cloud Console: https://console.cloud.google.com/
- Google OAuth Documentation: https://developers.google.com/identity/sign-in/web
- Facebook Developers: https://developers.facebook.com/
- Facebook Login Documentation: https://developers.facebook.com/docs/facebook-login/
- flutter_facebook_auth: https://pub.dev/packages/flutter_facebook_auth
- google_sign_in: https://pub.dev/packages/google_sign_in

---

## ✅ CURRENT STATUS

- ✅ Mobile app code fully implemented
- ✅ Backend `/auth/social-login` endpoint ready
- ✅ OAuth flow connected to backend
- ✅ Demo mode disabled
- ⏳ **Waiting for: OAuth credentials configuration**

**Next Action:** Follow this guide to obtain and configure OAuth credentials.
