import 'package:flutter/material.dart';
import '../services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  bool _isAuthenticated = false;
  bool _isEmailVerified = false;
  String? _token;
  String? _email;
  final AuthService _authService = AuthService();

  bool get isAuthenticated => _isAuthenticated;
  bool get isEmailVerified => _isEmailVerified;
  String? get token => _token;
  String? get email => _email;

  Future<void> login(String email, String password) async {
    final result = await _authService.login(email, password);
    if (result['success'] == true) {
      _isAuthenticated = true;
      _email = email;
    } else {
      _isAuthenticated = false;
    }
    notifyListeners();
  }

  Future<void> register(String name, String email, String phone, String nationalId, String institution, String password) async {
    final result = await _authService.register(
      email: email,
      phone: phone,
      idNumber: nationalId,
      password: password,
      institution: institution,
    );
    _isAuthenticated = false;
    _email = email;
    notifyListeners();
  }

  Future<void> verifyEmail(String code) async {
    final result = await _authService.verifyEmail(code);
    if (result['success'] == true) {
      _isEmailVerified = true;
    } else {
      _isEmailVerified = false;
    }
    notifyListeners();
  }

  void logout() {
    _isAuthenticated = false;
    _isEmailVerified = false;
    _token = null;
    _email = null;
    notifyListeners();
  }
} 