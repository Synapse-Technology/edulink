#!/usr/bin/env python
import os
import sys
import django

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
django.setup()

from institutions.models import Institution, Department, Supervisor

def create_test_data():
    try:
        # Get the first institution
        institution = Institution.objects.first()
        if not institution:
            print("No institution found. Please create an institution first.")
            return
        
        print(f"Using institution: {institution.name}")
        
        # Create test departments if they don't exist
        departments_data = [
            {
                'name': 'Computer Science',
                'code': 'CS',
                'description': 'Computer Science Department'
            },
            {
                'name': 'Engineering',
                'code': 'ENG',
                'description': 'Engineering Department'
            }
        ]
        
        created_departments = []
        for dept_data in departments_data:
            department, created = Department.objects.get_or_create(
                institution=institution,
                code=dept_data['code'],
                defaults={
                    'name': dept_data['name'],
                    'description': dept_data['description']
                }
            )
            
            if created:
                print(f"Created department: {department.name}")
            else:
                print(f"Department already exists: {department.name}")
            
            created_departments.append(department)
        
        # Create test supervisors
        test_supervisors = [
            {
                'name': 'Dr. Jane Smith',
                'email': 'jane.smith@institution.edu',
                'title': 'Professor',
                'specialization': 'Software Engineering',
                'department': created_departments[0]  # CS department
            },
            {
                'name': 'Prof. John Doe',
                'email': 'john.doe@institution.edu',
                'title': 'Associate Professor',
                'specialization': 'Data Science',
                'department': created_departments[0]  # CS department
            },
            {
                'name': 'Dr. Alice Johnson',
                'email': 'alice.johnson@institution.edu',
                'title': 'Senior Lecturer',
                'specialization': 'Mechanical Engineering',
                'department': created_departments[1]  # Engineering department
            },
            {
                'name': 'Test Supervisor',
                'email': 'test@supervisor.com',
                'title': 'Senior Supervisor',
                'specialization': 'Computer Science',
                'department': created_departments[0]  # CS department
            }
        ]
        
        for sup_data in test_supervisors:
            supervisor, created = Supervisor.objects.get_or_create(
                institution=institution,
                email=sup_data['email'],
                defaults={
                    'department': sup_data['department'],
                    'name': sup_data['name'],
                    'title': sup_data['title'],
                    'specialization': sup_data['specialization'],
                    'phone_number': '+1234567890'
                }
            )
            
            if created:
                print(f"Created supervisor: {supervisor.name} in {supervisor.department.name}")
            else:
                print(f"Supervisor already exists: {supervisor.name}")
        
        print(f"\nTotal departments: {Department.objects.filter(institution=institution).count()}")
        print(f"Total supervisors: {Supervisor.objects.filter(institution=institution).count()}")
        
        # List all supervisors
        print("\nAll supervisors:")
        for supervisor in Supervisor.objects.filter(institution=institution):
            dept_name = supervisor.department.name if supervisor.department else 'No Department'
            print(f"- {supervisor.name} ({supervisor.email}) - {dept_name}")
        
    except Exception as e:
        print(f"Error creating test data: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    create_test_data()