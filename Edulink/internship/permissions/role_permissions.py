from rest_framework.permissions import BasePermission
from internship.models.internship import Internship
from application.models import Application


class IsEmployerOwner(BasePermission):
    """
    Allows access only to the employer who owns the internship.
    """

    def has_permission(self, request, view):
        internship_id = view.kwargs.get('pk') or view.kwargs.get('internship_id')
        if not internship_id:
            return False

        try:
            internship = Internship.objects.get(pk=internship_id)  # type: ignore[attr-defined]
            return internship.employer.user == request.user
        except Internship.DoesNotExist:  # type: ignore[attr-defined]
            return False


class IsVerifiedEmployer(BasePermission):
    """
    Allows access only to verified employers.
    """

    def has_permission(self, request, view):
        return hasattr(request.user, 'employer_profile') and request.user.employer_profile.is_verified


class CanEditInternship(BasePermission):
    """
    Allows editing only if the internship is not yet verified.
    """

    def has_permission(self, request, view):
        if request.method not in ['PUT', 'PATCH', 'DELETE']:
            return True

        internship_id = view.kwargs.get('pk')
        if not internship_id:
            return False

        try:
            internship = Internship.objects.get(pk=internship_id)  # type: ignore[attr-defined]
            return internship.employer.user == request.user and not internship.is_verified
        except Internship.DoesNotExist:  # type: ignore[attr-defined]
            return False


class CanVerifyInternship(BasePermission):
    """
    Allows verification only by institution admins linked to the internship's institution.
    """

    def has_permission(self, request, view):
        if not hasattr(request.user, 'institution_profile'):
            return False

        internship_id = view.kwargs.get('pk')
        if not internship_id:
            return False

        try:
            internship = Internship.objects.get(pk=internship_id)  # type: ignore[attr-defined]
            return internship.institution == request.user.institution_profile.institution
        except Internship.DoesNotExist:  # type: ignore[attr-defined]
            return False


class CanViewInternship(BasePermission):
    """
    Allows viewing based on visibility settings and user role.
    """

    def has_permission(self, request, view):
        internship_id = view.kwargs.get('pk')
        if not internship_id:
            return True  # Allow listing

        try:
            internship = Internship.objects.get(pk=internship_id)  # type: ignore[attr-defined]

            # Public internships can be viewed by anyone
            if internship.visibility == 'public':
                return True

            # Institution-only internships require student to be from that institution
            if internship.visibility == 'institution-only':
                if hasattr(request.user, 'student_profile'):
                    return request.user.student_profile.institution == internship.institution
                return False

            return True
        except Internship.DoesNotExist:  # type: ignore[attr-defined]
            return False


class CanApplyToInternship(BasePermission):
    """
    Allows application only if the internship is active, verified, and not expired.
    """

    def has_permission(self, request, view):
        if not hasattr(request.user, 'student_profile'):
            return False

        internship_id = view.kwargs.get('pk') or request.data.get('internship')
        if not internship_id:
            return False

        try:
            internship = Internship.objects.get(pk=internship_id)  # type: ignore[attr-defined]

            # Check if student can apply
            if not internship.can_apply:
                return False

            # Check if student has already applied
            existing_application = Application.objects.filter(  # type: ignore[attr-defined]
                student=request.user.student_profile,
                internship=internship
            ).exists()

            return not existing_application
        except Internship.DoesNotExist:  # type: ignore[attr-defined]
            return False


class CanManageApplication(BasePermission):
    """
    Allows managing applications by the student who applied or the employer who posted the internship.
    """

    def has_permission(self, request, view):
        application_id = view.kwargs.get('pk')
        if not application_id:
            return False

        try:
            application = Application.objects.get(pk=application_id)  # type: ignore[attr-defined]

            # Student can manage their own application
            if application.student.user == request.user:
                return True

            # Employer can manage applications to their internships
            if hasattr(request.user, 'employer_profile'):
                return application.internship.employer.user == request.user

            return False
        except Application.DoesNotExist:  # type: ignore[attr-defined]
            return False
