#!/bin/bash
# EduLink — Vault & Profile Feature Implementation
# Run from INSIDE your edulink_app/ directory:
#   chmod +x ../implement_vault_profile.sh && ../implement_vault_profile.sh

set -e
echo "🏆 Implementing Vault & Profile features..."

mkdir -p lib/features/vault/screens
mkdir -p lib/features/vault/widgets
mkdir -p lib/features/profile/screens
mkdir -p lib/features/profile/widgets
mkdir -p lib/shared/models

# ─────────────────────────────────────────────────────────────────────────────
# VAULT MODEL
# ─────────────────────────────────────────────────────────────────────────────

cat > lib/shared/models/vault_model.dart << 'EOF'
enum CertificateStatus { unlocked, locked, pending }
enum CertificateType { completion, performance, participation, recognition }

class Certificate {
  final String id;
  final String title;
  final String issuer;
  final String issuedDate;
  final CertificateType type;
  final CertificateStatus status;
  final String? description;
  final int? grade;        // 0–100 for performance certs
  final String? fileUrl;

  const Certificate({
    required this.id,
    required this.title,
    required this.issuer,
    required this.issuedDate,
    required this.type,
    required this.status,
    this.description,
    this.grade,
    this.fileUrl,
  });
}

final sampleCertificates = [
  const Certificate(
    id: 'c1',
    title: 'Internship Completion Certificate',
    issuer: 'KCB Group · EduLink KE',
    issuedDate: 'Mar 2025',
    type: CertificateType.completion,
    status: CertificateStatus.unlocked,
    description: 'Awarded upon successful completion of a 3-month UX Design internship at KCB Group.',
    grade: null,
  ),
  const Certificate(
    id: 'c2',
    title: 'Performance Excellence Report',
    issuer: 'KCB Group · Supervisor: J. Kamau',
    issuedDate: 'Mar 2025',
    type: CertificateType.performance,
    status: CertificateStatus.unlocked,
    description: 'Supervisor-rated performance report covering technical skills, communication, and professionalism.',
    grade: 88,
  ),
  const Certificate(
    id: 'c3',
    title: 'EduLink Verified Talent Badge',
    issuer: 'EduLink KE · JKUAT',
    issuedDate: 'Feb 2025',
    type: CertificateType.recognition,
    status: CertificateStatus.unlocked,
    description: 'Awarded to students who complete institution verification and maintain a trust score above 80%.',
    grade: null,
  ),
  const Certificate(
    id: 'c4',
    title: 'Safaricom Innovation Challenge',
    issuer: 'Safaricom PLC',
    issuedDate: 'Pending completion',
    type: CertificateType.participation,
    status: CertificateStatus.pending,
    description: 'Certificate awarded upon completing the Safaricom UX Design internship program.',
    grade: null,
  ),
  const Certificate(
    id: 'c5',
    title: 'Advanced Data Analytics',
    issuer: 'EduLink Learning · Coursera',
    issuedDate: 'Complete the course to unlock',
    type: CertificateType.completion,
    status: CertificateStatus.locked,
    description: 'Complete the recommended Data Analytics learning path to unlock this credential.',
    grade: null,
  ),
];
EOF

# ─────────────────────────────────────────────────────────────────────────────
# VAULT SCREEN
# ─────────────────────────────────────────────────────────────────────────────

cat > lib/features/vault/screens/vault_screen.dart << 'EOF'
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/models/vault_model.dart';
import '../widgets/certificate_card.dart';

class VaultScreen extends StatefulWidget {
  const VaultScreen({super.key});

  @override
  State<VaultScreen> createState() => _VaultScreenState();
}

class _VaultScreenState extends State<VaultScreen> with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  String _filter = 'All';
  final _filters = ['All', 'Unlocked', 'Pending', 'Locked'];

  List<Certificate> get _filtered {
    if (_filter == 'All') return sampleCertificates;
    return sampleCertificates.where((c) => switch (_filter) {
      'Unlocked' => c.status == CertificateStatus.unlocked,
      'Pending'  => c.status == CertificateStatus.pending,
      'Locked'   => c.status == CertificateStatus.locked,
      _          => true,
    }).toList();
  }

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: NestedScrollView(
        headerSliverBuilder: (_, __) => [
          // ── Header ───────────────────────────────────────────────────────
          SliverAppBar(
            pinned: true,
            expandedHeight: 130,
            backgroundColor: AppColors.navy,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                color: AppColors.navy,
                padding: const EdgeInsets.fromLTRB(16, 48, 16, 12),
                child: Row(children: [
                  Expanded(child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Artifact Vault',
                        style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w700)),
                      const Text('Your verified credentials & certificates',
                        style: TextStyle(color: Colors.white60, fontSize: 12)),
                      const SizedBox(height: 10),
                      Row(children: [
                        _HeaderStat(label: 'Credentials', value: '3'),
                        const SizedBox(width: 16),
                        _HeaderStat(label: 'Trust Score', value: '620'),
                        const SizedBox(width: 16),
                        _HeaderStat(label: 'Tier', value: '2'),
                      ]),
                    ],
                  )),
                  // QR preview button
                  GestureDetector(
                    onTap: () => _showQrSheet(context),
                    child: Container(
                      width: 52, height: 52,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.white30),
                      ),
                      child: const Icon(Icons.qr_code_2, color: Colors.white, size: 28),
                    ),
                  ),
                ]),
              ),
            ),
            bottom: TabBar(
              controller: _tabCtrl,
              indicatorColor: AppColors.teal,
              labelColor: Colors.white,
              unselectedLabelColor: Colors.white54,
              labelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
              tabs: const [Tab(text: 'Certificates'), Tab(text: 'Trust QR')],
            ),
          ),
        ],
        body: TabBarView(
          controller: _tabCtrl,
          children: [
            // ── Tab 1: Certificates ────────────────────────────────────────
            _CertificateTab(
              filtered: _filtered,
              filter: _filter,
              filters: _filters,
              onFilterChange: (f) => setState(() => _filter = f),
            ),

            // ── Tab 2: Trust QR ────────────────────────────────────────────
            _TrustQrTab(),
          ],
        ),
      ),
    );
  }

  void _showQrSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(28),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 40, height: 4,
            margin: const EdgeInsets.only(bottom: 20),
            decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2))),
          const Text('Trust QR Code',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.navy)),
          const SizedBox(height: 4),
          const Text('Let employers scan this to verify your profile instantly',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, color: AppColors.textSecond)),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            child: QrImageView(
              data: 'https://edulink.co.ke/verify/jane-wanjiku-2025',
              version: QrVersions.auto,
              size: 180,
              eyeStyle: const QrEyeStyle(
                eyeShape: QrEyeShape.square,
                color: AppColors.navy,
              ),
              dataModuleStyle: const QrDataModuleStyle(
                dataModuleShape: QrDataModuleShape.square,
                color: AppColors.navy,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.tealLight,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              const Icon(Icons.link, size: 14, color: AppColors.teal),
              const SizedBox(width: 6),
              const Text('edulink.co.ke/verify/jane-wanjiku-2025',
                style: TextStyle(fontSize: 11, color: AppColors.teal, fontWeight: FontWeight.w500)),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: () {
                  Clipboard.setData(const ClipboardData(text: 'https://edulink.co.ke/verify/jane-wanjiku-2025'));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Link copied!'), backgroundColor: AppColors.teal));
                },
                child: const Icon(Icons.copy, size: 14, color: AppColors.teal),
              ),
            ]),
          ),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: () {},
            icon: const Icon(Icons.share, size: 16),
            label: const Text('Share Profile Link'),
          ),
          const SizedBox(height: 12),
        ]),
      ),
    );
  }
}

class _HeaderStat extends StatelessWidget {
  final String label, value;
  const _HeaderStat({required this.label, required this.value});

  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text(value, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w700)),
    Text(label, style: const TextStyle(color: Colors.white54, fontSize: 9)),
  ]);
}

// ── Certificate Tab ──────────────────────────────────────────────────────────

class _CertificateTab extends StatelessWidget {
  final List<Certificate> filtered;
  final String filter;
  final List<String> filters;
  final ValueChanged<String> onFilterChange;

  const _CertificateTab({
    required this.filtered,
    required this.filter,
    required this.filters,
    required this.onFilterChange,
  });

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      slivers: [
        // Filter chips
        SliverToBoxAdapter(
          child: SizedBox(
            height: 48,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              itemCount: filters.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (_, i) {
                final f = filters[i];
                final active = f == filter;
                return GestureDetector(
                  onTap: () => onFilterChange(f),
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
                        fontSize: 12, fontWeight: FontWeight.w500,
                        color: active ? Colors.white : AppColors.textSecond,
                      )),
                  ),
                );
              },
            ),
          ),
        ),

        // Certificate list
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
          sliver: SliverList(
            delegate: SliverChildBuilderDelegate(
              (ctx, i) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: CertificateCard(certificate: filtered[i]),
              ),
              childCount: filtered.length,
            ),
          ),
        ),
      ],
    );
  }
}

// ── Trust QR Tab ─────────────────────────────────────────────────────────────

class _TrustQrTab extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(children: [
        // QR card
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [AppColors.navy, AppColors.teal],
            ),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(children: [
            const Text('Jane Wanjiku',
              style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700)),
            const Text('JKUAT · Computer Technology',
              style: TextStyle(color: Colors.white70, fontSize: 12)),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
              decoration: BoxDecoration(
                color: AppColors.green.withOpacity(0.25),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.green.withOpacity(0.5)),
              ),
              child: const Text('Tier 2 · Institution Verified',
                style: TextStyle(color: AppColors.green, fontSize: 11, fontWeight: FontWeight.w600)),
            ),
            const SizedBox(height: 20),
            // QR Code
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
              ),
              child: QrImageView(
                data: 'https://edulink.co.ke/verify/jane-wanjiku-2025',
                version: QrVersions.auto,
                size: 160,
                eyeStyle: const QrEyeStyle(eyeShape: QrEyeShape.square, color: AppColors.navy),
                dataModuleStyle: const QrDataModuleStyle(
                  dataModuleShape: QrDataModuleShape.square,
                  color: AppColors.navy,
                ),
              ),
            ),
            const SizedBox(height: 14),
            const Text('Scan to verify this student\'s profile',
              style: TextStyle(color: Colors.white60, fontSize: 11)),
          ]),
        ),

        const SizedBox(height: 16),

        // Trust breakdown
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Trust Breakdown',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppColors.navy)),
            const SizedBox(height: 14),
            _TrustRow(label: 'Document Verified', done: true, points: '+100'),
            _TrustRow(label: 'Institution Verified', done: true, points: '+200'),
            _TrustRow(label: 'Internship Completed', done: false, points: '+200'),
            _TrustRow(label: 'Certified Student', done: false, points: '+120'),
            const Divider(height: 20, color: AppColors.border),
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              const Text('Current Score',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppColors.navy)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.tealLight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text('620 / 1000',
                  style: TextStyle(color: AppColors.teal, fontWeight: FontWeight.w700, fontSize: 12)),
              ),
            ]),
          ]),
        ),

        const SizedBox(height: 16),

        // Share button
        ElevatedButton.icon(
          onPressed: () {},
          icon: const Icon(Icons.share, size: 16),
          label: const Text('Share Trust Profile'),
          style: ElevatedButton.styleFrom(minimumSize: const Size(double.infinity, 48)),
        ),
        const SizedBox(height: 8),
        OutlinedButton.icon(
          onPressed: () {},
          icon: const Icon(Icons.download, size: 16),
          label: const Text('Download QR Card'),
          style: OutlinedButton.styleFrom(minimumSize: const Size(double.infinity, 48)),
        ),
        const SizedBox(height: 32),
      ]),
    );
  }
}

class _TrustRow extends StatelessWidget {
  final String label, points;
  final bool done;
  const _TrustRow({required this.label, required this.done, required this.points});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Row(children: [
      Container(
        width: 22, height: 22,
        decoration: BoxDecoration(
          color: done ? AppColors.teal : AppColors.border,
          shape: BoxShape.circle,
        ),
        child: Icon(done ? Icons.check : Icons.lock_outline,
          size: 12, color: done ? Colors.white : AppColors.textSecond),
      ),
      const SizedBox(width: 10),
      Expanded(child: Text(label,
        style: TextStyle(
          fontSize: 12,
          color: done ? AppColors.navy : AppColors.textSecond,
          fontWeight: done ? FontWeight.w500 : FontWeight.w400,
        ))),
      Text(points,
        style: TextStyle(
          fontSize: 12, fontWeight: FontWeight.w700,
          color: done ? AppColors.green : AppColors.textHint,
        )),
    ]),
  );
}
EOF

# ─────────────────────────────────────────────────────────────────────────────
# CERTIFICATE CARD WIDGET
# ─────────────────────────────────────────────────────────────────────────────

cat > lib/features/vault/widgets/certificate_card.dart << 'EOF'
import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/models/vault_model.dart';

class CertificateCard extends StatelessWidget {
  final Certificate certificate;
  const CertificateCard({super.key, required this.certificate});

  (Color bg, Color fg, IconData icon, String label) _statusStyle(CertificateStatus s) => switch (s) {
    CertificateStatus.unlocked => (AppColors.greenLight,  AppColors.green,       Icons.workspace_premium, 'Unlocked'),
    CertificateStatus.pending  => (AppColors.warningBg,   AppColors.warning,     Icons.hourglass_empty,   'Pending'),
    CertificateStatus.locked   => (const Color(0xFFF3F4F6), AppColors.textSecond, Icons.lock_outline,      'Locked'),
  };

  (Color bg, Color fg, IconData icon) _typeStyle(CertificateType t) => switch (t) {
    CertificateType.completion    => (AppColors.tealLight,  AppColors.teal,   Icons.school),
    CertificateType.performance   => (AppColors.infoBg,     AppColors.info,   Icons.bar_chart),
    CertificateType.participation => (AppColors.warningBg,  AppColors.warning,Icons.emoji_events),
    CertificateType.recognition   => (const Color(0xFFFFF8E1), const Color(0xFFB45309), Icons.star),
  };

  @override
  Widget build(BuildContext context) {
    final c = certificate;
    final (sBg, sFg, sIcon, sLabel) = _statusStyle(c.status);
    final (tBg, tFg, tIcon) = _typeStyle(c.type);
    final isLocked = c.status == CertificateStatus.locked;

    return Opacity(
      opacity: isLocked ? 0.65 : 1.0,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: isLocked ? AppColors.border : sFg.withOpacity(0.3)),
        ),
        child: Column(children: [
          // ── Top strip ─────────────────────────────────────────────────
          Container(
            height: 4,
            decoration: BoxDecoration(
              color: isLocked ? AppColors.border : sFg,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              // ── Header row ─────────────────────────────────────────────
              Row(children: [
                Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(color: tBg, borderRadius: BorderRadius.circular(10)),
                  child: Icon(tIcon, color: tFg, size: 20),
                ),
                const SizedBox(width: 10),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(c.title,
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppColors.navy)),
                  Text(c.issuer,
                    style: const TextStyle(fontSize: 11, color: AppColors.textSecond)),
                ])),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: sBg, borderRadius: BorderRadius.circular(8)),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    Icon(sIcon, size: 11, color: sFg),
                    const SizedBox(width: 4),
                    Text(sLabel, style: TextStyle(fontSize: 10, color: sFg, fontWeight: FontWeight.w600)),
                  ]),
                ),
              ]),

              if (c.description != null) ...[
                const SizedBox(height: 10),
                Text(c.description!,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12, color: AppColors.textSecond, height: 1.4)),
              ],

              // ── Grade bar (performance certs) ──────────────────────────
              if (c.grade != null) ...[
                const SizedBox(height: 10),
                Row(children: [
                  Expanded(child: ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: c.grade! / 100,
                      minHeight: 6,
                      backgroundColor: AppColors.border,
                      valueColor: AlwaysStoppedAnimation(
                        c.grade! >= 80 ? AppColors.green : AppColors.warning),
                    ),
                  )),
                  const SizedBox(width: 10),
                  Text('${c.grade}%',
                    style: TextStyle(
                      fontSize: 12, fontWeight: FontWeight.w700,
                      color: c.grade! >= 80 ? AppColors.green : AppColors.warning,
                    )),
                ]),
              ],

              const SizedBox(height: 10),
              const Divider(height: 1, color: AppColors.border),
              const SizedBox(height: 10),

              // ── Footer ─────────────────────────────────────────────────
              Row(children: [
                const Icon(Icons.calendar_today, size: 11, color: AppColors.textHint),
                const SizedBox(width: 4),
                Text(c.issuedDate,
                  style: const TextStyle(fontSize: 11, color: AppColors.textSecond)),
                const Spacer(),
                if (c.status == CertificateStatus.unlocked) ...[
                  _ActionBtn(
                    icon: Icons.share_outlined,
                    label: 'Share',
                    onTap: () {},
                  ),
                  const SizedBox(width: 8),
                  _ActionBtn(
                    icon: Icons.download_outlined,
                    label: 'Download',
                    onTap: () {},
                    primary: true,
                  ),
                ] else if (c.status == CertificateStatus.pending)
                  const Text('Under review',
                    style: TextStyle(fontSize: 11, color: AppColors.warning, fontWeight: FontWeight.w500))
                else
                  const Text('Complete requirements to unlock',
                    style: TextStyle(fontSize: 11, color: AppColors.textSecond)),
              ]),
            ]),
          ),
        ]),
      ),
    );
  }
}

class _ActionBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool primary;

  const _ActionBtn({required this.icon, required this.label, required this.onTap, this.primary = false});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: primary ? AppColors.teal : AppColors.tealLight,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 12, color: primary ? Colors.white : AppColors.teal),
        const SizedBox(width: 4),
        Text(label, style: TextStyle(
          fontSize: 11, fontWeight: FontWeight.w600,
          color: primary ? Colors.white : AppColors.teal,
        )),
      ]),
    ),
  );
}
EOF

# ─────────────────────────────────────────────────────────────────────────────
# PROFILE MODEL
# ─────────────────────────────────────────────────────────────────────────────

cat > lib/shared/models/profile_model.dart << 'EOF'
class StudentProfile {
  final String name;
  final String email;
  final String phone;
  final String institution;
  final String course;
  final String yearOfStudy;
  final String location;
  final String bio;
  final List<String> skills;
  final int trustScore;
  final int trustTier;
  final int totalApplications;
  final int completedInternships;
  final int certificates;
  final bool isDocVerified;
  final bool isInstitutionVerified;

  const StudentProfile({
    required this.name,
    required this.email,
    required this.phone,
    required this.institution,
    required this.course,
    required this.yearOfStudy,
    required this.location,
    required this.bio,
    required this.skills,
    required this.trustScore,
    required this.trustTier,
    required this.totalApplications,
    required this.completedInternships,
    required this.certificates,
    required this.isDocVerified,
    required this.isInstitutionVerified,
  });
}

final sampleProfile = const StudentProfile(
  name: 'Jane Wanjiku',
  email: 'jane.wanjiku@students.jkuat.ac.ke',
  phone: '+254 712 345 678',
  institution: 'JKUAT',
  course: 'BSc Computer Technology',
  yearOfStudy: 'Year 3',
  location: 'Nairobi, Kenya',
  bio: 'Passionate UI/UX designer and frontend developer with a love for building intuitive, human-centered digital products. Currently interning at KCB Group.',
  skills: ['Figma', 'Flutter', 'React', 'User Research', 'Prototyping', 'HTML/CSS', 'JavaScript', 'Adobe XD'],
  trustScore: 620,
  trustTier: 2,
  totalApplications: 7,
  completedInternships: 1,
  certificates: 3,
  isDocVerified: true,
  isInstitutionVerified: true,
);
EOF

# ─────────────────────────────────────────────────────────────────────────────
# PROFILE SCREEN
# ─────────────────────────────────────────────────────────────────────────────

cat > lib/features/profile/screens/profile_screen.dart << 'EOF'
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/constants/app_routes.dart';
import '../../../shared/models/profile_model.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final p = sampleProfile;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          // ── Header ───────────────────────────────────────────────────────
          SliverAppBar(
            expandedHeight: 200,
            pinned: true,
            backgroundColor: AppColors.navy,
            actions: [
              IconButton(
                icon: const Icon(Icons.edit_outlined, color: Colors.white),
                onPressed: () {},
              ),
              IconButton(
                icon: const Icon(Icons.settings_outlined, color: Colors.white),
                onPressed: () {},
              ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                children: [
                  // Background gradient
                  Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [AppColors.navy, AppColors.teal],
                      ),
                    ),
                  ),
                  // Content
                  SafeArea(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 40, 16, 12),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          // Avatar
                          Stack(children: [
                            Container(
                              width: 72, height: 72,
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.2),
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.white, width: 2),
                              ),
                              child: const Center(
                                child: Text('JW',
                                  style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w700)),
                              ),
                            ),
                            // Verified badge
                            Positioned(bottom: 0, right: 0,
                              child: Container(
                                width: 20, height: 20,
                                decoration: const BoxDecoration(color: AppColors.green, shape: BoxShape.circle),
                                child: const Icon(Icons.verified, size: 13, color: Colors.white),
                              ),
                            ),
                          ]),
                          const SizedBox(width: 14),
                          // Name + details
                          Expanded(child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              Text(p.name,
                                style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700)),
                              Text('${p.course} · ${p.yearOfStudy}',
                                style: const TextStyle(color: Colors.white70, fontSize: 11)),
                              Text(p.institution,
                                style: const TextStyle(color: Colors.white60, fontSize: 11)),
                              const SizedBox(height: 6),
                              // Verification badges
                              Row(children: [
                                if (p.isDocVerified) _VerifyBadge(label: 'Doc ✓'),
                                if (p.isInstitutionVerified) ...[
                                  const SizedBox(width: 6),
                                  _VerifyBadge(label: 'Instit. ✓'),
                                ],
                              ]),
                            ],
                          )),
                          // Trust tier bubble
                          Column(mainAxisAlignment: MainAxisAlignment.end, children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: Colors.white30),
                              ),
                              child: Column(children: [
                                Text('${p.trustScore}',
                                  style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800)),
                                const Text('pts', style: TextStyle(color: Colors.white60, fontSize: 9)),
                                const SizedBox(height: 2),
                                const Text('Tier 2', style: TextStyle(color: AppColors.green, fontSize: 9, fontWeight: FontWeight.w600)),
                              ]),
                            ),
                          ]),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          SliverPadding(
            padding: const EdgeInsets.all(16),
            sliver: SliverList(
              delegate: SliverChildListDelegate([

                // ── Stats row ───────────────────────────────────────────────
                Row(children: [
                  _StatCard(value: '${p.totalApplications}', label: 'Applications'),
                  const SizedBox(width: 8),
                  _StatCard(value: '${p.completedInternships}', label: 'Internships'),
                  const SizedBox(width: 8),
                  _StatCard(value: '${p.certificates}', label: 'Certificates'),
                ]),

                const SizedBox(height: 16),

                // ── Bio ─────────────────────────────────────────────────────
                _Section(
                  title: 'About',
                  child: Text(p.bio,
                    style: const TextStyle(fontSize: 13, color: AppColors.textSecond, height: 1.6)),
                ),

                const SizedBox(height: 14),

                // ── Skills ──────────────────────────────────────────────────
                _Section(
                  title: 'Skills',
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: p.skills.map((s) => Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                      decoration: BoxDecoration(
                        color: AppColors.tealLight,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.teal.withOpacity(0.3)),
                      ),
                      child: Text(s,
                        style: const TextStyle(fontSize: 12, color: AppColors.teal, fontWeight: FontWeight.w500)),
                    )).toList(),
                  ),
                ),

                const SizedBox(height: 14),

                // ── Contact ─────────────────────────────────────────────────
                _Section(
                  title: 'Contact',
                  child: Column(children: [
                    _InfoRow(icon: Icons.email_outlined,    value: p.email),
                    const SizedBox(height: 8),
                    _InfoRow(icon: Icons.phone_outlined,    value: p.phone),
                    const SizedBox(height: 8),
                    _InfoRow(icon: Icons.location_on_outlined, value: p.location),
                  ]),
                ),

                const SizedBox(height: 14),

                // ── Quick links ─────────────────────────────────────────────
                _Section(
                  title: 'My Activity',
                  child: Column(children: [
                    _NavRow(
                      icon: Icons.book_outlined,
                      label: 'Logbook Entries',
                      value: '${sampleProfile.completedInternships * 12} entries',
                      onTap: () => context.go(AppRoutes.logbook),
                    ),
                    const Divider(height: 16, color: AppColors.border),
                    _NavRow(
                      icon: Icons.workspace_premium_outlined,
                      label: 'Certificates',
                      value: '${p.certificates} earned',
                      onTap: () => context.go(AppRoutes.vault),
                    ),
                    const Divider(height: 16, color: AppColors.border),
                    _NavRow(
                      icon: Icons.search_outlined,
                      label: 'Applications',
                      value: '${p.totalApplications} sent',
                      onTap: () => context.go(AppRoutes.explore),
                    ),
                  ]),
                ),

                const SizedBox(height: 14),

                // ── Trust ladder ────────────────────────────────────────────
                _Section(
                  title: 'Trust Journey',
                  child: Column(children: [
                    _TrustStep(label: 'Document Verified', done: p.isDocVerified, points: '+100 pts'),
                    _TrustStep(label: 'Institution Verified', done: p.isInstitutionVerified, points: '+200 pts'),
                    _TrustStep(label: 'Internship Completed', done: p.completedInternships > 0, points: '+200 pts'),
                    _TrustStep(label: 'Certified Student', done: p.certificates >= 1, points: '+120 pts'),
                  ]),
                ),

                const SizedBox(height: 24),

                // ── Sign out ────────────────────────────────────────────────
                OutlinedButton.icon(
                  onPressed: () => context.go(AppRoutes.welcome),
                  icon: const Icon(Icons.logout, size: 16, color: AppColors.error),
                  label: const Text('Sign Out', style: TextStyle(color: AppColors.error)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppColors.error),
                    minimumSize: const Size(double.infinity, 48),
                  ),
                ),

                const SizedBox(height: 32),
              ]),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Reusable widgets ─────────────────────────────────────────────────────────

class _VerifyBadge extends StatelessWidget {
  final String label;
  const _VerifyBadge({required this.label});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
    decoration: BoxDecoration(
      color: AppColors.green.withOpacity(0.2),
      borderRadius: BorderRadius.circular(6),
      border: Border.all(color: AppColors.green.withOpacity(0.4)),
    ),
    child: Text(label, style: const TextStyle(fontSize: 9, color: AppColors.green, fontWeight: FontWeight.w600)),
  );
}

class _StatCard extends StatelessWidget {
  final String value, label;
  const _StatCard({required this.value, required this.label});

  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(children: [
        Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.navy)),
        Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textSecond)),
      ]),
    ),
  );
}

class _Section extends StatelessWidget {
  final String title;
  final Widget child;
  const _Section({required this.title, required this.child});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: AppColors.border),
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppColors.navy)),
      const SizedBox(height: 10),
      child,
    ]),
  );
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String value;
  const _InfoRow({required this.icon, required this.value});

  @override
  Widget build(BuildContext context) => Row(children: [
    Icon(icon, size: 16, color: AppColors.teal),
    const SizedBox(width: 10),
    Expanded(child: Text(value, style: const TextStyle(fontSize: 12, color: AppColors.textSecond))),
  ]);
}

class _NavRow extends StatelessWidget {
  final IconData icon;
  final String label, value;
  final VoidCallback onTap;
  const _NavRow({required this.icon, required this.label, required this.value, required this.onTap});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Row(children: [
      Container(
        width: 32, height: 32,
        decoration: BoxDecoration(color: AppColors.tealLight, borderRadius: BorderRadius.circular(8)),
        child: Icon(icon, size: 16, color: AppColors.teal),
      ),
      const SizedBox(width: 10),
      Expanded(child: Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500))),
      Text(value, style: const TextStyle(fontSize: 11, color: AppColors.textSecond)),
      const SizedBox(width: 4),
      const Icon(Icons.chevron_right, size: 16, color: AppColors.textHint),
    ]),
  );
}

class _TrustStep extends StatelessWidget {
  final String label, points;
  final bool done;
  const _TrustStep({required this.label, required this.done, required this.points});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Row(children: [
      Container(
        width: 22, height: 22,
        decoration: BoxDecoration(
          color: done ? AppColors.teal : AppColors.border,
          shape: BoxShape.circle,
        ),
        child: Icon(done ? Icons.check : Icons.lock_outline,
          size: 12, color: done ? Colors.white : AppColors.textSecond),
      ),
      const SizedBox(width: 10),
      Expanded(child: Text(label,
        style: TextStyle(
          fontSize: 12,
          color: done ? AppColors.navy : AppColors.textSecond,
          fontWeight: done ? FontWeight.w500 : FontWeight.w400,
        ))),
      Text(points, style: TextStyle(
        fontSize: 11, fontWeight: FontWeight.w700,
        color: done ? AppColors.green : AppColors.textHint,
      )),
    ]),
  );
}
EOF

echo ""
echo "✅ Vault & Profile features implemented!"
echo ""
echo "Files written:"
echo "  lib/shared/models/vault_model.dart"
echo "  lib/shared/models/profile_model.dart"
echo "  lib/features/vault/screens/vault_screen.dart"
echo "  lib/features/vault/widgets/certificate_card.dart"
echo "  lib/features/profile/screens/profile_screen.dart"
echo ""
echo "▶️  flutter run"
echo ""
echo "🎉 All EduLink screens are now complete!"
echo ""
echo "Full screen map:"
echo "  ✅ WelcomeScreen      → /                    (auth)"
echo "  ✅ LoginScreen        → /login               (auth)"
echo "  ✅ RegisterScreen     → /register            (auth)"
echo "  ✅ ProfileWizardScreen → /onboarding/profile (onboarding)"
echo "  ✅ DocumentScannerScreen → /onboarding/documents"
echo "  ✅ DashboardScreen    → /home               (main shell)"
echo "  ✅ ExploreScreen      → /explore            (main shell)"
echo "  ✅ OpportunityDetailScreen → /explore/detail"
echo "  ✅ LogbookScreen      → /logbook            (main shell)"
echo "  ✅ LogEntryScreen     → /logbook/entry"
echo "  ✅ IncidentReportScreen → /logbook/incident"
echo "  ✅ VaultScreen        → /vault              (main shell)"
echo "  ✅ ProfileScreen      → /profile            (main shell)"