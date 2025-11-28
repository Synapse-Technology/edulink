# Business Logic & Validation Rules Implementation Guide

## Overview

This document provides detailed implementation guidelines for business logic and validation rules that govern the relationships and workflows between departments, courses, supervisors, and students in the EduLink system.

## 1. Entity Validation Rules

### Department Validation

#### Django Model Implementation
```python
# departments/models.py
from django.db import models
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator

class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(
        max_length=10, 
        unique=True,
        validators=[RegexValidator(
            regex=r'^[A-Z]{2,4}$',
            message='Department code must be 2-4 uppercase letters'
        )]
    )
    description = models.TextField(blank=True)
    institution = models.ForeignKey('institutions.Institution', on_delete=models.CASCADE)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['code', 'institution']
        ordering = ['name']
    
    def clean(self):
        super().clean()
        
        # Validate department name uniqueness within institution
        if Department.objects.filter(
            institution=self.institution,
            name__iexact=self.name
        ).exclude(pk=self.pk).exists():
            raise ValidationError({
                'name': 'A department with this name already exists in this institution.'
            })
        
        # Validate minimum supervisor requirement
        if self.pk and self.supervisors.count() == 0:
            raise ValidationError(
                'Department must have at least one supervisor assigned.'
            )
    
    def can_delete(self):
        """Check if department can be safely deleted"""
        if self.courses.filter(is_active=True).exists():
            return False, "Cannot delete department with active courses"
        
        if self.students.filter(is_active=True).exists():
            return False, "Cannot delete department with enrolled students"
        
        return True, "Department can be deleted"
    
    def delete(self, *args, **kwargs):
        can_delete, message = self.can_delete()
        if not can_delete:
            raise ValidationError(message)
        super().delete(*args, **kwargs)
```

### Course Validation

```python
# courses/models.py
class Course(models.Model):
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20)
    credits = models.PositiveIntegerField(validators=[MinValueValidator(1), MaxValueValidator(6)])
    description = models.TextField()
    department = models.ForeignKey('departments.Department', on_delete=models.CASCADE, related_name='courses')
    prerequisites = models.ManyToManyField('self', blank=True, symmetrical=False)
    max_capacity = models.PositiveIntegerField(default=30)
    min_gpa_requirement = models.DecimalField(max_digits=3, decimal_places=2, default=2.0)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ['code', 'department']
        ordering = ['department', 'code']
    
    def clean(self):
        super().clean()
        
        # Validate course code format
        if not re.match(r'^[A-Z]{2,4}\d{3,4}$', self.code):
            raise ValidationError({
                'code': 'Course code must be 2-4 letters followed by 3-4 digits (e.g., CS101)'
            })
        
        # Validate prerequisites are from same or related departments
        for prereq in self.prerequisites.all():
            if prereq.department != self.department:
                # Check if departments are related (same institution)
                if prereq.department.institution != self.department.institution:
                    raise ValidationError({
                        'prerequisites': f'Prerequisite {prereq.code} is from a different institution'
                    })
    
    def check_enrollment_eligibility(self, student):
        """Check if student is eligible to enroll in this course"""
        errors = []
        
        # Check GPA requirement
        if student.gpa < self.min_gpa_requirement:
            errors.append(f'Minimum GPA of {self.min_gpa_requirement} required')
        
        # Check prerequisites
        completed_courses = student.completed_courses.all()
        missing_prereqs = []
        for prereq in self.prerequisites.all():
            if prereq not in completed_courses:
                missing_prereqs.append(prereq.code)
        
        if missing_prereqs:
            errors.append(f'Missing prerequisites: {", ".join(missing_prereqs)}')
        
        # Check capacity
        if self.enrolled_students.count() >= self.max_capacity:
            errors.append('Course is at maximum capacity')
        
        # Check if already enrolled
        if student in self.enrolled_students.all():
            errors.append('Student is already enrolled in this course')
        
        return len(errors) == 0, errors
    
    def enroll_student(self, student):
        """Enroll student with validation"""
        is_eligible, errors = self.check_enrollment_eligibility(student)
        
        if not is_eligible:
            raise ValidationError(errors)
        
        # Create enrollment record
        enrollment = Enrollment.objects.create(
            student=student,
            course=self,
            enrollment_date=timezone.now()
        )
        
        # Auto-assign supervisor if needed
        self.assign_supervisor_to_student(student)
        
        return enrollment
    
    def assign_supervisor_to_student(self, student):
        """Auto-assign optimal supervisor based on workload"""
        available_supervisors = self.department.supervisors.filter(
            is_active=True
        ).annotate(
            student_count=Count('supervised_students')
        ).order_by('student_count')
        
        if available_supervisors.exists():
            supervisor = available_supervisors.first()
            SupervisionRelationship.objects.get_or_create(
                supervisor=supervisor,
                student=student,
                course=self
            )
```

### Supervisor Validation

```python
# supervisors/models.py
class Supervisor(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    employee_id = models.CharField(max_length=20, unique=True)
    title = models.CharField(max_length=100)
    department = models.ForeignKey('departments.Department', on_delete=models.CASCADE, related_name='supervisors')
    specializations = models.ManyToManyField('courses.Course', blank=True)
    max_student_capacity = models.PositiveIntegerField(default=10)
    is_active = models.BooleanField(default=True)
    
    def clean(self):
        super().clean()
        
        # Validate supervisor qualifications
        if self.specializations.exists():
            for course in self.specializations.all():
                if course.department != self.department:
                    raise ValidationError({
                        'specializations': f'Cannot supervise course {course.code} from different department'
                    })
    
    def can_supervise_student(self, student):
        """Check if supervisor can take on another student"""
        current_load = self.supervised_students.filter(is_active=True).count()
        
        if current_load >= self.max_student_capacity:
            return False, f'Supervisor at maximum capacity ({self.max_student_capacity} students)'
        
        # Check department alignment
        if student.major and student.major.department != self.department:
            return False, 'Student major does not align with supervisor department'
        
        return True, 'Can supervise student'
    
    def assign_student(self, student, course=None):
        """Assign student to supervisor with validation"""
        can_supervise, message = self.can_supervise_student(student)
        
        if not can_supervise:
            raise ValidationError(message)
        
        supervision = SupervisionRelationship.objects.create(
            supervisor=self,
            student=student,
            course=course,
            start_date=timezone.now()
        )
        
        # Send notification
        NotificationService.send_supervision_assignment(supervision)
        
        return supervision
```

### Student Validation

```python
# students/models.py
class Student(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    student_id = models.CharField(max_length=20, unique=True)
    major = models.ForeignKey('courses.Course', on_delete=models.SET_NULL, null=True, blank=True)
    year = models.PositiveIntegerField(validators=[MinValueValidator(1), MaxValueValidator(6)])
    gpa = models.DecimalField(max_digits=3, decimal_places=2, default=0.0)
    max_credits_per_semester = models.PositiveIntegerField(default=18)
    is_active = models.BooleanField(default=True)
    
    def clean(self):
        super().clean()
        
        # Validate GPA range
        if not (0.0 <= self.gpa <= 4.0):
            raise ValidationError({
                'gpa': 'GPA must be between 0.0 and 4.0'
            })
    
    def check_credit_limit(self, additional_credits=0):
        """Check if student can take additional credits"""
        current_semester = get_current_semester()
        current_credits = self.enrollments.filter(
            semester=current_semester,
            status='ENROLLED'
        ).aggregate(
            total=Sum('course__credits')
        )['total'] or 0
        
        total_credits = current_credits + additional_credits
        
        if total_credits > self.max_credits_per_semester:
            return False, f'Credit limit exceeded. Current: {current_credits}, Limit: {self.max_credits_per_semester}'
        
        return True, f'Can take {additional_credits} additional credits'
    
    def can_apply_for_internship(self, internship):
        """Check internship application eligibility"""
        errors = []
        
        # Check GPA requirement
        if self.gpa < internship.min_gpa_requirement:
            errors.append(f'Minimum GPA of {internship.min_gpa_requirement} required')
        
        # Check year requirement
        if self.year < internship.min_year_requirement:
            errors.append(f'Minimum year {internship.min_year_requirement} required')
        
        # Check major alignment
        if internship.required_majors.exists() and self.major not in internship.required_majors.all():
            errors.append('Major not eligible for this internship')
        
        # Check existing applications
        if self.applications.filter(
            internship=internship,
            status__in=['PENDING', 'UNDER_REVIEW']
        ).exists():
            errors.append('Already applied for this internship')
        
        return len(errors) == 0, errors
```

## 2. Workflow Business Logic

### Application Workflow

```python
# applications/models.py
class Application(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('SUBMITTED', 'Submitted'),
        ('UNDER_REVIEW', 'Under Review'),
        ('INTERVIEW_SCHEDULED', 'Interview Scheduled'),
        ('ACCEPTED', 'Accepted'),
        ('REJECTED', 'Rejected'),
        ('WITHDRAWN', 'Withdrawn'),
    ]
    
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='applications')
    internship = models.ForeignKey('internships.Internship', on_delete=models.CASCADE, related_name='applications')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    cover_letter = models.TextField()
    resume = models.FileField(upload_to='resumes/')
    application_date = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['student', 'internship']
    
    def clean(self):
        super().clean()
        
        # Validate application eligibility
        if self.student and self.internship:
            can_apply, errors = self.student.can_apply_for_internship(self.internship)
            if not can_apply:
                raise ValidationError({'__all__': errors})
    
    def submit_application(self):
        """Submit application with workflow validation"""
        if self.status != 'DRAFT':
            raise ValidationError('Only draft applications can be submitted')
        
        # Validate required fields
        if not self.cover_letter.strip():
            raise ValidationError('Cover letter is required')
        
        if not self.resume:
            raise ValidationError('Resume is required')
        
        # Update status
        self.status = 'SUBMITTED'
        self.save()
        
        # Trigger workflow
        self.trigger_review_workflow()
    
    def trigger_review_workflow(self):
        """Initiate application review process"""
        # Assign to supervisor for review
        supervisor = self.internship.supervisor
        
        # Create review task
        ReviewTask.objects.create(
            application=self,
            assigned_to=supervisor,
            task_type='INITIAL_REVIEW',
            due_date=timezone.now() + timedelta(days=3)
        )
        
        # Send notifications
        NotificationService.send_application_submitted(self)
        NotificationService.send_review_assignment(supervisor, self)
    
    def update_status(self, new_status, reviewer, notes=''):
        """Update application status with validation"""
        valid_transitions = {
            'SUBMITTED': ['UNDER_REVIEW', 'REJECTED'],
            'UNDER_REVIEW': ['INTERVIEW_SCHEDULED', 'ACCEPTED', 'REJECTED'],
            'INTERVIEW_SCHEDULED': ['ACCEPTED', 'REJECTED'],
        }
        
        if self.status not in valid_transitions:
            raise ValidationError(f'Cannot update status from {self.status}')
        
        if new_status not in valid_transitions[self.status]:
            raise ValidationError(f'Invalid status transition from {self.status} to {new_status}')
        
        # Update status
        old_status = self.status
        self.status = new_status
        self.save()
        
        # Create status history
        ApplicationStatusHistory.objects.create(
            application=self,
            old_status=old_status,
            new_status=new_status,
            changed_by=reviewer,
            notes=notes,
            changed_at=timezone.now()
        )
        
        # Trigger status-specific workflows
        self.handle_status_change(new_status, reviewer)
    
    def handle_status_change(self, new_status, reviewer):
        """Handle status-specific business logic"""
        if new_status == 'ACCEPTED':
            self.handle_acceptance()
        elif new_status == 'REJECTED':
            self.handle_rejection()
        elif new_status == 'INTERVIEW_SCHEDULED':
            self.handle_interview_scheduling()
    
    def handle_acceptance(self):
        """Handle application acceptance workflow"""
        # Create internship enrollment
        InternshipEnrollment.objects.create(
            student=self.student,
            internship=self.internship,
            start_date=self.internship.start_date,
            supervisor=self.internship.supervisor
        )
        
        # Reject other pending applications for same student
        self.student.applications.filter(
            status__in=['SUBMITTED', 'UNDER_REVIEW'],
            internship__start_date=self.internship.start_date
        ).exclude(pk=self.pk).update(status='REJECTED')
        
        # Send notifications
        NotificationService.send_acceptance_notification(self)
```

## 3. Validation Services

### Centralized Validation Service

```python
# services/validation_service.py
class ValidationService:
    
    @staticmethod
    def validate_department_creation(department_data, institution):
        """Comprehensive department validation"""
        errors = {}
        
        # Check name uniqueness
        if Department.objects.filter(
            institution=institution,
            name__iexact=department_data['name']
        ).exists():
            errors['name'] = 'Department name already exists'
        
        # Check code format and uniqueness
        code = department_data.get('code', '').upper()
        if not re.match(r'^[A-Z]{2,4}$', code):
            errors['code'] = 'Invalid department code format'
        elif Department.objects.filter(
            institution=institution,
            code=code
        ).exists():
            errors['code'] = 'Department code already exists'
        
        return errors
    
    @staticmethod
    def validate_course_enrollment(student, course):
        """Validate course enrollment with detailed feedback"""
        validation_result = {
            'is_valid': True,
            'errors': [],
            'warnings': []
        }
        
        # Check prerequisites
        missing_prereqs = []
        for prereq in course.prerequisites.all():
            if not student.completed_courses.filter(pk=prereq.pk).exists():
                missing_prereqs.append(prereq.code)
        
        if missing_prereqs:
            validation_result['is_valid'] = False
            validation_result['errors'].append(
                f'Missing prerequisites: {", ".join(missing_prereqs)}'
            )
        
        # Check GPA requirement
        if student.gpa < course.min_gpa_requirement:
            validation_result['is_valid'] = False
            validation_result['errors'].append(
                f'GPA requirement not met. Required: {course.min_gpa_requirement}, Current: {student.gpa}'
            )
        
        # Check credit limits
        can_take_credits, credit_message = student.check_credit_limit(course.credits)
        if not can_take_credits:
            validation_result['is_valid'] = False
            validation_result['errors'].append(credit_message)
        
        # Check capacity
        if course.enrolled_students.count() >= course.max_capacity:
            validation_result['is_valid'] = False
            validation_result['errors'].append('Course is at maximum capacity')
        elif course.enrolled_students.count() >= course.max_capacity * 0.9:
            validation_result['warnings'].append('Course is nearly full')
        
        return validation_result
    
    @staticmethod
    def validate_supervisor_assignment(supervisor, student, course=None):
        """Validate supervisor-student assignment"""
        errors = []
        
        # Check capacity
        current_load = supervisor.supervised_students.filter(is_active=True).count()
        if current_load >= supervisor.max_student_capacity:
            errors.append(f'Supervisor at maximum capacity ({supervisor.max_student_capacity})')
        
        # Check department alignment
        if course and course.department != supervisor.department:
            errors.append('Course department does not match supervisor department')
        
        # Check specialization
        if course and supervisor.specializations.exists():
            if course not in supervisor.specializations.all():
                errors.append(f'Supervisor not specialized in {course.code}')
        
        # Check existing supervision
        if SupervisionRelationship.objects.filter(
            supervisor=supervisor,
            student=student,
            is_active=True
        ).exists():
            errors.append('Student already supervised by this supervisor')
        
        return len(errors) == 0, errors
```

## 4. Business Rules Engine

### Rule-Based Validation

```python
# services/business_rules.py
class BusinessRulesEngine:
    
    def __init__(self):
        self.rules = {
            'enrollment': [
                self.check_prerequisite_completion,
                self.check_gpa_requirement,
                self.check_credit_limits,
                self.check_course_capacity,
                self.check_schedule_conflicts
            ],
            'supervision': [
                self.check_supervisor_capacity,
                self.check_department_alignment,
                self.check_specialization_match
            ],
            'application': [
                self.check_application_deadline,
                self.check_eligibility_criteria,
                self.check_duplicate_applications
            ]
        }
    
    def validate(self, rule_type, context):
        """Execute all rules for a given type"""
        results = []
        
        for rule in self.rules.get(rule_type, []):
            try:
                result = rule(context)
                results.append(result)
            except Exception as e:
                results.append({
                    'rule': rule.__name__,
                    'passed': False,
                    'error': str(e)
                })
        
        return {
            'all_passed': all(r['passed'] for r in results),
            'results': results
        }
    
    def check_prerequisite_completion(self, context):
        """Rule: Student must complete all prerequisites"""
        student = context['student']
        course = context['course']
        
        completed = student.completed_courses.all()
        missing = [p for p in course.prerequisites.all() if p not in completed]
        
        return {
            'rule': 'prerequisite_completion',
            'passed': len(missing) == 0,
            'message': f'Missing prerequisites: {", ".join([p.code for p in missing])}' if missing else 'All prerequisites met'
        }
    
    def check_supervisor_capacity(self, context):
        """Rule: Supervisor must not exceed capacity"""
        supervisor = context['supervisor']
        current_load = supervisor.supervised_students.filter(is_active=True).count()
        
        return {
            'rule': 'supervisor_capacity',
            'passed': current_load < supervisor.max_student_capacity,
            'message': f'Current load: {current_load}/{supervisor.max_student_capacity}'
        }
```

## 5. Integration with Frontend

### API Validation Responses

```python
# api/serializers.py
class CourseEnrollmentSerializer(serializers.Serializer):
    student_id = serializers.IntegerField()
    course_id = serializers.IntegerField()
    
    def validate(self, data):
        student = Student.objects.get(pk=data['student_id'])
        course = Course.objects.get(pk=data['course_id'])
        
        # Use validation service
        validation_result = ValidationService.validate_course_enrollment(student, course)
        
        if not validation_result['is_valid']:
            raise serializers.ValidationError({
                'enrollment_errors': validation_result['errors'],
                'warnings': validation_result.get('warnings', [])
            })
        
        return data

# api/views.py
class CourseEnrollmentView(APIView):
    def post(self, request):
        serializer = CourseEnrollmentSerializer(data=request.data)
        
        try:
            serializer.is_valid(raise_exception=True)
            
            # Perform enrollment
            student = Student.objects.get(pk=serializer.validated_data['student_id'])
            course = Course.objects.get(pk=serializer.validated_data['course_id'])
            
            enrollment = course.enroll_student(student)
            
            return Response({
                'success': True,
                'enrollment_id': enrollment.id,
                'message': 'Successfully enrolled in course'
            })
            
        except ValidationError as e:
            return Response({
                'success': False,
                'errors': e.detail
            }, status=400)
```

### Frontend Validation Integration

```javascript
// Frontend validation service
class ValidationService {
  static async validateCourseEnrollment(studentId, courseId) {
    try {
      const response = await fetch('/api/validate/course-enrollment/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ student_id: studentId, course_id: courseId })
      });
      
      const result = await response.json();
      
      return {
        isValid: result.success,
        errors: result.errors || [],
        warnings: result.warnings || []
      };
    } catch (error) {
      return {
        isValid: false,
        errors: ['Validation service unavailable'],
        warnings: []
      };
    }
  }
  
  static async validateBeforeSubmit(formData, validationType) {
    const validationMap = {
      'course-enrollment': this.validateCourseEnrollment,
      'supervisor-assignment': this.validateSupervisorAssignment,
      'application-submission': this.validateApplicationSubmission
    };
    
    const validator = validationMap[validationType];
    if (!validator) {
      throw new Error(`Unknown validation type: ${validationType}`);
    }
    
    return await validator(formData);
  }
}

// Usage in React component
const CourseEnrollmentForm = () => {
  const [validationErrors, setValidationErrors] = useState([]);
  const [validationWarnings, setValidationWarnings] = useState([]);
  
  const handleSubmit = async (formData) => {
    // Validate before submission
    const validation = await ValidationService.validateCourseEnrollment(
      formData.studentId, 
      formData.courseId
    );
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setValidationWarnings(validation.warnings);
      return;
    }
    
    // Proceed with enrollment
    try {
      await CourseAPI.enrollStudent(formData);
      showSuccess('Successfully enrolled in course');
    } catch (error) {
      showError('Enrollment failed');
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {validationErrors.length > 0 && (
        <ValidationErrorDisplay errors={validationErrors} />
      )}
      {validationWarnings.length > 0 && (
        <ValidationWarningDisplay warnings={validationWarnings} />
      )}
      {/* Form fields */}
    </form>
  );
};
```

This comprehensive business logic implementation ensures data integrity, enforces institutional policies, and provides clear validation feedback throughout the entire workflow from frontend to backend.