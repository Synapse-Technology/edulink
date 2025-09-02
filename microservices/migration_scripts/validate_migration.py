#!/usr/bin/env python
"""
Validation script for Edulink microservices migration.
This script validates data integrity and consistency after migration.
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
import json
from datetime import datetime
from typing import Dict, List, Any, Tuple

# Database connection configurations
DATABASE_CONFIGS = {
    'monolith': {
        'host': 'localhost',
        'port': 5432,
        'database': 'edulink',
        'user': 'edulink_user',
        'password': 'edulink_password'
    },
    'internships': {
        'host': 'localhost',
        'port': 5432,
        'database': 'edulink_internships',
        'user': 'edulink_user',
        'password': 'edulink_password'
    },
    'applications': {
        'host': 'localhost',
        'port': 5432,
        'database': 'edulink_applications',
        'user': 'edulink_user',
        'password': 'edulink_password'
    }
}

class MigrationValidator:
    def __init__(self):
        self.connections = {}
        self.validation_results = []
        self.errors = []
        self.warnings = []
        
    def connect_to_databases(self):
        """Establish connections to all databases"""
        for db_name, config in DATABASE_CONFIGS.items():
            try:
                conn = psycopg2.connect(**config)
                conn.autocommit = True
                self.connections[db_name] = conn
                print(f"✓ Connected to {db_name} database")
            except Exception as e:
                print(f"✗ Failed to connect to {db_name} database: {e}")
                raise
    
    def close_connections(self):
        """Close all database connections"""
        for db_name, conn in self.connections.items():
            if conn:
                conn.close()
                print(f"✓ Closed connection to {db_name} database")
    
    def log_result(self, test_name: str, status: str, details: str, data: Dict = None):
        """Log validation results"""
        result = {
            'timestamp': datetime.now().isoformat(),
            'test': test_name,
            'status': status,
            'details': details,
            'data': data or {}
        }
        self.validation_results.append(result)
        
        status_symbol = "✓" if status == "PASS" else "⚠" if status == "WARNING" else "✗"
        print(f"{status_symbol} {test_name}: {details}")
        
        if status == "FAIL":
            self.errors.append(result)
        elif status == "WARNING":
            self.warnings.append(result)
    
    def validate_record_counts(self):
        """Validate that record counts match between monolith and microservices"""
        print("\n=== Validating Record Counts ===")
        
        # Validate skill tags
        monolith_count = self._get_count('monolith', 'internships_skilltag')
        microservice_count = self._get_count('internships', 'internships_skilltag')
        
        if monolith_count == microservice_count:
            self.log_result('skill_tags_count', 'PASS', 
                          f'Counts match: {monolith_count}', 
                          {'monolith': monolith_count, 'microservice': microservice_count})
        else:
            self.log_result('skill_tags_count', 'FAIL', 
                          f'Count mismatch: monolith={monolith_count}, microservice={microservice_count}',
                          {'monolith': monolith_count, 'microservice': microservice_count})
        
        # Validate internships
        monolith_count = self._get_count('monolith', 'internships_internship')
        microservice_count = self._get_count('internships', 'internships_internship')
        
        if monolith_count == microservice_count:
            self.log_result('internships_count', 'PASS', 
                          f'Counts match: {monolith_count}',
                          {'monolith': monolith_count, 'microservice': microservice_count})
        else:
            self.log_result('internships_count', 'FAIL', 
                          f'Count mismatch: monolith={monolith_count}, microservice={microservice_count}',
                          {'monolith': monolith_count, 'microservice': microservice_count})
        
        # Validate applications
        monolith_count = self._get_count('monolith', 'applications_application')
        microservice_count = self._get_count('applications', 'applications_application')
        
        if monolith_count == microservice_count:
            self.log_result('applications_count', 'PASS', 
                          f'Counts match: {monolith_count}',
                          {'monolith': monolith_count, 'microservice': microservice_count})
        else:
            self.log_result('applications_count', 'FAIL', 
                          f'Count mismatch: monolith={monolith_count}, microservice={microservice_count}',
                          {'monolith': monolith_count, 'microservice': microservice_count})
        
        # Validate application documents
        monolith_count = self._get_count('monolith', 'applications_applicationdocument')
        microservice_count = self._get_count('applications', 'applications_applicationdocument')
        
        if monolith_count == microservice_count:
            self.log_result('documents_count', 'PASS', 
                          f'Counts match: {monolith_count}',
                          {'monolith': monolith_count, 'microservice': microservice_count})
        else:
            self.log_result('documents_count', 'FAIL', 
                          f'Count mismatch: monolith={monolith_count}, microservice={microservice_count}',
                          {'monolith': monolith_count, 'microservice': microservice_count})
        
        # Validate supervisor feedback
        monolith_count = self._get_count('monolith', 'applications_supervisorfeedback')
        microservice_count = self._get_count('applications', 'applications_supervisorfeedback')
        
        if monolith_count == microservice_count:
            self.log_result('feedback_count', 'PASS', 
                          f'Counts match: {monolith_count}',
                          {'monolith': monolith_count, 'microservice': microservice_count})
        else:
            self.log_result('feedback_count', 'FAIL', 
                          f'Count mismatch: monolith={monolith_count}, microservice={microservice_count}',
                          {'monolith': monolith_count, 'microservice': microservice_count})
    
    def _get_count(self, db_name: str, table_name: str) -> int:
        """Get record count from a table"""
        cursor = self.connections[db_name].cursor()
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        return cursor.fetchone()[0]
    
    def validate_data_integrity(self):
        """Validate data integrity and consistency"""
        print("\n=== Validating Data Integrity ===")
        
        # Validate internship data integrity
        self._validate_internship_integrity()
        
        # Validate application data integrity
        self._validate_application_integrity()
        
        # Validate foreign key relationships
        self._validate_foreign_keys()
    
    def _validate_internship_integrity(self):
        """Validate internship data integrity"""
        # Check for missing required fields
        internship_cursor = self.connections['internships'].cursor()
        
        # Check for internships without title
        internship_cursor.execute("SELECT COUNT(*) FROM internships_internship WHERE title IS NULL OR title = ''")
        missing_titles = internship_cursor.fetchone()[0]
        
        if missing_titles == 0:
            self.log_result('internship_titles', 'PASS', 'All internships have titles')
        else:
            self.log_result('internship_titles', 'FAIL', f'{missing_titles} internships missing titles')
        
        # Check for internships with invalid dates
        internship_cursor.execute("""
            SELECT COUNT(*) FROM internships_internship 
            WHERE application_deadline < start_date OR start_date > end_date
        """)
        invalid_dates = internship_cursor.fetchone()[0]
        
        if invalid_dates == 0:
            self.log_result('internship_dates', 'PASS', 'All internship dates are valid')
        else:
            self.log_result('internship_dates', 'FAIL', f'{invalid_dates} internships have invalid dates')
        
        # Check for negative stipends
        internship_cursor.execute("SELECT COUNT(*) FROM internships_internship WHERE stipend_amount < 0")
        negative_stipends = internship_cursor.fetchone()[0]
        
        if negative_stipends == 0:
            self.log_result('internship_stipends', 'PASS', 'All stipend amounts are valid')
        else:
            self.log_result('internship_stipends', 'WARNING', f'{negative_stipends} internships have negative stipends')
    
    def _validate_application_integrity(self):
        """Validate application data integrity"""
        application_cursor = self.connections['applications'].cursor()
        
        # Check for applications with invalid status
        valid_statuses = ['pending', 'under_review', 'interview_scheduled', 'accepted', 'rejected', 'withdrawn']
        status_list = "', '".join(valid_statuses)
        
        application_cursor.execute(f"""
            SELECT COUNT(*) FROM applications_application 
            WHERE status NOT IN ('{status_list}')
        """)
        invalid_status = application_cursor.fetchone()[0]
        
        if invalid_status == 0:
            self.log_result('application_status', 'PASS', 'All application statuses are valid')
        else:
            self.log_result('application_status', 'FAIL', f'{invalid_status} applications have invalid status')
        
        # Check for applications with future applied_at dates
        application_cursor.execute("""
            SELECT COUNT(*) FROM applications_application 
            WHERE applied_at > NOW()
        """)
        future_applications = application_cursor.fetchone()[0]
        
        if future_applications == 0:
            self.log_result('application_dates', 'PASS', 'All application dates are valid')
        else:
            self.log_result('application_dates', 'WARNING', f'{future_applications} applications have future dates')
        
        # Check priority scores
        application_cursor.execute("""
            SELECT COUNT(*) FROM applications_application 
            WHERE priority_score < 0 OR priority_score > 100
        """)
        invalid_scores = application_cursor.fetchone()[0]
        
        if invalid_scores == 0:
            self.log_result('priority_scores', 'PASS', 'All priority scores are in valid range')
        else:
            self.log_result('priority_scores', 'WARNING', f'{invalid_scores} applications have invalid priority scores')
    
    def _validate_foreign_keys(self):
        """Validate foreign key relationships"""
        # Check internship-skill relationships
        internship_cursor = self.connections['internships'].cursor()
        
        # Check for orphaned skill relationships
        internship_cursor.execute("""
            SELECT COUNT(*) FROM internships_internship_required_skills irs
            LEFT JOIN internships_internship i ON irs.internship_id = i.id
            LEFT JOIN internships_skilltag s ON irs.skilltag_id = s.id
            WHERE i.id IS NULL OR s.id IS NULL
        """)
        orphaned_skills = internship_cursor.fetchone()[0]
        
        if orphaned_skills == 0:
            self.log_result('internship_skills_fk', 'PASS', 'All internship-skill relationships are valid')
        else:
            self.log_result('internship_skills_fk', 'FAIL', f'{orphaned_skills} orphaned skill relationships found')
        
        # Check application-document relationships
        application_cursor = self.connections['applications'].cursor()
        
        application_cursor.execute("""
            SELECT COUNT(*) FROM applications_applicationdocument ad
            LEFT JOIN applications_application a ON ad.application_id = a.id
            WHERE a.id IS NULL
        """)
        orphaned_documents = application_cursor.fetchone()[0]
        
        if orphaned_documents == 0:
            self.log_result('application_documents_fk', 'PASS', 'All application-document relationships are valid')
        else:
            self.log_result('application_documents_fk', 'FAIL', f'{orphaned_documents} orphaned document relationships found')
        
        # Check supervisor feedback relationships
        application_cursor.execute("""
            SELECT COUNT(*) FROM applications_supervisorfeedback sf
            LEFT JOIN applications_application a ON sf.application_id = a.id
            WHERE a.id IS NULL
        """)
        orphaned_feedback = application_cursor.fetchone()[0]
        
        if orphaned_feedback == 0:
            self.log_result('supervisor_feedback_fk', 'PASS', 'All supervisor feedback relationships are valid')
        else:
            self.log_result('supervisor_feedback_fk', 'FAIL', f'{orphaned_feedback} orphaned feedback relationships found')
    
    def validate_sample_data(self):
        """Validate a sample of data for consistency between monolith and microservices"""
        print("\n=== Validating Sample Data Consistency ===")
        
        # Sample internships
        self._validate_sample_internships()
        
        # Sample applications
        self._validate_sample_applications()
    
    def _validate_sample_internships(self):
        """Validate sample internship records"""
        # Get sample internships from monolith
        monolith_cursor = self.connections['monolith'].cursor(cursor_factory=RealDictCursor)
        monolith_cursor.execute("""
            SELECT id, title, description, location, stipend_amount, is_active
            FROM internships_internship
            ORDER BY id
            LIMIT 10
        """)
        monolith_internships = {row['id']: row for row in monolith_cursor.fetchall()}
        
        # Get same internships from microservice
        internship_cursor = self.connections['internships'].cursor(cursor_factory=RealDictCursor)
        if monolith_internships:
            ids = list(monolith_internships.keys())
            placeholders = ','.join(['%s'] * len(ids))
            internship_cursor.execute(f"""
                SELECT id, title, description, location, stipend_amount, is_active
                FROM internships_internship
                WHERE id IN ({placeholders})
            """, ids)
            microservice_internships = {row['id']: row for row in internship_cursor.fetchall()}
            
            # Compare data
            mismatches = 0
            for internship_id, monolith_data in monolith_internships.items():
                if internship_id not in microservice_internships:
                    mismatches += 1
                    continue
                
                microservice_data = microservice_internships[internship_id]
                for field in ['title', 'description', 'location', 'stipend_amount', 'is_active']:
                    if monolith_data[field] != microservice_data[field]:
                        mismatches += 1
                        break
            
            if mismatches == 0:
                self.log_result('sample_internships', 'PASS', f'All {len(monolith_internships)} sample internships match')
            else:
                self.log_result('sample_internships', 'FAIL', f'{mismatches} sample internships have mismatches')
    
    def _validate_sample_applications(self):
        """Validate sample application records"""
        # Get sample applications from monolith
        monolith_cursor = self.connections['monolith'].cursor(cursor_factory=RealDictCursor)
        monolith_cursor.execute("""
            SELECT id, student_id, internship_id, status, priority_score
            FROM applications_application
            ORDER BY id
            LIMIT 10
        """)
        monolith_applications = {row['id']: row for row in monolith_cursor.fetchall()}
        
        # Get same applications from microservice
        application_cursor = self.connections['applications'].cursor(cursor_factory=RealDictCursor)
        if monolith_applications:
            ids = list(monolith_applications.keys())
            placeholders = ','.join(['%s'] * len(ids))
            application_cursor.execute(f"""
                SELECT id, student_id, internship_id, status, priority_score
                FROM applications_application
                WHERE id IN ({placeholders})
            """, ids)
            microservice_applications = {row['id']: row for row in application_cursor.fetchall()}
            
            # Compare data
            mismatches = 0
            for app_id, monolith_data in monolith_applications.items():
                if app_id not in microservice_applications:
                    mismatches += 1
                    continue
                
                microservice_data = microservice_applications[app_id]
                for field in ['student_id', 'internship_id', 'status', 'priority_score']:
                    if monolith_data[field] != microservice_data[field]:
                        mismatches += 1
                        break
            
            if mismatches == 0:
                self.log_result('sample_applications', 'PASS', f'All {len(monolith_applications)} sample applications match')
            else:
                self.log_result('sample_applications', 'FAIL', f'{mismatches} sample applications have mismatches')
    
    def validate_database_constraints(self):
        """Validate database constraints and indexes"""
        print("\n=== Validating Database Constraints ===")
        
        # Check primary key constraints
        self._check_primary_keys()
        
        # Check unique constraints
        self._check_unique_constraints()
        
        # Check not null constraints
        self._check_not_null_constraints()
    
    def _check_primary_keys(self):
        """Check primary key constraints"""
        tables_to_check = [
            ('internships', 'internships_skilltag'),
            ('internships', 'internships_internship'),
            ('applications', 'applications_application'),
            ('applications', 'applications_applicationdocument'),
            ('applications', 'applications_supervisorfeedback')
        ]
        
        for db_name, table_name in tables_to_check:
            cursor = self.connections[db_name].cursor()
            
            # Check for duplicate IDs
            cursor.execute(f"""
                SELECT id, COUNT(*) as count
                FROM {table_name}
                GROUP BY id
                HAVING COUNT(*) > 1
            """)
            duplicates = cursor.fetchall()
            
            if not duplicates:
                self.log_result(f'{table_name}_pk', 'PASS', 'Primary key constraint valid')
            else:
                self.log_result(f'{table_name}_pk', 'FAIL', f'{len(duplicates)} duplicate primary keys found')
    
    def _check_unique_constraints(self):
        """Check unique constraints"""
        # Check skill tag names are unique
        internship_cursor = self.connections['internships'].cursor()
        internship_cursor.execute("""
            SELECT name, COUNT(*) as count
            FROM internships_skilltag
            GROUP BY name
            HAVING COUNT(*) > 1
        """)
        duplicate_names = internship_cursor.fetchall()
        
        if not duplicate_names:
            self.log_result('skill_tag_names_unique', 'PASS', 'Skill tag names are unique')
        else:
            self.log_result('skill_tag_names_unique', 'WARNING', f'{len(duplicate_names)} duplicate skill tag names found')
    
    def _check_not_null_constraints(self):
        """Check not null constraints"""
        # Check required fields are not null
        checks = [
            ('internships', 'internships_internship', 'title', 'Internship titles'),
            ('internships', 'internships_internship', 'employer_id', 'Internship employer IDs'),
            ('applications', 'applications_application', 'student_id', 'Application student IDs'),
            ('applications', 'applications_application', 'internship_id', 'Application internship IDs'),
            ('applications', 'applications_application', 'status', 'Application statuses')
        ]
        
        for db_name, table_name, field_name, description in checks:
            cursor = self.connections[db_name].cursor()
            cursor.execute(f"SELECT COUNT(*) FROM {table_name} WHERE {field_name} IS NULL")
            null_count = cursor.fetchone()[0]
            
            if null_count == 0:
                self.log_result(f'{field_name}_not_null', 'PASS', f'{description} are not null')
            else:
                self.log_result(f'{field_name}_not_null', 'FAIL', f'{null_count} null {description} found')
    
    def generate_report(self):
        """Generate validation report"""
        print("\n" + "=" * 60)
        print("MIGRATION VALIDATION REPORT")
        print("=" * 60)
        
        total_tests = len(self.validation_results)
        passed_tests = len([r for r in self.validation_results if r['status'] == 'PASS'])
        failed_tests = len(self.errors)
        warning_tests = len(self.warnings)
        
        print(f"\nSUMMARY:")
        print(f"  Total Tests: {total_tests}")
        print(f"  Passed: {passed_tests} ({passed_tests/total_tests*100:.1f}%)")
        print(f"  Failed: {failed_tests} ({failed_tests/total_tests*100:.1f}%)")
        print(f"  Warnings: {warning_tests} ({warning_tests/total_tests*100:.1f}%)")
        
        if self.errors:
            print(f"\nFAILED TESTS:")
            for error in self.errors:
                print(f"  ✗ {error['test']}: {error['details']}")
        
        if self.warnings:
            print(f"\nWARNINGS:")
            for warning in self.warnings:
                print(f"  ⚠ {warning['test']}: {warning['details']}")
        
        # Save detailed report
        report_filename = f"validation_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        report_path = os.path.join(os.path.dirname(__file__), report_filename)
        
        report_data = {
            'summary': {
                'total_tests': total_tests,
                'passed': passed_tests,
                'failed': failed_tests,
                'warnings': warning_tests,
                'success_rate': passed_tests/total_tests*100
            },
            'results': self.validation_results,
            'errors': self.errors,
            'warnings': self.warnings
        }
        
        with open(report_path, 'w') as f:
            json.dump(report_data, f, indent=2, default=str)
        
        print(f"\n✓ Detailed report saved to {report_path}")
        
        return failed_tests == 0
    
    def run_validation(self):
        """Run the complete validation process"""
        print("Starting Edulink migration validation...")
        print("=" * 50)
        
        try:
            # Connect to databases
            self.connect_to_databases()
            
            # Run validation tests
            self.validate_record_counts()
            self.validate_data_integrity()
            self.validate_sample_data()
            self.validate_database_constraints()
            
            # Generate report
            success = self.generate_report()
            
            if success:
                print("\n✓ All validation tests passed!")
                return True
            else:
                print("\n✗ Some validation tests failed. Please review the report.")
                return False
            
        except Exception as e:
            print(f"\n✗ Validation failed: {e}")
            raise
        
        finally:
            self.close_connections()


def main():
    """Main validation function"""
    validator = MigrationValidator()
    success = validator.run_validation()
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()