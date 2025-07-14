import 'package:flutter/material.dart';
import '../services/user_session.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import '../services/auth_service.dart';
import 'dart:io';

// Add a simple global theme provider
class ThemeProvider extends InheritedWidget {
  final bool darkMode;
  final void Function(bool) setDarkMode;
  const ThemeProvider({required this.darkMode, required this.setDarkMode, required super.child, super.key});
  static ThemeProvider? of(BuildContext context) => context.dependOnInheritedWidgetOfExactType<ThemeProvider>();
  @override
  bool updateShouldNotify(ThemeProvider oldWidget) => darkMode != oldWidget.darkMode;
}

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> with SingleTickerProviderStateMixin {
  // Demo state
  late final TextEditingController _firstNameController;
  late final TextEditingController _lastNameController;
  late final TextEditingController _emailController;
  final _phoneController = TextEditingController();
  final _dobController = TextEditingController();
  final _ageController = TextEditingController();
  String? _gender;
  String? _institution = 'Kenyatta University';
  final String _course = 'Computer Science';
  String? _year = '3rd year';
  final bool _institutionVerified = true;
  String? _profilePicPath;
  String? _cvPath;
  String? _admissionLetterPath;
  bool _twoFactor = false;
  final bool _emailVerified = true;
  final int _internshipsApplied = 4;
  final int _internshipsApproved = 2;
  final int _certificates = 1;
  final String _lastLogin = '2 days ago';

  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    // Get user info from UserSession
    final email = UserSession.email ?? '';
    final first = email.isNotEmpty ? email.split('@').first : 'User';
    String capitalize(String s) => s.isNotEmpty ? s[0].toUpperCase() + s.substring(1) : s;
    final firstName = capitalize(first.split('.').first);
    final lastName = first.contains('.') ? capitalize(first.split('.').last) : '';
    _firstNameController = TextEditingController(text: firstName);
    _lastNameController = TextEditingController(text: lastName);
    _emailController = TextEditingController(text: email);
    _tabController = TabController(length: 5, vsync: this);
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _dobController.dispose();
    _ageController.dispose();
    _tabController.dispose();
    super.dispose();
  }

  double get _profileCompletion {
    int total = 9;
    int filled = 0;
    if (_firstNameController.text.isNotEmpty) filled++;
    if (_lastNameController.text.isNotEmpty) filled++;
    if (_emailController.text.isNotEmpty) filled++;
    if (_phoneController.text.isNotEmpty) filled++;
    if (_dobController.text.isNotEmpty) filled++;
    if (_ageController.text.isNotEmpty) filled++;
    if (_institution != null && _institution!.isNotEmpty) filled++;
    if (_cvPath != null) filled++;
    if (_emailVerified) filled++;
    return filled / total;
  }

  List<String> get _missingFields {
    List<String> missing = [];
    if (_firstNameController.text.isEmpty) missing.add('First Name');
    if (_lastNameController.text.isEmpty) missing.add('Last Name');
    if (_emailController.text.isEmpty) missing.add('Email');
    if (_phoneController.text.isEmpty) missing.add('Phone Number');
    if (_dobController.text.isEmpty) missing.add('Date of Birth');
    if (_ageController.text.isEmpty) missing.add('Age');
    if (_institution == null || _institution!.isEmpty) missing.add('Institution');
    if (_cvPath == null) missing.add('CV');
    if (!_emailVerified) missing.add('Email Verification');
    return missing;
  }

  void _showCompleteProfileDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Complete Your Profile'),
        content: _missingFields.isEmpty
            ? const Text('Your profile is complete!')
            : Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Please complete the following:'),
                  const SizedBox(height: 8),
                  ..._missingFields.map((f) => Text('• $f')),
                ],
              ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _logout() {
    UserSession.email = null;
    Navigator.of(context).pushReplacementNamed('/login');
  }

  void _deleteAccount() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Account'),
        content: const Text('Account deletion is not implemented in this demo.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _changePassword() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Change Password'),
        content: const Text('Password change is not implemented in this demo.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _resendVerificationLink() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Verification link sent! (stub)')),
    );
  }

  void _showPrivacySettings() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Privacy Settings'),
        content: const Text('Privacy settings are not implemented in this demo.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _showSupport() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Support'),
        content: const Text('Support is not implemented in this demo.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _showHelp() {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const HelpSupportPage()));
  }

  void _toggleDarkMode() {
    final themeProvider = ThemeProvider.of(context);
    if (themeProvider != null) {
      themeProvider.setDarkMode(!themeProvider.darkMode);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(!themeProvider.darkMode ? 'Dark mode enabled!' : 'Light mode enabled!')),
      );
    }
  }

  Future<void> _pickFile(String type) async {
    final result = await FilePicker.platform.pickFiles(type: FileType.any);
    if (result != null && result.files.single.path != null) {
      setState(() {
        if (type == 'cv') _cvPath = result.files.single.path;
        if (type == 'admission') _admissionLetterPath = result.files.single.path;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${type == 'cv' ? 'CV' : 'Admission Letter'} uploaded!')),
      );
    }
  }

  Future<void> _pickProfilePic() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.gallery);
    if (picked != null) {
      setState(() {
        _profilePicPath = picked.path;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profile picture updated!')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeProvider = ThemeProvider.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          PopupMenuButton<String>(
            onSelected: (value) {
              switch (value) {
                case 'logout':
                  _logout();
                  break;
                case 'delete':
                  _deleteAccount();
                  break;
                case 'help':
                  _showHelp();
                  break;
                case 'settings':
                  showModalBottomSheet(
                    context: context,
                    builder: (context) => Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        ListTile(
                          leading: const Icon(Icons.privacy_tip),
                          title: const Text('Privacy'),
                          onTap: () {
                            Navigator.pop(context);
                            _showPrivacySettings();
                          },
                        ),
                        ListTile(
                          leading: const Icon(Icons.dark_mode),
                          title: const Text('Dark Mode'),
                          onTap: () {
                            Navigator.pop(context);
                            _toggleDarkMode();
                          },
                        ),
                        ListTile(
                          leading: const Icon(Icons.support),
                          title: const Text('Support'),
                          onTap: () {
                            Navigator.pop(context);
                            _showSupport();
                          },
                        ),
                      ],
                    ),
                  );
                  break;
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(value: 'settings', child: ListTile(leading: Icon(Icons.settings), title: Text('App Settings'))),
              const PopupMenuItem(value: 'help', child: ListTile(leading: Icon(Icons.help), title: Text('Help'))),
              const PopupMenuItem(value: 'logout', child: ListTile(leading: Icon(Icons.logout), title: Text('Logout'))),
              const PopupMenuItem(value: 'delete', child: ListTile(leading: Icon(Icons.delete), title: Text('Delete Account'))),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          // Profile Header
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
            color: Colors.teal[50],
            child: Column(
              children: [
                Stack(
                  alignment: Alignment.bottomRight,
                  children: [
                    GestureDetector(
                      onTap: _pickProfilePic,
                      child: CircleAvatar(
                        radius: 48,
                        backgroundImage: _profilePicPath != null ? Image.file(
                          File(_profilePicPath!),
                          fit: BoxFit.cover,
                        ).image : null,
                        child: _profilePicPath == null
                            ? Text(
                                _firstNameController.text.isNotEmpty
                                    ? _firstNameController.text[0].toUpperCase()
                                    : '',
                                style: const TextStyle(fontSize: 36, fontWeight: FontWeight.bold),
                              )
                            : null,
                      ),
                    ),
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: CircleAvatar(
                        radius: 16,
                        backgroundColor: Colors.white,
                        child: IconButton(
                          icon: const Icon(Icons.edit, size: 16),
                          onPressed: _pickProfilePic,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  '${_firstNameController.text} ${_lastNameController.text}',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20),
                ),
                const SizedBox(height: 4),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Chip(
                      label: Text(_institutionVerified ? 'Verified Student ✅' : 'Pending Verification'),
                      backgroundColor: _institutionVerified ? Colors.green[100] : Colors.orange[100],
                      labelStyle: TextStyle(color: _institutionVerified ? Colors.green : Colors.orange),
                    ),
                    const SizedBox(width: 8),
                    Text('• $_institution', style: const TextStyle(fontSize: 15)),
                  ],
                ),
              ],
            ),
          ),
          // Profile Completion
          Container(
            width: double.infinity,
            color: Colors.teal[50],
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: LinearProgressIndicator(
                        value: _profileCompletion,
                        minHeight: 8,
                        backgroundColor: Colors.grey[200],
                        color: Colors.teal,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text('${(_profileCompletion * 100).round()}% Complete'),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    TextButton(
                      onPressed: _showCompleteProfileDialog,
                      child: const Text('Complete profile'),
                    ),
                    if (_missingFields.isNotEmpty)
                      Text('${_missingFields.length} fields missing', style: const TextStyle(color: Colors.red)),
                  ],
                ),
              ],
            ),
          ),
          // Tabs
          TabBar(
            controller: _tabController,
            isScrollable: true,
            labelColor: Colors.teal,
            unselectedLabelColor: Colors.black54,
            indicatorColor: Colors.teal,
            tabs: const [
              Tab(text: 'Personal Info', icon: Icon(Icons.person)),
              Tab(text: 'Institution', icon: Icon(Icons.school)),
              Tab(text: 'Documents', icon: Icon(Icons.folder)),
              Tab(text: 'Activity', icon: Icon(Icons.bar_chart)),
              Tab(text: 'Security', icon: Icon(Icons.lock)),
            ],
          ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                // Personal Info
                ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    TextFormField(
                      controller: _firstNameController,
                      decoration: const InputDecoration(labelText: 'First Name'),
                    ),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _lastNameController,
                      decoration: const InputDecoration(labelText: 'Last Name'),
                    ),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _emailController,
                      decoration: const InputDecoration(labelText: 'Email Address'),
                      readOnly: true,
                    ),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _dobController,
                      decoration: const InputDecoration(labelText: 'Date of Birth (DOB)'),
                      keyboardType: TextInputType.datetime,
                    ),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _ageController,
                      decoration: const InputDecoration(labelText: 'Age'),
                      keyboardType: TextInputType.number,
                    ),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _phoneController,
                      decoration: const InputDecoration(labelText: 'Phone Number'),
                      keyboardType: TextInputType.phone,
                    ),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      value: _gender,
                      items: ['Male', 'Female', 'Other'].map((g) => DropdownMenuItem(value: g, child: Text(g))).toList(),
                      onChanged: (v) => setState(() => _gender = v),
                      decoration: const InputDecoration(labelText: 'Gender (optional)'),
                    ),
                  ],
                ),
                // Institution Info
                ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    DropdownButtonFormField<String>(
                      value: _institution,
                      items: ['Kenyatta University', 'University of Nairobi', 'Moi University'].map((name) => DropdownMenuItem(value: name, child: Text(name))).toList(),
                      onChanged: (v) => setState(() => _institution = v),
                      decoration: const InputDecoration(labelText: 'Institution'),
                    ),
                    const SizedBox(height: 8),
                    TextFormField(
                      decoration: const InputDecoration(labelText: 'Institution Code'),
                      readOnly: true,
                      initialValue: _institution == null ? '' : 'CODE123',
                    ),
                    const SizedBox(height: 8),
                    TextFormField(
                      decoration: const InputDecoration(labelText: 'program/course'),
                      readOnly: true,
                      initialValue: _institution == null ? '' : 'comp tech',
                    ),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      value: _year,
                      items: ['1st year', '2nd year', '3rd year', '4th year'].map((y) => DropdownMenuItem(value: y, child: Text(y))).toList(),
                      onChanged: (v) => setState(() => _year = v),
                      decoration: const InputDecoration(labelText: 'Year of Study'),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Text('Verification Status: '),
                        Chip(
                          label: Text(_institutionVerified ? 'Verified' : 'Pending'),
                          backgroundColor: _institutionVerified ? Colors.green[100] : Colors.orange[100],
                          labelStyle: TextStyle(color: _institutionVerified ? Colors.green : Colors.orange),
                        ),
                      ],
                    ),
                  ],
                ),
                // Documents
                ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    ListTile(
                      leading: const Icon(Icons.picture_as_pdf),
                      title: const Text('CV / Résumé'),
                      subtitle: Text(_cvPath != null ? _cvPath!.split('/').last : 'No file uploaded'),
                      trailing: IconButton(
                        icon: const Icon(Icons.upload_file),
                        onPressed: () => _pickFile('cv'),
                      ),
                    ),
                    ListTile(
                      leading: const Icon(Icons.school),
                      title: const Text('Admission Letter'),
                      subtitle: Text(_admissionLetterPath != null ? _admissionLetterPath!.split('/').last : 'No file uploaded'),
                      trailing: IconButton(
                        icon: const Icon(Icons.upload_file),
                        onPressed: () => _pickFile('admission'),
                      ),
                    ),
                    ListTile(
                      leading: const Icon(Icons.person),
                      title: const Text('Profile Picture'),
                      subtitle: _profilePicPath != null ? Text(_profilePicPath!.split('/').last) : const Text('No file uploaded'),
                      trailing: IconButton(
                        icon: const Icon(Icons.upload_file),
                        onPressed: _pickProfilePic,
                      ),
                    ),
                  ],
                ),
                // Activity
                ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    ListTile(
                      leading: const Icon(Icons.work),
                      title: const Text('Internships Applied'),
                      trailing: Text('$_internshipsApplied'),
                    ),
                    ListTile(
                      leading: const Icon(Icons.check_circle),
                      title: const Text('Internships Approved'),
                      trailing: Text('$_internshipsApproved'),
                    ),
                    ListTile(
                      leading: const Icon(Icons.verified_user),
                      title: const Text('Certificates Earned'),
                      trailing: Text('$_certificates'),
                    ),
                    ListTile(
                      leading: const Icon(Icons.access_time),
                      title: const Text('Last Login'),
                      trailing: Text(_lastLogin),
                    ),
                  ],
                ),
                // Security
                ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    ListTile(
                      leading: const Icon(Icons.lock),
                      title: const Text('Change Password'),
                      onTap: _changePassword,
                    ),
                    SwitchListTile(
                      value: _twoFactor,
                      onChanged: (v) => setState(() => _twoFactor = v),
                      title: const Text('Two-Factor Auth (optional)'),
                    ),
                    ListTile(
                      leading: Icon(_emailVerified ? Icons.verified : Icons.email),
                      title: Text(_emailVerified ? 'Email Verified' : 'Email Not Verified'),
                      trailing: !_emailVerified
                          ? TextButton(
                              onPressed: _resendVerificationLink,
                              child: const Text('Resend Link'),
                            )
                          : null,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class HelpSupportPage extends StatelessWidget {
  const HelpSupportPage({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Help & Support')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: ListView(
          children: const [
            Text('Help & Support', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            SizedBox(height: 16),
            Text('For assistance, please contact support@edulink.ke or visit our FAQ page.'),
            SizedBox(height: 16),
            Text('Frequently Asked Questions:'),
            SizedBox(height: 8),
            Text('• How do I update my profile?\nGo to the Profile tab and edit your information.'),
            SizedBox(height: 8),
            Text('• How do I upload documents?\nUse the upload buttons in the Documents tab.'),
            SizedBox(height: 8),
            Text('• How do I enable dark mode?\nGo to App Settings > Dark Mode.'),
          ],
        ),
      ),
    );
  }
} 