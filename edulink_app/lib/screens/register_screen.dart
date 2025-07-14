import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:convert';
import '../theme/theme.dart';
import '../widgets/institution_autocomplete.dart';
import '../widgets/feedback_message.dart';
import '../widgets/animated_logo.dart';
import '../widgets/enhanced_input_field.dart';
import '../models/kuccps_institution.dart';
import '../services/auth_service.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> with TickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _idController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _institutionController = TextEditingController();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _registrationNumberController = TextEditingController();
  final _academicYearController = TextEditingController();
  final _courseCodeController = TextEditingController();
  final _authService = AuthService();
  
  List<KuccpsInstitution> institutions = [];
  List<KuccpsInstitution> filteredInstitutions = [];
  KuccpsInstitution? selectedInstitution;
  String? _errorMessage;
  String? _successMessage;
  bool _isLoading = false;
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _showEmailVerification = false;
  
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _loadInstitutions();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 800),
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
    _phoneController.dispose();
    _idController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _institutionController.dispose();
    _firstNameController.dispose();
    _lastNameController.dispose();
    _registrationNumberController.dispose();
    _academicYearController.dispose();
    _courseCodeController.dispose();
    _animationController.dispose();
    super.dispose();
  }

  Future<void> _loadInstitutions() async {
    try {
      final String jsonString = await rootBundle.loadString('assets/kuccps_institutions.json');
      final Map<String, dynamic> jsonData = json.decode(jsonString);
      final List<dynamic> institutionsList = jsonData['institutions'];
      
      setState(() {
        institutions = institutionsList
            .map((json) => KuccpsInstitution.fromJson(json))
            .toList();
        filteredInstitutions = institutions;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Error loading institutions: $e';
      });
    }
  }

  void _handleInstitutionSelected(KuccpsInstitution? institution) {
    setState(() {
      selectedInstitution = institution;
      if (institution != null) {
        _institutionController.text = institution.name;
      } else {
        _institutionController.clear();
      }
    });
  }

  String? _validateInstitution(String? value) {
    if (value == null || value.isEmpty) {
      return 'Please select an institution';
    }
    if (selectedInstitution == null) {
      return 'Please select a valid institution from the list';
    }
    return null;
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
      
      // Compose registration data
      final registrationData = {
        'email': _emailController.text,
        'password': _passwordController.text,
        'first_name': _firstNameController.text,
        'last_name': _lastNameController.text,
        'phone_number': _phoneController.text,
        'national_id': _idController.text,
        'registration_number': _registrationNumberController.text,
        'academic_year': int.tryParse(_academicYearController.text) ?? 1,
        'institution_name': selectedInstitution?.name ?? _institutionController.text,
        'course_code': _courseCodeController.text.isNotEmpty ? _courseCodeController.text : null,
      };
      
      await authProvider.registerStudent(registrationData);
      
      if (authProvider.isAuthenticated) {
        setState(() {
          _successMessage = 'Registration successful! Please check your email to verify your account.';
          _showEmailVerification = true;
        });
        
        // Show success message
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.white),
                const SizedBox(width: EduLinkTheme.spacingS),
                const Expanded(
                  child: Text('Registration successful! Check your email for verification.'),
                ),
              ],
            ),
            backgroundColor: EduLinkTheme.success,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(EduLinkTheme.radiusMedium),
            ),
            duration: const Duration(seconds: 5),
          ),
        );
        
        // Navigate to home after a delay
        Future.delayed(const Duration(seconds: 3), () {
          if (mounted) {
            Navigator.pushReplacementNamed(context, '/home');
          }
        });
      } else {
        setState(() {
          _errorMessage = _getUserFriendlyErrorMessage(authProvider.errorMessage ?? 'Registration failed. Please check your details.');
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
    if (error.toLowerCase().contains('email already exists')) {
      return 'An account with this email already exists. Please try logging in instead.';
    } else if (error.toLowerCase().contains('phone number')) {
      return 'This phone number is already registered. Please use a different number.';
    } else if (error.toLowerCase().contains('national id')) {
      return 'This national ID is already registered. Please check your details.';
    } else if (error.toLowerCase().contains('registration number')) {
      return 'This registration number is already registered. Please check your details.';
    } else if (error.toLowerCase().contains('network')) {
      return 'Connection error. Please check your internet connection and try again.';
    } else if (error.toLowerCase().contains('timeout')) {
      return 'Request timed out. Please try again.';
    } else if (error.toLowerCase().contains('server')) {
      return 'Server error. Please try again later.';
    } else {
      return 'An error occurred during registration. Please check your details and try again.';
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

                          // Registration Form Card
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

                                  // Personal Information Section
                                  _buildSectionHeader('Personal Information'),
                                  SizedBox(height: EduLinkTheme.spacingM),
                                  
                                  Row(
                                    children: [
                                      Expanded(child: _buildFirstNameField()),
                                      SizedBox(width: EduLinkTheme.spacingM),
                                      Expanded(child: _buildLastNameField()),
                                    ],
                                  ),
                                  SizedBox(height: EduLinkTheme.spacingM),
                                  
                                  _buildEmailField(),
                                  SizedBox(height: EduLinkTheme.spacingM),
                                  
                                  _buildPhoneField(),
                                  SizedBox(height: EduLinkTheme.spacingM),
                                  
                                  _buildNationalIdField(),
                                  SizedBox(height: EduLinkTheme.spacingL),

                                  // Academic Information Section
                                  _buildSectionHeader('Academic Information'),
                                  SizedBox(height: EduLinkTheme.spacingM),
                                  
                                  _buildInstitutionField(),
                                  SizedBox(height: EduLinkTheme.spacingM),
                                  
                                  Row(
                                    children: [
                                      Expanded(child: _buildRegistrationNumberField()),
                                      SizedBox(width: EduLinkTheme.spacingM),
                                      Expanded(child: _buildAcademicYearField()),
                                    ],
                                  ),
                                  SizedBox(height: EduLinkTheme.spacingM),
                                  
                                  _buildCourseCodeField(),
                                  SizedBox(height: EduLinkTheme.spacingL),

                                  // Security Section
                                  _buildSectionHeader('Security'),
                                  SizedBox(height: EduLinkTheme.spacingM),
                                  
                                  _buildPasswordField(),
                                  SizedBox(height: EduLinkTheme.spacingM),
                                  
                                  _buildConfirmPasswordField(),
                                  SizedBox(height: EduLinkTheme.spacingL),

                                  // Register Button
                                  _buildRegisterButton(),
                                  
                                  SizedBox(height: EduLinkTheme.spacingL),

                                  // Divider
                                  _buildDivider(),
                                  
                                  SizedBox(height: EduLinkTheme.spacingL),

                                  // Login Link
                                  _buildLoginLink(),
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
          title: 'Join EduLink',
          subtitle: 'Create your account and start your learning journey',
        ),
      ],
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: EduLinkTheme.textTheme.titleLarge?.copyWith(
        color: EduLinkTheme.primary,
        fontWeight: FontWeight.w600,
      ),
    );
  }

    Widget _buildFirstNameField() {
    return EnhancedInputField(
      controller: _firstNameController,
      label: 'First Name',
      hint: 'Enter your first name',
      prefixIcon: Icons.person_outline,
      validator: (value) {
        if (value == null || value.isEmpty) {
          return 'Please enter your first name';
        }
        return null;
      },
    );
  }

    Widget _buildLastNameField() {
    return EnhancedInputField(
      controller: _lastNameController,
      label: 'Last Name',
      hint: 'Enter your last name',
      prefixIcon: Icons.person_outline,
      validator: (value) {
        if (value == null || value.isEmpty) {
          return 'Please enter your last name';
        }
        return null;
      },
    );
  }

    Widget _buildEmailField() {
    return EnhancedInputField(
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
    );
  }

  Widget _buildPhoneField() {
    return TextFormField(
      controller: _phoneController,
      keyboardType: TextInputType.phone,
      decoration: EduLinkTheme.inputDecoration.copyWith(
        hintText: 'Enter your phone number',
        prefixIcon: const Icon(Icons.phone_outlined, color: EduLinkTheme.onSurfaceVariant),
        labelText: 'Phone Number',
      ),
      validator: (value) {
        if (value == null || value.isEmpty) {
          return 'Please enter your phone number';
        }
        if (value.length < 10) {
          return 'Please enter a valid phone number';
        }
        return null;
      },
    );
  }

  Widget _buildNationalIdField() {
    return TextFormField(
      controller: _idController,
      decoration: EduLinkTheme.inputDecoration.copyWith(
        hintText: 'Enter your national ID',
        prefixIcon: const Icon(Icons.badge_outlined, color: EduLinkTheme.onSurfaceVariant),
        labelText: 'National ID',
      ),
      validator: (value) {
        if (value == null || value.isEmpty) {
          return 'Please enter your national ID';
        }
        return null;
      },
    );
  }

  Widget _buildInstitutionField() {
    return InstitutionAutocomplete(
      controller: _institutionController,
      institutions: filteredInstitutions,
      onInstitutionSelected: _handleInstitutionSelected,
      validator: _validateInstitution,
    );
  }

  Widget _buildRegistrationNumberField() {
    return TextFormField(
      controller: _registrationNumberController,
      decoration: EduLinkTheme.inputDecoration.copyWith(
        hintText: 'Registration Number',
        prefixIcon: const Icon(Icons.numbers_outlined, color: EduLinkTheme.onSurfaceVariant),
        labelText: 'Registration Number',
      ),
      validator: (value) {
        if (value == null || value.isEmpty) {
          return 'Please enter your registration number';
        }
        return null;
      },
    );
  }

  Widget _buildAcademicYearField() {
    return TextFormField(
      controller: _academicYearController,
      keyboardType: TextInputType.number,
      decoration: EduLinkTheme.inputDecoration.copyWith(
        hintText: 'Year of Study',
        prefixIcon: const Icon(Icons.school_outlined, color: EduLinkTheme.onSurfaceVariant),
        labelText: 'Year of Study',
      ),
      validator: (value) {
        if (value == null || value.isEmpty) {
          return 'Please enter your year of study';
        }
        final year = int.tryParse(value);
        if (year == null || year < 1 || year > 6) {
          return 'Please enter a valid year (1-6)';
        }
        return null;
      },
    );
  }

  Widget _buildCourseCodeField() {
    return TextFormField(
      controller: _courseCodeController,
      decoration: EduLinkTheme.inputDecoration.copyWith(
        hintText: 'Course Code (Optional)',
        prefixIcon: const Icon(Icons.book_outlined, color: EduLinkTheme.onSurfaceVariant),
        labelText: 'Course Code',
      ),
    );
  }

    Widget _buildPasswordField() {
    return EnhancedInputField(
      controller: _passwordController,
      label: 'Password',
      hint: 'Create a strong password',
      prefixIcon: Icons.lock_outline,
      obscureText: _obscurePassword,
      suffixIcon: _obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
      onSuffixPressed: () => setState(() => _obscurePassword = !_obscurePassword),
      validator: (value) {
        if (value == null || value.isEmpty) {
          return 'Please enter a password';
        }
        if (value.length < 8) {
          return 'Password must be at least 8 characters';
        }
        return null;
      },
    );
  }

    Widget _buildConfirmPasswordField() {
    return EnhancedInputField(
      controller: _confirmPasswordController,
      label: 'Confirm Password',
      hint: 'Confirm your password',
      prefixIcon: Icons.lock_outline,
      obscureText: _obscureConfirmPassword,
      suffixIcon: _obscureConfirmPassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
      onSuffixPressed: () => setState(() => _obscureConfirmPassword = !_obscureConfirmPassword),
      validator: (value) {
        if (value == null || value.isEmpty) {
          return 'Please confirm your password';
        }
        if (value != _passwordController.text) {
          return 'Passwords do not match';
        }
        return null;
      },
    );
  }

      Widget _buildRegisterButton() {
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
              : const Text('Create Account'),
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

  Widget _buildLoginLink() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          'Already have an account? ',
          style: EduLinkTheme.textTheme.bodyMedium?.copyWith(
            color: EduLinkTheme.onSurfaceVariant,
          ),
        ),
        TextButton(
          onPressed: () => Navigator.pushNamed(context, '/login'),
          style: EduLinkTheme.textButtonStyle,
          child: const Text('Sign In'),
        ),
      ],
    );
  }
} 