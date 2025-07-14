import 'package:flutter/material.dart';
import '../models/opportunity.dart';
import '../models/application.dart';
import '../services/user_session.dart';
import '../models/opportunity_data.dart';

import 'opportunities_screen.dart';

// Shared in-memory application list for demo
List<Application> userApplications = [];

class DashboardScreen extends StatefulWidget {
  final void Function(int)? onNavigate;
  const DashboardScreen({super.key, this.onNavigate});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late List<Opportunity> suggested;

  @override
  void initState() {
    super.initState();
    // Use the shared allOpportunities for suggestions (e.g., first 2)
    suggested = allOpportunities.take(2).toList();
  }

  void _applyForOpportunity(Opportunity o) {
    final email = UserSession.email ?? 'student@example.com';
    final alreadyApplied = userApplications.any((a) => a.opportunityId == o.id && a.studentEmail == email);
    if (alreadyApplied) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('You have already applied for this opportunity.')),
      );
      return;
    }
    final newApp = Application(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      opportunityId: o.id,
      studentEmail: email,
      status: ApplicationStatus.pending,
      appliedDate: DateTime.now(),
      notes: 'Application submitted',
    );
    setState(() {
      userApplications.add(newApp);
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Application submitted!')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isTablet = screenWidth > 600;
    // Demo user info
    final email = UserSession.email ?? '';
    final first = email.isNotEmpty ? email.split('@').first : 'User';
    String capitalize(String s) => s.isNotEmpty ? s[0].toUpperCase() + s.substring(1) : s;
    final firstName = capitalize(first.split('.').first);
    const institution = 'Kenyatta University';
    const internshipEndsIn = 17;
    const internshipProgress = 0.68;
    const internshipTitle = 'Flutter Developer';
    const internshipCompany = 'Safaricom PLC';
    const internshipDuration = 'May 2024 – Aug 2024';
    const internshipOngoingProgress = 0.75;
    final metrics = [
      {'icon': Icons.description, 'label': 'Applications', 'value': '${userApplications.length} Active'},
      {'icon': Icons.edit_note, 'label': 'Logs', 'value': '7 Submitted'},
      {'icon': Icons.verified, 'label': 'Certificates', 'value': '1 Awarded'},
      {'icon': Icons.extension, 'label': 'Matches', 'value': '12 New'},
    ];
    final activities = [
      {'icon': Icons.feedback, 'title': 'New Feedback from Safaricom HR', 'time': '1h ago'},
      {'icon': Icons.new_releases, 'title': 'Internship "Flutter Dev" added today', 'time': 'Today'},
      {'icon': Icons.check_circle, 'title': 'Log submitted for June 18', 'time': 'Yesterday'},
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('EduLink'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_none),
            onPressed: () {},
          ),
          Padding(
            padding: const EdgeInsets.only(right: 8.0),
            child: CircleAvatar(
              backgroundColor: Colors.teal,
              child: Text(
                firstName.isNotEmpty ? firstName[0] : '',
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          return ListView(
            padding: EdgeInsets.symmetric(
              horizontal: isTablet ? screenWidth * 0.15 : 16,
              vertical: 16,
            ),
            children: [
              // Header Card
              Card(
                elevation: 4,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: EdgeInsets.all(isTablet ? 32 : 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text('Hi $firstName 👨‍🎓', style: Theme.of(context).textTheme.titleLarge),
                          ),
                          const Icon(Icons.verified, color: Colors.green, size: 20),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Text(institution, style: TextStyle(fontWeight: FontWeight.w500)),
                          const SizedBox(width: 6),
                          const Icon(Icons.school, color: Colors.teal, size: 18),
                          const SizedBox(width: 6),
                          Chip(
                            label: const Text('Ends in $internshipEndsIn Days'),
                            backgroundColor: Colors.orange[50],
                            labelStyle: const TextStyle(color: Colors.orange),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: LinearProgressIndicator(
                              value: internshipProgress,
                              minHeight: 8,
                              backgroundColor: Colors.grey[200],
                              color: Colors.teal,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Text('${(internshipProgress * 100).round()}%'),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Align(
                        alignment: Alignment.centerRight,
                        child: ElevatedButton(
                          onPressed: () {
                            if (widget.onNavigate != null) widget.onNavigate!(3); // Logbook tab
                          },
                          style: ElevatedButton.styleFrom(backgroundColor: Colors.teal),
                          child: const Text('Continue Logbook'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 18),
              // Metrics Section
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: metrics.map((m) {
                  return SizedBox(
                    width: isTablet ? (screenWidth * 0.15) : (screenWidth - 48) / 2,
                    child: Card(
                      elevation: 3,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(m['icon'] as IconData, color: Colors.teal, size: 28),
                            const SizedBox(height: 6),
                            Text(m['label'] as String, style: const TextStyle(fontWeight: FontWeight.w500)),
                            const SizedBox(height: 2),
                            Text(m['value'] as String, style: const TextStyle(color: Colors.black54, fontSize: 13)),
                          ],
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 18),
              // Activity Stream
              Card(
                elevation: 3,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Padding(
                  padding: EdgeInsets.all(isTablet ? 24 : 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Activity Feed', style: TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 10),
                      ...activities.map((a) => ListTile(
                            leading: Icon(a['icon'] as IconData, color: Colors.teal),
                            title: Text(a['title'] as String),
                            subtitle: Text(a['time'] as String),
                            dense: true,
                          )),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 18),
              // Ongoing Internship Card
              Card(
                elevation: 4,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: EdgeInsets.all(isTablet ? 24 : 18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.business, color: Colors.teal),
                          SizedBox(width: 8),
                          Text(internshipCompany, style: TextStyle(fontWeight: FontWeight.bold)),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(internshipTitle, style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 4),
                      const Text(internshipDuration, style: TextStyle(color: Colors.black54)),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: LinearProgressIndicator(
                              value: internshipOngoingProgress,
                              minHeight: 8,
                              backgroundColor: Colors.grey[200],
                              color: Colors.teal,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Text('${(internshipOngoingProgress * 100).round()}%'),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Align(
                        alignment: Alignment.centerRight,
                        child: OutlinedButton(
                          onPressed: () {
                            if (widget.onNavigate != null) widget.onNavigate!(3); // Logbook tab
                          },
                          child: const Text('Log Entry'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 18),
              // Suggested Opportunities
              const Text('Suggested Opportunities', style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              isTablet
                  ? GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        childAspectRatio: 1.8,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                      ),
                      itemCount: suggested.length,
                      itemBuilder: (context, i) {
                        final s = suggested[i];
                        final alreadyApplied = userApplications.any((a) => a.opportunityId == s.id && a.studentEmail == email);
                        return Card(
                          elevation: 3,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          child: Container(
                            padding: const EdgeInsets.all(14),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(s.title, style: const TextStyle(fontWeight: FontWeight.bold)),
                                const SizedBox(height: 4),
                                Text('${s.company} • ${s.location}', style: const TextStyle(color: Colors.black54)),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    const Icon(Icons.access_time, size: 16, color: Colors.orange),
                                    const SizedBox(width: 4),
                                    Text('Posted ${DateTime.now().difference(s.postedDate).inDays}d ago', style: const TextStyle(fontSize: 12)),
                                  ],
                                ),
                                const Spacer(),
                                Row(
                                  children: [
                                    Expanded(
                                      child: ElevatedButton(
                                        onPressed: () {
                                          if (widget.onNavigate != null) {
                                            widget.onNavigate!(1); // 1 is the index for Browse/Opportunities
                                          }
                                        },
                                        style: ElevatedButton.styleFrom(backgroundColor: Colors.teal, minimumSize: const Size(40, 2)),
                                        child: const Text('View Details'),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    )
                  : SizedBox(
                      height: 150,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: suggested.length,
                        separatorBuilder: (context, i) => const SizedBox(width: 12),
                        itemBuilder: (context, i) {
                          final s = suggested[i];
                          final alreadyApplied = userApplications.any((a) => a.opportunityId == s.id && a.studentEmail == email);
                          return Card(
                            elevation: 3,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            child: Container(
                              width: 200,
                              padding: const EdgeInsets.all(14),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(s.title, style: const TextStyle(fontWeight: FontWeight.bold)),
                                  const SizedBox(height: 4),
                                  Text('${s.company} • ${s.location}', style: const TextStyle(color: Colors.black54)),
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      const Icon(Icons.access_time, size: 16, color: Colors.orange),
                                      const SizedBox(width: 4),
                                      Text('Posted ${DateTime.now().difference(s.postedDate).inDays}d ago', style: const TextStyle(fontSize: 12)),
                                    ],
                                  ),
                                  const Spacer(),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: ElevatedButton(
                                          onPressed: () {
                                            if (widget.onNavigate != null) {
                                              widget.onNavigate!(1); // 1 is the index for Browse/Opportunities
                                            }
                                          },
                                          style: ElevatedButton.styleFrom(backgroundColor: Colors.teal, minimumSize: const Size(60, 32)),
                                          child: const Text('View Details'),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),

            ],
          );
        },
      ),
    );
  }
} 