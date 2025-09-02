#!/usr/bin/env python
"""
Edulink Backend Setup Script

This script automates the initial setup and configuration of the Edulink
internship management system backend.

Usage:
    python setup.py [options]

Options:
    --dev           Setup for development environment
    --prod          Setup for production environment
    --test          Setup for testing environment
    --docker        Setup for Docker environment
    --reset         Reset the database and start fresh
    --no-migrate    Skip database migrations
    --no-static     Skip static files collection
    --no-superuser  Skip superuser creation
    --help          Show this help message

Examples:
    python setup.py --dev
    python setup.py --prod --no-superuser
    python setup.py --test --reset
"""

import os
import sys
import subprocess
import argparse
import getpass
from pathlib import Path
from typing import List, Optional

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Django setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Edulink.settings.dev')

try:
    import django
    from django.conf import settings
    from django.core.management import execute_from_command_line, call_command
    from django.contrib.auth import get_user_model
    from django.db import connection
    django.setup()
except ImportError as e:
    print(f"Error importing Django: {e}")
    print("Please ensure Django is installed: pip install -r requirements.txt")
    sys.exit(1)


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


class SetupManager:
    """Manages the setup process for the Edulink backend."""

    def __init__(self, args):
        self.args = args
        self.project_root = project_root
        self.env_file = self.project_root / '.env'
        
    def print_header(self, message: str):
        """Print a formatted header message."""
        print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}")
        print(f"{Colors.HEADER}{Colors.BOLD}{message.center(60)}{Colors.ENDC}")
        print(f"{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}\n")

    def print_success(self, message: str):
        """Print a success message."""
        print(f"{Colors.OKGREEN}✓ {message}{Colors.ENDC}")

    def print_warning(self, message: str):
        """Print a warning message."""
        print(f"{Colors.WARNING}⚠ {message}{Colors.ENDC}")

    def print_error(self, message: str):
        """Print an error message."""
        print(f"{Colors.FAIL}✗ {message}{Colors.ENDC}")

    def print_info(self, message: str):
        """Print an info message."""
        print(f"{Colors.OKBLUE}ℹ {message}{Colors.ENDC}")

    def run_command(self, command: List[str], description: str, 
                   check: bool = True, capture_output: bool = False) -> Optional[subprocess.CompletedProcess]:
        """Run a shell command with error handling."""
        try:
            self.print_info(f"Running: {description}")
            result = subprocess.run(
                command,
                check=check,
                capture_output=capture_output,
                text=True,
                cwd=self.project_root
            )
            if capture_output and result.stdout:
                print(result.stdout)
            self.print_success(f"Completed: {description}")
            return result
        except subprocess.CalledProcessError as e:
            self.print_error(f"Failed: {description}")
            if capture_output and e.stderr:
                print(f"Error: {e.stderr}")
            if check:
                sys.exit(1)
            return None
        except FileNotFoundError:
            self.print_error(f"Command not found: {command[0]}")
            if check:
                sys.exit(1)
            return None

    def check_prerequisites(self):
        """Check if all prerequisites are installed."""
        self.print_header("CHECKING PREREQUISITES")
        
        # Check Python version
        python_version = sys.version_info
        if python_version < (3, 8):
            self.print_error(f"Python 3.8+ required, found {python_version.major}.{python_version.minor}")
            sys.exit(1)
        self.print_success(f"Python {python_version.major}.{python_version.minor}.{python_version.micro}")
        
        # Check if requirements.txt exists
        requirements_file = self.project_root / 'requirements.txt'
        if not requirements_file.exists():
            self.print_error("requirements.txt not found")
            sys.exit(1)
        self.print_success("requirements.txt found")
        
        # Check if manage.py exists
        manage_py = self.project_root / 'manage.py'
        if not manage_py.exists():
            self.print_error("manage.py not found")
            sys.exit(1)
        self.print_success("manage.py found")

    def setup_environment(self):
        """Setup environment variables."""
        self.print_header("SETTING UP ENVIRONMENT")
        
        env_example = self.project_root / '.env.example'
        
        if not self.env_file.exists():
            if env_example.exists():
                # Copy .env.example to .env
                import shutil
                shutil.copy2(env_example, self.env_file)
                self.print_success("Created .env file from .env.example")
                self.print_warning("Please update .env file with your specific configuration")
            else:
                self.print_warning(".env.example not found, creating basic .env file")
                self.create_basic_env_file()
        else:
            self.print_info(".env file already exists")
        
        # Set Django settings module based on environment
        if self.args.environment == 'production':
            settings_module = 'Edulink.settings.prod'
        elif self.args.environment == 'testing':
            settings_module = 'Edulink.settings.test'
        else:
            settings_module = 'Edulink.settings.dev'
        
        os.environ['DJANGO_SETTINGS_MODULE'] = settings_module
        self.print_success(f"Django settings: {settings_module}")

    def create_basic_env_file(self):
        """Create a basic .env file with minimal configuration."""
        basic_env_content = f"""# Basic Edulink Environment Configuration
SECRET_KEY=django-insecure-change-this-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=sqlite:///db.sqlite3
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/1
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
ENVIRONMENT={self.args.environment}
"""
        
        with open(self.env_file, 'w') as f:
            f.write(basic_env_content)
        self.print_success("Created basic .env file")

    def install_dependencies(self):
        """Install Python dependencies."""
        self.print_header("INSTALLING DEPENDENCIES")
        
        # Check if we're in a virtual environment
        if not hasattr(sys, 'real_prefix') and not (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
            self.print_warning("Not in a virtual environment. Consider using one.")
        
        # Install requirements
        pip_command = [sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt']
        if self.args.environment == 'development':
            pip_command.extend(['-r', 'requirements-dev.txt'])
        
        self.run_command(pip_command, "Installing Python dependencies")

    def setup_database(self):
        """Setup the database."""
        self.print_header("SETTING UP DATABASE")
        
        if self.args.reset:
            self.print_warning("Resetting database...")
            try:
                # Drop all tables
                call_command('flush', '--noinput')
                self.print_success("Database reset completed")
            except Exception as e:
                self.print_error(f"Database reset failed: {e}")
        
        if not self.args.no_migrate:
            try:
                # Check for pending migrations
                self.print_info("Checking for pending migrations...")
                call_command('showmigrations', '--plan')
                
                # Run migrations
                self.print_info("Running database migrations...")
                call_command('migrate')
                self.print_success("Database migrations completed")
            except Exception as e:
                self.print_error(f"Database migration failed: {e}")
                sys.exit(1)

    def collect_static_files(self):
        """Collect static files."""
        if not self.args.no_static and self.args.environment in ['production', 'staging']:
            self.print_header("COLLECTING STATIC FILES")
            try:
                call_command('collectstatic', '--noinput')
                self.print_success("Static files collected")
            except Exception as e:
                self.print_error(f"Static files collection failed: {e}")

    def create_superuser(self):
        """Create a superuser account."""
        if not self.args.no_superuser and self.args.environment != 'testing':
            self.print_header("CREATING SUPERUSER")
            
            User = get_user_model()
            
            # Check if superuser already exists
            if User.objects.filter(is_superuser=True).exists():
                self.print_info("Superuser already exists")
                return
            
            try:
                if self.args.environment == 'production':
                    # In production, require manual input
                    call_command('createsuperuser')
                else:
                    # In development, create with default credentials
                    username = input("Enter superuser username (default: admin): ") or "admin"
                    email = input("Enter superuser email (default: admin@edulink.com): ") or "admin@edulink.com"
                    password = getpass.getpass("Enter superuser password (default: admin123): ") or "admin123"
                    
                    User.objects.create_superuser(
                        username=username,
                        email=email,
                        password=password
                    )
                    self.print_success(f"Superuser '{username}' created")
            except Exception as e:
                self.print_error(f"Superuser creation failed: {e}")

    def load_initial_data(self):
        """Load initial data fixtures."""
        self.print_header("LOADING INITIAL DATA")
        
        fixtures_dir = self.project_root / 'fixtures'
        if fixtures_dir.exists():
            fixture_files = list(fixtures_dir.glob('*.json'))
            if fixture_files:
                for fixture_file in fixture_files:
                    try:
                        call_command('loaddata', str(fixture_file))
                        self.print_success(f"Loaded fixture: {fixture_file.name}")
                    except Exception as e:
                        self.print_warning(f"Failed to load fixture {fixture_file.name}: {e}")
            else:
                self.print_info("No fixture files found")
        else:
            self.print_info("Fixtures directory not found")

    def setup_docker(self):
        """Setup Docker environment."""
        if self.args.docker:
            self.print_header("SETTING UP DOCKER ENVIRONMENT")
            
            # Check if Docker is installed
            docker_check = self.run_command(
                ['docker', '--version'],
                "Checking Docker installation",
                check=False,
                capture_output=True
            )
            
            if docker_check is None:
                self.print_error("Docker not found. Please install Docker first.")
                return
            
            # Check if docker-compose.yml exists
            docker_compose_file = self.project_root / 'docker-compose.yml'
            if not docker_compose_file.exists():
                self.print_error("docker-compose.yml not found")
                return
            
            # Build Docker images
            self.run_command(
                ['docker-compose', 'build'],
                "Building Docker images"
            )
            
            # Start services
            self.run_command(
                ['docker-compose', 'up', '-d', 'db', 'redis'],
                "Starting database and Redis services"
            )
            
            self.print_success("Docker environment setup completed")

    def run_health_check(self):
        """Run application health check."""
        self.print_header("RUNNING HEALTH CHECK")
        
        try:
            # Check database connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            self.print_success("Database connection: OK")
            
            # Check Django configuration
            call_command('check')
            self.print_success("Django configuration: OK")
            
            # Run health check script if available
            health_check_script = self.project_root / 'health_check.py'
            if health_check_script.exists():
                self.run_command(
                    [sys.executable, str(health_check_script)],
                    "Running comprehensive health check"
                )
            
        except Exception as e:
            self.print_error(f"Health check failed: {e}")

    def print_completion_message(self):
        """Print setup completion message."""
        self.print_header("SETUP COMPLETED")
        
        print(f"{Colors.OKGREEN}🎉 Edulink backend setup completed successfully!{Colors.ENDC}\n")
        
        print(f"{Colors.OKBLUE}Next steps:{Colors.ENDC}")
        print(f"  1. Review and update the .env file with your configuration")
        print(f"  2. Start the development server: python manage.py runserver")
        print(f"  3. Access the admin interface: http://localhost:8000/admin/")
        print(f"  4. Access the API documentation: http://localhost:8000/api/docs/")
        
        if self.args.docker:
            print(f"\n{Colors.OKBLUE}Docker commands:{Colors.ENDC}")
            print(f"  • Start all services: docker-compose up")
            print(f"  • Stop all services: docker-compose down")
            print(f"  • View logs: docker-compose logs -f")
        
        print(f"\n{Colors.OKBLUE}Useful commands:{Colors.ENDC}")
        print(f"  • Run tests: python manage.py test")
        print(f"  • Create migrations: python manage.py makemigrations")
        print(f"  • Django shell: python manage.py shell")
        print(f"  • Check code quality: make lint")
        print(f"  • Run health check: python health_check.py")
        
        print(f"\n{Colors.WARNING}Important:{Colors.ENDC}")
        print(f"  • Never commit the .env file to version control")
        print(f"  • Change the SECRET_KEY in production")
        print(f"  • Use strong passwords for database and admin accounts")
        print(f"  • Enable HTTPS in production environments")

    def run_setup(self):
        """Run the complete setup process."""
        try:
            self.print_header(f"EDULINK BACKEND SETUP - {self.args.environment.upper()}")
            
            self.check_prerequisites()
            self.setup_environment()
            
            if not self.args.docker:
                self.install_dependencies()
            
            self.setup_docker()
            self.setup_database()
            self.collect_static_files()
            self.create_superuser()
            self.load_initial_data()
            self.run_health_check()
            
            self.print_completion_message()
            
        except KeyboardInterrupt:
            self.print_error("\nSetup interrupted by user")
            sys.exit(1)
        except Exception as e:
            self.print_error(f"Setup failed: {e}")
            sys.exit(1)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Edulink Backend Setup Script",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    # Environment options
    env_group = parser.add_mutually_exclusive_group()
    env_group.add_argument('--dev', action='store_const', const='development', dest='environment',
                          help='Setup for development environment (default)')
    env_group.add_argument('--prod', action='store_const', const='production', dest='environment',
                          help='Setup for production environment')
    env_group.add_argument('--test', action='store_const', const='testing', dest='environment',
                          help='Setup for testing environment')
    
    # Setup options
    parser.add_argument('--docker', action='store_true',
                       help='Setup for Docker environment')
    parser.add_argument('--reset', action='store_true',
                       help='Reset the database and start fresh')
    parser.add_argument('--no-migrate', action='store_true',
                       help='Skip database migrations')
    parser.add_argument('--no-static', action='store_true',
                       help='Skip static files collection')
    parser.add_argument('--no-superuser', action='store_true',
                       help='Skip superuser creation')
    
    # Set default environment
    parser.set_defaults(environment='development')
    
    args = parser.parse_args()
    
    # Create and run setup manager
    setup_manager = SetupManager(args)
    setup_manager.run_setup()


if __name__ == '__main__':
    main()