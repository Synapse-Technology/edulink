import factory
from factory.django import DjangoModelFactory
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

from authentication.models import User
from users.models.student_profile import StudentProfile
from users.models.employer_profile import EmployerProfile
from users.models.institution_profile import InstitutionProfile
from institutions.models import Institution, Course
from internship.models.internship import Internship
from internship.models.skill_tag import SkillTag


class InstitutionFactory(DjangoModelFactory):
    class Meta:
        model = Institution
    
    name = factory.Faker('company')
    institution_type = factory.Faker('random_element', elements=['University', 'College', 'Institute'])
    email = factory.Faker('email')
    phone_number = factory.Faker('phone_number')
    website = factory.Faker('url')
    address = factory.Faker('address')
    registration_number = factory.Faker('random_number', digits=8)
    university_code = factory.Faker('random_number', digits=4)
    is_verified = True


class CourseFactory(DjangoModelFactory):
    class Meta:
        model = Course
    
    institution = factory.SubFactory(InstitutionFactory)
    name = factory.Faker('random_element', elements=['Computer Science', 'Information Technology', 'Software Engineering', 'Data Science', 'Business Administration', 'Engineering'])
    code = factory.Faker('bothify', text='CS###')
    duration_years = factory.Faker('random_int', min=3, max=4)
    is_active = True
from application.models import Application
from internship_progress.models import LogbookEntry, SupervisorFeedback
from notifications.models import Notification
from users.roles import RoleChoices

User = get_user_model()


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User
    
    email = factory.Sequence(lambda n: f"user{n}@example.com")
    is_active = True
    is_email_verified = True
    date_joined = factory.LazyFunction(timezone.now)
    role = RoleChoices.STUDENT


class StudentProfileFactory(DjangoModelFactory):
    class Meta:
        model = StudentProfile
    
    user = factory.SubFactory(UserFactory)
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    phone_number = factory.Faker('phone_number')
    registration_number = factory.Sequence(lambda n: f"REG{n:06d}")
    national_id = factory.Sequence(lambda n: f"{n:08d}")
    institution = factory.SubFactory(InstitutionFactory)
    year_of_study = factory.Faker('random_int', min=1, max=4)
    course = factory.SubFactory(CourseFactory)
    skills = factory.List(['Python', 'Django', 'JavaScript', 'Communication', 'Problem Solving'])
    interests = factory.List(['Technology', 'Programming', 'Innovation'])


class EmployerProfileFactory(DjangoModelFactory):
    class Meta:
        model = EmployerProfile
    
    user = factory.SubFactory(UserFactory)
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    phone_number = factory.Faker('phone_number')
    company_name = factory.Faker('company')
    company_description = factory.Faker('text', max_nb_chars=500)
    industry = factory.Faker('bs')
    company_size = factory.Faker('random_element', elements=['1-10', '11-50', '51-200', '201-500', '501-1000'])
    website = factory.Faker('url')
    location = factory.Faker('address')
    department = factory.Faker('job')
    position = factory.Faker('job')
    is_verified = True


class InstitutionProfileFactory(DjangoModelFactory):
    class Meta:
        model = InstitutionProfile
    
    user = factory.SubFactory(UserFactory)
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    phone_number = factory.Faker('phone_number')
    position = factory.Faker('job')
    institution = factory.SubFactory(InstitutionFactory)


class SkillTagFactory(DjangoModelFactory):
    class Meta:
        model = SkillTag
    
    name = factory.Sequence(lambda n: f"skill_{n}")
    description = factory.Faker('text', max_nb_chars=100)
    is_active = True


class InternshipFactory(DjangoModelFactory):
    class Meta:
        model = Internship
    
    employer = factory.SubFactory(EmployerProfileFactory)
    institution = factory.SubFactory(InstitutionProfileFactory)
    title = factory.Faker('job')
    description = factory.Faker('text', max_nb_chars=1000)
    category = factory.Faker('random_element', elements=[
        'technology', 'finance', 'marketing', 'healthcare', 'education', 'engineering'
    ])
    location = factory.Faker('city')
    location_type = factory.Faker('random_element', elements=['remote', 'on_site', 'hybrid'])
    start_date = factory.LazyFunction(lambda: timezone.now().date() + timedelta(days=30))
    end_date = factory.LazyAttribute(lambda obj: obj.start_date + timedelta(days=90))
    duration_weeks = factory.LazyAttribute(lambda obj: ((obj.end_date - obj.start_date).days + 6) // 7)
    stipend = factory.Faker('random_int', min=10000, max=50000)
    required_skills = factory.List(['Python', 'Communication', 'Problem Solving'])
    eligibility_criteria = factory.Faker('text', max_nb_chars=300)
    deadline = factory.LazyAttribute(lambda obj: obj.start_date - timedelta(days=7))
    is_verified = True
    visibility = 'public'
    is_active = True
    
    @factory.post_generation
    def skill_tags(self, create, extracted, **kwargs):
        if not create:
            return
        
        if extracted:
            for skill_tag in extracted:
                self.skill_tags.add(skill_tag)
        else:
            # Create default skill tags
            skill_tags = SkillTagFactory.create_batch(3)
            for skill_tag in skill_tags:
                self.skill_tags.add(skill_tag)


class ApplicationFactory(DjangoModelFactory):
    class Meta:
        model = Application
    
    student = factory.SubFactory(UserFactory)
    internship = factory.SubFactory(InternshipFactory)
    status = 'pending'
    cover_letter = factory.Faker('text', max_nb_chars=500)
    application_date = factory.LazyFunction(timezone.now)
    
    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """Override _create to bypass deadline validation for testing."""
        instance = model_class(**kwargs)
        # Use Django's base Model.save() to bypass custom validation
        super(Application, instance).save()
        return instance


class LogbookEntryFactory(DjangoModelFactory):
    class Meta:
        model = LogbookEntry
    
    student = factory.SubFactory(StudentProfileFactory)
    internship = factory.SubFactory(InternshipFactory)
    week_number = 1
    activities = factory.Faker('text', max_nb_chars=1000)
    status = 'pending'
    date_submitted = factory.LazyFunction(timezone.now)


class SupervisorFeedbackFactory(DjangoModelFactory):
    class Meta:
        model = SupervisorFeedback
    
    log_entry = factory.SubFactory(LogbookEntryFactory)
    company_supervisor = factory.SubFactory(EmployerProfileFactory)
    public_comment = factory.Faker('text', max_nb_chars=300)
    private_note = factory.Faker('text', max_nb_chars=200)
    created_at = factory.LazyFunction(timezone.now)


class NotificationFactory(DjangoModelFactory):
    class Meta:
        model = Notification
    
    recipient = factory.SubFactory(UserFactory)
    title = factory.Faker('sentence', nb_words=4)
    message = factory.Faker('text', max_nb_chars=200)
    notification_type = 'info'
    is_read = False
    created_at = factory.LazyFunction(timezone.now)