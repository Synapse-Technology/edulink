import 'package:flutter/material.dart';
import '../models/opportunity.dart';
import '../services/api_client.dart';
import 'package:dio/dio.dart';

class OpportunityProvider extends ChangeNotifier {
  List<Opportunity> _opportunities = [];
  List<Opportunity> get opportunities => _opportunities;

  Future<void> fetchOpportunities() async {
    try {
      final response = await ApiClient.dio.get('/api/opportunities');
      _opportunities = (response.data as List)
          .map((json) => Opportunity.fromJson(json))
          .toList();
      notifyListeners();
    } on DioException catch (e) {
      // Handle error, e.g., show a message or log
    }
  }

  Opportunity? getOpportunityById(String id) {
    try {
      return _opportunities.firstWhere((o) => o.id == id);
    } catch (e) {
      return null;
    }
  }

  Future<Opportunity?> getOpportunityByIdRemote(String id) async {
    try {
      final response = await ApiClient.dio.get('/api/opportunities/$id');
      return Opportunity.fromJson(response.data);
    } on DioException catch (e) {
      return null;
    }
  }
} 