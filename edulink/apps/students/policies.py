"""
Domain rules and policies for the students app.

Purpose: Encapsulate permissions, rules, or conditional logic that can be reused 
across services or views. Handles business constraints and policy evaluation.

Guidelines:
- No DB writes, just boolean or policy evaluation
- Keeps services clean and reusable
- Often used by services to guard actions
"""

from typing import Optional
from django.contrib.auth import get_user_model

User = get_user_model()


def is_student(user: User) -> bool:
    """
    Check if the user is a student.
    """
    if not user or not user.is_authenticated:
        return False
    return user.role == User.ROLE_STUDENT


def can_student_apply_for_internship(*, student_id: str, required_trust_level: int = 2) -> bool:
    """
    Check if a student can apply for internships based on their trust tier.
    
    Business Rule: Students with Level < 2 cannot apply for certain internships
    """
    from edulink.apps.trust.services import compute_student_trust_tier
    
    trust_info = compute_student_trust_tier(student_id=student_id)
    return trust_info['tier_level'] >= required_trust_level


def can_institution_verify_student(*, institution_id: str, student_id: str) -> bool:
    """
    Check if an institution can verify a student.
    
    Business Rule: Institutions cannot verify students from another domain
    """
    from .models import Student
    
    try:
        student = Student.objects.get(id=student_id)
        # Institution can only verify students that belong to their domain
        return str(student.institution_id) == institution_id
    except Student.DoesNotExist:
        return False


def can_student_upload_documents(*, student_id: str) -> bool:
    """
    Check if a student can upload documents.
    
    Business Rule: Any registered student can upload documents
    """
    from .models import Student
    
    return Student.objects.filter(id=student_id).exists()


def can_supervisor_approve_activity(*, supervisor_id: str, student_id: str) -> bool:
    """
    Check if a supervisor can approve a student's activity.
    
    Business Rule: Supervisors can only approve activities for students 
    they are assigned to supervise via an active internship.
    """
    from .models import Student
    from edulink.apps.employers.queries import supervisor_exists
    from edulink.apps.internships.queries import check_supervisor_assigned_to_student
    
    # Check if student exists
    if not Student.objects.filter(id=student_id).exists():
        return False
        
    # Check if supervisor exists
    if not supervisor_exists(supervisor_id=supervisor_id):
        return False
        
    # Delegate relationship check to the owning app (internships)
    return check_supervisor_assigned_to_student(
        supervisor_id=supervisor_id, 
        student_id=student_id
    )


def can_manage_affiliation(*, user, affiliation) -> bool:
    """
    Check if a user can manage a specific affiliation.
    """
    if user.is_system_admin:
        return True
        
    if user.is_institution_admin:
        from .queries import get_institution_id_for_user
        institution_id = get_institution_id_for_user(user)
        return str(affiliation.institution_id) == institution_id
        
    return False


def can_institution_certify_completion(*, institution_id: str, student_id: str) -> bool:
    """
    Check if an institution can certify a student's internship completion.
    
    Business Rule: Institutions can only certify students from their own institution
    and students must have completed required activities
    """
    from .models import Student
    from edulink.apps.trust.services import compute_student_trust_tier
    
    try:
        student = Student.objects.get(id=student_id)
        
        # Check student belongs to institution
        if str(student.institution_id) != institution_id:
            return False
        
        # Check student has reached sufficient trust level (Level 3+)
        trust_info = compute_student_trust_tier(student_id=student_id)
        return trust_info['tier_level'] >= 3
        
    except Student.DoesNotExist:
        return False
