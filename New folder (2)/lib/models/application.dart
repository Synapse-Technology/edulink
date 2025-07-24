enum ApplicationStatus { pending, reviewed, accepted, rejected }

class Application {
  final String id;
  final String opportunityId;
  final String studentEmail;
  final ApplicationStatus status;
  final DateTime appliedDate;
  final String? notes;

  Application({
    required this.id,
    required this.opportunityId,
    required this.studentEmail,
    required this.status,
    required this.appliedDate,
    this.notes,
  });
} 