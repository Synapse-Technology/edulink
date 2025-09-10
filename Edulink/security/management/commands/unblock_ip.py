from django.core.management.base import BaseCommand
from django.core.cache import cache
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Unblock IP addresses from the security system'

    def add_arguments(self, parser):
        parser.add_argument(
            'ip_address',
            type=str,
            help='IP address to unblock'
        )
        parser.add_argument(
            '--clear-all',
            action='store_true',
            help='Clear all blocked IPs'
        )
        parser.add_argument(
            '--list',
            action='store_true',
            help='List all currently blocked IPs'
        )

    def handle(self, *args, **options):
        if options['list']:
            self.list_blocked_ips()
            return

        if options['clear_all']:
            self.clear_all_blocked_ips()
            return

        ip_address = options['ip_address']
        self.unblock_ip(ip_address)

    def list_blocked_ips(self):
        """List all currently blocked IPs."""
        blocked_ips = cache.get('blocked_ips', set())
        
        if not blocked_ips:
            self.stdout.write(
                self.style.SUCCESS('No IPs are currently blocked.')
            )
            return

        self.stdout.write(
            self.style.WARNING(f'Currently blocked IPs ({len(blocked_ips)}):')
        )
        for ip in blocked_ips:
            self.stdout.write(f'  - {ip}')

    def clear_all_blocked_ips(self):
        """Clear all blocked IPs from cache."""
        blocked_ips = cache.get('blocked_ips', set())
        count = len(blocked_ips)
        
        cache.delete('blocked_ips')
        
        self.stdout.write(
            self.style.SUCCESS(f'Cleared {count} blocked IP(s) from cache.')
        )
        logger.info(f'Admin cleared all blocked IPs ({count} total)')

    def unblock_ip(self, ip_address):
        """Unblock a specific IP address."""
        blocked_ips = cache.get('blocked_ips', set())
        
        if ip_address not in blocked_ips:
            self.stdout.write(
                self.style.WARNING(f'IP {ip_address} is not currently blocked.')
            )
            return

        blocked_ips.discard(ip_address)
        cache.set('blocked_ips', blocked_ips, 86400)  # Keep same TTL
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully unblocked IP: {ip_address}')
        )
        logger.info(f'Admin unblocked IP: {ip_address}')