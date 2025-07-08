import 'api_client.dart';
import 'package:dio/dio.dart';

class AuthService {
  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await ApiClient.dio.post('/api/auth/login', data: {
        'email': email,
        'password': password,
      });
      return response.data;
    } on DioException catch (e) {
      return {'success': false, 'message': e.response?.data['message'] ?? 'Login failed'};
    }
  }

  Future<Map<String, dynamic>> register({
    required String email,
    required String phone,
    required String idNumber,
    required String password,
    required dynamic institution,
  }) async {
    try {
      final response = await ApiClient.dio.post('/api/auth/register', data: {
        'email': email,
        'phone': phone,
        'idNumber': idNumber,
        'password': password,
        'institution': institution is String ? institution : institution.name,
      });
      return response.data;
    } on DioException catch (e) {
      return {'success': false, 'message': e.response?.data['message'] ?? 'Registration failed'};
    }
  }

  Future<Map<String, dynamic>> verifyEmail(String code) async {
    try {
      final response = await ApiClient.dio.post('/api/auth/verify-email', data: {
        'code': code,
      });
      return response.data;
    } on DioException catch (e) {
      return {'success': false, 'message': e.response?.data['message'] ?? 'Verification failed'};
    }
  }
} 