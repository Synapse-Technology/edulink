#!/usr/bin/env bash
# Frontend-only build script for Render static deployment

set -o errexit  # exit on error

echo "Starting frontend build process..."

# Ensure we're in the frontend directory
cd "$(dirname "$0")"

# Create API configuration file with backend URL
echo "Configuring API endpoints..."
mkdir -p js
cat > js/config.js << EOF
// API Configuration for separate deployment
const API_CONFIG = {
    BASE_URL: '${API_BASE_URL:-https://edulink-api.onrender.com}',
    ENDPOINTS: {
        AUTH: '/api/auth/',
        USERS: '/api/users/',
        COURSES: '/api/courses/',
        ASSIGNMENTS: '/api/assignments/',
        SUBMISSIONS: '/api/submissions/',
        NOTIFICATIONS: '/api/notifications/'
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API_CONFIG;
}
EOF

# Update any hardcoded API URLs in existing JavaScript files
echo "Updating API URLs in JavaScript files..."
find . -name "*.js" -type f -exec sed -i 's|http://localhost:8000|${API_BASE_URL:-https://edulink-api.onrender.com}|g' {} \;
find . -name "*.js" -type f -exec sed -i 's|http://127.0.0.1:8000|${API_BASE_URL:-https://edulink-api.onrender.com}|g' {} \;

# Ensure index.html exists
if [ ! -f "index.html" ]; then
    echo "Creating index.html..."
    cp home.html index.html 2>/dev/null || echo "Warning: home.html not found, please ensure index.html exists"
fi

# Create .htaccess for proper routing (if needed)
cat > .htaccess << EOF
# Enable CORS for API calls
Header always set Access-Control-Allow-Origin "*"
Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
Header always set Access-Control-Allow-Headers "Content-Type, Authorization"

# Handle client-side routing
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
EOF

echo "Frontend build process completed successfully!"
echo "Static files are ready for deployment from: ./"