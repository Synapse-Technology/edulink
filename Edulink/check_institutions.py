import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.base')
import django
django.setup()

from institutions.models import MasterInstitution

print('Total institutions:', MasterInstitution.objects.count())
print('Active institutions:', MasterInstitution.objects.filter(is_active=True).count())
print('\nSample active institutions:')
for inst in MasterInstitution.objects.filter(is_active=True)[:5]:
    print(f'  - {inst.name} (active: {inst.is_active})')

print('\nSample all institutions:')
for inst in MasterInstitution.objects.all()[:5]:
    print(f'  - {inst.name} (active: {inst.is_active})')