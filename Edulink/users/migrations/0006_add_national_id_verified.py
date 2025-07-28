# Generated migration for adding national_id_verified field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_remove_studentprofile_profile_completion'),
    ]

    operations = [
        migrations.AddField(
            model_name='studentprofile',
            name='national_id_verified',
            field=models.BooleanField(default=False, help_text='National ID verified against university records'),
        ),
    ]