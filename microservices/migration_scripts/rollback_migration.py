#!/usr/bin/env python
"""
Rollback script for Edulink microservices migration.
This script can rollback data migration and restore the monolithic database state.
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
import json
from datetime import datetime
from typing import Dict, List, Any

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

class MigrationRollback:
    def __init__(self):
        self.connections = {}
        self.rollback_log = []
        
    def connect_to_databases(self):
        """Establish connections to all databases"""
        for db_name, config in DATABASE_CONFIGS.items():
            try:
                conn = psycopg2.connect(**config)
                conn.autocommit = False
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
    
    def log_rollback(self, table: str, action: str, count: int, details: str = ""):
        """Log rollback actions"""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'table': table,
            'action': action,
            'count': count,
            'details': details
        }
        self.rollback_log.append(log_entry)
        print(f"[{log_entry['timestamp']}] {action} {count} records from {table} - {details}")
    
    def backup_microservice_data(self):
        """Create backup of microservice data before rollback"""
        print("\n=== Creating Backup of Microservice Data ===")
        
        backup_dir = os.path.join(os.path.dirname(__file__), 'backups')
        os.makedirs(backup_dir, exist_ok=True)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # Backup internship service data
        self._backup_table('internships', 'internships_skilltag', backup_dir, timestamp)
        self._backup_table('internships', 'internships_internship', backup_dir, timestamp)
        self._backup_table('internships', 'internships_internship_required_skills', backup_dir, timestamp)
        
        # Backup application service data
        self._backup_table('applications', 'applications_application', backup_dir, timestamp)
        self._backup_table('applications', 'applications_applicationdocument', backup_dir, timestamp)
        self._backup_table('applications', 'applications_supervisorfeedback', backup_dir, timestamp)
        
        print(f"✓ Backup completed in {backup_dir}")
    
    def _backup_table(self, db_name: str, table_name: str, backup_dir: str, timestamp: str):
        """Backup a specific table to JSON file"""
        cursor = self.connections[db_name].cursor(cursor_factory=RealDictCursor)
        cursor.execute(f"SELECT * FROM {table_name} ORDER BY id")
        data = cursor.fetchall()
        
        if data:
            backup_file = os.path.join(backup_dir, f"{table_name}_{timestamp}.json")
            with open(backup_file, 'w') as f:
                json.dump(data, f, indent=2, default=str)
            print(f"  ✓ Backed up {len(data)} records from {table_name}")
    
    def sync_back_to_monolith(self):
        """Sync any new data from microservices back to monolith"""
        print("\n=== Syncing Data Back to Monolith ===")
        
        # Sync internships back to monolith
        self._sync_internships_to_monolith()
        
        # Sync applications back to monolith
        self._sync_applications_to_monolith()
        
        print("✓ Data sync to monolith completed")
    
    def _sync_internships_to_monolith(self):
        """Sync internship data back to monolith"""
        # Read from internship service
        internship_cursor = self.connections['internships'].cursor(cursor_factory=RealDictCursor)
        internship_cursor.execute("""
            SELECT id, title, description, requirements, location, internship_type,
                   duration_months, stipend_amount, application_deadline, start_date,
                   end_date, is_active, is_featured, is_verified, verification_notes,
                   employer_id, created_at, updated_at, analytics_data
            FROM internships_internship
            WHERE updated_at > (SELECT COALESCE(MAX(updated_at), '1970-01-01') FROM internships_internship)
            ORDER BY id
        """)
        internships = internship_cursor.fetchall()
        
        if internships:
            # Write to monolith
            monolith_cursor = self.connections['monolith'].cursor()
            
            for internship in internships:
                monolith_cursor.execute("""
                    INSERT INTO internships_internship (
                        id, title, description, requirements, location, internship_type,
                        duration_months, stipend_amount, application_deadline, start_date,
                        end_date, is_active, is_featured, is_verified, verification_notes,
                        employer_id, created_at, updated_at, analytics_data
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                    ON CONFLICT (id) DO UPDATE SET
                        title = EXCLUDED.title,
                        description = EXCLUDED.description,
                        requirements = EXCLUDED.requirements,
                        location = EXCLUDED.location,
                        internship_type = EXCLUDED.internship_type,
                        duration_months = EXCLUDED.duration_months,
                        stipend_amount = EXCLUDED.stipend_amount,
                        application_deadline = EXCLUDED.application_deadline,
                        start_date = EXCLUDED.start_date,
                        end_date = EXCLUDED.end_date,
                        is_active = EXCLUDED.is_active,
                        is_featured = EXCLUDED.is_featured,
                        is_verified = EXCLUDED.is_verified,
                        verification_notes = EXCLUDED.verification_notes,
                        updated_at = EXCLUDED.updated_at,
                        analytics_data = EXCLUDED.analytics_data
                """, (
                    internship['id'], internship['title'], internship['description'],
                    internship['requirements'], internship['location'], internship['internship_type'],
                    internship['duration_months'], internship['stipend_amount'], 
                    internship['application_deadline'], internship['start_date'], internship['end_date'],
                    internship['is_active'], internship['is_featured'], internship['is_verified'],
                    internship['verification_notes'], internship['employer_id'],
                    internship['created_at'], internship['updated_at'], 
                    json.dumps(internship['analytics_data']) if internship['analytics_data'] else None
                ))
            
            self.connections['monolith'].commit()
            self.log_rollback('internships', 'SYNCED_TO_MONOLITH', len(internships), 'Updated internships synced back')
    
    def _sync_applications_to_monolith(self):
        """Sync application data back to monolith"""
        # Read from application service
        application_cursor = self.connections['applications'].cursor(cursor_factory=RealDictCursor)
        application_cursor.execute("""
            SELECT id, student_id, internship_id, status, cover_letter, resume_file,
                   custom_answers, priority_score, applied_at, interview_date,
                   interview_notes, created_at, updated_at
            FROM applications_application
            WHERE updated_at > (SELECT COALESCE(MAX(updated_at), '1970-01-01') FROM applications_application)
            ORDER BY id
        """)
        applications = application_cursor.fetchall()
        
        if applications:
            # Write to monolith
            monolith_cursor = self.connections['monolith'].cursor()
            
            for app in applications:
                monolith_cursor.execute("""
                    INSERT INTO applications_application (
                        id, student_id, internship_id, status, cover_letter, resume_file,
                        custom_answers, priority_score, applied_at, interview_date,
                        interview_notes, created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                    ON CONFLICT (id) DO UPDATE SET
                        status = EXCLUDED.status,
                        cover_letter = EXCLUDED.cover_letter,
                        resume_file = EXCLUDED.resume_file,
                        custom_answers = EXCLUDED.custom_answers,
                        priority_score = EXCLUDED.priority_score,
                        interview_date = EXCLUDED.interview_date,
                        interview_notes = EXCLUDED.interview_notes,
                        updated_at = EXCLUDED.updated_at
                """, (
                    app['id'], app['student_id'], app['internship_id'], app['status'],
                    app['cover_letter'], app['resume_file'], 
                    json.dumps(app['custom_answers']) if app['custom_answers'] else None,
                    app['priority_score'], app['applied_at'], app['interview_date'],
                    app['interview_notes'], app['created_at'], app['updated_at']
                ))
            
            self.connections['monolith'].commit()
            self.log_rollback('applications', 'SYNCED_TO_MONOLITH', len(applications), 'Updated applications synced back')
    
    def clear_microservice_databases(self):
        """Clear data from microservice databases"""
        print("\n=== Clearing Microservice Databases ===")
        
        # Clear application service
        application_cursor = self.connections['applications'].cursor()
        
        # Clear in reverse dependency order
        application_cursor.execute("DELETE FROM applications_supervisorfeedback")
        feedback_count = application_cursor.rowcount
        
        application_cursor.execute("DELETE FROM applications_applicationdocument")
        document_count = application_cursor.rowcount
        
        application_cursor.execute("DELETE FROM applications_application")
        application_count = application_cursor.rowcount
        
        self.connections['applications'].commit()
        
        self.log_rollback('supervisor_feedback', 'CLEARED', feedback_count, 'Cleared from application service')
        self.log_rollback('application_documents', 'CLEARED', document_count, 'Cleared from application service')
        self.log_rollback('applications', 'CLEARED', application_count, 'Cleared from application service')
        
        # Clear internship service
        internship_cursor = self.connections['internships'].cursor()
        
        # Clear in reverse dependency order
        internship_cursor.execute("DELETE FROM internships_internship_required_skills")
        skills_count = internship_cursor.rowcount
        
        internship_cursor.execute("DELETE FROM internships_internship")
        internship_count = internship_cursor.rowcount
        
        internship_cursor.execute("DELETE FROM internships_skilltag")
        tag_count = internship_cursor.rowcount
        
        self.connections['internships'].commit()
        
        self.log_rollback('internship_skills', 'CLEARED', skills_count, 'Cleared from internship service')
        self.log_rollback('internships', 'CLEARED', internship_count, 'Cleared from internship service')
        self.log_rollback('skill_tags', 'CLEARED', tag_count, 'Cleared from internship service')
    
    def reset_sequences(self):
        """Reset database sequences"""
        print("\n=== Resetting Database Sequences ===")
        
        # Reset internship service sequences
        internship_cursor = self.connections['internships'].cursor()
        internship_cursor.execute("ALTER SEQUENCE internships_skilltag_id_seq RESTART WITH 1")
        internship_cursor.execute("ALTER SEQUENCE internships_internship_id_seq RESTART WITH 1")
        self.connections['internships'].commit()
        
        # Reset application service sequences
        application_cursor = self.connections['applications'].cursor()
        application_cursor.execute("ALTER SEQUENCE applications_application_id_seq RESTART WITH 1")
        application_cursor.execute("ALTER SEQUENCE applications_applicationdocument_id_seq RESTART WITH 1")
        application_cursor.execute("ALTER SEQUENCE applications_supervisorfeedback_id_seq RESTART WITH 1")
        self.connections['applications'].commit()
        
        print("✓ Database sequences reset")
    
    def save_rollback_log(self):
        """Save rollback log to file"""
        log_filename = f"rollback_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        log_path = os.path.join(os.path.dirname(__file__), log_filename)
        
        with open(log_path, 'w') as f:
            json.dump(self.rollback_log, f, indent=2, default=str)
        
        print(f"\n✓ Rollback log saved to {log_path}")
    
    def run_rollback(self, backup_only=False):
        """Run the complete rollback process"""
        print("Starting Edulink migration rollback...")
        print("=" * 50)
        
        try:
            # Connect to databases
            self.connect_to_databases()
            
            # Create backup of current microservice data
            self.backup_microservice_data()
            
            if not backup_only:
                # Sync any new data back to monolith
                self.sync_back_to_monolith()
                
                # Clear microservice databases
                self.clear_microservice_databases()
                
                # Reset sequences
                self.reset_sequences()
            
            # Save log
            self.save_rollback_log()
            
            print("\n" + "=" * 50)
            if backup_only:
                print("✓ Backup completed successfully!")
            else:
                print("✓ Rollback completed successfully!")
            print(f"✓ Total operations: {len(self.rollback_log)}")
            
        except Exception as e:
            print(f"\n✗ Rollback failed: {e}")
            # Rollback all transactions
            for conn in self.connections.values():
                if conn:
                    conn.rollback()
            raise
        
        finally:
            self.close_connections()


def main():
    """Main rollback function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Rollback Edulink microservices migration')
    parser.add_argument('--backup-only', action='store_true', 
                       help='Only create backup without clearing microservice data')
    
    args = parser.parse_args()
    
    rollback = MigrationRollback()
    rollback.run_rollback(backup_only=args.backup_only)


if __name__ == '__main__':
    main()