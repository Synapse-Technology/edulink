import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
import django
django.setup()

from django.test import RequestFactory
from institutions.views import get_all_institutions
from django.core.cache import cache
import json

print('=== Testing get_all_institutions view directly ===')

# Clear cache first
cache.clear()
print('Cache cleared')

# Create a mock request
factory = RequestFactory()
request = factory.get('/api/institutions/all/')

try:
    # Call the view directly
    response = get_all_institutions(request)
    
    print(f'Response status: {response.status_code}')
    print(f'Response data type: {type(response.data)}')
    
    if hasattr(response, 'data'):
        data = response.data
        print(f'Institutions count: {data.get("total", 0)}')
        print(f'Last updated: {data.get("last_updated", "Unknown")}')
        
        if data.get('institutions'):
            print('\nFirst 3 institutions:')
            for i, inst in enumerate(data['institutions'][:3]):
                print(f'  {i+1}. {inst.get("name", "Unknown")} - {inst.get("institution_type", "Unknown")}')
        else:
            print('No institutions in response')
            
        # Print full response for debugging
        print('\nFull response:')
        print(json.dumps(data, indent=2, default=str))
    else:
        print('No data attribute in response')
        print(f'Response content: {response.content}')
        
except Exception as e:
    print(f'Error calling view: {e}')
    import traceback
    traceback.print_exc()