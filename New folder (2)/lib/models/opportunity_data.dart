import 'opportunity.dart';

final List<Opportunity> allOpportunities = [
  Opportunity(
    id: '1',
    title: 'Flutter Developer Intern',
    company: 'Safaricom PLC',
    location: 'Nairobi',
    description: 'Work on mobile apps with Flutter.',
    requirements: ['Flutter', 'Dart', 'Teamwork'],
    postedDate: DateTime.now().subtract(const Duration(days: 1)),
  ),
  Opportunity(
    id: '2',
    title: 'Backend Intern',
    company: 'Equity Bank',
    location: 'Remote',
    description: 'Assist in backend development.',
    requirements: ['Python', 'APIs', 'SQL'],
    postedDate: DateTime.now().subtract(const Duration(days: 2)),
  ),
  Opportunity(
    id: '3',
    title: 'Flutter Intern',
    company: 'Twiga',
    location: 'Nairobi',
    description: 'Work on mobile apps with Flutter.',
    requirements: ['Flutter', 'Dart', 'Teamwork'],
    postedDate: DateTime.now().subtract(const Duration(days: 1)),
  ),
]; 