#!/usr/bin/env python3
"""
Automated Account Generation Script for Edulink

This script creates test accounts for:
- 5 Employers with EmployerProfile
- 5 Institutions with InstitutionProfile

Generates secure credentials and handles all required fields and validation rules.
"""

import os
import django
import secrets
import string
from datetime import datetime
from django.utils import timezone

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
django.setup()

from authentication.models import User
from users.models.employer_profile import EmployerProfile
from users.models.institution_profile import InstitutionProfile
from institutions.models import Institution
from users.roles import RoleChoices
from django.db import transaction


class SecureCredentialGenerator:
    """Generate secure passwords and usernames"""
    
    @staticmethod
    def generate_password(length=12):
        """Generate a secure password with mixed characters"""
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        password = ''.join(secrets.choice(alphabet) for _ in range(length))
        # Ensure at least one of each type
        if not any(c.islower() for c in password):
            password = password[:-1] + secrets.choice(string.ascii_lowercase)
        if not any(c.isupper() for c in password):
            password = password[:-1] + secrets.choice(string.ascii_uppercase)
        if not any(c.isdigit() for c in password):
            password = password[:-1] + secrets.choice(string.digits)
        return password
    
    @staticmethod
    def generate_phone_number():
        """Generate a unique Kenyan phone number"""
        # Kenyan mobile format: +254-7XX-XXXXXX
        prefix = "+254-7"
        middle = secrets.choice(['01', '02', '03', '10', '11', '12', '20', '21', '22'])
        suffix = ''.join(secrets.choice(string.digits) for _ in range(6))
        return f"{prefix}{middle}-{suffix}"
    
    @staticmethod
    def generate_national_id():
        """Generate a unique Kenyan national ID"""
        return ''.join(secrets.choice(string.digits) for _ in range(8))


class AccountCreator:
    """Main class for creating test accounts"""
    
    def __init__(self):
        self.credential_generator = SecureCredentialGenerator()
        self.created_accounts = []
        
    def create_employer_accounts(self, count=5):
        """Create employer accounts with profiles"""
        print(f"\n=== Creating {count} Employer Accounts ===")
        
        employer_data = [
            {
                'company_name': 'TechCorp Kenya Ltd',
                'industry': 'Technology',
                'location': 'Nairobi, Kenya',
                'company_size': '51-200',
                'description': 'Leading software development company in East Africa',
                'website': 'https://techcorp.co.ke',
                'department': 'Human Resources',
                'position': 'HR Manager'
            },
            {
                'company_name': 'SafariBank Limited',
                'industry': 'Banking & Finance',
                'location': 'Mombasa, Kenya',
                'company_size': '201-500',
                'description': 'Premier banking institution serving East Africa',
                'website': 'https://safaribank.co.ke',
                'department': 'Internship Coordination',
                'position': 'Internship Coordinator'
            },
            {
                'company_name': 'GreenEnergy Solutions',
                'industry': 'Renewable Energy',
                'location': 'Kisumu, Kenya',
                'company_size': '11-50',
                'description': 'Sustainable energy solutions for rural communities',
                'website': 'https://greenenergy.co.ke',
                'department': 'Operations',
                'position': 'Operations Manager'
            },
            {
                'company_name': 'MediCare Hospital Group',
                'industry': 'Healthcare',
                'location': 'Eldoret, Kenya',
                'company_size': '501-1000',
                'description': 'Comprehensive healthcare services across Kenya',
                'website': 'https://medicare.co.ke',
                'department': 'Medical Education',
                'position': 'Training Supervisor'
            },
            {
                'company_name': 'AgriTech Innovations',
                'industry': 'Agriculture Technology',
                'location': 'Nakuru, Kenya',
                'company_size': '1-10',
                'description': 'Smart farming solutions for modern agriculture',
                'website': 'https://agritech.co.ke',
                'department': 'Research & Development',
                'position': 'R&D Director'
            }
        ]
        
        for i, data in enumerate(employer_data[:count]):
            try:
                with transaction.atomic():
                    # Generate credentials
                    email = f"employer{i+1}@{data['company_name'].lower().replace(' ', '').replace('ltd', '').replace('limited', '').replace('group', '')}.co.ke"
                    password = self.credential_generator.generate_password()
                    phone = self.credential_generator.generate_phone_number()
                    national_id = self.credential_generator.generate_national_id()
                    
                    # Create user
                    user = User.objects.create_user(
                        email=email,
                        password=password,
                        phone_number=phone,
                        national_id=national_id,
                        role=RoleChoices.EMPLOYER,
                        is_email_verified=True
                    )
                    
                    # Create employer profile
                    employer_profile = EmployerProfile.objects.create(
                        user=user,
                        first_name=f"Employer{i+1}",
                        last_name="Manager",
                        phone_number=phone,
                        company_name=data['company_name'],
                        company_description=data['description'],
                        industry=data['industry'],
                        website=data['website'],
                        location=data['location'],
                        company_size=data['company_size'],
                        department=data['department'],
                        position=data['position'],
                        is_verified=True
                    )
                    
                    # Store credentials
                    account_info = {
                        'type': 'Employer',
                        'company': data['company_name'],
                        'email': email,
                        'password': password,
                        'phone': phone,
                        'national_id': national_id,
                        'user_id': str(user.id),
                        'profile_id': employer_profile.id
                    }
                    
                    self.created_accounts.append(account_info)
                    print(f"✓ Created employer: {data['company_name']} ({email})")
                    
            except Exception as e:
                print(f"✗ Failed to create employer {data['company_name']}: {str(e)}")
    
    def create_institution_accounts(self, count=5):
        """Create institution accounts with profiles"""
        print(f"\n=== Creating {count} Institution Accounts ===")
        
        institution_data = [
            {
                'name': 'Nairobi Technical Institute',
                'type': 'Institute',
                'address': 'P.O. Box 12345, Nairobi, Kenya',
                'website': 'https://nti.ac.ke',
                'registration_number': 'NTI-2024-001'
            },
            {
                'name': 'Mombasa Polytechnic College',
                'type': 'Polytechnic',
                'address': 'P.O. Box 67890, Mombasa, Kenya',
                'website': 'https://mpc.ac.ke',
                'registration_number': 'MPC-2024-002'
            },
            {
                'name': 'Kisumu University College',
                'type': 'University',
                'address': 'P.O. Box 54321, Kisumu, Kenya',
                'website': 'https://kuc.ac.ke',
                'registration_number': 'KUC-2024-003'
            },
            {
                'name': 'Eldoret Institute of Technology',
                'type': 'Institute',
                'address': 'P.O. Box 98765, Eldoret, Kenya',
                'website': 'https://eit.ac.ke',
                'registration_number': 'EIT-2024-004'
            },
            {
                'name': 'Nakuru TVET College',
                'type': 'TVET Institution',
                'address': 'P.O. Box 13579, Nakuru, Kenya',
                'website': 'https://ntvet.ac.ke',
                'registration_number': 'NTVET-2024-005'
            }
        ]
        
        for i, data in enumerate(institution_data[:count]):
            try:
                with transaction.atomic():
                    # Generate credentials
                    domain = data['name'].lower().replace(' ', '').replace('institute', '').replace('college', '').replace('university', '').replace('polytechnic', '').replace('tvet', '')
                    email = f"admin@{domain}.ac.ke"
                    password = self.credential_generator.generate_password()
                    phone = self.credential_generator.generate_phone_number()
                    national_id = self.credential_generator.generate_national_id()
                    admin_phone = self.credential_generator.generate_phone_number()
                    
                    # Create institution
                    institution = Institution.objects.create(
                        name=data['name'],
                        institution_type=data['type'],
                        email=email,
                        phone_number=phone,
                        website=data['website'],
                        address=data['address'],
                        registration_number=data['registration_number'],
                        is_verified=True
                    )
                    
                    # Create admin user
                    user = User.objects.create_user(
                        email=email,
                        password=password,
                        phone_number=phone,
                        national_id=national_id,
                        role=RoleChoices.INSTITUTION_ADMIN,
                        is_email_verified=True
                    )
                    
                    # Create institution profile
                    institution_profile = InstitutionProfile.objects.create(
                        user=user,
                        institution=institution,
                        first_name=f"Admin{i+1}",
                        last_name="Manager",
                        phone_number=admin_phone,
                        position="Registrar",
                        phone_verified=True,
                        is_active=True
                    )
                    
                    # Store credentials
                    account_info = {
                        'type': 'Institution',
                        'institution': data['name'],
                        'email': email,
                        'password': password,
                        'phone': phone,
                        'national_id': national_id,
                        'user_id': str(user.id),
                        'institution_id': institution.id,
                        'profile_id': institution_profile.id
                    }
                    
                    self.created_accounts.append(account_info)
                    print(f"✓ Created institution: {data['name']} ({email})")
                    
            except Exception as e:
                print(f"✗ Failed to create institution {data['name']}: {str(e)}")
    
    def generate_credentials_report(self):
        """Generate a comprehensive credentials report"""
        print("\n" + "="*80)
        print("SECURE LOGIN CREDENTIALS REPORT")
        print("Generated on:", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        print("="*80)
        
        # Group by type
        employers = [acc for acc in self.created_accounts if acc['type'] == 'Employer']
        institutions = [acc for acc in self.created_accounts if acc['type'] == 'Institution']
        
        # Employers section
        if employers:
            print("\n🏢 EMPLOYER ACCOUNTS")
            print("-" * 50)
            for i, emp in enumerate(employers, 1):
                print(f"\n{i}. {emp['company']}")
                print(f"   Email:       {emp['email']}")
                print(f"   Password:    {emp['password']}")
                print(f"   Phone:       {emp['phone']}")
                print(f"   National ID: {emp['national_id']}")
                print(f"   User ID:     {emp['user_id']}")
        
        # Institutions section
        if institutions:
            print("\n🏫 INSTITUTION ACCOUNTS")
            print("-" * 50)
            for i, inst in enumerate(institutions, 1):
                print(f"\n{i}. {inst['institution']}")
                print(f"   Email:        {inst['email']}")
                print(f"   Password:     {inst['password']}")
                print(f"   Phone:        {inst['phone']}")
                print(f"   National ID:  {inst['national_id']}")
                print(f"   User ID:      {inst['user_id']}")
                print(f"   Institution ID: {inst['institution_id']}")
        
        # Summary
        print("\n" + "="*80)
        print("SUMMARY")
        print("="*80)
        print(f"Total Accounts Created: {len(self.created_accounts)}")
        print(f"Employers: {len(employers)}")
        print(f"Institutions: {len(institutions)}")
        print("\n⚠️  SECURITY NOTICE:")
        print("   - Store these credentials securely")
        print("   - Change passwords after first login")
        print("   - Enable two-factor authentication where available")
        print("   - Do not share credentials via unsecured channels")
        
        return self.created_accounts
    
    def save_credentials_to_file(self, filename=None):
        """Save credentials to a secure file"""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"test_accounts_credentials_{timestamp}.txt"
        
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                f.write("EDULINK TEST ACCOUNTS - SECURE CREDENTIALS\n")
                f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write("="*80 + "\n\n")
                
                # Employers
                employers = [acc for acc in self.created_accounts if acc['type'] == 'Employer']
                if employers:
                    f.write("EMPLOYER ACCOUNTS\n")
                    f.write("-" * 50 + "\n")
                    for i, emp in enumerate(employers, 1):
                        f.write(f"\n{i}. {emp['company']}\n")
                        f.write(f"   Email: {emp['email']}\n")
                        f.write(f"   Password: {emp['password']}\n")
                        f.write(f"   Phone: {emp['phone']}\n")
                        f.write(f"   National ID: {emp['national_id']}\n")
                        f.write(f"   User ID: {emp['user_id']}\n")
                
                # Institutions
                institutions = [acc for acc in self.created_accounts if acc['type'] == 'Institution']
                if institutions:
                    f.write("\n\nINSTITUTION ACCOUNTS\n")
                    f.write("-" * 50 + "\n")
                    for i, inst in enumerate(institutions, 1):
                        f.write(f"\n{i}. {inst['institution']}\n")
                        f.write(f"   Email: {inst['email']}\n")
                        f.write(f"   Password: {inst['password']}\n")
                        f.write(f"   Phone: {inst['phone']}\n")
                        f.write(f"   National ID: {inst['national_id']}\n")
                        f.write(f"   User ID: {inst['user_id']}\n")
                        f.write(f"   Institution ID: {inst['institution_id']}\n")
                
                f.write("\n" + "="*80 + "\n")
                f.write("SECURITY NOTICE:\n")
                f.write("- Store this file securely and delete after use\n")
                f.write("- Change passwords after first login\n")
                f.write("- Enable two-factor authentication\n")
                f.write("- Do not share via unsecured channels\n")
            
            print(f"\n📄 Credentials saved to: {filename}")
            return filename
            
        except Exception as e:
            print(f"\n❌ Failed to save credentials file: {str(e)}")
            return None


def main():
    """Main execution function"""
    print("🚀 EDULINK AUTOMATED ACCOUNT GENERATION")
    print("========================================")
    print("This script will create test accounts with secure credentials.")
    print("Please ensure you have proper database access and permissions.\n")
    
    try:
        # Initialize account creator
        creator = AccountCreator()
        
        # Create accounts
        creator.create_employer_accounts(5)
        creator.create_institution_accounts(5)
        
        # Generate and display report
        credentials = creator.generate_credentials_report()
        
        # Save to file
        filename = creator.save_credentials_to_file()
        
        print("\n✅ Account generation completed successfully!")
        print(f"📊 Total accounts created: {len(credentials)}")
        
        if filename:
            print(f"📁 Credentials file: {filename}")
            print("\n⚠️  IMPORTANT: Secure the credentials file and delete after use!")
        
    except Exception as e:
        print(f"\n❌ Script execution failed: {str(e)}")
        print("Please check your Django setup and database connection.")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())