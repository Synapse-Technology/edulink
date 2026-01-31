from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("institutions", "0006_institutionrequest"),
    ]

    operations = [
        migrations.AddField(
            model_name="institutionrequest",
            name="tracking_code",
            field=models.CharField(
                max_length=20,
                unique=True,
                null=True,
                blank=True,
                help_text="Human-readable tracking code for support reference",
            ),
        ),
    ]

