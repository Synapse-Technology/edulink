from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from datetime import date, timedelta
from unittest.mock import patch, MagicMock

from .models import Internship, SkillTag
from .serializers import (
    InternshipListSerializer,
    InternshipDetailSerializer,
    InternshipCreateSerializer,
    SkillTagSerializer
)


class SkillTagModelTest(TestCase):
    """Test cases for SkillTag model"""
    
    def setUp(self):
        self.skill_tag = SkillTag.objects.create(
            name="Python",
            description="Python programming language",
            is_active=True
        )
    
    def test_skill_tag_creation(self):
        """Test skill tag creation"""
        self.assertEqual(self.skill_tag.name, "Python")
        self.assertEqual(self.skill_tag.description, "Python programming language")
        self.assertTrue(self.skill_tag.is_active)
    
    def test_skill_tag_str(self):
        """Test skill tag string representation"""
        self.assertEqual(str(self.skill_tag), "Python")
    
    def test_internship_count_property(self):
        """Test internship count property"""
        # Initially should be 0
        self.assertEqual(self.skill_tag.internship_count, 0)
        
        # Create an internship with this skill tag
        internship = Internship.objects.create(
            title="Test Internship",
            description="Test description",
            employer_id=1,
            category="technology",
            location="Test City",
            location_type="on_site",
            experience_level="entry",
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=120),
            deadline=date.today() + timedelta(days=15),
            is_active=True
        )
        internship.skill_tags.add(self.skill_tag)
        
        # Should now be 1
        self.assertEqual(self.skill_tag.internship_count, 1)


class InternshipModelTest(TestCase):
    """Test cases for Internship model"""
    
    def setUp(self):
        self.skill_tag = SkillTag.objects.create(
            name="Django",
            description="Django web framework"
        )
        
        self.internship = Internship.objects.create(
            title="Software Engineering Intern",
            description="Work on web applications",
            employer_id=1,
            category="technology",
            location="San Francisco",
            location_type="hybrid",
            experience_level="intermediate",
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=120),
            deadline=date.today() + timedelta(days=15),
            duration_weeks=12,
            stipend=2000,
            min_gpa=3.0,
            max_applications=10,
            is_active=True
        )
        self.internship.skill_tags.add(self.skill_tag)
    
    def test_internship_creation(self):
        """Test internship creation"""
        self.assertEqual(self.internship.title, "Software Engineering Intern")
        self.assertEqual(self.internship.employer_id, 1)
        self.assertEqual(self.internship.category, "technology")
        self.assertTrue(self.internship.is_active)
    
    def test_internship_str(self):
        """Test internship string representation"""
        expected = "Software Engineering Intern - Employer ID: 1"
        self.assertEqual(str(self.internship), expected)
    
    def test_is_expired_method(self):
        """Test is_expired method"""
        # Current internship should not be expired
        self.assertFalse(self.internship.is_expired())
        
        # Create expired internship
        expired_internship = Internship.objects.create(
            title="Expired Internship",
            description="Test",
            employer_id=2,
            category="technology",
            location="Test",
            location_type="remote",
            experience_level="entry",
            start_date=date.today() - timedelta(days=30),
            end_date=date.today() - timedelta(days=1),
            deadline=date.today() - timedelta(days=5)
        )
        self.assertTrue(expired_internship.is_expired())
    
    def test_can_apply_method(self):
        """Test can_apply method"""
        # Active internship with future deadline should allow applications
        self.assertTrue(self.internship.can_apply())
        
        # Inactive internship should not allow applications
        self.internship.is_active = False
        self.internship.save()
        self.assertFalse(self.internship.can_apply())
    
    def test_clean_method_validation(self):
        """Test model validation in clean method"""
        # Test invalid date range
        self.internship.start_date = date.today() + timedelta(days=60)
        self.internship.end_date = date.today() + timedelta(days=30)
        
        with self.assertRaises(Exception):
            self.internship.clean()
    
    def test_duration_calculation(self):
        """Test duration calculation"""
        # Duration should be calculated correctly
        expected_duration = (self.internship.end_date - self.internship.start_date).days // 7
        self.assertEqual(self.internship.duration_weeks, 12)


class SkillTagSerializerTest(TestCase):
    """Test cases for SkillTag serializer"""
    
    def setUp(self):
        self.skill_tag_data = {
            'name': 'React',
            'description': 'React JavaScript library',
            'is_active': True
        }
    
    def test_skill_tag_serializer_valid_data(self):
        """Test serializer with valid data"""
        serializer = SkillTagSerializer(data=self.skill_tag_data)
        self.assertTrue(serializer.is_valid())
    
    def test_skill_tag_serializer_invalid_data(self):
        """Test serializer with invalid data"""
        invalid_data = self.skill_tag_data.copy()
        invalid_data['name'] = ''  # Empty name should be invalid
        
        serializer = SkillTagSerializer(data=invalid_data)
        self.assertFalse(serializer.is_valid())


class InternshipSerializerTest(TestCase):
    """Test cases for Internship serializers"""
    
    def setUp(self):
        self.skill_tag = SkillTag.objects.create(name="Python")
        
        self.internship_data = {
            'title': 'Data Science Intern',
            'description': 'Work with data analysis',
            'employer_id': 1,
            'category': 'technology',
            'location': 'New York',
            'location_type': 'remote',
            'experience_level': 'entry',
            'start_date': (date.today() + timedelta(days=30)).isoformat(),
            'end_date': (date.today() + timedelta(days=120)).isoformat(),
            'deadline': (date.today() + timedelta(days=15)).isoformat(),
            'duration_weeks': 12,
            'stipend': 1500,
            'skill_tags': [self.skill_tag.id]
        }
    
    def test_internship_create_serializer_valid_data(self):
        """Test create serializer with valid data"""
        serializer = InternshipCreateSerializer(data=self.internship_data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
    
    def test_internship_create_serializer_invalid_dates(self):
        """Test create serializer with invalid dates"""
        invalid_data = self.internship_data.copy()
        invalid_data['start_date'] = (date.today() + timedelta(days=120)).isoformat()
        invalid_data['end_date'] = (date.today() + timedelta(days=30)).isoformat()
        
        serializer = InternshipCreateSerializer(data=invalid_data)
        self.assertFalse(serializer.is_valid())


class InternshipAPITest(APITestCase):
    """Test cases for Internship API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.skill_tag = SkillTag.objects.create(name="JavaScript")
        
        self.internship = Internship.objects.create(
            title="Frontend Developer Intern",
            description="Build user interfaces",
            employer_id=1,
            category="technology",
            location="Remote",
            location_type="remote",
            experience_level="entry",
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=120),
            deadline=date.today() + timedelta(days=15),
            is_active=True,
            is_verified=True
        )
        self.internship.skill_tags.add(self.skill_tag)
    
    def test_internship_list_endpoint(self):
        """Test internship list endpoint"""
        url = reverse('internship-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_internship_detail_endpoint(self):
        """Test internship detail endpoint"""
        url = reverse('internship-detail', kwargs={'pk': self.internship.pk})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], self.internship.title)
    
    def test_internship_featured_endpoint(self):
        """Test featured internships endpoint"""
        # Mark internship as featured
        self.internship.is_featured = True
        self.internship.save()
        
        url = reverse('internship-featured')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_internship_stats_endpoint(self):
        """Test internship statistics endpoint"""
        url = reverse('internship-stats')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_internships', response.data)
        self.assertIn('active_internships', response.data)
        self.assertIn('by_category', response.data)
    
    @patch('internships.views.publish_event')
    def test_internship_create_endpoint_authenticated(self, mock_publish):
        """Test internship creation with authentication"""
        # Mock user authentication
        user = MagicMock()
        user.is_authenticated = True
        user.id = 1
        
        self.client.force_authenticate(user=user)
        
        url = reverse('internship-list')
        data = {
            'title': 'Backend Developer Intern',
            'description': 'Work on server-side applications',
            'employer_id': 1,
            'category': 'technology',
            'location': 'San Francisco',
            'location_type': 'on_site',
            'experience_level': 'intermediate',
            'start_date': (date.today() + timedelta(days=30)).isoformat(),
            'end_date': (date.today() + timedelta(days=120)).isoformat(),
            'deadline': (date.today() + timedelta(days=15)).isoformat(),
            'duration_weeks': 12
        }
        
        with patch('internships.permissions.IsVerifiedEmployer.has_permission', return_value=True):
            response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mock_publish.assert_called_once()


class SkillTagAPITest(APITestCase):
    """Test cases for SkillTag API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.skill_tag = SkillTag.objects.create(
            name="Node.js",
            description="Node.js runtime environment",
            is_active=True
        )
    
    def test_skill_tag_list_endpoint(self):
        """Test skill tag list endpoint"""
        url = reverse('skilltag-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_skill_tag_detail_endpoint(self):
        """Test skill tag detail endpoint"""
        url = reverse('skilltag-detail', kwargs={'pk': self.skill_tag.pk})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], self.skill_tag.name)
    
    def test_skill_tag_search(self):
        """Test skill tag search functionality"""
        url = reverse('skilltag-list')
        response = self.client.get(url, {'search': 'Node'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        
        # Search for non-existent skill
        response = self.client.get(url, {'search': 'NonExistent'})
        self.assertEqual(len(response.data['results']), 0)