from django.db import models
from edulink.shared.db.base_models import BaseModel
from .constants import TRUST_TIER_LEVELS, TRUST_EVENT_POINTS, TRUST_TIER_THRESHOLDS

class StudentInstitutionAffiliation(BaseModel):
    STATUS_PENDING = "pending"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"
    
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_APPROVED, "Approved"),
        (STATUS_REJECTED, "Rejected"),
    ]
    
    CLAIMED_VIA_DOMAIN = "domain"
    CLAIMED_VIA_MANUAL = "manual"
    
    CLAIMED_VIA_CHOICES = [
        (CLAIMED_VIA_DOMAIN, "Domain"),
        (CLAIMED_VIA_MANUAL, "Manual"),
    ]
    
    student_id = models.UUIDField()
    institution_id = models.UUIDField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    claimed_via = models.CharField(max_length=20, choices=CLAIMED_VIA_CHOICES)
    reviewed_by = models.UUIDField(null=True, blank=True)
    review_notes = models.TextField(blank=True)
    
    # Institution Controlled Vocabulary (Set by Institution Admin during verification)
    department_id = models.UUIDField(null=True, blank=True, help_text="Reference to Institution Department")
    cohort_id = models.UUIDField(null=True, blank=True, help_text="Reference to Institution Cohort")
    
    # Raw Input from Student (Evidence)
    raw_department_input = models.CharField(max_length=255, blank=True)
    raw_cohort_input = models.CharField(max_length=255, blank=True)
    
    class Meta:
        app_label = "students"
        db_table = "student_institution_affiliations"
        unique_together = ["student_id", "institution_id"]

    def __str__(self):
        return f"{self.student_id} -> {self.institution_id} ({self.status})"


class Student(BaseModel):
    user_id = models.UUIDField()
    institution_id = models.UUIDField(null=True, blank=True)
    email = models.EmailField(unique=True)
    registration_number = models.CharField(max_length=50, null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    
    # Profile Data (Self-Asserted)
    course_of_study = models.CharField(max_length=255, blank=True)
    current_year = models.CharField(max_length=50, blank=True)
    skills = models.JSONField(default=list, blank=True)
    
    # Trust & Verification
    trust_level = models.IntegerField(default=0, choices=[(k, v) for k, v in TRUST_TIER_LEVELS.items()])
    trust_points = models.IntegerField(default=0)
    
    # Documents
    profile_picture = models.ImageField(upload_to='students/profile_pictures/', null=True, blank=True)
    cv = models.FileField(upload_to='students/cvs/', blank=True)
    cv_verified = models.BooleanField(default=False, help_text="CV verified by institution admin")
    cv_verified_at = models.DateTimeField(null=True, blank=True)
    admission_letter = models.FileField(upload_to='students/admission_letters/', blank=True)
    admission_letter_verified = models.BooleanField(default=False, help_text="Admission letter verified")
    admission_letter_verified_at = models.DateTimeField(null=True, blank=True)
    id_document = models.FileField(upload_to='students/id_documents/', blank=True)
    id_document_verified = models.BooleanField(default=False, help_text="ID document verified")
    id_document_verified_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        app_label = "students"
        db_table = "students"

    def __str__(self):
        return f"{self.email} ({self.institution_id})"
