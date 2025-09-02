import factory
from factory.django import DjangoModelFactory
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

from authentication.models import User
from users.models.student_profile import StudentProfile
from users.models.employer_profile import EmployerProfile
from users.models.institution_profile import InstitutionProfile
from internship.models.internship import Internship
from internship.models.skill_tag import SkillTag
from application.models import Application
from internship_progress.models import LogbookEntry, SupervisorFeedback
from notifications.models import Notification

User = get_user_model()


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User
    
    username = factory.Sequence(lambda n: f"user{n}")
    email = factory.LazyAttribute(lambda obj: f"{obj.username}@example.com")
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    is_active = True
    is_email_verified = True
    date_joined = factory.LazyFunction(timezone.now)


class StudentProfileFactory(DjangoModelFactory):
    class Meta:
        model = StudentProfile
    
    user = factory.SubFactory(UserFactory)
    student_id = factory.Sequence(lambda n: f"STU{n:06d}")
    phone_number = factory.Faker('phone_number')
    date_of_birth = factory.Faker('date_of_birth', minimum_age=18, maximum_age=25)
    address = factory.Faker('address')
    emergency_contact_name = factory.Faker('name')
    emergency_contact_phone = factory.Faker('phone_number')
    course_of_study = factory.Faker('job')
    year_of_study = factory.Faker('random_int', min=1, max=4)
    gpa = factory.Faker('pydecimal', left_digits=1, right_digits=2, min_value=2.0, max_value=4.0)
    skills = factory.List(['Python', 'Django', 'JavaScript'])
    linkedin_url = factory.LazyAttribute(lambda obj: f"https://linkedin.com/in/{obj.user.username}")
    github_url = factory.LazyAttribute(lambda obj: f"https://github.com/{obj.user.username}")
    portfolio_url = factory.LazyAttribute(lambda obj: f"https://{obj.user.username}.dev")


class EmployerProfileFactory(DjangoModelFactory):
    class Meta:
        model = EmployerProfile
    
    user = factory.SubFactory(UserFactory)
    company_name = factory.Faker('company')
    company_description = factory.Faker('text', max_nb_chars=500)
    industry = factory.Faker('bs')
    company_size = factory.Faker('random_element', elements=['1-10', '11-50', '51-200', '201-500', '500+'])
    website = factory.Faker('url')
    phone_number = factory.Faker('phone_number')
    address = factory.Faker('address')
    is_verified = True


class InstitutionProfileFactory(DjangoModelFactory):
    class Meta:
        model = InstitutionProfile
    
    user = factory.SubFactory(UserFactory)
    institution_name = factory.Faker('company')
    institution_type = factory.Faker('random_element', elements=['University', 'College', 'Technical Institute'])
    address = factory.Faker('address')
    phone_number = factory.Faker('phone_number')
    website = factory.Faker('url')
    contact_person = factory.Faker('name')
    contact_email = factory.Faker('email')
    is_verified = True


class SkillTagFactory(DjangoModelFactory):
    class Meta:
        model = SkillTag
    
    name = factory.Faker('word')
    category = factory.Faker('random_element', elements=['Technical', 'Soft Skills', 'Industry Knowledge'])


class InternshipFactory(DjangoModelFactory):
    class Meta:
        model = Internship
    
    employer = factory.SubFactory(EmployerProfileFactory)
    institution = factory.SubFactory(InstitutionProfileFactory)
    title = factory.Faker('job')
    description = factory.Faker('text', max_nb_chars=1000)
    category = factory.Faker('random_element', elements=[
        'Software Development', 'Data Science', 'Marketing', 'Finance', 'HR', 'Operations'
    ])
    location = factory.Faker('city')
    start_date = factory.LazyFunction(lambda: timezone.now().date() + timedelta(days=30))
    end_date = factory.LazyAttribute(lambda obj: obj.start_date + timedelta(days=90))
    stipend = factory.Faker('random_int', min=10000, max=50000)
    skills_required = factory.List(['Python', 'Communication', 'Problem Solving'])
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
    
    student = factory.SubFactory(StudentProfileFactory)
    internship = factory.SubFactory(InternshipFactory)
    status = 'pending'
    cover_letter = factory.Faker('text', max_nb_chars=500)
    application_date = factory.LazyFunction(timezone.now)


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