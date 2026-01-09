# Codebase Organization Guide

## Edulink Internship Management Platform - Beta Version 1.0

### Project Structure Overview

---

## Root Directory Structure

```
Edulink/
├── Edulink/                    # Main Django project directory
│   ├── __init__.py
│   ├── asgi.py                 # ASGI configuration
│   ├── wsgi.py                 # WSGI configuration
│   ├── urls.py                 # Main URL routing
│   └── settings/               # Settings modules
│       ├── __init__.py
│       ├── base.py             # Base settings
│       ├── dev.py              # Development settings
│       ├── prod.py             # Production settings
│       └── test.py             # Testing settings
├── applications/               # Django applications
├── static/                     # Static files
├── media/                      # User-uploaded files
├── templates/                  # Global templates
├── docs/                       # Project documentation
├── requirements.txt            # Python dependencies
├── manage.py                   # Django management script
├── .env                        # Environment variables
├── .gitignore                  # Git ignore rules
└── README.md                   # Project overview
```

---

## Django Applications Structure

### Core Applications

#### 1. **Authentication App** (`authentication/`)
```
authentication/
├── __init__.py
├── admin.py                    # Admin interface customization
├── apps.py                     # App configuration
├── models.py                   # Authentication models
├── views.py                    # Authentication views
├── serializers.py              # DRF serializers
├── urls.py                     # URL patterns
├── permissions.py              # Custom permissions
├── tests.py                    # Unit tests
├── migrations/                 # Database migrations
│   ├── __init__.py
│   └── 0001_initial.py
├── management/                 # Custom management commands
│   ├── __init__.py
│   └── commands/
│       ├── __init__.py
│       └── create_superuser.py
└── templates/                  # Authentication templates
    └── authentication/
        ├── login.html
        ├── register.html
        └── password_reset.html
```

#### 2. **Users App** (`users/`)
```
users/
├── __init__.py
├── admin.py
├── apps.py
├── models.py                   # Base user model
├── urls.py
├── tests.py
├── migrations/
├── management/
│   └── commands/
│       └── create_test_users.py
├── models/                     # Modular model organization
│   ├── __init__.py
│   ├── base.py                 # Base user models
│   ├── profiles.py             # User profile models
│   ├── roles.py                # Role-based models
│   ├── settings.py             # User settings
│   └── permissions.py          # Permission models
├── serializers/                # Modular serializers
│   ├── __init__.py
│   ├── profile_serializers.py
│   ├── role_serializers.py
│   └── settings_serializers.py
└── views/                      # Modular views
    ├── __init__.py
    ├── profile_views.py
    ├── admin_views.py
    ├── employer_views.py
    ├── institution_views.py
    ├── role_views.py
    └── student_views.py
```

#### 3. **Internship App** (`internship/`)
```
internship/
├── __init__.py
├── admin.py
├── apps.py
├── urls.py
├── migrations/
├── models/                     # Domain-specific models
│   ├── __init__.py
│   ├── base.py                 # Base internship models
│   ├── internship.py           # Core internship logic
│   └── skill_tag.py            # Skills and tags
├── serializers/
│   ├── __init__.py
│   ├── internship_serializers.py
│   └── application_serializers.py
├── views/
│   ├── __init__.py
│   └── internship_views.py
├── permissions/
│   ├── __init__.py
│   ├── role_permissions.py
│   └── urls.py
└── tests/
    ├── __init__.py
    ├── test_internship_views.py
    └── test_application_views.py
```

#### 4. **Security App** (`security/`)
```
security/
├── __init__.py
├── admin.py
├── apps.py
├── models.py                   # Security models
├── views.py                    # Security views
├── middleware.py               # Security middleware
├── utils.py                    # Security utilities
├── monitoring.py               # Security monitoring
├── urls.py
├── migrations/
└── management/
    └── commands/
        └── security_audit.py
```

#### 5. **Monitoring App** (`monitoring/`)
```
monitoring/
├── __init__.py
├── admin.py
├── apps.py
├── models.py                   # Monitoring models
├── views.py                    # Monitoring views
├── urls.py
├── health_checks.py            # Health check utilities
├── metrics.py                  # Performance metrics
├── alerts.py                   # Alert system
├── migrations/
├── management/
│   └── commands/
│       ├── health_check.py
│       └── system_monitor.py
├── static/
│   └── monitoring/
│       ├── css/
│       └── js/
└── templates/
    └── monitoring/
        ├── dashboard.html
        └── health_status.html
```

---

## Coding Conventions & Standards

### Python Code Style

#### 1. **PEP 8 Compliance**
- Line length: 88 characters (Black formatter standard)
- Indentation: 4 spaces
- Import organization: stdlib, third-party, local
- Function/variable names: snake_case
- Class names: PascalCase
- Constants: UPPER_SNAKE_CASE

#### 2. **Import Organization**
```python
# Standard library imports
import os
import sys
from datetime import datetime

# Third-party imports
from django.db import models
from rest_framework import serializers
from celery import shared_task

# Local application imports
from core.models import BaseModel
from users.models import User
from .utils import helper_function
```

#### 3. **Docstring Standards**
```python
def create_internship(title, description, employer, **kwargs):
    """
    Create a new internship posting.
    
    Args:
        title (str): The internship title
        description (str): Detailed description
        employer (User): The employer creating the posting
        **kwargs: Additional optional parameters
    
    Returns:
        Internship: The created internship instance
    
    Raises:
        ValidationError: If required fields are missing
        PermissionError: If user lacks creation permissions
    """
    # Implementation here
    pass
```

### Django-Specific Conventions

#### 1. **Model Organization**
```python
class Internship(BaseModel):
    """
    Core internship model representing job postings.
    """
    # Fields in logical order
    title = models.CharField(max_length=200)
    description = models.TextField()
    employer = models.ForeignKey(User, on_delete=models.CASCADE)
    
    # Meta class
    class Meta:
        db_table = 'internships'
        verbose_name = 'Internship'
        verbose_name_plural = 'Internships'
        ordering = ['-created_at']
    
    # String representation
    def __str__(self):
        return f"{self.title} - {self.employer.company_name}"
    
    # Custom methods
    def get_absolute_url(self):
        return reverse('internship:detail', kwargs={'pk': self.pk})
    
    def is_active(self):
        return self.status == 'active'
```

#### 2. **View Organization**
```python
class InternshipListView(ListAPIView):
    """
    API view for listing internships with filtering and pagination.
    """
    queryset = Internship.objects.filter(is_active=True)
    serializer_class = InternshipSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['category', 'location', 'employer']
    search_fields = ['title', 'description']
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        """
        Customize queryset based on user role.
        """
        queryset = super().get_queryset()
        user = self.request.user
        
        if user.role == 'student':
            return queryset.filter(is_published=True)
        elif user.role == 'employer':
            return queryset.filter(employer=user)
        
        return queryset
```

#### 3. **Serializer Organization**
```python
class InternshipSerializer(serializers.ModelSerializer):
    """
    Serializer for internship data with nested relationships.
    """
    employer_name = serializers.CharField(source='employer.company_name', read_only=True)
    applications_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Internship
        fields = [
            'id', 'title', 'description', 'employer', 'employer_name',
            'location', 'category', 'requirements', 'applications_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_applications_count(self, obj):
        """Get the number of applications for this internship."""
        return obj.applications.count()
    
    def validate_title(self, value):
        """Validate internship title."""
        if len(value.strip()) < 5:
            raise serializers.ValidationError(
                "Title must be at least 5 characters long."
            )
        return value.strip()
```

---

## File Naming Conventions

### Python Files
- **Models:** `models.py` or `models/model_name.py`
- **Views:** `views.py` or `views/view_type.py`
- **Serializers:** `serializers.py` or `serializers/model_serializers.py`
- **URLs:** `urls.py`
- **Tests:** `tests.py` or `tests/test_feature.py`
- **Utilities:** `utils.py` or `utils/utility_type.py`
- **Management Commands:** `management/commands/command_name.py`

### Template Files
- **Base templates:** `base.html`, `base_admin.html`
- **App templates:** `app_name/template_name.html`
- **Partial templates:** `_partial_name.html`
- **Email templates:** `emails/template_name.html`

### Static Files
- **CSS:** `static/css/style_name.css`
- **JavaScript:** `static/js/script_name.js`
- **Images:** `static/images/image_name.ext`
- **Fonts:** `static/fonts/font_name.ext`

---

## Database Conventions

### Table Naming
- **App prefix:** Use app name as prefix (e.g., `users_profile`)
- **Descriptive names:** Clear, descriptive table names
- **Plural forms:** Use plural for table names
- **Junction tables:** `model1_model2` format

### Field Naming
- **snake_case:** All field names in snake_case
- **Descriptive:** Clear, descriptive field names
- **Foreign keys:** End with `_id` (Django default)
- **Boolean fields:** Start with `is_`, `has_`, `can_`

### Migration Naming
- **Auto-generated:** Use Django's auto-generated names
- **Custom migrations:** Descriptive names (e.g., `0002_add_user_preferences`)
- **Data migrations:** Prefix with `data_` (e.g., `0003_data_populate_roles`)

---

## API Design Conventions

### URL Patterns
```python
# RESTful URL patterns
urlpatterns = [
    # Collection endpoints
    path('internships/', InternshipListCreateView.as_view(), name='internship-list'),
    path('internships/<int:pk>/', InternshipDetailView.as_view(), name='internship-detail'),
    
    # Nested resources
    path('internships/<int:internship_id>/applications/', 
         ApplicationListView.as_view(), name='application-list'),
    
    # Action endpoints
    path('internships/<int:pk>/apply/', 
         InternshipApplyView.as_view(), name='internship-apply'),
    
    # Custom endpoints
    path('internships/search/', 
         InternshipSearchView.as_view(), name='internship-search'),
]
```

### Response Format
```python
# Success response
{
    "status": "success",
    "data": {
        "id": 1,
        "title": "Software Engineering Intern",
        "description": "..."
    },
    "message": "Internship retrieved successfully"
}

# Error response
{
    "status": "error",
    "errors": {
        "title": ["This field is required."]
    },
    "message": "Validation failed"
}

# Paginated response
{
    "status": "success",
    "data": {
        "count": 100,
        "next": "http://api.example.com/internships/?page=3",
        "previous": "http://api.example.com/internships/?page=1",
        "results": [...]
    }
}
```

---

## Testing Organization

### Test Structure
```python
class InternshipModelTest(TestCase):
    """
    Test cases for the Internship model.
    """
    
    def setUp(self):
        """Set up test data."""
        self.employer = User.objects.create_user(
            email='employer@test.com',
            password='testpass123',
            role='employer'
        )
        
    def test_internship_creation(self):
        """Test creating a new internship."""
        internship = Internship.objects.create(
            title='Test Internship',
            description='Test description',
            employer=self.employer
        )
        self.assertEqual(internship.title, 'Test Internship')
        self.assertTrue(internship.is_active())
    
    def test_internship_str_representation(self):
        """Test string representation of internship."""
        internship = Internship.objects.create(
            title='Test Internship',
            description='Test description',
            employer=self.employer
        )
        expected_str = f"Test Internship - {self.employer.company_name}"
        self.assertEqual(str(internship), expected_str)
```

### Test Categories
- **Unit Tests:** Test individual components
- **Integration Tests:** Test component interactions
- **API Tests:** Test API endpoints
- **Performance Tests:** Test system performance
- **Security Tests:** Test security measures

---

## Documentation Standards

### Code Documentation
- **Docstrings:** All classes and functions must have docstrings
- **Inline comments:** Complex logic should be commented
- **Type hints:** Use type hints for function parameters and returns
- **README files:** Each app should have a README.md

### API Documentation
- **OpenAPI/Swagger:** Auto-generated API documentation
- **Endpoint descriptions:** Clear descriptions for all endpoints
- **Example requests/responses:** Include examples
- **Authentication requirements:** Document auth requirements

---

## Performance Considerations

### Database Optimization
- **Indexes:** Add indexes for frequently queried fields
- **Query optimization:** Use select_related and prefetch_related
- **Database constraints:** Use database-level constraints
- **Connection pooling:** Configure connection pooling

### Caching Strategy
- **Redis caching:** Cache frequently accessed data
- **Template caching:** Cache rendered templates
- **API response caching:** Cache API responses
- **Session storage:** Use Redis for session storage

### Static Files
- **Compression:** Enable gzip compression
- **CDN:** Use CDN for static file delivery
- **Minification:** Minify CSS and JavaScript
- **Image optimization:** Optimize image sizes

---

## Security Guidelines

### Code Security
- **Input validation:** Validate all user inputs
- **SQL injection prevention:** Use parameterized queries
- **XSS prevention:** Escape output data
- **CSRF protection:** Enable CSRF protection

### Authentication & Authorization
- **Strong passwords:** Enforce password policies
- **JWT tokens:** Use secure JWT implementation
- **Permission checks:** Implement proper permission checks
- **Rate limiting:** Implement rate limiting

---

## Deployment Considerations

### Environment Configuration
- **Environment variables:** Use environment variables for configuration
- **Settings separation:** Separate settings for different environments
- **Secret management:** Secure secret key management
- **Debug settings:** Disable debug in production

### Monitoring & Logging
- **Application logging:** Comprehensive logging strategy
- **Error tracking:** Error monitoring and alerting
- **Performance monitoring:** Monitor application performance
- **Health checks:** Implement health check endpoints

---

*Version: 1.0 - Beta Release*