import 'package:flutter/material.dart';
import '../theme/theme.dart';
import '../widgets/feedback_message.dart';
import '../widgets/animated_logo.dart';
import '../widgets/enhanced_input_field.dart';
import '../services/auth_service.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with TickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _authService = AuthService();
  
  String? _errorMessage;
  String? _successMessage;
  bool _isLoading = false;
  bool _obscurePassword = true;
  bool _rememberMe = false;
  
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    );
    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOut,
    ));
    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.3),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeOutCubic,
    ));
    _animationController.forward();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _animationController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    
    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _successMessage = null;
    });

    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      
      await authProvider.login(
        _emailController.text,
        _passwordController.text,
      );
      
      if (authProvider.isAuthenticated) {
        setState(() {
          _successMessage = 'Login successful! Welcome back.';
        });
        
        // Show success message
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.white),
                const SizedBox(width: EduLinkTheme.spacingS),
                const Expanded(
                  child: Text('Login successful! Welcome back.'),
                ),
              ],
            ),
            backgroundColor: EduLinkTheme.success,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(EduLinkTheme.radiusMedium),
            ),
            duration: const Duration(seconds: 3),
          ),
        );
        
        // Navigate to home after a delay
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted) {
            Navigator.pushReplacementNamed(context, '/home');
          }
        });
      } else {
        setState(() {
          _errorMessage = _getUserFriendlyErrorMessage(authProvider.errorMessage ?? 'Login failed. Please check your credentials.');
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = _getUserFriendlyErrorMessage(e.toString());
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  String _getUserFriendlyErrorMessage(String error) {
    if (error.toLowerCase().contains('invalid credentials')) {
      return 'Invalid email or password. Please check your details and try again.';
    } else if (error.toLowerCase().contains('email not verified')) {
      return 'Please verify your email address before logging in.';
    } else if (error.toLowerCase().contains('account not found')) {
      return 'No account found with this email. Please check your email or register.';
    } else if (error.toLowerCase().contains('network')) {
      return 'Connection error. Please check your internet connection and try again.';
    } else if (error.toLowerCase().contains('timeout')) {
      return 'Request timed out. Please try again.';
    } else if (error.toLowerCase().contains('server')) {
      return 'Server error. Please try again later.';
    } else {
      return 'An error occurred during login. Please try again.';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: EduLinkTheme.backgroundGradient,
        ),
        child: SafeArea(
          child: FadeTransition(
            opacity: _fadeAnimation,
            child: SlideTransition(
              position: _slideAnimation,
              child: Center(
                child: SingleChildScrollView(
                  child: Padding(
                    padding: const EdgeInsets.all(EduLinkTheme.spacingL),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Header
                          _buildHeader(),
                          SizedBox(height: EduLinkTheme.spacingXXL),

                          // Login Form Card
                          Container(
                            decoration: EduLinkTheme.cardDecoration,
                            child: Padding(
                              padding: const EdgeInsets.all(EduLinkTheme.spacingXL),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  // Success Message
                                  if (_successMessage != null) ...[
                                    SuccessMessage(
                                      message: _successMessage!,
                                      onDismiss: () => setState(() => _successMessage = null),
                                    ),
                                    SizedBox(height: EduLinkTheme.spacingL),
                                  ],

                                  // Error Message
                                  if (_errorMessage != null) ...[
                                    ErrorMessage(
                                      message: _errorMessage!,
                                      onDismiss: () => setState(() => _errorMessage = null),
                                    ),
                                    SizedBox(height: EduLinkTheme.spacingL),
                                  ],

                                  // Email Field
                                  EnhancedInputField(
                                    controller: _emailController,
                                    label: 'Email',
                                    hint: 'Enter your email address',
                                    prefixIcon: Icons.email_outlined,
                                    keyboardType: TextInputType.emailAddress,
                                    validator: (value) {
                                      if (value == null || value.isEmpty) {
                                        return 'Please enter your email address';
                                      }
                                      if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value)) {
                                        return 'Please enter a valid email address';
                                      }
                                      return null;
                                    },
                                  ),
                                  SizedBox(height: EduLinkTheme.spacingM),
                                  
                                  // Password Field
                                  EnhancedInputField(
                                    controller: _passwordController,
                                    label: 'Password',
                                    hint: 'Enter your password',
                                    prefixIcon: Icons.lock_outline,
                                    obscureText: _obscurePassword,
                                    suffixIcon: _obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                                    onSuffixPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                                    validator: (value) {
                                      if (value == null || value.isEmpty) {
                                        return 'Please enter your password';
                                      }
                                      return null;
                                    },
                                  ),
                                  SizedBox(height: EduLinkTheme.spacingM),
                                  
                                  // Remember Me & Forgot Password
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Row(
                                        children: [
                                          Checkbox(
                                            value: _rememberMe,
                                            onChanged: (value) => setState(() => _rememberMe = value ?? false),
                                            activeColor: EduLinkTheme.primary,
                                            checkColor: Colors.white,
                                          ),
                                          Text(
                                            'Remember me',
                                            style: EduLinkTheme.textTheme.bodyMedium?.copyWith(
                                              color: EduLinkTheme.onSurfaceVariant,
                                            ),
                                          ),
                                        ],
                                      ),
                                      TextButton(
                                        onPressed: () => Navigator.pushNamed(context, '/forgot-password'),
                                        style: EduLinkTheme.textButtonStyle,
                                        child: const Text('Forgot Password?'),
                                      ),
                                    ],
                                  ),
                                  SizedBox(height: EduLinkTheme.spacingL),

                                  // Login Button
                                  _buildLoginButton(),
                                  
                                  SizedBox(height: EduLinkTheme.spacingL),

                                  // Divider
                                  _buildDivider(),
                                  
                                  SizedBox(height: EduLinkTheme.spacingL),

                                  // Register Link
                                  _buildRegisterLink(),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      children: [
        // Animated Logo
        const AnimatedLogo(
          size: 120,
          title: 'Welcome Back',
          subtitle: 'Sign in to continue your learning journey',
        ),
      ],
    );
  }

  Widget _buildLoginButton() {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(EduLinkTheme.radiusMedium),
        boxShadow: EduLinkTheme.buttonShadow,
      ),
      child: ElevatedButton(
        onPressed: _isLoading ? null : _handleSubmit,
        style: EduLinkTheme.primaryButtonStyle.copyWith(
          backgroundColor: MaterialStateProperty.resolveWith((states) {
            if (states.contains(MaterialState.disabled)) {
              return EduLinkTheme.onSurfaceVariant;
            }
            return Colors.transparent;
          }),
        ),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(EduLinkTheme.radiusMedium),
            gradient: _isLoading ? null : EduLinkTheme.primaryGradient,
          ),
          child: _isLoading
              ? const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                )
              : const Text('Sign In'),
        ),
      ),
    );
  }

  Widget _buildDivider() {
    return Row(
      children: [
        Expanded(child: Divider(color: EduLinkTheme.outline)),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: EduLinkTheme.spacingM),
          child: Text(
            'or',
            style: EduLinkTheme.textTheme.bodyMedium?.copyWith(
              color: EduLinkTheme.onSurfaceVariant,
            ),
          ),
        ),
        Expanded(child: Divider(color: EduLinkTheme.outline)),
      ],
    );
  }

  Widget _buildRegisterLink() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          'Don\'t have an account? ',
          style: EduLinkTheme.textTheme.bodyMedium?.copyWith(
            color: EduLinkTheme.onSurfaceVariant,
          ),
        ),
        TextButton(
          onPressed: () => Navigator.pushNamed(context, '/register'),
          style: EduLinkTheme.textButtonStyle,
          child: const Text('Sign Up'),
        ),
      ],
    );
  }
} 