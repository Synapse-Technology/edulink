from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Case, When, IntegerField
from django.utils import timezone
from django.db import transaction
import sys
import os

# Add shared modules to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../shared'))

from .models import Internship, SkillTag
from .serializers import (
    InternshipListSerializer,
    InternshipDetailSerializer,
    InternshipCreateSerializer,
    InternshipVerificationSerializer,
    InternshipStatsSerializer,
    SkillTagSerializer
)
from .permissions import (
    IsEmployerOwner,
    IsVerifiedEmployer,
    CanEditInternship,
    CanVerifyInternship,
    CanViewInternship,
    IsInternshipActive,
    CanManageInternshipSettings
)
from .filters import InternshipFilter
from base_service import BaseService, ServiceRegistry, service_error_handler
from events import publish_event, EventType


class SkillTagViewSet(viewsets.ModelViewSet):
    """ViewSet for managing skill tags"""
    queryset = SkillTag.objects.filter(is_active=True)
    serializer_class = SkillTagSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at', 'internship_count']
    ordering = ['name']
    
    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['list', 'retrieve']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAuthenticated, CanManageInternshipSettings]
        return [permission() for permission in permission_classes]


class InternshipViewSet(viewsets.ModelViewSet):
    """ViewSet for managing internships"""
    queryset = Internship.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = InternshipFilter
    search_fields = ['title', 'description', 'location', 'required_skills', 'preferred_skills']
    ordering_fields = ['created_at', 'deadline', 'start_date', 'title', 'stipend']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return InternshipCreateSerializer
        elif self.action in ['list']:
            return InternshipListSerializer
        elif self.action == 'verify':
            return InternshipVerificationSerializer
        return InternshipDetailSerializer
    
    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['list', 'retrieve']:
            permission_classes = [AllowAny, CanViewInternship]
        elif self.action == 'create':
            permission_classes = [IsAuthenticated, IsVerifiedEmployer]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, IsEmployerOwner, CanEditInternship]
        elif self.action == 'verify':
            permission_classes = [IsAuthenticated, CanVerifyInternship]
        elif self.action in ['feature', 'unfeature']:
            permission_classes = [IsAuthenticated, CanManageInternshipSettings]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """Filter queryset based on user and action"""
        queryset = Internship.objects.select_related().prefetch_related('skill_tags')
        
        # For list view, show only active and verified internships to public
        if self.action == 'list':
            if not self.request.user.is_authenticated:
                queryset = queryset.filter(
                    is_active=True,
                    is_verified=True,
                    visibility='public'
                )
            else:
                # Authenticated users can see more based on their role
                # This would involve calling user service to get user role
                pass
        
        return queryset
    
    @service_error_handler
    def create(self, request, *args, **kwargs):
        """Create a new internship"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            internship = serializer.save()
            
            # Publish internship created event
            publish_event(
                EventType.INTERNSHIP_CREATED,
                {
                    'internship_id': internship.id,
                    'employer_id': internship.employer_id,
                    'title': internship.title,
                    'category': internship.category
                }
            )
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    @service_error_handler
    def update(self, request, *args, **kwargs):
        """Update an internship"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            internship = serializer.save()
            
            # Publish internship updated event
            publish_event(
                EventType.INTERNSHIP_UPDATED,
                {
                    'internship_id': internship.id,
                    'employer_id': internship.employer_id,
                    'title': internship.title,
                    'changes': list(serializer.validated_data.keys())
                }
            )
        
        return Response(serializer.data)
    
    @service_error_handler
    def destroy(self, request, *args, **kwargs):
        """Delete an internship"""
        instance = self.get_object()
        internship_data = {
            'internship_id': instance.id,
            'employer_id': instance.employer_id,
            'title': instance.title
        }
        
        with transaction.atomic():
            self.perform_destroy(instance)
            
            # Publish internship deleted event
            publish_event(
                EventType.INTERNSHIP_DELETED,
                internship_data
            )
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanVerifyInternship])
    @service_error_handler
    def verify(self, request, pk=None):
        """Verify an internship"""
        internship = self.get_object()
        serializer = InternshipVerificationSerializer(internship, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            # Set the verifier ID from the request user
            # In a real implementation, this would get the institution profile ID
            # from the user service
            verified_data = serializer.validated_data.copy()
            if verified_data.get('is_verified'):
                verified_data['verified_by_id'] = request.user.id  # Simplified
            
            internship = serializer.save(**verified_data)
            
            # Publish internship verification event
            publish_event(
                EventType.INTERNSHIP_VERIFIED if internship.is_verified else EventType.INTERNSHIP_UNVERIFIED,
                {
                    'internship_id': internship.id,
                    'employer_id': internship.employer_id,
                    'verified_by_id': internship.verified_by_id,
                    'verification_date': internship.verification_date.isoformat() if internship.verification_date else None
                }
            )
        
        return Response(InternshipDetailSerializer(internship).data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanManageInternshipSettings])
    @service_error_handler
    def feature(self, request, pk=None):
        """Feature an internship"""
        internship = self.get_object()
        internship.is_featured = True
        internship.save()
        
        # Publish internship featured event
        publish_event(
            EventType.INTERNSHIP_FEATURED,
            {
                'internship_id': internship.id,
                'employer_id': internship.employer_id,
                'title': internship.title
            }
        )
        
        return Response({'message': 'Internship featured successfully'})
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanManageInternshipSettings])
    @service_error_handler
    def unfeature(self, request, pk=None):
        """Unfeature an internship"""
        internship = self.get_object()
        internship.is_featured = False
        internship.save()
        
        return Response({'message': 'Internship unfeatured successfully'})
    
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    @service_error_handler
    def featured(self, request):
        """Get featured internships"""
        queryset = self.get_queryset().filter(
            is_featured=True,
            is_active=True,
            is_verified=True
        )
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = InternshipListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = InternshipListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    @service_error_handler
    def stats(self, request):
        """Get internship statistics"""
        queryset = Internship.objects.all()
        
        # Basic counts
        total_internships = queryset.count()
        active_internships = queryset.filter(is_active=True).count()
        verified_internships = queryset.filter(is_verified=True).count()
        pending_verification = queryset.filter(is_verified=False, is_active=True).count()
        expired_internships = queryset.filter(deadline__lt=timezone.now()).count()
        featured_internships = queryset.filter(is_featured=True).count()
        
        # Category breakdown
        by_category = dict(
            queryset.filter(is_active=True, is_verified=True)
            .values('category')
            .annotate(count=Count('id'))
            .values_list('category', 'count')
        )
        
        # Location type breakdown
        by_location_type = dict(
            queryset.filter(is_active=True, is_verified=True)
            .values('location_type')
            .annotate(count=Count('id'))
            .values_list('location_type', 'count')
        )
        
        # Experience level breakdown
        by_experience_level = dict(
            queryset.filter(is_active=True, is_verified=True)
            .values('experience_level')
            .annotate(count=Count('id'))
            .values_list('experience_level', 'count')
        )
        
        stats_data = {
            'total_internships': total_internships,
            'active_internships': active_internships,
            'verified_internships': verified_internships,
            'pending_verification': pending_verification,
            'expired_internships': expired_internships,
            'featured_internships': featured_internships,
            'by_category': by_category,
            'by_location_type': by_location_type,
            'by_experience_level': by_experience_level,
        }
        
        serializer = InternshipStatsSerializer(stats_data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    @service_error_handler
    def my_internships(self, request):
        """Get internships created by the current user's employer"""
        # This would call the user service to get the employer ID
        # For now, we'll use a placeholder
        employer_id = getattr(request.user, 'employer_id', None)
        
        if not employer_id:
            return Response({'error': 'User is not associated with an employer'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        queryset = self.get_queryset().filter(employer_id=employer_id)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = InternshipListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = InternshipListSerializer(queryset, many=True)
        return Response(serializer.data)