# Edulink - Internship Management Platform

[![Version](https://img.shields.io/badge/version-1.0--beta-blue.svg)](https://github.com/Synapse-Technology/Edulink)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/Synapse-Technology/Edulink/actions)
[![Python](https://img.shields.io/badge/python-3.9+-blue.svg)](https://python.org)
[![Django](https://img.shields.io/badge/django-4.2+-green.svg)](https://djangoproject.com)

A comprehensive web-based platform that streamlines internship management for educational institutions, students, employers, and supervisors. Edulink facilitates seamless connections between students seeking internships and organizations offering opportunities while providing robust management tools for all stakeholders.

## 🚀 Features

### For Students
- **Profile Management**: Create and maintain comprehensive academic and professional profiles
- **Internship Discovery**: Browse and search available internship opportunities with advanced filtering
- **Application Tracking**: Submit applications and track their status in real-time
- **Document Management**: Upload and manage resumes, cover letters, and academic transcripts
- **Progress Monitoring**: Track internship progress with milestone-based reporting
- **Communication Hub**: Direct messaging with employers and supervisors

### For Employers
- **Opportunity Posting**: Create detailed internship listings with requirements and descriptions
- **Candidate Management**: Review applications, shortlist candidates, and manage hiring pipeline
- **Student Evaluation**: Assess intern performance with structured evaluation forms
- **Analytics Dashboard**: Monitor recruitment metrics and internship program effectiveness
- **Bulk Operations**: Manage multiple internship programs simultaneously

### For Educational Institutions
- **Student Oversight**: Monitor student internship activities and academic integration
- **Employer Relations**: Manage partnerships with industry organizations
- **Academic Integration**: Link internship activities with academic credit requirements
- **Reporting System**: Generate comprehensive reports on internship program outcomes
- **Compliance Tracking**: Ensure adherence to academic and regulatory requirements

### For Supervisors
- **Mentorship Tools**: Guide and support interns throughout their placement
- **Progress Evaluation**: Conduct regular assessments and provide feedback
- **Communication Platform**: Maintain contact with students and academic coordinators
- **Resource Sharing**: Provide learning materials and project guidelines

### System Features
- **Multi-Role Authentication**: Secure role-based access control (RBAC)
- **Real-time Notifications**: Email and in-app notifications for important updates
- **Advanced Search**: Powerful search and filtering capabilities across all entities
- **Data Analytics**: Comprehensive reporting and analytics dashboard
- **Mobile Responsive**: Fully responsive design for all device types
- **API Integration**: RESTful API for third-party integrations
- **Security**: Enterprise-grade security with rate limiting and monitoring
- **Scalability**: Built for high-volume usage with caching and optimization

## 📋 Prerequisites

Before installing Edulink, ensure you have the following installed:

- **Python 3.9+** - [Download Python](https://python.org/downloads/)
- **PostgreSQL 12+** - [Download PostgreSQL](https://postgresql.org/download/)
- **Redis 6+** - [Download Redis](https://redis.io/download)
- **Git** - [Download Git](https://git-scm.com/downloads)
- **Node.js 16+** (for frontend assets) - [Download Node.js](https://nodejs.org/)

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Synapse-Technology/Edulink.git
cd edulink
```

### 2. Set Up Virtual Environment

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

### 3. Install Dependencies

```bash
# Navigate to the Django project directory
cd Edulink

# Install Python dependencies
pip install -r requirements.txt

# Install development dependencies (optional)
pip install -r requirements/development.txt
```

### 4. Database Setup

```bash
# Create PostgreSQL database
psql -U postgres
CREATE DATABASE edulink_db;
CREATE USER edulink_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE edulink_db TO edulink_user;
\q
```

### 5. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your configuration
# See Configuration section below for details
```

### 6. Database Migration

```bash
# Run database migrations
python manage.py migrate

# Create superuser account
python manage.py createsuperuser

# Load initial data (optional)
python manage.py loaddata fixtures/initial_data.json
```

### 7. Static Files

```bash
# Collect static files
python manage.py collectstatic --noinput
```

### 8. Start Development Server

```bash
# Start Redis server (in separate terminal)
redis-server

# Start Celery worker (in separate terminal)
celery -A Edulink worker --loglevel=info

# Start Django development server
python manage.py runserver
```

The application will be available at `http://localhost:8000`

## 🎯 Usage

### Quick Start Guide

1. **Access the Platform**: Navigate to `http://localhost:8000` in your web browser

2. **Admin Setup**: 
   - Login with superuser credentials at `/admin/`
   - Configure system settings and initial data
   - Create institutional accounts

3. **User Registration**:
   - Students: Register at `/register/student/`
   - Employers: Register at `/register/employer/`
   - Institutions: Contact admin for account setup

4. **Profile Completion**:
   - Complete your profile with relevant information
   - Upload required documents
   - Set notification preferences

### Common Workflows

#### For Students:
```
1. Complete Profile → 2. Browse Internships → 3. Apply → 4. Track Status → 5. Start Internship
```

#### For Employers:
```
1. Post Internship → 2. Review Applications → 3. Interview Candidates → 4. Select Intern → 5. Manage Internship
```

#### For Institutions:
```
1. Setup Programs → 2. Monitor Students → 3. Manage Partnerships → 4. Generate Reports
```

### Key Features Demo

- **Dashboard**: Personalized dashboard showing relevant information and quick actions
- **Search & Filter**: Advanced search with multiple criteria and saved searches
- **Notifications**: Real-time updates on application status and important events
- **Messaging**: Built-in communication system for all stakeholders
- **Reports**: Comprehensive analytics and exportable reports

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Django Settings
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database Configuration
DATABASE_URL=postgresql://edulink_user:your_password@localhost:5432/edulink_db

# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# Email Configuration
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# Security Settings
CSRF_TRUSTED_ORIGINS=http://localhost:8000
SECURE_SSL_REDIRECT=False
SESSION_COOKIE_SECURE=False
CSRF_COOKIE_SECURE=False

# API Keys
GOOGLE_GEMINI_API_KEY=your-gemini-api-key

# File Storage
MEDIA_ROOT=/path/to/media/files
STATIC_ROOT=/path/to/static/files

# Celery Configuration
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Monitoring
SENTRY_DSN=your-sentry-dsn (optional)
```

### Production Settings

For production deployment, update the following:

```env
DEBUG=False
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
```

### Database Configuration

Supported databases:
- **PostgreSQL** (Recommended)
- **MySQL** (Supported)
- **SQLite** (Development only)

### Caching Configuration

Redis is used for:
- Session storage
- Cache backend
- Celery message broker
- Real-time features

## 📚 API Documentation

### API Overview

Edulink provides a comprehensive RESTful API for integration with external systems.

**Base URL**: `https://edulink.jhubafrica.com/api/v1/`

### Authentication

The API uses JWT (JSON Web Tokens) for authentication:

```bash
# Obtain token
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "your_username", "password": "your_password"}'

# Use token in requests
curl -H "Authorization: Bearer your_jwt_token" \
  http://localhost:8000/api/v1/internships/
```

### Key Endpoints

#### Authentication
- `POST /api/auth/login/` - User login
- `POST /api/auth/refresh/` - Refresh token
- `POST /api/auth/logout/` - User logout

#### Users & Profiles
- `GET /api/v1/users/profile/` - Get user profile
- `PUT /api/v1/users/profile/` - Update user profile
- `GET /api/v1/users/students/` - List students
- `GET /api/v1/users/employers/` - List employers

#### Internships
- `GET /api/v1/internships/` - List internships
- `POST /api/v1/internships/` - Create internship
- `GET /api/v1/internships/{id}/` - Get internship details
- `PUT /api/v1/internships/{id}/` - Update internship

#### Applications
- `GET /api/v1/applications/` - List applications
- `POST /api/v1/applications/` - Submit application
- `GET /api/v1/applications/{id}/` - Get application details
- `PATCH /api/v1/applications/{id}/` - Update application status

### API Documentation Links

- **Interactive API Docs**: `https://edulink.jhubafrica.com/api/docs/` (Swagger UI)
- **API Schema**: `https://edulink.jhubafrica.com/api/schema/` (OpenAPI 3.0)
- **Redoc Documentation**: `https://edulink.jhubafrica.com/api/redoc/`

### Rate Limiting

API endpoints are rate-limited:
- **Authenticated users**: 1000 requests/hour
- **Anonymous users**: 100 requests/hour
- **Login endpoint**: 5 attempts/minute

## 🤝 Contributing

We welcome contributions to Edulink! Please follow these guidelines:

### Development Setup

1. **Fork the Repository**
   ```bash
   git clone https://github.com/your-username/Edulink.git
   cd edulink
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Install Development Dependencies**
   ```bash
   pip install -r requirements/development.txt
   pre-commit install
   ```

### Code Standards

- **Python**: Follow PEP 8 style guide
- **Django**: Follow Django coding style
- **JavaScript**: Use ES6+ standards
- **Documentation**: Update docs for new features

### Testing

```bash
# Run all tests
python manage.py test

# Run specific test module
python manage.py test authentication.tests

# Run with coverage
coverage run --source='.' manage.py test
coverage report
```

### Code Quality Checks

```bash
# Format code
black .
isort .

# Lint code
flake8 .
mypy .

# Security check
bandit -r .
```

### Pull Request Process

1. **Update Documentation**: Ensure all changes are documented
2. **Add Tests**: Include tests for new functionality
3. **Code Review**: All PRs require review from maintainers
4. **CI/CD**: Ensure all checks pass
5. **Merge**: Squash and merge after approval

### Reporting Issues

When reporting issues, please include:
- **Environment details** (OS, Python version, etc.)
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Error messages** and stack traces
- **Screenshots** if applicable

### Feature Requests

For feature requests:
1. Check existing issues and discussions
2. Create detailed issue with use case
3. Discuss implementation approach
4. Submit PR with implementation

## 📄 License

This is a proprietary commercial software product. All rights reserved.

### Commercial License

- ❌ **Open source distribution**
- ❌ **Public modification**
- ❌ **Free commercial use**
- ✅ **Licensed commercial use**
- ❌ **Liability**
- ❌ **Warranty**

### Third-Party Licenses

This project uses several open-source libraries under their respective licenses. See [THIRD_PARTY_LICENSES.md](docs/THIRD_PARTY_LICENSES.md) for details.

## 🆘 Support

### Getting Help

- **Documentation**: [Full Documentation](docs/)
- **FAQ**: [Frequently Asked Questions](docs/FAQ.md)
- **Troubleshooting**: [Common Issues](docs/TROUBLESHOOTING.md)
- **API Reference**: [API Documentation](http://localhost:8000/api/docs/)

### Contact Information

- **Project Lead**: Bouric Enos Okwaro - [bokwaro@edulink.jhubafrica.com](mailto:bokwaro@edulink.jhubafrica.com)
- **Technical Support**: [support@edulink.jhubafrica.com](mailto:support@edulink.jhubafrica.com)
- **Security Issues**: [security@edulink.jhubafrica.com](mailto:security@edulink.jhubafrica.com)

### Community

- **GitHub Issues**: [Report bugs and request features](https://github.com/Synapse-Technology/Edulink/issues)
- **Discussions**: [Community discussions](https://github.com/Synapse-Technology/Edulink/discussions)
- **Slack**: [Join our Slack workspace](https://edulink-community.slack.com)

### Professional Support

For enterprise deployments and professional support:
- **Consulting**: Custom implementation and integration services
- **Training**: Team training and onboarding programs
- **SLA Support**: 24/7 support with guaranteed response times

Contact: [enterprise@edulink.jhubafrica.com](mailto:enterprise@edulink.jhubafrica.com)

---

## 📊 Project Status

- **Current Version**: 1.0 Beta
- **Development Status**: Active
- **Stability**: Beta (suitable for testing)
- **Next Release**: Q2 2024 (Production Ready)

### Roadmap

- **v1.1**: Mobile application (iOS/Android)
- **v1.2**: Advanced analytics and reporting
- **v1.3**: Integration with learning management systems
- **v2.0**: Multi-tenant architecture for SaaS deployment

---

**Made with ❤️ by the Edulink Team**

*Connecting students with opportunities, one internship at a time.*