import logging
import re
from typing import List, Dict, Tuple, Optional, Set
from difflib import SequenceMatcher
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from ..models import ExternalOpportunity, Internship
import hashlib
import json
from datetime import datetime, timedelta


logger = logging.getLogger(__name__)


class OpportunityDataProcessor:
    """Service for processing, validating, and deduplicating opportunity data."""
    
    def __init__(self):
        self.similarity_threshold = 0.85  # Threshold for duplicate detection
        self.validation_rules = self._load_validation_rules()
        self.category_keywords = self._load_category_keywords()
    
    def process_all_opportunities(self) -> Dict[str, int]:
        """Process all unprocessed opportunities."""
        logger.info("Starting comprehensive opportunity processing")
        
        results = {
            'processed': 0,
            'validated': 0,
            'duplicates_found': 0,
            'categorized': 0,
            'quality_improved': 0,
            'errors': 0
        }
        
        # Get all external opportunities that need processing
        opportunities = ExternalOpportunity.objects.filter(
            sync_status='synced',
            data_quality_score__lt=0.8  # Focus on lower quality data
        ).select_related('internship', 'source')
        
        logger.info(f"Processing {opportunities.count()} opportunities")
        
        for opportunity in opportunities:
            try:
                # Process individual opportunity
                processed_result = self.process_opportunity(opportunity)
                
                # Update results
                results['processed'] += 1
                if processed_result['validated']:
                    results['validated'] += 1
                if processed_result['duplicate_found']:
                    results['duplicates_found'] += 1
                if processed_result['categorized']:
                    results['categorized'] += 1
                if processed_result['quality_improved']:
                    results['quality_improved'] += 1
                    
            except Exception as e:
                logger.error(f"Failed to process opportunity {opportunity.id}: {str(e)}")
                results['errors'] += 1
        
        logger.info(f"Processing completed. Results: {results}")
        return results
    
    def process_opportunity(self, opportunity: ExternalOpportunity) -> Dict[str, bool]:
        """Process a single opportunity through the complete pipeline."""
        result = {
            'validated': False,
            'duplicate_found': False,
            'categorized': False,
            'quality_improved': False
        }
        
        with transaction.atomic():
            # Step 1: Validate and clean data
            validation_result = self.validate_and_clean(opportunity)
            result['validated'] = validation_result['improved']
            
            # Step 2: Check for duplicates
            duplicate_result = self.detect_duplicates(opportunity)
            result['duplicate_found'] = duplicate_result['is_duplicate']
            
            # Step 3: Improve categorization
            category_result = self.improve_categorization(opportunity)
            result['categorized'] = category_result['improved']
            
            # Step 4: Calculate final quality score
            old_score = opportunity.data_quality_score
            opportunity.calculate_data_quality_score()
            opportunity.save()
            
            result['quality_improved'] = opportunity.data_quality_score > old_score
        
        return result
    
    def validate_and_clean(self, opportunity: ExternalOpportunity) -> Dict[str, any]:
        """Validate and clean opportunity data."""
        internship = opportunity.internship
        improved = False
        issues_found = []
        
        # Clean and validate title
        if internship.title:
            cleaned_title = self._clean_title(internship.title)
            if cleaned_title != internship.title:
                internship.title = cleaned_title
                improved = True
                issues_found.append('title_cleaned')
        
        # Validate and clean description
        if internship.description:
            cleaned_desc = self._clean_description(internship.description)
            if cleaned_desc != internship.description:
                internship.description = cleaned_desc
                improved = True
                issues_found.append('description_cleaned')
            
            # Check description length
            if len(internship.description) < 50:
                issues_found.append('description_too_short')
        
        # Validate dates
        date_issues = self._validate_dates(internship)
        if date_issues['fixed']:
            improved = True
        issues_found.extend(date_issues['issues'])
        
        # Validate location
        if internship.location:
            cleaned_location = self._clean_location(internship.location)
            if cleaned_location != internship.location:
                internship.location = cleaned_location
                improved = True
                issues_found.append('location_cleaned')
        
        # Validate salary/stipend
        if internship.stipend and internship.stipend < 0:
            internship.stipend = None
            improved = True
            issues_found.append('invalid_stipend_removed')
        
        # Save changes if any
        if improved:
            internship.save()
            
            # Log validation issues in transformation log
            if not opportunity.transformation_log:
                opportunity.transformation_log = []
            
            opportunity.transformation_log.append({
                'timestamp': timezone.now().isoformat(),
                'action': 'validation_and_cleaning',
                'issues_found': issues_found,
                'improved': improved
            })
            opportunity.save(update_fields=['transformation_log'])
        
        return {
            'improved': improved,
            'issues_found': issues_found
        }
    
    def detect_duplicates(self, opportunity: ExternalOpportunity) -> Dict[str, any]:
        """Detect potential duplicates for an opportunity."""
        internship = opportunity.internship
        
        # Find potential duplicates based on similarity
        potential_duplicates = self._find_similar_opportunities(opportunity)
        
        is_duplicate = False
        duplicate_of = None
        
        if potential_duplicates:
            # Check each potential duplicate
            for candidate, similarity_score in potential_duplicates:
                if similarity_score >= self.similarity_threshold:
                    # This is likely a duplicate
                    is_duplicate = True
                    duplicate_of = candidate
                    
                    # Mark as duplicate
                    opportunity.mark_as_duplicate(candidate)
                    
                    logger.info(
                        f"Marked opportunity {opportunity.id} as duplicate of {candidate.id} "
                        f"(similarity: {similarity_score:.2f})"
                    )
                    break
                else:
                    # Add as potential duplicate for manual review
                    opportunity.potential_duplicates.add(candidate)
        
        return {
            'is_duplicate': is_duplicate,
            'duplicate_of': duplicate_of,
            'potential_duplicates_count': len(potential_duplicates)
        }
    
    def improve_categorization(self, opportunity: ExternalOpportunity) -> Dict[str, any]:
        """Improve opportunity categorization using ML-like techniques."""
        internship = opportunity.internship
        original_category = internship.category
        
        # Analyze text content for better categorization
        text_content = f"{internship.title} {internship.description} {internship.required_skills}"
        suggested_category = self._classify_category(text_content)
        
        improved = False
        
        # Update category if we have a better suggestion
        if suggested_category and suggested_category != original_category:
            # Only update if current category is 'other' or confidence is high
            if original_category == 'other' or self._get_category_confidence(text_content, suggested_category) > 0.8:
                internship.category = suggested_category
                internship.save()
                improved = True
                
                # Log the change
                if not opportunity.transformation_log:
                    opportunity.transformation_log = []
                
                opportunity.transformation_log.append({
                    'timestamp': timezone.now().isoformat(),
                    'action': 'category_improvement',
                    'old_category': original_category,
                    'new_category': suggested_category,
                    'confidence': self._get_category_confidence(text_content, suggested_category)
                })
                opportunity.save(update_fields=['transformation_log'])
        
        return {
            'improved': improved,
            'original_category': original_category,
            'suggested_category': suggested_category
        }
    
    def _clean_title(self, title: str) -> str:
        """Clean and normalize opportunity title."""
        # Remove excessive whitespace
        cleaned = re.sub(r'\s+', ' ', title.strip())
        
        # Remove common prefixes/suffixes that don't add value
        prefixes_to_remove = [
            r'^(job|position|opportunity|internship):\s*',
            r'^(urgent|immediate|asap)\s*[-:]?\s*',
        ]
        
        for prefix in prefixes_to_remove:
            cleaned = re.sub(prefix, '', cleaned, flags=re.IGNORECASE)
        
        # Capitalize properly
        if cleaned.isupper() or cleaned.islower():
            cleaned = cleaned.title()
        
        # Remove excessive punctuation
        cleaned = re.sub(r'[!]{2,}', '!', cleaned)
        cleaned = re.sub(r'[?]{2,}', '?', cleaned)
        
        return cleaned.strip()
    
    def _clean_description(self, description: str) -> str:
        """Clean and normalize opportunity description."""
        # Remove HTML tags if present
        cleaned = re.sub(r'<[^>]+>', '', description)
        
        # Normalize whitespace
        cleaned = re.sub(r'\s+', ' ', cleaned)
        
        # Remove excessive punctuation
        cleaned = re.sub(r'[.]{3,}', '...', cleaned)
        
        # Remove common spam patterns
        spam_patterns = [
            r'(click here|apply now|urgent|immediate)[!]*',
            r'\$\$\$+',
            r'(earn|make)\s+\$\d+.*?(daily|weekly|monthly)',
        ]
        
        for pattern in spam_patterns:
            cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE)
        
        return cleaned.strip()
    
    def _clean_location(self, location: str) -> str:
        """Clean and normalize location data."""
        # Remove excessive whitespace
        cleaned = re.sub(r'\s+', ' ', location.strip())
        
        # Standardize common location formats
        cleaned = re.sub(r'\b(remote|work from home|wfh)\b', 'Remote', cleaned, flags=re.IGNORECASE)
        
        # Capitalize properly
        if cleaned.isupper() or cleaned.islower():
            cleaned = cleaned.title()
        
        return cleaned
    
    def _validate_dates(self, internship: Internship) -> Dict[str, any]:
        """Validate and fix date-related issues."""
        issues = []
        fixed = False
        
        # Check if deadline is in the past
        if internship.deadline and internship.deadline < timezone.now().date():
            # If deadline is very recent (within 7 days), it might be a mistake
            days_past = (timezone.now().date() - internship.deadline).days
            if days_past <= 7:
                # Extend deadline by 30 days
                internship.deadline = timezone.now().date() + timedelta(days=30)
                fixed = True
                issues.append('deadline_extended')
            else:
                # Mark as expired
                internship.is_active = False
                fixed = True
                issues.append('marked_expired')
        
        # Check if start date is before deadline
        if (internship.start_date and internship.deadline and 
            internship.start_date < internship.deadline):
            issues.append('start_before_deadline')
        
        # Check if dates are too far in the future (likely errors)
        max_future_date = timezone.now().date() + timedelta(days=365 * 2)  # 2 years
        
        if internship.deadline and internship.deadline > max_future_date:
            internship.deadline = None
            fixed = True
            issues.append('unrealistic_deadline_removed')
        
        if internship.start_date and internship.start_date > max_future_date:
            internship.start_date = None
            fixed = True
            issues.append('unrealistic_start_date_removed')
        
        return {
            'fixed': fixed,
            'issues': issues
        }
    
    def _find_similar_opportunities(self, opportunity: ExternalOpportunity) -> List[Tuple[ExternalOpportunity, float]]:
        """Find opportunities similar to the given one."""
        internship = opportunity.internship
        
        # Get candidates for comparison (same category, recent)
        candidates = ExternalOpportunity.objects.filter(
            internship__category=internship.category,
            internship__is_active=True,
            is_duplicate=False,
            first_seen__gte=timezone.now() - timedelta(days=30)
        ).exclude(id=opportunity.id).select_related('internship')
        
        similarities = []
        
        for candidate in candidates:
            similarity = self._calculate_similarity(opportunity, candidate)
            if similarity > 0.5:  # Only consider reasonably similar ones
                similarities.append((candidate, similarity))
        
        # Sort by similarity (highest first)
        similarities.sort(key=lambda x: x[1], reverse=True)
        
        return similarities[:10]  # Return top 10 most similar
    
    def _calculate_similarity(self, opp1: ExternalOpportunity, opp2: ExternalOpportunity) -> float:
        """Calculate similarity score between two opportunities."""
        int1, int2 = opp1.internship, opp2.internship
        
        # Title similarity (40% weight)
        title_sim = SequenceMatcher(None, int1.title.lower(), int2.title.lower()).ratio()
        
        # Description similarity (30% weight)
        desc_sim = self._text_similarity(int1.description, int2.description)
        
        # Company similarity (20% weight)
        company1 = opp1.external_company_name or int1.employer.name
        company2 = opp2.external_company_name or int2.employer.name
        company_sim = SequenceMatcher(None, company1.lower(), company2.lower()).ratio()
        
        # Location similarity (10% weight)
        location_sim = SequenceMatcher(None, int1.location.lower(), int2.location.lower()).ratio()
        
        # Weighted average
        total_similarity = (
            title_sim * 0.4 +
            desc_sim * 0.3 +
            company_sim * 0.2 +
            location_sim * 0.1
        )
        
        return total_similarity
    
    def _text_similarity(self, text1: str, text2: str) -> float:
        """Calculate similarity between two text strings."""
        if not text1 or not text2:
            return 0.0
        
        # Use first 500 characters for performance
        text1_short = text1[:500].lower()
        text2_short = text2[:500].lower()
        
        return SequenceMatcher(None, text1_short, text2_short).ratio()
    
    def _classify_category(self, text_content: str) -> Optional[str]:
        """Classify opportunity category based on text content."""
        text_lower = text_content.lower()
        
        # Score each category based on keyword matches
        category_scores = {}
        
        for category, keywords in self.category_keywords.items():
            score = 0
            for keyword in keywords:
                # Count occurrences of each keyword
                count = text_lower.count(keyword.lower())
                # Weight longer keywords more heavily
                weight = len(keyword.split())
                score += count * weight
            
            category_scores[category] = score
        
        # Return category with highest score (if above threshold)
        if category_scores:
            best_category = max(category_scores, key=category_scores.get)
            if category_scores[best_category] > 0:
                return best_category
        
        return None
    
    def _get_category_confidence(self, text_content: str, category: str) -> float:
        """Get confidence score for a category classification."""
        text_lower = text_content.lower()
        
        if category not in self.category_keywords:
            return 0.0
        
        # Calculate match score
        keywords = self.category_keywords[category]
        matches = sum(1 for keyword in keywords if keyword.lower() in text_lower)
        
        # Confidence based on percentage of keywords matched
        confidence = matches / len(keywords)
        
        return min(1.0, confidence)
    
    def _load_validation_rules(self) -> Dict:
        """Load validation rules configuration."""
        return {
            'min_title_length': 5,
            'max_title_length': 200,
            'min_description_length': 50,
            'max_description_length': 5000,
            'required_fields': ['title', 'description'],
            'date_range_days': 730,  # 2 years
        }
    
    def _load_category_keywords(self) -> Dict[str, List[str]]:
        """Load category classification keywords."""
        return {
            'technology': [
                'software', 'programming', 'developer', 'coding', 'python', 'java',
                'javascript', 'web development', 'mobile app', 'database', 'api',
                'frontend', 'backend', 'fullstack', 'devops', 'cloud', 'aws',
                'machine learning', 'ai', 'data science', 'cybersecurity'
            ],
            'business': [
                'business', 'management', 'marketing', 'sales', 'finance',
                'accounting', 'consulting', 'strategy', 'operations', 'hr',
                'human resources', 'project management', 'business analyst',
                'market research', 'customer service', 'administration'
            ],
            'healthcare': [
                'healthcare', 'medical', 'nursing', 'pharmacy', 'hospital',
                'clinic', 'patient care', 'health', 'medicine', 'doctor',
                'nurse', 'therapist', 'medical research', 'biomedical'
            ],
            'education': [
                'education', 'teaching', 'teacher', 'tutor', 'academic',
                'research', 'university', 'school', 'curriculum', 'learning',
                'training', 'educational', 'pedagogy', 'instruction'
            ],
            'engineering': [
                'engineering', 'engineer', 'mechanical', 'civil', 'electrical',
                'chemical', 'aerospace', 'automotive', 'manufacturing',
                'construction', 'design', 'cad', 'technical drawing'
            ],
            'arts': [
                'arts', 'design', 'creative', 'graphic design', 'ui/ux',
                'photography', 'video', 'animation', 'media', 'advertising',
                'content creation', 'digital art', 'illustration', 'branding'
            ],
            'science': [
                'science', 'research', 'laboratory', 'biology', 'chemistry',
                'physics', 'environmental', 'geology', 'astronomy', 'botany',
                'zoology', 'genetics', 'microbiology', 'biochemistry'
            ]
        }
    
    def get_processing_statistics(self) -> Dict[str, any]:
        """Get statistics about data processing status."""
        from django.db.models import Avg, Count, Q
        
        stats = {
            'total_opportunities': ExternalOpportunity.objects.count(),
            'high_quality': ExternalOpportunity.objects.filter(
                data_quality_score__gte=0.8
            ).count(),
            'medium_quality': ExternalOpportunity.objects.filter(
                data_quality_score__gte=0.5,
                data_quality_score__lt=0.8
            ).count(),
            'low_quality': ExternalOpportunity.objects.filter(
                data_quality_score__lt=0.5
            ).count(),
            'duplicates': ExternalOpportunity.objects.filter(
                is_duplicate=True
            ).count(),
            'needs_processing': ExternalOpportunity.objects.filter(
                Q(data_quality_score__lt=0.8) | Q(potential_duplicates__isnull=False)
            ).count(),
            'average_quality_score': ExternalOpportunity.objects.aggregate(
                avg_score=Avg('data_quality_score')
            )['avg_score'] or 0.0,
        }
        
        # Category distribution
        category_stats = ExternalOpportunity.objects.values(
            'internship__category'
        ).annotate(
            count=Count('id')
        ).order_by('-count')
        
        stats['category_distribution'] = {
            item['internship__category']: item['count']
            for item in category_stats
        }
        
        return stats