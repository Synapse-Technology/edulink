import 'package:flutter/material.dart';
import '../models/opportunity.dart';
import '../models/application.dart';
import '../services/user_session.dart';
import '../models/opportunity_data.dart';

import 'dashboard_screen.dart'; // for userApplications

class OpportunitiesScreen extends StatefulWidget {
  const OpportunitiesScreen({super.key});

  @override
  State<OpportunitiesScreen> createState() => _OpportunitiesScreenState();
}

class _OpportunitiesScreenState extends State<OpportunitiesScreen> {
  String search = '';

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
    final email = UserSession.email ?? 'student@example.com';
    final filtered = allOpportunities.where((o) =>
      o.title.toLowerCase().contains(search.toLowerCase()) ||
      o.company.toLowerCase().contains(search.toLowerCase()) ||
      o.location.toLowerCase().contains(search.toLowerCase())
    ).toList();
    return Scaffold(
      appBar: AppBar(title: const Text('Browse Opportunities')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12.0),
            child: TextField(
              decoration: const InputDecoration(
                hintText: 'Search by title, company, or location',
                prefixIcon: Icon(Icons.search),
                border: OutlineInputBorder(),
              ),
              onChanged: (val) => setState(() => search = val),
            ),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: filtered.length,
              itemBuilder: (context, i) {
                final o = filtered[i];
                final alreadyApplied = userApplications.any((a) => a.opportunityId == o.id && a.studentEmail == email);
                return Card(
                  margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  child: ListTile(
                    title: Text(o.title),
                    subtitle: Text('${o.company} • ${o.location}'),
                    onTap: () {
                      showDialog(
                        context: context,
                        builder: (_) => AlertDialog(
                          title: Text(o.title),
                          content: Column(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Company: ${o.company}'),
                              Text('Location: ${o.location}'),
                              const SizedBox(height: 8),
                              const Text('Description:'),
                              Text(o.description),
                              const SizedBox(height: 8),
                              const Text('Requirements:'),
                              ...o.requirements.map((r) => Text('- $r')),
                            ],
                          ),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(context),
                              child: const Text('Close'),
                            ),
                            ElevatedButton(
                              onPressed: alreadyApplied ? null : () {
                                Navigator.pop(context);
                                _applyForOpportunity(o);
                                // TODO: Optionally navigate to Applications tab after applying
                              },
                              child: Text(alreadyApplied ? 'Applied' : 'Apply'),
                            ),
                          ],
                        ),
                      );
                    },
                    trailing: ElevatedButton(
                      onPressed: alreadyApplied ? null : () => _applyForOpportunity(o),
                      child: Text(alreadyApplied ? 'Applied' : 'Apply'),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
} 