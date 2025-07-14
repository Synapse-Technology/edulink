import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../services/api_client.dart';
import 'package:dio/dio.dart';

class AuthProvider extends ChangeNotifier {
  bool _isAuthenticated = false;
  bool _isEmailVerified = false;
  String? _token;
  String? _email;
  String? _errorMessage;
  String? _successMessage;
  final AuthService _authService = AuthService();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  bool get isAuthenticated => _isAuthenticated;
  bool get isEmailVerified => _isEmailVerified;
  String? get token => _token;
  String? get email => _email;
  String? get errorMessage => _errorMessage;
  String? get successMessage => _successMessage;

  void clearMessages() {
    _errorMessage = null;
    _successMessage = null;
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    try {
      final result = await _authService.login(email, password);
      if (result['success'] == true) {
        _isAuthenticated = true;
        _email = email;
        _token = result['token'];
        _errorMessage = null;
        _successMessage = 'Login successful!';
        
        if (_token != null) {
          await _storage.write(key: 'auth_token', value: _token);
          ApiClient.setToken(_token);
        }
      } else {
        _isAuthenticated = false;
        _token = null;
        _errorMessage = result['message'] ?? 'Login failed. Please check your credentials.';
        _successMessage = null;
        await _storage.delete(key: 'auth_token');
        ApiClient.setToken(null);
      }
    } catch (e) {
      _isAuthenticated = false;
      _token = null;
      _errorMessage = _getUserFriendlyErrorMessage(e.toString());
      _successMessage = null;
      await _storage.delete(key: 'auth_token');
      ApiClient.setToken(null);
    }
    notifyListeners();
  }

  Future<void> register(String name, String email, String phone, String nationalId, String institution, String password) async {
    try {
      final result = await _authService.register(
        email: email,
        phone: phone,
        idNumber: nationalId,
        password: password,
        institution: institution,
      );
      _isAuthenticated = false;
      _email = email;
      _token = null;
      _errorMessage = null;
      _successMessage = 'Registration successful! Please check your email to verify your account.';
      await _storage.delete(key: 'auth_token');
      ApiClient.setToken(null);
    } catch (e) {
      _isAuthenticated = false;
      _token = null;
      _errorMessage = _getUserFriendlyErrorMessage(e.toString());
      _successMessage = null;
      await _storage.delete(key: 'auth_token');
      ApiClient.setToken(null);
    }
    notifyListeners();
  }

  Future<void> verifyEmail(String code) async {
    try {
      final result = await _authService.verifyEmail(code);
      if (result['success'] == true) {
        _isEmailVerified = true;
        _errorMessage = null;
        _successMessage = 'Email verified successfully!';
      } else {
        _isEmailVerified = false;
        _errorMessage = result['message'] ?? 'Email verification failed.';
        _successMessage = null;
      }
    } catch (e) {
      _isEmailVerified = false;
      _errorMessage = _getUserFriendlyErrorMessage(e.toString());
      _successMessage = null;
    }
    notifyListeners();
  }

  void logout() async {
    _isAuthenticated = false;
    _isEmailVerified = false;
    _token = null;
    _email = null;
    _errorMessage = null;
    _successMessage = null;
    await _storage.delete(key: 'auth_token');
    ApiClient.setToken(null);
    notifyListeners();
  }

  Future<void> initAuth() async {
    _token = await _storage.read(key: 'auth_token');
    if (_token != null && _token!.isNotEmpty) {
      ApiClient.setToken(_token);
      _isAuthenticated = true;
    } else {
      _isAuthenticated = false;
      ApiClient.setToken(null);
    }
    notifyListeners();
  }

  Future<void> registerStudent(Map<String, dynamic> data) async {
    // Remove course_code if null or empty
    if (data['course_code'] == null || (data['course_code'] is String && data['course_code'].trim().isEmpty)) {
      data.remove('course_code');
    }
    
    try {
      final response = await ApiClient.dio.post('/api/auth/register/', data: data);
      
      if (response.data['user'] != null || response.data['message']?.toString().toLowerCase().contains('success') == true) {
        _isAuthenticated = true;
        _email = data['email'];
        _errorMessage = null;
        _successMessage = 'Registration successful! Please check your email to verify your account.';
        
        // If backend returns a token, store it
        if (response.data['token'] != null) {
          _token = response.data['token'];
          await _storage.write(key: 'auth_token', value: _token);
          ApiClient.setToken(_token);
        }
      } else {
        _isAuthenticated = false;
        _token = null;
        _errorMessage = _getUserFriendlyErrorMessage(response.data.toString());
        _successMessage = null;
        await _storage.delete(key: 'auth_token');
        ApiClient.setToken(null);
      }
    } catch (e) {
      _isAuthenticated = false;
      _token = null;
      await _storage.delete(key: 'auth_token');
      ApiClient.setToken(null);
      
      if (e is DioException && e.response != null) {
        _errorMessage = _getUserFriendlyErrorMessage(e.response?.data.toString() ?? 'Registration failed.');
      } else {
        _errorMessage = _getUserFriendlyErrorMessage(e.toString());
      }
      _successMessage = null;
    }
    notifyListeners();
  }

  String _getUserFriendlyErrorMessage(String error) {
    final errorLower = error.toLowerCase();
    
    // Registration specific errors
    if (errorLower.contains('email already exists') || errorLower.contains('email already registered')) {
      return 'An account with this email already exists. Please try logging in instead.';
    } else if (errorLower.contains('phone number') && errorLower.contains('already')) {
      return 'This phone number is already registered. Please use a different number.';
    } else if (errorLower.contains('national id') && errorLower.contains('already')) {
      return 'This national ID is already registered. Please check your details.';
    } else if (errorLower.contains('registration number') && errorLower.contains('already')) {
      return 'This registration number is already registered. Please check your details.';
    }
    
    // Login specific errors
    else if (errorLower.contains('invalid credentials') || errorLower.contains('wrong password')) {
      return 'Invalid email or password. Please check your credentials and try again.';
    } else if (errorLower.contains('user not found') || errorLower.contains('email not found')) {
      return 'No account found with this email. Please check your email or create a new account.';
    }
    
    // Network and server errors
    else if (errorLower.contains('network') || errorLower.contains('connection')) {
      return 'Connection error. Please check your internet connection and try again.';
    } else if (errorLower.contains('timeout')) {
      return 'Request timed out. Please try again.';
    } else if (errorLower.contains('server') || errorLower.contains('500')) {
      return 'Server error. Please try again later.';
    } else if (errorLower.contains('unauthorized') || errorLower.contains('401')) {
      return 'Unauthorized access. Please log in again.';
    } else if (errorLower.contains('forbidden') || errorLower.contains('403')) {
      return 'Access denied. Please check your permissions.';
    } else if (errorLower.contains('not found') || errorLower.contains('404')) {
      return 'Resource not found. Please check your request.';
    }
    
    // Validation errors
    else if (errorLower.contains('validation') || errorLower.contains('invalid')) {
      return 'Please check your input and try again.';
    } else if (errorLower.contains('required') || errorLower.contains('missing')) {
      return 'Please fill in all required fields.';
    }
    
    // Default error
    else {
      return 'An error occurred. Please try again.';
    }
  }
} 