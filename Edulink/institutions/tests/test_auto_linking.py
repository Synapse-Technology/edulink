from django.test import TestCase
from django.contrib.auth import get_user_model
from institutions.models import Institution, MasterInstitution
from authentication.serializers import InstitutionRegistrationSerializer
from unittest.mock import Mock

User = get_user_model()


class AutoLinkingTestCase(TestCase):
    def setUp(self):
        """Set up test data"""
        # Create some master institutions
        self.master_university = MasterInstitution.objects.create(
            name="University of Nairobi",
            institution_type="Public University",
            accreditation_body="CUE",
            is_public=True,
            is_active=True
        )
        
        self.master_college = MasterInstitution.objects.create(
            name="Kenya Institute of Technology",
            institution_type="Technical Institute",
            accreditation_body="TVETA",
            is_public=False,
            is_active=True
        )
        
        # Create a mock request for context
        self.mock_request = Mock()
        self.mock_request.META = {'HTTP_USER_AGENT': 'test-agent', 'REMOTE_ADDR': '127.0.0.1'}

    def test_exact_name_match_linking(self):
        """Test that exact name matches are automatically linked"""
        serializer = InstitutionRegistrationSerializer(context={'request': self.mock_request})
        
        validated_data = {
            'institution_name': 'University of Nairobi',
            'institution_type': 'Public University',
            'registration_number': 'REG001',
            'email': 'admin@uon.ac.ke',
            'address': '123 University Way',
            'website': 'https://uon.ac.ke',
            'first_name': 'John',
            'last_name': 'Doe',
            'phone_number': '+254700000001',
            'password': 'testpass123',
            'national_id': '12345678'
        }
        
        user = serializer.create(validated_data)
        
        # Check that institution was created and linked
        institution = Institution.objects.get(name='University of Nairobi')
        self.assertIsNotNone(institution.master_institution)
        self.assertEqual(institution.master_institution, self.master_university)

    def test_fuzzy_match_linking(self):
        """Test that similar names are automatically linked with fuzzy matching"""
        serializer = InstitutionRegistrationSerializer(context={'request': self.mock_request})
        
        validated_data = {
            'institution_name': 'University of Nairobi (UoN)',  # Similar but not exact
            'institution_type': 'Public University',
            'registration_number': 'REG002',
            'email': 'admin@uon2.ac.ke',
            'address': '456 University Road',
            'first_name': 'Jane',
            'last_name': 'Smith',
            'phone_number': '+254700000002',
            'password': 'testpass123',
            'national_id': '87654321'
        }
        
        user = serializer.create(validated_data)
        
        # Check that institution was created and linked
        institution = Institution.objects.get(name='University of Nairobi (UoN)')
        self.assertIsNotNone(institution.master_institution)
        self.assertEqual(institution.master_institution, self.master_university)

    def test_no_match_no_linking(self):
        """Test that institutions with no good matches are not linked"""
        serializer = InstitutionRegistrationSerializer(context={'request': self.mock_request})
        
        validated_data = {
            'institution_name': 'Completely Different Institution',
            'institution_type': 'Private College',
            'registration_number': 'REG003',
            'email': 'admin@different.ac.ke',
            'address': '789 Different Street',
            'first_name': 'Bob',
            'last_name': 'Johnson',
            'phone_number': '+254700000003',
            'password': 'testpass123',
            'national_id': '11223344'
        }
        
        user = serializer.create(validated_data)
        
        # Check that institution was created but not linked
        institution = Institution.objects.get(name='Completely Different Institution')
        self.assertIsNone(institution.master_institution)

    def test_type_boost_matching(self):
        """Test that matching institution types boost similarity scores"""
        serializer = InstitutionRegistrationSerializer(context={'request': self.mock_request})
        
        validated_data = {
            'institution_name': 'Kenya Tech Institute',  # Similar to "Kenya Institute of Technology"
            'institution_type': 'Technical Institute',  # Matching type should boost score
            'registration_number': 'REG004',
            'email': 'admin@kti.ac.ke',
            'address': '321 Tech Avenue',
            'first_name': 'Alice',
            'last_name': 'Brown',
            'phone_number': '+254700000004',
            'password': 'testpass123',
            'national_id': '55667788'
        }
        
        user = serializer.create(validated_data)
        
        # Check that institution was created and linked to the technical institute
        institution = Institution.objects.get(name='Kenya Tech Institute')
        self.assertIsNotNone(institution.master_institution)
        self.assertEqual(institution.master_institution, self.master_college)

    def test_find_matching_master_institution_method(self):
        """Test the _find_matching_master_institution method directly"""
        serializer = InstitutionRegistrationSerializer()
        
        # Test exact match
        match = serializer._find_matching_master_institution(
            "University of Nairobi", "Public University"
        )
        self.assertEqual(match, self.master_university)
        
        # Test fuzzy match
        match = serializer._find_matching_master_institution(
            "Univ of Nairobi", "Public University"
        )
        self.assertEqual(match, self.master_university)
        
        # Test no match
        match = serializer._find_matching_master_institution(
            "Random Institution Name", "Unknown Type"
        )
        self.assertIsNone(match)
        
        # Test case insensitive matching
        match = serializer._find_matching_master_institution(
            "UNIVERSITY OF NAIROBI", "public university"
        )
        self.assertEqual(match, self.master_university)