#!/usr/bin/env python
import os
import sys
import django

# Add the project directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'edulink'))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from edulink.apps.institutions.models import Institution
from edulink.apps.platform_admin.serializers import InstitutionAdminSerializer

def test_contact_info():
    """Test that contact info is properly retrieved for institutions."""
    print("Testing institution contact info retrieval...")
    
    # Get first institution
    institution = Institution.objects.first()
    if not institution:
        print("No institutions found in database")
        return
    
    print(f"Testing with institution: {institution.name} (ID: {institution.id})")
    
    # Test serializer
    serializer = InstitutionAdminSerializer(institution)
    data = serializer.data
    
    print("\nContact fields from serializer:")
    print(f"contact_email: {data.get('contact_email')}")
    print(f"contact_phone: {data.get('contact_phone')}")
    print(f"contact_website: {data.get('contact_website')}")
    print(f"contact_address: {data.get('contact_address')}")
    
    # Test service function directly
    from edulink.apps.institutions import services as institution_services
    try:
        contact_info = institution_services.get_institution_contact_info(institution_id=institution.id)
        print(f"\nDirect service call results:")
        print(f"representative_name: {contact_info.get('representative_name')}")
        print(f"representative_email: {contact_info.get('representative_email')}")
        print(f"representative_phone: {contact_info.get('representative_phone')}")
        print(f"department: {contact_info.get('department')}")
        print(f"website_url: {contact_info.get('website_url')}")
        print(f"source: {contact_info.get('source')}")
    except Exception as e:
        print(f"Error calling service: {e}")

if __name__ == "__main__":
    test_contact_info()