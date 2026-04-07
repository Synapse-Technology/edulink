#!/bin/bash
# EduLink — Logbook Feature Implementation
# Run from INSIDE your edulink_app/ directory:
#   chmod +x ../implement_logbook.sh && ../implement_logbook.sh

set -e
echo "📓 Implementing Logbook feature..."

mkdir -p lib/features/logbook/screens
mkdir -p lib/features/logbook/widgets
mkdir -p lib/shared/models

# ─────────────────────────────────────────────────────────────────────────────
# LOGBOOK MODEL
# ─────────────────────────────────────────────────────────────────────────────

cat > lib/shared/models/logbook_model.dart << 'EOF'
enum ReviewStatus { pending, approved, rejected }
enum EntryType { daily, weekly, milestone }

class LogEntry {
  final String id;
  final String date;          // e.g. "Mon, 7 Apr 2025"
  final String weekLabel;     // e.g. "Week 3"
  final String title;
  final String summary;
  final List<String> tasks;
  final EntryType type;
  final ReviewStatus employerStatus;
  final ReviewStatus institutionStatus;
  final String? employerComment;
  final String? institutionComment;
  final List<String> evidenceUrls; // photo/file URLs
  final bool isDraft;
  final bool isSynced;

  const LogEntry({
    required this.id,
    required this.date,
    required this.weekLabel,
    required this.title,
    required this.summary,
    required this.tasks,
    required this.type,
    required this.employerStatus,
    required this.institutionStatus,
    this.employerComment,
    this.institutionComment,
    this.evidenceUrls = const [],
    this.isDraft = false,
    this.isSynced = true,
  });
}

final sampleLogEntries = [
  const LogEntry(
    id: 'e1',
    date: 'Mon, 7 Apr 2025',
    weekLabel: 'Week 3',
    title: 'Wireframe Review & Figma Handoff',
    summary: 'Completed the mobile wireframes for the internship listing screen and presented them to the product lead. Received positive feedback with minor revisions requested.',
    tasks: [
      'Finished low-fidelity wireframes for 3 screens',
      'Presented to product lead — 2 revisions noted',
      'Updated Figma file and shared access with dev team',
      'Attended afternoon standup and sprint planning session',
    ],
    type: EntryType.daily,
    employerStatus: ReviewStatus.approved,
    institutionStatus: ReviewStatus.approved,
    employerComment: 'Great work! The presentation was clear and professional.',
    evidenceUrls: [],
  ),
  const LogEntry(
    id: 'e2',
    date: 'Fri, 4 Apr 2025',
    weekLabel: 'Week 3',
    title: 'Weekly Summary — Design Sprint Week',
    summary: 'Completed full design sprint cycle: research, ideation, prototyping, and testing. Produced 12 screens across 3 user flows.',
    tasks: [
      'User research synthesis from 5 interviews',
      'Produced 12 high-fidelity screens in Figma',
      'Ran usability test with 3 participants',
      'Documented findings in Confluence',
    ],
    type: EntryType.weekly,
    employerStatus: ReviewStatus.approved,
    institutionStatus: ReviewStatus.pending,
    institutionComment: null,
    evidenceUrls: [],
  ),
  const LogEntry(
    id: 'e3',
    date: 'Wed, 2 Apr 2025',
    weekLabel: 'Week 3',
    title: 'User Research & Competitive Analysis',
    summary: 'Conducted 5 user interviews to understand pain points in current internship listing platforms. Compiled competitive analysis report.',
    tasks: [
      'Conducted 5 remote user interviews (45 min each)',
      'Analyzed 4 competitor apps for UX benchmarking',
      'Created affinity map from research notes',
    ],
    type: EntryType.daily,
    employerStatus: ReviewStatus.pending,
    institutionStatus: ReviewStatus.pending,
    evidenceUrls: [],
    isSynced: false,
    isDraft: false,
  ),
  const LogEntry(
    id: 'e4',
    date: 'Mon, 31 Mar 2025',
    weekLabel: 'Week 2',
    title: 'Onboarding & Tool Setup',
    summary: 'Completed company onboarding, set up development environment, and attended orientation sessions with the design and engineering teams.',
    tasks: [
      'HR onboarding & access provisioning',
      'Set up Figma, Slack, Jira, and Confluence accounts',
      'Met with design team lead for role briefing',
    ],
    type: EntryType.daily,
    employerStatus: ReviewStatus.approved,
    institutionStatus: ReviewStatus.approved,
    evidenceUrls: [],
  ),
];
EOF

# ─────────────────────────────────────────────────────────────────────────────
# LOGBOOK SCREEN
# ─────────────────────────────────────────────────────────────────────────────

cat > lib/features/logbook/screens/logbook_screen.dart << 'EOF'
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/constants/app_routes.dart';
import '../../../shared/models/logbook_model.dart';
import '../widgets/log_entry_card.dart';
import '../widgets/dual_review_badge.dart';

class LogbookScreen extends StatefulWidget {
  const LogbookScreen({super.key});

  @override
  State<LogbookScreen> createState() => _LogbookScreenState();
}

class _LogbookScreenState extends State<LogbookScreen> {
  String _filter = 'All';
  final _filters = ['All', 'Pending', 'Approved', 'Weekly', 'Draft'];

  List<LogEntry> get _filtered {
    switch (_filter) {
      case 'Pending':
        return sampleLogEntries.where((e) =>
          e.employerStatus == ReviewStatus.pending ||
          e.institutionStatus == ReviewStatus.pending).toList();
      case 'Approved':
        return sampleLogEntries.where((e) =>
          e.employerStatus == ReviewStatus.approved &&
          e.institutionStatus == ReviewStatus.approved).toList();
      case 'Weekly':
        return sampleLogEntries.where((e) => e.type == EntryType.weekly).toList();
      case 'Draft':
        return sampleLogEntries.where((e) => e.isDraft).toList();
      default:
        return sampleLogEntries;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          // ── Header ──────────────────────────────────────────────────────
          SliverAppBar(
            pinned: true,
            expandedHeight: 140,
            backgroundColor: AppColors.navy,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                color: AppColors.navy,
                padding: const EdgeInsets.fromLTRB(16, 48, 16, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Logbook',
                      style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w700)),
                    const Text('KCB Group · IT Internship',
                      style: TextStyle(color: Colors.white60, fontSize: 12)),
                    const SizedBox(height: 12),
                    // Progress bar
                    Row(children: [
                      Expanded(child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Week 3 of 12',
                            style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 4),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: const LinearProgressIndicator(
                              value: 3 / 12,
                              minHeight: 5,
                              backgroundColor: Colors.white24,
                              valueColor: AlwaysStoppedAnimation(AppColors.green),
                            ),
                          ),
                        ],
                      )),
                      const SizedBox(width: 16),
                      // Today's entry status
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: AppColors.green.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.green.withOpacity(0.4)),
                        ),
                        child: const Text("Today ✓",
                          style: TextStyle(color: AppColors.green, fontSize: 11, fontWeight: FontWeight.w600)),
                      ),
                    ]),
                  ],
                ),
              ),
            ),
          ),

          // ── Stats row ────────────────────────────────────────────────────
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
              child: Row(children: [
                _StatCard(label: 'Total Entries', value: '${sampleLogEntries.length}', color: AppColors.tealLight, valueColor: AppColors.teal),
                const SizedBox(width: 8),
                _StatCard(label: 'Approved', value: '2', color: AppColors.greenLight, valueColor: AppColors.green),
                const SizedBox(width: 8),
                _StatCard(label: 'Pending', value: '2', color: AppColors.warningBg, valueColor: AppColors.warning),
              ]),
            ),
          ),

          // ── Filter chips ─────────────────────────────────────────────────
          SliverToBoxAdapter(
            child: SizedBox(
              height: 48,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                itemCount: _filters.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (_, i) {
                  final f = _filters[i];
                  final active = f == _filter;
                  return GestureDetector(
                    onTap: () => setState(() => _filter = f),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                      decoration: BoxDecoration(
                        color: active ? AppColors.teal : Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: active ? AppColors.teal : AppColors.border),
                      ),
                      child: Text(f,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: active ? Colors.white : AppColors.textSecond,
                        )),
                    ),
                  );
                },
              ),
            ),
          ),

          // ── Offline banner (shown when unsynced entries exist) ────────────
          if (sampleLogEntries.any((e) => !e.isSynced))
            SliverToBoxAdapter(
              child: Container(
                margin: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: AppColors.warningBg,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.warning.withOpacity(0.4)),
                ),
                child: Row(children: [
                  const Icon(Icons.cloud_off, color: AppColors.warning, size: 16),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text('1 entry saved offline — will sync when connected',
                      style: TextStyle(fontSize: 11, color: AppColors.warning, fontWeight: FontWeight.w500)),
                  ),
                ]),
              ),
            ),

          // ── Entry list ────────────────────────────────────────────────────
          _filtered.isEmpty
            ? const SliverFillRemaining(
                child: Center(child: Text('No entries match this filter.',
                  style: TextStyle(color: AppColors.textSecond))),
              )
            : SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (ctx, i) {
                      final entry = _filtered[i];
                      // Insert week header when week changes
                      final showHeader = i == 0 ||
                        _filtered[i].weekLabel != _filtered[i - 1].weekLabel;
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (showHeader) ...[
                            Padding(
                              padding: const EdgeInsets.only(top: 14, bottom: 8),
                              child: Text(entry.weekLabel,
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textSecond,
                                  letterSpacing: 0.5,
                                )),
                            ),
                          ],
                          Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: LogEntryCard(entry: entry),
                          ),
                        ],
                      );
                    },
                    childCount: _filtered.length,
                  ),
                ),
              ),
        ],
      ),

      // ── FAB: New entry ────────────────────────────────────────────────────
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.go(AppRoutes.logEntry),
        backgroundColor: AppColors.teal,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text("Log Today", style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label, value;
  final Color color, valueColor;
  const _StatCard({required this.label, required this.value, required this.color, required this.valueColor});

  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
      decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(10)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: valueColor)),
        Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textSecond)),
      ]),
    ),
  );
}
EOF

# ─────────────────────────────────────────────────────────────────────────────
# LOG ENTRY CARD WIDGET
# ─────────────────────────────────────────────────────────────────────────────

cat > lib/features/logbook/widgets/log_entry_card.dart << 'EOF'
import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/models/logbook_model.dart';
import 'dual_review_badge.dart';

class LogEntryCard extends StatelessWidget {
  final LogEntry entry;
  const LogEntryCard({super.key, required this.entry});

  @override
  Widget build(BuildContext context) {
    final e = entry;
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: e.isDraft
            ? AppColors.warning.withOpacity(0.4)
            : e.isSynced ? AppColors.border : AppColors.warning.withOpacity(0.3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Top bar ────────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Type pill
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: e.type == EntryType.weekly ? AppColors.tealLight : AppColors.infoBg,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    e.type == EntryType.weekly ? '📋 Weekly' : '📝 Daily',
                    style: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w600,
                      color: e.type == EntryType.weekly ? AppColors.teal : AppColors.info,
                    ),
                  ),
                ),
                const Spacer(),
                // Sync status
                if (!e.isSynced)
                  const Padding(
                    padding: EdgeInsets.only(right: 6),
                    child: Icon(Icons.cloud_off, size: 13, color: AppColors.warning),
                  ),
                Text(e.date, style: const TextStyle(fontSize: 10, color: AppColors.textSecond)),
              ],
            ),
          ),

          // ── Title + summary ────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(e.title,
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppColors.navy)),
              const SizedBox(height: 4),
              Text(e.summary,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 12, color: AppColors.textSecond, height: 1.4)),
            ]),
          ),

          const SizedBox(height: 10),

          // ── Divider ────────────────────────────────────────────────────
          const Divider(height: 1, color: AppColors.border),

          // ── Dual review status ─────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 8, 14, 10),
            child: Row(
              children: [
                DualReviewBadge(
                  label: 'Employer',
                  status: e.employerStatus,
                ),
                const SizedBox(width: 8),
                DualReviewBadge(
                  label: 'Institution',
                  status: e.institutionStatus,
                ),
                const Spacer(),
                if (e.employerComment != null)
                  const Icon(Icons.chat_bubble_outline, size: 13, color: AppColors.textSecond),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
EOF

# ─────────────────────────────────────────────────────────────────────────────
# DUAL REVIEW BADGE WIDGET
# ─────────────────────────────────────────────────────────────────────────────

cat > lib/features/logbook/widgets/dual_review_badge.dart << 'EOF'
import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/models/logbook_model.dart';

class DualReviewBadge extends StatelessWidget {
  final String label;
  final ReviewStatus status;

  const DualReviewBadge({super.key, required this.label, required this.status});

  @override
  Widget build(BuildContext context) {
    final (bg, fg, icon, text) = switch (status) {
      ReviewStatus.approved => (AppColors.greenLight, AppColors.green, Icons.check_circle, 'Approved'),
      ReviewStatus.rejected => (AppColors.errorBg, AppColors.error, Icons.cancel, 'Rejected'),
      ReviewStatus.pending  => (AppColors.warningBg, AppColors.warning, Icons.hourglass_empty, 'Pending'),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 11, color: fg),
        const SizedBox(width: 4),
        Text('$label: $text',
          style: TextStyle(fontSize: 10, color: fg, fontWeight: FontWeight.w600)),
      ]),
    );
  }
}
EOF

# ─────────────────────────────────────────────────────────────────────────────
# LOG ENTRY FORM SCREEN
# ─────────────────────────────────────────────────────────────────────────────

cat > lib/features/logbook/screens/log_entry_screen.dart << 'EOF'
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/constants/app_routes.dart';

class LogEntryScreen extends StatefulWidget {
  const LogEntryScreen({super.key});

  @override
  State<LogEntryScreen> createState() => _LogEntryScreenState();
}

class _LogEntryScreenState extends State<LogEntryScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _summaryCtrl = TextEditingController();
  final _taskCtrl = TextEditingController();
  final List<String> _tasks = [];
  String _entryType = 'Daily';
  bool _isSaving = false;
  bool _isOfflineSaved = false;
  int _moodRating = 3;

  final _entryTypes = ['Daily', 'Weekly', 'Milestone'];
  final _moodLabels = ['😞', '😐', '🙂', '😊', '🤩'];

  void _addTask() {
    if (_taskCtrl.text.trim().isEmpty) return;
    setState(() {
      _tasks.add(_taskCtrl.text.trim());
      _taskCtrl.clear();
    });
  }

  void _removeTask(int i) => setState(() => _tasks.removeAt(i));

  Future<void> _saveEntry({bool draft = false}) async {
    if (!draft && !(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _isSaving = true);
    await Future.delayed(const Duration(milliseconds: 800));
    setState(() {
      _isSaving = false;
      _isOfflineSaved = true;
    });
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(draft
        ? '📝 Draft saved offline — will sync when connected'
        : '✓ Entry submitted for supervisor review'),
      backgroundColor: draft ? AppColors.warning : AppColors.green,
    ));
    if (!draft) context.go(AppRoutes.logbook);
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _summaryCtrl.dispose();
    _taskCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('New Log Entry'),
        actions: [
          TextButton(
            onPressed: () => _saveEntry(draft: true),
            child: const Text('Save Draft', style: TextStyle(color: Colors.white70, fontSize: 13)),
          ),
        ],
      ),

      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [

            // ── Offline indicator ─────────────────────────────────────────
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.tealLight,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.teal.withOpacity(0.3)),
              ),
              child: Row(children: [
                Icon(
                  _isOfflineSaved ? Icons.cloud_done : Icons.cloud_queue,
                  size: 14,
                  color: _isOfflineSaved ? AppColors.green : AppColors.teal,
                ),
                const SizedBox(width: 8),
                Text(
                  _isOfflineSaved
                    ? 'Draft saved offline'
                    : 'Drafts save offline — no connectivity needed',
                  style: const TextStyle(fontSize: 11, color: AppColors.teal, fontWeight: FontWeight.w500),
                ),
              ]),
            ),

            const SizedBox(height: 20),

            // ── Entry type selector ───────────────────────────────────────
            _SectionLabel('Entry Type'),
            const SizedBox(height: 8),
            Row(children: _entryTypes.map((t) {
              final active = t == _entryType;
              return Expanded(child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 3),
                child: GestureDetector(
                  onTap: () => setState(() => _entryType = t),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: active ? AppColors.teal : Colors.white,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: active ? AppColors.teal : AppColors.border),
                    ),
                    child: Center(child: Text(t,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: active ? Colors.white : AppColors.textSecond,
                      ))),
                  ),
                ),
              ));
            }).toList()),

            const SizedBox(height: 20),

            // ── Title ─────────────────────────────────────────────────────
            _SectionLabel('Entry Title'),
            const SizedBox(height: 8),
            TextFormField(
              controller: _titleCtrl,
              decoration: const InputDecoration(
                hintText: 'e.g. Wireframe review and Figma handoff',
              ),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Please enter a title' : null,
            ),

            const SizedBox(height: 16),

            // ── Summary ───────────────────────────────────────────────────
            _SectionLabel('Summary of Work Done'),
            const SizedBox(height: 8),
            TextFormField(
              controller: _summaryCtrl,
              maxLines: 4,
              decoration: const InputDecoration(
                hintText: 'Describe what you worked on today...',
                alignLabelWithHint: true,
              ),
              validator: (v) => (v == null || v.trim().length < 20)
                ? 'Please write at least 20 characters' : null,
            ),

            const SizedBox(height: 16),

            // ── Tasks checklist ───────────────────────────────────────────
            _SectionLabel('Tasks Completed'),
            const SizedBox(height: 8),

            ..._tasks.asMap().entries.map((e) => Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: AppColors.greenLight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(children: [
                  const Icon(Icons.check_circle, color: AppColors.green, size: 16),
                  const SizedBox(width: 10),
                  Expanded(child: Text(e.value, style: const TextStyle(fontSize: 13))),
                  GestureDetector(
                    onTap: () => _removeTask(e.key),
                    child: const Icon(Icons.close, size: 14, color: AppColors.textSecond),
                  ),
                ]),
              ),
            )),

            // Add task input
            Row(children: [
              Expanded(child: TextField(
                controller: _taskCtrl,
                onSubmitted: (_) => _addTask(),
                decoration: const InputDecoration(hintText: 'Add a task...'),
              )),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: _addTask,
                child: Container(
                  width: 44, height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.teal,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.add, color: Colors.white),
                ),
              ),
            ]),

            const SizedBox(height: 20),

            // ── Evidence upload ───────────────────────────────────────────
            _SectionLabel('Evidence (Optional)'),
            const SizedBox(height: 8),
            Container(
              height: 90,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.border, style: BorderStyle.solid),
              ),
              child: Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                const Icon(Icons.upload_file, color: AppColors.textHint, size: 24),
                const SizedBox(height: 4),
                const Text('Tap to upload photos or files',
                  style: TextStyle(fontSize: 12, color: AppColors.textSecond)),
                const Text('JPG, PNG, PDF up to 5MB',
                  style: TextStyle(fontSize: 10, color: AppColors.textHint)),
              ])),
            ),

            const SizedBox(height: 20),

            // ── Mood rating ───────────────────────────────────────────────
            _SectionLabel('How was your day?'),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: List.generate(5, (i) => GestureDetector(
                onTap: () => setState(() => _moodRating = i + 1),
                child: AnimatedScale(
                  scale: _moodRating == i + 1 ? 1.3 : 1.0,
                  duration: const Duration(milliseconds: 150),
                  child: Text(_moodLabels[i], style: const TextStyle(fontSize: 28)),
                ),
              )),
            ),

            const SizedBox(height: 32),

            // ── Submit ────────────────────────────────────────────────────
            ElevatedButton.icon(
              onPressed: _isSaving ? null : () => _saveEntry(),
              icon: _isSaving
                ? const SizedBox(width: 16, height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.send, size: 18),
              label: Text(_isSaving ? 'Submitting...' : 'Submit for Review'),
            ),

            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: () => _saveEntry(draft: true),
              icon: const Icon(Icons.save_outlined, size: 16),
              label: const Text('Save as Draft'),
            ),

            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);

  @override
  Widget build(BuildContext context) => Text(text,
    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.navy));
}
EOF

# ─────────────────────────────────────────────────────────────────────────────
# INCIDENT REPORT SCREEN
# ─────────────────────────────────────────────────────────────────────────────

cat > lib/features/logbook/screens/incident_report_screen.dart << 'EOF'
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/constants/app_routes.dart';

class IncidentReportScreen extends StatefulWidget {
  const IncidentReportScreen({super.key});

  @override
  State<IncidentReportScreen> createState() => _IncidentReportScreenState();
}

class _IncidentReportScreenState extends State<IncidentReportScreen> {
  final _formKey = GlobalKey<FormState>();
  final _descriptionCtrl = TextEditingController();
  final _actionCtrl = TextEditingController();
  String _severity = 'Low';
  String _category = 'Work Environment';
  bool _anonymous = false;
  bool _submitted = false;

  final _severities = ['Low', 'Medium', 'High', 'Critical'];
  final _categories = [
    'Work Environment',
    'Supervisor Conduct',
    'Discrimination / Harassment',
    'Safety Concern',
    'Workload / Role Mismatch',
    'Other',
  ];

  Color _severityColor(String s) => switch (s) {
    'Low'      => AppColors.green,
    'Medium'   => AppColors.warning,
    'High'     => const Color(0xFFEF4444),
    'Critical' => const Color(0xFF7F1D1D),
    _          => AppColors.textSecond,
  };

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    await Future.delayed(const Duration(milliseconds: 800));
    setState(() => _submitted = true);
  }

  @override
  void dispose() {
    _descriptionCtrl.dispose();
    _actionCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_submitted) return _SuccessView();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Report an Issue'),
        backgroundColor: AppColors.error,
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [

            // ── Confidentiality notice ────────────────────────────────────
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.errorBg,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.error.withOpacity(0.3)),
              ),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Icon(Icons.shield, color: AppColors.error, size: 18),
                const SizedBox(width: 10),
                const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Confidential & Secure',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppColors.error)),
                  SizedBox(height: 4),
                  Text(
                    'Your report is encrypted and shared only with your institution\'s designated coordinator. You may submit anonymously.',
                    style: TextStyle(fontSize: 11, color: AppColors.error, height: 1.4),
                  ),
                ])),
              ]),
            ),

            const SizedBox(height: 20),

            // ── Category ──────────────────────────────────────────────────
            _Label('Category'),
            const SizedBox(height: 8),
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.border),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _category,
                  isExpanded: true,
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  borderRadius: BorderRadius.circular(10),
                  onChanged: (v) => setState(() => _category = v!),
                  items: _categories.map((c) => DropdownMenuItem(
                    value: c,
                    child: Text(c, style: const TextStyle(fontSize: 13)),
                  )).toList(),
                ),
              ),
            ),

            const SizedBox(height: 16),

            // ── Severity ──────────────────────────────────────────────────
            _Label('Severity'),
            const SizedBox(height: 8),
            Row(children: _severities.map((s) {
              final active = s == _severity;
              final color = _severityColor(s);
              return Expanded(child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 3),
                child: GestureDetector(
                  onTap: () => setState(() => _severity = s),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      color: active ? color.withOpacity(0.15) : Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: active ? color : AppColors.border, width: active ? 1.5 : 1),
                    ),
                    child: Center(child: Text(s,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: active ? color : AppColors.textSecond,
                      ))),
                  ),
                ),
              ));
            }).toList()),

            const SizedBox(height: 16),

            // ── Description ───────────────────────────────────────────────
            _Label('Describe the Incident'),
            const SizedBox(height: 8),
            TextFormField(
              controller: _descriptionCtrl,
              maxLines: 5,
              decoration: const InputDecoration(
                hintText: 'Please describe what happened, when, and who was involved...',
                alignLabelWithHint: true,
              ),
              validator: (v) => (v == null || v.trim().length < 30)
                ? 'Please provide more detail (at least 30 characters)' : null,
            ),

            const SizedBox(height: 16),

            // ── Actions taken ─────────────────────────────────────────────
            _Label('Actions Taken So Far (Optional)'),
            const SizedBox(height: 8),
            TextFormField(
              controller: _actionCtrl,
              maxLines: 3,
              decoration: const InputDecoration(
                hintText: 'Have you spoken to anyone? What happened?',
              ),
            ),

            const SizedBox(height: 16),

            // ── Anonymous toggle ──────────────────────────────────────────
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(children: [
                const Icon(Icons.visibility_off_outlined, size: 18, color: AppColors.textSecond),
                const SizedBox(width: 10),
                const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Submit Anonymously',
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                  Text('Your name will not be shared with the coordinator',
                    style: TextStyle(fontSize: 11, color: AppColors.textSecond)),
                ])),
                Switch(
                  value: _anonymous,
                  onChanged: (v) => setState(() => _anonymous = v),
                  activeColor: AppColors.teal,
                ),
              ]),
            ),

            const SizedBox(height: 24),

            // ── Submit ────────────────────────────────────────────────────
            ElevatedButton.icon(
              onPressed: _submit,
              icon: const Icon(Icons.send, size: 18),
              label: Text(_anonymous ? 'Submit Anonymously' : 'Submit Report'),
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            ),

            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

class _Label extends StatelessWidget {
  final String text;
  const _Label(this.text);

  @override
  Widget build(BuildContext context) => Text(text,
    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.navy));
}

class _SuccessView extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              Container(
                width: 80, height: 80,
                decoration: BoxDecoration(
                  color: AppColors.greenLight,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.shield_outlined, color: AppColors.green, size: 40),
              ),
              const SizedBox(height: 24),
              const Text('Report Submitted',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.navy)),
              const SizedBox(height: 10),
              const Text(
                'Your report has been securely submitted. Your institution\'s coordinator will review it within 48 hours.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: AppColors.textSecond, height: 1.6),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: AppColors.tealLight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text('Reference #INC-2025-0412',
                  style: TextStyle(fontSize: 12, color: AppColors.teal, fontWeight: FontWeight.w600)),
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Back to Logbook'),
              ),
            ]),
          ),
        ),
      ),
    );
  }
}
EOF

echo ""
echo "✅ Logbook feature implemented!"
echo ""
echo "Files written:"
echo "  lib/shared/models/logbook_model.dart"
echo "  lib/features/logbook/screens/logbook_screen.dart"
echo "  lib/features/logbook/screens/log_entry_screen.dart"
echo "  lib/features/logbook/screens/incident_report_screen.dart"
echo "  lib/features/logbook/widgets/log_entry_card.dart"
echo "  lib/features/logbook/widgets/dual_review_badge.dart"
echo ""
echo "▶️  flutter run"