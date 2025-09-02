from django.core.management.base import BaseCommand
from django.db import transaction
from institutions.models import Institution, MasterInstitution
from difflib import SequenceMatcher


class Command(BaseCommand):
    help = 'Sync existing Institution records with MasterInstitution records using fuzzy matching'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be linked without making changes',
        )
        parser.add_argument(
            '--similarity-threshold',
            type=float,
            default=0.85,
            help='Minimum similarity threshold for matching (default: 0.85)',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force re-linking even if institution already has a master_institution',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        threshold = options['similarity_threshold']
        force = options['force']
        
        self.stdout.write(f"Starting institution sync with similarity threshold: {threshold}")
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN MODE - No changes will be made"))
        
        # Get institutions that need linking
        if force:
            institutions = Institution.objects.all()
            self.stdout.write(f"Found {institutions.count()} institutions (force mode)")
        else:
            institutions = Institution.objects.filter(master_institution__isnull=True)
            self.stdout.write(f"Found {institutions.count()} institutions without master_institution link")
        
        linked_count = 0
        skipped_count = 0
        
        for institution in institutions:
            master_institution = self._find_matching_master_institution(
                institution.name, 
                institution.institution_type,
                threshold
            )
            
            if master_institution:
                if dry_run:
                    self.stdout.write(
                        f"WOULD LINK: '{institution.name}' -> '{master_institution.name}' "
                        f"(ID: {master_institution.id})"
                    )
                else:
                    with transaction.atomic():
                        institution.master_institution = master_institution
                        institution.save()
                    
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"LINKED: '{institution.name}' -> '{master_institution.name}' "
                            f"(ID: {master_institution.id})"
                        )
                    )
                linked_count += 1
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f"NO MATCH: '{institution.name}' (type: {institution.institution_type})"
                    )
                )
                skipped_count += 1
        
        # Summary
        self.stdout.write("\n" + "="*50)
        self.stdout.write(f"Summary:")
        self.stdout.write(f"  - Institutions processed: {institutions.count()}")
        self.stdout.write(f"  - Successfully linked: {linked_count}")
        self.stdout.write(f"  - No matches found: {skipped_count}")
        
        if dry_run:
            self.stdout.write(self.style.WARNING("\nRun without --dry-run to apply changes"))
        else:
            self.stdout.write(self.style.SUCCESS("\nSync completed successfully!"))

    def _find_matching_master_institution(self, institution_name, institution_type, threshold):
        """
        Find a matching MasterInstitution record using fuzzy string matching.
        Returns the best match if similarity is above threshold, otherwise None.
        """
        # First try exact match
        exact_match = MasterInstitution.objects.filter(
            name__iexact=institution_name.strip()
        ).first()
        if exact_match:
            return exact_match
        
        # Try fuzzy matching
        master_institutions = MasterInstitution.objects.all()
        best_match = None
        best_similarity = 0.0
        
        for master_inst in master_institutions:
            # Calculate similarity ratio
            similarity = SequenceMatcher(None, 
                institution_name.lower().strip(), 
                master_inst.name.lower().strip()
            ).ratio()
            
            # Boost similarity if institution types match
            if (master_inst.institution_type and institution_type and
                institution_type.lower() in master_inst.institution_type.lower()):
                similarity += 0.1
            
            # Update best match if this is better
            if similarity > best_similarity and similarity >= threshold:
                best_similarity = similarity
                best_match = master_inst
        
        return best_match