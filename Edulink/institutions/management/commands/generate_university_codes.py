from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from institutions.models import Institution, UniversityRegistrationCode
from datetime import timedelta
import argparse


class Command(BaseCommand):
    help = 'Generate university registration codes for institutions'

    def add_arguments(self, parser):
        parser.add_argument(
            '--institution-id',
            type=int,
            help='Institution ID to generate codes for'
        )
        parser.add_argument(
            '--institution-name',
            type=str,
            help='Institution name to generate codes for'
        )
        parser.add_argument(
            '--count',
            type=int,
            default=10,
            help='Number of codes to generate (default: 10)'
        )
        parser.add_argument(
            '--year',
            type=int,
            default=timezone.now().year,
            help=f'Year for the codes (default: {timezone.now().year})'
        )
        parser.add_argument(
            '--expires-days',
            type=int,
            default=365,
            help='Number of days until codes expire (default: 365)'
        )
        parser.add_argument(
            '--max-uses',
            type=int,
            default=50,
            help='Maximum uses per code (default: 50)'
        )
        parser.add_argument(
            '--ip-restrictions',
            type=str,
            nargs='*',
            help='IP addresses/ranges to restrict code usage to'
        )
        parser.add_argument(
            '--list-institutions',
            action='store_true',
            help='List all available institutions'
        )
        parser.add_argument(
            '--bulk-generate',
            action='store_true',
            help='Generate codes for all verified institutions'
        )

    def handle(self, *args, **options):
        if options['list_institutions']:
            self.list_institutions()
            return

        if options['bulk_generate']:
            self.bulk_generate_codes(options)
            return

        # Get institution
        institution = self.get_institution(options)
        if not institution:
            return

        # Generate codes
        self.generate_codes_for_institution(institution, options)

    def list_institutions(self):
        """List all available institutions"""
        institutions = Institution.objects.all().order_by('name')
        
        if not institutions.exists():
            self.stdout.write(
                self.style.WARNING('No institutions found in the database.')
            )
            return

        self.stdout.write(self.style.SUCCESS('Available Institutions:'))
        self.stdout.write('-' * 60)
        
        for institution in institutions:
            status = '✓ Verified' if institution.is_verified else '✗ Not Verified'
            self.stdout.write(
                f'ID: {institution.id:3d} | {institution.name:30s} | {status}'
            )

    def get_institution(self, options):
        """Get institution by ID or name"""
        institution = None
        
        if options['institution_id']:
            try:
                institution = Institution.objects.get(id=options['institution_id'])
            except Institution.DoesNotExist:
                raise CommandError(
                    f'Institution with ID {options["institution_id"]} does not exist.'
                )
        
        elif options['institution_name']:
            try:
                institution = Institution.objects.get(
                    name__icontains=options['institution_name']
                )
            except Institution.DoesNotExist:
                raise CommandError(
                    f'Institution with name "{options["institution_name"]}" does not exist.'
                )
            except Institution.MultipleObjectsReturned:
                institutions = Institution.objects.filter(
                    name__icontains=options['institution_name']
                )
                self.stdout.write(
                    self.style.ERROR(
                        f'Multiple institutions found with name "{options["institution_name"]}":\n'
                    )
                )
                for inst in institutions:
                    self.stdout.write(f'  ID: {inst.id} - {inst.name}')
                raise CommandError('Please specify the exact institution ID.')
        
        else:
            raise CommandError(
                'Please specify either --institution-id or --institution-name'
            )
        
        if not institution.is_verified:
            self.stdout.write(
                self.style.WARNING(
                    f'Warning: Institution "{institution.name}" is not verified.'
                )
            )
        
        return institution

    def generate_codes_for_institution(self, institution, options):
        """Generate codes for a specific institution"""
        count = options['count']
        year = options['year']
        expires_days = options['expires_days']
        max_uses = options['max_uses']
        ip_restrictions = options.get('ip_restrictions', [])
        
        self.stdout.write(
            f'Generating {count} codes for {institution.name} (Year: {year})...'
        )
        
        generated_codes = []
        expires_at = timezone.now() + timedelta(days=expires_days)
        
        for i in range(count):
            try:
                code = UniversityRegistrationCode.generate_code(
                    institution=institution,
                    year=year,
                    created_by='management_command'
                )
                # Set additional fields after creation
                code.expires_at = expires_at
                code.max_uses = max_uses
                code.ip_restrictions = ip_restrictions or []
                code.save()
                generated_codes.append(code)
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error generating code {i+1}: {str(e)}')
                )
                continue
        
        if generated_codes:
            self.stdout.write(
                self.style.SUCCESS(
                    f'\nSuccessfully generated {len(generated_codes)} codes:'
                )
            )
            self.stdout.write('-' * 50)
            
            for code in generated_codes:
                self.stdout.write(
                    f'{code.code} | Expires: {code.expires_at.strftime("%Y-%m-%d")} | '
                    f'Max Uses: {code.max_uses}'
                )
            
            # Summary
            self.stdout.write('\n' + '=' * 50)
            self.stdout.write(self.style.SUCCESS('GENERATION SUMMARY'))
            self.stdout.write('=' * 50)
            self.stdout.write(f'Institution: {institution.name}')
            self.stdout.write(f'Year: {year}')
            self.stdout.write(f'Codes Generated: {len(generated_codes)}')
            self.stdout.write(f'Expires: {expires_at.strftime("%Y-%m-%d %H:%M:%S")}')
            self.stdout.write(f'Max Uses per Code: {max_uses}')
            if ip_restrictions:
                self.stdout.write(f'IP Restrictions: {", ".join(ip_restrictions)}')
        
        else:
            self.stdout.write(
                self.style.ERROR('No codes were generated successfully.')
            )

    def bulk_generate_codes(self, options):
        """Generate codes for all verified institutions"""
        institutions = Institution.objects.filter(is_verified=True)
        
        if not institutions.exists():
            self.stdout.write(
                self.style.WARNING('No verified institutions found.')
            )
            return
        
        self.stdout.write(
            f'Generating codes for {institutions.count()} verified institutions...'
        )
        
        total_generated = 0
        
        for institution in institutions:
            self.stdout.write(f'\nProcessing: {institution.name}')
            
            try:
                self.generate_codes_for_institution(institution, options)
                total_generated += options['count']
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'Error generating codes for {institution.name}: {str(e)}'
                    )
                )
                continue
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\nBulk generation completed. Total codes generated: {total_generated}'
            )
        )