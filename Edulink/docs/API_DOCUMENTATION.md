# Edulink API Documentation

Comprehensive API documentation for the Edulink internship management system.

## Table of Contents

1. [Authentication](#authentication)
2. [User Management](#user-management)
3. [Internship Management](#internship-management)
4. [Application Management](#application-management)
5. [Progress Tracking](#progress-tracking)
6. [Notifications](#notifications)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)
9. [Pagination](#pagination)
10. [File Uploads](#file-uploads)

## Base URL

```
Development: http://localhost:8000/api/
Production: https://api.edulink.com/api/
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the access token in the Authorization header for protected endpoints.

### Login

**Endpoint:** `POST /auth/login/`

**Description:** Authenticate user and receive JWT tokens.

**Request:**
```json
{
  "username": "student@example.com",
  "password": "securepassword123"
}
```

**Response (200 OK):**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "username": "student@example.com",
    "email": "student@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "student",
    "is_active": true,
    "date_joined": "2024-01-15T10:30:00Z"
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "invalid_credentials",
  "message": "Invalid username or password",
  "details": {
    "non_field_errors": ["Unable to log in with provided credentials."]
  }
}
```

### Register

**Endpoint:** `POST /auth/register/`

**Description:** Register a new user account.

**Request:**
```json
{
  "username": "newuser@example.com",
  "email": "newuser@example.com",
  "password": "securepassword123",
  "password_confirm": "securepassword123",
  "first_name": "Jane",
  "last_name": "Smith",
  "role": "student"
}
```

**Response (201 Created):**
```json
{
  "user": {
    "id": 2,
    "username": "newuser@example.com",
    "email": "newuser@example.com",
    "first_name": "Jane",
    "last_name": "Smith",
    "role": "student",
    "is_active": true,
    "date_joined": "2024-01-15T11:00:00Z"
  },
  "message": "Account created successfully. Please check your email for verification."
}
```

### Refresh Token

**Endpoint:** `POST /auth/refresh/`

**Description:** Refresh access token using refresh token.

**Request:**
```json
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**Response (200 OK):**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

### Logout

**Endpoint:** `POST /auth/logout/`

**Description:** Logout user and blacklist refresh token.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**Response (200 OK):**
```json
{
  "message": "Successfully logged out"
}
```

### Password Reset

**Endpoint:** `POST /auth/password/reset/`

**Description:** Request password reset email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "message": "Password reset email sent if account exists"
}
```

## User Management

### Get User Profile

**Endpoint:** `GET /users/profile/`

**Description:** Get current user's profile information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "id": 1,
  "username": "student@example.com",
  "email": "student@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "role": "student",
  "profile": {
    "phone": "+1234567890",
    "bio": "Computer Science student passionate about software development",
    "skills": ["Python", "JavaScript", "React"],
    "university": "Tech University",
    "graduation_year": 2025,
    "gpa": 3.8,
    "resume": "/media/resumes/john_doe_resume.pdf",
    "portfolio_url": "https://johndoe.dev",
    "linkedin_url": "https://linkedin.com/in/johndoe"
  },
  "date_joined": "2024-01-15T10:30:00Z",
  "last_login": "2024-01-20T09:15:00Z"
}
```

### Update User Profile

**Endpoint:** `PUT /users/profile/`

**Description:** Update current user's profile information.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "profile": {
    "phone": "+1234567890",
    "bio": "Updated bio",
    "skills": ["Python", "JavaScript", "React", "Django"],
    "portfolio_url": "https://johndoe.dev"
  }
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "username": "student@example.com",
  "email": "student@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "profile": {
    "phone": "+1234567890",
    "bio": "Updated bio",
    "skills": ["Python", "JavaScript", "React", "Django"],
    "portfolio_url": "https://johndoe.dev"
  }
}
```

### List Students

**Endpoint:** `GET /users/students/`

**Description:** List all student profiles (accessible by employers and institutions).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `search`: Search by name or skills
- `skills`: Filter by skills (comma-separated)
- `university`: Filter by university
- `graduation_year`: Filter by graduation year
- `page`: Page number for pagination
- `page_size`: Number of results per page (default: 20)

**Response (200 OK):**
```json
{
  "count": 150,
  "next": "http://localhost:8000/api/users/students/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "profile": {
        "university": "Tech University",
        "graduation_year": 2025,
        "skills": ["Python", "JavaScript"],
        "gpa": 3.8
      }
    }
  ]
}
```

## Internship Management

### List Internships

**Endpoint:** `GET /internships/`

**Description:** List available internships with filtering and search.

**Query Parameters:**
- `search`: Search by title, company, or description
- `location`: Filter by location
- `type`: Filter by type (remote, on-site, hybrid)
- `duration`: Filter by duration
- `skills`: Filter by required skills
- `is_active`: Filter by active status
- `ordering`: Sort by field (title, created_at, deadline)
- `page`: Page number
- `page_size`: Results per page

**Response (200 OK):**
```json
{
  "count": 45,
  "next": "http://localhost:8000/api/internships/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "title": "Software Development Intern",
      "company": "Tech Corp",
      "location": "San Francisco, CA",
      "type": "on-site",
      "duration": "3 months",
      "description": "Join our development team...",
      "requirements": ["Python", "Django", "JavaScript"],
      "benefits": ["Mentorship", "Flexible hours", "Learning opportunities"],
      "application_deadline": "2024-02-15T23:59:59Z",
      "start_date": "2024-03-01T00:00:00Z",
      "end_date": "2024-06-01T00:00:00Z",
      "is_active": true,
      "created_at": "2024-01-10T14:30:00Z",
      "applications_count": 25,
      "employer": {
        "id": 5,
        "company_name": "Tech Corp",
        "contact_email": "hr@techcorp.com"
      }
    }
  ]
}
```

### Get Internship Details

**Endpoint:** `GET /internships/{id}/`

**Description:** Get detailed information about a specific internship.

**Response (200 OK):**
```json
{
  "id": 1,
  "title": "Software Development Intern",
  "company": "Tech Corp",
  "location": "San Francisco, CA",
  "type": "on-site",
  "duration": "3 months",
  "description": "Join our development team to work on exciting projects...",
  "requirements": ["Python", "Django", "JavaScript"],
  "benefits": ["Mentorship", "Flexible hours", "Learning opportunities"],
  "application_deadline": "2024-02-15T23:59:59Z",
  "start_date": "2024-03-01T00:00:00Z",
  "end_date": "2024-06-01T00:00:00Z",
  "is_active": true,
  "created_at": "2024-01-10T14:30:00Z",
  "updated_at": "2024-01-15T10:00:00Z",
  "applications_count": 25,
  "employer": {
    "id": 5,
    "company_name": "Tech Corp",
    "contact_email": "hr@techcorp.com",
    "website": "https://techcorp.com",
    "description": "Leading technology company..."
  },
  "can_apply": true,
  "user_has_applied": false
}
```

### Create Internship

**Endpoint:** `POST /internships/`

**Description:** Create a new internship listing (employers only).

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request:**
```json
{
  "title": "Backend Developer Intern",
  "location": "New York, NY",
  "type": "hybrid",
  "duration": "6 months",
  "description": "Work with our backend team on scalable applications...",
  "requirements": ["Python", "Django", "PostgreSQL"],
  "benefits": ["Mentorship", "Competitive stipend", "Full-time offer potential"],
  "application_deadline": "2024-03-01T23:59:59Z",
  "start_date": "2024-04-01T00:00:00Z",
  "end_date": "2024-10-01T00:00:00Z"
}
```

**Response (201 Created):**
```json
{
  "id": 2,
  "title": "Backend Developer Intern",
  "company": "Tech Corp",
  "location": "New York, NY",
  "type": "hybrid",
  "duration": "6 months",
  "description": "Work with our backend team on scalable applications...",
  "requirements": ["Python", "Django", "PostgreSQL"],
  "benefits": ["Mentorship", "Competitive stipend", "Full-time offer potential"],
  "application_deadline": "2024-03-01T23:59:59Z",
  "start_date": "2024-04-01T00:00:00Z",
  "end_date": "2024-10-01T00:00:00Z",
  "is_active": true,
  "created_at": "2024-01-20T15:30:00Z",
  "applications_count": 0
}
```

## Application Management

### List Applications

**Endpoint:** `GET /applications/`

**Description:** List user's applications or applications to employer's internships.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `status`: Filter by status (pending, accepted, rejected, withdrawn)
- `internship`: Filter by internship ID
- `ordering`: Sort by field (created_at, status)
- `page`: Page number

**Response (200 OK):**
```json
{
  "count": 12,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "internship": {
        "id": 1,
        "title": "Software Development Intern",
        "company": "Tech Corp"
      },
      "student": {
        "id": 1,
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com"
      },
      "status": "pending",
      "cover_letter": "I am excited to apply for this position...",
      "resume": "/media/resumes/john_doe_resume.pdf",
      "created_at": "2024-01-18T10:00:00Z",
      "updated_at": "2024-01-18T10:00:00Z",
      "is_active": true
    }
  ]
}
```

### Submit Application

**Endpoint:** `POST /applications/`

**Description:** Submit an application for an internship.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request (Form Data):**
```
internship: 1
cover_letter: I am excited to apply for this position because...
resume: [file upload]
```

**Response (201 Created):**
```json
{
  "id": 2,
  "internship": {
    "id": 1,
    "title": "Software Development Intern",
    "company": "Tech Corp"
  },
  "status": "pending",
  "cover_letter": "I am excited to apply for this position because...",
  "resume": "/media/resumes/john_doe_resume_2024.pdf",
  "created_at": "2024-01-20T16:00:00Z",
  "message": "Application submitted successfully"
}
```

### Update Application Status

**Endpoint:** `PUT /applications/{id}/status/`

**Description:** Update application status (employers only).

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request:**
```json
{
  "status": "accepted",
  "feedback": "Great application! We're excited to have you join our team."
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "status": "accepted",
  "feedback": "Great application! We're excited to have you join our team.",
  "updated_at": "2024-01-21T09:30:00Z",
  "message": "Application status updated successfully"
}
```

## Progress Tracking

### List Logbook Entries

**Endpoint:** `GET /progress/logbook/`

**Description:** List logbook entries for current user's internships.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `internship`: Filter by internship ID
- `week_number`: Filter by week number
- `ordering`: Sort by field (week_number, created_at)

**Response (200 OK):**
```json
{
  "count": 8,
  "results": [
    {
      "id": 1,
      "internship": {
        "id": 1,
        "title": "Software Development Intern",
        "company": "Tech Corp"
      },
      "week_number": 1,
      "start_date": "2024-03-01",
      "end_date": "2024-03-07",
      "hours_worked": 40,
      "tasks_completed": "Set up development environment, attended orientation",
      "learning_outcomes": "Learned about company culture and development workflow",
      "challenges_faced": "Initial setup took longer than expected",
      "supervisor_meeting": true,
      "created_at": "2024-03-08T17:00:00Z",
      "is_overdue": false
    }
  ]
}
```

### Create Logbook Entry

**Endpoint:** `POST /progress/logbook/`

**Description:** Create a new weekly logbook entry.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request:**
```json
{
  "internship": 1,
  "week_number": 2,
  "start_date": "2024-03-08",
  "end_date": "2024-03-14",
  "hours_worked": 38,
  "tasks_completed": "Implemented user authentication, fixed bugs in payment module",
  "learning_outcomes": "Learned about JWT authentication and payment processing",
  "challenges_faced": "Debugging payment integration was complex",
  "supervisor_meeting": true
}
```

**Response (201 Created):**
```json
{
  "id": 2,
  "internship": {
    "id": 1,
    "title": "Software Development Intern",
    "company": "Tech Corp"
  },
  "week_number": 2,
  "start_date": "2024-03-08",
  "end_date": "2024-03-14",
  "hours_worked": 38,
  "tasks_completed": "Implemented user authentication, fixed bugs in payment module",
  "learning_outcomes": "Learned about JWT authentication and payment processing",
  "challenges_faced": "Debugging payment integration was complex",
  "supervisor_meeting": true,
  "created_at": "2024-03-15T16:30:00Z",
  "is_overdue": false
}
```

### List Supervisor Feedback

**Endpoint:** `GET /progress/feedback/`

**Description:** List supervisor feedback entries.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "count": 3,
  "results": [
    {
      "id": 1,
      "logbook_entry": {
        "id": 1,
        "week_number": 1,
        "internship": {
          "title": "Software Development Intern"
        }
      },
      "rating": 4,
      "feedback": "Great start! Shows enthusiasm and willingness to learn.",
      "areas_for_improvement": "Could improve time management for complex tasks",
      "goals_next_week": "Focus on completing the user dashboard feature",
      "created_at": "2024-03-09T10:00:00Z"
    }
  ]
}
```

## Notifications

### List Notifications

**Endpoint:** `GET /notifications/`

**Description:** List user's notifications.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `is_read`: Filter by read status (true/false)
- `type`: Filter by notification type
- `ordering`: Sort by field (created_at)

**Response (200 OK):**
```json
{
  "count": 15,
  "unread_count": 3,
  "results": [
    {
      "id": 1,
      "title": "Application Status Update",
      "message": "Your application for Software Development Intern has been accepted!",
      "type": "application_update",
      "is_read": false,
      "created_at": "2024-01-21T09:30:00Z",
      "data": {
        "application_id": 1,
        "internship_id": 1,
        "status": "accepted"
      }
    }
  ]
}
```

### Mark Notification as Read

**Endpoint:** `PUT /notifications/{id}/read/`

**Description:** Mark a notification as read.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "id": 1,
  "is_read": true,
  "message": "Notification marked as read"
}
```

## Error Handling

### Standard Error Response Format

```json
{
  "error": "error_code",
  "message": "Human-readable error message",
  "details": {
    "field_name": ["Field-specific error message"]
  },
  "timestamp": "2024-01-20T10:30:00Z",
  "request_id": "req_123456789"
}
```

### Common Error Codes

- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (e.g., duplicate application)
- `422 Unprocessable Entity`: Validation errors
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### Validation Errors

```json
{
  "error": "validation_error",
  "message": "Invalid input data",
  "details": {
    "email": ["Enter a valid email address."],
    "password": ["This field is required."]
  }
}
```

## Rate Limiting

### Rate Limit Headers

All API responses include rate limiting headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642680000
```

### Rate Limits by Endpoint

- **Authentication**: 5 requests/minute
- **General API**: 100 requests/hour
- **File uploads**: 10 requests/hour
- **Search endpoints**: 50 requests/hour

### Rate Limit Exceeded Response

```json
{
  "error": "rate_limit_exceeded",
  "message": "Too many requests. Please try again later.",
  "details": {
    "limit": 100,
    "window": "1 hour",
    "reset_time": "2024-01-20T11:00:00Z"
  }
}
```

## Pagination

### Standard Pagination

List endpoints use cursor-based pagination:

```json
{
  "count": 150,
  "next": "http://localhost:8000/api/internships/?page=2",
  "previous": null,
  "results": [...]
}
```

### Query Parameters

- `page`: Page number (default: 1)
- `page_size`: Results per page (default: 20, max: 100)

## File Uploads

### Supported File Types

- **Resumes**: PDF, DOC, DOCX (max 5MB)
- **Profile Pictures**: JPG, PNG, GIF (max 2MB)
- **Documents**: PDF, DOC, DOCX, TXT (max 10MB)

### Upload Response

```json
{
  "file_url": "/media/resumes/john_doe_resume.pdf",
  "file_name": "john_doe_resume.pdf",
  "file_size": 1024000,
  "content_type": "application/pdf",
  "uploaded_at": "2024-01-20T15:30:00Z"
}
```

### Upload Errors

```json
{
  "error": "file_validation_error",
  "message": "File validation failed",
  "details": {
    "file": ["File size exceeds maximum limit of 5MB"]
  }
}
```

---

## SDK Examples

### Python SDK Example

```python
import requests

class EdulinkAPI:
    def __init__(self, base_url, access_token=None):
        self.base_url = base_url
        self.access_token = access_token
        self.session = requests.Session()
        
    def login(self, username, password):
        response = self.session.post(
            f"{self.base_url}/auth/login/",
            json={"username": username, "password": password}
        )
        if response.status_code == 200:
            data = response.json()
            self.access_token = data["access"]
            self.session.headers.update({
                "Authorization": f"Bearer {self.access_token}"
            })
            return data
        return None
    
    def get_internships(self, **params):
        response = self.session.get(
            f"{self.base_url}/internships/",
            params=params
        )
        return response.json()
    
    def submit_application(self, internship_id, cover_letter, resume_file):
        files = {"resume": resume_file}
        data = {
            "internship": internship_id,
            "cover_letter": cover_letter
        }
        response = self.session.post(
            f"{self.base_url}/applications/",
            data=data,
            files=files
        )
        return response.json()

# Usage
api = EdulinkAPI("http://localhost:8000/api")
api.login("student@example.com", "password123")
internships = api.get_internships(search="python")
```

### JavaScript SDK Example

```javascript
class EdulinkAPI {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.accessToken = null;
    }
    
    async login(username, password) {
        const response = await fetch(`${this.baseUrl}/auth/login/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        if (response.ok) {
            const data = await response.json();
            this.accessToken = data.access;
            return data;
        }
        throw new Error('Login failed');
    }
    
    async getInternships(params = {}) {
        const url = new URL(`${this.baseUrl}/internships/`);
        Object.keys(params).forEach(key => 
            url.searchParams.append(key, params[key])
        );
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            }
        });
        
        return response.json();
    }
    
    async submitApplication(internshipId, coverLetter, resumeFile) {
        const formData = new FormData();
        formData.append('internship', internshipId);
        formData.append('cover_letter', coverLetter);
        formData.append('resume', resumeFile);
        
        const response = await fetch(`${this.baseUrl}/applications/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            },
            body: formData
        });
        
        return response.json();
    }
}

// Usage
const api = new EdulinkAPI('http://localhost:8000/api');
await api.login('student@example.com', 'password123');
const internships = await api.getInternships({ search: 'python' });
```

---

For more information and interactive API testing, visit:
- **Swagger UI**: `http://localhost:8000/api/docs/`
- **ReDoc**: `http://localhost:8000/api/redoc/`