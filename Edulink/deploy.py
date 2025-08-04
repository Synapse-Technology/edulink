#!/usr/bin/env python
"""
Edulink Backend Deployment Script

This script automates the deployment process for the Edulink internship
management system backend across different environments.

Usage:
    python deploy.py [environment] [options]

Environments:
    staging     Deploy to staging environment
    production  Deploy to production environment
    docker      Deploy using Docker containers

Options:
    --branch BRANCH     Git branch to deploy (default: main)
    --tag TAG          Git tag to deploy
    --rollback         Rollback to previous deployment
    --dry-run          Show what would be deployed without executing
    --skip-tests       Skip running tests before deployment
    --skip-backup      Skip database backup before deployment
    --force            Force deployment even if checks fail
    --verbose          Enable verbose output
    --help             Show this help message

Examples:
    python deploy.py staging
    python deploy.py production --tag v1.2.0
    python deploy.py staging --branch feature/new-api
    python deploy.py production --rollback
    python deploy.py docker --dry-run
"""

import os
import sys
import subprocess
import argparse
import json
import time
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))


class Colors:
    """ANSI color codes for terminal output."""
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'


class DeploymentError(Exception):
    """Custom exception for deployment errors."""
    pass


class DeploymentManager:
    """Manages the deployment process for the Edulink backend."""

    def __init__(self, args):
        self.args = args
        self.project_root = project_root
        self.deployment_dir = self.project_root / 'deployments'
        self.deployment_dir.mkdir(exist_ok=True)
        
        # Deployment configuration
        self.config = self.load_deployment_config()
        
        # Deployment metadata
        self.deployment_id = datetime.now().strftime('%Y%m%d_%H%M%S')
        self.deployment_log = self.deployment_dir / f'deployment_{self.deployment_id}.log'
        
        # Environment-specific settings
        self.env_config = self.config.get(args.environment, {})
        
    def load_deployment_config(self) -> Dict:
        """Load deployment configuration from file."""
        config_file = self.project_root / 'deployment.json'
        
        if config_file.exists():
            with open(config_file, 'r') as f:
                return json.load(f)
        
        # Default configuration
        return {
            'staging': {
                'host': 'staging.edulink.com',
                'user': 'deploy',
                'path': '/var/www/edulink-staging',
                'branch': 'develop',
                'python_path': '/var/www/edulink-staging/venv/bin/python',
                'requirements_file': 'requirements.txt',
                'settings_module': 'Edulink.settings.staging',
                'backup_enabled': True,
                'health_check_url': 'https://staging.edulink.com/health',
                'rollback_enabled': True
            },
            'production': {
                'host': 'edulink.com',
                'user': 'deploy',
                'path': '/var/www/edulink',
                'branch': 'main',
                'python_path': '/var/www/edulink/venv/bin/python',
                'requirements_file': 'requirements.txt',
                'settings_module': 'Edulink.settings.prod',
                'backup_enabled': True,
                'health_check_url': 'https://edulink.com/health',
                'rollback_enabled': True,
                'maintenance_mode': True
            },
            'docker': {
                'compose_file': 'docker-compose.prod.yml',
                'registry': 'registry.edulink.com',
                'image_name': 'edulink/backend',
                'backup_enabled': True,
                'health_check_url': 'http://localhost:8000/health',
                'rollback_enabled': True
            }
        }

    def log(self, message: str, level: str = 'INFO'):
        """Log a message to both console and file."""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_entry = f"[{timestamp}] [{level}] {message}"
        
        # Console output with colors
        if level == 'ERROR':
            print(f"{Colors.FAIL}✗ {message}{Colors.ENDC}")
        elif level == 'WARNING':
            print(f"{Colors.WARNING}⚠ {message}{Colors.ENDC}")
        elif level == 'SUCCESS':
            print(f"{Colors.OKGREEN}✓ {message}{Colors.ENDC}")
        else:
            print(f"{Colors.OKBLUE}ℹ {message}{Colors.ENDC}")
        
        # File output
        with open(self.deployment_log, 'a') as f:
            f.write(log_entry + '\n')

    def print_header(self, message: str):
        """Print a formatted header message."""
        print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}")
        print(f"{Colors.HEADER}{Colors.BOLD}{message.center(60)}{Colors.ENDC}")
        print(f"{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}\n")
        self.log(message)

    def run_command(self, command: List[str], description: str, 
                   check: bool = True, capture_output: bool = False,
                   remote: bool = False) -> Optional[subprocess.CompletedProcess]:
        """Run a command with error handling and logging."""
        try:
            if self.args.verbose:
                self.log(f"Running: {' '.join(command)}")
            
            if remote and self.args.environment != 'docker':
                # Wrap command for remote execution
                host = self.env_config.get('host')
                user = self.env_config.get('user')
                command = ['ssh', f'{user}@{host}'] + command
            
            if self.args.dry_run:
                self.log(f"[DRY RUN] Would run: {description}")
                return None
            
            result = subprocess.run(
                command,
                check=check,
                capture_output=capture_output,
                text=True,
                cwd=self.project_root
            )
            
            if capture_output and result.stdout:
                if self.args.verbose:
                    print(result.stdout)
            
            self.log(f"Completed: {description}", 'SUCCESS')
            return result
            
        except subprocess.CalledProcessError as e:
            error_msg = f"Failed: {description}"
            if capture_output and e.stderr:
                error_msg += f" - {e.stderr.strip()}"
            self.log(error_msg, 'ERROR')
            if check:
                raise DeploymentError(error_msg)
            return None
        except FileNotFoundError:
            error_msg = f"Command not found: {command[0]}"
            self.log(error_msg, 'ERROR')
            if check:
                raise DeploymentError(error_msg)
            return None

    def check_prerequisites(self):
        """Check deployment prerequisites."""
        self.print_header("CHECKING PREREQUISITES")
        
        # Check Git repository
        if not (self.project_root / '.git').exists():
            raise DeploymentError("Not a Git repository")
        self.log("Git repository: OK", 'SUCCESS')
        
        # Check for uncommitted changes
        result = self.run_command(
            ['git', 'status', '--porcelain'],
            "Checking for uncommitted changes",
            capture_output=True
        )
        
        if result and result.stdout.strip():
            if not self.args.force:
                raise DeploymentError("Uncommitted changes found. Use --force to override.")
            self.log("Uncommitted changes found, but --force specified", 'WARNING')
        else:
            self.log("Working directory clean", 'SUCCESS')
        
        # Check deployment configuration
        if self.args.environment not in self.config:
            raise DeploymentError(f"No configuration found for environment: {self.args.environment}")
        self.log(f"Configuration for {self.args.environment}: OK", 'SUCCESS')
        
        # Check SSH connection for remote deployments
        if self.args.environment in ['staging', 'production']:
            host = self.env_config.get('host')
            user = self.env_config.get('user')
            
            try:
                self.run_command(
                    ['ssh', '-o', 'ConnectTimeout=10', f'{user}@{host}', 'echo', 'Connection test'],
                    f"Testing SSH connection to {host}",
                    capture_output=True
                )
            except DeploymentError:
                raise DeploymentError(f"Cannot connect to {host}. Check SSH configuration.")

    def get_deployment_info(self) -> Dict:
        """Get information about the current deployment."""
        # Get current commit info
        commit_hash = self.run_command(
            ['git', 'rev-parse', 'HEAD'],
            "Getting current commit hash",
            capture_output=True
        ).stdout.strip()
        
        commit_message = self.run_command(
            ['git', 'log', '-1', '--pretty=%B'],
            "Getting commit message",
            capture_output=True
        ).stdout.strip()
        
        # Get branch info
        if self.args.tag:
            ref = self.args.tag
            ref_type = 'tag'
        else:
            ref = self.args.branch or self.env_config.get('branch', 'main')
            ref_type = 'branch'
        
        return {
            'deployment_id': self.deployment_id,
            'environment': self.args.environment,
            'ref': ref,
            'ref_type': ref_type,
            'commit_hash': commit_hash,
            'commit_message': commit_message,
            'timestamp': datetime.now().isoformat(),
            'deployer': os.getenv('USER', 'unknown')
        }

    def save_deployment_info(self, info: Dict):
        """Save deployment information for rollback purposes."""
        deployments_file = self.deployment_dir / 'deployments.json'
        
        deployments = []
        if deployments_file.exists():
            with open(deployments_file, 'r') as f:
                deployments = json.load(f)
        
        deployments.append(info)
        
        # Keep only last 10 deployments
        deployments = deployments[-10:]
        
        with open(deployments_file, 'w') as f:
            json.dump(deployments, f, indent=2)
        
        self.log(f"Deployment info saved: {info['deployment_id']}", 'SUCCESS')

    def run_tests(self):
        """Run tests before deployment."""
        if self.args.skip_tests:
            self.log("Skipping tests (--skip-tests specified)", 'WARNING')
            return
        
        self.print_header("RUNNING TESTS")
        
        # Set test environment
        env = os.environ.copy()
        env['DJANGO_SETTINGS_MODULE'] = 'Edulink.settings.test'
        
        # Run tests
        test_command = [sys.executable, 'manage.py', 'test', '--verbosity=1']
        
        try:
            result = subprocess.run(
                test_command,
                check=True,
                env=env,
                cwd=self.project_root
            )
            self.log("All tests passed", 'SUCCESS')
        except subprocess.CalledProcessError:
            if not self.args.force:
                raise DeploymentError("Tests failed. Use --force to deploy anyway.")
            self.log("Tests failed, but --force specified", 'WARNING')

    def backup_database(self):
        """Create database backup before deployment."""
        if not self.env_config.get('backup_enabled', True) or self.args.skip_backup:
            self.log("Skipping database backup", 'WARNING')
            return
        
        self.print_header("CREATING DATABASE BACKUP")
        
        backup_filename = f"backup_{self.args.environment}_{self.deployment_id}.sql"
        backup_path = self.deployment_dir / backup_filename
        
        if self.args.environment == 'docker':
            # Docker backup
            self.run_command(
                ['docker-compose', 'exec', '-T', 'db', 'pg_dump', '-U', 'postgres', 'edulink'],
                f"Creating database backup: {backup_filename}"
            )
        else:
            # Remote backup
            backup_command = [
                'pg_dump',
                '-h', 'localhost',
                '-U', 'edulink_user',
                '-d', 'edulink_db',
                '-f', f'/tmp/{backup_filename}'
            ]
            
            self.run_command(
                backup_command,
                f"Creating database backup: {backup_filename}",
                remote=True
            )
            
            # Download backup file
            host = self.env_config.get('host')
            user = self.env_config.get('user')
            
            self.run_command(
                ['scp', f'{user}@{host}:/tmp/{backup_filename}', str(backup_path)],
                "Downloading backup file"
            )
        
        self.log(f"Database backup created: {backup_path}", 'SUCCESS')

    def deploy_code(self):
        """Deploy the application code."""
        self.print_header("DEPLOYING CODE")
        
        if self.args.environment == 'docker':
            self.deploy_docker()
        else:
            self.deploy_remote()

    def deploy_docker(self):
        """Deploy using Docker."""
        compose_file = self.env_config.get('compose_file', 'docker-compose.yml')
        
        # Build new images
        self.run_command(
            ['docker-compose', '-f', compose_file, 'build'],
            "Building Docker images"
        )
        
        # Tag images with deployment ID
        registry = self.env_config.get('registry')
        image_name = self.env_config.get('image_name')
        
        if registry and image_name:
            self.run_command(
                ['docker', 'tag', f'{image_name}:latest', f'{registry}/{image_name}:{self.deployment_id}'],
                f"Tagging image with deployment ID: {self.deployment_id}"
            )
            
            # Push to registry
            self.run_command(
                ['docker', 'push', f'{registry}/{image_name}:{self.deployment_id}'],
                "Pushing image to registry"
            )
        
        # Deploy with rolling update
        self.run_command(
            ['docker-compose', '-f', compose_file, 'up', '-d'],
            "Deploying with Docker Compose"
        )

    def deploy_remote(self):
        """Deploy to remote server."""
        host = self.env_config.get('host')
        user = self.env_config.get('user')
        path = self.env_config.get('path')
        
        # Get deployment reference
        ref = self.args.tag or self.args.branch or self.env_config.get('branch', 'main')
        
        # Update code on remote server
        remote_commands = [
            f'cd {path}',
            'git fetch --all',
            f'git checkout {ref}',
            f'git pull origin {ref}' if not self.args.tag else f'git checkout {ref}'
        ]
        
        for cmd in remote_commands:
            self.run_command(
                ['ssh', f'{user}@{host}', cmd],
                f"Remote: {cmd}"
            )
        
        # Install/update dependencies
        python_path = self.env_config.get('python_path')
        requirements_file = self.env_config.get('requirements_file', 'requirements.txt')
        
        self.run_command(
            ['ssh', f'{user}@{host}', f'cd {path} && {python_path} -m pip install -r {requirements_file}'],
            "Installing dependencies"
        )
        
        # Run migrations
        settings_module = self.env_config.get('settings_module')
        
        self.run_command(
            ['ssh', f'{user}@{host}', f'cd {path} && DJANGO_SETTINGS_MODULE={settings_module} {python_path} manage.py migrate'],
            "Running database migrations"
        )
        
        # Collect static files
        self.run_command(
            ['ssh', f'{user}@{host}', f'cd {path} && DJANGO_SETTINGS_MODULE={settings_module} {python_path} manage.py collectstatic --noinput'],
            "Collecting static files"
        )
        
        # Restart application server
        self.run_command(
            ['ssh', f'{user}@{host}', 'sudo systemctl restart gunicorn'],
            "Restarting application server"
        )
        
        # Restart Celery workers
        self.run_command(
            ['ssh', f'{user}@{host}', 'sudo systemctl restart celery'],
            "Restarting Celery workers",
            check=False  # Don't fail if Celery is not configured
        )

    def run_health_check(self):
        """Run post-deployment health check."""
        self.print_header("RUNNING HEALTH CHECK")
        
        health_check_url = self.env_config.get('health_check_url')
        
        if not health_check_url:
            self.log("No health check URL configured", 'WARNING')
            return
        
        # Wait for application to start
        self.log("Waiting for application to start...")
        time.sleep(10)
        
        # Check health endpoint
        try:
            import requests
            
            for attempt in range(5):
                try:
                    response = requests.get(health_check_url, timeout=30)
                    if response.status_code == 200:
                        self.log("Health check passed", 'SUCCESS')
                        return
                    else:
                        self.log(f"Health check failed with status {response.status_code}", 'WARNING')
                except requests.RequestException as e:
                    self.log(f"Health check attempt {attempt + 1} failed: {e}", 'WARNING')
                
                if attempt < 4:
                    time.sleep(10)
            
            raise DeploymentError("Health check failed after 5 attempts")
            
        except ImportError:
            self.log("requests library not available, skipping health check", 'WARNING')

    def rollback_deployment(self):
        """Rollback to previous deployment."""
        self.print_header("ROLLING BACK DEPLOYMENT")
        
        deployments_file = self.deployment_dir / 'deployments.json'
        
        if not deployments_file.exists():
            raise DeploymentError("No deployment history found")
        
        with open(deployments_file, 'r') as f:
            deployments = json.load(f)
        
        # Find previous deployment for this environment
        env_deployments = [d for d in deployments if d['environment'] == self.args.environment]
        
        if len(env_deployments) < 2:
            raise DeploymentError("No previous deployment found for rollback")
        
        previous_deployment = env_deployments[-2]
        
        self.log(f"Rolling back to deployment: {previous_deployment['deployment_id']}")
        self.log(f"Commit: {previous_deployment['commit_hash']}")
        
        # Set rollback parameters
        self.args.tag = None
        self.args.branch = None
        
        # Checkout previous commit
        if self.args.environment == 'docker':
            # For Docker, we need to rebuild from the previous commit
            self.run_command(
                ['git', 'checkout', previous_deployment['commit_hash']],
                f"Checking out previous commit: {previous_deployment['commit_hash']}"
            )
            self.deploy_docker()
        else:
            # For remote deployment, checkout on remote server
            host = self.env_config.get('host')
            user = self.env_config.get('user')
            path = self.env_config.get('path')
            
            self.run_command(
                ['ssh', f'{user}@{host}', f'cd {path} && git checkout {previous_deployment["commit_hash"]}'],
                f"Rolling back to commit: {previous_deployment['commit_hash']}"
            )
            
            # Restart services
            self.run_command(
                ['ssh', f'{user}@{host}', 'sudo systemctl restart gunicorn'],
                "Restarting application server"
            )
        
        self.log("Rollback completed", 'SUCCESS')

    def cleanup_old_deployments(self):
        """Clean up old deployment artifacts."""
        self.log("Cleaning up old deployment artifacts")
        
        # Remove old log files (keep last 20)
        log_files = sorted(self.deployment_dir.glob('deployment_*.log'))
        for log_file in log_files[:-20]:
            log_file.unlink()
        
        # Remove old backup files (keep last 10)
        backup_files = sorted(self.deployment_dir.glob('backup_*.sql'))
        for backup_file in backup_files[:-10]:
            backup_file.unlink()
        
        self.log("Cleanup completed", 'SUCCESS')

    def deploy(self):
        """Run the complete deployment process."""
        try:
            deployment_info = self.get_deployment_info()
            
            self.print_header(f"DEPLOYING TO {self.args.environment.upper()}")
            self.log(f"Deployment ID: {deployment_info['deployment_id']}")
            self.log(f"Reference: {deployment_info['ref']} ({deployment_info['ref_type']})")
            self.log(f"Commit: {deployment_info['commit_hash']}")
            
            if self.args.rollback:
                self.rollback_deployment()
            else:
                self.check_prerequisites()
                self.run_tests()
                self.backup_database()
                self.deploy_code()
                self.run_health_check()
                self.save_deployment_info(deployment_info)
            
            self.cleanup_old_deployments()
            
            self.log(f"Deployment to {self.args.environment} completed successfully!", 'SUCCESS')
            
        except KeyboardInterrupt:
            self.log("Deployment interrupted by user", 'ERROR')
            sys.exit(1)
        except DeploymentError as e:
            self.log(f"Deployment failed: {e}", 'ERROR')
            sys.exit(1)
        except Exception as e:
            self.log(f"Unexpected error: {e}", 'ERROR')
            sys.exit(1)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Edulink Backend Deployment Script",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    # Environment argument
    parser.add_argument('environment', choices=['staging', 'production', 'docker'],
                       help='Deployment environment')
    
    # Deployment options
    parser.add_argument('--branch', help='Git branch to deploy')
    parser.add_argument('--tag', help='Git tag to deploy')
    parser.add_argument('--rollback', action='store_true',
                       help='Rollback to previous deployment')
    parser.add_argument('--dry-run', action='store_true',
                       help='Show what would be deployed without executing')
    parser.add_argument('--skip-tests', action='store_true',
                       help='Skip running tests before deployment')
    parser.add_argument('--skip-backup', action='store_true',
                       help='Skip database backup before deployment')
    parser.add_argument('--force', action='store_true',
                       help='Force deployment even if checks fail')
    parser.add_argument('--verbose', action='store_true',
                       help='Enable verbose output')
    
    args = parser.parse_args()
    
    # Create and run deployment manager
    deployment_manager = DeploymentManager(args)
    deployment_manager.deploy()


if __name__ == '__main__':
    main()