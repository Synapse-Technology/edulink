
import pytest
from uuid import uuid4
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.core.files.uploadedfile import SimpleUploadedFile
from edulink.apps.accounts.models import User
from edulink.apps.institutions.models import Institution, InstitutionStaff
from edulink.apps.employers.models import Employer, Supervisor
from edulink.apps.students.models import Student
from edulink.apps.internships.models import Internship, InternshipState, InternshipEvidence, Incident
from edulink.apps.internships.services import create_internship_opportunity, start_internship

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def institution_admin():
    user = User.objects.create_user(username="inst_admin", email="inst@test.com", password="password", role=User.ROLE_INSTITUTION_ADMIN)
    inst = Institution.objects.create(name="Test Inst", is_verified=True, status=Institution.STATUS_ACTIVE)
    InstitutionStaff.objects.create(institution=inst, user=user, role=InstitutionStaff.ROLE_ADMIN)
    return user, inst

@pytest.fixture
def employer_admin():
    user = User.objects.create_user(username="emp_admin", email="emp@test.com", password="password", role=User.ROLE_EMPLOYER_ADMIN)
    emp = Employer.objects.create(name="Test Emp", trust_level=Employer.TRUST_ACTIVE_HOST)
    Supervisor.objects.create(employer=emp, user=user, role=Supervisor.ROLE_ADMIN, is_active=True)
    return user, emp

@pytest.fixture
def employer_supervisor(employer_admin):
    _, emp = employer_admin
    user = User.objects.create_user(username="sup_user", email="sup@test.com", password="password", role=User.ROLE_EMPLOYER_ADMIN) # Role might be just user, but policy checks Supervisor model
    # Wait, policy checks User.is_supervisor property which usually checks the related supervisor profile or user role.
    # In accounts.models User might not have ROLE_SUPERVISOR. Let's assume it does or policy handles it.
    # Let's check policies.py again. `actor.is_supervisor`
    user.role = User.ROLE_SUPERVISOR # If this exists, otherwise we might need to rely on `get_employer_staff`
    user.save()
    
    Supervisor.objects.create(employer=emp, user=user, role=Supervisor.ROLE_SUPERVISOR, is_active=True)
    return user, emp

@pytest.fixture
def student():
    user = User.objects.create_user(username="student_user", email="student@test.com", password="password", role=User.ROLE_STUDENT, first_name="John", last_name="Doe")
    Student.objects.create(user_id=user.id, email=user.email)
    return user

@pytest.mark.django_db
def test_internship_lifecycle(api_client, institution_admin, employer_admin, employer_supervisor, student):
    inst_user, inst = institution_admin
    emp_user, emp = employer_admin
    sup_user, _ = employer_supervisor
    client = api_client
    
    # 1. Employer Admin creates Opportunity
    client.force_authenticate(user=emp_user)
    
    data = {
        "title": "Software Engineer Intern",
        "description": "Write code",
        "capacity": 5,
        "location_type": Internship.LOCATION_REMOTE,
        "employer_id": str(emp.id),
        "institution_id": str(inst.id) # Targeted opportunity
    }
    
    # Using service directly or API? API is better to test integration.
    # Try reversing the action directly
    try:
        url = reverse('internship-create-opportunity')
    except:
        url = reverse('internship-list') + 'create_opportunity/'

    response = client.post(url, data, format='json')
    assert response.status_code == status.HTTP_201_CREATED
    opp_id = response.data['id']
    
    # 2. Publish (DRAFT -> OPEN)
    # Using publish action
    url = reverse('internship-publish', args=[opp_id])
    response = client.post(url, format='json')
    assert response.status_code == status.HTTP_200_OK
    assert response.data['status'] == InternshipState.OPEN
    
    # 3. Student Applies (OPEN -> APPLIED)
    client.force_authenticate(user=student)
    url = reverse('internship-apply', args=[opp_id])
    response = client.post(url, format='json')
    assert response.status_code == status.HTTP_201_CREATED
    app_id = response.data['id']
    assert response.data['status'] == InternshipState.APPLIED
    
    # 4. Employer Shortlists (APPLIED -> SHORTLISTED)
    client.force_authenticate(user=emp_user)
    url = reverse('internship-process-application', args=[app_id])
    response = client.post(url, {'action': 'shortlist'}, format='json')
    assert response.status_code == status.HTTP_200_OK
    assert response.data['status'] == InternshipState.SHORTLISTED
    
    # 5. Employer Accepts (SHORTLISTED -> ACCEPTED)
    response = client.post(url, {'action': 'accept'}, format='json')
    assert response.status_code == status.HTTP_200_OK
    assert response.data['status'] == InternshipState.ACCEPTED
    
    # 6. Assign Supervisor
    url_assign = reverse('internship-assign-supervisor', args=[app_id])
    response = client.post(url_assign, {'supervisor_id': str(sup_user.id), 'type': 'employer'}, format='json')
    assert response.status_code == status.HTTP_200_OK
    assert response.data['employer_supervisor_id'] == str(sup_user.id)
    
    # 7. Start Internship (ACCEPTED -> ACTIVE)
    client.force_authenticate(user=emp_user)
    url_process = reverse('internship-process-application', args=[app_id])
    response = client.post(url_process, {'action': 'start'}, format='json')
    assert response.status_code == status.HTTP_200_OK
    assert response.data['status'] == InternshipState.ACTIVE
    
    # 8. Student submits Evidence (Logbook)
    client.force_authenticate(user=student)
    url_submit = reverse('internship-submit-evidence', args=[app_id])
    
    file_content = b"file_content"
    file = SimpleUploadedFile("log.pdf", file_content, content_type="application/pdf")
    
    response = client.post(url_submit, {
        'title': 'Week 1 Log',
        'file': file,
        'evidence_type': 'LOGBOOK'
    }, format='multipart')
    assert response.status_code == status.HTTP_201_CREATED
    evidence_id = response.data['id']
    
    # 9. Supervisor Reviews Evidence
    client.force_authenticate(user=sup_user)
    url_review = reverse('internship-review-evidence', args=[app_id, evidence_id])
    # Note: review_evidence action is on Detail view, but url usually includes PK.
    # Wait, review_evidence in views.py is @action(detail=True, url_path='review-evidence/(?P<evidence_id>[^/.]+)')
    # So reverse should take app_id AND evidence_id?
    # No, standard DRF actions on detail don't support extra args in reverse easily unless defined.
    # But let's check views.py definition.
    # @action(detail=True, methods=['post'], url_path='review-evidence/(?P<evidence_id>[^/.]+)')
    # def review_evidence(self, request, pk=None, evidence_id=None):
    # This might be tricky to reverse.
    # Let's construct manually if reverse fails.
    # But wait, we can try reverse('internship-review-evidence', args=[app_id, evidence_id])
    
    response = client.post(url_review, {
        'status': InternshipEvidence.STATUS_ACCEPTED,
        'notes': 'Good job'
    }, format='json')
    assert response.status_code == status.HTTP_200_OK
    assert response.data['status'] == InternshipEvidence.STATUS_ACCEPTED
    
    # 10. Supervisor Reports Incident
    url_incident = reverse('internship-report-incident', args=[app_id])
    response = client.post(url_incident, {
        'title': 'Late arrival',
        'description': 'Student was late'
    }, format='json')
    assert response.status_code == status.HTTP_201_CREATED
    incident_id = response.data['id']

    # 10b. Employer Admin Resolves Incident
    client.force_authenticate(user=emp_user)
    # Reversing URL for custom action with regex might be tricky
    # pattern: internships/{pk}/resolve-incident/{incident_id}/
    # We can use reverse('internship-resolve-incident', args=[app_id, incident_id]) if router names it so.
    # Usually DRF names it `basename-actionname`.
    # Let's try constructing if we are not sure, but `review-evidence` worked?
    # Actually I constructed `url_review` manually? No, I used reverse with 2 args.
    # Wait, in the previous code I commented:
    # "Note: review_evidence action is on Detail view... So reverse should take app_id AND evidence_id?"
    # And then I used `url_review = reverse('internship-review-evidence', args=[app_id, evidence_id])`
    # Let's assume it works.
    
    url_resolve = reverse('internship-resolve-incident', args=[app_id, incident_id])
    response = client.post(url_resolve, {
        'status': Incident.STATUS_RESOLVED,
        'resolution_notes': 'Talked to student'
    }, format='json')
    assert response.status_code == status.HTTP_200_OK
    assert response.data['status'] == Incident.STATUS_RESOLVED
    
    # 11. Employer Completes (ACTIVE -> COMPLETED)
    # Supervisor CANNOT complete.
    url_process = reverse('internship-process-application', args=[app_id])
    client.force_authenticate(user=sup_user)
    response = client.post(url_process, {'action': 'complete'}, format='json')
    assert response.status_code == status.HTTP_403_FORBIDDEN # Supervisor cannot complete
    
    # Employer Admin completes
    client.force_authenticate(user=emp_user)
    response = client.post(url_process, {'action': 'complete'}, format='json')
    assert response.status_code == status.HTTP_200_OK
    assert response.data['status'] == InternshipState.COMPLETED
    
    # 12. Institution Certifies (COMPLETED -> CERTIFIED)
    # Employer cannot certify
    response = client.post(url_process, {'action': 'certify'}, format='json')
    assert response.status_code == status.HTTP_403_FORBIDDEN
    
    # Institution Admin certifies
    client.force_authenticate(user=inst_user)
    response = client.post(url_process, {'action': 'certify'}, format='json')
    assert response.status_code == status.HTTP_200_OK
    assert response.data['status'] == InternshipState.CERTIFIED
