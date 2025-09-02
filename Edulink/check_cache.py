import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.base')
import django
django.setup()

from django.core.cache import cache

print('Checking cache status...')
print('Cache key exists:', 'all_institutions_data' in cache)

cached_data = cache.get('all_institutions_data')
if cached_data:
    print('Cache data found:')
    print('  - Total institutions:', cached_data.get('total', 0))
    print('  - Last updated:', cached_data.get('last_updated', 'Unknown'))
else:
    print('No cached data found')

# Clear cache to force fresh data
print('\nClearing cache...')
cache.delete('all_institutions_data')
print('Cache cleared')