
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

    @patch('edulink.apps.institutions.views.get_institution_for_user')
    @patch('edulink.apps.institutions.services.get_institution_placement_export_data')
    def test_export_report_employer_name(self, mock_get_data, mock_get_inst):
        # 1. Setup Mock Data
        mock_inst = MagicMock()
        mock_inst.id = "inst-123"
        mock_get_inst.return_value = mock_inst

        mock_get_data.return_value = [{
            "student_name": "John Doe",
            "student_email": "john@uni.edu",
            "employer_name": "Tech Corp",
            "role": "Intern",
            "status": "active",
            "start_date": "2023-01-01",
            "end_date": "2023-06-01",
        }]

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
