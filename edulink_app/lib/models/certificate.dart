class Certificate {
  final String id;
  final String title;
  final DateTime issuedDate;
  final String downloadUrl;
  final bool verified;
  final String type;

  Certificate({
    required this.id,
    required this.title,
    required this.issuedDate,
    required this.downloadUrl,
    required this.verified,
    required this.type,
  });
} 