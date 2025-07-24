import 'package:flutter/material.dart';
import '../models/logbook_entry.dart';
import '../services/api_client.dart';
import 'package:dio/dio.dart';

class LogbookProvider extends ChangeNotifier {
  List<LogbookEntry> _entries = [];
  bool _internshipComplete = false;
  int requiredLogs = 12;
  Map<int, String> _weeklyFeedback = {};
  Map<int, String> _weeklyReport = {};
  Map<int, String> _institutionReplies = {};
  Map<int, String> _companyReplies = {};
  Map<int, String> _trainingOfficerFeedback = {};

  List<LogbookEntry> get entries => _entries;
  bool get internshipComplete => _internshipComplete;
  int get totalHours => _entries.fold(0, (sum, e) => sum + e.hours);
  int get completedLogs => _entries.where((e) => e.status == LogStatus.reviewed).length;
  bool get readyForCompletion => totalHours >= 240 && completedLogs >= requiredLogs;

  List<LogbookEntry> getEntriesByWeek(int week) => _entries.where((e) => e.weekNumber == week).toList();
  List<int> get allWeeks => _entries.map((e) => e.weekNumber).toSet().toList()..sort();

  String getWeeklyFeedback(int week) => _weeklyFeedback[week] ?? 'Waiting for supervisor/company feedback...';
  String getWeeklyReport(int week) => _weeklyReport[week] ?? 'Trainee weekly report will appear here after submission.';
  String getInstitutionReply(int week) => _institutionReplies[week] ?? 'Awaiting response from institution...';
  String getCompanyReply(int week) => _companyReplies[week] ?? 'Awaiting response from company...';
  String getTrainingOfficerFeedback(int week) => _trainingOfficerFeedback[week] ?? 'Awaiting feedback from training officer...';

  Future<void> fetchLogbookEntries() async {
    try {
      final response = await ApiClient.dio.get('/api/logbook');
      _entries = (response.data as List)
          .map((json) => LogbookEntry.fromJson(json))
          .toList();
      notifyListeners();
    } on DioException catch (e) {
      // Handle error
    }
  }

  Future<void> addLogEntry(LogbookEntry entry) async {
    try {
      final response = await ApiClient.dio.post('/api/logbook', data: entry.toJson());
      _entries.add(LogbookEntry.fromJson(response.data));
      notifyListeners();
    } on DioException catch (e) {
      // Handle error
    }
  }

  Future<void> reviewLogEntry(String logId, String feedback, int rating) async {
    try {
      await ApiClient.dio.post('/api/logbook/$logId/review', data: {
        'feedback': feedback,
        'rating': rating,
      });
      final idx = _entries.indexWhere((e) => e.id == logId);
      if (idx != -1) {
        _entries[idx] = _entries[idx].copyWith(
          status: LogStatus.reviewed,
          feedback: feedback,
          rating: rating,
        );
        notifyListeners();
      }
    } on DioException catch (e) {
      // Handle error
    }
  }

  Future<void> markInternshipComplete() async {
    try {
      await ApiClient.dio.post('/api/logbook/complete');
      _internshipComplete = true;
      notifyListeners();
    } on DioException catch (e) {
      // Handle error
    }
  }

  Future<void> submitWeekToSupervisor(int week) async {
    try {
      await ApiClient.dio.post('/api/logbook/submit-week', data: {'week': week});
      // Optionally update local state
      notifyListeners();
    } on DioException catch (e) {
      // Handle error
    }
  }
} 