#!/usr/bin/env python
"""
Data migration script for Edulink microservices architecture.
This script migrates data from the monolithic database to separate microservice databases.
"""

import os
import sys
import django
import psycopg2
from psycopg2.extras import RealDictCursor
import json
from datetime import datetime
from typing import Dict, List, Any

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

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

class DataMigrator:
    def __init__(self):
        self.connections = {}
        self.migration_log = []
        
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
    
    def log_migration(self, table: str, action: str, count: int, details: str = ""):
        """Log migration actions"""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'table': table,
            'action': action,
            'count': count,
            'details': details
        }
        self.migration_log.append(log_entry)
        print(f"[{log_entry['timestamp']}] {action} {count} records from {table} - {details}")
    
    def migrate_skill_tags(self):
        """Migrate skill tags from monolith to internship service"""
        print("\n=== Migrating Skill Tags ===")
        
        # Read from monolith
        monolith_cursor = self.connections['monolith'].cursor(cursor_factory=RealDictCursor)
        monolith_cursor.execute("""
            SELECT id, name, category, description, created_at, updated_at
            FROM internships_skilltag
            ORDER BY id
        """)
        skill_tags = monolith_cursor.fetchall()
        
        if not skill_tags:
            print("No skill tags found to migrate")
            return
        
        # Write to internship service
        internship_cursor = self.connections['internships'].cursor()
        
        for tag in skill_tags:
            internship_cursor.execute("""
                INSERT INTO internships_skilltag (id, name, category, description, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    category = EXCLUDED.category,
                    description = EXCLUDED.description,
                    updated_at = EXCLUDED.updated_at
            """, (
                tag['id'], tag['name'], tag['category'], 
                tag['description'], tag['created_at'], tag['updated_at']
            ))
        
        self.connections['internships'].commit()
        self.log_migration('skill_tags', 'MIGRATED', len(skill_tags), 'All skill tags migrated successfully')
    
    def migrate_internships(self):
        """Migrate internships from monolith to internship service"""
        print("\n=== Migrating Internships ===")
        
        # Read from monolith
        monolith_cursor = self.connections['monolith'].cursor(cursor_factory=RealDictCursor)
        monolith_cursor.execute("""
            SELECT id, title, description, requirements, location, internship_type,
                   duration_months, stipend_amount, application_deadline, start_date,
                   end_date, is_active, is_featured, is_verified, verification_notes,
                   employer_id, created_at, updated_at, analytics_data
            FROM internships_internship
            ORDER BY id
        """)
        internships = monolith_cursor.fetchall()
        
        if not internships:
            print("No internships found to migrate")
            return
        
        # Write to internship service
        internship_cursor = self.connections['internships'].cursor()
        
        for internship in internships:
            internship_cursor.execute("""
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
        
        self.connections['internships'].commit()
        self.log_migration('internships', 'MIGRATED', len(internships), 'All internships migrated successfully')
    
    def migrate_internship_skills(self):
        """Migrate internship-skill relationships"""
        print("\n=== Migrating Internship-Skill Relationships ===")
        
        # Read from monolith
        monolith_cursor = self.connections['monolith'].cursor(cursor_factory=RealDictCursor)
        monolith_cursor.execute("""
            SELECT internship_id, skilltag_id
            FROM internships_internship_required_skills
            ORDER BY internship_id, skilltag_id
        """)
        relationships = monolith_cursor.fetchall()
        
        if not relationships:
            print("No internship-skill relationships found to migrate")
            return
        
        # Write to internship service
        internship_cursor = self.connections['internships'].cursor()
        
        for rel in relationships:
            internship_cursor.execute("""
                INSERT INTO internships_internship_required_skills (internship_id, skilltag_id)
                VALUES (%s, %s)
                ON CONFLICT (internship_id, skilltag_id) DO NOTHING
            """, (rel['internship_id'], rel['skilltag_id']))
        
        self.connections['internships'].commit()
        self.log_migration('internship_skills', 'MIGRATED', len(relationships), 'All relationships migrated successfully')
    
    def migrate_applications(self):
        """Migrate applications from monolith to application service"""
        print("\n=== Migrating Applications ===")
        
        # Read from monolith
        monolith_cursor = self.connections['monolith'].cursor(cursor_factory=RealDictCursor)
        monolith_cursor.execute("""
            SELECT id, student_id, internship_id, status, cover_letter, resume_file,
                   custom_answers, priority_score, applied_at, interview_date,
                   interview_notes, created_at, updated_at
            FROM applications_application
            ORDER BY id
        """)
        applications = monolith_cursor.fetchall()
        
        if not applications:
            print("No applications found to migrate")
            return
        
        # Write to application service
        application_cursor = self.connections['applications'].cursor()
        
        for app in applications:
            application_cursor.execute("""
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
        
        self.connections['applications'].commit()
        self.log_migration('applications', 'MIGRATED', len(applications), 'All applications migrated successfully')
    
    def migrate_application_documents(self):
        """Migrate application documents"""
        print("\n=== Migrating Application Documents ===")
        
        # Read from monolith
        monolith_cursor = self.connections['monolith'].cursor(cursor_factory=RealDictCursor)
        monolith_cursor.execute("""
            SELECT id, application_id, document_type, file_path, file_name,
                   file_size, uploaded_at, is_verified
            FROM applications_applicationdocument
            ORDER BY id
        """)
        documents = monolith_cursor.fetchall()
        
        if not documents:
            print("No application documents found to migrate")
            return
        
        # Write to application service
        application_cursor = self.connections['applications'].cursor()
        
        for doc in documents:
            application_cursor.execute("""
                INSERT INTO applications_applicationdocument (
                    id, application_id, document_type, file_path, file_name,
                    file_size, uploaded_at, is_verified
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    document_type = EXCLUDED.document_type,
                    file_path = EXCLUDED.file_path,
                    file_name = EXCLUDED.file_name,
                    file_size = EXCLUDED.file_size,
                    is_verified = EXCLUDED.is_verified
            """, (
                doc['id'], doc['application_id'], doc['document_type'],
                doc['file_path'], doc['file_name'], doc['file_size'],
                doc['uploaded_at'], doc['is_verified']
            ))
        
        self.connections['applications'].commit()
        self.log_migration('application_documents', 'MIGRATED', len(documents), 'All documents migrated successfully')
    
    def migrate_supervisor_feedback(self):
        """Migrate supervisor feedback"""
        print("\n=== Migrating Supervisor Feedback ===")
        
        # Read from monolith
        monolith_cursor = self.connections['monolith'].cursor(cursor_factory=RealDictCursor)
        monolith_cursor.execute("""
            SELECT id, application_id, supervisor_id, overall_rating, technical_skills_rating,
                   communication_rating, professionalism_rating, teamwork_rating,
                   problem_solving_rating, recommendation, detailed_feedback, created_at
            FROM applications_supervisorfeedback
            ORDER BY id
        """)
        feedback_records = monolith_cursor.fetchall()
        
        if not feedback_records:
            print("No supervisor feedback found to migrate")
            return
        
        # Write to application service
        application_cursor = self.connections['applications'].cursor()
        
        for feedback in feedback_records:
            application_cursor.execute("""
                INSERT INTO applications_supervisorfeedback (
                    id, application_id, supervisor_id, overall_rating, technical_skills_rating,
                    communication_rating, professionalism_rating, teamwork_rating,
                    problem_solving_rating, recommendation, detailed_feedback, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    overall_rating = EXCLUDED.overall_rating,
                    technical_skills_rating = EXCLUDED.technical_skills_rating,
                    communication_rating = EXCLUDED.communication_rating,
                    professionalism_rating = EXCLUDED.professionalism_rating,
                    teamwork_rating = EXCLUDED.teamwork_rating,
                    problem_solving_rating = EXCLUDED.problem_solving_rating,
                    recommendation = EXCLUDED.recommendation,
                    detailed_feedback = EXCLUDED.detailed_feedback
            """, (
                feedback['id'], feedback['application_id'], feedback['supervisor_id'],
                feedback['overall_rating'], feedback['technical_skills_rating'],
                feedback['communication_rating'], feedback['professionalism_rating'],
                feedback['teamwork_rating'], feedback['problem_solving_rating'],
                feedback['recommendation'], feedback['detailed_feedback'], feedback['created_at']
            ))
        
        self.connections['applications'].commit()
        self.log_migration('supervisor_feedback', 'MIGRATED', len(feedback_records), 'All feedback migrated successfully')
    
    def update_sequences(self):
        """Update database sequences to prevent ID conflicts"""
        print("\n=== Updating Database Sequences ===")
        
        # Update internship service sequences
        internship_cursor = self.connections['internships'].cursor()
        
        # Update skill tag sequence
        internship_cursor.execute("SELECT setval('internships_skilltag_id_seq', (SELECT MAX(id) FROM internships_skilltag))")
        
        # Update internship sequence
        internship_cursor.execute("SELECT setval('internships_internship_id_seq', (SELECT MAX(id) FROM internships_internship))")
        
        self.connections['internships'].commit()
        
        # Update application service sequences
        application_cursor = self.connections['applications'].cursor()
        
        # Update application sequence
        application_cursor.execute("SELECT setval('applications_application_id_seq', (SELECT MAX(id) FROM applications_application))")
        
        # Update document sequence
        application_cursor.execute("SELECT setval('applications_applicationdocument_id_seq', (SELECT MAX(id) FROM applications_applicationdocument))")
        
        # Update feedback sequence
        application_cursor.execute("SELECT setval('applications_supervisorfeedback_id_seq', (SELECT MAX(id) FROM applications_supervisorfeedback))")
        
        self.connections['applications'].commit()
        
        print("✓ Database sequences updated")
    
    def save_migration_log(self):
        """Save migration log to file"""
        log_filename = f"migration_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        log_path = os.path.join(os.path.dirname(__file__), log_filename)
        
        with open(log_path, 'w') as f:
            json.dump(self.migration_log, f, indent=2, default=str)
        
        print(f"\n✓ Migration log saved to {log_path}")
    
    def run_migration(self):
        """Run the complete migration process"""
        print("Starting Edulink data migration...")
        print("=" * 50)
        
        try:
            # Connect to databases
            self.connect_to_databases()
            
            # Run migrations in order
            self.migrate_skill_tags()
            self.migrate_internships()
            self.migrate_internship_skills()
            self.migrate_applications()
            self.migrate_application_documents()
            self.migrate_supervisor_feedback()
            
            # Update sequences
            self.update_sequences()
            
            # Save log
            self.save_migration_log()
            
            print("\n" + "=" * 50)
            print("✓ Migration completed successfully!")
            print(f"✓ Total operations: {len(self.migration_log)}")
            
        except Exception as e:
            print(f"\n✗ Migration failed: {e}")
            # Rollback all transactions
            for conn in self.connections.values():
                if conn:
                    conn.rollback()
            raise
        
        finally:
            self.close_connections()


def main():
    """Main migration function"""
    migrator = DataMigrator()
    migrator.run_migration()


if __name__ == '__main__':
    main()