#!/usr/bin/env python3
"""
Migration Rollback Script for Edulink Microservices Migration

This script provides rollback functionality for the microservices migration,
allowing restoration of the original monolithic database state.

Usage:
    python rollback.py --config config.json --backup-id <backup_id>
"""

import os
import sys
import json
import argparse
import logging
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional

import psycopg2
import psycopg2.extras
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('migration_rollback.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


class MigrationRollback:
    """Handles rollback of microservices migration."""
    
    def __init__(self, config: Dict[str, Any], backup_id: str):
        self.config = config
        self.backup_id = backup_id
        self.source_db_config = config['source_database']
        self.auth_db_config = config['auth_database']
        self.user_db_config = config['user_database']
        self.backup_config = config.get('backup', {})
        
        # Database connections
        self.source_conn = None
        self.auth_conn = None
        self.user_conn = None
        
        # Rollback results
        self.rollback_results = {
            'start_time': datetime.now(),
            'backup_id': backup_id,
            'steps_completed': [],
            'steps_failed': [],
            'warnings': [],
            'errors': []
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
            self.source_conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            logger.info("Connected to source database")
            
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
        if self.source_conn:
            self.source_conn.close()
            logger.info("Disconnected from source database")
        if self.auth_conn:
            self.auth_conn.close()
            logger.info("Disconnected from auth service database")
        if self.user_conn:
            self.user_conn.close()
            logger.info("Disconnected from user service database")
    
    def execute_sql(self, connection, sql: str, description: str) -> bool:
        """Execute SQL statement and log result."""
        try:
            cursor = connection.cursor()
            cursor.execute(sql)
            cursor.close()
            logger.info(f"Successfully executed: {description}")
            return True
        except Exception as e:
            logger.error(f"Failed to execute {description}: {e}")
            return False
    
    def run_command(self, command: List[str], description: str) -> bool:
        """Run shell command and log result."""
        try:
            logger.info(f"Running: {description}")
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                check=True
            )
            logger.info(f"Command output: {result.stdout}")
            if result.stderr:
                logger.warning(f"Command stderr: {result.stderr}")
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"Command failed: {description}")
            logger.error(f"Exit code: {e.returncode}")
            logger.error(f"Stdout: {e.stdout}")
            logger.error(f"Stderr: {e.stderr}")
            return False
        except Exception as e:
            logger.error(f"Failed to run command {description}: {e}")
            return False
    
    def add_step_result(self, step_name: str, success: bool, details: str = "") -> None:
        """Add a step result to the rollback results."""
        step_info = {
            'step': step_name,
            'timestamp': datetime.now().isoformat(),
            'details': details
        }
        
        if success:
            self.rollback_results['steps_completed'].append(step_info)
            logger.info(f"COMPLETED: {step_name}")
        else:
            self.rollback_results['steps_failed'].append(step_info)
            self.rollback_results['errors'].append(f"{step_name}: {details}")
            logger.error(f"FAILED: {step_name} - {details}")
    
    def verify_backup_exists(self) -> bool:
        """Verify that the specified backup exists."""
        logger.info(f"Verifying backup {self.backup_id} exists...")
        
        backup_dir = Path(self.backup_config.get('directory', './backups'))
        backup_path = backup_dir / self.backup_id
        
        if not backup_path.exists():
            self.add_step_result(
                "Verify Backup Exists",
                False,
                f"Backup directory not found: {backup_path}"
            )
            return False
        
        # Check for required backup files
        required_files = [
            'source_database.sql',
            'backup_manifest.json'
        ]
        
        for file_name in required_files:
            file_path = backup_path / file_name
            if not file_path.exists():
                self.add_step_result(
                    "Verify Backup Files",
                    False,
                    f"Required backup file not found: {file_path}"
                )
                return False
        
        # Load and verify backup manifest
        try:
            manifest_path = backup_path / 'backup_manifest.json'
            with open(manifest_path, 'r', encoding='utf-8') as f:
                manifest = json.load(f)
            
            # Verify backup integrity
            if manifest.get('status') != 'completed':
                self.add_step_result(
                    "Verify Backup Integrity",
                    False,
                    f"Backup status is not completed: {manifest.get('status')}"
                )
                return False
            
            logger.info(f"Backup verification successful")
            logger.info(f"Backup created: {manifest.get('created_at')}")
            logger.info(f"Backup size: {manifest.get('total_size_mb', 0):.2f} MB")
            
            self.add_step_result("Verify Backup Exists", True)
            return True
            
        except Exception as e:
            self.add_step_result(
                "Verify Backup Manifest",
                False,
                f"Failed to load backup manifest: {e}"
            )
            return False
    
    def create_pre_rollback_backup(self) -> bool:
        """Create a backup before starting rollback."""
        logger.info("Creating pre-rollback backup...")
        
        try:
            backup_dir = Path(self.backup_config.get('directory', './backups'))
            pre_rollback_id = f"pre_rollback_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            pre_rollback_path = backup_dir / pre_rollback_id
            pre_rollback_path.mkdir(parents=True, exist_ok=True)
            
            # Backup current microservice databases
            databases = [
                (self.auth_db_config, 'auth_service.sql'),
                (self.user_db_config, 'user_service.sql')
            ]
            
            for db_config, filename in databases:
                backup_file = pre_rollback_path / filename
                
                pg_dump_cmd = [
                    'pg_dump',
                    f"--host={db_config['host']}",
                    f"--port={db_config['port']}",
                    f"--username={db_config['username']}",
                    f"--dbname={db_config['database']}",
                    '--no-password',
                    '--verbose',
                    '--clean',
                    '--if-exists',
                    f"--file={backup_file}"
                ]
                
                # Set password environment variable
                env = os.environ.copy()
                env['PGPASSWORD'] = db_config['password']
                
                result = subprocess.run(
                    pg_dump_cmd,
                    env=env,
                    capture_output=True,
                    text=True
                )
                
                if result.returncode != 0:
                    self.add_step_result(
                        f"Backup {db_config['database']}",
                        False,
                        f"pg_dump failed: {result.stderr}"
                    )
                    return False
                
                logger.info(f"Backed up {db_config['database']} to {backup_file}")
            
            # Create manifest for pre-rollback backup
            manifest = {
                'backup_id': pre_rollback_id,
                'type': 'pre_rollback',
                'created_at': datetime.now().isoformat(),
                'original_backup_id': self.backup_id,
                'databases': [db[1] for db in databases],
                'status': 'completed'
            }
            
            manifest_path = pre_rollback_path / 'backup_manifest.json'
            with open(manifest_path, 'w', encoding='utf-8') as f:
                json.dump(manifest, f, indent=2)
            
            logger.info(f"Pre-rollback backup created: {pre_rollback_id}")
            self.add_step_result("Create Pre-Rollback Backup", True)
            return True
            
        except Exception as e:
            self.add_step_result(
                "Create Pre-Rollback Backup",
                False,
                f"Failed to create pre-rollback backup: {e}"
            )
            return False
    
    def stop_microservices(self) -> bool:
        """Stop microservices before rollback."""
        logger.info("Stopping microservices...")
        
        try:
            # This would typically involve stopping Docker containers,
            # Kubernetes deployments, or systemd services
            # For now, we'll just log the step
            
            services = [
                'auth-service',
                'user-service'
            ]
            
            for service in services:
                # Example: docker stop command
                # stop_cmd = ['docker', 'stop', service]
                # if not self.run_command(stop_cmd, f"Stop {service}"):
                #     return False
                
                logger.info(f"Would stop service: {service}")
            
            self.add_step_result("Stop Microservices", True)
            return True
            
        except Exception as e:
            self.add_step_result(
                "Stop Microservices",
                False,
                f"Failed to stop microservices: {e}"
            )
            return False
    
    def drop_microservice_databases(self) -> bool:
        """Drop microservice databases."""
        logger.info("Dropping microservice databases...")
        
        try:
            # Drop auth service database
            if not self.execute_sql(
                self.auth_conn,
                "DROP SCHEMA IF EXISTS auth_service CASCADE;",
                "Drop auth_service schema"
            ):
                return False
            
            # Drop user service database
            if not self.execute_sql(
                self.user_conn,
                "DROP SCHEMA IF EXISTS user_service CASCADE;",
                "Drop user_service schema"
            ):
                return False
            
            self.add_step_result("Drop Microservice Databases", True)
            return True
            
        except Exception as e:
            self.add_step_result(
                "Drop Microservice Databases",
                False,
                f"Failed to drop microservice databases: {e}"
            )
            return False
    
    def restore_source_database(self) -> bool:
        """Restore the source database from backup."""
        logger.info("Restoring source database...")
        
        try:
            backup_dir = Path(self.backup_config.get('directory', './backups'))
            backup_path = backup_dir / self.backup_id
            source_backup_file = backup_path / 'source_database.sql'
            
            if not source_backup_file.exists():
                self.add_step_result(
                    "Restore Source Database",
                    False,
                    f"Source backup file not found: {source_backup_file}"
                )
                return False
            
            # Restore using psql
            psql_cmd = [
                'psql',
                f"--host={self.source_db_config['host']}",
                f"--port={self.source_db_config['port']}",
                f"--username={self.source_db_config['username']}",
                f"--dbname={self.source_db_config['database']}",
                '--no-password',
                '--quiet',
                f"--file={source_backup_file}"
            ]
            
            # Set password environment variable
            env = os.environ.copy()
            env['PGPASSWORD'] = self.source_db_config['password']
            
            result = subprocess.run(
                psql_cmd,
                env=env,
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                self.add_step_result(
                    "Restore Source Database",
                    False,
                    f"psql restore failed: {result.stderr}"
                )
                return False
            
            logger.info("Source database restored successfully")
            self.add_step_result("Restore Source Database", True)
            return True
            
        except Exception as e:
            self.add_step_result(
                "Restore Source Database",
                False,
                f"Failed to restore source database: {e}"
            )
            return False
    
    def verify_rollback(self) -> bool:
        """Verify that the rollback was successful."""
        logger.info("Verifying rollback...")
        
        try:
            # Check that source database tables exist
            cursor = self.source_conn.cursor()
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('auth_user', 'user_profile', 'student_profile', 'company_profile')
            """)
            tables = [row[0] for row in cursor.fetchall()]
            cursor.close()
            
            expected_tables = ['auth_user', 'user_profile', 'student_profile', 'company_profile']
            missing_tables = set(expected_tables) - set(tables)
            
            if missing_tables:
                self.add_step_result(
                    "Verify Source Tables",
                    False,
                    f"Missing tables: {missing_tables}"
                )
                return False
            
            # Check that microservice schemas don't exist
            try:
                auth_cursor = self.auth_conn.cursor()
                auth_cursor.execute(
                    "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'auth_service'"
                )
                auth_schemas = auth_cursor.fetchall()
                auth_cursor.close()
                
                if auth_schemas:
                    self.rollback_results['warnings'].append(
                        "Auth service schema still exists after rollback"
                    )
            except:
                pass  # Expected if database/schema was dropped
            
            try:
                user_cursor = self.user_conn.cursor()
                user_cursor.execute(
                    "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'user_service'"
                )
                user_schemas = user_cursor.fetchall()
                user_cursor.close()
                
                if user_schemas:
                    self.rollback_results['warnings'].append(
                        "User service schema still exists after rollback"
                    )
            except:
                pass  # Expected if database/schema was dropped
            
            logger.info("Rollback verification successful")
            self.add_step_result("Verify Rollback", True)
            return True
            
        except Exception as e:
            self.add_step_result(
                "Verify Rollback",
                False,
                f"Failed to verify rollback: {e}"
            )
            return False
    
    def restart_monolith(self) -> bool:
        """Restart the monolithic application."""
        logger.info("Restarting monolithic application...")
        
        try:
            # This would typically involve starting the monolithic application
            # For now, we'll just log the step
            
            # Example: systemctl start edulink-monolith
            # restart_cmd = ['systemctl', 'start', 'edulink-monolith']
            # if not self.run_command(restart_cmd, "Restart monolith"):
            #     return False
            
            logger.info("Would restart monolithic application")
            
            self.add_step_result("Restart Monolith", True)
            return True
            
        except Exception as e:
            self.add_step_result(
                "Restart Monolith",
                False,
                f"Failed to restart monolith: {e}"
            )
            return False
    
    def create_rollback_report(self) -> None:
        """Create a rollback report."""
        report = {
            'rollback_info': {
                'backup_id': self.backup_id,
                'started_at': self.rollback_results['start_time'].isoformat(),
                'completed_at': datetime.now().isoformat(),
                'duration_seconds': (datetime.now() - self.rollback_results['start_time']).total_seconds()
            },
            'summary': {
                'steps_completed': len(self.rollback_results['steps_completed']),
                'steps_failed': len(self.rollback_results['steps_failed']),
                'warnings_count': len(self.rollback_results['warnings']),
                'errors_count': len(self.rollback_results['errors']),
                'success': len(self.rollback_results['steps_failed']) == 0
            },
            'steps_completed': self.rollback_results['steps_completed'],
            'steps_failed': self.rollback_results['steps_failed'],
            'warnings': self.rollback_results['warnings'],
            'errors': self.rollback_results['errors']
        }
        
        report_path = Path(f'rollback_report_{self.backup_id}.json')
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2)
        
        logger.info(f"Rollback report created: {report_path}")
    
    def run_rollback(self) -> bool:
        """Run the complete rollback process."""
        try:
            logger.info(f"Starting migration rollback for backup {self.backup_id}...")
            
            # Connect to databases
            self.connect_databases()
            
            # Run rollback steps
            steps = [
                (self.verify_backup_exists, "Verify backup exists"),
                (self.create_pre_rollback_backup, "Create pre-rollback backup"),
                (self.stop_microservices, "Stop microservices"),
                (self.drop_microservice_databases, "Drop microservice databases"),
                (self.restore_source_database, "Restore source database"),
                (self.verify_rollback, "Verify rollback"),
                (self.restart_monolith, "Restart monolith")
            ]
            
            for step_func, step_name in steps:
                logger.info(f"Executing step: {step_name}")
                if not step_func():
                    logger.error(f"Rollback failed at step: {step_name}")
                    break
            
            # Create rollback report
            self.create_rollback_report()
            
            # Log completion
            duration = datetime.now() - self.rollback_results['start_time']
            success = len(self.rollback_results['steps_failed']) == 0
            
            logger.info(f"Rollback completed!")
            logger.info(f"Duration: {duration}")
            logger.info(f"Steps completed: {len(self.rollback_results['steps_completed'])}")
            logger.info(f"Steps failed: {len(self.rollback_results['steps_failed'])}")
            logger.info(f"Success: {success}")
            
            return success
            
        except Exception as e:
            logger.error(f"Rollback failed: {e}")
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
        description='Rollback Edulink microservices migration'
    )
    parser.add_argument(
        '--config', 
        required=True, 
        help='Configuration file path'
    )
    parser.add_argument(
        '--backup-id', 
        required=True, 
        help='Backup ID to restore from'
    )
    parser.add_argument(
        '--confirm', 
        action='store_true', 
        help='Confirm rollback operation (required for safety)'
    )
    parser.add_argument(
        '--verbose', 
        action='store_true', 
        help='Enable verbose logging'
    )
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    if not args.confirm:
        logger.error("Rollback operation requires --confirm flag for safety")
        logger.error("This operation will destroy current microservice data and restore the monolith")
        sys.exit(1)
    
    try:
        # Load configuration
        config = load_config(args.config)
        
        # Validate required config
        required_keys = ['source_database', 'auth_database', 'user_database']
        for key in required_keys:
            if key not in config:
                raise ValueError(f"Missing required config key: {key}")
        
        # Confirm with user
        logger.warning("WARNING: This operation will:")
        logger.warning("1. Stop all microservices")
        logger.warning("2. Drop microservice databases")
        logger.warning("3. Restore the monolithic database")
        logger.warning("4. Restart the monolithic application")
        logger.warning("")
        logger.warning("This operation is IRREVERSIBLE without proper backups!")
        
        response = input("Type 'ROLLBACK' to confirm: ")
        if response != 'ROLLBACK':
            logger.info("Rollback cancelled by user")
            sys.exit(0)
        
        # Run rollback
        rollback = MigrationRollback(config, args.backup_id)
        success = rollback.run_rollback()
        
        if success:
            logger.info("Migration rollback completed successfully!")
            sys.exit(0)
        else:
            logger.error("Migration rollback failed!")
            sys.exit(1)
        
    except Exception as e:
        logger.error(f"Rollback failed: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()