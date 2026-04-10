# Generated migration for is_deadline_expired property
# This is a computed property, not a database field, so no database operations needed

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("internships", "0017_add_deadline_indexes"),
    ]

    operations = [
        # No database operations needed - is_deadline_expired is a computed @property
    ]
