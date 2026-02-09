from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from edulink.apps.accounts.models import User
from edulink.apps.students.models import Student
from uuid import uuid4

class StudentDocumentUploadTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="teststudent", 
            email="student@test.com", 
            password="password",
            role=User.ROLE_STUDENT
        )
        self.student = Student.objects.create(user_id=self.user.id, email=self.user.email)
        self.client.force_authenticate(user=self.user)

    def test_upload_cv(self):
        # Depending on router configuration, it might be 'student-upload-document' or 'students-upload-document'
        # DefaultRouter usually uses singular model name as basename unless specified.
        try:
            url = reverse('student-upload-document', args=[self.student.id])
        except:
            url = reverse('students-upload-document', args=[self.student.id])
            
        file_content = b"fake cv content"
        file = SimpleUploadedFile("cv.pdf", file_content, content_type="application/pdf")
        
        data = {
            'document_type': 'cv',
            'file_name': 'cv.pdf',
            'file': file
        }
        
        response = self.client.post(url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.student.refresh_from_db()
        self.assertTrue(bool(self.student.cv))
        # Django appends random string to filename if duplicate, but here it should be close
        self.assertIn('cv', self.student.cv.name)

    def test_upload_admission_letter(self):
        try:
            url = reverse('student-upload-document', args=[self.student.id])
        except:
            url = reverse('students-upload-document', args=[self.student.id])

        file_content = b"fake letter content"
        file = SimpleUploadedFile("letter.pdf", file_content, content_type="application/pdf")
        
        data = {
            'document_type': 'admission_letter',
            'file_name': 'letter.pdf',
            'file': file
        }
        
        response = self.client.post(url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.student.refresh_from_db()
        self.assertTrue(bool(self.student.admission_letter))

    def test_upload_id_document(self):
        try:
            url = reverse('student-upload-document', args=[self.student.id])
        except:
            url = reverse('students-upload-document', args=[self.student.id])

        file_content = b"fake id content"
        file = SimpleUploadedFile("id.jpg", file_content, content_type="image/jpeg")
        
        data = {
            'document_type': 'id_document',
            'file_name': 'id.jpg',
            'file': file
        }
        
        response = self.client.post(url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.student.refresh_from_db()
        self.assertTrue(bool(self.student.id_document))
