# Edulink Development Guide

Comprehensive guide for developers working on the Edulink backend system.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Environment](#development-environment)
3. [Project Structure](#project-structure)
4. [Coding Standards](#coding-standards)
5. [Testing Guidelines](#testing-guidelines)
6. [Database Development](#database-development)
7. [API Development](#api-development)
8. [Security Guidelines](#security-guidelines)
9. [Performance Optimization](#performance-optimization)
10. [Debugging](#debugging)
11. [Contributing](#contributing)
12. [Best Practices](#best-practices)

## Getting Started

### Prerequisites

- **Python 3.9+**: Latest stable version recommended
- **Git**: For version control
- **IDE**: VS Code, PyCharm, or similar with Python support
- **Database**: PostgreSQL (production) or SQLite (development)
- **Cache**: Redis (optional for development)

### Quick Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Edulink
   ```

2. **Set up virtual environment**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env.dev
   # Edit .env.dev with your settings
   ```

5. **Set up database**
   ```bash
   python manage.py migrate
   python manage.py createsuperuser
   ```

6. **Run development server**
   ```bash
   python manage.py runserver
   ```

### IDE Configuration

#### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "python.defaultInterpreterPath": "./.venv/bin/python",
  "python.linting.enabled": true,
  "python.linting.flake8Enabled": true,
  "python.linting.mypyEnabled": true,
  "python.formatting.provider": "black",
  "python.formatting.blackArgs": ["--line-length=88"],
  "python.sortImports.args": ["--profile", "black"],
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  },
  "files.exclude": {
    "**/__pycache__": true,
    "**/*.pyc": true,
    ".mypy_cache": true,
    ".pytest_cache": true
  }
}
```

#### PyCharm Configuration

1. **Set Python interpreter**: File → Settings → Project → Python Interpreter
2. **Enable Django support**: File → Settings → Languages & Frameworks → Django
3. **Configure code style**: File → Settings → Editor → Code Style → Python
4. **Set up run configurations**: Run → Edit Configurations

## Development Environment

### Environment Variables

Create `.env.dev` for development:

```env
# Django
DJANGO_SETTINGS_MODULE=Edulink.settings.dev
DEBUG=True
SECRET_KEY=dev-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=sqlite:///db.sqlite3

# Email
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend

# Security
CSRF_TRUSTED_ORIGINS=http://localhost:3000
CORS_ALLOWED_ORIGINS=http://localhost:3000

# Development tools
DEBUG_TOOLBAR=True
LOG_LEVEL=DEBUG
```

### Development Tools

Install additional development tools:

```bash
pip install black flake8 mypy isort pre-commit django-debug-toolbar
```

### Pre-commit Hooks

Create `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files

  - repo: https://github.com/psf/black
    rev: 23.3.0
    hooks:
      - id: black
        language_version: python3

  - repo: https://github.com/pycqa/flake8
    rev: 6.0.0
    hooks:
      - id: flake8

  - repo: https://github.com/pycqa/isort
    rev: 5.12.0
    hooks:
      - id: isort
        args: ["--profile", "black"]

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.3.0
    hooks:
      - id: mypy
        additional_dependencies: [django-stubs]
```

Install pre-commit hooks:

```bash
pre-commit install
```

## Project Structure

### Directory Layout

```
Edulink/
├── Edulink/                    # Main project package
│   ├── settings/               # Settings modules
│   │   ├── __init__.py
│   │   ├── base.py            # Base settings
│   │   ├── dev.py             # Development settings
│   │   ├── prod.py            # Production settings
│   │   └── test.py            # Test settings
│   ├── urls.py                # Main URL configuration
│   ├── wsgi.py                # WSGI configuration
│   └── asgi.py                # ASGI configuration
├── apps/                       # Django applications
│   ├── authentication/        # User authentication
│   ├── users/                 # User management
│   ├── internship/            # Internship management
│   ├── application/           # Application management
│   ├── internship_progress/   # Progress tracking
│   ├── notifications/         # Notification system
│   └── dashboards/           # Dashboard views
├── monitoring/                # Monitoring and logging
├── security/                  # Security utilities
├── tests/                     # Test utilities
├── docs/                      # Documentation
├── requirements.txt           # Dependencies
├── pytest.ini               # Test configuration
└── manage.py                 # Django management
```

### App Structure

Each Django app follows this structure:

```
app_name/
├── __init__.py
├── admin.py                   # Django admin configuration
├── apps.py                    # App configuration
├── models.py                  # Database models
├── views.py                   # View functions/classes
├── serializers.py             # DRF serializers
├── urls.py                    # URL patterns
├── permissions.py             # Custom permissions
├── signals.py                 # Django signals
├── tests.py                   # Tests
├── migrations/                # Database migrations
└── management/                # Custom management commands
    └── commands/
```

## Coding Standards

### Python Style Guide

We follow PEP 8 with these specific guidelines:

- **Line length**: 88 characters (Black default)
- **Imports**: Use isort with Black profile
- **Docstrings**: Google style docstrings
- **Type hints**: Use type hints for all functions

### Code Formatting

```bash
# Format code
black .

# Sort imports
isort .

# Check linting
flake8 .

# Type checking
mypy .
```

### Naming Conventions

- **Variables/Functions**: `snake_case`
- **Classes**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Files/Modules**: `snake_case`
- **URLs**: `kebab-case`

### Example Code Style

```python
from typing import List, Optional
from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """Custom user model with additional fields.
    
    Attributes:
        role: User role (student, employer, institution)
        is_verified: Whether the user's email is verified
    """
    
    ROLE_CHOICES = [
        ('student', 'Student'),
        ('employer', 'Employer'),
        ('institution', 'Institution'),
    ]
    
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='student'
    )
    is_verified = models.BooleanField(default=False)
    
    def get_profile(self) -> Optional[models.Model]:
        """Get the user's profile based on their role.
        
        Returns:
            The user's profile instance or None if not found.
        """
        if self.role == 'student':
            return getattr(self, 'studentprofile', None)
        elif self.role == 'employer':
            return getattr(self, 'employerprofile', None)
        elif self.role == 'institution':
            return getattr(self, 'institutionprofile', None)
        return None
```

### Documentation Standards

```python
def create_internship(
    title: str,
    company: str,
    location: str,
    requirements: List[str],
    **kwargs
) -> 'Internship':
    """Create a new internship listing.
    
    Args:
        title: The internship title
        company: Company name
        location: Internship location
        requirements: List of required skills
        **kwargs: Additional internship fields
    
    Returns:
        The created Internship instance
    
    Raises:
        ValidationError: If required fields are missing
        PermissionError: If user lacks permission to create internships
    
    Example:
        >>> internship = create_internship(
        ...     title="Software Developer Intern",
        ...     company="Tech Corp",
        ...     location="San Francisco",
        ...     requirements=["Python", "Django"]
        ... )
    """
    # Implementation here
    pass
```

## Testing Guidelines

### Test Structure

Organize tests by functionality:

```python
import pytest
from django.test import TestCase
from rest_framework.test import APITestCase
from tests.factories import UserFactory, InternshipFactory


class InternshipModelTest(TestCase):
    """Test cases for Internship model."""
    
    def setUp(self):
        self.user = UserFactory(role='employer')
        self.internship = InternshipFactory(employer=self.user.employerprofile)
    
    def test_string_representation(self):
        """Test the string representation of internship."""
        expected = f"{self.internship.title} at {self.internship.company}"
        self.assertEqual(str(self.internship), expected)
    
    def test_is_active_property(self):
        """Test the is_active property."""
        self.assertTrue(self.internship.is_active)


class InternshipAPITest(APITestCase):
    """Test cases for Internship API endpoints."""
    
    def setUp(self):
        self.employer = UserFactory(role='employer')
        self.student = UserFactory(role='student')
        self.internship = InternshipFactory(employer=self.employer.employerprofile)
    
    def test_list_internships(self):
        """Test listing internships."""
        response = self.client.get('/api/internships/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 1)
    
    @pytest.mark.integration
    def test_create_internship_workflow(self):
        """Test complete internship creation workflow."""
        self.client.force_authenticate(user=self.employer)
        data = {
            'title': 'Backend Developer Intern',
            'location': 'Remote',
            'requirements': ['Python', 'Django']
        }
        response = self.client.post('/api/internships/', data)
        self.assertEqual(response.status_code, 201)
```

### Test Categories

Use pytest markers to categorize tests:

```python
@pytest.mark.unit
def test_user_creation():
    """Unit test for user creation."""
    pass

@pytest.mark.integration
def test_application_workflow():
    """Integration test for application workflow."""
    pass

@pytest.mark.api
def test_api_endpoint():
    """API endpoint test."""
    pass

@pytest.mark.slow
def test_performance_heavy_operation():
    """Performance test that takes time."""
    pass
```

### Running Tests

```bash
# Run all tests
pytest

# Run specific categories
pytest -m unit
pytest -m integration
pytest -m "not slow"

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test file
pytest application/tests.py

# Run with verbose output
pytest -v

# Run failed tests only
pytest --lf
```

### Test Factories

Use factories for consistent test data:

```python
import factory
from django.contrib.auth import get_user_model
from .models import Internship

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
    
    username = factory.Sequence(lambda n: f"user{n}@example.com")
    email = factory.LazyAttribute(lambda obj: obj.username)
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    role = 'student'
    is_verified = True


class InternshipFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Internship
    
    title = factory.Faker('job')
    company = factory.Faker('company')
    location = factory.Faker('city')
    description = factory.Faker('text')
    requirements = factory.List(['Python', 'Django'])
    is_active = True
```

## Database Development

### Model Design

```python
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class BaseModel(models.Model):
    """Abstract base model with common fields."""
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        abstract = True


class Internship(BaseModel):
    """Internship listing model."""
    
    title = models.CharField(max_length=200)
    company = models.CharField(max_length=100)
    location = models.CharField(max_length=100)
    description = models.TextField()
    requirements = models.JSONField(default=list)
    duration = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)
    
    # Foreign keys
    employer = models.ForeignKey(
        'users.EmployerProfile',
        on_delete=models.CASCADE,
        related_name='internships'
    )
    
    class Meta:
        db_table = 'internships'
        indexes = [
            models.Index(fields=['is_active', 'created_at']),
            models.Index(fields=['location']),
            models.Index(fields=['employer']),
        ]
        ordering = ['-created_at']
    
    def __str__(self) -> str:
        return f"{self.title} at {self.company}"
    
    @property
    def applications_count(self) -> int:
        """Get the number of applications for this internship."""
        return self.applications.count()
```

### Migrations

```bash
# Create migration
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Show migration status
python manage.py showmigrations

# Create empty migration
python manage.py makemigrations --empty app_name

# Squash migrations
python manage.py squashmigrations app_name 0001 0004
```

### Custom Migration Example

```python
from django.db import migrations


def populate_skills(apps, schema_editor):
    """Populate default skills."""
    SkillTag = apps.get_model('internship', 'SkillTag')
    default_skills = [
        'Python', 'JavaScript', 'Java', 'C++', 'React',
        'Django', 'Node.js', 'SQL', 'Git', 'Docker'
    ]
    
    for skill in default_skills:
        SkillTag.objects.get_or_create(name=skill)


def reverse_populate_skills(apps, schema_editor):
    """Reverse the population."""
    SkillTag = apps.get_model('internship', 'SkillTag')
    SkillTag.objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ('internship', '0001_initial'),
    ]
    
    operations = [
        migrations.RunPython(
            populate_skills,
            reverse_populate_skills
        ),
    ]
```

### Query Optimization

```python
# Use select_related for foreign keys
internships = Internship.objects.select_related('employer__user').all()

# Use prefetch_related for reverse foreign keys
internships = Internship.objects.prefetch_related('applications').all()

# Combine both
internships = Internship.objects.select_related(
    'employer__user'
).prefetch_related(
    'applications__student__user'
).all()

# Use only() to limit fields
internships = Internship.objects.only(
    'title', 'company', 'location'
).all()

# Use defer() to exclude fields
internships = Internship.objects.defer('description').all()

# Use annotations for aggregations
from django.db.models import Count
internships = Internship.objects.annotate(
    application_count=Count('applications')
).all()
```

## API Development

### Serializer Design

```python
from rest_framework import serializers
from .models import Internship, Application


class InternshipListSerializer(serializers.ModelSerializer):
    """Serializer for internship list view."""
    
    applications_count = serializers.IntegerField(read_only=True)
    employer_name = serializers.CharField(
        source='employer.company_name',
        read_only=True
    )
    
    class Meta:
        model = Internship
        fields = [
            'id', 'title', 'company', 'location', 'duration',
            'created_at', 'applications_count', 'employer_name'
        ]


class InternshipDetailSerializer(serializers.ModelSerializer):
    """Serializer for internship detail view."""
    
    employer = serializers.StringRelatedField(read_only=True)
    can_apply = serializers.SerializerMethodField()
    user_has_applied = serializers.SerializerMethodField()
    
    class Meta:
        model = Internship
        fields = '__all__'
    
    def get_can_apply(self, obj) -> bool:
        """Check if current user can apply."""
        user = self.context['request'].user
        if not user.is_authenticated or user.role != 'student':
            return False
        return not obj.applications.filter(student__user=user).exists()
    
    def get_user_has_applied(self, obj) -> bool:
        """Check if current user has applied."""
        user = self.context['request'].user
        if not user.is_authenticated:
            return False
        return obj.applications.filter(student__user=user).exists()


class InternshipCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating internships."""
    
    class Meta:
        model = Internship
        exclude = ['employer', 'created_at', 'updated_at']
    
    def validate_requirements(self, value):
        """Validate requirements field."""
        if not isinstance(value, list):
            raise serializers.ValidationError(
                "Requirements must be a list of strings."
            )
        if len(value) == 0:
            raise serializers.ValidationError(
                "At least one requirement is needed."
            )
        return value
    
    def create(self, validated_data):
        """Create internship with current user as employer."""
        user = self.context['request'].user
        validated_data['employer'] = user.employerprofile
        return super().create(validated_data)
```

### ViewSet Design

```python
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import Internship
from .serializers import (
    InternshipListSerializer,
    InternshipDetailSerializer,
    InternshipCreateSerializer
)
from .permissions import IsEmployerOrReadOnly
from .filters import InternshipFilter


class InternshipViewSet(viewsets.ModelViewSet):
    """ViewSet for internship management."""
    
    queryset = Internship.objects.select_related(
        'employer__user'
    ).prefetch_related(
        'applications'
    ).all()
    permission_classes = [IsAuthenticated, IsEmployerOrReadOnly]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter
    ]
    filterset_class = InternshipFilter
    search_fields = ['title', 'company', 'description']
    ordering_fields = ['created_at', 'title', 'company']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """Return appropriate serializer class."""
        if self.action == 'list':
            return InternshipListSerializer
        elif self.action == 'create':
            return InternshipCreateSerializer
        return InternshipDetailSerializer
    
    def get_queryset(self):
        """Filter queryset based on user role."""
        queryset = super().get_queryset()
        user = self.request.user
        
        if user.role == 'employer':
            # Employers see only their internships
            return queryset.filter(employer__user=user)
        elif user.role == 'student':
            # Students see only active internships
            return queryset.filter(is_active=True)
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def apply(self, request, pk=None):
        """Apply for an internship."""
        internship = self.get_object()
        
        if request.user.role != 'student':
            return Response(
                {'error': 'Only students can apply for internships'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if already applied
        if internship.applications.filter(
            student__user=request.user
        ).exists():
            return Response(
                {'error': 'You have already applied for this internship'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create application
        application = Application.objects.create(
            internship=internship,
            student=request.user.studentprofile,
            cover_letter=request.data.get('cover_letter', '')
        )
        
        return Response(
            {'message': 'Application submitted successfully'},
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['get'])
    def applications(self, request, pk=None):
        """Get applications for an internship (employers only)."""
        internship = self.get_object()
        
        if request.user != internship.employer.user:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        applications = internship.applications.select_related(
            'student__user'
        ).all()
        
        # Serialize applications
        from .serializers import ApplicationSerializer
        serializer = ApplicationSerializer(applications, many=True)
        
        return Response(serializer.data)
```

### Custom Permissions

```python
from rest_framework import permissions


class IsEmployerOrReadOnly(permissions.BasePermission):
    """Allow employers to create/edit, others to read only."""
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.role == 'employer'
    
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.employer.user == request.user


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Allow owners to edit, others to read only."""
    
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.user == request.user
```

## Security Guidelines

### Input Validation

```python
from django.core.validators import validate_email
from rest_framework import serializers
import re


class UserRegistrationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8)
    
    def validate_password(self, value):
        """Validate password strength."""
        if not re.search(r'[A-Z]', value):
            raise serializers.ValidationError(
                "Password must contain at least one uppercase letter."
            )
        if not re.search(r'[a-z]', value):
            raise serializers.ValidationError(
                "Password must contain at least one lowercase letter."
            )
        if not re.search(r'\d', value):
            raise serializers.ValidationError(
                "Password must contain at least one digit."
            )
        return value
    
    def validate_email(self, value):
        """Validate email format and domain."""
        validate_email(value)
        
        # Block disposable email domains
        disposable_domains = ['tempmail.com', '10minutemail.com']
        domain = value.split('@')[1].lower()
        if domain in disposable_domains:
            raise serializers.ValidationError(
                "Disposable email addresses are not allowed."
            )
        
        return value
```

### Authentication & Authorization

```python
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
from django.utils import timezone


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom JWT token serializer with additional validation."""
    
    def validate(self, attrs):
        # Check if user is verified
        user = authenticate(
            username=attrs['username'],
            password=attrs['password']
        )
        
        if user and not user.is_verified:
            raise serializers.ValidationError(
                "Please verify your email before logging in."
            )
        
        # Update last login
        if user:
            user.last_login = timezone.now()
            user.save(update_fields=['last_login'])
        
        data = super().validate(attrs)
        
        # Add custom claims
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'role': self.user.role,
        }
        
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
```

### Rate Limiting

```python
from security.rate_limiting import custom_rate_limit


class AuthViewSet(viewsets.ViewSet):
    """Authentication endpoints with rate limiting."""
    
    @custom_rate_limit(group='auth', rate='5/min')
    def login(self, request):
        """Login endpoint with rate limiting."""
        # Implementation here
        pass
    
    @custom_rate_limit(group='auth', rate='3/min')
    def register(self, request):
        """Registration endpoint with rate limiting."""
        # Implementation here
        pass
```

## Performance Optimization

### Database Optimization

```python
# Use select_related for foreign keys
users = User.objects.select_related('studentprofile').all()

# Use prefetch_related for reverse foreign keys
internships = Internship.objects.prefetch_related(
    'applications__student__user'
).all()

# Use annotations for aggregations
from django.db.models import Count, Avg
internships = Internship.objects.annotate(
    application_count=Count('applications'),
    avg_rating=Avg('applications__rating')
).all()

# Use bulk operations
Internship.objects.bulk_create(internship_list)
Internship.objects.bulk_update(internship_list, ['is_active'])

# Use raw SQL for complex queries
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute(
        "SELECT * FROM internships WHERE created_at > %s",
        [last_week]
    )
    results = cursor.fetchall()
```

### Caching

```python
from django.core.cache import cache
from django.views.decorators.cache import cache_page
from rest_framework.decorators import action


class InternshipViewSet(viewsets.ModelViewSet):
    
    @cache_page(60 * 15)  # Cache for 15 minutes
    @action(detail=False)
    def popular(self, request):
        """Get popular internships."""
        cache_key = 'popular_internships'
        internships = cache.get(cache_key)
        
        if internships is None:
            internships = Internship.objects.annotate(
                application_count=Count('applications')
            ).order_by('-application_count')[:10]
            cache.set(cache_key, internships, 60 * 30)  # 30 minutes
        
        serializer = self.get_serializer(internships, many=True)
        return Response(serializer.data)
```

### Pagination

```python
from rest_framework.pagination import PageNumberPagination


class CustomPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
    
    def get_paginated_response(self, data):
        return Response({
            'count': self.page.paginator.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'total_pages': self.page.paginator.num_pages,
            'current_page': self.page.number,
            'results': data
        })
```

## Debugging

### Django Debug Toolbar

Add to development settings:

```python
# settings/dev.py
if DEBUG:
    INSTALLED_APPS += ['debug_toolbar']
    MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
    
    INTERNAL_IPS = ['127.0.0.1']
    
    DEBUG_TOOLBAR_CONFIG = {
        'SHOW_TOOLBAR_CALLBACK': lambda request: DEBUG,
    }
```

### Logging Configuration

```python
# settings/base.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': 'logs/django.log',
            'formatter': 'verbose',
        },
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': True,
        },
        'edulink': {
            'handlers': ['file', 'console'],
            'level': 'DEBUG',
            'propagate': True,
        },
    },
}
```

### Custom Debug Commands

```python
# management/commands/debug_user.py
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Debug user information'
    
    def add_arguments(self, parser):
        parser.add_argument('user_id', type=int)
    
    def handle(self, *args, **options):
        user_id = options['user_id']
        
        try:
            user = User.objects.get(id=user_id)
            self.stdout.write(f"User: {user.username}")
            self.stdout.write(f"Role: {user.role}")
            self.stdout.write(f"Verified: {user.is_verified}")
            
            if hasattr(user, 'studentprofile'):
                profile = user.studentprofile
                self.stdout.write(f"University: {profile.university}")
                self.stdout.write(f"GPA: {profile.gpa}")
            
        except User.DoesNotExist:
            self.stderr.write(f"User with ID {user_id} not found")
```

## Contributing

### Git Workflow

1. **Create feature branch**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Make changes and commit**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. **Push and create PR**
   ```bash
   git push origin feature/new-feature
   ```

### Commit Message Format

Use conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

Examples:
```
feat(auth): add JWT token refresh endpoint
fix(api): resolve pagination issue in internship list
docs(readme): update installation instructions
test(models): add tests for user model validation
```

### Code Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No security vulnerabilities
- [ ] Performance considerations addressed
- [ ] Error handling implemented
- [ ] Logging added where appropriate

## Best Practices

### General Guidelines

1. **Keep it simple**: Write clear, readable code
2. **DRY principle**: Don't repeat yourself
3. **SOLID principles**: Follow object-oriented design principles
4. **Test-driven development**: Write tests first
5. **Security first**: Always consider security implications
6. **Performance matters**: Optimize database queries
7. **Document everything**: Code should be self-documenting

### Django-Specific Best Practices

1. **Use Django's built-in features**: Don't reinvent the wheel
2. **Follow Django conventions**: Use Django's naming conventions
3. **Keep views thin**: Move business logic to models or services
4. **Use migrations**: Never modify database directly
5. **Validate data**: Use Django forms and serializers
6. **Handle errors gracefully**: Provide meaningful error messages
7. **Use transactions**: Wrap related operations in transactions

### API Design Best Practices

1. **RESTful design**: Follow REST principles
2. **Consistent naming**: Use consistent URL patterns
3. **Proper HTTP status codes**: Return appropriate status codes
4. **Pagination**: Implement pagination for list endpoints
5. **Filtering and search**: Provide filtering capabilities
6. **Rate limiting**: Implement rate limiting
7. **Versioning**: Plan for API versioning

### Security Best Practices

1. **Input validation**: Validate all user inputs
2. **Authentication**: Use strong authentication mechanisms
3. **Authorization**: Implement proper permissions
4. **HTTPS**: Use HTTPS in production
5. **Secrets management**: Never commit secrets to version control
6. **Regular updates**: Keep dependencies updated
7. **Security headers**: Implement security headers

---

## Useful Commands

### Django Management Commands

```bash
# Create superuser
python manage.py createsuperuser

# Run development server
python manage.py runserver

# Create new app
python manage.py startapp app_name

# Make migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic

# Open Django shell
python manage.py shell

# Load fixtures
python manage.py loaddata fixtures/sample_data.json

# Create fixtures
python manage.py dumpdata app_name.Model --indent 2 > fixtures/data.json
```

### Testing Commands

```bash
# Run all tests
pytest

# Run specific test file
pytest application/tests.py

# Run with coverage
pytest --cov=. --cov-report=html

# Run only failed tests
pytest --lf

# Run tests in parallel
pytest -n auto
```

### Code Quality Commands

```bash
# Format code
black .

# Sort imports
isort .

# Lint code
flake8 .

# Type checking
mypy .

# Security check
bandit -r .

# Dependency check
safety check
```

---

For more information, refer to the [API Documentation](API_DOCUMENTATION.md) and [Deployment Guide](DEPLOYMENT_GUIDE.md).