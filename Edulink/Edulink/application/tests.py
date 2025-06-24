from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import Internship, Application

User = get_user_model()

class InternshipModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='pass')
        self.internship = Internship.objects.create(title="Test Internship", description="Test", employer_id=1, location="Nairobi")

    def test_internship_creation(self):
        self.assertEqual(str(self.internship), "Test Internship")

    def test_application_creation(self):
        application = Application.objects.create(student=self.user, internship=self.internship)
        self.assertEqual(application.status, 'applied')


# Create your tests here.
