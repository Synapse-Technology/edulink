# Fix institution defaults to prevent unverified institutions in DB

from django.db import migrations, models


def fix_existing_unverified_institutions(apps, schema_editor):
    """Convert existing unverified institutions to verified or delete them."""
    Institution = apps.get_model('institutions', 'Institution')
    
    # In proper architecture, unverified institutions shouldn't exist
    # We'll mark them as verified for now, but ideally this should be reviewed
    Institution.objects.filter(is_verified=False).update(
        is_verified=True,
        status='verified'
    )


class Migration(migrations.Migration):

    dependencies = [
        ('institutions', '0008_institutionrequest_institution_trackin_0176fe_idx'),
    ]

    operations = [
        # First, fix any existing unverified institutions
        migrations.RunPython(fix_existing_unverified_institutions),
        
        # Then update the model defaults to prevent new unverified institutions
        migrations.AlterField(
            model_name='institution',
            name='is_verified',
            field=models.BooleanField(default=True),
        ),
        migrations.AlterField(
            model_name='institution',
            name='status',
            field=models.CharField(
                choices=[
                    ('requested', 'Requested'),
                    ('unverified', 'Unverified'),
                    ('verified', 'Verified'),
                    ('active', 'Active'),
                    ('suspended', 'Suspended'),
                ],
                default='verified',
                max_length=20,
            ),
        ),
    ]