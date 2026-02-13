from rest_framework import viewsets, permissions, pagination
from rest_framework.decorators import action
from django.http import HttpResponse
from django.template.loader import get_template
from django.db import models
from xhtml2pdf import pisa
from io import BytesIO
from .models import LedgerEvent
from .serializers import LedgerEventSerializer

class IsSystemAdmin(permissions.BasePermission):
    """
    Custom permission to only allow system admins to view the ledger.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_staff

class StandardResultsSetPagination(pagination.PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class LedgerEventViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LedgerEvent.objects.all().order_by('-occurred_at')
    serializer_class = LedgerEventSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filterset_fields = ['event_type', 'entity_type', 'actor_id', 'entity_id']
    search_fields = ['event_type', 'entity_type', 'payload']

    def get_queryset(self):
        from .queries import get_events_for_user_context
        user = self.request.user
        
        # System admins can see everything
        if user.is_staff or (hasattr(user, 'is_system_admin') and user.is_system_admin):
            return super().get_queryset()
            
        # 1. Identify relevant profile ID for the user
        profile_id = None
        
        if hasattr(user, 'is_student') and user.is_student:
            from edulink.apps.students.queries import get_student_for_user
            student = get_student_for_user(user.id)
            if student:
                profile_id = str(student.id)
                
        elif (hasattr(user, 'is_employer_admin') and user.is_employer_admin) or \
             (hasattr(user, 'is_supervisor') and user.is_supervisor):
            from edulink.apps.employers.queries import get_supervisor_id_for_user
            profile_id = get_supervisor_id_for_user(user.id)
            if profile_id:
                profile_id = str(profile_id)
        
        # 2. Return filtered events if profile_id found, else just user-actor events
        if profile_id:
            return get_events_for_user_context(profile_id=profile_id)
            
        return super().get_queryset().filter(actor_id=str(user.id))

    @action(detail=False, methods=['get'])
    def export(self, request):
        """
        Export filtered audit logs as PDF.
        """
        # 1. Filter the queryset based on request params
        queryset = self.filter_queryset(self.get_queryset())
        
        # Limit export to reasonable amount to prevent timeouts (e.g. 500)
        # unless explicit 'all' param is passed, but for safety let's cap it.
        events = queryset[:500]
        
        # 2. Prepare context
        context = {
            'events': events,
            'user': request.user,
        }
        
        # 3. Render template
        template = get_template('ledger/audit_log_export.html')
        html = template.render(context)
        
        # 4. Generate PDF
        result = BytesIO()
        pdf = pisa.pisaDocument(BytesIO(html.encode("UTF-8")), result)
        
        if not pdf.err:
            response = HttpResponse(result.getvalue(), content_type='application/pdf')
            filename = f"audit_log_{request.user.username}.pdf"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
            
        return HttpResponse('Error generating PDF', status=500)
