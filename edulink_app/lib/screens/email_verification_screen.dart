import 'package:flutter/material.dart';
import '../theme/theme.dart';

class EmailVerificationScreen extends StatelessWidget {
  final String email;
  
  const EmailVerificationScreen({
    super.key,
    required this.email,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: EduLinkTheme.backgroundGradient,
        ),
        child: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(EduLinkTheme.spacingL),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Success Icon
                  Container(
                    width: 120,
                    height: 120,
                    decoration: BoxDecoration(
                      color: EduLinkTheme.success.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(EduLinkTheme.radiusXLarge),
                      border: Border.all(
                        color: EduLinkTheme.success,
                        width: 3,
                      ),
                    ),
                    child: Icon(
                      Icons.mark_email_read,
                      size: 60,
                      color: EduLinkTheme.success,
                    ),
                  ),
                  
                  SizedBox(height: EduLinkTheme.spacingXXL),
                  
                  // Title
                  Text(
                    'Check Your Email',
                    style: EduLinkTheme.textTheme.displayMedium?.copyWith(
                      color: EduLinkTheme.onSurface,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  
                  SizedBox(height: EduLinkTheme.spacingL),
                  
                  // Description
                  Text(
                    'We\'ve sent a verification link to',
                    style: EduLinkTheme.textTheme.bodyLarge?.copyWith(
                      color: EduLinkTheme.onSurfaceVariant,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  
                  SizedBox(height: EduLinkTheme.spacingS),
                  
                  // Email
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: EduLinkTheme.spacingM,
                      vertical: EduLinkTheme.spacingS,
                    ),
                    decoration: BoxDecoration(
                      color: EduLinkTheme.surface,
                      borderRadius: BorderRadius.circular(EduLinkTheme.radiusMedium),
                      border: Border.all(color: EduLinkTheme.outline),
                    ),
                    child: Text(
                      email,
                      style: EduLinkTheme.textTheme.bodyLarge?.copyWith(
                        color: EduLinkTheme.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  
                  SizedBox(height: EduLinkTheme.spacingL),
                  
                  // Instructions
                  Container(
                    padding: const EdgeInsets.all(EduLinkTheme.spacingL),
                    decoration: BoxDecoration(
                      color: EduLinkTheme.surface,
                      borderRadius: BorderRadius.circular(EduLinkTheme.radiusLarge),
                      boxShadow: EduLinkTheme.cardShadow,
                    ),
                    child: Column(
                      children: [
                        _buildInstructionStep(
                          icon: Icons.email_outlined,
                          title: 'Open your email',
                          description: 'Check your inbox for an email from EduLink',
                        ),
                        SizedBox(height: EduLinkTheme.spacingM),
                        _buildInstructionStep(
                          icon: Icons.link,
                          title: 'Click the verification link',
                          description: 'Click the link in the email to verify your account',
                        ),
                        SizedBox(height: EduLinkTheme.spacingM),
                        _buildInstructionStep(
                          icon: Icons.check_circle_outline,
                          title: 'Start using EduLink',
                          description: 'Once verified, you can access all features',
                        ),
                      ],
                    ),
                  ),
                  
                  SizedBox(height: EduLinkTheme.spacingXXL),
                  
                  // Action Buttons
                  Column(
                    children: [
                      ElevatedButton(
                        onPressed: () {
                          // TODO: Implement resend email functionality
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: const Text('Verification email resent!'),
                              backgroundColor: EduLinkTheme.success,
                              behavior: SnackBarBehavior.floating,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(EduLinkTheme.radiusMedium),
                              ),
                            ),
                          );
                        },
                        style: EduLinkTheme.primaryButtonStyle,
                        child: const Text('Resend Email'),
                      ),
                      
                      SizedBox(height: EduLinkTheme.spacingM),
                      
                      OutlinedButton(
                        onPressed: () => Navigator.pushReplacementNamed(context, '/login'),
                        style: EduLinkTheme.secondaryButtonStyle,
                        child: const Text('Back to Login'),
                      ),
                    ],
                  ),
                  
                  SizedBox(height: EduLinkTheme.spacingL),
                  
                  // Help Text
                  Text(
                    'Didn\'t receive the email? Check your spam folder or contact support.',
                    style: EduLinkTheme.textTheme.bodySmall?.copyWith(
                      color: EduLinkTheme.onSurfaceVariant,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInstructionStep({
    required IconData icon,
    required String title,
    required String description,
  }) {
    return Row(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: EduLinkTheme.primary.withOpacity(0.1),
            borderRadius: BorderRadius.circular(EduLinkTheme.radiusMedium),
          ),
          child: Icon(
            icon,
            color: EduLinkTheme.primary,
            size: 20,
          ),
        ),
        SizedBox(width: EduLinkTheme.spacingM),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: EduLinkTheme.textTheme.titleMedium?.copyWith(
                  color: EduLinkTheme.onSurface,
                  fontWeight: FontWeight.w600,
                ),
              ),
              SizedBox(height: EduLinkTheme.spacingXS),
              Text(
                description,
                style: EduLinkTheme.textTheme.bodyMedium?.copyWith(
                  color: EduLinkTheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
} 