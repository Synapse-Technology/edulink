from django.utils.translation import gettext_lazy as _


class RoleChoices:
    STUDENT = 'student'
    INSTITUTION_ADMIN = 'institution_admin'
    EMPLOYER = 'employer'
    COMPANY_SUPERVISOR = 'company_supervisor'
    INSTITUTION_SUPERVISOR = 'institution_supervisor'
    SUPER_ADMIN = 'super_admin'

    CHOICES = [
        (STUDENT, _('Student')),
        (INSTITUTION_ADMIN, _('Institution Admin')),
        (EMPLOYER, _('Employer')),
        (COMPANY_SUPERVISOR, _('Company Supervisor')),
        (INSTITUTION_SUPERVISOR, _('Institution Supervisor')),
        (SUPER_ADMIN, _('Super Admin')),
    ]
