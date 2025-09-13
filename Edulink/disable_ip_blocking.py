#!/usr/bin/env python
"""
Temporary IP Blocking Disable Script for Edulink

This script temporarily disables IP blocking functionality to allow testing
of system features without security restrictions.

IMPORTANT: This is for testing purposes only and should be re-enabled
after testing is complete.

Usage:
    python disable_ip_blocking.py --disable    # Disable IP blocking
    python disable_ip_blocking.py --enable     # Re-enable IP blocking
    python disable_ip_blocking.py --status     # Check current status
"""

import os
import sys
import django
import argparse
from pathlib import Path

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')
django.setup()

from django.core.cache import cache
from django.conf import settings
from security.models import SecurityEvent


class IPBlockingManager:
    """Manages IP blocking functionality for testing purposes."""
    
    def __init__(self):
        self.cache_key = 'blocked_ips'
        self.disabled_flag_key = 'ip_blocking_disabled'
        self.backup_key = 'blocked_ips_backup'
    
    def disable_ip_blocking(self):
        """Temporarily disable IP blocking functionality."""
        print("🔧 Disabling IP blocking for testing...")
        
        # Backup current blocked IPs
        blocked_ips = cache.get(self.cache_key, set())
        if blocked_ips:
            cache.set(self.backup_key, blocked_ips, 86400)  # 24 hours
            print(f"   📦 Backed up {len(blocked_ips)} blocked IPs")
        
        # Clear blocked IPs
        cache.delete(self.cache_key)
        
        # Set disabled flag
        cache.set(self.disabled_flag_key, True, 86400)  # 24 hours
        
        print("✅ IP blocking has been temporarily disabled")
        print("⚠️  SECURITY WARNING: All IP addresses can now access the system")
        print("   Remember to re-enable IP blocking after testing!")
        
        return True
    
    def enable_ip_blocking(self):
        """Re-enable IP blocking functionality."""
        print("🔒 Re-enabling IP blocking...")
        
        # Remove disabled flag
        cache.delete(self.disabled_flag_key)
        
        # Restore backed up blocked IPs
        backup_ips = cache.get(self.backup_key, set())
        if backup_ips:
            cache.set(self.cache_key, backup_ips, 86400)  # 24 hours
            print(f"   📦 Restored {len(backup_ips)} previously blocked IPs")
            cache.delete(self.backup_key)
        
        print("✅ IP blocking has been re-enabled")
        print("🔒 Security protection is now active")
        
        return True
    
    def get_status(self):
        """Get current IP blocking status."""
        is_disabled = cache.get(self.disabled_flag_key, False)
        blocked_ips = cache.get(self.cache_key, set())
        backup_ips = cache.get(self.backup_key, set())
        
        status = {
            'ip_blocking_disabled': is_disabled,
            'currently_blocked_ips': len(blocked_ips),
            'backed_up_ips': len(backup_ips),
            'blocked_ips_list': list(blocked_ips) if blocked_ips else [],
            'backup_ips_list': list(backup_ips) if backup_ips else []
        }
        
        return status
    
    def print_status(self):
        """Print current status in a readable format."""
        status = self.get_status()
        
        print("📊 IP Blocking Status Report")
        print("=" * 40)
        
        if status['ip_blocking_disabled']:
            print("🔓 Status: DISABLED (Testing Mode)")
            print("⚠️  WARNING: IP blocking is currently disabled!")
        else:
            print("🔒 Status: ENABLED (Normal Operation)")
        
        print(f"📋 Currently blocked IPs: {status['currently_blocked_ips']}")
        if status['blocked_ips_list']:
            for ip in status['blocked_ips_list']:
                print(f"   • {ip}")
        
        if status['backed_up_ips'] > 0:
            print(f"📦 Backed up IPs: {status['backed_up_ips']}")
            print("   (These will be restored when re-enabling)")
        
        print("\n💡 Commands:")
        print("   python disable_ip_blocking.py --disable  # Disable for testing")
        print("   python disable_ip_blocking.py --enable   # Re-enable security")
        
        return status
    
    def clear_all_blocks(self):
        """Clear all IP blocks (emergency use only)."""
        print("🚨 EMERGENCY: Clearing all IP blocks...")
        
        # Clear current blocks
        cache.delete(self.cache_key)
        
        # Clear backup
        cache.delete(self.backup_key)
        
        # Clear disabled flag
        cache.delete(self.disabled_flag_key)
        
        print("✅ All IP blocks and settings cleared")
        print("⚠️  This was an emergency action - review security logs!")
        
        return True


def create_middleware_patch():
    """Create a patch file for the middleware to check the disabled flag."""
    patch_content = '''
# Add this to the is_ip_blocked method in SecurityMiddleware
# Insert after line: "if ip_address == '196.216.85.226':"

# Check if IP blocking is temporarily disabled
if cache.get('ip_blocking_disabled', False):
    return False  # Never block any IP when disabled
'''
    
    patch_file = Path('ip_blocking_middleware_patch.txt')
    with open(patch_file, 'w') as f:
        f.write(patch_content)
    
    print(f"📝 Created middleware patch instructions: {patch_file}")
    return patch_file


def main():
    """Main function."""
    parser = argparse.ArgumentParser(
        description="Temporarily disable/enable IP blocking for testing",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    parser.add_argument('--disable', action='store_true',
                       help='Disable IP blocking for testing')
    parser.add_argument('--enable', action='store_true',
                       help='Re-enable IP blocking')
    parser.add_argument('--status', action='store_true',
                       help='Show current IP blocking status')
    parser.add_argument('--clear-all', action='store_true',
                       help='Emergency: Clear all IP blocks')
    parser.add_argument('--create-patch', action='store_true',
                       help='Create middleware patch instructions')
    
    args = parser.parse_args()
    
    if not any([args.disable, args.enable, args.status, args.clear_all, args.create_patch]):
        parser.print_help()
        return
    
    manager = IPBlockingManager()
    
    try:
        if args.disable:
            manager.disable_ip_blocking()
        elif args.enable:
            manager.enable_ip_blocking()
        elif args.status:
            manager.print_status()
        elif args.clear_all:
            confirm = input("⚠️  This will clear ALL IP blocks. Continue? (yes/no): ")
            if confirm.lower() == 'yes':
                manager.clear_all_blocks()
            else:
                print("❌ Operation cancelled")
        elif args.create_patch:
            create_middleware_patch()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
