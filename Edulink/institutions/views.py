from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from users.serializers.institution_serializers import InstitutionProfileSerializer
from users.models.student_profile import StudentProfile
from users.serializers.student_serializer import StudentProfileSerializer
from application.models import Application
from application.serializers import ApplicationSerializer, ApplicationStatusUpdateSerializer
from .models import Institution
from .serializers import (
    InstitutionSerializer, MasterInstitutionSerializer, 
    InstitutionSearchSerializer, UniversityCodeValidationSerializer,
    InstitutionRegistrationSerializer
)
from django.utils import timezone
from security.models import SecurityEvent, AuditLog
from .permissions import IsInstitutionAdmin
from .models import MasterInstitution
from django.db.models import Q
from django.contrib.postgres.search import SearchVector, SearchRank
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from django.core.cache import cache
import hashlib
from difflib import SequenceMatcher

class CreateInstitutionView(generics.CreateAPIView):
    queryset = Institution.objects.all()
    serializer_class = InstitutionSerializer
    permission_classes = [IsAuthenticated]  # Can tighten later if needed
    
    def get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def perform_create(self, serializer):
        institution = serializer.save()
        
        # Log security event for institution creation
        SecurityEvent.objects.create(
            event_type='data_access',
            severity='medium',
            description=f'New institution created: {institution.name}',
            user=self.request.user,
            ip_address=self.get_client_ip(self.request),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
            metadata={
                'action': 'institution_created',
                'institution_id': str(institution.id),
                'institution_name': institution.name,
                'institution_type': institution.institution_type
            }
        )
        
        # Log audit trail
        AuditLog.objects.create(
            action='create',
            user=self.request.user,
            resource_type='Institution',
            resource_id=str(institution.id),
            description=f'Created institution: {institution.name}',
            ip_address=self.get_client_ip(self.request),
            metadata={
                'institution_name': institution.name,
                'institution_type': institution.institution_type,
                'registration_number': institution.registration_number
            }
        )

class InstitutionProfileDetailView(generics.RetrieveUpdateAPIView):
    """
    View and update the profile for the currently authenticated institution admin.
    """
    serializer_class = InstitutionProfileSerializer
    permission_classes = [IsAuthenticated, IsInstitutionAdmin]

    def get_object(self):
        return self.request.user.institution_profile
    
    def get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def perform_update(self, serializer):
        institution = serializer.save()
        
        # Log security event for institution update
        SecurityEvent.objects.create(
            event_type='data_access',
            severity='low',
            description=f'Institution updated: {institution.name}',
            user=self.request.user,
            ip_address=self.get_client_ip(self.request),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
            metadata={
                'action': 'institution_updated',
                'institution_id': str(institution.id),
                'institution_name': institution.name
            }
        )
        
        # Log audit trail
        AuditLog.objects.create(
            action='update',
            user=self.request.user,
            resource_type='Institution',
            resource_id=str(institution.id),
            description=f'Updated institution: {institution.name}',
            ip_address=self.get_client_ip(self.request),
            metadata={
                'institution_name': institution.name,
                'institution_type': institution.institution_type
            }
        )

class VerifyInstitutionView(generics.UpdateAPIView):
    queryset = Institution.objects.all()
    serializer_class = InstitutionSerializer
    permission_classes = [IsAdminUser]
    
    def get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    def patch(self, request, *args, **kwargs):
        institution = self.get_object()
        institution.is_verified = True
        institution.verified_at = timezone.now()
        institution.save()
        
        # Log security event for institution verification
        SecurityEvent.objects.create(
            event_type='data_access',
            severity='medium',
            description=f'Institution verified by admin: {institution.name}',
            user=request.user,
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            metadata={
                'action': 'institution_verified',
                'institution_id': str(institution.id),
                'institution_name': institution.name,
                'verified_by': request.user.email
            }
        )
        
        # Log audit trail
        AuditLog.objects.create(
            action='update',
            user=request.user,
            resource_type='Institution',
            resource_id=str(institution.id),
            description=f'Verified institution: {institution.name}',
            ip_address=self.get_client_ip(request),
            metadata={
                'institution_name': institution.name,
                'verified_at': institution.verified_at.isoformat(),
                'verified_by': request.user.email
            }
        )
        
        return Response(
            {"detail": "Institution verified successfully."},
            status=status.HTTP_200_OK
        )


class InstitutionStudentListView(generics.ListAPIView):
    """
    List all students associated with the institution of the authenticated admin.
    """
    serializer_class = StudentProfileSerializer
    permission_classes = [IsAuthenticated, IsInstitutionAdmin]

    def get_queryset(self):
        institution = self.request.user.institution_profile.institution
        return StudentProfile.objects.filter(institution=institution)  # type: ignore[attr-defined]


class InstitutionApplicationListView(generics.ListAPIView):
    """
    List all internship applications from students of the authenticated admin's institution.
    """
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated, IsInstitutionAdmin]

    def get_queryset(self):
        institution = self.request.user.institution_profile.institution
        return Application.objects.filter(student__institution=institution)  # type: ignore[attr-defined]


@api_view(['GET'])
@permission_classes([AllowAny])
def institution_autocomplete(request):
    """
    Provide autocomplete suggestions for institution names and types.
    Supports fuzzy matching and standardized suggestions.
    """
    query = request.GET.get('q', '').strip()
    field = request.GET.get('field', 'name')  # 'name' or 'type'
    limit = min(int(request.GET.get('limit', 10)), 20)
    
    if not query or len(query) < 2:
        return Response({
            'suggestions': [],
            'query': query,
            'field': field
        })
    
    # Create cache key
    cache_key = f"autocomplete_{field}_{hashlib.md5(query.lower().encode()).hexdigest()}_{limit}"
    cached_result = cache.get(cache_key)
    
    if cached_result:
        return Response(cached_result)
    
    suggestions = []
    
    if field == 'name':
        # Common institution abbreviations mapping
        abbreviation_mappings = {
            'uon': 'University of Nairobi',
            'ku': 'Kenyatta University',
            'moi': 'Moi University',
            'jkuat': 'Jomo Kenyatta University of Agriculture and Technology',
            'egerton': 'Egerton University',
            'maseno': 'Maseno University',
            'pwani': 'Pwani University',
            'tuk': 'Technical University of Kenya',
            'dkut': 'Dedan Kimathi University of Technology',
            'mmust': 'Masinde Muliro University of Science and Technology',
            'kemu': 'Kenya Methodist University',
            'usiu': 'United States International University',
            'strathmore': 'Strathmore University',
            'daystar': 'Daystar University',
            'kcau': 'Kenya Christian University',
            'kimc': 'Kenya Institute of Mass Communication',
            'kmtc': 'Kenya Medical Training College',
            'ktti': 'Kenya Technical Trainers Institute',
            'polytechnic': 'Polytechnic',
            'technical': 'Technical Institute'
        }
        
        # Get institution names with fuzzy matching
        institutions = MasterInstitution.objects.filter(
            is_active=True
        ).values('name', 'short_name', 'institution_type', 'registration_number', 'location', 'county').distinct()
        
        # Check for abbreviation matches first
        abbreviation_matches = []
        query_lower = query.lower()
        
        for abbrev, full_name in abbreviation_mappings.items():
            if query_lower == abbrev or query_lower in abbrev:
                # Find the actual institution in database
                matching_inst = next(
                    (inst for inst in institutions if full_name.lower() in inst['name'].lower()),
                    None
                )
                if matching_inst:
                    abbreviation_matches.append({
                        'value': matching_inst['name'],
                        'display': f"{matching_inst['name']} ({abbrev.upper()})",
                        'type': matching_inst['institution_type'],
                        'registration_number': matching_inst.get('registration_number', ''),
                        'location': matching_inst.get('location', ''),
                        'county': matching_inst.get('county', ''),
                        'match_type': 'abbreviation'
                    })
        
        # Exact matches
        exact_matches = []
        fuzzy_matches = []
        
        for inst in institutions:
            name = inst['name']
            short_name = inst['short_name'] or ''
            
            # Skip if already matched by abbreviation
            if any(abbrev_match['value'] == name for abbrev_match in abbreviation_matches):
                continue
            
            # Check for exact matches (case insensitive)
            if query.lower() in name.lower() or (short_name and query.lower() in short_name.lower()):
                exact_matches.append({
                    'value': name,
                    'display': f"{name} ({short_name})" if short_name else name,
                    'type': inst['institution_type'],
                    'registration_number': inst.get('registration_number', ''),
                    'location': inst.get('location', ''),
                    'county': inst.get('county', ''),
                    'match_type': 'exact'
                })
            else:
                # Fuzzy matching
                name_similarity = SequenceMatcher(None, query.lower(), name.lower()).ratio()
                short_similarity = SequenceMatcher(None, query.lower(), short_name.lower()).ratio() if short_name else 0
                
                max_similarity = max(name_similarity, short_similarity)
                if max_similarity >= 0.6:  # 60% similarity threshold
                    fuzzy_matches.append({
                        'value': name,
                        'display': f"{name} ({short_name})" if short_name else name,
                        'type': inst['institution_type'],
                        'registration_number': inst.get('registration_number', ''),
                        'location': inst.get('location', ''),
                        'county': inst.get('county', ''),
                        'match_type': 'fuzzy',
                        'similarity': max_similarity
                    })
        
        # Sort fuzzy matches by similarity
        fuzzy_matches.sort(key=lambda x: x['similarity'], reverse=True)
        
        # Combine results (abbreviation matches first, then exact, then fuzzy)
        suggestions = abbreviation_matches + exact_matches + fuzzy_matches
        suggestions = suggestions[:limit]
        
    elif field == 'type':
        # Institution type suggestions with comprehensive standardization
        type_mappings = {
            'university': ['university', 'uni', 'varsity', 'univ'],
            'college': ['college', 'coll'],
            'institute': ['institute', 'inst', 'institution'],
            'polytechnic': ['polytechnic', 'poly'],
            'tvet': ['tvet', 'vocational', 'training'],
            'technical': ['technical', 'tech']
        }
        
        # Enhanced descriptive mappings with common abbreviations
        descriptive_mappings = {
            'public': [
                'public university', 'public college', 'public institute',
                'public polytechnic', 'public technical college',
                'public technical university', 'public technical institute'
            ],
            'private': [
                'private university', 'private college', 'private institute',
                'private polytechnic', 'private technical college',
                'private technical university', 'private technical institute'
            ],
            'technical': [
                'technical university', 'technical college', 'technical institute',
                'technical training institute', 'technical training college'
            ],
            'medical': [
                'medical university', 'medical college', 'medical institute',
                'medical training college', 'health sciences university'
            ],
            'agricultural': [
                'agricultural university', 'agricultural college',
                'agriculture university', 'agriculture college'
            ],
            'teacher': [
                'teacher training college', 'teachers college',
                'teacher training institute', 'teachers training college',
                'education college', 'education university'
            ],
            'business': [
                'business college', 'business university', 'business institute',
                'management university', 'management college'
            ],
            'engineering': [
                'engineering university', 'engineering college',
                'technology university', 'technology institute'
            ]
        }
        
        # Common abbreviation to full type mappings
        abbreviation_type_mappings = {
            'pub': 'public university',
            'priv': 'private university',
            'tech': 'technical institute',
            'med': 'medical college',
            'agri': 'agricultural university',
            'ttc': 'teacher training college',
            'poly': 'polytechnic',
            'tvet': 'technical and vocational education training'
        }
        
        query_lower = query.lower().strip()
        
        # Check for direct abbreviation matches first
        for abbrev, full_type in abbreviation_type_mappings.items():
            if query_lower == abbrev or (len(query_lower) <= 4 and abbrev.startswith(query_lower)):
                suggestions.append({
                    'value': full_type,
                    'display': full_type.title(),
                    'match_type': 'abbreviation',
                    'priority': 1
                })
        
        # Find matching standard types
        for standard_type, variants in type_mappings.items():
            for variant in variants:
                if query_lower == variant or query_lower in variant or variant.startswith(query_lower):
                    suggestions.append({
                        'value': standard_type,
                        'display': standard_type.title(),
                        'match_type': 'standard',
                        'priority': 2
                    })
                    break
        
        # Find matching descriptive types
        for descriptor, full_types in descriptive_mappings.items():
            # Check if query matches the descriptor
            if query_lower == descriptor or descriptor.startswith(query_lower):
                for full_type in full_types:
                    suggestions.append({
                        'value': full_type,
                        'display': full_type.title(),
                        'match_type': 'descriptive',
                        'priority': 3
                    })
            else:
                # Check if query matches any of the full types
                for full_type in full_types:
                    if (query_lower in full_type or 
                        full_type.startswith(query_lower) or
                        SequenceMatcher(None, query_lower, full_type).ratio() >= 0.7):
                        suggestions.append({
                            'value': full_type,
                            'display': full_type.title(),
                            'match_type': 'fuzzy',
                            'priority': 4
                        })
        
        # Remove duplicates and sort by priority
        seen = set()
        unique_suggestions = []
        for suggestion in suggestions:
            if suggestion['value'] not in seen:
                seen.add(suggestion['value'])
                unique_suggestions.append(suggestion)
        
        # Sort by priority (lower number = higher priority) and then alphabetically
        unique_suggestions.sort(key=lambda x: (x.get('priority', 5), x['value']))
        suggestions = unique_suggestions[:limit]
        
        # Remove priority field from final output
        for suggestion in suggestions:
            suggestion.pop('priority', None)
    
    response_data = {
        'suggestions': suggestions,
        'query': query,
        'field': field,
        'total': len(suggestions)
    }
    
    # Cache for 10 minutes
    cache.set(cache_key, response_data, 600)
    return Response(response_data)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_all_institutions(request):
    """
    Get all institutions data for client-side caching.
    Returns all active institutions with their registration status.
    """
    # Create cache key for all institutions
    cache_key = "all_institutions_data"
    cached_result = cache.get(cache_key)
    
    if cached_result:
        return Response(cached_result)
    
    # Get all active master institutions
    master_institutions = MasterInstitution.objects.filter(is_active=True).order_by('name')
    
    # Get all registered institutions for status checking
    registered_institutions = Institution.objects.select_related('master_institution').all()
    
    registered_dict = {
        inst.master_institution.id: inst for inst in registered_institutions if inst.master_institution
    }
    
    results = []
    for master_inst in master_institutions:
        registered_inst = registered_dict.get(master_inst.id)
        
        result = {
            'id': master_inst.id,
            'name': master_inst.name,
            'display_name': master_inst.get_display_name(),
            'institution_type': master_inst.institution_type,
            'accreditation_body': master_inst.accreditation_body,
            'is_public': master_inst.is_public,
            'county': master_inst.county,
            'status': 'registered' if registered_inst else 'not_registered',
            'is_verified': registered_inst.is_verified if registered_inst else False,
            'university_code': registered_inst.university_code if registered_inst else None,
            'registration_number': registered_inst.registration_number if registered_inst else None
        }
        results.append(result)
    
    response_data = {
        'institutions': results,
        'total': len(results),
        'last_updated': timezone.now().isoformat()
    }
    
    # Cache for 1 hour (institutions don't change frequently)
    cache.set(cache_key, response_data, 3600)
    return Response(response_data)


@api_view(['GET'])
@permission_classes([AllowAny])
def search_institutions(request):
    """
    Search institutions with autocomplete functionality.
    Supports both MasterInstitution (all Kenyan institutions) and Institution (registered institutions).
    """
    serializer = InstitutionSearchSerializer(data=request.GET)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    query = serializer.validated_data['query']
    limit = serializer.validated_data.get('limit', 10)
    
    # Create cache key
    cache_key = f"institution_search_{hashlib.md5(f'{query}_{limit}'.encode()).hexdigest()}"
    cached_result = cache.get(cache_key)
    
    if cached_result:
        return Response(cached_result)
    
    # Search in MasterInstitution with full-text search
    master_institutions = MasterInstitution.objects.annotate(
        search=SearchVector('name', 'institution_type'),
        rank=SearchRank(SearchVector('name', 'institution_type'), query)
    ).filter(
        Q(search=query) | Q(name__icontains=query)
    ).filter(is_active=True).order_by('-rank', 'name')[:limit]
    
    # Get registered institutions for status checking
    registered_institutions = Institution.objects.filter(
        master_institution__in=master_institutions
    ).select_related('master_institution')

    
    registered_dict = {
        inst.master_institution.id: inst for inst in registered_institutions
    }
    
    results = []
    for master_inst in master_institutions:
        registered_inst = registered_dict.get(master_inst.id)
        
        result = {
            'id': master_inst.id,
            'name': master_inst.name,
            'display_name': master_inst.get_display_name(),
            'institution_type': master_inst.institution_type,
            'accreditation_body': master_inst.accreditation_body,
            'is_public': master_inst.is_public,
            'status': 'registered' if registered_inst else 'not_registered',
            'is_verified': registered_inst.is_verified if registered_inst else False,
            'university_code': registered_inst.university_code if registered_inst else None,
            'registration_number': registered_inst.registration_number if registered_inst else None
        }
        results.append(result)
    
    response_data = {
        'results': results,
        'total': len(results),
        'query': query
    }
    
    # Cache for 5 minutes
    cache.set(cache_key, response_data, 300)
    return Response(response_data)


@api_view(['POST'])
@permission_classes([AllowAny])
def validate_university_code(request):
    """
    Validate university code and return institution information.
    """
    serializer = UniversityCodeValidationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    university_code = serializer.validated_data['university_code']
    
    try:
        institution = Institution.objects.select_related('master_institution').get(
            university_code=university_code,
            is_verified=True
        )
        
        response_data = {
            'valid': True,
            'institution': {
                'id': institution.id,
                'name': institution.name,
                'display_name': institution.master_institution.get_display_name() if institution.master_institution else institution.name,
                'institution_type': institution.institution_type,
                'university_code': institution.university_code,
                'is_verified': institution.is_verified,
                'registration_number': institution.registration_number
            },
            # Include institution data at root level for frontend compatibility
            'institution_id': institution.id,
            'institution_name': institution.name,
            'institution_type': institution.institution_type,
            'university_code': institution.university_code
        }
        
        # Log security event for university code validation
        SecurityEvent.objects.create(
            event_type='data_access',
            severity='low',
            description=f'University code validated: {university_code}',
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            metadata={
                'action': 'university_code_validated',
                'university_code': university_code,
                'institution_id': str(institution.id),
                'institution_name': institution.name
            }
        )
        
        return Response(response_data)
        
    except Institution.DoesNotExist:
        return Response({
            'valid': False,
            'error': 'Invalid university code or institution not verified'
        }, status=status.HTTP_404_NOT_FOUND)


class RegisterInstitutionView(generics.CreateAPIView):
    """
    Register a new institution by linking it to a MasterInstitution.
    Admin-only endpoint.
    """
    serializer_class = InstitutionRegistrationSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get_client_ip(self, request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def perform_create(self, serializer):
        institution = serializer.save()
        
        # Log security event for institution registration
        SecurityEvent.objects.create(
            event_type='data_access',
            severity='medium',
            description=f'Institution registered by admin: {institution.name}',
            user=self.request.user,
            ip_address=self.get_client_ip(self.request),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
            metadata={
                'action': 'institution_registered',
                'institution_id': str(institution.id),
                'institution_name': institution.name,
                'university_code': institution.university_code,
                'master_institution_id': str(institution.master_institution.id) if institution.master_institution else None
            }
        )
        
        # Log audit trail
        AuditLog.objects.create(
            action='create',
            user=self.request.user,
            model_name='Institution',
            object_id=str(institution.id),
            description=f'Registered institution: {institution.name}',
            ip_address=self.get_client_ip(self.request),
            metadata={
                'institution_name': institution.name,
                'university_code': institution.university_code,
                'registration_number': institution.registration_number,
                'master_institution_id': str(institution.master_institution.id) if institution.master_institution else None
            }
        )


class ApplicationStatusUpdateView(generics.UpdateAPIView):
    """
    Approve or reject a specific internship application.
    Accessible only by the institution admin to which the student applicant belongs.
    """
    serializer_class = ApplicationStatusUpdateSerializer
    permission_classes = [IsAuthenticated, IsInstitutionAdmin]
    lookup_field = 'id'

    def get_queryset(self):
        """
        Ensure that the admin can only update applications from their own institution.
        """
        institution = self.request.user.institution_profile.institution
        return Application.objects.filter(student__institution=institution)  # type: ignore[attr-defined]
