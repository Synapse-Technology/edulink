"""
Management command to migrate files from Cloudinary to Supabase Storage.

Usage:
    python manage.py migrate_to_supabase_storage [--dry-run] [--app app_name]
    
Examples:
    python manage.py migrate_to_supabase_storage              # Migrate all files
    python manage.py migrate_to_supabase_storage --dry-run    # Preview without changes
    python manage.py migrate_to_supabase_storage --app students  # Only student files
"""

import io
import logging
from django.core.management.base import BaseCommand, CommandError
from django.core.files.storage import storages
from django.db import models

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Migrate files from Cloudinary to Supabase Storage"

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview migrations without making changes',
        )
        parser.add_argument(
            '--app',
            type=str,
            help='Specific app to migrate (e.g., students, internships)',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Print detailed migration information',
        )

    def handle(self, *args, **options):
        """Execute the migration."""
        dry_run = options.get('dry_run', False)
        app_filter = options.get('app', None)
        verbose = options.get('verbose', False)

        self.stdout.write(
            self.style.WARNING('⚠️  Supabase Storage Migration')
            if not dry_run
            else self.style.WARNING('🔍 Dry-run mode (no changes will be made)')
        )

        try:
            new_storage = storages['default']
            self.stdout.write(f"Target storage: {type(new_storage).__name__}")
        except Exception as e:
            raise CommandError(f"Failed to initialize target storage: {e}")

        # Collect all file fields across models
        file_migrations = {
            'students': [
                ('Student', 'profile_picture', 'students/profile_pictures/'),
                ('Student', 'cv', 'students/cvs/'),
                ('Student', 'admission_letter', 'students/admission_letters/'),
                ('Student', 'id_document', 'students/id_documents/'),
            ],
            'employers': [
                ('Employer', 'logo', 'employer_logos/'),
            ],
            'institutions': [
                ('Institution', 'logo', 'institution_logos/'),
                ('InstitutionRequest', 'supporting_document', 'institution_requests/'),
            ],
            'internships': [
                ('InternshipEvidence', 'file', 'internships/evidence/'),
                ('ExternalPlacementDeclaration', 'proof_document', 'internships/external_placement_proofs/'),
            ],
            'support': [
                ('TicketAttachment', 'file', 'support/attachments/'),
            ],
            'reports': [
                ('Artifact', 'file', 'artifacts/%Y/%m/'),
            ],
        }

        total_migrated = 0
        total_failed = 0
        total_skipped = 0

        # Iterate through apps
        for app_name, migrations in file_migrations.items():
            if app_filter and app_name != app_filter:
                continue

            self.stdout.write(f"\n📦 {app_name.upper()}")
            self.stdout.write("-" * 50)

            for model_name, field_name, upload_path in migrations:
                try:
                    app_module = __import__(f'edulink.apps.{app_name}', fromlist=[model_name])
                    ModelClass = getattr(app_module.models, model_name)
                except (ImportError, AttributeError) as e:
                    self.stdout.write(
                        self.style.ERROR(f"  ✗ {model_name}.{field_name}: Failed to import ({e})")
                    )
                    total_failed += 1
                    continue

                # Get all instances with files
                try:
                    instances = ModelClass.objects.exclude(**{f'{field_name}': ''})
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f"  ✗ {model_name}.{field_name}: Query failed ({e})")
                    )
                    total_failed += 1
                    continue

                count = instances.count()
                if count == 0:
                    self.stdout.write(
                        self.style.WARNING(f"  ⊘ {model_name}.{field_name}: No files")
                    )
                    total_skipped += count
                    continue

                self.stdout.write(
                    f"  📄 {model_name}.{field_name}: {count} file(s)"
                )

                for idx, instance in enumerate(instances, 1):
                    file_field = getattr(instance, field_name)
                    if not file_field or not file_field.name:
                        if verbose:
                            self.stdout.write(
                                self.style.WARNING(f"    → {idx}/{count}: SKIP (empty)")
                            )
                        total_skipped += 1
                        continue

                    old_file_name = file_field.name
                    try:
                        if dry_run:
                            self.stdout.write(
                                self.style.SUCCESS(
                                    f"    → {idx}/{count}: WOULD MIGRATE: {old_file_name}"
                                )
                            )
                        else:
                            # Perform actual migration
                            self._migrate_file(
                                file_field=file_field,
                                storage=new_storage,
                                model_name=model_name,
                                field_name=field_name,
                                verbose=verbose,
                                idx=idx,
                                count=count,
                            )
                            total_migrated += 1

                    except Exception as e:
                        self.stdout.write(
                            self.style.ERROR(
                                f"    ✗ {idx}/{count}: FAILED ({old_file_name}): {e}"
                            )
                        )
                        total_failed += 1

        # Summary
        self.stdout.write("\n" + "=" * 50)
        self.stdout.write(self.style.SUCCESS("✓ Migration Summary:"))
        if not dry_run:
            self.stdout.write(f"  ✓ Migrated: {total_migrated}")
        else:
            self.stdout.write(f"  📋 Would migrate: {total_migrated}")
        self.stdout.write(f"  ⊘ Skipped: {total_skipped}")
        self.stdout.write(f"  ✗ Failed: {total_failed}")
        self.stdout.write("=" * 50)

        if total_failed > 0:
            raise CommandError(f"Migration completed with {total_failed} error(s)")

        if dry_run:
            self.stdout.write(self.style.WARNING(
                "\n🔍 Dry-run complete. Run without --dry-run to actually migrate files."
            ))

    def _migrate_file(self, file_field, storage, model_name, field_name, verbose, idx, count):
        """Migrate a single file to new storage."""
        old_file_name = file_field.name
        old_storage = file_field.storage

        try:
            # Read file from old storage
            with old_storage.open(old_file_name, 'rb') as f:
                file_content = f.read()

            # Write to new storage
            new_name = storage.save(old_file_name, io.BytesIO(file_content))

            if verbose:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"    ✓ {idx}/{count}: {old_file_name} → {new_name}"
                    )
                )
            else:
                if idx % 5 == 0:  # Progress indicator every 5 files
                    self.stdout.write(
                        self.style.SUCCESS(f"    ✓ Progress: {idx}/{count}")
                    )

        except Exception as e:
            logger.exception(f"Failed to migrate {old_file_name}")
            raise
