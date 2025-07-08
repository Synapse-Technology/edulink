enum LogStatus { pending, reviewed }

class LogbookEntry {
  final String id;
  final DateTime date;
  final String description;
  final int hours;
  final LogStatus status;
  final String? feedback;
  final int? rating;
  final String progress;
  final int weekNumber;
  final bool submittedToSupervisor;

  LogbookEntry({
    required this.id,
    required this.date,
    required this.description,
    required this.hours,
    required this.status,
    this.feedback,
    this.rating,
    required this.progress,
    required this.weekNumber,
    this.submittedToSupervisor = false,
  });

  LogbookEntry copyWith({
    String? id,
    DateTime? date,
    String? description,
    int? hours,
    LogStatus? status,
    String? feedback,
    int? rating,
    String? progress,
    int? weekNumber,
    bool? submittedToSupervisor,
  }) {
    return LogbookEntry(
      id: id ?? this.id,
      date: date ?? this.date,
      description: description ?? this.description,
      hours: hours ?? this.hours,
      status: status ?? this.status,
      feedback: feedback ?? this.feedback,
      rating: rating ?? this.rating,
      progress: progress ?? this.progress,
      weekNumber: weekNumber ?? this.weekNumber,
      submittedToSupervisor: submittedToSupervisor ?? this.submittedToSupervisor,
    );
  }

  factory LogbookEntry.fromJson(Map<String, dynamic> json) {
    return LogbookEntry(
      id: json['id'] as String,
      date: DateTime.parse(json['date'] as String),
      description: json['description'] as String,
      hours: json['hours'] as int,
      status: _logStatusFromString(json['status'] as String),
      feedback: json['feedback'] as String?,
      rating: json['rating'] as int?,
      progress: json['progress'] as String,
      weekNumber: json['weekNumber'] as int,
      submittedToSupervisor: json['submittedToSupervisor'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'date': date.toIso8601String(),
      'description': description,
      'hours': hours,
      'status': status.toString().split('.').last,
      'feedback': feedback,
      'rating': rating,
      'progress': progress,
      'weekNumber': weekNumber,
      'submittedToSupervisor': submittedToSupervisor,
    };
  }

  static LogStatus _logStatusFromString(String status) {
    switch (status) {
      case 'pending':
        return LogStatus.pending;
      case 'reviewed':
        return LogStatus.reviewed;
      default:
        return LogStatus.pending;
    }
  }
} 