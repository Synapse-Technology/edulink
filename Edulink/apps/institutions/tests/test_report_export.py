
import csv
import io
from unittest.mock import MagicMock, patch
from django.test import TestCase, RequestFactory
from edulink.apps.institutions.views import InstitutionReportsViewSet
from edulink.apps.accounts.models import User

class InstitutionReportsExportTest(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.user = User(id=1, email="admin@uni.edu")
        self.view = InstitutionReportsViewSet()
        self.view.action_map = {'get': 'export_report'}

    @patch('edulink.apps.institutions.queries.get_institution_for_user')
    @patch('edulink.apps.internships.queries.get_export_data')
    @patch('edulink.apps.students.queries.get_students_by_ids')
    @patch('edulink.apps.employers.queries.get_employers_by_ids')
    def test_export_report_employer_name(self, mock_get_employers, mock_get_students, mock_get_data, mock_get_inst):
        # 1. Setup Mock Data
        mock_inst = MagicMock()
        mock_inst.id = "inst-123"
        mock_get_inst.return_value = mock_inst

        # Mock Internship Application
        mock_app = MagicMock()
        mock_app.student_id = "student-1"
        mock_app.opportunity.employer_id = "employer-1"
        # Correct structure: title/dates are on opportunity
        mock_app.opportunity.title = "Intern"
        mock_app.opportunity.start_date = "2023-01-01"
        mock_app.opportunity.end_date = "2023-06-01"
        # Ensure direct access raises AttributeError to match reality
        del mock_app.title
        del mock_app.start_date
        del mock_app.end_date
        
        mock_app.status = "active"
        
        mock_get_data.return_value = [mock_app]

        # Mock Student
        mock_student = MagicMock()
        mock_student.user.get_full_name.return_value = "John Doe"
        mock_student.user.email = "john@uni.edu"
        mock_get_students.return_value = {"student-1": mock_student}

        # Mock Employer with correct 'name' attribute
        mock_employer = MagicMock()
        mock_employer.name = "Tech Corp"  # This is the key attribute we fixed
        # Ensure accessing company_name raises AttributeError to simulate the bug if it were present
        del mock_employer.company_name 
        
        mock_get_employers.return_value = {"employer-1": mock_employer}

        # 2. Execute View
        request = self.factory.get('/api/institutions/institution-reports/export/')
        request.user = self.user
        
        response = self.view.export_report(request)

        # 3. Verify Response
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'text/csv')
        
        content = response.content.decode('utf-8')
        reader = csv.reader(io.StringIO(content))
        rows = list(reader)
        
        # Verify Headers
        self.assertEqual(rows[0], ['Student Name', 'Student Email', 'Employer', 'Role', 'Status', 'Start Date', 'End Date'])
        
        # Verify Data Row
        self.assertEqual(rows[1][0], "John Doe")
        self.assertEqual(rows[1][2], "Tech Corp")  # Employer Name

