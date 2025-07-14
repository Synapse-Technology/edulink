import 'package:flutter/material.dart';
import '../models/opportunity.dart';
import '../models/opportunity_data.dart';
import 'dashboard_screen.dart'; // for userApplications

class ApplicationsScreen extends StatelessWidget {
  const ApplicationsScreen({super.key});

  Opportunity? _findOpportunity(String id) {
    try {
      return allOpportunities.firstWhere((o) => o.id == id);
    } catch (e) {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Applications')),
      body: userApplications.isEmpty
          ? const Center(child: Text('No applications yet.'))
          : ListView.builder(
              itemCount: userApplications.length,
              itemBuilder: (context, i) {
                final a = userApplications[i];
                final opp = _findOpportunity(a.opportunityId);
                return Card(
                  margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  child: ListTile(
                    title: Text(opp != null ? opp.title : 'Opportunity #${a.opportunityId}'),
                    subtitle: Text('Status: ${a.status.name}'),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                    onTap: () {
                      showDialog(
                        context: context,
                        builder: (_) => AlertDialog(
                          title: Text(opp != null ? opp.title : 'Application #${a.id}'),
                          content: Column(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (opp != null) ...[
                                Text('Company: ${opp.company}'),
                                Text('Location: ${opp.location}'),
                                const SizedBox(height: 8),
                                const Text('Description:'),
                                Text(opp.description),
                                const SizedBox(height: 8),
                                const Text('Requirements:'),
                                ...opp.requirements.map((r) => Text('- $r')),
                                const SizedBox(height: 8),
                              ],
                              Text('Status: ${a.status.name}'),
                              Text('Applied: ${a.appliedDate.toLocal()}'),
                              if (a.notes != null) Text('Notes: ${a.notes}'),
                            ],
                          ),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(context),
                              child: const Text('Close'),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                );
              },
            ),
    );
  }
} 