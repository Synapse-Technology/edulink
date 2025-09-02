#!/usr/bin/env python3
"""
Simple runner script for the dashboard endpoint debug test
"""

import subprocess
import sys
import os

def run_debug_test():
    """Run the dashboard debug test"""
    print("🔍 Student Dashboard Endpoint Debug Test")
    print("="*50)
    print("This script will:")
    print("1. Create a test user without student_profile")
    print("2. Test all dashboard API endpoints")
    print("3. Identify which endpoints cause 500 errors")
    print("4. Generate a detailed report")
    print("\nStarting test...\n")
    
    try:
        # Run the debug script
        result = subprocess.run(
            [sys.executable, 'debug_student_dashboard_endpoints.py'],
            cwd=os.path.dirname(os.path.abspath(__file__)),
            capture_output=False,
            text=True
        )
        
        if result.returncode == 0:
            print("\n✅ Debug test completed successfully!")
        else:
            print("\n⚠️  Debug test found issues that need to be fixed.")
            
        return result.returncode
        
    except Exception as e:
        print(f"❌ Error running debug test: {e}")
        return 1

if __name__ == '__main__':
    exit_code = run_debug_test()
    sys.exit(exit_code)