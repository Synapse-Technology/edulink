#!/usr/bin/env python3
"""
Migration Validation Script for Edulink Microservices Migration

This script validates the data migration by comparing record counts,
data integrity, and relationships between the source monolith and
target microservice databases.

Usage:
    python validate_migration.py --config config.json
"""

import os
import sys
import json
import argparse
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple

import psycopg2
import psycopg2.extras
from psycopg2.extensions import ISOLATION_LEVEL_READ_COMMITTED

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('migration_validation.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


class MigrationValidator:
    """Validates data migration between monolith and microservices."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.source_db_config = config['source_database']
        self.auth_db_config = config['auth_database']
        self.user_db_config = config['user_database']
        
        # Database connections
        self.source_conn = None
        self.auth_conn = None
        self.user_conn = None
        
        # Validation results
        self.validation_results = {
            'start_time': datetime.now(),
            'tests_run': 0,
            'tests_passed': 0,
            'tests_failed': 0,
            'warnings': [],
            'errors': [],
            'detailed_results': []
        }
    
    def connect_databases(self) -> None:
        """Establish connections to all databases."""
        try:
            # Connect to source database
            self.source_conn = psycopg2.connect(
                host=self.source_db_config['host'],
                port=self.source_db_config['port'],
                database=self.source_db_config['database'],
                user=self.source_db_config['username'],
                password=self.source_db_config['password']
            )
            self.source_conn.set_isolation_level(ISOLATION_LEVEL_READ_COMMITTED)
            logger.info("Connected to source database")
            
            # Connect to auth service database
            self.auth_conn = psycopg2.connect(
                host=self.auth_db_config['host'],
                port=self.auth_db_config['port'],
                database=self.auth_db_config['database'],
                user=self.auth_db_config['username'],
                password=self.auth_db_config['password']
            )
            self.auth_conn.set_isolation_level(ISOLATION_LEVEL_READ_COMMITTED)
            logger.info("Connected to auth service database")
            
            # Connect to user service database
            self.user_conn = psycopg2.connect(
                host=self.user_db_config['host'],
                port=self.user_db_config['port'],
                database=self.user_db_config['database'],
                user=self.user_db_config['username'],
                password=self.user_db_config['password']
            )
            self.user_conn.set_isolation_level(ISOLATION_LEVEL_READ_COMMITTED)
            logger.info("Connected to user service database")
            
        except Exception as e:
            logger.error(f"Failed to connect to databases: {e}")
            raise
    
    def disconnect_databases(self) -> None:
        """Close database connections."""
        if self.source_conn:
            self.source_conn.close()
            logger.info("Disconnected from source database")
        if self.auth_conn:
            self.auth_conn.close()
            logger.info("Disconnected from auth service database")
        if self.user_conn:
            self.user_conn.close()
            logger.info("Disconnected from user service database")
    
    def execute_query(self, connection, query: str, params: Tuple = None) -> List[Dict[str, Any]]:
        """Execute a query and return results as list of dictionaries."""
        try:
            cursor = connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cursor.execute(query, params)
            results = cursor.fetchall()
            cursor.close()
            return [dict(row) for row in results]
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            logger.error(f"Query: {query}")
            raise
    
    def get_count(self, connection, query: str, params: Tuple = None) -> int:
        """Execute a count query and return the result."""
        try:
            cursor = connection.cursor()
            cursor.execute(query, params)
            count = cursor.fetchone()[0]
            cursor.close()
            return count
        except Exception as e:
            logger.error(f"Count query failed: {e}")
            logger.error(f"Query: {query}")
            return 0
    
    def add_test_result(self, test_name: str, passed: bool, details: str, 
                       source_count: int = None, target_count: int = None) -> None:
        """Add a test result to the validation results."""
        self.validation_results['tests_run'] += 1
        
        if passed:
            self.validation_results['tests_passed'] += 1
            status = 'PASSED'
        else:
            self.validation_results['tests_failed'] += 1
            status = 'FAILED'
            self.validation_results['errors'].append(f"{test_name}: {details}")
        
        result = {
            'test_name': test_name,
            'status': status,
            'details': details,
            'timestamp': datetime.now().isoformat()
        }
        
        if source_count is not None:
            result['source_count'] = source_count
        if target_count is not None:
            result['target_count'] = target_count
        
        self.validation_results['detailed_results'].append(result)
        
        logger.info(f"{status}: {test_name} - {details}")
    
    def validate_user_counts(self) -> None:
        """Validate user record counts between source and auth service."""
        logger.info("Validating user counts...")
        
        try:
            # Count users in source database
            source_count = self.get_count(
                self.source_conn,
                "SELECT COUNT(*) FROM auth_user"
            )
            
            # Count users in auth service
            auth_count = self.get_count(
                self.auth_conn,
                "SELECT COUNT(*) FROM auth_service.users"
            )
            
            passed = source_count == auth_count
            details = f"Source: {source_count}, Auth Service: {auth_count}"
            
            self.add_test_result(
                "User Count Validation",
                passed,
                details,
                source_count,
                auth_count
            )
            
        except Exception as e:
            self.add_test_result(
                "User Count Validation",
                False,
                f"Error: {e}"
            )
    
    def validate_profile_counts(self) -> None:
        """Validate profile record counts between source and user service."""
        logger.info("Validating profile counts...")
        
        try:
            # Count profiles in source database
            source_count = self.get_count(
                self.source_conn,
                "SELECT COUNT(*) FROM user_profile"
            )
            
            # Count profiles in user service
            user_count = self.get_count(
                self.user_conn,
                "SELECT COUNT(*) FROM user_service.profiles"
            )
            
            passed = source_count == user_count
            details = f"Source: {source_count}, User Service: {user_count}"
            
            self.add_test_result(
                "Profile Count Validation",
                passed,
                details,
                source_count,
                user_count
            )
            
        except Exception as e:
            self.add_test_result(
                "Profile Count Validation",
                False,
                f"Error: {e}"
            )
    
    def validate_student_profile_counts(self) -> None:
        """Validate student profile counts."""
        logger.info("Validating student profile counts...")
        
        try:
            # Count student profiles in source database
            source_count = self.get_count(
                self.source_conn,
                "SELECT COUNT(*) FROM student_profile"
            )
            
            # Count student profiles in user service
            user_count = self.get_count(
                self.user_conn,
                "SELECT COUNT(*) FROM user_service.student_profiles"
            )
            
            passed = source_count == user_count
            details = f"Source: {source_count}, User Service: {user_count}"
            
            self.add_test_result(
                "Student Profile Count Validation",
                passed,
                details,
                source_count,
                user_count
            )
            
        except Exception as e:
            self.add_test_result(
                "Student Profile Count Validation",
                False,
                f"Error: {e}"
            )
    
    def validate_company_profile_counts(self) -> None:
        """Validate company profile counts."""
        logger.info("Validating company profile counts...")
        
        try:
            # Count company profiles in source database
            source_count = self.get_count(
                self.source_conn,
                "SELECT COUNT(*) FROM company_profile"
            )
            
            # Count company profiles in user service
            user_count = self.get_count(
                self.user_conn,
                "SELECT COUNT(*) FROM user_service.company_profiles"
            )
            
            passed = source_count == user_count
            details = f"Source: {source_count}, User Service: {user_count}"
            
            self.add_test_result(
                "Company Profile Count Validation",
                passed,
                details,
                source_count,
                user_count
            )
            
        except Exception as e:
            self.add_test_result(
                "Company Profile Count Validation",
                False,
                f"Error: {e}"
            )
    
    def validate_permission_counts(self) -> None:
        """Validate permission counts."""
        logger.info("Validating permission counts...")
        
        try:
            # Count permissions in source database
            source_count = self.get_count(
                self.source_conn,
                "SELECT COUNT(*) FROM auth_permission"
            )
            
            # Count permissions in auth service
            auth_count = self.get_count(
                self.auth_conn,
                "SELECT COUNT(*) FROM auth_service.permissions"
            )
            
            passed = source_count == auth_count
            details = f"Source: {source_count}, Auth Service: {auth_count}"
            
            self.add_test_result(
                "Permission Count Validation",
                passed,
                details,
                source_count,
                auth_count
            )
            
        except Exception as e:
            self.add_test_result(
                "Permission Count Validation",
                False,
                f"Error: {e}"
            )
    
    def validate_data_integrity(self) -> None:
        """Validate data integrity by checking specific records."""
        logger.info("Validating data integrity...")
        
        try:
            # Sample validation: Check if specific user data matches
            source_users = self.execute_query(
                self.source_conn,
                "SELECT id, username, email, first_name, last_name FROM auth_user LIMIT 10"
            )
            
            for source_user in source_users:
                # Find corresponding user in auth service by email
                auth_users = self.execute_query(
                    self.auth_conn,
                    "SELECT username, email, first_name, last_name FROM auth_service.users WHERE email = %s",
                    (source_user['email'],)
                )
                
                if not auth_users:
                    self.add_test_result(
                        f"User Data Integrity - {source_user['email']}",
                        False,
                        f"User not found in auth service"
                    )
                    continue
                
                auth_user = auth_users[0]
                
                # Check if data matches
                fields_match = (
                    source_user['username'] == auth_user['username'] and
                    source_user['email'] == auth_user['email'] and
                    source_user['first_name'] == auth_user['first_name'] and
                    source_user['last_name'] == auth_user['last_name']
                )
                
                self.add_test_result(
                    f"User Data Integrity - {source_user['email']}",
                    fields_match,
                    "Data fields match" if fields_match else "Data fields mismatch"
                )
            
        except Exception as e:
            self.add_test_result(
                "Data Integrity Validation",
                False,
                f"Error: {e}"
            )
    
    def validate_referential_integrity(self) -> None:
        """Validate referential integrity between services."""
        logger.info("Validating referential integrity...")
        
        try:
            # Check if all user profiles have corresponding users in auth service
            orphaned_profiles = self.execute_query(
                self.user_conn,
                """
                SELECT p.user_id 
                FROM user_service.profiles p
                WHERE NOT EXISTS (
                    SELECT 1 FROM auth_service.users u WHERE u.id = p.user_id
                )
                LIMIT 10
                """
            )
            
            passed = len(orphaned_profiles) == 0
            details = f"Found {len(orphaned_profiles)} orphaned profiles"
            
            self.add_test_result(
                "Profile-User Referential Integrity",
                passed,
                details
            )
            
            if orphaned_profiles:
                for profile in orphaned_profiles:
                    self.validation_results['warnings'].append(
                        f"Orphaned profile for user_id: {profile['user_id']}"
                    )
            
        except Exception as e:
            self.add_test_result(
                "Referential Integrity Validation",
                False,
                f"Error: {e}"
            )
    
    def validate_unique_constraints(self) -> None:
        """Validate unique constraints in target databases."""
        logger.info("Validating unique constraints...")
        
        try:
            # Check for duplicate emails in auth service
            duplicate_emails = self.execute_query(
                self.auth_conn,
                """
                SELECT email, COUNT(*) as count
                FROM auth_service.users
                GROUP BY email
                HAVING COUNT(*) > 1
                """
            )
            
            passed = len(duplicate_emails) == 0
            details = f"Found {len(duplicate_emails)} duplicate emails"
            
            self.add_test_result(
                "Email Uniqueness Validation",
                passed,
                details
            )
            
            # Check for duplicate usernames in auth service
            duplicate_usernames = self.execute_query(
                self.auth_conn,
                """
                SELECT username, COUNT(*) as count
                FROM auth_service.users
                GROUP BY username
                HAVING COUNT(*) > 1
                """
            )
            
            passed = len(duplicate_usernames) == 0
            details = f"Found {len(duplicate_usernames)} duplicate usernames"
            
            self.add_test_result(
                "Username Uniqueness Validation",
                passed,
                details
            )
            
        except Exception as e:
            self.add_test_result(
                "Unique Constraints Validation",
                False,
                f"Error: {e}"
            )
    
    def validate_data_types(self) -> None:
        """Validate data types and formats in target databases."""
        logger.info("Validating data types and formats...")
        
        try:
            # Check for invalid email formats
            invalid_emails = self.execute_query(
                self.auth_conn,
                """
                SELECT email
                FROM auth_service.users
                WHERE email IS NOT NULL 
                AND email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
                LIMIT 10
                """
            )
            
            passed = len(invalid_emails) == 0
            details = f"Found {len(invalid_emails)} invalid email formats"
            
            self.add_test_result(
                "Email Format Validation",
                passed,
                details
            )
            
            # Check for invalid UUIDs
            invalid_uuids = self.execute_query(
                self.auth_conn,
                """
                SELECT id
                FROM auth_service.users
                WHERE id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                LIMIT 10
                """
            )
            
            passed = len(invalid_uuids) == 0
            details = f"Found {len(invalid_uuids)} invalid UUIDs"
            
            self.add_test_result(
                "UUID Format Validation",
                passed,
                details
            )
            
        except Exception as e:
            self.add_test_result(
                "Data Types Validation",
                False,
                f"Error: {e}"
            )
    
    def validate_json_fields(self) -> None:
        """Validate JSON fields in user service."""
        logger.info("Validating JSON fields...")
        
        try:
            # Check for invalid JSON in skills field
            invalid_skills = self.execute_query(
                self.user_conn,
                """
                SELECT user_id
                FROM user_service.student_profiles
                WHERE skills IS NOT NULL
                AND NOT (skills::text ~ '^\\[.*\\]$' OR skills::text = '[]')
                LIMIT 10
                """
            )
            
            passed = len(invalid_skills) == 0
            details = f"Found {len(invalid_skills)} invalid skills JSON"
            
            self.add_test_result(
                "Skills JSON Validation",
                passed,
                details
            )
            
        except Exception as e:
            self.add_test_result(
                "JSON Fields Validation",
                False,
                f"Error: {e}"
            )
    
    def validate_performance(self) -> None:
        """Validate database performance with sample queries."""
        logger.info("Validating database performance...")
        
        try:
            # Test auth service query performance
            start_time = datetime.now()
            self.execute_query(
                self.auth_conn,
                "SELECT * FROM auth_service.users WHERE email LIKE '%@example.com' LIMIT 100"
            )
            auth_duration = (datetime.now() - start_time).total_seconds()
            
            # Test user service query performance
            start_time = datetime.now()
            self.execute_query(
                self.user_conn,
                "SELECT * FROM user_service.profiles WHERE city = 'New York' LIMIT 100"
            )
            user_duration = (datetime.now() - start_time).total_seconds()
            
            # Consider queries fast if they complete under 1 second
            auth_fast = auth_duration < 1.0
            user_fast = user_duration < 1.0
            
            self.add_test_result(
                "Auth Service Query Performance",
                auth_fast,
                f"Query completed in {auth_duration:.3f} seconds"
            )
            
            self.add_test_result(
                "User Service Query Performance",
                user_fast,
                f"Query completed in {user_duration:.3f} seconds"
            )
            
        except Exception as e:
            self.add_test_result(
                "Performance Validation",
                False,
                f"Error: {e}"
            )
    
    def create_validation_report(self) -> None:
        """Create a comprehensive validation report."""
        report = {
            'validation_info': {
                'version': '1.0',
                'validated_at': datetime.now().isoformat(),
                'validator_version': '1.0.0'
            },
            'summary': {
                'start_time': self.validation_results['start_time'].isoformat(),
                'end_time': datetime.now().isoformat(),
                'duration_seconds': (datetime.now() - self.validation_results['start_time']).total_seconds(),
                'tests_run': self.validation_results['tests_run'],
                'tests_passed': self.validation_results['tests_passed'],
                'tests_failed': self.validation_results['tests_failed'],
                'success_rate': (self.validation_results['tests_passed'] / max(1, self.validation_results['tests_run'])) * 100,
                'warnings_count': len(self.validation_results['warnings']),
                'errors_count': len(self.validation_results['errors'])
            },
            'detailed_results': self.validation_results['detailed_results'],
            'warnings': self.validation_results['warnings'],
            'errors': self.validation_results['errors']
        }
        
        report_path = Path('migration_validation_report.json')
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2)
        
        logger.info(f"Validation report created: {report_path}")
        
        # Also create a summary text report
        summary_path = Path('migration_validation_summary.txt')
        with open(summary_path, 'w', encoding='utf-8') as f:
            f.write("EDULINK MIGRATION VALIDATION REPORT\n")
            f.write("=" * 40 + "\n\n")
            f.write(f"Validation Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"Tests Run: {self.validation_results['tests_run']}\n")
            f.write(f"Tests Passed: {self.validation_results['tests_passed']}\n")
            f.write(f"Tests Failed: {self.validation_results['tests_failed']}\n")
            f.write(f"Success Rate: {report['summary']['success_rate']:.1f}%\n")
            f.write(f"Warnings: {len(self.validation_results['warnings'])}\n")
            f.write(f"Errors: {len(self.validation_results['errors'])}\n\n")
            
            if self.validation_results['errors']:
                f.write("ERRORS:\n")
                f.write("-" * 20 + "\n")
                for error in self.validation_results['errors']:
                    f.write(f"- {error}\n")
                f.write("\n")
            
            if self.validation_results['warnings']:
                f.write("WARNINGS:\n")
                f.write("-" * 20 + "\n")
                for warning in self.validation_results['warnings']:
                    f.write(f"- {warning}\n")
                f.write("\n")
            
            f.write("DETAILED RESULTS:\n")
            f.write("-" * 20 + "\n")
            for result in self.validation_results['detailed_results']:
                f.write(f"{result['status']}: {result['test_name']} - {result['details']}\n")
        
        logger.info(f"Validation summary created: {summary_path}")
    
    def run_validation(self) -> bool:
        """Run the complete validation process."""
        try:
            logger.info("Starting migration validation...")
            
            # Connect to databases
            self.connect_databases()
            
            # Run validation tests
            self.validate_user_counts()
            self.validate_profile_counts()
            self.validate_student_profile_counts()
            self.validate_company_profile_counts()
            self.validate_permission_counts()
            self.validate_data_integrity()
            self.validate_referential_integrity()
            self.validate_unique_constraints()
            self.validate_data_types()
            self.validate_json_fields()
            self.validate_performance()
            
            # Create validation report
            self.create_validation_report()
            
            # Log completion
            duration = datetime.now() - self.validation_results['start_time']
            success_rate = (self.validation_results['tests_passed'] / max(1, self.validation_results['tests_run'])) * 100
            
            logger.info(f"Validation completed!")
            logger.info(f"Duration: {duration}")
            logger.info(f"Tests run: {self.validation_results['tests_run']}")
            logger.info(f"Tests passed: {self.validation_results['tests_passed']}")
            logger.info(f"Tests failed: {self.validation_results['tests_failed']}")
            logger.info(f"Success rate: {success_rate:.1f}%")
            logger.info(f"Warnings: {len(self.validation_results['warnings'])}")
            logger.info(f"Errors: {len(self.validation_results['errors'])}")
            
            # Return True if all tests passed
            return self.validation_results['tests_failed'] == 0
            
        except Exception as e:
            logger.error(f"Validation failed: {e}")
            return False
        finally:
            self.disconnect_databases()


def load_config(config_file: str) -> Dict[str, Any]:
    """Load configuration from JSON file."""
    try:
        with open(config_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load config file {config_file}: {e}")
        raise


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Validate Edulink microservices migration'
    )
    parser.add_argument(
        '--config', 
        required=True, 
        help='Configuration file path'
    )
    parser.add_argument(
        '--verbose', 
        action='store_true', 
        help='Enable verbose logging'
    )
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    try:
        # Load configuration
        config = load_config(args.config)
        
        # Validate required config
        required_keys = ['source_database', 'auth_database', 'user_database']
        for key in required_keys:
            if key not in config:
                raise ValueError(f"Missing required config key: {key}")
        
        # Run validation
        validator = MigrationValidator(config)
        success = validator.run_validation()
        
        if success:
            logger.info("Migration validation completed successfully!")
            sys.exit(0)
        else:
            logger.error("Migration validation failed!")
            sys.exit(1)
        
    except Exception as e:
        logger.error(f"Validation failed: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()