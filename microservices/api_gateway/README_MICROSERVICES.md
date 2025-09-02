# Edulink Website - Microservices Version

This is the microservices-connected version of the Edulink frontend, separated from the monolithic structure for better architecture and scalability.

## Key Differences from Monolithic Version

### API Configuration
- **API Gateway URL**: `http://localhost:8000` (instead of direct service calls)
- **Monolithic URL**: `http://localhost:8001` (for backward compatibility)
- All API calls are routed through the API Gateway for better service orchestration

### Architecture Benefits
1. **Service Isolation**: Each microservice runs independently
2. **Scalability**: Services can be scaled individually based on demand
3. **Technology Diversity**: Different services can use different technologies
4. **Fault Tolerance**: Failure in one service doesn't affect others
5. **Development Independence**: Teams can work on different services simultaneously

## Microservices Structure

### Available Services
- **Auth Service**: User authentication and authorization
- **User Service**: User profile and management
- **Internship Service**: Internship listings and management
- **Application Service**: Application processing and tracking
- **Notification Service**: Email and notification handling
- **API Gateway**: Central routing and load balancing

### Database Architecture
- **Schema-aware**: Each service has its own database schema
- **Supabase Integration**: All services connect to Supabase with proper isolation
- **Data Integrity**: Cross-service data consistency maintained

## Setup Instructions

### Prerequisites
1. All microservices must be running
2. API Gateway must be configured and running on port 8000
3. Database migrations must be completed for all services

### Running the Frontend
1. Ensure all microservices are running:
   - Auth Service
   - User Service
   - Internship Service
   - Application Service
   - Notification Service
   - API Gateway

2. Start a local web server in this directory:
   ```bash
   # Using Python
   python -m http.server 3000
   
   # Using Node.js
   npx serve -p 3000
   
   # Using PHP
   php -S localhost:3000
   ```

3. Access the application at `http://localhost:3000`

## Configuration Files Updated

The following files have been updated to work with the microservices architecture:

- `js/config.js` - Main API configuration
- `dashboards/admin/employer/js/modules/api-utils.js` - Employer dashboard API
- `dashboards/admin/institutions/dashboard.html` - Institution management
- `dashboards/admin/employer/employer-login.html` - Employer authentication
- `dashboards/admin/institutions/api.js` - Institution API calls
- `assets/js/institution-search.js` - Institution search functionality
- `dashboards/student/student_dash_debug.html` - Student dashboard debugging

## API Gateway Endpoints

All API calls are routed through the API Gateway with the following pattern:
- Base URL: `http://localhost:8000`
- Authentication: `/api/auth/*`
- Users: `/api/users/*`
- Internships: `/api/internships/*`
- Applications: `/api/applications/*`
- Notifications: `/api/notifications/*`
- Dashboards: `/api/dashboards/*`

## Development Notes

- This version is designed to work with the microservices architecture
- All hardcoded URLs have been updated to use the API Gateway
- The original monolithic version remains in the `Edulink_website` directory
- Cross-origin requests are handled by the API Gateway
- Authentication tokens are managed centrally through the API Gateway

## Troubleshooting

1. **API Gateway not responding**: Ensure the API Gateway is running on port 8000
2. **Service unavailable**: Check that all required microservices are running
3. **Authentication issues**: Verify the Auth Service is properly configured
4. **CORS errors**: Ensure the API Gateway has proper CORS configuration

For more information about the microservices architecture, refer to the main project documentation.