"""Database backup and disaster recovery for Supabase microservices."""

import os
import logging
import subprocess
import json
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
from pathlib import Path
import gzip
import shutil

from .config import get_database_config
from .connection_manager import connection_manager

logger = logging.getLogger(__name__)

@dataclass
class BackupMetadata:
    """Metadata for a database backup."""
    backup_id: str
    timestamp: datetime
    schemas: List[str]
    backup_type: str  # 'full', 'schema', 'data_only'
    file_path: str
    file_size: int
    compression: bool
    checksum: str
    status: str  # 'in_progress', 'completed', 'failed'
    error_message: Optional[str] = None
    restore_tested: bool = False

class DatabaseBackupManager:
    """Manages database backups and disaster recovery."""
    
    def __init__(self, backup_directory: str = "./backups"):
        self.backup_directory = Path(backup_directory)
        self.backup_directory.mkdir(exist_ok=True)
        
        # Create subdirectories for different backup types
        (self.backup_directory / "full").mkdir(exist_ok=True)
        (self.backup_directory / "schema").mkdir(exist_ok=True)
        (self.backup_directory / "data").mkdir(exist_ok=True)
        (self.backup_directory / "incremental").mkdir(exist_ok=True)
        
        self.metadata_file = self.backup_directory / "backup_metadata.json"
        self.backup_metadata: List[BackupMetadata] = self._load_metadata()
        
        # Backup retention settings
        self.retention_policy = {
            'daily_backups': 7,    # Keep 7 daily backups
            'weekly_backups': 4,   # Keep 4 weekly backups
            'monthly_backups': 12, # Keep 12 monthly backups
        }
    
    def _load_metadata(self) -> List[BackupMetadata]:
        """Load backup metadata from file.
        
        Returns:
            List of backup metadata
        """
        if not self.metadata_file.exists():
            return []
        
        try:
            with open(self.metadata_file, 'r') as f:
                data = json.load(f)
                return [
                    BackupMetadata(
                        backup_id=item['backup_id'],
                        timestamp=datetime.fromisoformat(item['timestamp']),
                        schemas=item['schemas'],
                        backup_type=item['backup_type'],
                        file_path=item['file_path'],
                        file_size=item['file_size'],
                        compression=item['compression'],
                        checksum=item['checksum'],
                        status=item['status'],
                        error_message=item.get('error_message'),
                        restore_tested=item.get('restore_tested', False)
                    )
                    for item in data
                ]
        except Exception as e:
            logger.error(f"Failed to load backup metadata: {e}")
            return []
    
    def _save_metadata(self) -> None:
        """Save backup metadata to file."""
        try:
            data = [
                {
                    'backup_id': backup.backup_id,
                    'timestamp': backup.timestamp.isoformat(),
                    'schemas': backup.schemas,
                    'backup_type': backup.backup_type,
                    'file_path': backup.file_path,
                    'file_size': backup.file_size,
                    'compression': backup.compression,
                    'checksum': backup.checksum,
                    'status': backup.status,
                    'error_message': backup.error_message,
                    'restore_tested': backup.restore_tested
                }
                for backup in self.backup_metadata
            ]
            
            with open(self.metadata_file, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save backup metadata: {e}")
    
    def create_full_backup(self, compress: bool = True) -> Optional[BackupMetadata]:
        """Create a full database backup.
        
        Args:
            compress: Whether to compress the backup
            
        Returns:
            Backup metadata or None if failed
        """
        backup_id = f"full_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        timestamp = datetime.now()
        
        # Get database configuration
        db_config = get_database_config()
        
        # Create backup filename
        backup_filename = f"{backup_id}.sql"
        if compress:
            backup_filename += ".gz"
        
        backup_path = self.backup_directory / "full" / backup_filename
        
        # Create backup metadata
        backup_metadata = BackupMetadata(
            backup_id=backup_id,
            timestamp=timestamp,
            schemas=list(db_config['service_schemas'].values()),
            backup_type='full',
            file_path=str(backup_path),
            file_size=0,
            compression=compress,
            checksum='',
            status='in_progress'
        )
        
        self.backup_metadata.append(backup_metadata)
        self._save_metadata()
        
        try:
            # Create pg_dump command
            cmd = [
                'pg_dump',
                '--host', db_config['host'],
                '--port', str(db_config['port']),
                '--username', db_config['user'],
                '--dbname', db_config['database'],
                '--verbose',
                '--clean',
                '--create',
                '--if-exists',
                '--format=plain'
            ]
            
            # Set password via environment variable
            env = os.environ.copy()
            env['PGPASSWORD'] = db_config['password']
            
            logger.info(f"Starting full backup: {backup_id}")
            
            if compress:
                # Pipe through gzip
                with open(backup_path, 'wb') as f:
                    pg_dump = subprocess.Popen(cmd, stdout=subprocess.PIPE, env=env)
                    gzip_proc = subprocess.Popen(['gzip'], stdin=pg_dump.stdout, stdout=f)
                    pg_dump.stdout.close()
                    gzip_proc.wait()
                    pg_dump.wait()
                    
                    if pg_dump.returncode != 0 or gzip_proc.returncode != 0:
                        raise subprocess.CalledProcessError(pg_dump.returncode, cmd)
            else:
                # Direct output to file
                with open(backup_path, 'w') as f:
                    result = subprocess.run(cmd, stdout=f, stderr=subprocess.PIPE, 
                                          text=True, env=env)
                    if result.returncode != 0:
                        raise subprocess.CalledProcessError(result.returncode, cmd)
            
            # Calculate file size and checksum
            backup_metadata.file_size = backup_path.stat().st_size
            backup_metadata.checksum = self._calculate_checksum(backup_path)
            backup_metadata.status = 'completed'
            
            logger.info(f"Full backup completed: {backup_id} ({backup_metadata.file_size} bytes)")
            
        except Exception as e:
            backup_metadata.status = 'failed'
            backup_metadata.error_message = str(e)
            logger.error(f"Full backup failed: {e}")
            
            # Clean up failed backup file
            if backup_path.exists():
                backup_path.unlink()
        
        self._save_metadata()
        return backup_metadata if backup_metadata.status == 'completed' else None
    
    def create_schema_backup(self, schema_names: List[str], 
                           compress: bool = True) -> Optional[BackupMetadata]:
        """Create a backup of specific schemas.
        
        Args:
            schema_names: List of schema names to backup
            compress: Whether to compress the backup
            
        Returns:
            Backup metadata or None if failed
        """
        backup_id = f"schema_{'_'.join(schema_names)}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        timestamp = datetime.now()
        
        # Get database configuration
        db_config = get_database_config()
        
        # Create backup filename
        backup_filename = f"{backup_id}.sql"
        if compress:
            backup_filename += ".gz"
        
        backup_path = self.backup_directory / "schema" / backup_filename
        
        # Create backup metadata
        backup_metadata = BackupMetadata(
            backup_id=backup_id,
            timestamp=timestamp,
            schemas=schema_names,
            backup_type='schema',
            file_path=str(backup_path),
            file_size=0,
            compression=compress,
            checksum='',
            status='in_progress'
        )
        
        self.backup_metadata.append(backup_metadata)
        self._save_metadata()
        
        try:
            # Create pg_dump command for specific schemas
            cmd = [
                'pg_dump',
                '--host', db_config['host'],
                '--port', str(db_config['port']),
                '--username', db_config['user'],
                '--dbname', db_config['database'],
                '--verbose',
                '--clean',
                '--if-exists',
                '--format=plain'
            ]
            
            # Add schema filters
            for schema in schema_names:
                cmd.extend(['--schema', schema])
            
            # Set password via environment variable
            env = os.environ.copy()
            env['PGPASSWORD'] = db_config['password']
            
            logger.info(f"Starting schema backup: {backup_id} for schemas: {schema_names}")
            
            if compress:
                # Pipe through gzip
                with open(backup_path, 'wb') as f:
                    pg_dump = subprocess.Popen(cmd, stdout=subprocess.PIPE, env=env)
                    gzip_proc = subprocess.Popen(['gzip'], stdin=pg_dump.stdout, stdout=f)
                    pg_dump.stdout.close()
                    gzip_proc.wait()
                    pg_dump.wait()
                    
                    if pg_dump.returncode != 0 or gzip_proc.returncode != 0:
                        raise subprocess.CalledProcessError(pg_dump.returncode, cmd)
            else:
                # Direct output to file
                with open(backup_path, 'w') as f:
                    result = subprocess.run(cmd, stdout=f, stderr=subprocess.PIPE, 
                                          text=True, env=env)
                    if result.returncode != 0:
                        raise subprocess.CalledProcessError(result.returncode, cmd)
            
            # Calculate file size and checksum
            backup_metadata.file_size = backup_path.stat().st_size
            backup_metadata.checksum = self._calculate_checksum(backup_path)
            backup_metadata.status = 'completed'
            
            logger.info(f"Schema backup completed: {backup_id} ({backup_metadata.file_size} bytes)")
            
        except Exception as e:
            backup_metadata.status = 'failed'
            backup_metadata.error_message = str(e)
            logger.error(f"Schema backup failed: {e}")
            
            # Clean up failed backup file
            if backup_path.exists():
                backup_path.unlink()
        
        self._save_metadata()
        return backup_metadata if backup_metadata.status == 'completed' else None
    
    def restore_backup(self, backup_id: str, target_database: Optional[str] = None) -> bool:
        """Restore a backup.
        
        Args:
            backup_id: ID of the backup to restore
            target_database: Optional target database name
            
        Returns:
            True if restore succeeded
        """
        # Find backup metadata
        backup_metadata = None
        for backup in self.backup_metadata:
            if backup.backup_id == backup_id:
                backup_metadata = backup
                break
        
        if not backup_metadata:
            logger.error(f"Backup not found: {backup_id}")
            return False
        
        if backup_metadata.status != 'completed':
            logger.error(f"Cannot restore incomplete backup: {backup_id}")
            return False
        
        backup_path = Path(backup_metadata.file_path)
        if not backup_path.exists():
            logger.error(f"Backup file not found: {backup_path}")
            return False
        
        # Get database configuration
        db_config = get_database_config()
        target_db = target_database or db_config['database']
        
        try:
            # Create psql command
            cmd = [
                'psql',
                '--host', db_config['host'],
                '--port', str(db_config['port']),
                '--username', db_config['user'],
                '--dbname', target_db,
                '--verbose'
            ]
            
            # Set password via environment variable
            env = os.environ.copy()
            env['PGPASSWORD'] = db_config['password']
            
            logger.info(f"Starting restore: {backup_id} to database {target_db}")
            
            if backup_metadata.compression:
                # Decompress and pipe to psql
                with gzip.open(backup_path, 'rt') as f:
                    result = subprocess.run(cmd, stdin=f, stderr=subprocess.PIPE, 
                                          text=True, env=env)
            else:
                # Direct input from file
                with open(backup_path, 'r') as f:
                    result = subprocess.run(cmd, stdin=f, stderr=subprocess.PIPE, 
                                          text=True, env=env)
            
            if result.returncode != 0:
                logger.error(f"Restore failed: {result.stderr}")
                return False
            
            logger.info(f"Restore completed: {backup_id}")
            return True
            
        except Exception as e:
            logger.error(f"Restore failed: {e}")
            return False
    
    def test_backup_restore(self, backup_id: str) -> bool:
        """Test a backup by attempting to restore it to a temporary database.
        
        Args:
            backup_id: ID of the backup to test
            
        Returns:
            True if test succeeded
        """
        # Create temporary database name
        temp_db_name = f"backup_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        try:
            # Create temporary database
            db_config = get_database_config()
            
            # Connect to postgres database to create temp database
            create_cmd = [
                'psql',
                '--host', db_config['host'],
                '--port', str(db_config['port']),
                '--username', db_config['user'],
                '--dbname', 'postgres',
                '--command', f'CREATE DATABASE "{temp_db_name}";'
            ]
            
            env = os.environ.copy()
            env['PGPASSWORD'] = db_config['password']
            
            result = subprocess.run(create_cmd, stderr=subprocess.PIPE, text=True, env=env)
            if result.returncode != 0:
                logger.error(f"Failed to create test database: {result.stderr}")
                return False
            
            # Attempt restore
            restore_success = self.restore_backup(backup_id, temp_db_name)
            
            # Clean up temporary database
            drop_cmd = [
                'psql',
                '--host', db_config['host'],
                '--port', str(db_config['port']),
                '--username', db_config['user'],
                '--dbname', 'postgres',
                '--command', f'DROP DATABASE "{temp_db_name}";'
            ]
            
            subprocess.run(drop_cmd, stderr=subprocess.PIPE, text=True, env=env)
            
            # Update backup metadata
            for backup in self.backup_metadata:
                if backup.backup_id == backup_id:
                    backup.restore_tested = restore_success
                    break
            
            self._save_metadata()
            
            return restore_success
            
        except Exception as e:
            logger.error(f"Backup test failed: {e}")
            return False
    
    def cleanup_old_backups(self) -> None:
        """Clean up old backups according to retention policy."""
        now = datetime.now()
        
        # Group backups by type and age
        daily_cutoff = now - timedelta(days=self.retention_policy['daily_backups'])
        weekly_cutoff = now - timedelta(weeks=self.retention_policy['weekly_backups'])
        monthly_cutoff = now - timedelta(days=30 * self.retention_policy['monthly_backups'])
        
        backups_to_remove = []
        
        for backup in self.backup_metadata:
            backup_age = now - backup.timestamp
            
            # Keep all backups from the last week
            if backup_age <= timedelta(days=7):
                continue
            
            # For backups older than daily retention, keep weekly
            if backup_age > timedelta(days=self.retention_policy['daily_backups']):
                # Keep one backup per week
                week_start = backup.timestamp - timedelta(days=backup.timestamp.weekday())
                weekly_backups = [
                    b for b in self.backup_metadata
                    if (b.timestamp - timedelta(days=b.timestamp.weekday())) == week_start
                ]
                
                if len(weekly_backups) > 1:
                    # Keep the latest backup of the week
                    weekly_backups.sort(key=lambda x: x.timestamp)
                    backups_to_remove.extend(weekly_backups[:-1])
            
            # For backups older than weekly retention, keep monthly
            if backup_age > timedelta(weeks=self.retention_policy['weekly_backups']):
                # Keep one backup per month
                month_start = backup.timestamp.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                monthly_backups = [
                    b for b in self.backup_metadata
                    if b.timestamp.replace(day=1, hour=0, minute=0, second=0, microsecond=0) == month_start
                ]
                
                if len(monthly_backups) > 1:
                    # Keep the latest backup of the month
                    monthly_backups.sort(key=lambda x: x.timestamp)
                    backups_to_remove.extend(monthly_backups[:-1])
            
            # Remove backups older than monthly retention
            if backup_age > timedelta(days=30 * self.retention_policy['monthly_backups']):
                backups_to_remove.append(backup)
        
        # Remove duplicate entries
        backups_to_remove = list(set(backups_to_remove))
        
        # Delete backup files and metadata
        for backup in backups_to_remove:
            try:
                backup_path = Path(backup.file_path)
                if backup_path.exists():
                    backup_path.unlink()
                    logger.info(f"Deleted old backup: {backup.backup_id}")
                
                self.backup_metadata.remove(backup)
            except Exception as e:
                logger.error(f"Failed to delete backup {backup.backup_id}: {e}")
        
        self._save_metadata()
    
    def get_backup_status(self) -> Dict[str, Any]:
        """Get backup system status.
        
        Returns:
            Backup status information
        """
        total_backups = len(self.backup_metadata)
        completed_backups = len([b for b in self.backup_metadata if b.status == 'completed'])
        failed_backups = len([b for b in self.backup_metadata if b.status == 'failed'])
        tested_backups = len([b for b in self.backup_metadata if b.restore_tested])
        
        total_size = sum(b.file_size for b in self.backup_metadata if b.status == 'completed')
        
        latest_backup = None
        if self.backup_metadata:
            latest_backup = max(self.backup_metadata, key=lambda x: x.timestamp)
        
        return {
            'total_backups': total_backups,
            'completed_backups': completed_backups,
            'failed_backups': failed_backups,
            'tested_backups': tested_backups,
            'total_size_bytes': total_size,
            'total_size_mb': round(total_size / (1024 * 1024), 2),
            'latest_backup': {
                'backup_id': latest_backup.backup_id,
                'timestamp': latest_backup.timestamp.isoformat(),
                'status': latest_backup.status,
                'size_mb': round(latest_backup.file_size / (1024 * 1024), 2)
            } if latest_backup else None,
            'backup_directory': str(self.backup_directory),
            'retention_policy': self.retention_policy
        }
    
    def _calculate_checksum(self, file_path: Path) -> str:
        """Calculate SHA256 checksum of a file.
        
        Args:
            file_path: Path to the file
            
        Returns:
            SHA256 checksum
        """
        import hashlib
        
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                sha256_hash.update(chunk)
        return sha256_hash.hexdigest()

# Global backup manager instance
backup_manager = DatabaseBackupManager()

# Convenience functions
def create_full_backup(compress: bool = True) -> Optional[BackupMetadata]:
    """Create a full database backup."""
    return backup_manager.create_full_backup(compress)

def create_schema_backup(schema_names: List[str], compress: bool = True) -> Optional[BackupMetadata]:
    """Create a backup of specific schemas."""
    return backup_manager.create_schema_backup(schema_names, compress)

def restore_backup(backup_id: str, target_database: Optional[str] = None) -> bool:
    """Restore a backup."""
    return backup_manager.restore_backup(backup_id, target_database)

def get_backup_status() -> Dict[str, Any]:
    """Get backup system status."""
    return backup_manager.get_backup_status()