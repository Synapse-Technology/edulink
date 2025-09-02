#!/usr/bin/env python3
"""
Data Import Script for Edulink Microservices Migration

This script imports data from the exported JSON files into the
authentication and user microservice databases.

Usage:
    python import_data.py --config config.json --data-dir ./exports
"""

import os
import sys
import json
import argparse
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
import uuid

import psycopg2
import psycopg2.extras
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('migration_import.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


class DataImporter:
    """Handles data import into microservice databases."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.auth_db_config = config['auth_database']
        self.user_db_config = config['user_database']
        self.data_dir = Path(config['data_directory'])
        self.batch_size = config.get('batch_size', 1000)
        self.dry_run = config.get('dry_run', False)
        
        # Database connections
        self.auth_conn = None
        self.user_conn = None
        
        # Initialize import statistics
        self.stats = {
            'start_time': datetime.now(),
            'tables_imported': 0,
            'total_records': 0,
            'skipped_records': 0,
            'errors': [],
            'user_id_mapping': {},  # old_id -> new_uuid
            'permission_id_mapping': {},
            'group_id_mapping': {},
            'role_id_mapping': {}
        }
    
    def connect_databases(self) -> None:
        """Establish connections to both microservice databases."""
        try:
            # Connect to auth service database
            self.auth_conn = psycopg2.connect(
                host=self.auth_db_config['host'],
                port=self.auth_db_config['port'],
                database=self.auth_db_config['database'],
                user=self.auth_db_config['username'],
                password=self.auth_db_config['password']
            )
            self.auth_conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            logger.info("Connected to auth service database")
            
            # Connect to user service database
            self.user_conn = psycopg2.connect(
                host=self.user_db_config['host'],
                port=self.user_db_config['port'],
                database=self.user_db_config['database'],
                user=self.user_db_config['username'],
                password=self.user_db_config['password']
            )
            self.user_conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            logger.info("Connected to user service database")
            
        except Exception as e:
            logger.error(f"Failed to connect to databases: {e}")
            raise
    
    def disconnect_databases(self) -> None:
        """Close database connections."""
        if self.auth_conn:
            self.auth_conn.close()
            logger.info("Disconnected from auth service database")
        if self.user_conn:
            self.user_conn.close()
            logger.info("Disconnected from user service database")
    
    def load_json_data(self, filename: str) -> Dict[str, Any]:
        """Load data from JSON export file."""
        file_path = self.data_dir / filename
        if not file_path.exists():
            logger.warning(f"File not found: {filename}")
            return {'data': []}
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load {filename}: {e}")
            return {'data': []}
    
    def generate_uuid_mapping(self, old_ids: List[int]) -> Dict[int, str]:
        """Generate UUID mappings for old integer IDs."""
        return {old_id: str(uuid.uuid4()) for old_id in old_ids}
    
    def import_auth_users(self) -> None:
        """Import users into auth service database."""
        logger.info("Importing users into auth service...")
        
        data = self.load_json_data('auth_users.json')
        users = data.get('data', [])
        
        if not users:
            logger.warning("No users found to import")
            return
        
        # Generate UUID mappings for user IDs
        old_user_ids = [user['id'] for user in users]
        self.stats['user_id_mapping'] = self.generate_uuid_mapping(old_user_ids)
        
        cursor = self.auth_conn.cursor()
        imported_count = 0
        
        try:
            for user in users:
                try:
                    new_user_id = self.stats['user_id_mapping'][user['id']]
                    
                    # Prepare user data
                    insert_query = """
                    INSERT INTO auth_service.users (
                        id, username, email, password_hash, first_name, last_name,
                        is_active, is_staff, is_superuser, date_joined, last_login,
                        email_verified, phone, phone_verified, two_factor_enabled,
                        failed_login_attempts, account_locked_until, password_changed_at,
                        must_change_password, created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    ) ON CONFLICT (id) DO NOTHING
                    """
                    
                    values = (
                        new_user_id,
                        user.get('username'),
                        user.get('email'),
                        user.get('password_hash'),
                        user.get('first_name'),
                        user.get('last_name'),
                        user.get('is_active', True),
                        user.get('is_staff', False),
                        user.get('is_superuser', False),
                        user.get('date_joined'),
                        user.get('last_login'),
                        user.get('email_verified', False),
                        user.get('phone'),
                        user.get('phone_verified', False),
                        user.get('two_factor_enabled', False),
                        user.get('failed_login_attempts', 0),
                        user.get('account_locked_until'),
                        user.get('password_changed_at'),
                        user.get('must_change_password', False),
                        user.get('created_at', datetime.now()),
                        user.get('updated_at', datetime.now())
                    )
                    
                    if not self.dry_run:
                        cursor.execute(insert_query, values)
                    
                    imported_count += 1
                    
                    if imported_count % self.batch_size == 0:
                        logger.info(f"Imported {imported_count} users...")
                
                except Exception as e:
                    error_msg = f"Error importing user {user.get('id', 'unknown')}: {e}"
                    logger.error(error_msg)
                    self.stats['errors'].append(error_msg)
                    self.stats['skipped_records'] += 1
            
            self.stats['total_records'] += imported_count
            self.stats['tables_imported'] += 1
            logger.info(f"Successfully imported {imported_count} users")
            
        finally:
            cursor.close()
    
    def import_auth_permissions(self) -> None:
        """Import permissions into auth service database."""
        logger.info("Importing permissions into auth service...")
        
        data = self.load_json_data('auth_permissions.json')
        permissions = data.get('data', [])
        
        if not permissions:
            logger.warning("No permissions found to import")
            return
        
        # Generate UUID mappings for permission IDs
        old_permission_ids = [perm['id'] for perm in permissions]
        self.stats['permission_id_mapping'] = self.generate_uuid_mapping(old_permission_ids)
        
        cursor = self.auth_conn.cursor()
        imported_count = 0
        
        try:
            for permission in permissions:
                try:
                    new_permission_id = self.stats['permission_id_mapping'][permission['id']]
                    
                    insert_query = """
                    INSERT INTO auth_service.permissions (
                        id, name, codename, content_type, description
                    ) VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (codename) DO NOTHING
                    """
                    
                    # Create content type from app_label and model
                    content_type = f"{permission.get('app_label', '')}.{permission.get('model', '')}"
                    
                    values = (
                        new_permission_id,
                        permission.get('name'),
                        permission.get('codename'),
                        content_type,
                        f"Permission for {permission.get('name', '')}"
                    )
                    
                    if not self.dry_run:
                        cursor.execute(insert_query, values)
                    
                    imported_count += 1
                
                except Exception as e:
                    error_msg = f"Error importing permission {permission.get('id', 'unknown')}: {e}"
                    logger.error(error_msg)
                    self.stats['errors'].append(error_msg)
                    self.stats['skipped_records'] += 1
            
            self.stats['total_records'] += imported_count
            self.stats['tables_imported'] += 1
            logger.info(f"Successfully imported {imported_count} permissions")
            
        finally:
            cursor.close()
    
    def import_auth_groups(self) -> None:
        """Import groups into auth service database."""
        logger.info("Importing groups into auth service...")
        
        data = self.load_json_data('auth_groups.json')
        groups = data.get('data', [])
        
        if not groups:
            logger.warning("No groups found to import")
            return
        
        # Generate UUID mappings for group IDs
        old_group_ids = [group['id'] for group in groups]
        self.stats['group_id_mapping'] = self.generate_uuid_mapping(old_group_ids)
        
        cursor = self.auth_conn.cursor()
        imported_count = 0
        
        try:
            for group in groups:
                try:
                    new_group_id = self.stats['group_id_mapping'][group['id']]
                    
                    insert_query = """
                    INSERT INTO auth_service.groups (
                        id, name, description, is_system_group
                    ) VALUES (%s, %s, %s, %s)
                    ON CONFLICT (name) DO NOTHING
                    """
                    
                    values = (
                        new_group_id,
                        group.get('name'),
                        group.get('description', ''),
                        False  # Assume imported groups are not system groups
                    )
                    
                    if not self.dry_run:
                        cursor.execute(insert_query, values)
                    
                    imported_count += 1
                
                except Exception as e:
                    error_msg = f"Error importing group {group.get('id', 'unknown')}: {e}"
                    logger.error(error_msg)
                    self.stats['errors'].append(error_msg)
                    self.stats['skipped_records'] += 1
            
            self.stats['total_records'] += imported_count
            self.stats['tables_imported'] += 1
            logger.info(f"Successfully imported {imported_count} groups")
            
        finally:
            cursor.close()
    
    def import_user_profiles(self) -> None:
        """Import user profiles into user service database."""
        logger.info("Importing user profiles into user service...")
        
        data = self.load_json_data('user_profiles.json')
        profiles = data.get('data', [])
        
        if not profiles:
            logger.warning("No user profiles found to import")
            return
        
        cursor = self.user_conn.cursor()
        imported_count = 0
        
        try:
            for profile in profiles:
                try:
                    # Map old user ID to new UUID
                    old_user_id = profile.get('user_id')
                    if old_user_id not in self.stats['user_id_mapping']:
                        logger.warning(f"User ID {old_user_id} not found in mapping, skipping profile")
                        self.stats['skipped_records'] += 1
                        continue
                    
                    new_user_id = self.stats['user_id_mapping'][old_user_id]
                    
                    insert_query = """
                    INSERT INTO user_service.profiles (
                        id, user_id, first_name, last_name, phone, date_of_birth,
                        gender, address, city, state_province, country, postal_code,
                        bio, avatar_url, linkedin_url, github_url, twitter_url,
                        website_url, profile_type, is_public, created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    ) ON CONFLICT (user_id) DO NOTHING
                    """
                    
                    # Determine profile type based on related data
                    profile_type = 'student'  # Default, will be updated based on related profiles
                    
                    values = (
                        str(uuid.uuid4()),  # New profile ID
                        new_user_id,
                        profile.get('first_name'),
                        profile.get('last_name'),
                        profile.get('phone'),
                        profile.get('date_of_birth'),
                        profile.get('gender'),
                        profile.get('address'),
                        profile.get('city'),
                        profile.get('state'),
                        profile.get('country'),
                        profile.get('postal_code'),
                        profile.get('bio'),
                        profile.get('avatar'),
                        profile.get('linkedin_url'),
                        profile.get('github_url'),
                        profile.get('twitter_url'),
                        profile.get('website_url'),
                        profile_type,
                        profile.get('is_public', True),
                        profile.get('created_at', datetime.now()),
                        profile.get('updated_at', datetime.now())
                    )
                    
                    if not self.dry_run:
                        cursor.execute(insert_query, values)
                    
                    imported_count += 1
                    
                    if imported_count % self.batch_size == 0:
                        logger.info(f"Imported {imported_count} profiles...")
                
                except Exception as e:
                    error_msg = f"Error importing profile for user {profile.get('user_id', 'unknown')}: {e}"
                    logger.error(error_msg)
                    self.stats['errors'].append(error_msg)
                    self.stats['skipped_records'] += 1
            
            self.stats['total_records'] += imported_count
            self.stats['tables_imported'] += 1
            logger.info(f"Successfully imported {imported_count} user profiles")
            
        finally:
            cursor.close()
    
    def import_student_profiles(self) -> None:
        """Import student profiles into user service database."""
        logger.info("Importing student profiles into user service...")
        
        data = self.load_json_data('user_student_profiles.json')
        student_profiles = data.get('data', [])
        
        if not student_profiles:
            logger.warning("No student profiles found to import")
            return
        
        cursor = self.user_conn.cursor()
        imported_count = 0
        
        try:
            for student_profile in student_profiles:
                try:
                    # Map old user ID to new UUID
                    old_user_id = student_profile.get('user_id')
                    if old_user_id not in self.stats['user_id_mapping']:
                        logger.warning(f"User ID {old_user_id} not found in mapping, skipping student profile")
                        self.stats['skipped_records'] += 1
                        continue
                    
                    new_user_id = self.stats['user_id_mapping'][old_user_id]
                    
                    # Update profile type to student
                    if not self.dry_run:
                        cursor.execute(
                            "UPDATE user_service.profiles SET profile_type = 'student' WHERE user_id = %s",
                            (new_user_id,)
                        )
                    
                    insert_query = """
                    INSERT INTO user_service.student_profiles (
                        id, user_id, student_id, program, major, minor,
                        year_of_study, expected_graduation, current_gpa,
                        skills, interests, resume_url, portfolio_url,
                        is_seeking_internship, is_seeking_job, created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    ) ON CONFLICT (user_id) DO NOTHING
                    """
                    
                    # Convert skills and interests to JSONB format
                    skills = student_profile.get('skills', [])
                    if isinstance(skills, str):
                        try:
                            skills = json.loads(skills)
                        except:
                            skills = []
                    
                    interests = student_profile.get('interests', [])
                    if isinstance(interests, str):
                        try:
                            interests = json.loads(interests)
                        except:
                            interests = []
                    
                    values = (
                        str(uuid.uuid4()),  # New student profile ID
                        new_user_id,
                        student_profile.get('student_id'),
                        student_profile.get('program'),
                        student_profile.get('major'),
                        student_profile.get('minor'),
                        student_profile.get('year_of_study'),
                        student_profile.get('expected_graduation'),
                        student_profile.get('gpa'),
                        json.dumps(skills),
                        json.dumps(interests),
                        student_profile.get('resume_url'),
                        student_profile.get('portfolio_url'),
                        student_profile.get('is_seeking_internship', False),
                        student_profile.get('is_seeking_job', False),
                        student_profile.get('created_at', datetime.now()),
                        student_profile.get('updated_at', datetime.now())
                    )
                    
                    if not self.dry_run:
                        cursor.execute(insert_query, values)
                    
                    imported_count += 1
                
                except Exception as e:
                    error_msg = f"Error importing student profile for user {student_profile.get('user_id', 'unknown')}: {e}"
                    logger.error(error_msg)
                    self.stats['errors'].append(error_msg)
                    self.stats['skipped_records'] += 1
            
            self.stats['total_records'] += imported_count
            self.stats['tables_imported'] += 1
            logger.info(f"Successfully imported {imported_count} student profiles")
            
        finally:
            cursor.close()
    
    def import_company_profiles(self) -> None:
        """Import company profiles into user service database."""
        logger.info("Importing company profiles into user service...")
        
        data = self.load_json_data('user_company_profiles.json')
        company_profiles = data.get('data', [])
        
        if not company_profiles:
            logger.warning("No company profiles found to import")
            return
        
        cursor = self.user_conn.cursor()
        imported_count = 0
        
        try:
            for company_profile in company_profiles:
                try:
                    # Map old user ID to new UUID
                    old_user_id = company_profile.get('user_id')
                    if old_user_id not in self.stats['user_id_mapping']:
                        logger.warning(f"User ID {old_user_id} not found in mapping, skipping company profile")
                        self.stats['skipped_records'] += 1
                        continue
                    
                    new_user_id = self.stats['user_id_mapping'][old_user_id]
                    
                    # Update profile type to company
                    if not self.dry_run:
                        cursor.execute(
                            "UPDATE user_service.profiles SET profile_type = 'company' WHERE user_id = %s",
                            (new_user_id,)
                        )
                    
                    insert_query = """
                    INSERT INTO user_service.company_profiles (
                        id, user_id, company_name, industry, company_size,
                        founded_year, description, website_url, logo_url,
                        headquarters, is_verified, created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    ) ON CONFLICT (user_id) DO NOTHING
                    """
                    
                    values = (
                        str(uuid.uuid4()),  # New company profile ID
                        new_user_id,
                        company_profile.get('company_name'),
                        company_profile.get('industry'),
                        company_profile.get('company_size'),
                        company_profile.get('founded_year'),
                        company_profile.get('description'),
                        company_profile.get('website_url'),
                        company_profile.get('logo_url'),
                        company_profile.get('headquarters'),
                        company_profile.get('is_verified', False),
                        company_profile.get('created_at', datetime.now()),
                        company_profile.get('updated_at', datetime.now())
                    )
                    
                    if not self.dry_run:
                        cursor.execute(insert_query, values)
                    
                    imported_count += 1
                
                except Exception as e:
                    error_msg = f"Error importing company profile for user {company_profile.get('user_id', 'unknown')}: {e}"
                    logger.error(error_msg)
                    self.stats['errors'].append(error_msg)
                    self.stats['skipped_records'] += 1
            
            self.stats['total_records'] += imported_count
            self.stats['tables_imported'] += 1
            logger.info(f"Successfully imported {imported_count} company profiles")
            
        finally:
            cursor.close()
    
    def import_user_roles(self) -> None:
        """Import user roles into user service database."""
        logger.info("Importing user roles into user service...")
        
        data = self.load_json_data('user_roles.json')
        roles = data.get('data', [])
        
        if not roles:
            logger.warning("No user roles found to import")
            return
        
        cursor = self.user_conn.cursor()
        imported_count = 0
        
        try:
            for role in roles:
                try:
                    # Map old user ID to new UUID
                    old_user_id = role.get('user_id')
                    if old_user_id not in self.stats['user_id_mapping']:
                        logger.warning(f"User ID {old_user_id} not found in mapping, skipping role")
                        self.stats['skipped_records'] += 1
                        continue
                    
                    new_user_id = self.stats['user_id_mapping'][old_user_id]
                    
                    insert_query = """
                    INSERT INTO user_service.roles (
                        id, user_id, role_type, institution_id, company_id,
                        department, position_title, is_active, granted_at,
                        expires_at, created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                    """
                    
                    values = (
                        str(uuid.uuid4()),  # New role ID
                        new_user_id,
                        role.get('role_type', 'student'),
                        role.get('institution_id'),
                        role.get('company_id'),
                        role.get('department'),
                        role.get('position'),
                        role.get('is_active', True),
                        role.get('granted_at', datetime.now()),
                        role.get('expires_at'),
                        role.get('created_at', datetime.now()),
                        role.get('updated_at', datetime.now())
                    )
                    
                    if not self.dry_run:
                        cursor.execute(insert_query, values)
                    
                    imported_count += 1
                
                except Exception as e:
                    error_msg = f"Error importing role for user {role.get('user_id', 'unknown')}: {e}"
                    logger.error(error_msg)
                    self.stats['errors'].append(error_msg)
                    self.stats['skipped_records'] += 1
            
            self.stats['total_records'] += imported_count
            self.stats['tables_imported'] += 1
            logger.info(f"Successfully imported {imported_count} user roles")
            
        finally:
            cursor.close()
    
    def create_import_manifest(self) -> None:
        """Create a manifest file with import metadata."""
        manifest = {
            'import_info': {
                'version': '1.0',
                'imported_at': datetime.now().isoformat(),
                'target_databases': {
                    'auth_service': {
                        'host': self.auth_db_config['host'],
                        'database': self.auth_db_config['database']
                    },
                    'user_service': {
                        'host': self.user_db_config['host'],
                        'database': self.user_db_config['database']
                    }
                },
                'importer_version': '1.0.0',
                'dry_run': self.dry_run
            },
            'statistics': {
                'start_time': self.stats['start_time'].isoformat(),
                'end_time': datetime.now().isoformat(),
                'duration_seconds': (datetime.now() - self.stats['start_time']).total_seconds(),
                'tables_imported': self.stats['tables_imported'],
                'total_records': self.stats['total_records'],
                'skipped_records': self.stats['skipped_records'],
                'errors_count': len(self.stats['errors'])
            },
            'id_mappings': {
                'users_mapped': len(self.stats['user_id_mapping']),
                'permissions_mapped': len(self.stats['permission_id_mapping']),
                'groups_mapped': len(self.stats['group_id_mapping'])
            },
            'errors': self.stats['errors']
        }
        
        manifest_path = self.data_dir / 'import_manifest.json'
        with open(manifest_path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2)
        
        logger.info(f"Import manifest created: {manifest_path}")
    
    def run_import(self) -> None:
        """Run the complete data import process."""
        try:
            logger.info("Starting data import process...")
            
            if self.dry_run:
                logger.info("Running in DRY RUN mode - no data will be written")
            
            # Connect to databases
            self.connect_databases()
            
            # Import auth service data
            self.import_auth_users()
            self.import_auth_permissions()
            self.import_auth_groups()
            
            # Import user service data
            self.import_user_profiles()
            self.import_student_profiles()
            self.import_company_profiles()
            self.import_user_roles()
            
            # Create import manifest
            self.create_import_manifest()
            
            # Log completion
            duration = datetime.now() - self.stats['start_time']
            logger.info(f"Import completed successfully!")
            logger.info(f"Duration: {duration}")
            logger.info(f"Tables imported: {self.stats['tables_imported']}")
            logger.info(f"Total records: {self.stats['total_records']}")
            logger.info(f"Skipped records: {self.stats['skipped_records']}")
            logger.info(f"Errors: {len(self.stats['errors'])}")
            
            if self.stats['errors']:
                logger.warning("Errors encountered during import:")
                for error in self.stats['errors']:
                    logger.warning(f"  - {error}")
            
        except Exception as e:
            logger.error(f"Import failed: {e}")
            raise
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
        description='Import data into Edulink microservices from exported data'
    )
    parser.add_argument(
        '--config', 
        required=True, 
        help='Configuration file path'
    )
    parser.add_argument(
        '--data-dir', 
        help='Data directory with exported JSON files (overrides config)'
    )
    parser.add_argument(
        '--batch-size', 
        type=int, 
        default=1000, 
        help='Batch size for data import'
    )
    parser.add_argument(
        '--dry-run', 
        action='store_true', 
        help='Run without actually importing data'
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
        if args.data_dir:
            config['data_directory'] = args.data_dir
        if args.batch_size:
            config['batch_size'] = args.batch_size
        if args.dry_run:
            config['dry_run'] = True
        
        # Validate required config
        required_keys = ['auth_database', 'user_database', 'data_directory']
        for key in required_keys:
            if key not in config:
                raise ValueError(f"Missing required config key: {key}")
        
        # Run import
        importer = DataImporter(config)
        importer.run_import()
        
        logger.info("Data import completed successfully!")
        
    except Exception as e:
        logger.error(f"Import failed: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()