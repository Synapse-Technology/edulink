# API Documentation Configuration
# This module configures comprehensive API documentation using DRF Spectacular

from drf_spectacular.utils import (
    extend_schema, extend_schema_view, OpenApiParameter, OpenApiExample
)
from drf_spectacular.types import OpenApiTypes
from rest_framework import status
from django.utils.translation import gettext_lazy as _

# API Documentation Schemas

# Authentication API Schemas
AUTH_SCHEMAS = {
    'login': extend_schema(
        summary="User Login",
        description="Authenticate user and return JWT tokens",
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'username': {'type': 'string', 'example': 'student@example.com'},
                    'password': {'type': 'string', 'example': 'securepassword123'}
                },
                'required': ['username', 'password']
            }
        },
        responses={
            200: {
                'description': 'Login successful',
                'content': {
                    'application/json': {
                        'example': {
                            'access': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...',
                            'refresh': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...',
                            'user': {
                                'id': 1,
                                'username': 'student@example.com',
                                'email': 'student@example.com',
                                'first_name': 'John',
                                'last_name': 'Doe'
                            }
                        }
                    }
                }
            },
            401: {
                'description': 'Invalid credentials',
                'content': {
                    'application/json': {
                        'example': {
                            'detail': 'Invalid username or password'
                        }
                    }
                }
            }
        },
        tags=['Authentication']
    ),
    
    'register': extend_schema(
        summary="User Registration",
        description="Register a new user account",
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'username': {'type': 'string', 'example': 'newuser@example.com'},
                    'email': {'type': 'string', 'example': 'newuser@example.com'},
                    'password': {'type': 'string', 'example': 'securepassword123'},
                    'password_confirm': {'type': 'string', 'example': 'securepassword123'},
                    'first_name': {'type': 'string', 'example': 'Jane'},
                    'last_name': {'type': 'string', 'example': 'Smith'},
                    'user_type': {'type': 'string', 'enum': ['student', 'employer', 'institution']}
                },
                'required': ['username', 'email', 'password', 'password_confirm', 'user_type']
            }
        },
        responses={
            201: {
                'description': 'Registration successful',
                'content': {
                    'application/json': {
                        'example': {
                            'message': 'Registration successful. Please check your email for verification.',
                            'user_id': 123
                        }
                    }
                }
            },
            400: {
                'description': 'Validation error',
                'content': {
                    'application/json': {
                        'example': {
                            'email': ['User with this email already exists.'],
                            'password': ['Password must be at least 8 characters long.']
                        }
                    }
                }
            }
        },
        tags=['Authentication']
    )
}

# Application API Schemas
APPLICATION_SCHEMAS = {
    'list_create': extend_schema_view(
        get=extend_schema(
            summary="List Applications",
            description="Get list of applications for the authenticated user",
            parameters=[
                OpenApiParameter(
                    name='status',
                    type=OpenApiTypes.STR,
                    location=OpenApiParameter.QUERY,
                    description='Filter by application status',
                    enum=['pending', 'accepted', 'rejected']
                ),
                OpenApiParameter(
                    name='internship',
                    type=OpenApiTypes.INT,
                    location=OpenApiParameter.QUERY,
                    description='Filter by internship ID'
                )
            ],
            responses={
                200: {
                    'description': 'List of applications',
                    'content': {
                        'application/json': {
                            'example': {
                                'count': 10,
                                'next': 'http://api.example.com/applications/?page=2',
                                'previous': None,
                                'results': [
                                    {
                                        'id': 1,
                                        'internship': {
                                            'id': 5,
                                            'title': 'Software Developer Intern',
                                            'company': 'Tech Corp'
                                        },
                                        'status': 'pending',
                                        'application_date': '2024-01-15T10:30:00Z',
                                        'cover_letter': 'I am very interested...'
                                    }
                                ]
                            }
                        }
                    }
                }
            },
            tags=['Applications']
        ),
        post=extend_schema(
            summary="Create Application",
            description="Submit a new internship application",
            request={
                'application/json': {
                    'type': 'object',
                    'properties': {
                        'internship': {'type': 'integer', 'example': 5},
                        'cover_letter': {'type': 'string', 'example': 'I am very interested in this position because...'}
                    },
                    'required': ['internship', 'cover_letter']
                }
            },
            responses={
                201: {
                    'description': 'Application created successfully',
                    'content': {
                        'application/json': {
                            'example': {
                                'id': 15,
                                'internship': 5,
                                'status': 'pending',
                                'application_date': '2024-01-15T10:30:00Z',
                                'cover_letter': 'I am very interested...'
                            }
                        }
                    }
                },
                400: {
                    'description': 'Validation error',
                    'content': {
                        'application/json': {
                            'example': {
                                'internship': ['You have already applied for this internship.'],
                                'cover_letter': ['This field is required.']
                            }
                        }
                    }
                }
            },
            tags=['Applications']
        )
    )
}

# Internship API Schemas
INTERNSHIP_SCHEMAS = {
    'list': extend_schema(
        summary="List Internships",
        description="Get list of available internships with filtering and search",
        parameters=[
            OpenApiParameter(
                name='search',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Search in title, description, and company name'
            ),
            OpenApiParameter(
                name='category',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filter by category'
            ),
            OpenApiParameter(
                name='location',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filter by location'
            ),
            OpenApiParameter(
                name='min_stipend',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Minimum stipend amount'
            ),
            OpenApiParameter(
                name='max_stipend',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Maximum stipend amount'
            )
        ],
        responses={
            200: {
                'description': 'List of internships',
                'content': {
                    'application/json': {
                        'example': {
                            'count': 25,
                            'next': 'http://api.example.com/internships/?page=2',
                            'previous': None,
                            'results': [
                                {
                                    'id': 1,
                                    'title': 'Software Developer Intern',
                                    'description': 'Join our development team...',
                                    'company': 'Tech Corp',
                                    'location': 'Remote',
                                    'category': 'Software Development',
                                    'stipend': 25000,
                                    'start_date': '2024-06-01',
                                    'end_date': '2024-08-31',
                                    'deadline': '2024-05-15',
                                    'skills_required': ['Python', 'Django', 'JavaScript']
                                }
                            ]
                        }
                    }
                }
            }
        },
        tags=['Internships']
    )
}

# Logbook API Schemas
LOGBOOK_SCHEMAS = {
    'list_create': extend_schema_view(
        get=extend_schema(
            summary="List Logbook Entries",
            description="Get logbook entries for the authenticated student",
            parameters=[
                OpenApiParameter(
                    name='internship',
                    type=OpenApiTypes.INT,
                    location=OpenApiParameter.QUERY,
                    description='Filter by internship ID'
                ),
                OpenApiParameter(
                    name='status',
                    type=OpenApiTypes.STR,
                    location=OpenApiParameter.QUERY,
                    description='Filter by status',
                    enum=['pending', 'approved', 'rejected']
                )
            ],
            responses={
                200: {
                    'description': 'List of logbook entries',
                    'content': {
                        'application/json': {
                            'example': {
                                'count': 8,
                                'results': [
                                    {
                                        'id': 1,
                                        'internship': {
                                            'id': 5,
                                            'title': 'Software Developer Intern'
                                        },
                                        'week_number': 1,
                                        'activities': 'Completed orientation and setup...',
                                        'status': 'approved',
                                        'date_submitted': '2024-06-07T14:30:00Z',
                                        'is_overdue': False
                                    }
                                ]
                            }
                        }
                    }
                }
            },
            tags=['Logbook']
        ),
        post=extend_schema(
            summary="Create Logbook Entry",
            description="Submit a new weekly logbook entry",
            request={
                'application/json': {
                    'type': 'object',
                    'properties': {
                        'internship': {'type': 'integer', 'example': 5},
                        'week_number': {'type': 'integer', 'example': 1},
                        'activities': {'type': 'string', 'example': 'This week I completed orientation...'}
                    },
                    'required': ['internship', 'week_number', 'activities']
                }
            },
            responses={
                201: {
                    'description': 'Logbook entry created successfully',
                    'content': {
                        'application/json': {
                            'example': {
                                'id': 10,
                                'internship': 5,
                                'week_number': 1,
                                'activities': 'This week I completed orientation...',
                                'status': 'pending',
                                'date_submitted': '2024-06-07T14:30:00Z'
                            }
                        }
                    }
                }
            },
            tags=['Logbook']
        )
    )
}

# Error Response Schemas
ERROR_RESPONSES = {
    400: {
        'description': 'Bad Request',
        'content': {
            'application/json': {
                'example': {
                    'error': 'Validation failed',
                    'details': {
                        'field_name': ['This field is required.']
                    }
                }
            }
        }
    },
    401: {
        'description': 'Unauthorized',
        'content': {
            'application/json': {
                'example': {
                    'detail': 'Authentication credentials were not provided.'
                }
            }
        }
    },
    403: {
        'description': 'Forbidden',
        'content': {
            'application/json': {
                'example': {
                    'detail': 'You do not have permission to perform this action.'
                }
            }
        }
    },
    404: {
        'description': 'Not Found',
        'content': {
            'application/json': {
                'example': {
                    'detail': 'Not found.'
                }
            }
        }
    },
    429: {
        'description': 'Rate Limited',
        'content': {
            'application/json': {
                'example': {
                    'error': 'Rate limit exceeded',
                    'detail': 'Maximum 100 requests per hour allowed',
                    'retry_after': 3600
                }
            }
        }
    },
    500: {
        'description': 'Internal Server Error',
        'content': {
            'application/json': {
                'example': {
                    'error': 'Internal server error',
                    'detail': 'An unexpected error occurred.'
                }
            }
        }
    }
}

# API Documentation Settings
SPECTACULAR_SETTINGS = {
    'TITLE': 'Edulink API',
    'DESCRIPTION': 'Comprehensive API for the Edulink Internship Management System',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'COMPONENT_NO_READ_ONLY_REQUIRED': True,
    'SCHEMA_PATH_PREFIX': '/api/',
    'SCHEMA_PATH_PREFIX_TRIM': True,
    'SERVERS': [
        {
            'url': 'http://localhost:8000',
            'description': 'Development server'
        },
        {
            'url': 'https://api.edulink.com',
            'description': 'Production server'
        }
    ],
    'TAGS': [
        {
            'name': 'Authentication',
            'description': 'User authentication and authorization endpoints'
        },
        {
            'name': 'Applications',
            'description': 'Internship application management'
        },
        {
            'name': 'Internships',
            'description': 'Internship listing and management'
        },
        {
            'name': 'Logbook',
            'description': 'Weekly logbook entry management'
        },
        {
            'name': 'Users',
            'description': 'User profile management'
        },
        {
            'name': 'Notifications',
            'description': 'Notification system'
        }
    ],
    'EXTERNAL_DOCS': {
        'description': 'Full Documentation',
        'url': 'https://docs.edulink.com'
    },
    'CONTACT': {
        'name': 'Edulink API Support',
        'email': 'api-support@edulink.com'
    },
    'LICENSE': {
        'name': 'MIT License',
        'url': 'https://opensource.org/licenses/MIT'
    }
}

# Security Schemes
SECURITY_SCHEMES = {
    'bearerAuth': {
        'type': 'http',
        'scheme': 'bearer',
        'bearerFormat': 'JWT'
    },
    'apiKeyAuth': {
        'type': 'apiKey',
        'in': 'header',
        'name': 'X-API-Key'
    }
}

# Common Parameters
COMMON_PARAMETERS = {
    'page': OpenApiParameter(
        name='page',
        type=OpenApiTypes.INT,
        location=OpenApiParameter.QUERY,
        description='Page number for pagination'
    ),
    'page_size': OpenApiParameter(
        name='page_size',
        type=OpenApiTypes.INT,
        location=OpenApiParameter.QUERY,
        description='Number of items per page (max 100)'
    ),
    'ordering': OpenApiParameter(
        name='ordering',
        type=OpenApiTypes.STR,
        location=OpenApiParameter.QUERY,
        description='Field to order by. Prefix with "-" for descending order.'
    )
}

# Usage Examples
USAGE_EXAMPLES = """
API Documentation Usage Examples:

1. Apply schema to a view:

@extend_schema(
    summary="My API Endpoint",
    description="Detailed description of what this endpoint does",
    responses={200: MySerializer}
)
def my_view(request):
    pass

2. Apply schema to a ViewSet:

@extend_schema_view(
    list=extend_schema(summary="List items"),
    create=extend_schema(summary="Create item"),
    retrieve=extend_schema(summary="Get item details")
)
class MyViewSet(ModelViewSet):
    pass

3. Add to urls.py:

from drf_spectacular.views import (
    SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
)

urlpatterns = [
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

4. Add to settings.py:

INSTALLED_APPS = [
    # ...
    'drf_spectacular',
]

REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SPECTACULAR_SETTINGS = {
    # ... settings from this file
}
"""

print("API documentation configuration loaded successfully!")
print("Add 'drf_spectacular' to INSTALLED_APPS and configure REST_FRAMEWORK settings.")
print("Access documentation at /api/docs/ (Swagger) or /api/redoc/ (ReDoc).")