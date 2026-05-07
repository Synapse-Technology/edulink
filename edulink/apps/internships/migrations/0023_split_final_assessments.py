from django.db import migrations, models


def copy_legacy_final_assessment(apps, schema_editor):
    InternshipApplication = apps.get_model("internships", "InternshipApplication")
    for application in InternshipApplication.objects.exclude(final_feedback=""):
        application.employer_final_feedback = application.final_feedback
        application.employer_final_rating = application.final_rating
        application.save(update_fields=[
            "employer_final_feedback",
            "employer_final_rating",
        ])


class Migration(migrations.Migration):

    dependencies = [
        ("internships", "0022_external_placement_declaration"),
    ]

    operations = [
        migrations.AddField(
            model_name="internshipapplication",
            name="employer_final_feedback",
            field=models.TextField(blank=True, help_text="Final assessment from employer supervisor"),
        ),
        migrations.AddField(
            model_name="internshipapplication",
            name="employer_final_rating",
            field=models.PositiveIntegerField(blank=True, help_text="Employer supervisor rating (1-5)", null=True),
        ),
        migrations.AddField(
            model_name="internshipapplication",
            name="employer_final_feedback_by",
            field=models.UUIDField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="internshipapplication",
            name="employer_final_feedback_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="internshipapplication",
            name="institution_final_feedback",
            field=models.TextField(blank=True, help_text="Final assessment from institution assessor"),
        ),
        migrations.AddField(
            model_name="internshipapplication",
            name="institution_final_rating",
            field=models.PositiveIntegerField(blank=True, help_text="Institution assessor rating (1-5)", null=True),
        ),
        migrations.AddField(
            model_name="internshipapplication",
            name="institution_final_feedback_by",
            field=models.UUIDField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="internshipapplication",
            name="institution_final_feedback_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(copy_legacy_final_assessment, migrations.RunPython.noop),
    ]
