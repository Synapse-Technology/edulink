from rest_framework import viewsets, permissions, pagination
from rest_framework.decorators import action
from django.http import HttpResponse
from django.template.loader import get_template
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
    permission_classes = [IsSystemAdmin]
    pagination_class = StandardResultsSetPagination
    filterset_fields = ['event_type', 'entity_type', 'actor_id', 'entity_id']
    search_fields = ['event_type', 'entity_type', 'payload']

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
