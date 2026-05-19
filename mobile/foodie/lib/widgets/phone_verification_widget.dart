import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart' as app_auth;
import '../providers/language_provider.dart';

/// Reusable phone verification widget.
///
/// Usage:
///   PhoneVerificationWidget(
///     onVerified: () { /* phone is now verified on backend */ },
///     onCancelled: () { /* user dismissed without verifying */ },
///     initialPhone: '+966...', // optional pre-fill
///   )
///
/// Flow: phone input → Firebase OTP SMS → 6-digit code → backend idToken check.
class PhoneVerificationWidget extends StatefulWidget {
  final VoidCallback onVerified;
  final VoidCallback? onCancelled;
  final String? initialPhone;
  final String? titleOverride;

  const PhoneVerificationWidget({
    Key? key,
    required this.onVerified,
    this.onCancelled,
    this.initialPhone,
    this.titleOverride,
  }) : super(key: key);

  @override
  State<PhoneVerificationWidget> createState() => _PhoneVerificationWidgetState();
}

class _PhoneVerificationWidgetState extends State<PhoneVerificationWidget> {
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();

  bool _codeSent = false;
  bool _loading = false;
  String? _error;
  String? _verificationId;
  int? _resendToken;

  @override
  void initState() {
    super.initState();
    if (widget.initialPhone != null) {
      _phoneController.text = widget.initialPhone!;
    }
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  void _setError(String? msg) => setState(() => _error = msg);
  void _setLoading(bool v) => setState(() => _loading = v);

  Future<void> _sendCode() async {
    final phone = _phoneController.text.trim();
    if (phone.isEmpty) {
      _setError('Please enter a phone number.');
      return;
    }
    // Basic E.164 check
    if (!RegExp(r'^\+\d{7,15}$').hasMatch(phone)) {
      _setError('Enter phone in international format: +966XXXXXXXXX');
      return;
    }

    _setError(null);
    _setLoading(true);

    await FirebaseAuth.instance.verifyPhoneNumber(
      phoneNumber: phone,
      forceResendingToken: _resendToken,
      verificationCompleted: (PhoneAuthCredential credential) async {
        // Android auto-retrieval path
        await _signInAndVerify(credential);
      },
      verificationFailed: (FirebaseAuthException e) {
        _setLoading(false);
        _setError(e.message ?? 'Verification failed. Check the phone number.');
      },
      codeSent: (String verificationId, int? resendToken) {
        _setLoading(false);
        setState(() {
          _verificationId = verificationId;
          _resendToken = resendToken;
          _codeSent = true;
        });
      },
      codeAutoRetrievalTimeout: (String verificationId) {
        _verificationId = verificationId;
      },
      timeout: const Duration(seconds: 60),
    );
  }

  Future<void> _submitCode() async {
    final code = _otpController.text.trim();
    if (code.length != 6) {
      _setError('Enter the 6-digit code.');
      return;
    }
    if (_verificationId == null) {
      _setError('Session expired. Please resend the code.');
      return;
    }

    _setError(null);
    _setLoading(true);

    final credential = PhoneAuthProvider.credential(
      verificationId: _verificationId!,
      smsCode: code,
    );
    await _signInAndVerify(credential);
  }

  Future<void> _signInAndVerify(PhoneAuthCredential credential) async {
    try {
      final fbResult = await FirebaseAuth.instance.signInWithCredential(credential);
      final idToken = await fbResult.user?.getIdToken();
      if (idToken == null) {
        _setLoading(false);
        _setError('Failed to get verification token.');
        return;
      }

      // Send token to our backend to persist phone + isPhoneVerified
      if (!mounted) return;
      final authProvider = context.read<app_auth.AuthProvider>();
      final success = await authProvider.verifyPhone(idToken);

      _setLoading(false);
      if (success) {
        widget.onVerified();
      } else {
        _setError(authProvider.error ?? 'Backend verification failed.');
      }
    } on FirebaseAuthException catch (e) {
      _setLoading(false);
      _setError(e.message ?? 'Invalid code. Please try again.');
    } catch (e) {
      _setLoading(false);
      _setError('Unexpected error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final isRTL = context.read<LanguageProvider>().isArabic;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFFE0CC), width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              const Icon(Icons.phone_android, color: Color(0xFFFF7A00)),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  widget.titleOverride ?? 'Verify your phone number',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF2C2C2C),
                  ),
                ),
              ),
              if (widget.onCancelled != null)
                IconButton(
                  icon: const Icon(Icons.close, size: 20),
                  onPressed: widget.onCancelled,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
            ],
          ),
          const SizedBox(height: 16),

          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(
                _error!,
                style: const TextStyle(color: Colors.red, fontSize: 13),
              ),
            ),

          if (!_codeSent) ...[
            TextFormField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[\d\+]'))],
              decoration: InputDecoration(
                hintText: isRTL ? 'رقم الهاتف' : 'Phone number',
                filled: true,
                fillColor: const Color(0xFFF9F9F9),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                prefixIcon: const Icon(Icons.phone),
              ),
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: _loading ? null : _sendCode,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFFF7A00),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _loading
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : Text(isRTL ? 'إرسال رمز التحقق' : 'Send verification code', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
            ),
          ] else ...[
            Text(
              'Enter the 6-digit code sent to ${_phoneController.text}',
              style: const TextStyle(fontSize: 13, color: Color(0xFF666666)),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _otpController,
              keyboardType: TextInputType.number,
              maxLength: 6,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: InputDecoration(
                labelText: 'Verification code',
                counterText: '',
                filled: true,
                fillColor: const Color(0xFFF9F9F9),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                prefixIcon: const Icon(Icons.lock_outline),
              ),
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: _loading ? null : _submitCode,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFFF7A00),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _loading
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Verify', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: _loading ? null : () => setState(() { _codeSent = false; _otpController.clear(); }),
              child: const Text('Change number / Resend', style: TextStyle(color: Color(0xFFFF7A00))),
            ),
          ],
        ],
      ),
    );
  }
}
