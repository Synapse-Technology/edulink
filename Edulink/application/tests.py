from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.urls import reverse
from .models import Internship, Application

User = get_user_model()

class InternshipModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='pass')
        self.internship = Internship.objects.create(
            title="Test Internship",
            description="Test",
            employer_name="Test Employer",
            location="Nairobi"
        )

    def test_internship_creation(self):
        self.assertEqual(str(self.internship), "Test Internship")

    def test_application_creation(self):
        application = Application.objects.create(student=self.user, internship=self.internship)
        self.assertEqual(application.status, 'applied')

class RoleAccessTest(TestCase):
    def setUp(self):
        # Create groups
        self.student_group = Group.objects.create(name='STUDENT')
        self.employer_group = Group.objects.create(name='EMPLOYER')
        
        # Create users
        self.student = User.objects.create_user(username='student', password='pass')
        self.employer = User.objects.create_user(username='employer', password='pass')
        
        # Assign users to groups
        self.student.groups.add(self.student_group)
        self.employer.groups.add(self.employer_group)
        
        self.client = Client()

    def test_student_access(self):
        self.client.login(username='student', password='pass')
        response = self.client.get(reverse('internship_list'))
        self.assertEqual(response.status_code, 200)

    def test_employer_access(self):
        self.client.login(username='employer', password='pass')
        response = self.client.get(reverse('internship_list'))
        self.assertEqual(response.status_code, 403)

# Create your tests here.
