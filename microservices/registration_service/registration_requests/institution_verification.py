from typing import Dict, Any, Optional, List
from django.conf import settings
from django.utils import timezone
from django.db.models import Q
import logging
import requests
from difflib import SequenceMatcher

from .models import RegistrationRequest, RegistrationStatus, VerificationSource
from .services import RegistrationRequestLog

# Import master institution model from user service
try:
    from institutions.models import MasterInstitution, AccreditationBody
except ImportError:
    # Fallback if institutions app is not available
    MasterInstitution = None
    AccreditationBody = None

logger = logging.getLogger(__name__)


class AutomatedInstitutionVerificationService:
    """Enhanced institution verification service using master institution database."""
    
    # Similarity threshold for fuzzy matching
    SIMILARITY_THRESHOLD = 0.85
    
    @classmethod
    def verify_institution_against_master_db(cls, registration_request: RegistrationRequest) -> Dict[str, Any]:
        """Verify institution against master institution database."""
        
        # Check if MasterInstitution is available
        if MasterInstitution is None:
            logger.warning("MasterInstitution model not available - skipping verification")
            return {
                'verified': False,
                'error': 'Institution verification service not available',
                'requires_manual_review': True
            }
        
        try:
            institution_name = registration_request.organization_name
            organization_type = registration_request.organization_type
            
            # Step 1: Exact name match
            exact_match = cls._find_exact_match(institution_name)
            if exact_match:
                return cls._process_verification_result(registration_request, exact_match, 'exact_match')
            
            # Step 2: Fuzzy name matching
            fuzzy_matches = cls._find_fuzzy_matches(institution_name)
            if fuzzy_matches:
                best_match = fuzzy_matches[0]  # Highest similarity score
                if best_match['similarity'] >= cls.SIMILARITY_THRESHOLD:
                    return cls._process_verification_result(
                        registration_request, 
                        best_match['institution'], 
                        'fuzzy_match',
                        similarity_score=best_match['similarity']
                    )
            
            # Step 3: Domain-based verification (if email provided)
            if hasattr(registration_request, 'email') and registration_request.email:
                domain_match = cls._find_by_email_domain(registration_request.email)
                if domain_match:
                    return cls._process_verification_result(registration_request, domain_match, 'domain_match')
            
            # Step 4: No match found - trigger manual verification
            return cls._handle_no_match(registration_request)
            
        except Exception as e:
            logger.error(f"Institution verification failed: {str(e)}")
            return {
                'verified': False,
                'error': f'Verification system error: {str(e)}',
                'requires_manual_review': True
            }
    
    @classmethod
    def _find_exact_match(cls, institution_name: str) -> Optional['MasterInstitution']:
        """Find exact match in master institution database."""
        
        # Clean the name for comparison
        clean_name = cls._clean_institution_name(institution_name)
        
        try:
            return MasterInstitution.objects.filter(
                Q(name__iexact=clean_name) | Q(short_name__iexact=clean_name),
                is_active=True
            ).first()
        except Exception as e:
            logger.error(f"Error finding exact match: {str(e)}")
            return None
    
    @classmethod
    def _find_fuzzy_matches(cls, institution_name: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Find fuzzy matches using similarity scoring."""
        
        clean_name = cls._clean_institution_name(institution_name)
        matches = []
        
        try:
            # Get all active institutions
            institutions = MasterInstitution.objects.filter(is_active=True)
            
            for institution in institutions:
                # Calculate similarity with main name
                main_similarity = SequenceMatcher(
                    None, 
                    clean_name.lower(), 
                    institution.name.lower()
                ).ratio()
                
                # Calculate similarity with short name if available
                short_similarity = 0
                if institution.short_name:
                    short_similarity = SequenceMatcher(
                        None, 
                        clean_name.lower(), 
                        institution.short_name.lower()
                    ).ratio()
                
                # Use the higher similarity score
                similarity = max(main_similarity, short_similarity)
                
                if similarity > 0.6:  # Only consider reasonable matches
                    matches.append({
                        'institution': institution,
                        'similarity': similarity
                    })
            
            # Sort by similarity score (descending)
            matches.sort(key=lambda x: x['similarity'], reverse=True)
            return matches[:limit]
            
        except Exception as e:
            logger.error(f"Error finding fuzzy matches: {str(e)}")
            return []
    
    @classmethod
    def _find_by_email_domain(cls, email: str) -> Optional['MasterInstitution']:
        """Find institution by email domain."""
        
        try:
            domain = email.split('@')[1].lower()
            
            # Look for institutions with matching website domains
            return MasterInstitution.objects.filter(
                website__icontains=domain,
                is_active=True
            ).first()
            
        except Exception as e:
            logger.error(f"Error finding by email domain: {str(e)}")
            return None
    
    @classmethod
    def _process_verification_result(
        cls, 
        registration_request: RegistrationRequest, 
        master_institution: 'MasterInstitution',
        match_type: str,
        similarity_score: Optional[float] = None
    ) -> Dict[str, Any]:
        """Process successful verification result."""
        
        try:
            # Update registration request with verification details
            registration_request.institutional_verified = True
            registration_request.institutional_verification_source = cls._get_verification_source(
                master_institution.accreditation_body
            )
            
            verification_details = {
                'master_institution_id': str(master_institution.id),
                'verified_name': master_institution.name,
                'institution_type': master_institution.institution_type,
                'accreditation_body': master_institution.accreditation_body,
                'accreditation_status': master_institution.accreditation_status,
                'match_type': match_type,
                'verification_date': timezone.now().isoformat(),
                'data_source': master_institution.data_source
            }
            
            if similarity_score:
                verification_details['similarity_score'] = similarity_score
            
            registration_request.institutional_verification_details = verification_details
            
            # Set appropriate accreditation status fields
            if master_institution.accreditation_body == AccreditationBody.CUE:
                registration_request.cue_accreditation_status = master_institution.accreditation_status
            elif master_institution.accreditation_body == AccreditationBody.TVETA:
                registration_request.tveta_registration_status = master_institution.accreditation_status
            
            registration_request.status = RegistrationStatus.INSTITUTIONAL_VERIFIED
            registration_request.save()
            
            # Log the verification
            RegistrationRequestLog.objects.create(
                registration_request=registration_request,
                action='automated_institutional_verification',
                new_status=RegistrationStatus.INSTITUTIONAL_VERIFIED,
                performed_by='system',
                notes=f'Institution verified via {match_type} against master database'
            )
            
            # Move to next stage (under review)
            registration_request.status = RegistrationStatus.UNDER_REVIEW
            registration_request.save()
            
            return {
                'verified': True,
                'source': 'master_database',
                'match_type': match_type,
                'institution_data': {
                    'id': str(master_institution.id),
                    'name': master_institution.name,
                    'type': master_institution.institution_type,
                    'accreditation_body': master_institution.accreditation_body,
                    'accreditation_status': master_institution.accreditation_status,
                    'location': master_institution.location
                },
                'similarity_score': similarity_score
            }
            
        except Exception as e:
            logger.error(f"Error processing verification result: {str(e)}")
            return {
                'verified': False,
                'error': f'Error processing verification: {str(e)}'
            }
    
    @classmethod
    def _handle_no_match(cls, registration_request: RegistrationRequest) -> Dict[str, Any]:
        """Handle case where no match is found in master database."""
        
        # Log the failed verification attempt
        RegistrationRequestLog.objects.create(
            registration_request=registration_request,
            action='automated_verification_failed',
            new_status=registration_request.status,
            performed_by='system',
            notes=f'Institution "{registration_request.organization_name}" not found in master database'
        )
        
        return {
            'verified': False,
            'source': 'master_database',
            'error': 'Institution not found in master database',
            'requires_manual_review': True,
            'suggestions': cls._get_verification_suggestions(registration_request)
        }
    
    @classmethod
    def _get_verification_suggestions(cls, registration_request: RegistrationRequest) -> List[str]:
        """Get suggestions for manual verification."""
        
        suggestions = []
        
        # Check if it might be a new institution
        if 'new' in registration_request.organization_name.lower():
            suggestions.append('This appears to be a newly established institution')
        
        # Check if it might be a branch campus
        if any(word in registration_request.organization_name.lower() for word in ['branch', 'campus', 'satellite']):
            suggestions.append('This might be a branch campus of an existing institution')
        
        # Check if it might be a private institution
        if any(word in registration_request.organization_name.lower() for word in ['private', 'international']):
            suggestions.append('This might be a private institution requiring special verification')
        
        return suggestions
    
    @classmethod
    def _clean_institution_name(cls, name: str) -> str:
        """Clean and normalize institution name for comparison."""
        
        if not name:
            return ''
        
        # Remove common prefixes/suffixes and normalize
        cleaned = name.strip()
        
        # Remove common words that might cause mismatches
        remove_words = ['the', 'of', 'and', '&', 'university', 'college', 'institute']
        words = cleaned.split()
        
        # Keep original for now, but could implement more aggressive cleaning
        return cleaned
    
    @classmethod
    def _get_verification_source(cls, accreditation_body: str) -> str:
        """Map accreditation body to verification source."""
        
        mapping = {
            AccreditationBody.CUE: VerificationSource.CUE,
            AccreditationBody.TVETA: VerificationSource.TVETA,
            AccreditationBody.KUCCPS: VerificationSource.MANUAL,  # No direct API
            AccreditationBody.OTHER: VerificationSource.MANUAL
        }
        
        return mapping.get(accreditation_body, VerificationSource.MANUAL)
    
    @classmethod
    def get_institution_statistics(cls) -> Dict[str, Any]:
        """Get statistics about master institution database."""
        
        try:
            total_institutions = MasterInstitution.objects.filter(is_active=True).count()
            
            by_type = {}
            by_accreditation = {}
            by_source = {}
            
            # Count by institution type
            for choice in MasterInstitution._meta.get_field('institution_type').choices:
                count = MasterInstitution.objects.filter(
                    institution_type=choice[0],
                    is_active=True
                ).count()
                by_type[choice[1]] = count
            
            # Count by accreditation body
            for choice in MasterInstitution._meta.get_field('accreditation_body').choices:
                count = MasterInstitution.objects.filter(
                    accreditation_body=choice[0],
                    is_active=True
                ).count()
                by_accreditation[choice[1]] = count
            
            # Count by data source
            for choice in MasterInstitution._meta.get_field('data_source').choices:
                count = MasterInstitution.objects.filter(
                    data_source=choice[0],
                    is_active=True
                ).count()
                by_source[choice[1]] = count
            
            return {
                'total_institutions': total_institutions,
                'by_type': by_type,
                'by_accreditation_body': by_accreditation,
                'by_data_source': by_source,
                'last_updated': timezone.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting institution statistics: {str(e)}")
            return {
                'error': f'Failed to get statistics: {str(e)}'
            }