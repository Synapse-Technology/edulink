from django.db import migrations


def infer_owner_side(checkin, Supervisor, InstitutionStaff, User):
    metadata = checkin.metadata or {}
    if metadata.get("owner_side") in {"EMPLOYER", "INSTITUTION", "PLATFORM"}:
        return None

    scheduled_by = str(checkin.scheduled_by)
    application = checkin.application

    if application.employer_supervisor_id and scheduled_by == str(application.employer_supervisor_id):
        return "EMPLOYER"

    if application.institution_supervisor_id and scheduled_by == str(application.institution_supervisor_id):
        return "INSTITUTION"

    employer_supervisor = Supervisor.objects.filter(id=checkin.scheduled_by).first()
    if not employer_supervisor:
        employer_supervisor = Supervisor.objects.filter(user_id=checkin.scheduled_by).first()

    if employer_supervisor:
        if application.employer_supervisor_id and str(employer_supervisor.id) == str(application.employer_supervisor_id):
            return "EMPLOYER"
        if application.opportunity.employer_id and str(employer_supervisor.employer_id) == str(application.opportunity.employer_id):
            return "EMPLOYER"

    institution_staff = InstitutionStaff.objects.filter(id=checkin.scheduled_by).first()
    if not institution_staff:
        institution_staff = InstitutionStaff.objects.filter(user_id=checkin.scheduled_by).first()

    if institution_staff:
        if application.institution_supervisor_id and str(institution_staff.id) == str(application.institution_supervisor_id):
            return "INSTITUTION"
        snapshot_institution_id = (application.application_snapshot or {}).get("institution_id")
        if snapshot_institution_id and str(snapshot_institution_id) == str(institution_staff.institution_id):
            return "INSTITUTION"
        if application.opportunity.institution_id and str(application.opportunity.institution_id) == str(institution_staff.institution_id):
            return "INSTITUTION"

    user = User.objects.filter(id=checkin.scheduled_by).first()
    if user and user.role == "system_admin":
        return "PLATFORM"

    return None


def backfill_owner_side(apps, schema_editor):
    SupervisionCheckIn = apps.get_model("internships", "SupervisionCheckIn")
    Supervisor = apps.get_model("employers", "Supervisor")
    InstitutionStaff = apps.get_model("institutions", "InstitutionStaff")
    User = apps.get_model("accounts", "User")

    checkins = SupervisionCheckIn.objects.select_related("application", "application__opportunity").all()
    for checkin in checkins.iterator():
        owner_side = infer_owner_side(checkin, Supervisor, InstitutionStaff, User)
        if not owner_side:
            continue

        metadata = dict(checkin.metadata or {})
        metadata["owner_side"] = owner_side
        checkin.metadata = metadata
        checkin.save(update_fields=["metadata"])


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0001_initial"),
        ("employers", "0010_employer_logo"),
        ("institutions", "0019_institution_logo"),
        ("internships", "0024_supervision_checkin"),
    ]

    operations = [
        migrations.RunPython(backfill_owner_side, migrations.RunPython.noop),
    ]
