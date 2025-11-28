from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
import logging

logger = logging.getLogger(__name__)

class SupervisorEmailService:
    """Service for sending emails to supervisors"""
    
    @staticmethod
    def send_welcome_email(supervisor_data, department_name, institution_name):
        """
        Send welcome email with login credentials to newly created supervisor
        
        Args:
            supervisor_data (dict): Contains user, profile, and password info
            department_name (str): Name of the department
            institution_name (str): Name of the institution
        """
        try:
            user = supervisor_data['user']
            password = supervisor_data['password']
            
            subject = f'Welcome to EduLink - Your Supervisor Account'
            
            # Create email context
            context = {
                'supervisor_name': user.get_full_name() or user.first_name,
                'email': user.email,
                'password': password,
                'department_name': department_name,
                'institution_name': institution_name,
                'login_url': f'{settings.FRONTEND_URL}/login' if hasattr(settings, 'FRONTEND_URL') else 'http://localhost:8000/login'
            }
            
            # HTML email content
            html_message = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: #007bff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                    .content {{ background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }}
                    .credentials {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff; }}
                    .button {{ display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
                    .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 14px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Welcome to EduLink!</h1>
                    </div>
                    <div class="content">
                        <h2>Hello {context['supervisor_name']},</h2>
                        
                        <p>Your supervisor account has been successfully created for the <strong>{context['department_name']}</strong> department at <strong>{context['institution_name']}</strong>.</p>
                        
                        <div class="credentials">
                            <h3>Your Login Credentials:</h3>
                            <p><strong>Email:</strong> {context['email']}</p>
                            <p><strong>Password:</strong> {context['password']}</p>
                        </div>
                        
                        <p>You can now access your supervisor dashboard to:</p>
                        <ul>
                            <li>Manage student assignments</li>
                            <li>Review internship applications</li>
                            <li>Track student progress</li>
                            <li>Update your profile information</li>
                        </ul>
                        
                        <a href="{context['login_url']}" class="button">Login to Your Account</a>
                        
                        <p><strong>Important:</strong> For security reasons, please change your password after your first login.</p>
                        
                        <div class="footer">
                            <p>If you have any questions, please contact your institution administrator.</p>
                            <p>© 2024 EduLink. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Plain text version
            plain_message = f"""
            Welcome to EduLink!
            
            Hello {context['supervisor_name']},
            
            Your supervisor account has been successfully created for the {context['department_name']} department at {context['institution_name']}.
            
            Your Login Credentials:
            Email: {context['email']}
            Password: {context['password']}
            
            You can now access your supervisor dashboard at: {context['login_url']}
            
            You can use your account to:
            - Manage student assignments
            - Review internship applications
            - Track student progress
            - Update your profile information
            
            Important: For security reasons, please change your password after your first login.
            
            If you have any questions, please contact your institution administrator.
            
            © 2024 EduLink. All rights reserved.
            """
            
            # Send email
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False
            )
            
            logger.info(f'Welcome email sent successfully to supervisor: {user.email}')
            return True
            
        except Exception as e:
            logger.error(f'Failed to send welcome email to supervisor {user.email}: {str(e)}')
            return False
    
    @staticmethod
    def send_bulk_welcome_emails(supervisors_data, department_name, institution_name):
        """
        Send welcome emails to multiple supervisors
        
        Args:
            supervisors_data (list): List of supervisor data dictionaries
            department_name (str): Name of the department
            institution_name (str): Name of the institution
            
        Returns:
            dict: Results with success and failure counts
        """
        results = {'success': 0, 'failed': 0, 'errors': []}
        
        for supervisor_data in supervisors_data:
            try:
                if SupervisorEmailService.send_welcome_email(
                    supervisor_data, department_name, institution_name
                ):
                    results['success'] += 1
                else:
                    results['failed'] += 1
                    results['errors'].append(f"Failed to send email to {supervisor_data['user'].email}")
            except Exception as e:
                results['failed'] += 1
                results['errors'].append(f"Error sending email to {supervisor_data['user'].email}: {str(e)}")
        
        return results