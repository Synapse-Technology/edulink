#!/bin/bash

set -e

echo "🚀 Creating EduLink Flutter project..."

flutter create edulink_app \
  --org ke.co.edulink \
  --project-name edulink_app \
  --platforms android,ios \
  --description "EduLink KE — Verified Internships & Brighter Futures"

cd edulink_app

echo "📁 Creating folder structure..."

mkdir -p \
  lib/core/theme \
  lib/core/services \
  lib/core/utils \
  lib/core/constants \
  lib/core/network \
  lib/features/auth/screens \
  lib/features/auth/widgets \
  lib/features/onboarding/screens \
  lib/features/onboarding/widgets \
  lib/features/dashboard/screens \
  lib/features/dashboard/widgets \
  lib/features/discover/screens \
  lib/features/discover/widgets \
  lib/features/logbook/screens \
  lib/features/logbook/widgets \
  lib/features/vault/screens \
  lib/features/vault/widgets \
  lib/features/profile/screens \
  lib/features/profile/widgets \
  lib/shared/widgets \
  lib/shared/models \
  lib/shared/providers \
  assets/images \
  assets/icons \
  assets/fonts

echo "📦 Writing pubspec.yaml..."

cat > pubspec.yaml << 'EOF'
name: edulink_app
description: EduLink KE — Verified Internships & Brighter Futures for Kenyan Students
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.3.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter

  # Navigation
  go_router: ^13.2.0

  # State Management
  flutter_riverpod: ^2.5.1

  # Networking
  dio: ^5.4.3

  # Local Storage
  shared_preferences: ^2.2.3
  hive_flutter: ^1.1.0
  hive: ^2.2.3

  # UI & Design
  google_fonts: ^6.2.1
  flutter_svg: ^2.0.10+1
  cached_network_image: ^3.3.1
  shimmer: ^3.0.0
  lottie: ^3.1.0

  # Auth & Security
  flutter_secure_storage: ^9.0.0

  # File & Camera
  image_picker: ^1.1.2
  file_picker: ^8.0.3
  permission_handler: ^11.3.1

  # QR Code
  qr_flutter: ^4.1.0
  mobile_scanner: ^5.1.0

  # Push Notifications
  firebase_core: ^3.1.0
  firebase_messaging: ^15.0.0
  flutter_local_notifications: ^17.1.2

  # Connectivity (offline support)
  connectivity_plus: ^6.0.3

  # Utils
  intl: ^0.19.0
  timeago: ^3.6.1
  uuid: ^4.4.0
  url_launcher: ^6.3.0

  cupertino_icons: ^1.0.6

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^4.0.0
  build_runner: ^2.4.9

flutter:
  uses-material-design: true

  assets:
    - assets/images/
    - assets/icons/

  fonts:
    - family: Raleway
      fonts:
        - asset: assets/fonts/Raleway-Regular.ttf
        - asset: assets/fonts/Raleway-Bold.ttf
          weight: 700
        - asset: assets/fonts/Raleway-SemiBold.ttf
          weight: 600
    - family: OpenSans
      fonts:
        - asset: assets/fonts/OpenSans-Regular.ttf
        - asset: assets/fonts/OpenSans-SemiBold.ttf
          weight: 600
EOF

echo "🎨 Writing theme..."

cat > lib/core/theme/app_colors.dart << 'EOF'
import 'package:flutter/material.dart';

class AppColors {
  // Primary Brand
  static const teal        = Color(0xFF1AB8AA);
  static const tealLight   = Color(0xFFE0F7F5);
  static const tealDark    = Color(0xFF0D9488);

  // Success / Verification
  static const green       = Color(0xFF5FCF80);
  static const greenLight  = Color(0xFFE8FFF5);

  // Dark Navy (headers, hero bg)
  static const navy        = Color(0xFF0D2D3A);
  static const navyLight   = Color(0xFF1A3D4E);

  // Neutrals
  static const background  = Color(0xFFF0FAFA);
  static const surface     = Color(0xFFFFFFFF);
  static const border      = Color(0xFFEEEEEE);
  static const textPrimary = Color(0xFF0D2D3A);
  static const textSecond  = Color(0xFF888888);
  static const textHint    = Color(0xFFBBBBBB);

  // Semantic
  static const warning     = Color(0xFFF59E0B);
  static const warningBg   = Color(0xFFFFF8E1);
  static const error       = Color(0xFFDC2626);
  static const errorBg     = Color(0xFFFFF5F5);
  static const infoBg      = Color(0xFFE8F4FF);
  static const info        = Color(0xFF2563EB);

  // Trust Tier colors
  static const tier1       = Color(0xFFBBBBBB);
  static const tier2       = Color(0xFF1AB8AA);
  static const tier3       = Color(0xFF5FCF80);
  static const tier4       = Color(0xFFFFD700);
}
EOF

cat > lib/core/theme/app_theme.dart << 'EOF'
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

class AppTheme {
  static ThemeData get light => ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.teal,
      primary:   AppColors.teal,
      secondary: AppColors.green,
      surface:   AppColors.surface,
      error:     AppColors.error,
    ),
    scaffoldBackgroundColor: AppColors.background,
    textTheme: GoogleFonts.openSansTextTheme().copyWith(
      displayLarge:  GoogleFonts.raleway(fontWeight: FontWeight.w700, fontSize: 28, color: AppColors.textPrimary),
      displayMedium: GoogleFonts.raleway(fontWeight: FontWeight.w700, fontSize: 22, color: AppColors.textPrimary),
      displaySmall:  GoogleFonts.raleway(fontWeight: FontWeight.w600, fontSize: 18, color: AppColors.textPrimary),
      headlineMedium:GoogleFonts.raleway(fontWeight: FontWeight.w700, fontSize: 16, color: AppColors.textPrimary),
      titleLarge:    GoogleFonts.raleway(fontWeight: FontWeight.w600, fontSize: 14, color: AppColors.textPrimary),
      bodyLarge:     GoogleFonts.openSans(fontSize: 14, color: AppColors.textPrimary),
      bodyMedium:    GoogleFonts.openSans(fontSize: 12, color: AppColors.textSecond),
      labelSmall:    GoogleFonts.poppins(fontSize: 10, fontWeight: FontWeight.w500),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.teal,
        foregroundColor: Colors.white,
        minimumSize: const Size(double.infinity, 48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        textStyle: GoogleFonts.poppins(fontWeight: FontWeight.w600, fontSize: 14),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.teal,
        side: const BorderSide(color: AppColors.teal),
        minimumSize: const Size(double.infinity, 48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        textStyle: GoogleFonts.poppins(fontWeight: FontWeight.w600, fontSize: 14),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: AppColors.teal, width: 1.5),
      ),
      hintStyle: GoogleFonts.openSans(color: AppColors.textHint, fontSize: 13),
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: AppColors.navy,
      foregroundColor: Colors.white,
      elevation: 0,
      titleTextStyle: GoogleFonts.raleway(
        fontWeight: FontWeight.w700, fontSize: 16, color: Colors.white,
      ),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: AppColors.surface,
      selectedItemColor: AppColors.teal,
      unselectedItemColor: AppColors.textHint,
      type: BottomNavigationBarType.fixed,
      elevation: 8,
    ),
    cardTheme: CardThemeData(
      color: AppColors.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: AppColors.border),
      ),
    ),
  );
}
EOF

echo "🔗 Writing router..."

cat > lib/core/constants/app_routes.dart << 'EOF'
class AppRoutes {
  // Auth & Onboarding
  static const welcome       = '/';
  static const login         = '/login';
  static const register      = '/register';
  static const profileWizard = '/onboarding/profile';
  static const docScanner    = '/onboarding/documents';
  static const affiliation   = '/onboarding/affiliation';

  // Main Shell
  static const home          = '/home';
  static const explore       = '/explore';
  static const logbook       = '/logbook';
  static const vault         = '/vault';
  static const profile       = '/profile';

  // Sub-screens
  static const opportunityDetail = '/explore/detail';
  static const logEntry          = '/logbook/entry';
  static const incidentReport    = '/logbook/incident';
  static const certDetail        = '/vault/certificate';
  static const trustQr           = '/vault/qr';
  static const notifications     = '/notifications';
  static const successStory      = '/logbook/success-story';
}
EOF

cat > lib/core/constants/app_strings.dart << 'EOF'
class AppStrings {
  static const appName        = 'EduLink KE';
  static const tagline        = 'Verified Internships, Brighter Futures';
  static const description    = 'Connecting Kenyan students to trusted internship and graduate job opportunities.';

  // Auth
  static const getStarted    = 'Get Started';
  static const signIn        = 'Sign In';
  static const signOut       = 'Sign Out';
  static const createAccount = 'Create Account';

  // Nav
  static const navHome       = 'Home';
  static const navExplore    = 'Explore';
  static const navLogbook    = 'Logbook';
  static const navVault      = 'Vault';
  static const navProfile    = 'Profile';

  // Trust Tiers
  static const tier1Label    = 'Document Verified';
  static const tier2Label    = 'Institution Verified';
  static const tier3Label    = 'Internship Completed';
  static const tier4Label    = 'Certified Student';

  // Offline
  static const offlineSaved  = 'Saved offline — will sync when connected';
}
EOF

cat > lib/core/utils/app_router.dart << 'EOF'
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/screens/welcome_screen.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/onboarding/screens/profile_wizard_screen.dart';
import '../../features/onboarding/screens/document_scanner_screen.dart';
import '../../features/dashboard/screens/dashboard_screen.dart';
import '../../features/discover/screens/explore_screen.dart';
import '../../features/discover/screens/opportunity_detail_screen.dart';
import '../../features/logbook/screens/logbook_screen.dart';
import '../../features/logbook/screens/log_entry_screen.dart';
import '../../features/logbook/screens/incident_report_screen.dart';
import '../../features/vault/screens/vault_screen.dart';
import '../../features/profile/screens/profile_screen.dart';
import '../../shared/widgets/main_shell.dart';
import '../constants/app_routes.dart';

final appRouter = GoRouter(
  initialLocation: AppRoutes.welcome,
  routes: [
    // Onboarding
    GoRoute(path: AppRoutes.welcome,       builder: (_, __) => const WelcomeScreen()),
    GoRoute(path: AppRoutes.login,         builder: (_, __) => const LoginScreen()),
    GoRoute(path: AppRoutes.profileWizard, builder: (_, __) => const ProfileWizardScreen()),
    GoRoute(path: AppRoutes.docScanner,    builder: (_, __) => const DocumentScannerScreen()),

    // Main shell with bottom nav
    ShellRoute(
      builder: (_, __, child) => MainShell(child: child),
      routes: [
        GoRoute(path: AppRoutes.home,    builder: (_, __) => const DashboardScreen()),
        GoRoute(path: AppRoutes.explore, builder: (_, __) => const ExploreScreen()),
        GoRoute(
          path: AppRoutes.opportunityDetail,
          builder: (_, state) => OpportunityDetailScreen(id: state.uri.queryParameters['id'] ?? ''),
        ),
        GoRoute(path: AppRoutes.logbook,         builder: (_, __) => const LogbookScreen()),
        GoRoute(path: AppRoutes.logEntry,         builder: (_, __) => const LogEntryScreen()),
        GoRoute(path: AppRoutes.incidentReport,   builder: (_, __) => const IncidentReportScreen()),
        GoRoute(path: AppRoutes.vault,            builder: (_, __) => const VaultScreen()),
        GoRoute(path: AppRoutes.profile,          builder: (_, __) => const ProfileScreen()),
      ],
    ),
  ],
);
EOF

echo "🏗️ Writing main.dart..."

cat > lib/main.dart << 'EOF'
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/theme/app_theme.dart';
import 'core/utils/app_router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ProviderScope(child: EdulinkApp()));
}

class EdulinkApp extends StatelessWidget {
  const EdulinkApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'EduLink KE',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      routerConfig: appRouter,
    );
  }
}
EOF

echo "🧩 Writing shared MainShell (bottom nav)..."

cat > lib/shared/widgets/main_shell.dart << 'EOF'
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/constants/app_routes.dart';
import '../../core/constants/app_strings.dart';

class MainShell extends StatelessWidget {
  final Widget child;
  const MainShell({super.key, required this.child});

  int _locationToIndex(String location) {
    if (location.startsWith(AppRoutes.explore))  return 1;
    if (location.startsWith(AppRoutes.logbook))  return 2;
    if (location.startsWith(AppRoutes.vault))    return 3;
    if (location.startsWith(AppRoutes.profile))  return 4;
    return 0;
  }

  void _onTap(BuildContext context, int index) {
    switch (index) {
      case 0: context.go(AppRoutes.home);    break;
      case 1: context.go(AppRoutes.explore); break;
      case 2: context.go(AppRoutes.logbook); break;
      case 3: context.go(AppRoutes.vault);   break;
      case 4: context.go(AppRoutes.profile); break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.toString();
    final currentIndex = _locationToIndex(location);

    return Scaffold(
      body: child,
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: currentIndex,
        onTap: (i) => _onTap(context, i),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home_outlined),      activeIcon: Icon(Icons.home),          label: AppStrings.navHome),
          BottomNavigationBarItem(icon: Icon(Icons.search_outlined),     activeIcon: Icon(Icons.search),         label: AppStrings.navExplore),
          BottomNavigationBarItem(icon: Icon(Icons.book_outlined),       activeIcon: Icon(Icons.book),           label: AppStrings.navLogbook),
          BottomNavigationBarItem(icon: Icon(Icons.workspace_premium_outlined), activeIcon: Icon(Icons.workspace_premium), label: AppStrings.navVault),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline),      activeIcon: Icon(Icons.person),         label: AppStrings.navProfile),
        ],
      ),
    );
  }
}
EOF

echo "📱 Writing screen stubs..."

# --- AUTH ---
cat > lib/features/auth/screens/welcome_screen.dart << 'EOF'
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/constants/app_routes.dart';
import '../../../core/constants/app_strings.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [AppColors.navy, AppColors.teal],
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                const Spacer(),
                // Logo
                Container(
                  width: 72, height: 72,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: const Center(
                    child: Text('E', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: Colors.white)),
                  ),
                ),
                const SizedBox(height: 20),
                const Text(AppStrings.appName,
                  style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: Colors.white)),
                const SizedBox(height: 8),
                Text(AppStrings.tagline,
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 14, color: Colors.white.withOpacity(0.75))),
                const Spacer(),
                // Feature highlights
                _FeatureTile(icon: Icons.verified, text: 'Every listing screened & verified'),
                const SizedBox(height: 10),
                _FeatureTile(icon: Icons.auto_awesome, text: 'AI-powered smart matching'),
                const SizedBox(height: 10),
                _FeatureTile(icon: Icons.workspace_premium, text: 'Digital certificates upon completion'),
                const Spacer(),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.green),
                  onPressed: () => context.go(AppRoutes.register),
                  child: const Text(AppStrings.getStarted),
                ),
                const SizedBox(height: 12),
                OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: Colors.white54),
                  ),
                  onPressed: () => context.go(AppRoutes.login),
                  child: const Text(AppStrings.signIn),
                ),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _FeatureTile extends StatelessWidget {
  final IconData icon;
  final String text;
  const _FeatureTile({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.12),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(children: [
        Icon(icon, color: AppColors.green, size: 20),
        const SizedBox(width: 12),
        Text(text, style: const TextStyle(color: Colors.white, fontSize: 13)),
      ]),
    );
  }
}
EOF

cat > lib/features/auth/screens/login_screen.dart << 'EOF'
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/constants/app_routes.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Sign In')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Welcome back', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            const Text('Sign in to your EduLink account', style: TextStyle(color: AppColors.textSecond)),
            const SizedBox(height: 32),
            const TextField(decoration: InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.email_outlined))),
            const SizedBox(height: 14),
            const TextField(obscureText: true, decoration: InputDecoration(labelText: 'Password', prefixIcon: Icon(Icons.lock_outline))),
            const SizedBox(height: 24),
            ElevatedButton(onPressed: () => context.go(AppRoutes.home), child: const Text('Sign In')),
            const SizedBox(height: 12),
            Center(
              child: TextButton(
                onPressed: () => context.go(AppRoutes.profileWizard),
                child: const Text("Don't have an account? Register"),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
EOF

# --- ONBOARDING ---
cat > lib/features/onboarding/screens/profile_wizard_screen.dart << 'EOF'
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/constants/app_routes.dart';

class ProfileWizardScreen extends StatefulWidget {
  const ProfileWizardScreen({super.key});
  @override
  State<ProfileWizardScreen> createState() => _ProfileWizardScreenState();
}

class _ProfileWizardScreenState extends State<ProfileWizardScreen> {
  int _step = 0;
  final _steps = ['Personal', 'Institution', 'Skills', 'Documents'];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Step ${_step + 1} of ${_steps.length} · ${_steps[_step]}'),
      ),
      body: Column(
        children: [
          // Progress bar
          LinearProgressIndicator(
            value: (_step + 1) / _steps.length,
            backgroundColor: AppColors.tealLight,
            valueColor: const AlwaysStoppedAnimation(AppColors.teal),
            minHeight: 4,
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Build Your Profile',
                    style: Theme.of(context).textTheme.displaySmall),
                  const SizedBox(height: 8),
                  Text('Complete all steps to get verified and unlock opportunities.',
                    style: Theme.of(context).textTheme.bodyMedium),
                  const SizedBox(height: 28),
                  // TODO: Step-specific form widgets
                  const Placeholder(fallbackHeight: 200),
                  const Spacer(),
                  ElevatedButton(
                    onPressed: () {
                      if (_step < _steps.length - 1) {
                        setState(() => _step++);
                      } else {
                        context.go(AppRoutes.docScanner);
                      }
                    },
                    child: Text(_step < _steps.length - 1 ? 'Continue →' : 'Finish Setup'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
EOF

cat > lib/features/onboarding/screens/document_scanner_screen.dart << 'EOF'
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/constants/app_routes.dart';

class DocumentScannerScreen extends StatelessWidget {
  const DocumentScannerScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Verify Documents')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Upload your documents to get verified.',
              style: Theme.of(context).textTheme.bodyMedium),
            const SizedBox(height: 24),
            _DocTile(label: 'National ID', status: DocumentStatus.verified),
            const SizedBox(height: 10),
            _DocTile(label: 'Admission Letter', status: DocumentStatus.pending),
            const SizedBox(height: 10),
            _DocTile(label: 'CV / Resume', status: DocumentStatus.empty),
            const Spacer(),
            ElevatedButton(
              onPressed: () => context.go(AppRoutes.home),
              child: const Text('Complete Verification'),
            ),
          ],
        ),
      ),
    );
  }
}

enum DocumentStatus { verified, pending, empty }

class _DocTile extends StatelessWidget {
  final String label;
  final DocumentStatus status;
  const _DocTile({required this.label, required this.status});

  @override
  Widget build(BuildContext context) {
    final colors = {
      DocumentStatus.verified: (AppColors.greenLight,  AppColors.green,       Icons.check_circle),
      DocumentStatus.pending:  (AppColors.tealLight,   AppColors.teal,        Icons.upload_file),
      DocumentStatus.empty:    (const Color(0xFFF8F8F8), AppColors.textHint,  Icons.description_outlined),
    };
    final (bg, fg, icon) = colors[status]!;
    final subtitle = {
      DocumentStatus.verified: 'Uploaded & Verified',
      DocumentStatus.pending:  'Tap to upload',
      DocumentStatus.empty:    'Not uploaded',
    }[status]!;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: fg.withOpacity(0.4)),
      ),
      child: Row(children: [
        Icon(icon, color: fg, size: 24),
        const SizedBox(width: 12),
        Expanded(child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            Text(subtitle, style: TextStyle(fontSize: 11, color: fg)),
          ],
        )),
        if (status != DocumentStatus.verified)
          Icon(Icons.chevron_right, color: fg),
      ]),
    );
  }
}
EOF

# --- DASHBOARD ---
cat > lib/features/dashboard/screens/dashboard_screen.dart << 'EOF'
import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          _buildHeader(),
          SliverPadding(
            padding: const EdgeInsets.all(16),
            sliver: SliverList(delegate: SliverChildListDelegate([
              _TrustLadderCard(),
              const SizedBox(height: 14),
              _ReadinessRow(),
              const SizedBox(height: 14),
              _QuickActions(),
              const SizedBox(height: 14),
              _ActivityTimeline(),
            ])),
          ),
        ],
      ),
    );
  }

  SliverAppBar _buildHeader() => SliverAppBar(
    expandedHeight: 110,
    pinned: true,
    backgroundColor: AppColors.navy,
    flexibleSpace: FlexibleSpaceBar(
      background: Container(
        color: AppColors.navy,
        padding: const EdgeInsets.fromLTRB(16, 48, 16, 12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Good morning,', style: TextStyle(color: Colors.white60, fontSize: 12)),
          const Text('Jane Wanjiku ✓', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700)),
        ]),
      ),
    ),
  );
}

class _TrustLadderCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            const Text('Trust Ladder', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
              decoration: BoxDecoration(color: AppColors.greenLight, borderRadius: BorderRadius.circular(10)),
              child: const Text('Tier 2 · 620 pts', style: TextStyle(color: AppColors.green, fontSize: 10, fontWeight: FontWeight.w600)),
            ),
          ]),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: const LinearProgressIndicator(
              value: 0.62,
              minHeight: 8,
              backgroundColor: Color(0xFFEEEEEE),
              valueColor: AlwaysStoppedAnimation(AppColors.teal),
            ),
          ),
          const SizedBox(height: 12),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            _TrustStep('Doc', true, true),
            _TrustStep('Instit.', true, true),
            _TrustStep('Intern', false, true),
            _TrustStep('Certified', false, false),
          ]),
        ]),
      ),
    );
  }
}

class _TrustStep extends StatelessWidget {
  final String label;
  final bool done;
  final bool active;
  const _TrustStep(this.label, this.done, this.active);

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      Container(
        width: 22, height: 22,
        decoration: BoxDecoration(
          color: done ? AppColors.teal : (active ? Colors.white : const Color(0xFFE0E0E0)),
          border: active && !done ? Border.all(color: AppColors.teal, width: 2) : null,
          shape: BoxShape.circle,
        ),
        child: done ? const Icon(Icons.check, size: 12, color: Colors.white) : null,
      ),
      const SizedBox(height: 4),
      Text(label, style: const TextStyle(fontSize: 9, color: AppColors.textSecond)),
    ]);
  }
}

class _ReadinessRow extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Expanded(
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(children: [
              const Text('Readiness', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Stack(alignment: Alignment.center, children: [
                SizedBox(
                  width: 52, height: 52,
                  child: CircularProgressIndicator(value: 0.78, strokeWidth: 5,
                    backgroundColor: AppColors.tealLight,
                    valueColor: const AlwaysStoppedAnimation(AppColors.teal)),
                ),
                const Text('78%', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.teal)),
              ]),
            ]),
          ),
        ),
      ),
      const SizedBox(width: 10),
      Expanded(
        flex: 2,
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Active Internship', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              const Text('KCB Group · IT Dept', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.navy)),
              const Text('Week 3 of 12', style: TextStyle(fontSize: 10, color: AppColors.textSecond)),
              const SizedBox(height: 6),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: const LinearProgressIndicator(value: 0.25, minHeight: 4,
                  backgroundColor: Color(0xFFEEEEEE),
                  valueColor: AlwaysStoppedAnimation(AppColors.teal)),
              ),
              const SizedBox(height: 4),
              const Text('Log today\'s entry →', style: TextStyle(fontSize: 10, color: AppColors.teal, fontWeight: FontWeight.w600)),
            ]),
          ),
        ),
      ),
    ]);
  }
}

class _QuickActions extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final actions = [
      (Icons.book,         'Logbook',      AppColors.tealLight),
      (Icons.search,       'Explore',      const Color(0xFFFFF8E1)),
      (Icons.school,       'Certs',        const Color(0xFFEEF2FF)),
      (Icons.bar_chart,    'Report',       const Color(0xFFFFF0F5)),
    ];
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Quick Actions', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
      const SizedBox(height: 10),
      Row(children: actions.map((a) => Expanded(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 3),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Column(children: [
                Container(
                  width: 36, height: 36,
                  decoration: BoxDecoration(color: a.$3, borderRadius: BorderRadius.circular(10)),
                  child: Icon(a.$1, color: AppColors.teal, size: 18),
                ),
                const SizedBox(height: 6),
                Text(a.$2, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w500)),
              ]),
            ),
          ),
        ),
      )).toList()),
    ]);
  }
}

class _ActivityTimeline extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Activity', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
      const SizedBox(height: 10),
      _ActivityItem(color: AppColors.green, title: 'Logbook entry approved by supervisor', time: '2h ago'),
      const SizedBox(height: 8),
      _ActivityItem(color: AppColors.teal,  title: 'New match: Safaricom UX Intern', time: '1d ago'),
    ]);
  }
}

class _ActivityItem extends StatelessWidget {
  final Color color;
  final String title;
  final String time;
  const _ActivityItem({required this.color, required this.title, required this.time});

  @override
  Widget build(BuildContext context) {
    return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(
        padding: const EdgeInsets.only(top: 5),
        child: Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
      ),
      const SizedBox(width: 10),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
        Text(time, style: const TextStyle(fontSize: 11, color: AppColors.textSecond)),
      ])),
    ]);
  }
}
EOF

# --- DISCOVER ---
cat > lib/features/discover/screens/explore_screen.dart << 'EOF'
import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

class ExploreScreen extends StatelessWidget {
  const ExploreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Explore')),
      body: const Center(child: Text('Explore Screen — TODO')),
    );
  }
}
EOF

cat > lib/features/discover/screens/opportunity_detail_screen.dart << 'EOF'
import 'package:flutter/material.dart';

class OpportunityDetailScreen extends StatelessWidget {
  final String id;
  const OpportunityDetailScreen({super.key, required this.id});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Opportunity')),
      body: Center(child: Text('Detail for opportunity $id — TODO')),
    );
  }
}
EOF

# --- LOGBOOK ---
cat > lib/features/logbook/screens/logbook_screen.dart << 'EOF'
import 'package:flutter/material.dart';

class LogbookScreen extends StatelessWidget {
  const LogbookScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Logbook')),
      body: const Center(child: Text('Logbook Screen — TODO')),
    );
  }
}
EOF

cat > lib/features/logbook/screens/log_entry_screen.dart << 'EOF'
import 'package:flutter/material.dart';

class LogEntryScreen extends StatelessWidget {
  const LogEntryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('New Entry')),
      body: const Center(child: Text('Log Entry Form — TODO')),
    );
  }
}
EOF

cat > lib/features/logbook/screens/incident_report_screen.dart << 'EOF'
import 'package:flutter/material.dart';

class IncidentReportScreen extends StatelessWidget {
  const IncidentReportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Report Issue')),
      body: const Center(child: Text('Incident Report — TODO')),
    );
  }
}
EOF

# --- VAULT ---
cat > lib/features/vault/screens/vault_screen.dart << 'EOF'
import 'package:flutter/material.dart';

class VaultScreen extends StatelessWidget {
  const VaultScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Artifact Vault')),
      body: const Center(child: Text('Vault Screen — TODO')),
    );
  }
}
EOF

# --- PROFILE ---
cat > lib/features/profile/screens/profile_screen.dart << 'EOF'
import 'package:flutter/material.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: const Center(child: Text('Profile Screen — TODO')),
    );
  }
}
EOF

# --- AUTH register stub ---
cat > lib/features/auth/screens/register_screen.dart << 'EOF'
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_routes.dart';

class RegisterScreen extends StatelessWidget {
  const RegisterScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create Account')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(children: [
          const TextField(decoration: InputDecoration(labelText: 'Full Name')),
          const SizedBox(height: 14),
          const TextField(decoration: InputDecoration(labelText: 'Email')),
          const SizedBox(height: 14),
          const TextField(obscureText: true, decoration: InputDecoration(labelText: 'Password')),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () => context.go(AppRoutes.profileWizard),
            child: const Text('Create Account'),
          ),
        ]),
      ),
    );
  }
}
EOF

# Add register route to router
sed -i "s|import '../constants/app_routes.dart';|import '../constants/app_routes.dart';\nimport '../../features/auth/screens/register_screen.dart';|" lib/core/utils/app_router.dart
sed -i "s|GoRoute(path: AppRoutes.login,.*|GoRoute(path: AppRoutes.login, builder: (_, __) => const LoginScreen()),\n    GoRoute(path: AppRoutes.register, builder: (_, __) => const RegisterScreen()),|" lib/core/utils/app_router.dart

echo ""
echo "📦 Running flutter pub get..."
flutter pub get

echo ""
echo "✅ EduLink project ready!"
echo ""
echo "Project structure:"
find lib -name "*.dart" | sort
echo ""
echo "▶️  Run with:  flutter run"