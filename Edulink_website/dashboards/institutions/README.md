# Institution Dashboard - EduLink KE

This directory contains the complete frontend implementation for the Institution Dashboard, including API integrations, authentication, and user interface components.

## 📁 File Structure

```
institutions/
├── api.js              # Complete API implementation
├── styles.css          # Comprehensive styling
├── dashboard.html      # Main dashboard interface
├── login.html          # Authentication interface
└── README.md          # This documentation
```

## 🚀 Features

### Authentication
- **Secure Login**: JWT-based authentication with role validation
- **Auto-redirect**: Automatic redirection for authenticated users
- **Session Management**: Token storage and validation
- **Logout Functionality**: Clean session termination

### Dashboard Components
- **Statistics Overview**: Real-time dashboard metrics
- **Student Management**: View and manage institution students
- **Department Management**: Handle academic departments
- **Internship Tracking**: Monitor internship programs
- **Reports & Analytics**: Comprehensive reporting system

### API Integration
- **Modular Design**: Organized API calls by functionality
- **Error Handling**: Comprehensive error management
- **Authentication Headers**: Automatic token inclusion
- **CSRF Protection**: Built-in CSRF token handling

## 🔧 API Endpoints

### Authentication APIs
```javascript
// Login
InstitutionAPIs.Auth.login(email, password)

// Logout
InstitutionAPIs.Auth.logout()

// Check Authentication
InstitutionAPIs.Auth.isAuthenticated()

// Get Current User
InstitutionAPIs.Auth.getCurrentUser()
```

### Dashboard APIs
```javascript
// Get Dashboard Statistics
InstitutionAPIs.Dashboard.getStats()
// Returns: { stats: { total_students, verified_students, active_internships, pending_applications }, recent_activity: [...] }
```

### Student Management APIs
```javascript
// Get Institution Students
InstitutionAPIs.Students.getStudents()
// Returns: { results: [{ id, user: { first_name, last_name, email }, is_verified, ... }] }
```

### Department APIs
```javascript
// Get Departments
InstitutionAPIs.Departments.getDepartments()
// Returns: { departments: [{ name, courses: [...], supervisors: [...], student_count }] }

// Create Department
InstitutionAPIs.Departments.createDepartment(departmentData)
```

### Internship APIs
```javascript
// Get Internships
InstitutionAPIs.Internships.getInternships()
// Returns: { internships: [{ title, company, location, applications_count, approved_count, status }] }
```

### Reports APIs
```javascript
// Get Reports
InstitutionAPIs.Reports.getReports()
// Returns: { application_stats: {...}, performance_metrics: {...}, monthly_trends: [...] }
```

### Application Management APIs
```javascript
// Get Applications
InstitutionAPIs.Applications.getApplications()

// Update Application Status
InstitutionAPIs.Applications.updateApplicationStatus(applicationId, status, notes)
```

## 🎨 Styling Features

### Responsive Design
- **Mobile-first**: Optimized for all screen sizes
- **Grid Layouts**: Flexible grid systems
- **Breakpoints**: Tablet and mobile breakpoints

### UI Components
- **Cards**: Modern card-based layout
- **Tables**: Responsive data tables
- **Forms**: Styled form elements
- **Buttons**: Various button styles
- **Status Badges**: Color-coded status indicators
- **Loading States**: Spinner animations
- **Alerts**: Success, error, and info messages

### Color Scheme
- **Primary**: #667eea (Purple-blue gradient)
- **Secondary**: #764ba2
- **Success**: #48bb78
- **Error**: #f56565
- **Warning**: #ed8936
- **Info**: #4299e1

## 🔐 Security Features

### Authentication Security
- **JWT Tokens**: Secure token-based authentication
- **Role Validation**: Institution-specific access control
- **Auto-logout**: Automatic logout on token expiry
- **CSRF Protection**: Cross-site request forgery protection

### Data Protection
- **Input Validation**: Client-side form validation
- **Error Handling**: Secure error message display
- **Token Storage**: Secure local storage management

## 📱 User Experience

### Navigation
- **Tab System**: Easy navigation between sections
- **Breadcrumbs**: Clear navigation hierarchy
- **Active States**: Visual feedback for current section

### Interactions
- **Hover Effects**: Interactive element feedback
- **Loading States**: Clear loading indicators
- **Error Messages**: User-friendly error display
- **Success Feedback**: Confirmation messages

### Accessibility
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: ARIA labels and descriptions
- **Color Contrast**: WCAG compliant color ratios
- **Focus Indicators**: Clear focus states

## 🛠️ Setup Instructions

### Prerequisites
- Django backend with institution APIs running
- Modern web browser with JavaScript enabled
- HTTPS connection for production (recommended)

### Installation
1. **Copy Files**: Place all files in your web server directory
2. **Configure URLs**: Update API endpoints in `api.js` if needed
3. **Test Authentication**: Verify login functionality
4. **Check Permissions**: Ensure proper file permissions

### Configuration
```javascript
// Update API base URLs in api.js if needed
const API_BASE = '/institutions/api';
const AUTH_API_BASE = '/api/auth';
```

## 🧪 Testing

### Manual Testing
1. **Login Flow**: Test authentication with valid/invalid credentials
2. **Dashboard Load**: Verify all dashboard sections load correctly
3. **API Calls**: Check all API endpoints return expected data
4. **Responsive Design**: Test on different screen sizes
5. **Error Handling**: Test error scenarios

### Browser Compatibility
- **Chrome**: 80+
- **Firefox**: 75+
- **Safari**: 13+
- **Edge**: 80+

## 🐛 Troubleshooting

### Common Issues

#### Login Issues
- **Check Credentials**: Verify email and password
- **Role Validation**: Ensure user has 'institution' role
- **Network**: Check browser network tab for API errors
- **CORS**: Verify CORS settings on backend

#### Dashboard Loading Issues
- **Authentication**: Verify user is logged in
- **API Endpoints**: Check backend API availability
- **Console Errors**: Check browser console for JavaScript errors
- **Network**: Verify API responses in network tab

#### Styling Issues
- **CSS Loading**: Ensure styles.css is loaded correctly
- **Cache**: Clear browser cache
- **File Paths**: Verify correct file paths

### Debug Mode
```javascript
// Enable debug logging in browser console
localStorage.setItem('debug', 'true');
```

## 🔄 Updates and Maintenance

### Regular Updates
- **Security Patches**: Keep dependencies updated
- **API Changes**: Update API calls when backend changes
- **Browser Support**: Test with latest browser versions

### Performance Optimization
- **Minification**: Minify CSS and JavaScript for production
- **Caching**: Implement proper caching headers
- **CDN**: Use CDN for external libraries

## 📞 Support

For technical support or questions:
- **Backend Issues**: Check Django server logs
- **Frontend Issues**: Check browser console
- **API Issues**: Verify endpoint responses
- **Authentication**: Check token validity

## 📄 License

This project is part of the EduLink KE platform. All rights reserved.

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Compatibility**: Django 4.x, Modern Browsers