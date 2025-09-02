import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
import django
django.setup()

from institutions.models import MasterInstitution, Institution
from django.utils import timezone
from django.core.cache import cache

print('=== Debug API Query with DEV settings ===')

# Check cache first
cache_key = "all_institutions_data"
cached_result = cache.get(cache_key)
print(f'Cache exists: {cached_result is not None}')
if cached_result:
    print(f'Cached data: {cached_result}')

# Test the exact query from get_all_institutions
master_institutions = MasterInstitution.objects.filter(is_active=True).order_by('name')
print(f'Active master institutions count: {master_institutions.count()}')

# Get all registered institutions for status checking
registered_institutions = Institution.objects.select_related('master_institution').all()
print(f'Registered institutions count: {registered_institutions.count()}')

registered_dict = {
    inst.master_institution.id: inst for inst in registered_institutions if inst.master_institution
}
print(f'Registered dict size: {len(registered_dict)}')

results = []
for master_inst in master_institutions:
    registered_inst = registered_dict.get(master_inst.id)
    
    result = {
        'id': master_inst.id,
        'name': master_inst.name,
        'display_name': master_inst.get_display_name(),
        'institution_type': master_inst.institution_type,
        'accreditation_body': master_inst.accreditation_body,
        'is_public': master_inst.is_public,
        'county': master_inst.county,
        'status': 'registered' if registered_inst else 'not_registered',
        'is_verified': registered_inst.is_verified if registered_inst else False,
        'university_code': registered_inst.university_code if registered_inst else None,
        'registration_number': registered_inst.registration_number if registered_inst else None
    }
    results.append(result)

print(f'\nResults count: {len(results)}')
if results:
    print('\nFirst 3 results:')
    for i, result in enumerate(results[:3]):
        print(f'  {i+1}. {result["name"]} - {result["institution_type"]}')

response_data = {
    'institutions': results,
    'total': len(results),
    'last_updated': timezone.now().isoformat()
}

print(f'\nFinal response data:')
print(f'  - Total: {response_data["total"]}')
print(f'  - Last updated: {response_data["last_updated"]}')

# Test caching
print('\nTesting cache...')
cache.set(cache_key, response_data, 3600)
print('Data cached successfully')