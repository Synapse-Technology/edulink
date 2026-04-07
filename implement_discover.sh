#!/bin/bash
# EduLink — Discover Feature Implementation
# Run from inside your edulink_app/ directory

set -e
echo "🔍 Implementing Discover feature..."

# ─── MODELS ──────────────────────────────────────────────────────────────────

cat > lib/shared/models/opportunity_model.dart << 'EOF'
class Opportunity {
  final String id;
  final String title;
  final String company;
  final String logoInitial;
  final String logoColor;    // hex
  final String location;
  final String type;         // Remote | On-Site | Hybrid
  final String duration;
  final String level;
  final String salary;
  final int applicants;
  final int matchScore;      // 0–100
  final String closingDate;
  final List<String> tags;
  final String description;
  final List<String> responsibilities;
  final List<String> requirements;
  final bool isVerified;
  final bool isBookmarked;

  const Opportunity({
    required this.id,
    required this.title,
    required this.company,
    required this.logoInitial,
    required this.logoColor,
    required this.location,
    required this.type,
    required this.duration,
    required this.level,
    required this.salary,
    required this.applicants,
    required this.matchScore,
    required this.closingDate,
    required this.tags,
    required this.description,
    required this.responsibilities,
    required this.requirements,
    this.isVerified = true,
    this.isBookmarked = false,
  });
}

// ── Sample data (replace with API calls later) ──
final sampleOpportunities = [
  const Opportunity(
    id: '1',
    title: 'UX/UI Design Intern',
    company: 'Safaricom PLC',
    logoInitial: 'S',
    logoColor: '#2563EB',
    location: 'Nairobi, Kenya',
    type: 'Remote',
    duration: '3 Months',
    level: 'Undergraduate',
    salary: 'KSh 15k–25k/mo',
    applicants: 48,
    matchScore: 87,
    closingDate: 'Apr 30',
    tags: ['Remote', '3 Months', 'Nairobi', 'Design'],
    description:
        'Join Safaricom\'s Design team to work on M-Pesa and consumer apps. You\'ll collaborate with PMs, engineers, and researchers to create impactful user experiences that serve millions of Kenyans.',
    responsibilities: [
      'Design wireframes and interactive prototypes',
      'Conduct user research and usability testing sessions',
      'Create and maintain the Safaricom design system',
      'Present design work to cross-functional stakeholders',
      'Iterate on designs based on user feedback and data',
    ],
    requirements: [
      'Pursuing a degree in Design, HCI, or related field',
      'Proficiency in Figma or Adobe XD',
      'Strong portfolio demonstrating UI/UX projects',
      'Excellent communication and presentation skills',
    ],
  ),
  const Opportunity(
    id: '2',
    title: 'Software Engineering Intern',
    company: 'KCB Group',
    logoInitial: 'K',
    logoColor: '#D97706',
    location: 'Nairobi CBD',
    type: 'On-Site',
    duration: '6 Months',
    level: 'Undergraduate',
    salary: 'KSh 20k–35k/mo',
    applicants: 122,
    matchScore: 74,
    closingDate: 'May 15',
    tags: ['On-Site', '6 Months', 'CBD', 'Engineering'],
    description:
        'KCB Group is Kenya\'s largest bank by assets. As a Software Engineering Intern, you\'ll work alongside senior engineers building robust fintech solutions that power banking for millions.',
    responsibilities: [
      'Develop and maintain backend APIs using Java/Spring Boot',
      'Write clean, testable, well-documented code',
      'Participate in code reviews and agile ceremonies',
      'Debug and fix production issues under supervision',
    ],
    requirements: [
      'Pursuing BSc in Computer Science, IT, or related field',
      'Knowledge of Java, Python, or similar languages',
      'Understanding of REST APIs and databases',
      'Strong problem-solving skills',
    ],
  ),
  const Opportunity(
    id: '3',
    title: 'Data Analyst Intern',
    company: 'Equity Bank',
    logoInitial: 'E',
    logoColor: '#7C3AED',
    location: 'Nairobi, Kenya',
    type: 'Hybrid',
    duration: '4 Months',
    level: 'Undergraduate',
    salary: 'KSh 18k/mo',
    applicants: 67,
    matchScore: 65,
    closingDate: 'Apr 25',
    tags: ['Hybrid', '4 Months', 'Data', 'Finance'],
    description:
        'Equity Bank\'s Data & Analytics team is looking for a curious, analytically-minded intern to help derive insights from banking data and support data-driven decision making.',
    responsibilities: [
      'Clean and analyze large datasets using Python/SQL',
      'Build dashboards and visualizations in Power BI',
      'Support the team with ad hoc reporting requests',
      'Document data processes and findings',
    ],
    requirements: [
      'Pursuing a degree in Statistics, Data Science, or related field',
      'Proficiency in Python, R, or SQL',
      'Familiarity with data visualization tools',
      'Analytical mindset with attention to detail',
    ],
  ),
  const Opportunity(
    id: '4',
    title: 'Mobile Developer Intern',
    company: 'Cellulant',
    logoInitial: 'C',
    logoColor: '#059669',
    location: 'Westlands, Nairobi',
    type: 'On-Site',
    duration: '3 Months',
    level: 'Graduate',
    salary: 'KSh 25k–40k/mo',
    applicants: 31,
    matchScore: 92,
    closingDate: 'May 1',
    tags: ['On-Site', 'Mobile', 'Flutter', 'Graduate'],
    description:
        'Cellulant is Africa\'s largest payments platform. Join the mobile team to build Flutter-based applications that process payments across 35 African countries.',
    responsibilities: [
      'Build and ship features in our Flutter mobile app',
      'Integrate REST APIs and payment SDKs',
      'Write unit and widget tests for your code',
      'Collaborate in daily standups and sprint planning',
    ],
    requirements: [
      'Experience with Flutter/Dart',
      'Understanding of state management (Provider, Riverpod, or BLoC)',
      'Knowledge of mobile app architecture patterns',
      'Passion for fintech and mobile payments',
    ],
  ),
  const Opportunity(
    id: '5',
    title: 'Cybersecurity Intern',
    company: 'Safaricom PLC',
    logoInitial: 'S',
    logoColor: '#2563EB',
    location: 'Nairobi, Kenya',
    type: 'Hybrid',
    duration: '6 Months',
    level: 'Graduate',
    salary: 'KSh 30k–45k/mo',
    applicants: 56,
    matchScore: 58,
    closingDate: 'May 20',
    tags: ['Hybrid', 'Security', 'Graduate', '6 Months'],
    description:
        'Join Safaricom\'s Security Operations Center (SOC) to help protect one of Africa\'s most critical digital infrastructure from evolving cyber threats.',
    responsibilities: [
      'Monitor security alerts and investigate incidents',
      'Conduct vulnerability assessments on internal systems',
      'Support penetration testing activities',
      'Document security findings and remediation steps',
    ],
    requirements: [
      'Degree in Cybersecurity, Computer Science, or related',
      'Knowledge of networking fundamentals (TCP/IP, DNS, HTTP)',
      'Familiarity with SIEM tools or Linux CLI',
      'CEH or Security+ certification is a plus',
    ],
  ),
];
EOF

# ─── EXPLORE SCREEN ──────────────────────────────────────────────────────────

cat > lib/features/discover/screens/explore_screen.dart << 'EOF'
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/constants/app_routes.dart';
import '../../../shared/models/opportunity_model.dart';
import '../widgets/opportunity_card.dart';
import '../widgets/filter_chip_row.dart';

class ExploreScreen extends StatefulWidget {
  const ExploreScreen({super.key});

  @override
  State<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends State<ExploreScreen> {
  String _selectedFilter = 'All';
  String _searchQuery = '';
  final _searchController = TextEditingController();

  final _filters = ['All', 'Remote', 'On-Site', 'Hybrid', 'Graduate', 'Tech'];

  List<Opportunity> get _filtered {
    var list = sampleOpportunities;
    if (_selectedFilter != 'All') {
      list = list.where((o) => o.tags.contains(_selectedFilter) || o.type == _selectedFilter || o.level == _selectedFilter).toList();
    }
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      list = list.where((o) =>
        o.title.toLowerCase().contains(q) ||
        o.company.toLowerCase().contains(q) ||
        o.tags.any((t) => t.toLowerCase().contains(q)),
      ).toList();
    }
    return list;
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          // ── Header ──
          SliverAppBar(
            pinned: true,
            expandedHeight: 130,
            backgroundColor: AppColors.navy,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                color: AppColors.navy,
                padding: const EdgeInsets.fromLTRB(16, 48, 16, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Explore',
                      style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w700)),
                    Text('${_filtered.length} verified opportunities',
                      style: const TextStyle(color: Colors.white60, fontSize: 12)),
                    const SizedBox(height: 10),
                    // Search bar
                    Container(
                      height: 38,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: TextField(
                        controller: _searchController,
                        style: const TextStyle(color: Colors.white, fontSize: 13),
                        onChanged: (v) => setState(() => _searchQuery = v),
                        decoration: const InputDecoration(
                          hintText: 'Search roles, companies...',
                          hintStyle: TextStyle(color: Colors.white54, fontSize: 13),
                          prefixIcon: Icon(Icons.search, color: Colors.white54, size: 18),
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.symmetric(vertical: 10),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // ── Filter chips ──
          SliverToBoxAdapter(
            child: FilterChipRow(
              filters: _filters,
              selected: _selectedFilter,
              onSelect: (f) => setState(() => _selectedFilter = f),
            ),
          ),

          // ── Opportunity list ──
          _filtered.isEmpty
            ? SliverFillRemaining(
                child: Center(
                  child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    const Icon(Icons.search_off, size: 48, color: AppColors.textHint),
                    const SizedBox(height: 12),
                    const Text('No opportunities found', style: TextStyle(color: AppColors.textSecond)),
                    TextButton(
                      onPressed: () => setState(() { _selectedFilter = 'All'; _searchQuery = ''; _searchController.clear(); }),
                      child: const Text('Clear filters'),
                    ),
                  ]),
                ),
              )
            : SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (ctx, i) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: OpportunityCard(
                        opportunity: _filtered[i],
                        onTap: () => context.go('${AppRoutes.opportunityDetail}?id=${_filtered[i].id}'),
                      ),
                    ),
                    childCount: _filtered.length,
                  ),
                ),
              ),
        ],
      ),
    );
  }
}
EOF

# ─── FILTER CHIP WIDGET ───────────────────────────────────────────────────────

mkdir -p lib/features/discover/widgets

cat > lib/features/discover/widgets/filter_chip_row.dart << 'EOF'
import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

class FilterChipRow extends StatelessWidget {
  final List<String> filters;
  final String selected;
  final ValueChanged<String> onSelect;

  const FilterChipRow({
    super.key,
    required this.filters,
    required this.selected,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 48,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: filters.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final f = filters[i];
          final isActive = f == selected;
          return GestureDetector(
            onTap: () => onSelect(f),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
              decoration: BoxDecoration(
                color: isActive ? AppColors.teal : Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: isActive ? AppColors.teal : AppColors.border,
                ),
              ),
              child: Text(
                f,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: isActive ? Colors.white : AppColors.textSecond,
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
EOF

# ─── OPPORTUNITY CARD WIDGET ──────────────────────────────────────────────────

cat > lib/features/discover/widgets/opportunity_card.dart << 'EOF'
import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/models/opportunity_model.dart';

class OpportunityCard extends StatelessWidget {
  final Opportunity opportunity;
  final VoidCallback onTap;

  const OpportunityCard({
    super.key,
    required this.opportunity,
    required this.onTap,
  });

  Color _hexColor(String hex) {
    final h = hex.replaceAll('#', '');
    return Color(int.parse('FF$h', radix: 16));
  }

  Color _hexBg(String hex) => _hexColor(hex).withOpacity(0.1);

  @override
  Widget build(BuildContext context) {
    final o = opportunity;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Top row ──
            Row(children: [
              // Logo
              Container(
                width: 40, height: 40,
                decoration: BoxDecoration(
                  color: _hexBg(o.logoColor),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Center(
                  child: Text(o.logoInitial,
                    style: TextStyle(
                      color: _hexColor(o.logoColor),
                      fontWeight: FontWeight.w700,
                      fontSize: 16,
                    )),
                ),
              ),
              const SizedBox(width: 10),
              // Title + company
              Expanded(child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(o.title,
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppColors.navy)),
                  Text(o.company,
                    style: const TextStyle(fontSize: 11, color: AppColors.textSecond)),
                ],
              )),
              // Verified badge
              if (o.isVerified)
                Container(
                  width: 24, height: 24,
                  decoration: const BoxDecoration(color: AppColors.greenLight, shape: BoxShape.circle),
                  child: const Icon(Icons.verified, size: 14, color: AppColors.green),
                ),
            ]),

            const SizedBox(height: 10),

            // ── Tags ──
            Wrap(spacing: 6, runSpacing: 4, children: o.tags.map((t) => Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: AppColors.tealLight,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.teal.withOpacity(0.3)),
              ),
              child: Text(t, style: const TextStyle(fontSize: 10, color: AppColors.teal, fontWeight: FontWeight.w500)),
            )).toList()),

            const SizedBox(height: 10),

            // ── Footer ──
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(o.salary,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: AppColors.navy)),
                Text('${o.location} · Closes ${o.closingDate}',
                  style: const TextStyle(fontSize: 10, color: AppColors.textSecond)),
              ]),
              ElevatedButton(
                onPressed: onTap,
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(0, 32),
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  textStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                ),
                child: const Text('View'),
              ),
            ]),
          ],
        ),
      ),
    );
  }
}
EOF

# ─── OPPORTUNITY DETAIL SCREEN ────────────────────────────────────────────────

cat > lib/features/discover/screens/opportunity_detail_screen.dart << 'EOF'
import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/models/opportunity_model.dart';

class OpportunityDetailScreen extends StatefulWidget {
  final String id;
  const OpportunityDetailScreen({super.key, required this.id});

  @override
  State<OpportunityDetailScreen> createState() => _OpportunityDetailScreenState();
}

class _OpportunityDetailScreenState extends State<OpportunityDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  bool _bookmarked = false;

  Opportunity get _opp =>
    sampleOpportunities.firstWhere((o) => o.id == widget.id, orElse: () => sampleOpportunities.first);

  Color _hexColor(String hex) {
    final h = hex.replaceAll('#', '');
    return Color(int.parse('FF$h', radix: 16));
  }

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final o = _opp;
    final logoColor = _hexColor(o.logoColor);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          // ── App Bar ──
          SliverAppBar(
            pinned: true,
            backgroundColor: AppColors.navy,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back, color: Colors.white),
              onPressed: () => Navigator.of(context).pop(),
            ),
            actions: [
              IconButton(
                icon: Icon(_bookmarked ? Icons.bookmark : Icons.bookmark_border, color: Colors.white),
                onPressed: () => setState(() => _bookmarked = !_bookmarked),
              ),
              IconButton(
                icon: const Icon(Icons.share_outlined, color: Colors.white),
                onPressed: () {},
              ),
            ],
          ),

          // ── Hero card ──
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                padding: const EdgeInsets.all(16),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  // Logo + title
                  Row(children: [
                    Container(
                      width: 48, height: 48,
                      decoration: BoxDecoration(
                        color: logoColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(child: Text(o.logoInitial,
                        style: TextStyle(color: logoColor, fontWeight: FontWeight.w800, fontSize: 20))),
                    ),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(o.title,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: AppColors.navy)),
                      Text(o.company,
                        style: const TextStyle(fontSize: 12, color: AppColors.textSecond)),
                      Row(children: [
                        const Icon(Icons.location_on, size: 11, color: AppColors.textHint),
                        const SizedBox(width: 2),
                        Text(o.location, style: const TextStyle(fontSize: 11, color: AppColors.textSecond)),
                        const SizedBox(width: 6),
                        const Icon(Icons.verified, size: 11, color: AppColors.green),
                        const SizedBox(width: 2),
                        const Text('Verified', style: TextStyle(fontSize: 11, color: AppColors.green)),
                      ]),
                    ])),
                  ]),

                  const SizedBox(height: 14),

                  // Meta grid
                  GridView.count(
                    crossAxisCount: 2,
                    childAspectRatio: 3.2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 6,
                    crossAxisSpacing: 6,
                    children: [
                      _MetaTile(label: 'Salary',    value: o.salary),
                      _MetaTile(label: 'Type',      value: o.type),
                      _MetaTile(label: 'Duration',  value: o.duration),
                      _MetaTile(label: 'Level',     value: o.level),
                    ],
                  ),

                  const SizedBox(height: 12),

                  // Stats row
                  Row(children: [
                    _StatBubble(label: 'Applicants', value: '${o.applicants}',   color: AppColors.infoBg,   textColor: AppColors.info),
                    const SizedBox(width: 8),
                    _StatBubble(label: 'Match',       value: '${o.matchScore}%', color: AppColors.greenLight, textColor: AppColors.green),
                    const SizedBox(width: 8),
                    _StatBubble(label: 'Closes',      value: o.closingDate,      color: AppColors.tealLight,  textColor: AppColors.teal),
                  ]),
                ]),
              ),
            ),
          ),

          // ── Tab bar ──
          SliverPersistentHeader(
            pinned: true,
            delegate: _TabBarDelegate(
              TabBar(
                controller: _tabCtrl,
                labelColor: AppColors.teal,
                unselectedLabelColor: AppColors.textSecond,
                indicatorColor: AppColors.teal,
                indicatorWeight: 2,
                labelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                tabs: const [Tab(text: 'About'), Tab(text: 'Requirements'), Tab(text: 'Company')],
              ),
            ),
          ),

          // ── Tab content ──
          SliverFillRemaining(
            child: TabBarView(
              controller: _tabCtrl,
              children: [
                // About
                _TabBody(children: [
                  _SectionTitle('About this Role'),
                  _BodyText(o.description),
                  const SizedBox(height: 16),
                  _SectionTitle('Key Responsibilities'),
                  ...o.responsibilities.map((r) => _BulletItem(r)),
                ]),
                // Requirements
                _TabBody(children: [
                  _SectionTitle('Requirements'),
                  ...o.requirements.map((r) => _BulletItem(r)),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.tealLight,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.teal.withOpacity(0.3)),
                    ),
                    child: Row(children: [
                      const Icon(Icons.auto_awesome, color: AppColors.teal, size: 16),
                      const SizedBox(width: 8),
                      Expanded(child: Text(
                        'Your AI match score is ${o.matchScore}% for this role.',
                        style: const TextStyle(fontSize: 12, color: AppColors.teal, fontWeight: FontWeight.w500),
                      )),
                    ]),
                  ),
                ]),
                // Company
                _TabBody(children: [
                  _SectionTitle(o.company),
                  _BodyText('Learn more about ${o.company} and their internship culture. Company details will be fetched from the API.'),
                ]),
              ],
            ),
          ),
        ],
      ),

      // ── Sticky Apply button ──
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
          child: ElevatedButton.icon(
            icon: const Icon(Icons.flash_on, size: 18),
            label: const Text('Quick Apply — 1 Tap'),
            style: ElevatedButton.styleFrom(minimumSize: const Size(double.infinity, 50)),
            onPressed: () => _showApplySheet(context),
          ),
        ),
      ),
    );
  }

  void _showApplySheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 40, height: 4, margin: const EdgeInsets.only(bottom: 20),
            decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2))),
          const Icon(Icons.check_circle, color: AppColors.green, size: 48),
          const SizedBox(height: 12),
          Text('Apply to ${_opp.title}?',
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: AppColors.navy)),
          const SizedBox(height: 6),
          const Text('Your verified EduLink profile will be shared with the employer.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.textSecond, fontSize: 13)),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Application submitted! ✓'), backgroundColor: AppColors.green),
              );
            },
            child: const Text('Confirm Application'),
          ),
          const SizedBox(height: 8),
          OutlinedButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        ]),
      ),
    );
  }
}

// ── Helper widgets ────────────────────────────────────────────────────────────

class _MetaTile extends StatelessWidget {
  final String label, value;
  const _MetaTile({required this.label, required this.value});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    decoration: BoxDecoration(color: AppColors.background, borderRadius: BorderRadius.circular(8)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 9, color: AppColors.textSecond)),
      Text(value, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.navy)),
    ]),
  );
}

class _StatBubble extends StatelessWidget {
  final String label, value;
  final Color color, textColor;
  const _StatBubble({required this.label, required this.value, required this.color, required this.textColor});

  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(8)),
      child: Column(children: [
        Text(value, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: textColor)),
        Text(label, style: const TextStyle(fontSize: 9, color: AppColors.textSecond)),
      ]),
    ),
  );
}

class _TabBody extends StatelessWidget {
  final List<Widget> children;
  const _TabBody({required this.children});

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: children),
  );
}

class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle(this.text);

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Text(text, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.navy)),
  );
}

class _BodyText extends StatelessWidget {
  final String text;
  const _BodyText(this.text);

  @override
  Widget build(BuildContext context) => Text(text,
    style: const TextStyle(fontSize: 13, color: AppColors.textSecond, height: 1.6));
}

class _BulletItem extends StatelessWidget {
  final String text;
  const _BulletItem(this.text);

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Padding(
        padding: EdgeInsets.only(top: 5),
        child: Icon(Icons.circle, size: 6, color: AppColors.teal),
      ),
      const SizedBox(width: 10),
      Expanded(child: Text(text, style: const TextStyle(fontSize: 13, color: AppColors.textSecond, height: 1.5))),
    ]),
  );
}

class _TabBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar tabBar;
  const _TabBarDelegate(this.tabBar);

  @override double get minExtent => tabBar.preferredSize.height;
  @override double get maxExtent => tabBar.preferredSize.height;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) =>
    Container(color: Colors.white, child: tabBar);

  @override
  bool shouldRebuild(_TabBarDelegate old) => false;
}
EOF

echo ""
echo "✅ Discover feature done!"
echo ""
echo "Files written:"
echo "  lib/shared/models/opportunity_model.dart"
echo "  lib/features/discover/screens/explore_screen.dart"
echo "  lib/features/discover/screens/opportunity_detail_screen.dart"
echo "  lib/features/discover/widgets/opportunity_card.dart"
echo "  lib/features/discover/widgets/filter_chip_row.dart"
echo ""
echo "▶️  flutter run"