class Opportunity {
  final String id;
  final String title;
  final String company;
  final String location;
  final String description;
  final List<String> requirements;
  final DateTime postedDate;

  Opportunity({
    required this.id,
    required this.title,
    required this.company,
    required this.location,
    required this.description,
    required this.requirements,
    required this.postedDate,
  });
} 