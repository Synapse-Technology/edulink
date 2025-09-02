from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template import Template, Context
from django.utils.html import strip_tags
import logging
import requests
from twilio.rest import Client as TwilioClient
from twilio.base.exceptions import TwilioException
from typing import Dict, Any, Optional
import json

from .models import NotificationTemplate

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending email notifications"""
    
    def __init__(self):
        self.smtp_backend = getattr(settings, 'EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')
        self.from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@edulink.com')
        self.sendgrid_api_key = getattr(settings, 'SENDGRID_API_KEY', None)
    
    def send_email(self, to_email: str, subject: str, message: str, html_content: str = '') -> Dict[str, Any]:
        """Send email using configured backend"""
        try:
            # Use SendGrid API if configured
            if self.sendgrid_api_key and 'sendgrid' in self.smtp_backend.lower():
                return self._send_via_sendgrid(to_email, subject, message, html_content)
            else:
                return self._send_via_django(to_email, subject, message, html_content)
        
        except Exception as exc:
            logger.error(f"Error sending email to {to_email}: {str(exc)}")
            return {
                'success': False,
                'error_message': str(exc),
                'provider': 'email',
                'provider_response': {}
            }
    
    def _send_via_django(self, to_email: str, subject: str, message: str, html_content: str = '') -> Dict[str, Any]:
        """Send email using Django's email backend"""
        try:
            email = EmailMultiAlternatives(
                subject=subject,
                body=message,
                from_email=self.from_email,
                to=[to_email]
            )
            
            if html_content:
                email.attach_alternative(html_content, "text/html")
            
            result = email.send()
            
            if result:
                return {
                    'success': True,
                    'provider': 'django_email',
                    'external_id': None,
                    'provider_response': {'sent': True}
                }
            else:
                return {
                    'success': False,
                    'error_message': 'Email sending failed',
                    'provider': 'django_email',
                    'provider_response': {'sent': False}
                }
        
        except Exception as exc:
            return {
                'success': False,
                'error_message': str(exc),
                'provider': 'django_email',
                'provider_response': {}
            }
    
    def _send_via_sendgrid(self, to_email: str, subject: str, message: str, html_content: str = '') -> Dict[str, Any]:
        """Send email using SendGrid API"""
        try:
            import sendgrid
            from sendgrid.helpers.mail import Mail, Email, To, Content
            
            sg = sendgrid.SendGridAPIClient(api_key=self.sendgrid_api_key)
            
            from_email = Email(self.from_email)
            to_email_obj = To(to_email)
            
            # Use HTML content if available, otherwise convert plain text
            if html_content:
                content = Content("text/html", html_content)
            else:
                content = Content("text/plain", message)
            
            mail = Mail(from_email, to_email_obj, subject, content)
            
            # Add plain text version if we have HTML
            if html_content:
                mail.add_content(Content("text/plain", strip_tags(message)))
            
            response = sg.client.mail.send.post(request_body=mail.get())
            
            if response.status_code in [200, 201, 202]:
                return {
                    'success': True,
                    'provider': 'sendgrid',
                    'external_id': response.headers.get('X-Message-Id'),
                    'provider_response': {
                        'status_code': response.status_code,
                        'headers': dict(response.headers)
                    }
                }
            else:
                return {
                    'success': False,
                    'error_message': f'SendGrid API error: {response.status_code}',
                    'provider': 'sendgrid',
                    'provider_response': {
                        'status_code': response.status_code,
                        'body': response.body
                    }
                }
        
        except Exception as exc:
            return {
                'success': False,
                'error_message': str(exc),
                'provider': 'sendgrid',
                'provider_response': {}
            }


class SMSService:
    """Service for sending SMS notifications"""
    
    def __init__(self):
        self.twilio_account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', None)
        self.twilio_auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', None)
        self.twilio_phone_number = getattr(settings, 'TWILIO_PHONE_NUMBER', None)
        
        if self.twilio_account_sid and self.twilio_auth_token:
            self.client = TwilioClient(self.twilio_account_sid, self.twilio_auth_token)
        else:
            self.client = None
    
    def send_sms(self, to_phone: str, message: str) -> Dict[str, Any]:
        """Send SMS using Twilio"""
        try:
            if not self.client:
                return {
                    'success': False,
                    'error_message': 'Twilio not configured',
                    'provider': 'twilio',
                    'provider_response': {}
                }
            
            if not self.twilio_phone_number:
                return {
                    'success': False,
                    'error_message': 'Twilio phone number not configured',
                    'provider': 'twilio',
                    'provider_response': {}
                }
            
            # Ensure phone number is in E.164 format
            if not to_phone.startswith('+'):
                to_phone = '+' + to_phone.lstrip('+')
            
            message_obj = self.client.messages.create(
                body=message,
                from_=self.twilio_phone_number,
                to=to_phone
            )
            
            return {
                'success': True,
                'provider': 'twilio',
                'external_id': message_obj.sid,
                'provider_response': {
                    'sid': message_obj.sid,
                    'status': message_obj.status,
                    'price': message_obj.price,
                    'price_unit': message_obj.price_unit
                }
            }
        
        except TwilioException as exc:
            return {
                'success': False,
                'error_message': f'Twilio error: {str(exc)}',
                'provider': 'twilio',
                'provider_response': {
                    'error_code': getattr(exc, 'code', None),
                    'error_message': str(exc)
                }
            }
        except Exception as exc:
            return {
                'success': False,
                'error_message': str(exc),
                'provider': 'twilio',
                'provider_response': {}
            }
    
    def get_message_status(self, message_sid: str) -> Dict[str, Any]:
        """Get SMS delivery status from Twilio"""
        try:
            if not self.client:
                return {'error': 'Twilio not configured'}
            
            message = self.client.messages(message_sid).fetch()
            
            return {
                'sid': message.sid,
                'status': message.status,
                'error_code': message.error_code,
                'error_message': message.error_message,
                'price': message.price,
                'price_unit': message.price_unit,
                'date_sent': message.date_sent,
                'date_updated': message.date_updated
            }
        
        except Exception as exc:
            return {'error': str(exc)}


class TemplateService:
    """Service for rendering notification templates"""
    
    def render_template(self, template: NotificationTemplate, variables: Dict[str, Any]) -> Dict[str, str]:
        """Render notification template with variables"""
        try:
            context = Context(variables)
            
            # Render subject
            subject_template = Template(template.subject)
            rendered_subject = subject_template.render(context)
            
            # Render message
            message_template = Template(template.message)
            rendered_message = message_template.render(context)
            
            # Render HTML content if available
            rendered_html = ''
            if template.html_content:
                html_template = Template(template.html_content)
                rendered_html = html_template.render(context)
            
            return {
                'subject': rendered_subject,
                'message': rendered_message,
                'html_content': rendered_html
            }
        
        except Exception as exc:
            logger.error(f"Error rendering template {template.id}: {str(exc)}")
            # Return original template content as fallback
            return {
                'subject': template.subject,
                'message': template.message,
                'html_content': template.html_content or ''
            }
    
    def validate_template(self, template_content: str, sample_variables: Dict[str, Any] = None) -> Dict[str, Any]:
        """Validate template syntax and variables"""
        try:
            template = Template(template_content)
            
            # Test render with sample variables
            if sample_variables:
                context = Context(sample_variables)
                rendered = template.render(context)
            
            return {
                'valid': True,
                'error': None
            }
        
        except Exception as exc:
            return {
                'valid': False,
                'error': str(exc)
            }


class NotificationStatsService:
    """Service for generating notification statistics"""
    
    def get_stats(self, start_date=None, end_date=None, service=None, category=None) -> Dict[str, Any]:
        """Get notification statistics"""
        from django.db.models import Count, Q
        from django.utils import timezone
        from .models import Notification, NotificationStatus, NotificationType
        
        # Build query filters
        filters = Q()
        
        if start_date:
            filters &= Q(created_at__gte=start_date)
        if end_date:
            filters &= Q(created_at__lte=end_date)
        if service:
            filters &= Q(source_service=service)
        if category:
            filters &= Q(category=category)
        
        # Get base queryset
        notifications = Notification.objects.filter(filters)
        
        # Overall stats
        total_count = notifications.count()
        
        # Status breakdown
        status_stats = notifications.values('status').annotate(count=Count('id'))
        status_breakdown = {stat['status']: stat['count'] for stat in status_stats}
        
        # Type breakdown
        type_stats = notifications.values('notification_type').annotate(count=Count('id'))
        type_breakdown = {stat['notification_type']: stat['count'] for stat in type_stats}
        
        # Category breakdown
        category_stats = notifications.values('category').annotate(count=Count('id'))
        category_breakdown = {stat['category']: stat['count'] for stat in category_stats}
        
        # Service breakdown
        service_stats = notifications.values('source_service').annotate(count=Count('id'))
        service_breakdown = {stat['source_service']: stat['count'] for stat in service_stats}
        
        # Success rate
        success_count = notifications.filter(
            status__in=[NotificationStatus.SENT, NotificationStatus.DELIVERED]
        ).count()
        success_rate = (success_count / total_count * 100) if total_count > 0 else 0
        
        # Failed count
        failed_count = notifications.filter(status=NotificationStatus.FAILED).count()
        failure_rate = (failed_count / total_count * 100) if total_count > 0 else 0
        
        return {
            'total_notifications': total_count,
            'success_count': success_count,
            'failed_count': failed_count,
            'success_rate': round(success_rate, 2),
            'failure_rate': round(failure_rate, 2),
            'status_breakdown': status_breakdown,
            'type_breakdown': type_breakdown,
            'category_breakdown': category_breakdown,
            'service_breakdown': service_breakdown,
            'generated_at': timezone.now().isoformat()
        }


class WebhookService:
    """Service for handling provider webhooks"""
    
    def handle_sendgrid_webhook(self, webhook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle SendGrid webhook events"""
        try:
            from .models import Notification
            
            processed_events = []
            
            for event in webhook_data:
                event_type = event.get('event')
                message_id = event.get('sg_message_id')
                
                if not message_id:
                    continue
                
                try:
                    notification = Notification.objects.get(external_id=message_id)
                    
                    if event_type == 'delivered':
                        notification.status = NotificationStatus.DELIVERED
                    elif event_type in ['bounce', 'dropped']:
                        notification.status = NotificationStatus.FAILED
                        notification.error_message = event.get('reason', 'Email bounced or dropped')
                    elif event_type == 'open':
                        # Update metadata to track opens
                        if not notification.metadata:
                            notification.metadata = {}
                        notification.metadata['opened_at'] = event.get('timestamp')
                    elif event_type == 'click':
                        # Update metadata to track clicks
                        if not notification.metadata:
                            notification.metadata = {}
                        notification.metadata['clicked_at'] = event.get('timestamp')
                        notification.metadata['clicked_url'] = event.get('url')
                    
                    notification.save()
                    processed_events.append({
                        'notification_id': str(notification.id),
                        'event_type': event_type,
                        'processed': True
                    })
                
                except Notification.DoesNotExist:
                    processed_events.append({
                        'message_id': message_id,
                        'event_type': event_type,
                        'processed': False,
                        'error': 'Notification not found'
                    })
            
            return {
                'success': True,
                'processed_events': processed_events
            }
        
        except Exception as exc:
            logger.error(f"Error processing SendGrid webhook: {str(exc)}")
            return {
                'success': False,
                'error': str(exc)
            }
    
    def handle_twilio_webhook(self, webhook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle Twilio webhook events"""
        try:
            from .models import Notification
            
            message_sid = webhook_data.get('MessageSid')
            message_status = webhook_data.get('MessageStatus')
            
            if not message_sid:
                return {
                    'success': False,
                    'error': 'Missing MessageSid'
                }
            
            try:
                notification = Notification.objects.get(external_id=message_sid)
                
                if message_status == 'delivered':
                    notification.status = NotificationStatus.DELIVERED
                elif message_status in ['failed', 'undelivered']:
                    notification.status = NotificationStatus.FAILED
                    notification.error_message = webhook_data.get('ErrorMessage', 'SMS delivery failed')
                
                notification.save()
                
                return {
                    'success': True,
                    'notification_id': str(notification.id),
                    'status_updated': True
                }
            
            except Notification.DoesNotExist:
                return {
                    'success': False,
                    'error': 'Notification not found'
                }
        
        except Exception as exc:
            logger.error(f"Error processing Twilio webhook: {str(exc)}")
            return {
                'success': False,
                'error': str(exc)
            }