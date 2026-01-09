"""Comprehensive validation system for application business logic"""

from django.core.exceptions import ValidationError
from django.utils import timezone
from django.contrib.auth import get_user_model
from datetime import datetime, timedelta

User = get_user_model()

class ApplicationValidator:
    """Comprehensive application validation"""
    
    @staticmethod
    def validate_internship_eligibility(user, internship):
        """Validate if user is eligible to apply for internship"""
        errors = []
        
        # Check if internship is active
        if not internship.is_active:
            errors.append("Cannot apply to inactive internship")
        
        # Check if internship is expired
        if internship.deadline < timezone.now():
            errors.append("Cannot apply to expired internship")
        
        # Check if internship is verified (optional based on business rules)
        if not internship.is_verified:
            errors.append("Cannot apply to unverified internship")
        
        # Check if user has student profile
        if not hasattr(user, 'student_profile'):
            errors.append("Only students can apply to internships")
        
        # Check institution matching for institution-specific internships
        if hasattr(user, 'student_profile') and internship.visibility == 'institution-only':
            student_institution = user.student_profile.institution
            if not student_institution:
                errors.append("Student must be associated with an institution")
            elif student_institution != internship.institution:
                errors.append("Student institution does not match internship institution")
        
        # Check if student institution is verified
        if hasattr(user, 'student_profile') and user.student_profile.institution:
            if not user.student_profile.institution.is_verified:
                errors.append("Student's institution must be verified")
        
        # Check if student profile is complete enough
        if hasattr(user, 'student_profile'):
            completion = user.student_profile.profile_completion
            if completion < 70:  # Require at least 70% completion
                errors.append(f"Profile completion must be at least 70% (current: {completion}%)")
        
        if errors:
            raise ValidationError(errors)
        
        return True
    
    @staticmethod
    def validate_duplicate_application(user, internship):
        """Check for duplicate applications"""
        from .models import Application
        
        existing_application = Application.objects.filter(
            student=user,
            internship=internship
        ).first()
        
        if existing_application:
            raise ValidationError(
                f"You have already applied to this internship. "
                f"Application status: {existing_application.status}"
            )
        
        return True
    
    @staticmethod
    def validate_application_limit(user, internship=None):
        """Validate application limits per user"""
        from .models import Application
        
        # Check daily application limit
        today = timezone.now().date()
        daily_applications = Application.objects.filter(
            student=user,
            created_at__date=today
        ).count()
        
        daily_limit = 5  # Maximum 5 applications per day
        if daily_applications >= daily_limit:
            raise ValidationError(
                f"Daily application limit reached ({daily_limit}). "
                f"Please try again tomorrow."
            )
        
        # Check monthly application limit
        month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        monthly_applications = Application.objects.filter(
            student=user,
            created_at__gte=month_start
        ).count()
        
        monthly_limit = 50  # Maximum 50 applications per month
        if monthly_applications >= monthly_limit:
            raise ValidationError(
                f"Monthly application limit reached ({monthly_limit}). "
                f"Please wait until next month."
            )
        
        return True
    
    @staticmethod
    def validate_application_status_transition(application, new_status, user):
        """Validate application status transitions"""
        current_status = application.status
        
        # Define valid status transitions
        valid_transitions = {
            'pending': ['reviewed', 'rejected', 'withdrawn'],
            'reviewed': ['interview_scheduled', 'accepted', 'rejected', 'withdrawn'],
            'interview_scheduled': ['accepted', 'rejected', 'withdrawn'],
            'accepted': ['withdrawn'],  # Only withdrawal allowed after acceptance
            'rejected': [],   # Final state
            'withdrawn': [],  # Final state
        }
        
        if new_status not in valid_transitions.get(current_status, []):
            raise ValidationError(
                f"Invalid status transition from '{current_status}' to '{new_status}'"
            )
        
        # Check user permissions for status changes
        if not ApplicationValidator.can_change_status(application, new_status, user):
            raise ValidationError(
                f"You don't have permission to change status to '{new_status}'"
            )
        
        return True
    
    @staticmethod
    def can_change_status(application, new_status, user):
        """Check if user can change application status"""
        # Students can only withdraw their applications
        if hasattr(user, 'student_profile'):
            return new_status == 'withdrawn' and application.student == user
        
        # Employers can change status for their internships
        if hasattr(user, 'employer_profile'):
            return application.internship.employer == user.employer_profile
        
        # Institution admins can change status for their institution's internships
        if hasattr(user, 'institution_profile'):
            return application.internship.institution == user.institution_profile.institution
        
        # Superusers can change any status
        return user.is_superuser
    
    @staticmethod
    def validate_internship_requirements(user, internship):
        """Validate if student meets internship requirements"""
        errors = []
        
        if not hasattr(user, 'student_profile'):
            errors.append("Only students can apply to internships")
            return errors
        
        student = user.student_profile
        
        # Check year of study requirements
        if hasattr(internship, 'min_year_of_study') and internship.min_year_of_study:
            if student.year_of_study < internship.min_year_of_study:
                errors.append(
                    f"Minimum year of study required: {internship.min_year_of_study} "
                    f"(you are in year {student.year_of_study})"
                )
        
        # Check course requirements
        if hasattr(internship, 'required_courses') and internship.required_courses:
            if student.course not in internship.required_courses.all():
                required_courses = ", ".join([c.name for c in internship.required_courses.all()])
                errors.append(f"Required courses: {required_courses}")
        
        # Check skill requirements
        if hasattr(internship, 'required_skills') and internship.required_skills:
            student_skills = set(student.skills) if student.skills else set()
            required_skills = set(internship.required_skills)  # required_skills is already a list
            missing_skills = required_skills - student_skills
            
            if missing_skills:
                errors.append(f"Missing required skills: {', '.join(missing_skills)}")
        
        # Check GPA requirements (if implemented)
        if hasattr(internship, 'min_gpa') and internship.min_gpa:
            if hasattr(student, 'gpa') and student.gpa:
                if student.gpa < internship.min_gpa:
                    errors.append(f"Minimum GPA required: {internship.min_gpa} (your GPA: {student.gpa})")
        
        if errors:
            raise ValidationError(errors)
        
        return True

class InternshipValidator:
    """Validation for internship creation and updates"""
    
    @staticmethod
    def validate_internship_dates(start_date, end_date, deadline):
        """Validate internship date logic"""
        errors = []
        now = timezone.now().date()
        
        # Deadline must be in the future
        if deadline <= now:
            errors.append("Application deadline must be in the future")
        
        # Start date must be after deadline
        if start_date <= deadline:
            errors.append("Internship start date must be after application deadline")
        
        # End date must be after start date
        if end_date <= start_date:
            errors.append("Internship end date must be after start date")
        
        # Minimum internship duration (e.g., 4 weeks)
        min_duration = timedelta(weeks=4)
        if (end_date - start_date) < min_duration:
            errors.append(f"Minimum internship duration is {min_duration.days} days")
        
        # Maximum internship duration (e.g., 1 year)
        max_duration = timedelta(days=365)
        if (end_date - start_date) > max_duration:
            errors.append(f"Maximum internship duration is {max_duration.days} days")
        
        if errors:
            raise ValidationError(errors)
        
        return True
    
    @staticmethod
    def validate_employer_eligibility(user):
        """Validate if user can create internships"""
        if not hasattr(user, 'employer_profile'):
            raise ValidationError("Only employers can create internships")
        
        employer = user.employer_profile
        
        if not employer.is_verified:
            raise ValidationError("Employer must be verified to create internships")
        
        if not employer.is_active:
            raise ValidationError("Employer account is not active")
        
        return True
    
    @staticmethod
    def validate_internship_content(title, description, requirements):
        """Validate internship content quality"""
        errors = []
        
        # Title validation
        if len(title) < 10:
            errors.append("Internship title must be at least 10 characters long")
        
        if len(title) > 200:
            errors.append("Internship title must be less than 200 characters")
        
        # Description validation
        if len(description) < 100:
            errors.append("Internship description must be at least 100 characters long")
        
        if len(description) > 5000:
            errors.append("Internship description must be less than 5000 characters")
        
        # Requirements validation
        if requirements and len(requirements) < 50:
            errors.append("Internship requirements must be at least 50 characters long")
        
        # Check for spam/inappropriate content (basic)
        spam_keywords = ['click here', 'guaranteed', 'make money fast', 'no experience needed']
        content_to_check = f"{title} {description} {requirements or ''}".lower()
        
        for keyword in spam_keywords:
            if keyword in content_to_check:
                errors.append(f"Content contains inappropriate keyword: '{keyword}'")
        
        if errors:
            raise ValidationError(errors)
        
        return True

class RegistrationValidator:
    """Validation for user registration"""
    
    @staticmethod
    def validate_student_registration_invite(invite_token, institution_id):
        """Validate student registration invite"""
        from institutions.models import Institution, StudentInvite
        
        try:
            invite = StudentInvite.objects.get(
                token=invite_token,
                is_used=False,
                expires_at__gt=timezone.now()
            )
        except StudentInvite.DoesNotExist:
            raise ValidationError("Invalid or expired invitation token")
        
        if invite.institution_id != institution_id:
            raise ValidationError("Institution mismatch with invitation")
        
        if not invite.institution.is_verified:
            raise ValidationError("Institution must be verified")
        
        return invite
    
    @staticmethod
    def validate_employer_registration(company_data):
        """Validate employer registration data"""
        errors = []
        
        required_fields = ['company_name', 'industry', 'company_size', 'website']
        for field in required_fields:
            if not company_data.get(field):
                errors.append(f"Field '{field}' is required")
        
        # Validate website URL
        website = company_data.get('website')
        if website and not website.startswith(('http://', 'https://')):
            errors.append("Website must be a valid URL")
        
        # Validate company size
        valid_sizes = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
        if company_data.get('company_size') not in valid_sizes:
            errors.append(f"Company size must be one of: {', '.join(valid_sizes)}")
        
        if errors:
            raise ValidationError(errors)
        
        return True
    
    @staticmethod
    def validate_institution_registration(institution_data):
        """Validate institution registration data"""
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Validating institution data: {institution_data}")
        
        errors = []
        
        required_fields = ['name', 'institution_type', 'registration_number', 'website']
        for field in required_fields:
            if not institution_data.get(field):
                errors.append(f"Field '{field}' is required")
                logger.warning(f"Missing required field: {field}")
        
        # Validate institution name length
        name = institution_data.get('name', '')
        if len(name) < 3:
            errors.append("Institution name must be at least 3 characters long")
        if len(name) > 200:
            errors.append("Institution name must be less than 200 characters")
        
        # Validate institution type
        valid_types = ['university', 'college', 'technical_institute', 'vocational_school', 'other']
        if institution_data.get('institution_type') not in valid_types:
            errors.append(f"Institution type must be one of: {', '.join(valid_types)}")
        
        # Validate registration number
        reg_number = institution_data.get('registration_number', '')
        if len(reg_number) < 5:
            errors.append("Registration number must be at least 5 characters long")
        
        # Validate website URL
        website = institution_data.get('website')
        if website and not website.startswith(('http://', 'https://')):
            errors.append("Website must be a valid URL")
        
        if errors:
            raise ValidationError(errors)
        
        return True