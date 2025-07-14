class KuccpsInstitution {
  final String name;
  final String code;

  KuccpsInstitution({required this.name, required this.code});

  factory KuccpsInstitution.fromJson(Map<String, dynamic> json) {
    return KuccpsInstitution(
      name: json['name'] ?? '',
      code: json['code'] ?? '',
    );
  }
} 