import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/logbook_entry.dart';
import '../providers/logbook_provider.dart';

class LogbookScreen extends StatelessWidget {
  const LogbookScreen({super.key});

  int _getWeekNumber(DateTime date) {
    final firstDayOfYear = DateTime(date.year, 1, 1);
    final daysOffset = firstDayOfYear.weekday % 7;
    final firstSunday = firstDayOfYear.subtract(Duration(days: daysOffset));
    return ((date.difference(firstSunday).inDays) / 7).floor() + 1;
  }

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => LogbookProvider(),
      child: Consumer<LogbookProvider>(
        builder: (context, logbook, _) {
          return Scaffold(
            appBar: AppBar(
              title: const Text('Logbook'),
              actions: [
                IconButton(
                  icon: const Icon(Icons.view_week),
                  tooltip: 'View Weekly Logs',
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => ChangeNotifierProvider.value(
                          value: Provider.of<LogbookProvider>(context, listen: false),
                          child: const WeeklyLogsPage(),
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),
            body: Column(
              children: [
                LinearProgressIndicator(
                  value: logbook.completedLogs / logbook.requiredLogs,
                  minHeight: 8,
                  backgroundColor: Colors.grey[200],
                  color: Colors.teal,
                ),
                Padding(
                  padding: const EdgeInsets.all(8.0),
                  child: Text('Total Hours: ${logbook.totalHours}'),
                ),
                Expanded(
                  child: ListView(
                    children: [
                      Card(
                        margin: const EdgeInsets.all(12),
                        child: ListTile(
                          title: Text('Daily Log Entry (${DateTime.now().toLocal().toString().split(" ")[0]})'),
                          subtitle: const Text('Enter today\'s task and progress'),
                          trailing: ElevatedButton(
                            onPressed: () {
                              showDialog(
                                context: context,
                                builder: (context) {
                                  final descController = TextEditingController();
                                  final hoursController = TextEditingController();
                                  String progress = 'Not Started';
                                  return AlertDialog(
                                    title: const Text('Add Daily Log Entry'),
                                    content: Column(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        TextField(
                                          controller: descController,
                                          decoration: const InputDecoration(labelText: 'Task Description'),
                                        ),
                                        TextField(
                                          controller: hoursController,
                                          decoration: const InputDecoration(labelText: 'Hours'),
                                          keyboardType: TextInputType.number,
                                        ),
                                        DropdownButtonFormField<String>(
                                          value: progress,
                                          items: ['Not Started', 'In Progress', 'Completed']
                                              .map((p) => DropdownMenuItem(value: p, child: Text(p)))
                                              .toList(),
                                          onChanged: (val) {
                                            if (val != null) progress = val;
                                          },
                                          decoration: const InputDecoration(labelText: 'Progress'),
                                        ),
                                      ],
                                    ),
                                    actions: [
                                      TextButton(
                                        onPressed: () => Navigator.pop(context),
                                        child: const Text('Cancel'),
                                      ),
                                      ElevatedButton(
                                        onPressed: () {
                                          final entry = LogbookEntry(
                                            id: DateTime.now().toString(),
                                            date: DateTime.now(),
                                            description: descController.text,
                                            hours: int.tryParse(hoursController.text) ?? 0,
                                            status: LogStatus.pending,
                                            progress: progress,
                                            weekNumber: _getWeekNumber(DateTime.now()),
                                          );
                                          logbook.addLogEntry(entry);
                                          Navigator.pop(context);
                                        },
                                        child: const Text('Save'),
                                      ),
                                    ],
                                  );
                                },
                              );
                            },
                            child: const Text('Add Entry'),
                          ),
                        ),
                      ),
                      const Divider(),
                      ...logbook.getEntriesByWeek(_getWeekNumber(DateTime.now())).map((entry) => Card(
                            margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            child: ListTile(
                              title: Text('${entry.date.toLocal()} - ${entry.hours}h'),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(entry.description),
                                  Text('Progress: ${entry.progress}'),
                                ],
                              ),
                              trailing: const Icon(Icons.save, color: Colors.green),
                            ),
                          )),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(8.0),
                  child: Row(
                    children: [
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => ChangeNotifierProvider.value(
                                  value: Provider.of<LogbookProvider>(context, listen: false),
                                  child: const WeeklyLogsPage(),
                                ),
                              ),
                            );
                          },
                          child: const Text('View Weekly Logs'),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class WeeklyLogsPage extends StatelessWidget {
  const WeeklyLogsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final logbook = Provider.of<LogbookProvider>(context, listen: false);
    return Scaffold(
      appBar: AppBar(title: const Text('Weekly Logs')),
      body: ListView(
        children: logbook.allWeeks.map((week) {
          final entries = logbook.getEntriesByWeek(week);
          final submitted = entries.isNotEmpty && entries.first.submittedToSupervisor;
          final allPending = entries.isNotEmpty && entries.every((e) => e.status == LogStatus.pending);
          final anyReviewed = entries.any((e) => e.status == LogStatus.reviewed);
          return Card(
            margin: const EdgeInsets.all(12),
            child: ExpansionTile(
              title: Text('Week $week'),
              subtitle: Text('${entries.length} entries'),
              children: [
                ...entries.map((entry) => ListTile(
                      title: Text('${entry.date.toLocal()} - ${entry.hours}h'),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(entry.description),
                          Text('Progress: ${entry.progress}'),
                          Text('Status: ${entry.status.name}'),
                        ],
                      ),
                    )),
                if (!submitted)
                  Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: ElevatedButton(
                      onPressed: () {
                        logbook.submitWeekToSupervisor(week);
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Week $week submitted to supervisor!')),
                        );
                      },
                      child: const Text('Submit Week to Supervisor/Company'),
                    ),
                  ),
                if (submitted)
                  Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Status: Submitted', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.green)),
                        const SizedBox(height: 8),
                        if (allPending)
                          const Text('No reply from reviewers yet.', style: TextStyle(fontStyle: FontStyle.italic)),
                        if (anyReviewed) ...[
                          const Text('Reply from Institution:', style: TextStyle(fontWeight: FontWeight.bold)),
                          Text(logbook.getInstitutionReply(week)),
                          const SizedBox(height: 8),
                          const Text('Reply from Company:', style: TextStyle(fontWeight: FontWeight.bold)),
                          Text(logbook.getCompanyReply(week)),
                          const SizedBox(height: 8),
                          const Text('Training Officer Feedback:', style: TextStyle(fontWeight: FontWeight.bold)),
                          Text(logbook.getTrainingOfficerFeedback(week)),
                        ],
                      ],
                    ),
                  ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }
} 