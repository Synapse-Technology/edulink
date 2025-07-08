import 'package:flutter/material.dart';
import '../../theme/theme.dart';

class ResetPasswordScreen extends StatefulWidget {
  const ResetPasswordScreen({super.key});

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final emailController = TextEditingController();
  String? message;
  bool isError = false;
  bool isLoading = false;

  @override
  void dispose() {
    emailController.dispose();
    super.dispose();
  }

  void handleResetPassword() async {
    final email = emailController.text.trim();
    if (email.isEmpty) {
      setState(() {
        message = 'Please enter your email address';
        isError = true;
      });
      return;
    }
    if (!email.contains('@')) {
      setState(() {
        message = 'Please enter a valid email address';
        isError = true;
      });
      return;
    }
    setState(() {
      isLoading = true;
      message = null;
    });
    await Future.delayed(const Duration(seconds: 1));
    setState(() {
      isLoading = false;
      message = 'Reset link sent to $email\nPlease check your email for the redirect link';
      isError = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              EduLinkTheme.primary.withOpacity(0.1),
              EduLinkTheme.secondary.withOpacity(0.1),
            ],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Logo and Title
                    Center(
                      child: Column(
                        children: [
                          Container(
                            width: 80,
                            height: 80,
                            decoration: BoxDecoration(
                              color: EduLinkTheme.primary,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Icon(
                              Icons.lock_reset,
                              size: 40,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 24),
                          Text(
                            'Reset Password',
                            style: Theme.of(context).textTheme.displayMedium,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Enter your email to receive a reset link',
                            style: Theme.of(context).textTheme.bodyMedium,
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 32),

                    // Reset Form
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(24.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            TextField(
                              controller: emailController,
                              keyboardType: TextInputType.emailAddress,
                              decoration: const InputDecoration(
                                hintText: 'Email Address',
                                prefixIcon: Icon(Icons.email_outlined),
                              ),
                              onSubmitted: (_) => handleResetPassword(),
                            ),
                            if (message != null) ...[
                              const SizedBox(height: 16),
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: isError ? Colors.red.withOpacity(0.1) : EduLinkTheme.accent.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                    color: isError ? Colors.red : EduLinkTheme.accent,
                                  ),
                                ),
                                child: Text(
                                  message!,
                                  style: TextStyle(
                                    color: isError ? Colors.red : EduLinkTheme.accent,
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              ),
                            ],
                            const SizedBox(height: 24),
                            ElevatedButton(
                              onPressed: isLoading ? null : handleResetPassword,
                              child: isLoading
                                  ? const SizedBox(
                                      height: 20,
                                      width: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                      ),
                                    )
                                  : const Text('Send Reset Link'),
                            ),
                            const SizedBox(height: 16),
                            OutlinedButton(
                              onPressed: () {
                                Navigator.pop(context);
                              },
                              child: const Text('Back to Login'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
