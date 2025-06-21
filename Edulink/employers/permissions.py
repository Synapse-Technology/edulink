from rest_framework.permissions import BasePermission
from internship.models.internship import Internship

class IsEmployerOwner(BasePermission):
    """
    Allows access only to the employer who owns the internship.
    """

    def has_permission(self, request, view):
        internship_id = view.kwargs.get('internship_id')
        try:
            internship = Internship.objects.get(pk=internship_id)
            # Check if the request user is the user associated with the employer of the internship
            return internship.employer.user == request.user
        except Internship.DoesNotExist:
            return False 