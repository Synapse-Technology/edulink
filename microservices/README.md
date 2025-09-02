# Edulink Microservices Architecture

This directory contains the extracted microservices from the Edulink monolith.

## Services

### 1. Internship Service
- **Purpose**: Manages internship postings, skill tags, and internship-related operations
- **Port**: 8001
- **Database**: internship_db
- **Key Features**:
  - Internship CRUD operations
  - Skill tag management
  - Internship verification workflow
  - Search and filtering
  - Analytics

### 2. Application Service
- **Purpose**: Handles internship applications and supervisor feedback
- **Port**: 8002
- **Database**: application_db
- **Key Features**:
  - Application lifecycle management
  - Status tracking and notifications
  - Supervisor feedback system
  - Application statistics

### 3. API Gateway
- **Purpose**: Routes requests to appropriate services and handles cross-cutting concerns
- **Port**: 8000
- **Key Features**:
  - Request routing
  - Authentication and authorization
  - Rate limiting
  - Load balancing
  - API versioning

## Architecture Principles

1. **Service Independence**: Each service can be developed, deployed, and scaled independently
2. **Database per Service**: Each service owns its data and database schema
3. **API-First Design**: Services communicate through well-defined REST APIs
4. **Event-Driven Communication**: Asynchronous communication for non-critical operations
5. **Fault Tolerance**: Services handle failures gracefully with circuit breakers

## Development Setup

1. Each service has its own virtual environment and dependencies
2. Services can be run independently for development
3. Docker Compose orchestrates the entire system
4. Shared utilities are packaged as common libraries

## Migration Strategy

1. **Phase 1**: Create service interface layer in monolith
2. **Phase 2**: Extract Internship Service
3. **Phase 3**: Extract Application Service
4. **Phase 4**: Implement API Gateway and complete migration