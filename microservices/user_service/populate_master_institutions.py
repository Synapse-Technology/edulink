#!/usr/bin/env python
import os
import sys
import django
from pathlib import Path

# Add the project directory to Python path
project_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(project_dir))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'user_service.settings')
django.setup()

from django.db import connection, transaction
from institutions.models import AccreditationBody, DataSource, InstitutionType
import uuid
from datetime import datetime

def create_test_institutions():
    """Create some test institutions using raw SQL to bypass schema issues"""
    
    # Test institutions to create
    test_institutions = [
        {
            'name': 'University of Nairobi',
            'short_name': 'UoN',
            'institution_type': InstitutionType.UNIVERSITY,
            'accreditation_body': AccreditationBody.CUE,
            'data_source': DataSource.MANUAL,
            'is_public': True,
            'county': 'Nairobi',
            'website': 'https://www.uonbi.ac.ke',
            'email_domain': 'uonbi.ac.ke'
        },
        {
            'name': 'Kenyatta University',
            'short_name': 'KU',
            'institution_type': InstitutionType.UNIVERSITY,
            'accreditation_body': AccreditationBody.CUE,
            'data_source': DataSource.MANUAL,
            'is_public': True,
            'county': 'Kiambu',
            'website': 'https://www.ku.ac.ke',
            'email_domain': 'ku.ac.ke'
        },
        {
            'name': 'Test University',
            'short_name': 'TU',
            'institution_type': InstitutionType.UNIVERSITY,
            'accreditation_body': AccreditationBody.CUE,
            'data_source': DataSource.MANUAL,
            'is_public': False,
            'county': 'Nairobi',
            'website': 'https://www.testuniversity.ac.ke',
            'email_domain': 'testuniversity.ac.ke'
        },
        {
            'name': 'Nairobi Technical Training Institute',
            'short_name': 'NTTI',
            'institution_type': InstitutionType.TECHNICAL_INSTITUTE,
            'accreditation_body': AccreditationBody.TVETA,
            'data_source': DataSource.MANUAL,
            'is_public': True,
            'county': 'Nairobi',
            'website': 'https://www.ntti.ac.ke',
            'email_domain': 'ntti.ac.ke'
        },
        {
            'name': 'Strathmore University',
            'short_name': 'SU',
            'institution_type': InstitutionType.UNIVERSITY,
            'accreditation_body': AccreditationBody.CUE,
            'data_source': DataSource.MANUAL,
            'is_public': False,
            'county': 'Nairobi',
            'website': 'https://www.strathmore.edu',
            'email_domain': 'strathmore.edu'
        }
    ]
    
    created_count = 0
    updated_count = 0
    
    with connection.cursor() as cursor:
        with transaction.atomic():
            for inst_data in test_institutions:
                # Check if institution already exists
                cursor.execute(
                    "SELECT COUNT(*) FROM user_schema.master_institutions WHERE name = %s",
                    [inst_data['name']]
                )
                exists = cursor.fetchone()[0] > 0
                
                if not exists:
                    # Insert new institution
                    insert_sql = """
                        INSERT INTO user_schema.master_institutions (
                            id, name, short_name, institution_type, accreditation_body, 
                            data_source, county, website, email, accreditation_number,
                            accreditation_status, location, region, phone, source_url,
                            last_verified, is_active, is_verified, raw_data, metadata, 
                            created_at, updated_at, is_deleted
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                        )
                    """
                    
                    now = datetime.now()
                    cursor.execute(insert_sql, [
                        str(uuid.uuid4()),
                        inst_data['name'],
                        inst_data['short_name'],
                        inst_data['institution_type'],
                        inst_data['accreditation_body'],
                        inst_data['data_source'],
                        inst_data['county'],
                        inst_data['website'],
                        f"info@{inst_data['email_domain']}",  # email
                        'ACC-001',  # accreditation_number
                        'Active',   # accreditation_status
                        inst_data['county'],  # location
                        'Central',  # region
                        '+254700000000',  # phone
                        inst_data['website'],  # source_url
                        now,   # last_verified
                        True,  # is_active
                        True,  # is_verified
                        '{}',  # raw_data (empty JSON)
                        '{}',  # metadata (empty JSON)
                        now,   # created_at
                        now,   # updated_at
                        False  # is_deleted
                    ])
                    created_count += 1
                    print(f"✓ Created: {inst_data['name']}")
                else:
                    updated_count += 1
                    print(f"→ Already exists: {inst_data['name']}")
    
    # Get final count
    with connection.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) FROM user_schema.master_institutions")
        total_count = cursor.fetchone()[0]
    
    print(f"\n📊 Summary:")
    print(f"   Created: {created_count} institutions")
    print(f"   Already existed: {updated_count} institutions")
    print(f"   Total in database: {total_count}")
    
    # Test verification
    print(f"\n🔍 Testing verification:")
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT name, accreditation_body FROM user_schema.master_institutions WHERE name = %s",
            ['Test University']
        )
        result = cursor.fetchone()
        if result:
            print(f"   ✓ Test University found: {result[0]} ({result[1]})")
        else:
            print(f"   ✗ Test University not found")

if __name__ == '__main__':
    try:
        create_test_institutions()
        print("\n🎉 Successfully populated master institutions!")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()