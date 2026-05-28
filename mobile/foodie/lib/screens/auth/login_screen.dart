import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/language_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  late TextEditingController _emailController;
  late TextEditingController _passwordController;
  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    _emailController = TextEditingController();
    _passwordController = TextEditingController();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  String? _getRedirectTo() {
    final args = ModalRoute.of(context)?.settings.arguments;
    if (args is Map) return args['redirectTo'] as String?;
    return null;
  }

  void _navigateAfterAuth() {
    final redirectTo = _getRedirectTo();
    if (redirectTo != null) {
      Navigator.of(context).pushReplacementNamed(redirectTo);
    } else {
      Navigator.of(context).pushReplacementNamed('/home');
    }
  }

  void _handleLogin() async {
    final authProvider = context.read<AuthProvider>();
    final success = await authProvider.login(
      email: _emailController.text.trim(),
      password: _passwordController.text,
    );

    if (success && mounted) {
      _navigateAfterAuth();
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(authProvider.error ?? 'Login failed')),
      );
    }
  }

  void _handleGoogleLogin() async {
    final authProvider = context.read<AuthProvider>();
    final success = await authProvider.loginWithGoogle();
    if (success && mounted) {
      _navigateAfterAuth();
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(authProvider.error ?? 'Google login failed')),
      );
    }
  }

  void _handleAppleLogin() async {
    final authProvider = context.read<AuthProvider>();
    final success = await authProvider.loginWithApple();
    if (success && mounted) {
      _navigateAfterAuth();
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(authProvider.error ?? 'Apple login failed')),
      );
    }
  }

  void _handleForgotPassword() {
    final languageProvider = context.read<LanguageProvider>();
    final isRTL = languageProvider.isArabic;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(isRTL ? 'إعادة تعيين كلمة المرور' : 'Reset Password'),
        content: Text(
          isRTL
              ? 'لإعادة تعيين كلمة المرور، تواصل معنا عبر البريد الإلكتروني:\nsupport@eltekkeya.com'
              : 'To reset your password, contact us at:\nsupport@eltekkeya.com',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(isRTL ? 'حسناً' : 'OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final languageProvider = context.watch<LanguageProvider>();
    final authProvider = context.watch<AuthProvider>();
    final isRTL = languageProvider.isArabic;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Back arrow pinned to top-leading — identical to Checkout / Settings / Cook Profile
            if (Navigator.canPop(context))
              Padding(
                padding: const EdgeInsets.only(top: 16, left: 24, right: 24),
                child: Align(
                  alignment: isRTL ? Alignment.centerRight : Alignment.centerLeft,
                  child: GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: const Icon(
                      Icons.arrow_back,
                      color: Color(0xFF40403F),
                      size: 24,
                    ),
                  ),
                ),
              ),
            Expanded(
              // LayoutBuilder supplies the exact available height so the Spacer
              // widgets can distribute free vertical space in a 1:2 ratio —
              // top free space : bottom free space = 1 : 2.
              // ConstrainedBox ensures the Column fills at least the available
              // height so Spacers have room to expand. When content exceeds the
              // available height (small screen / keyboard open)
              // SingleChildScrollView takes over and Spacers collapse to zero.
              child: LayoutBuilder(
                builder: (context, constraints) => SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(minHeight: constraints.maxHeight),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      mainAxisAlignment: MainAxisAlignment.start,
                      children: [
              // Top free space — fixed height mirrors the original 1:2 ratio intent.
              // Spacer cannot be used inside a Column that lives inside
              // SingleChildScrollView (unbounded main axis → Expanded assertion crash).
              const SizedBox(height: 32),
              Center(
                child: Image.asset(
                  'assets/icons/Logo.png',
                  width: MediaQuery.of(context).size.width * 0.264,
                ),
              ),
              const SizedBox(height: 14),
              Text(
                'ElTekkeya',
                textAlign: TextAlign.center,
                style: GoogleFonts.poppins(
                  fontSize: 32,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF434343),
                ),
              ),
              const SizedBox(height: 1),
              Text(
                isRTL
                    ? 'حكاية تُكشف مع كل وجبة'
                    : 'A story to reveal with every meal',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w400,
                  color: Color(0xFF9E9E9E),
                  fontFamily: 'Inter',
                  letterSpacing: 0.2,
                ),
              ),
              const SizedBox(height: 20),
              TextField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: InputDecoration(
                  hintText: isRTL ? 'البريد الإلكتروني أو رقم الهاتف' : 'Email or phone number',
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                ),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _passwordController,
                obscureText: _obscurePassword,
                decoration: InputDecoration(
                  hintText: isRTL ? 'كلمة المرور' : 'Password',
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscurePassword ? Icons.visibility_off : Icons.visibility,
                    ),
                    onPressed: () {
                      setState(() {
                        _obscurePassword = !_obscurePassword;
                      });
                    },
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Align(
                alignment: isRTL ? Alignment.centerLeft : Alignment.centerRight,
                child: TextButton(
                  onPressed: _handleForgotPassword,
                  child: Text(
                    isRTL ? 'هل نسيت كلمة المرور؟' : 'Forgot Password?',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF969494),
                      fontFamily: 'Inter',
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Container(
                height: 48,
                decoration: BoxDecoration(
                  border: Border.all(color: const Color(0xFFFF7A00), width: 1),
                  borderRadius: BorderRadius.circular(12),
                  color: const Color(0xFFFF7A00),
                ),
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: authProvider.isLoading ? null : _handleLogin,
                    borderRadius: BorderRadius.circular(12),
                    child: Center(
                      child: authProvider.isLoading
                          ? const SizedBox(
                              height: 18,
                              width: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : Text(
                              isRTL ? 'دخول' : 'Sign in',
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                                color: Colors.white,
                                fontFamily: 'Inter',
                              ),
                            ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 30),
              Row(
                children: [
                  const Expanded(child: Divider(color: Color(0xFFD9D9D9), height: 1)),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Text(
                      isRTL ? 'أو' : 'Or',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF747474),
                        fontFamily: 'Inter',
                      ),
                    ),
                  ),
                  const Expanded(child: Divider(color: Color(0xFFD9D9D9), height: 1)),
                ],
              ),
              const SizedBox(height: 30),
              // Google Sign-In button
              Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  color: Colors.white,
                ),
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: authProvider.isLoading ? null : _handleGoogleLogin,
                    borderRadius: BorderRadius.circular(12),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      child: Row(
                        children: [
                          const SizedBox(width: 16),
                          Image.asset(
                            'assets/icons/Google.png',
                            width: 24,
                            height: 24,
                          ),
                          const SizedBox(width: 12),
                          Text(
                            isRTL ? 'متابعة مع جوجل' : 'Continue with Google',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF747474),
                              fontFamily: 'Inter',
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              // Apple Sign-In button (iOS only — hidden until repeat-login testing passes)
              if (!kIsWeb && Platform.isIOS) ...[
                const SizedBox(height: 8),
                Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    color: Colors.black,
                  ),
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: authProvider.isLoading ? null : _handleAppleLogin,
                      borderRadius: BorderRadius.circular(12),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        child: Row(
                          children: [
                            const SizedBox(width: 16),
                            Image.asset(
                              'assets/icons/Apple.png',
                              width: 24,
                            ),
                            const SizedBox(width: 12),
                            Text(
                              isRTL ? 'متابعة مع Apple' : 'Continue with Apple',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: Colors.white,
                                fontFamily: 'Inter',
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 30),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    isRTL ? 'ليس لديك حساب؟ ' : "Don't have an account? ",
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF40403F),
                      fontFamily: 'Inter',
                    ),
                  ),
                  TextButton(
                    onPressed: () {
                      Navigator.of(context).pushNamed('/signup');
                    },
                    style: TextButton.styleFrom(
                      padding: EdgeInsets.zero,
                    ),
                    child: Text(
                      isRTL ? 'إنشاء حساب' : 'Sign up',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF969494),
                        decoration: TextDecoration.underline,
                        fontFamily: 'Inter',
                      ),
                    ),
                  ),
                ],
              ),
              // Bottom free space — twice the top (1:2 ratio, no Spacer).
              const SizedBox(height: 64),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
