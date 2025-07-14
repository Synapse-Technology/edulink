import 'package:flutter/material.dart';
import 'screens/dashboard_screen.dart';
import 'screens/landing_screen.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/reset_password_screen.dart';
import 'screens/logbook_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/opportunities_screen.dart';
import 'screens/applications_screen.dart';
import 'services/user_session.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';

class EduLinkApp extends StatelessWidget {
  const EduLinkApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (context) {
        final provider = AuthProvider();
        provider.initAuth();
        return provider;
      },
      child: MaterialApp(
        title: 'EduLink KE',
        theme: ThemeData(
          primarySwatch: Colors.teal,
          scaffoldBackgroundColor: const Color(0xFFF7F8FA),
          fontFamily: 'Roboto',
        ),
        home: const LandingScreen(),
        debugShowCheckedModeBanner: false,
        routes: {
          '/login': (context) => const LoginScreen(),
          '/register': (context) => const RegisterScreen(),
          '/home': (context) => const AppShell(), // Placeholder for main app
          '/reset-password': (context) => const ResetPasswordScreen(),
        },
      ),
    );
  }
}

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _selectedIndex = 0;

  final List<Widget> _screens = [];

  final List<String> _titles = const [
    'Dashboard',
    'Browse',
    'Applications',
    'Logbook',
    'Profile',
  ];

  @override
  void initState() {
    super.initState();
    _screens.addAll([
      DashboardScreen(onNavigate: _onNavSelected),
      const OpportunitiesScreen(),
      const ApplicationsScreen(),
      const LogbookScreen(),
      const ProfileScreen(),
    ]);
  }

  void _onNavSelected(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    // Get user info for profile icon
    final email = UserSession.email ?? '';
    final first = email.isNotEmpty ? email.split('@').first : 'U';
    String capitalize(String s) => s.isNotEmpty ? s[0].toUpperCase() + s.substring(1) : s;
    final firstName = capitalize(first.split('.').first);
    // For demo, no profilePicPath
    const profilePicPath = null;
    return Scaffold(
      body: _screens[_selectedIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: _onNavSelected,
        type: BottomNavigationBarType.fixed,
        selectedItemColor: Colors.teal,
        unselectedItemColor: Colors.grey,
        items: [
          const BottomNavigationBarItem(
            icon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.search),
            label: 'Browse',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.assignment),
            label: 'Applications',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.book),
            label: 'Logbook',
          ),
          BottomNavigationBarItem(
            icon: ProfileNavIcon(
              profilePicPath: profilePicPath,
              firstName: firstName,
            ),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}

class ProfileNavIcon extends StatelessWidget {
  final double size;
  final String? profilePicPath;
  final String? firstName;
  const ProfileNavIcon({super.key, this.size = 24, this.profilePicPath, this.firstName});

  @override
  Widget build(BuildContext context) {
    if (profilePicPath != null && profilePicPath!.isNotEmpty) {
      return CircleAvatar(
        radius: size / 2,
        backgroundImage: AssetImage(profilePicPath!),
      );
    } else {
      return CircleAvatar(
        radius: size / 2,
        backgroundColor: Colors.teal,
        child: Text(
          (firstName != null && firstName!.isNotEmpty)
              ? firstName![0].toUpperCase()
              : '',
          style: TextStyle(fontSize: size * 0.7, color: Colors.white, fontWeight: FontWeight.bold),
        ),
      );
    }
  }
} 