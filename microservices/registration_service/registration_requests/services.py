import logging
import requests
import hashlib
import secrets
from typing import Dict, Any, Optional
from django.conf import settings
from django.utils import timezone
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.urls import reverse
from urllib.parse import urlparse
import re

from .models import (
    RegistrationRequest,
    RegistrationRequestLog,
    RegistrationStatus,
    UserRole,
    InstitutionType,
    VerificationSource,
    RiskLevel
)
from .institution_verification import AutomatedInstitutionVerificationService

logger = logging.getLogger(__name__)


class RegistrationService:
    """Service for handling registration request operations."""
    
    @staticmethod
    def create_registration_request(validated_data: Dict[str, Any], password: str, metadata: Dict[str, Any]) -> RegistrationRequest:
        """Create a new registration request with risk assessment."""
        
        # Create registration request
        registration_request = RegistrationRequest.objects.create(
            **validated_data,
            **metadata
        )
        
        # Perform risk assessment
        risk_assessment = RiskAssessmentService.assess_risk(registration_request)
        registration_request.risk_level = risk_assessment['risk_level']
        registration_request.risk_score = risk_assessment['risk_score']
        
        # Generate email verification token
        registration_request.email_verification_token = secrets.token_urlsafe(32)
        
        registration_request.save()
        
        return registration_request
    
    @staticmethod
    def approve_registration_request(registration_request: RegistrationRequest, approved_by: str, notes: str = '') -> Dict[str, Any]:
        """Approve a registration request and create user account."""
        
        # Update status
        old_status = registration_request.status
        registration_request.status = RegistrationStatus.APPROVED
        registration_request.approved_by = approved_by
        registration_request.approval_notes = notes
        registration_request.review_completed_at = timezone.now()
        registration_request.save()
        
        # Log the approval
        RegistrationRequestLog.objects.create(
            registration_request=registration_request,
            action='approved',
            old_status=old_status,
            new_status=RegistrationStatus.APPROVED,
            performed_by=approved_by,
            notes=notes
        )
        
        # Create user account
        user_account_result = RegistrationService._create_user_account(registration_request)
        
        # Send approval email
        EmailNotificationService.send_approval_email(registration_request)
        
        return {
            'approved': True,
            'user_account_created': user_account_result['success'],
            'user_account_id': user_account_result.get('user_id')
        }
    
    @staticmethod
    def reject_registration_request(registration_request: RegistrationRequest, rejected_by: str, reason: str, notes: str = '') -> Dict[str, Any]:
        """Reject a registration request."""
        
        # Update status
        old_status = registration_request.status
        registration_request.status = RegistrationStatus.REJECTED
        registration_request.rejected_by = rejected_by
        registration_request.rejection_reason = reason
        registration_request.review_notes = notes
        registration_request.review_completed_at = timezone.now()
        registration_request.save()
        
        # Log the rejection
        RegistrationRequestLog.objects.create(
            registration_request=registration_request,
            action='rejected',
            old_status=old_status,
            new_status=RegistrationStatus.REJECTED,
            performed_by=rejected_by,
            notes=f"Reason: {reason}. Notes: {notes}"
        )
        
        # Send rejection email
        EmailNotificationService.send_rejection_email(registration_request)
        
        return {'rejected': True}
    
    @staticmethod
    def _create_user_account(registration_request: RegistrationRequest) -> Dict[str, Any]:
        """Create user account in auth service."""
        try:
            # Prepare user data
            user_data = {
                'email': registration_request.email,
                'first_name': registration_request.first_name,
                'last_name': registration_request.last_name,
                'phone_number': registration_request.phone_number,
                'role': registration_request.role,
                'is_active': True,
                'email_verified': True,
                'registration_request_id': str(registration_request.id)
            }
            
            # Add organization data if applicable
            if registration_request.is_institution_role or registration_request.is_employer_role:
                user_data.update({
                    'organization_name': registration_request.organization_name,
                    'organization_type': registration_request.organization_type,
                    'organization_website': registration_request.organization_website,
                })
            
            # Call auth service to create user
            auth_service_url = getattr(settings, 'AUTH_SERVICE_URL', 'http://localhost:8001')
            response = requests.post(
                f"{auth_service_url}/api/users/create-from-registration/",
                json=user_data,
                headers={
                    'Authorization': f"Bearer {getattr(settings, 'INTERNAL_SERVICE_TOKEN', '')}",
                    'Content-Type': 'application/json'
                },
                timeout=30
            )
            
            if response.status_code == 201:
                user_account_data = response.json()
                registration_request.user_account_created = True
                registration_request.user_account_id = user_account_data.get('id')
                registration_request.save()
                
                return {
                    'success': True,
                    'user_id': user_account_data.get('id'),
                    'user_data': user_account_data
                }
            else:
                logger.error(f"Failed to create user account: {response.text}")
                return {
                    'success': False,
                    'error': f"Auth service error: {response.status_code}"
                }
        
        except Exception as e:
            logger.error(f"Error creating user account: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }


class EmailVerificationService:
    """Service for handling email verification."""
    
    @staticmethod
    def send_verification_email(registration_request: RegistrationRequest) -> bool:
        """Send email verification email."""
        logger.info(f"Starting email verification for request {registration_request.request_number}")
        try:
            # Store old status before changing it
            old_status = registration_request.status
            
            # Update status
            registration_request.status = RegistrationStatus.EMAIL_VERIFICATION_SENT
            registration_request.email_verification_sent_at = timezone.now()
            registration_request.save()
            logger.info(f"Updated status for request {registration_request.request_number}")
            
            # Generate verification URL
            verification_url = f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}/verify-email.html?token={registration_request.email_verification_token}"
            
            # Send email
            subject = 'Verify Your Email - Edulink Registration'
            
            # Calculate expiration hours
            expires_in_hours = 24  # Default 24 hours
            if hasattr(settings, 'EMAIL_VERIFICATION_EXPIRY_HOURS'):
                expires_in_hours = settings.EMAIL_VERIFICATION_EXPIRY_HOURS
            
            # Prepare template context
            context = {
                'registration_request': registration_request,
                'verification_url': verification_url,
                'first_name': registration_request.first_name,
                'request_number': registration_request.request_number,
                'email': registration_request.email,
                'expires_in_hours': expires_in_hours,
                'current_year': timezone.now().year
            }
            
            message = render_to_string('emails/email_verification.html', context)
            
            logger.info(f"Sending email to {registration_request.email} with token {registration_request.email_verification_token}")
            send_mail(
                subject=subject,
                message='',
                html_message=message,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@edulink.com'),
                recipient_list=[registration_request.email],
                fail_silently=False
            )
            logger.info(f"Email sent successfully to {registration_request.email}")
            
            # Log the action
            RegistrationRequestLog.objects.create(
                registration_request=registration_request,
                action='email_verification_sent',
                old_status=old_status,
                new_status=RegistrationStatus.EMAIL_VERIFICATION_SENT,
                performed_by='system',
                notes='Email verification sent'
            )
            
            return True
        
        except Exception as e:
            logger.error(f"Failed to send verification email: {str(e)}")
            return False
    
    @staticmethod
    def verify_email(token: str) -> RegistrationRequest:
        """Verify email using token."""
        registration_request = RegistrationRequest.objects.get(
            email_verification_token=token,
            status=RegistrationStatus.EMAIL_VERIFICATION_SENT
        )
        
        if registration_request.is_expired:
            raise ValueError("Verification token has expired")
        
        # Update status
        old_status = registration_request.status
        registration_request.status = RegistrationStatus.EMAIL_VERIFIED
        registration_request.email_verified = True
        registration_request.email_verification_token = ''  # Clear token
        registration_request.save()
        
        # Log the verification
        RegistrationRequestLog.objects.create(
            registration_request=registration_request,
            action='email_verified',
            old_status=old_status,
            new_status=RegistrationStatus.EMAIL_VERIFIED,
            performed_by='user',
            notes='Email verified by user'
        )
        
        # Trigger next verification step
        EmailVerificationService._trigger_next_verification_step(registration_request)
        
        return registration_request
    
    @staticmethod
    def _trigger_next_verification_step(registration_request: RegistrationRequest):
        """Trigger the next verification step based on role and risk level."""
        
        # For low-risk requests, auto-approve
        if registration_request.risk_level == RiskLevel.LOW:
            if registration_request.role == UserRole.STUDENT:
                # Students with low risk can be auto-approved
                RegistrationService.approve_registration_request(
                    registration_request,
                    approved_by='system_auto_approval',
                    notes='Auto-approved: Low risk student registration'
                )
                return
        
        # For institution admins, trigger domain verification
        if registration_request.is_institution_role and registration_request.organization_website:
            DomainVerificationService.initiate_domain_verification(registration_request)
        
        # For medium/high risk or no domain, move to review
        elif registration_request.risk_level in [RiskLevel.MEDIUM, RiskLevel.HIGH]:
            registration_request.status = RegistrationStatus.UNDER_REVIEW
            registration_request.save()
            
            # Notify admins
            EmailNotificationService.send_admin_review_notification(registration_request)


class DomainVerificationService:
    """Service for handling domain verification."""
    
    @staticmethod
    def initiate_domain_verification(registration_request: RegistrationRequest):
        """Initiate domain verification process."""
        registration_request.status = RegistrationStatus.DOMAIN_VERIFICATION_PENDING
        registration_request.save()
        
        # Log the initiation
        RegistrationRequestLog.objects.create(
            registration_request=registration_request,
            action='domain_verification_initiated',
            new_status=RegistrationStatus.DOMAIN_VERIFICATION_PENDING,
            performed_by='system',
            notes='Domain verification initiated'
        )
    
    @staticmethod
    def verify_domain(registration_request: RegistrationRequest, verification_method: str, verification_details: Dict[str, Any]) -> Dict[str, Any]:
        """Verify organization domain."""
        
        try:
            if verification_method == VerificationSource.DOMAIN:
                result = DomainVerificationService._verify_domain_ownership(registration_request)
            elif verification_method == VerificationSource.MANUAL:
                result = DomainVerificationService._manual_domain_verification(registration_request, verification_details)
            else:
                result = {'verified': False, 'error': 'Invalid verification method'}
            
            if result['verified']:
                # Update registration request
                registration_request.domain_verified = True
                registration_request.domain_verification_method = verification_method
                registration_request.domain_verification_details = verification_details
                registration_request.status = RegistrationStatus.DOMAIN_VERIFIED
                registration_request.save()
                
                # Log the verification
                RegistrationRequestLog.objects.create(
                    registration_request=registration_request,
                    action='domain_verified',
                    new_status=RegistrationStatus.DOMAIN_VERIFIED,
                    performed_by='system',
                    notes=f'Domain verified using {verification_method}'
                )
                
                # Trigger institutional verification if needed
                if registration_request.requires_institutional_verification:
                    InstitutionalVerificationService.initiate_institutional_verification(registration_request)
                else:
                    # Move to review
                    registration_request.status = RegistrationStatus.UNDER_REVIEW
                    registration_request.save()
            
            return result
        
        except Exception as e:
            logger.error(f"Domain verification failed: {str(e)}")
            return {'verified': False, 'error': str(e)}
    
    @staticmethod
    def _verify_domain_ownership(registration_request: RegistrationRequest) -> Dict[str, Any]:
        """Verify domain ownership through DNS or HTTP verification."""
        
        try:
            domain = urlparse(registration_request.organization_website).netloc
            email_domain = registration_request.email.split('@')[1]
            
            # Check if email domain matches organization domain
            if domain.lower() == email_domain.lower():
                return {
                    'verified': True,
                    'method': 'email_domain_match',
                    'details': {
                        'organization_domain': domain,
                        'email_domain': email_domain
                    }
                }
            
            # Check for subdomain match
            if email_domain.endswith(f'.{domain}') or domain.endswith(f'.{email_domain}'):
                return {
                    'verified': True,
                    'method': 'subdomain_match',
                    'details': {
                        'organization_domain': domain,
                        'email_domain': email_domain
                    }
                }
            
            return {
                'verified': False,
                'error': 'Email domain does not match organization domain',
                'details': {
                    'organization_domain': domain,
                    'email_domain': email_domain
                }
            }
        
        except Exception as e:
            return {
                'verified': False,
                'error': f'Domain verification failed: {str(e)}'
            }
    
    @staticmethod
    def _manual_domain_verification(registration_request: RegistrationRequest, verification_details: Dict[str, Any]) -> Dict[str, Any]:
        """Manual domain verification by admin."""
        
        return {
            'verified': True,
            'method': 'manual_verification',
            'details': verification_details
        }


class InstitutionalVerificationService:
    """Service for handling institutional verification with Kenyan authorities."""
    
    @staticmethod
    def initiate_institutional_verification(registration_request: RegistrationRequest):
        """Initiate institutional verification process."""
        registration_request.status = RegistrationStatus.INSTITUTIONAL_VERIFICATION_PENDING
        registration_request.save()
        
        # Log the initiation
        RegistrationRequestLog.objects.create(
            registration_request=registration_request,
            action='institutional_verification_initiated',
            new_status=RegistrationStatus.INSTITUTIONAL_VERIFICATION_PENDING,
            performed_by='system',
            notes='Institutional verification initiated'
        )
    
    @staticmethod
    def verify_institution(registration_request: RegistrationRequest) -> Dict[str, Any]:
        """Verify institution using automated verification first, then fallback to external APIs."""
        
        # First try automated verification against master database
        automated_service = AutomatedInstitutionVerificationService()
        automated_result = automated_service.verify_institution(registration_request)
        
        if automated_result:
            return {
                'verified': True,
                'source': VerificationSource.AUTOMATED,
                'details': automated_result
            }
            
        # Fallback to external API verification
        verification_authority = registration_request.get_verification_authority()
        
        if verification_authority == VerificationSource.CUE:
            return InstitutionalVerificationService._verify_with_cue(registration_request)
        elif verification_authority == VerificationSource.TVETA:
            return InstitutionalVerificationService._verify_with_tveta(registration_request)
        else:
            return InstitutionalVerificationService._manual_institutional_verification(registration_request)
    
    @staticmethod
    def _verify_with_cue(registration_request: RegistrationRequest) -> Dict[str, Any]:
        """Verify institution with Commission for University Education (CUE)."""
        
        try:
            # In a real implementation, this would call CUE's API
            # For now, we'll simulate the verification
            
            cue_api_url = getattr(settings, 'CUE_API_URL', None)
            if not cue_api_url:
                # Fallback to manual verification
                return InstitutionalVerificationService._manual_institutional_verification(registration_request)
            
            # Simulate API call
            verification_data = {
                'institution_name': registration_request.organization_name,
                'registration_number': registration_request.institution_registration_number,
                'website': registration_request.organization_website
            }
            
            # TODO: Implement actual CUE API integration
            # response = requests.post(f"{cue_api_url}/verify", json=verification_data)
            
            # For now, simulate successful verification for known patterns
            if InstitutionalVerificationService._is_known_kenyan_institution(registration_request.organization_name):
                result = {
                    'verified': True,
                    'source': VerificationSource.CUE,
                    'details': {
                        'institution_name': registration_request.organization_name,
                        'accreditation_status': 'Accredited',
                        'verification_date': timezone.now().isoformat()
                    }
                }
            else:
                result = {
                    'verified': False,
                    'source': VerificationSource.CUE,
                    'error': 'Institution not found in CUE registry'
                }
            
            if result['verified']:
                registration_request.institutional_verified = True
                registration_request.institutional_verification_source = VerificationSource.CUE
                registration_request.institutional_verification_details = result['details']
                registration_request.cue_accreditation_status = result['details'].get('accreditation_status')
                registration_request.status = RegistrationStatus.INSTITUTIONAL_VERIFIED
                registration_request.save()
                
                # Move to review
                registration_request.status = RegistrationStatus.UNDER_REVIEW
                registration_request.save()
            
            return result
        
        except Exception as e:
            logger.error(f"CUE verification failed: {str(e)}")
            return {
                'verified': False,
                'error': f'CUE verification failed: {str(e)}'
            }
    
    @staticmethod
    def _verify_with_tveta(registration_request: RegistrationRequest) -> Dict[str, Any]:
        """Verify institution with Technical and Vocational Education and Training Authority (TVETA)."""
        
        try:
            # In a real implementation, this would call TVETA's API
            # For now, we'll simulate the verification
            
            tveta_api_url = getattr(settings, 'TVETA_API_URL', None)
            if not tveta_api_url:
                # Fallback to manual verification
                return InstitutionalVerificationService._manual_institutional_verification(registration_request)
            
            # Simulate API call
            verification_data = {
                'institution_name': registration_request.organization_name,
                'registration_number': registration_request.institution_registration_number,
                'institution_type': registration_request.organization_type
            }
            
            # TODO: Implement actual TVETA API integration
            # response = requests.post(f"{tveta_api_url}/verify", json=verification_data)
            
            # For now, simulate successful verification for known patterns
            if InstitutionalVerificationService._is_known_tvet_institution(registration_request.organization_name):
                result = {
                    'verified': True,
                    'source': VerificationSource.TVETA,
                    'details': {
                        'institution_name': registration_request.organization_name,
                        'registration_status': 'Registered',
                        'institution_type': registration_request.organization_type,
                        'verification_date': timezone.now().isoformat()
                    }
                }
            else:
                result = {
                    'verified': False,
                    'source': VerificationSource.TVETA,
                    'error': 'Institution not found in TVETA registry'
                }
            
            if result['verified']:
                registration_request.institutional_verified = True
                registration_request.institutional_verification_source = VerificationSource.TVETA
                registration_request.institutional_verification_details = result['details']
                registration_request.tveta_registration_status = result['details'].get('registration_status')
                registration_request.status = RegistrationStatus.INSTITUTIONAL_VERIFIED
                registration_request.save()
                
                # Move to review
                registration_request.status = RegistrationStatus.UNDER_REVIEW
                registration_request.save()
            
            return result
        
        except Exception as e:
            logger.error(f"TVETA verification failed: {str(e)}")
            return {
                'verified': False,
                'error': f'TVETA verification failed: {str(e)}'
            }
    
    @staticmethod
    def _manual_institutional_verification(registration_request: RegistrationRequest) -> Dict[str, Any]:
        """Manual institutional verification."""
        
        return {
            'verified': False,
            'source': VerificationSource.MANUAL,
            'error': 'Manual verification required - please contact administrator'
        }
    
    @staticmethod
    def _is_known_kenyan_institution(institution_name: str) -> bool:
        """Check if institution is a known Kenyan university."""
        
        known_universities = [
            'university of nairobi', 'kenyatta university', 'moi university',
            'egerton university', 'jomo kenyatta university', 'maseno university',
            'strathmore university', 'united states international university',
            'catholic university of eastern africa', 'daystar university'
        ]
        
        return any(known in institution_name.lower() for known in known_universities)
    
    @staticmethod
    def _is_known_tvet_institution(institution_name: str) -> bool:
        """Check if institution is a known TVET institution."""
        
        tvet_keywords = [
            'polytechnic', 'technical training institute', 'vocational training',
            'tti', 'vtc', 'technical college', 'institute of technology'
        ]
        
        return any(keyword in institution_name.lower() for keyword in tvet_keywords)


class RiskAssessmentService:
    """Service for assessing registration request risk."""
    
    @staticmethod
    def assess_risk(registration_request: RegistrationRequest) -> Dict[str, Any]:
        """Assess risk level for registration request."""
        
        risk_score = 0.0
        risk_factors = []
        
        # Email domain risk assessment
        email_domain = registration_request.email.split('@')[1]
        email_risk = RiskAssessmentService._assess_email_domain_risk(email_domain)
        risk_score += email_risk['score']
        risk_factors.extend(email_risk['factors'])
        
        # Organization website risk assessment
        if registration_request.organization_website:
            website_risk = RiskAssessmentService._assess_website_risk(registration_request.organization_website)
            risk_score += website_risk['score']
            risk_factors.extend(website_risk['factors'])
        
        # Role-based risk assessment
        role_risk = RiskAssessmentService._assess_role_risk(registration_request.role)
        risk_score += role_risk['score']
        risk_factors.extend(role_risk['factors'])
        
        # Institution type risk assessment
        if registration_request.organization_type:
            institution_risk = RiskAssessmentService._assess_institution_type_risk(registration_request.organization_type)
            risk_score += institution_risk['score']
            risk_factors.extend(institution_risk['factors'])
        
        # Normalize risk score (0.0 to 1.0)
        risk_score = min(risk_score, 1.0)
        
        # Determine risk level
        if risk_score <= 0.3:
            risk_level = RiskLevel.LOW
        elif risk_score <= 0.6:
            risk_level = RiskLevel.MEDIUM
        elif risk_score <= 0.8:
            risk_level = RiskLevel.HIGH
        else:
            risk_level = RiskLevel.CRITICAL
        
        return {
            'risk_score': risk_score,
            'risk_level': risk_level,
            'risk_factors': risk_factors
        }
    
    @staticmethod
    def _assess_email_domain_risk(email_domain: str) -> Dict[str, Any]:
        """Assess risk based on email domain."""
        
        risk_score = 0.0
        factors = []
        
        # Free email providers (higher risk)
        free_providers = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com']
        if email_domain.lower() in free_providers:
            risk_score += 0.3
            factors.append(f'Free email provider: {email_domain}')
        
        # Kenyan educational domains (lower risk)
        kenyan_edu_domains = ['.ac.ke', '.edu.ke']
        if any(email_domain.endswith(domain) for domain in kenyan_edu_domains):
            risk_score -= 0.2
            factors.append(f'Kenyan educational domain: {email_domain}')
        
        # Suspicious patterns
        suspicious_patterns = [r'\d{4,}', r'temp', r'test', r'fake']
        if any(re.search(pattern, email_domain, re.IGNORECASE) for pattern in suspicious_patterns):
            risk_score += 0.4
            factors.append(f'Suspicious domain pattern: {email_domain}')
        
        return {
            'score': max(0.0, risk_score),
            'factors': factors
        }
    
    @staticmethod
    def _assess_website_risk(website: str) -> Dict[str, Any]:
        """Assess risk based on organization website."""
        
        risk_score = 0.0
        factors = []
        
        try:
            domain = urlparse(website).netloc
            
            # Kenyan domains (lower risk)
            if domain.endswith('.ke'):
                risk_score -= 0.1
                factors.append(f'Kenyan domain: {domain}')
            
            # Educational domains (lower risk)
            edu_patterns = ['.edu', '.ac.', '.university']
            if any(pattern in domain for pattern in edu_patterns):
                risk_score -= 0.2
                factors.append(f'Educational domain: {domain}')
            
            # Suspicious TLDs (higher risk)
            suspicious_tlds = ['.tk', '.ml', '.ga', '.cf']
            if any(domain.endswith(tld) for tld in suspicious_tlds):
                risk_score += 0.3
                factors.append(f'Suspicious TLD: {domain}')
        
        except Exception:
            risk_score += 0.2
            factors.append('Invalid website URL')
        
        return {
            'score': max(0.0, risk_score),
            'factors': factors
        }
    
    @staticmethod
    def _assess_role_risk(role: str) -> Dict[str, Any]:
        """Assess risk based on user role."""
        
        risk_scores = {
            UserRole.STUDENT: 0.1,
            UserRole.EMPLOYER: 0.2,
            UserRole.INSTITUTION_ADMIN: 0.3
        }
        
        risk_score = risk_scores.get(role, 0.4)
        factors = [f'Role: {role}']
        
        return {
            'score': risk_score,
            'factors': factors
        }
    
    @staticmethod
    def _assess_institution_type_risk(institution_type: str) -> Dict[str, Any]:
        """Assess risk based on institution type."""
        
        # Lower risk for well-regulated institution types
        low_risk_types = [
            InstitutionType.PUBLIC_UNIVERSITY,
            InstitutionType.NATIONAL_POLYTECHNIC,
            InstitutionType.TECHNICAL_TRAINING_INSTITUTE
        ]
        
        # Medium risk for private institutions
        medium_risk_types = [
            InstitutionType.PRIVATE_UNIVERSITY,
            InstitutionType.UNIVERSITY_COLLEGE,
            InstitutionType.TECHNICAL_TRAINER_COLLEGE
        ]
        
        if institution_type in low_risk_types:
            risk_score = 0.0
            factors = [f'Low-risk institution type: {institution_type}']
        elif institution_type in medium_risk_types:
            risk_score = 0.1
            factors = [f'Medium-risk institution type: {institution_type}']
        else:
            risk_score = 0.2
            factors = [f'Higher-risk institution type: {institution_type}']
        
        return {
            'score': risk_score,
            'factors': factors
        }


class EmailNotificationService:
    """Service for sending email notifications."""
    
    @staticmethod
    def send_approval_email(registration_request: RegistrationRequest):
        """Send approval notification email."""
        try:
            subject = 'Registration Approved - Welcome to Edulink!'
            message = render_to_string('emails/registration_approved.html', {
                'registration_request': registration_request,
                'login_url': f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}/login"
            })
            
            send_mail(
                subject=subject,
                message='',
                html_message=message,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@edulink.com'),
                recipient_list=[registration_request.email],
                fail_silently=False
            )
        
        except Exception as e:
            logger.error(f"Failed to send approval email: {str(e)}")
    
    @staticmethod
    def send_rejection_email(registration_request: RegistrationRequest):
        """Send rejection notification email."""
        try:
            subject = 'Registration Update - Edulink'
            message = render_to_string('emails/registration_rejected.html', {
                'registration_request': registration_request
            })
            
            send_mail(
                subject=subject,
                message='',
                html_message=message,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@edulink.com'),
                recipient_list=[registration_request.email],
                fail_silently=False
            )
        
        except Exception as e:
            logger.error(f"Failed to send rejection email: {str(e)}")
    
    @staticmethod
    def send_admin_review_notification(registration_request: RegistrationRequest):
        """Send notification to admins for review."""
        try:
            admin_emails = getattr(settings, 'ADMIN_NOTIFICATION_EMAILS', [])
            if not admin_emails:
                return
            
            subject = f'New Registration Request - {registration_request.request_number}'
            message = render_to_string('emails/admin_review_notification.html', {
                'registration_request': registration_request,
                'admin_url': f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}/admin/registrations/{registration_request.id}"
            })
            
            send_mail(
                subject=subject,
                message='',
                html_message=message,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@edulink.com'),
                recipient_list=admin_emails,
                fail_silently=False
            )
        
        except Exception as e:
            logger.error(f"Failed to send admin notification: {str(e)}")