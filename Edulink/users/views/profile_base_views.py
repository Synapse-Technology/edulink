
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import RetrieveUpdateAPIView

class ProfileBaseView(RetrieveUpdateAPIView):
    """
    Shared logic for profile views. Should be inherited, not used directly.
    """
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user  # Will be overridden in child views
