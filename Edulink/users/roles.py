from django.utils.translation import gettext_lazy as _


class RoleChoices:
    STUDENT = 'student'
    INSTITUTION_ADMIN = 'institution_admin'
    EMPLOYER = 'employer'
    SUPER_ADMIN = 'super_admin'

    CHOICES = [
        (STUDENT, _('Student')),
        (INSTITUTION_ADMIN, _('Institution Admin')),
        (EMPLOYER, _('Employer')),
        (SUPER_ADMIN, _('Super Admin')),
    ]
