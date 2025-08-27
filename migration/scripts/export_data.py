#!/usr/bin/env python3
"""
Data Export Script for Edulink Microservices Migration

This script exports data from the monolithic Edulink application
to prepare for migration to authentication and user microservices.

Usage:
    python export_data.py --config config.json --output-dir ./exports
"""

import os
import sys
import json
import argparse
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional

import psycopg2
import psycopg2.extras
from psycopg2.extensions import ISOLATION_LEVEL_READ_COMMITTED

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('migration_export.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


class DataExporter:
    """Handles data export from the monolithic database."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.db_config = config['source_database']
        self.output_dir = Path(config['output_directory'])
        self.batch_size = config.get('batch_size', 1000)
        self.connection = None
        
        # Create output directory
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize export statistics
        self.stats = {
            'start_time': datetime.now(),
            'tables_exported': 0,
            'total_records': 0,
            'errors': []
        }
    
    def connect(self) -> None:
        """Establish database connection."""
        try:
            self.connection = psycopg2.connect(
                host=self.db_config['host'],
                port=self.db_config['port'],
                database=self.db_config['database'],
                user=self.db_config['username'],
                password=self.db_config['password']
            )
            self.connection.set_isolation_level(ISOLATION_LEVEL_READ_COMMITTED)
            logger.info("Connected to source database")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise
    
    def disconnect(self) -> None:
        """Close database connection."""
        if self.connection:
            self.connection.close()
            logger.info("Disconnected from source database")
    
    def export_table(self, table_name: str, query: str, output_file: str) -> int:
        """Export data from a table using the provided query."""
        try:
            cursor = self.connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            # Execute query
            logger.info(f"Exporting {table_name}...")
            cursor.execute(query)
            
            # Get column names
            columns = [desc[0] for desc in cursor.description]
            
            # Export data in batches
            output_path = self.output_dir / output_file
            record_count = 0
            
            with open(output_path, 'w', encoding='utf-8') as f:
                # Write header
                f.write(json.dumps({
                    'table': table_name,
                    'exported_at': datetime.now().isoformat(),
                    'columns': columns,
                    'data': []
                }, indent=2)[:-3])  # Remove closing brackets
                
                # Write data in batches
                while True:
                    rows = cursor.fetchmany(self.batch_size)
                    if not rows:
                        break
                    
                    for row in rows:
                        # Convert row to dict and handle special types
                        row_dict = dict(row)
                        row_dict = self._serialize_row(row_dict)
                        
                        if record_count > 0:
                            f.write(',\n')
                        else:
                            f.write(',\n')
                        
                        f.write('    ' + json.dumps(row_dict, default=str))
                        record_count += 1
                
                # Close JSON structure
                f.write('\n  ]\n}')
            
            cursor.close()
            logger.info(f"Exported {record_count} records from {table_name}")
            return record_count
            
        except Exception as e:
            error_msg = f"Error exporting {table_name}: {e}"
            logger.error(error_msg)
            self.stats['errors'].append(error_msg)
            return 0
    
    def _serialize_row(self, row: Dict[str, Any]) -> Dict[str, Any]:
        """Serialize row data for JSON export."""
        serialized = {}
        for key, value in row.items():
            if value is None:
                serialized[key] = None
            elif isinstance(value, (datetime, )):
                serialized[key] = value.isoformat()
            elif isinstance(value, (list, dict)):
                serialized[key] = value
            else:
                serialized[key] = str(value) if not isinstance(value, (int, float, bool)) else value
        return serialized
    
    def export_auth_data(self) -> None:
        """Export authentication-related data."""
        logger.info("Starting authentication data export...")
        
        # Export users table
        users_query = """
        SELECT 
            id,
            username,
            email,
            password_hash,
            first_name,
            last_name,
            is_active,
            is_staff,
            is_superuser,
            date_joined,
            last_login,
            email_verified,
            phone,
            phone_verified,
            two_factor_enabled,
            backup_codes,
            failed_login_attempts,
            account_locked_until,
            password_changed_at,
            must_change_password,
            created_at,
            updated_at
        FROM auth_user
        ORDER BY id
        """
        
        count = self.export_table('users', users_query, 'auth_users.json')
        self.stats['total_records'] += count
        self.stats['tables_exported'] += 1
        
        # Export user permissions
        permissions_query = """
        SELECT 
            p.id,
            p.name,
            p.content_type_id,
            p.codename,
            ct.app_label,
            ct.model
        FROM auth_permission p
        JOIN django_content_type ct ON p.content_type_id = ct.id
        ORDER BY p.id
        """
        
        count = self.export_table('permissions', permissions_query, 'auth_permissions.json')
        self.stats['total_records'] += count
        self.stats['tables_exported'] += 1
        
        # Export user groups
        groups_query = """
        SELECT 
            id,
            name,
            description
        FROM auth_group
        ORDER BY id
        """
        
        count = self.export_table('groups', groups_query, 'auth_groups.json')
        self.stats['total_records'] += count
        self.stats['tables_exported'] += 1
        
        # Export user-group relationships
        user_groups_query = """
        SELECT 
            id,
            user_id,
            group_id
        FROM auth_user_groups
        ORDER BY user_id, group_id
        """
        
        count = self.export_table('user_groups', user_groups_query, 'auth_user_groups.json')
        self.stats['total_records'] += count
        self.stats['tables_exported'] += 1
        
        # Export user permissions
        user_permissions_query = """
        SELECT 
            id,
            user_id,
            permission_id
        FROM auth_user_user_permissions
        ORDER BY user_id, permission_id
        """
        
        count = self.export_table('user_permissions', user_permissions_query, 'auth_user_permissions.json')
        self.stats['total_records'] += count
        self.stats['tables_exported'] += 1
        
        # Export group permissions
        group_permissions_query = """
        SELECT 
            id,
            group_id,
            permission_id
        FROM auth_group_permissions
        ORDER BY group_id, permission_id
        """
        
        count = self.export_table('group_permissions', group_permissions_query, 'auth_group_permissions.json')
        self.stats['total_records'] += count
        self.stats['tables_exported'] += 1
        
        # Export login attempts (if exists)
        try:
            login_attempts_query = """
            SELECT 
                id,
                user_id,
                ip_address,
                user_agent,
                success,
                failure_reason,
                attempted_at
            FROM login_attempts
            WHERE attempted_at > NOW() - INTERVAL '90 days'
            ORDER BY attempted_at DESC
            """
            
            count = self.export_table('login_attempts', login_attempts_query, 'auth_login_attempts.json')
            self.stats['total_records'] += count
            self.stats['tables_exported'] += 1
        except Exception as e:
            logger.warning(f"Login attempts table not found or error: {e}")
        
        # Export OAuth applications (if exists)
        try:
            oauth_apps_query = """
            SELECT 
                id,
                name,
                client_id,
                client_secret,
                client_type,
                authorization_grant_type,
                skip_authorization,
                created,
                updated
            FROM oauth2_provider_application
            ORDER BY id
            """
            
            count = self.export_table('oauth_applications', oauth_apps_query, 'auth_oauth_applications.json')
            self.stats['total_records'] += count
            self.stats['tables_exported'] += 1
        except Exception as e:
            logger.warning(f"OAuth applications table not found or error: {e}")
    
    def export_user_data(self) -> None:
        """Export user profile and related data."""
        logger.info("Starting user data export...")
        
        # Export user profiles
        profiles_query = """
        SELECT 
            id,
            user_id,
            bio,
            avatar,
            cover_image,
            date_of_birth,
            gender,
            phone,
            address,
            city,
            state,
            country,
            postal_code,
            linkedin_url,
            github_url,
            twitter_url,
            website_url,
            is_public,
            created_at,
            updated_at
        FROM user_profile
        ORDER BY user_id
        """
        
        count = self.export_table('profiles', profiles_query, 'user_profiles.json')
        self.stats['total_records'] += count
        self.stats['tables_exported'] += 1
        
        # Export student profiles
        student_profiles_query = """
        SELECT 
            id,
            user_id,
            student_id,
            institution,
            program,
            major,
            minor,
            year_of_study,
            expected_graduation,
            gpa,
            skills,
            interests,
            resume_url,
            portfolio_url,
            is_seeking_internship,
            is_seeking_job,
            created_at,
            updated_at
        FROM student_profile
        ORDER BY user_id
        """
        
        count = self.export_table('student_profiles', student_profiles_query, 'user_student_profiles.json')
        self.stats['total_records'] += count
        self.stats['tables_exported'] += 1
        
        # Export company profiles
        company_profiles_query = """
        SELECT 
            id,
            user_id,
            company_name,
            industry,
            company_size,
            description,
            website_url,
            logo_url,
            headquarters,
            founded_year,
            is_verified,
            created_at,
            updated_at
        FROM company_profile
        ORDER BY user_id
        """
        
        count = self.export_table('company_profiles', company_profiles_query, 'user_company_profiles.json')
        self.stats['total_records'] += count
        self.stats['tables_exported'] += 1
        
        # Export user roles
        roles_query = """
        SELECT 
            id,
            user_id,
            role_type,
            institution_id,
            company_id,
            department,
            position,
            is_active,
            granted_at,
            expires_at,
            created_at,
            updated_at
        FROM user_role
        ORDER BY user_id, granted_at
        """
        
        count = self.export_table('roles', roles_query, 'user_roles.json')
        self.stats['total_records'] += count
        self.stats['tables_exported'] += 1
        
        # Export user connections
        connections_query = """
        SELECT 
            id,
            from_user_id,
            to_user_id,
            status,
            message,
            created_at,
            updated_at
        FROM user_connection
        ORDER BY created_at
        """
        
        count = self.export_table('connections', connections_query, 'user_connections.json')
        self.stats['total_records'] += count
        self.stats['tables_exported'] += 1
        
        # Export user activities
        activities_query = """
        SELECT 
            id,
            user_id,
            activity_type,
            title,
            description,
            metadata,
            created_at
        FROM user_activity
        WHERE created_at > NOW() - INTERVAL '1 year'
        ORDER BY created_at DESC
        """
        
        count = self.export_table('activities', activities_query, 'user_activities.json')
        self.stats['total_records'] += count
        self.stats['tables_exported'] += 1
    
    def export_reference_data(self) -> None:
        """Export reference data like skills, industries, etc."""
        logger.info("Starting reference data export...")
        
        # Export skills/tags
        try:
            skills_query = """
            SELECT 
                id,
                name,
                category,
                description,
                created_at
            FROM skill
            ORDER BY category, name
            """
            
            count = self.export_table('skills', skills_query, 'reference_skills.json')
            self.stats['total_records'] += count
            self.stats['tables_exported'] += 1
        except Exception as e:
            logger.warning(f"Skills table not found or error: {e}")
        
        # Export user skills
        try:
            user_skills_query = """
            SELECT 
                id,
                user_id,
                skill_id,
                proficiency_level,
                years_of_experience,
                created_at
            FROM user_skill
            ORDER BY user_id, skill_id
            """
            
            count = self.export_table('user_skills', user_skills_query, 'user_skills.json')
            self.stats['total_records'] += count
            self.stats['tables_exported'] += 1
        except Exception as e:
            logger.warning(f"User skills table not found or error: {e}")
    
    def create_export_manifest(self) -> None:
        """Create a manifest file with export metadata."""
        manifest = {
            'export_info': {
                'version': '1.0',
                'exported_at': datetime.now().isoformat(),
                'source_database': {
                    'host': self.db_config['host'],
                    'database': self.db_config['database']
                },
                'exporter_version': '1.0.0'
            },
            'statistics': {
                'start_time': self.stats['start_time'].isoformat(),
                'end_time': datetime.now().isoformat(),
                'duration_seconds': (datetime.now() - self.stats['start_time']).total_seconds(),
                'tables_exported': self.stats['tables_exported'],
                'total_records': self.stats['total_records'],
                'errors_count': len(self.stats['errors'])
            },
            'files': [
                f for f in os.listdir(self.output_dir) 
                if f.endswith('.json') and f != 'export_manifest.json'
            ],
            'errors': self.stats['errors']
        }
        
        manifest_path = self.output_dir / 'export_manifest.json'
        with open(manifest_path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2)
        
        logger.info(f"Export manifest created: {manifest_path}")
    
    def run_export(self) -> None:
        """Run the complete data export process."""
        try:
            logger.info("Starting data export process...")
            
            # Connect to database
            self.connect()
            
            # Export data by category
            self.export_auth_data()
            self.export_user_data()
            self.export_reference_data()
            
            # Create export manifest
            self.create_export_manifest()
            
            # Log completion
            duration = datetime.now() - self.stats['start_time']
            logger.info(f"Export completed successfully!")
            logger.info(f"Duration: {duration}")
            logger.info(f"Tables exported: {self.stats['tables_exported']}")
            logger.info(f"Total records: {self.stats['total_records']}")
            logger.info(f"Errors: {len(self.stats['errors'])}")
            
            if self.stats['errors']:
                logger.warning("Errors encountered during export:")
                for error in self.stats['errors']:
                    logger.warning(f"  - {error}")
            
        except Exception as e:
            logger.error(f"Export failed: {e}")
            raise
        finally:
            self.disconnect()


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
        description='Export data from Edulink monolith for microservices migration'
    )
    parser.add_argument(
        '--config', 
        required=True, 
        help='Configuration file path'
    )
    parser.add_argument(
        '--output-dir', 
        help='Output directory for exported data (overrides config)'
    )
    parser.add_argument(
        '--batch-size', 
        type=int, 
        default=1000, 
        help='Batch size for data export'
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
        
        # Override config with command line arguments
        if args.output_dir:
            config['output_directory'] = args.output_dir
        if args.batch_size:
            config['batch_size'] = args.batch_size
        
        # Validate required config
        required_keys = ['source_database', 'output_directory']
        for key in required_keys:
            if key not in config:
                raise ValueError(f"Missing required config key: {key}")
        
        # Run export
        exporter = DataExporter(config)
        exporter.run_export()
        
        logger.info("Data export completed successfully!")
        
    except Exception as e:
        logger.error(f"Export failed: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()