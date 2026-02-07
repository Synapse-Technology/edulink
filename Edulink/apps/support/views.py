from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from . import serializers, services, queries, policies
from .models import SupportTicket

class SupportTicketViewSet(viewsets.ModelViewSet):
    """
    Support ticket management.
    Handles user submissions, history, and admin resolution.
    """
    queryset = SupportTicket.objects.none()
    serializer_class = serializers.SupportTicketSerializer
    lookup_field = 'tracking_code'
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return SupportTicket.objects.none()
        
        if policies.can_manage_support(user):
            return queries.get_admin_tickets()
        
        return queries.get_user_tickets(user_id=user.id)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        attachments = request.FILES.getlist('attachments')
        
        ticket = services.create_support_ticket(
            user=request.user if request.user.is_authenticated else None,
            attachments=attachments,
            **serializer.validated_data
        )
        
        return Response(
            self.get_serializer(ticket).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'])
    def reply(self, request, tracking_code=None):
        ticket = self.get_object()
        
        if not policies.can_reply_to_ticket(request.user, ticket):
            return Response(
                {"detail": "You do not have permission to reply to this ticket."},
                status=status.HTTP_403_FORBIDDEN
            )
            
        message = request.data.get('message')
        if not message:
            return Response(
                {"detail": "Message is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        is_internal = request.data.get('is_internal', False)
        if is_internal and not policies.can_manage_support(request.user):
            is_internal = False # Reset if not admin
            
        comm = services.add_ticket_message(
            ticket_id=str(ticket.id),
            sender=request.user,
            message=message,
            is_internal=is_internal
        )
        
        return Response(
            serializers.TicketCommunicationSerializer(comm).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'])
    def resolve(self, request, tracking_code=None):
        ticket = self.get_object()
        
        if not policies.can_manage_support(request.user):
            return Response(
                {"detail": "Only support staff can resolve tickets."},
                status=status.HTTP_403_FORBIDDEN
            )
            
        notes = request.data.get('notes', '')
        resolved_ticket = services.resolve_ticket(
            ticket_id=str(ticket.id),
            actor=request.user,
            notes=notes
        )
        
        return Response(self.get_serializer(resolved_ticket).data)

    @action(detail=True, methods=['post'])
    def assign(self, request, tracking_code=None):
        ticket = self.get_object()
        
        if not policies.can_manage_support(request.user):
            return Response(
                {"detail": "Only support staff can assign tickets."},
                status=status.HTTP_403_FORBIDDEN
            )
            
        staff_id = request.data.get('staff_id')
        if not staff_id:
            return Response(
                {"detail": "Staff ID is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        assigned_ticket = services.assign_ticket(
            ticket_id=str(ticket.id),
            staff_profile_id=staff_id,
            actor=request.user
        )
        
        return Response(self.get_serializer(assigned_ticket).data)

class FeedbackView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    
    def post(self, request):
        serializer = serializers.FeedbackSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user if request.user.is_authenticated else None
            services.submit_feedback(
                message=serializer.validated_data['message'],
                user=user
            )
            return Response({"message": "Feedback submitted successfully!"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
