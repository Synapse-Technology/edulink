/**
 * Enhanced Security Module for Employer Authentication
 * Provides additional security measures for employer login and session management
 */

class EmployerAuthSecurity {
    constructor() {
        this.maxLoginAttempts = 5;
        this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
        this.sessionTimeout = 60 * 60 * 1000; // 1 hour
        this.passwordMinLength = 8;
        this.init();
    }

    init() {
        this.setupSessionMonitoring();
        this.setupSecurityHeaders();
        this.cleanupExpiredAttempts();
        this.initRateLimiting();
    }

    /**
     * Validate email format with enhanced security
     */
    validateEmail(email) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        
        if (!email || typeof email !== 'string') {
            return { valid: false, message: 'Email is required' };
        }
        
        if (email.length > 254) {
            return { valid: false, message: 'Email address is too long' };
        }
        
        if (!emailRegex.test(email)) {
            return { valid: false, message: 'Please enter a valid email address' };
        }
        
        // Check for suspicious patterns
        if (this.containsSuspiciousPatterns(email)) {
            return { valid: false, message: 'Invalid email format' };
        }
        
        return { valid: true };
    }

    /**
     * Validate password strength
     */
    validatePassword(password) {
        if (!password || typeof password !== 'string') {
            return { valid: false, message: 'Password is required' };
        }
        
        if (password.length < this.passwordMinLength) {
            return { valid: false, message: `Password must be at least ${this.passwordMinLength} characters long` };
        }
        
        if (password.length > 128) {
            return { valid: false, message: 'Password is too long' };
        }
        
        // Check for common weak passwords
        if (this.isWeakPassword(password)) {
            return { valid: false, message: 'Password is too weak. Please use a stronger password.' };
        }
        
        return { valid: true };
    }

    /**
     * Check for suspicious patterns in input
     */
    containsSuspiciousPatterns(input) {
        const suspiciousPatterns = [
            /<script[^>]*>.*?<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
            /<iframe[^>]*>.*?<\/iframe>/gi,
            /eval\s*\(/gi,
            /expression\s*\(/gi
        ];
        
        return suspiciousPatterns.some(pattern => pattern.test(input));
    }

    /**
     * Check if password is commonly weak
     */
    isWeakPassword(password) {
        const weakPasswords = [
            'password', '123456', '123456789', 'qwerty', 'abc123',
            'password123', 'admin', 'letmein', 'welcome', 'monkey',
            '1234567890', 'password1', '123123', 'admin123'
        ];
        
        const lowerPassword = password.toLowerCase();
        return weakPasswords.includes(lowerPassword) || 
               /^(.)\1{7,}$/.test(password) || // Repeated characters
               /^\d+$/.test(password) || // Only numbers
               /^[a-zA-Z]+$/.test(password); // Only letters
    }

    /**
     * Track login attempts to prevent brute force attacks
     */
    trackLoginAttempt(email, success = false) {
        const key = `login_attempts_${email}`;
        const lockoutKey = `lockout_${email}`;
        
        if (success) {
            // Clear attempts on successful login
            localStorage.removeItem(key);
            localStorage.removeItem(lockoutKey);
            return { allowed: true };
        }
        
        // Check if account is locked
        const lockoutData = localStorage.getItem(lockoutKey);
        if (lockoutData) {
            const lockout = JSON.parse(lockoutData);
            if (Date.now() < lockout.until) {
                const remainingTime = Math.ceil((lockout.until - Date.now()) / 60000);
                return { 
                    allowed: false, 
                    message: `Account temporarily locked. Try again in ${remainingTime} minutes.` 
                };
            } else {
                // Lockout expired
                localStorage.removeItem(lockoutKey);
                localStorage.removeItem(key);
            }
        }
        
        // Track failed attempt
        const attempts = JSON.parse(localStorage.getItem(key) || '[]');
        attempts.push(Date.now());
        
        // Remove attempts older than 1 hour
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        const recentAttempts = attempts.filter(time => time > oneHourAgo);
        
        localStorage.setItem(key, JSON.stringify(recentAttempts));
        
        // Check if max attempts exceeded
        if (recentAttempts.length >= this.maxLoginAttempts) {
            const lockoutUntil = Date.now() + this.lockoutDuration;
            localStorage.setItem(lockoutKey, JSON.stringify({ until: lockoutUntil }));
            
            return { 
                allowed: false, 
                message: `Too many failed attempts. Account locked for ${this.lockoutDuration / 60000} minutes.` 
            };
        }
        
        const remainingAttempts = this.maxLoginAttempts - recentAttempts.length;
        return { 
            allowed: true, 
            warning: remainingAttempts <= 2 ? `${remainingAttempts} attempts remaining` : null 
        };
    }

    /**
     * Setup session monitoring for automatic logout
     */
    setupSessionMonitoring() {
        let lastActivity = Date.now();
        
        // Track user activity
        const updateActivity = () => {
            lastActivity = Date.now();
            localStorage.setItem('last_activity', lastActivity.toString());
        };
        
        // Monitor for activity
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
            document.addEventListener(event, updateActivity, true);
        });
        
        // Check session timeout every minute
        setInterval(() => {
            const storedActivity = localStorage.getItem('last_activity');
            const lastActivityTime = storedActivity ? parseInt(storedActivity) : lastActivity;
            
            if (Date.now() - lastActivityTime > this.sessionTimeout) {
                this.handleSessionTimeout();
            }
        }, 60000);
    }

    /**
     * Handle session timeout
     */
    handleSessionTimeout() {
        if (localStorage.getItem('access_token')) {
            this.logout('Session expired due to inactivity');
        }
    }

    /**
     * Secure logout function
     */
    logout(reason = 'Logged out') {
        // Clear all authentication data
        const keysToRemove = [
            'access_token', 'refresh_token', 'user', 'employerProfile',
            'profilePicUrl', 'last_activity'
        ];
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Show logout message
        if (reason !== 'Logged out') {
            alert(reason + '. Please log in again.');
        }
        
        // Redirect to login
        window.location.href = './employer-login.html';
    }

    /**
     * Setup security headers for requests
     */
    setupSecurityHeaders() {
        // Override fetch to add security headers
        const originalFetch = window.fetch;
        window.fetch = function(url, options = {}) {
            options.headers = {
                ...options.headers,
                'X-Requested-With': 'XMLHttpRequest',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            };
            
            return originalFetch(url, options);
        };
    }

    /**
     * Clean up expired login attempts
     */
    cleanupExpiredAttempts() {
        const keys = Object.keys(localStorage);
        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000);
        
        keys.forEach(key => {
            if (key.startsWith('login_attempts_')) {
                try {
                    const attempts = JSON.parse(localStorage.getItem(key) || '[]');
                    const recentAttempts = attempts.filter(time => time > oneHourAgo);
                    
                    if (recentAttempts.length === 0) {
                        localStorage.removeItem(key);
                    } else if (recentAttempts.length < attempts.length) {
                        localStorage.setItem(key, JSON.stringify(recentAttempts));
                    }
                } catch (e) {
                    localStorage.removeItem(key);
                }
            }
            
            if (key.startsWith('lockout_')) {
                try {
                    const lockout = JSON.parse(localStorage.getItem(key) || '{}');
                    if (lockout.until && now > lockout.until) {
                        localStorage.removeItem(key);
                        localStorage.removeItem(key.replace('lockout_', 'login_attempts_'));
                    }
                } catch (e) {
                    localStorage.removeItem(key);
                }
            }
        });
    }

    /**
     * Sanitize input to prevent XSS
     */
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .trim()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;')
            .replace(/\x00/g, '') // Remove null bytes
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Remove control characters
    }

    /**
     * Validate and sanitize form data
     */
    validateFormData(formData) {
        const errors = [];
        const sanitized = {};
        
        for (const [key, value] of Object.entries(formData)) {
            // Sanitize the value
            const sanitizedValue = this.sanitizeInput(value);
            
            // Validate based on field type
            switch (key) {
                case 'email':
                    const emailValidation = this.validateEmail(sanitizedValue);
                    if (!emailValidation.valid) {
                        errors.push(`Email: ${emailValidation.message}`);
                    }
                    break;
                case 'password':
                    const passwordValidation = this.validatePassword(sanitizedValue);
                    if (!passwordValidation.valid) {
                        errors.push(`Password: ${passwordValidation.message}`);
                    }
                    break;
                case 'company_name':
                case 'title':
                case 'description':
                    if (sanitizedValue.length > 500) {
                        errors.push(`${key}: Text is too long (max 500 characters)`);
                    }
                    break;
                case 'phone':
                    if (sanitizedValue && !this.validatePhone(sanitizedValue)) {
                        errors.push('Phone: Invalid phone number format');
                    }
                    break;
            }
            
            sanitized[key] = sanitizedValue;
        }
        
        return {
            valid: errors.length === 0,
            errors: errors,
            data: sanitized
        };
    }

    /**
     * Validate phone number format
     */
    validatePhone(phone) {
        const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{7,15}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    }

    /**
     * Validate URL format
     */
    validateURL(url) {
        try {
            const urlObj = new URL(url);
            return ['http:', 'https:'].includes(urlObj.protocol);
        } catch {
            return false;
        }
    }

    /**
     * Prevent SQL injection patterns
     */
    containsSQLInjection(input) {
        const sqlPatterns = [
            /('|(\-\-)|(;)|(\||\|)|(\*|\*))/i,
            /(union|select|insert|delete|update|drop|create|alter|exec|execute)/i,
            /(script|javascript|vbscript|onload|onerror|onclick)/i
        ];
        
        return sqlPatterns.some(pattern => pattern.test(input));
    }

    /**
     * Rate limiting implementation
     */
    initRateLimiting() {
        this.rateLimits = new Map();
        this.requestCounts = new Map();
        
        // Default rate limits (requests per minute)
        this.defaultLimits = {
            login: 5,
            api: 60,
            form_submission: 10,
            password_reset: 3
        };
    }

    /**
     * Check if request is within rate limit
     */
    checkRateLimit(identifier, action = 'api') {
        const now = Date.now();
        const windowMs = 60000; // 1 minute window
        const limit = this.defaultLimits[action] || this.defaultLimits.api;
        
        const key = `${identifier}_${action}`;
        
        if (!this.requestCounts.has(key)) {
            this.requestCounts.set(key, []);
        }
        
        const requests = this.requestCounts.get(key);
        
        // Remove old requests outside the window
        const validRequests = requests.filter(timestamp => now - timestamp < windowMs);
        
        if (validRequests.length >= limit) {
            return {
                allowed: false,
                retryAfter: Math.ceil((validRequests[0] + windowMs - now) / 1000),
                message: `Rate limit exceeded. Try again in ${Math.ceil((validRequests[0] + windowMs - now) / 1000)} seconds.`
            };
        }
        
        // Add current request
        validRequests.push(now);
        this.requestCounts.set(key, validRequests);
        
        return {
            allowed: true,
            remaining: limit - validRequests.length
        };
    }

    /**
     * Get client identifier for rate limiting
     */
    getClientIdentifier() {
        // Use a combination of IP simulation and browser fingerprint
        const fingerprint = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset()
        ].join('|');
        
        // Simple hash function
        let hash = 0;
        for (let i = 0; i < fingerprint.length; i++) {
            const char = fingerprint.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        return Math.abs(hash).toString(36);
    }

    /**
     * Apply rate limiting to login attempts
     */
    rateLimitLogin() {
        const identifier = this.getClientIdentifier();
        return this.checkRateLimit(identifier, 'login');
    }

    /**
     * Apply rate limiting to form submissions
     */
    rateLimitFormSubmission() {
        const identifier = this.getClientIdentifier();
        return this.checkRateLimit(identifier, 'form_submission');
    }

    /**
     * Apply rate limiting to API calls
     */
    rateLimitAPI() {
        const identifier = this.getClientIdentifier();
        return this.checkRateLimit(identifier, 'api');
    }

    /**
     * Show rate limit message to user
     */
    showRateLimitMessage(rateLimitResult) {
        if (!rateLimitResult.allowed) {
            this.showMessage(rateLimitResult.message, 'error');
            return false;
        }
        return true;
    }

    /**
     * Generate secure random token for CSRF protection
     */
    generateCSRFToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Validate authentication token
     */
    validateAuthToken() {
        const token = localStorage.getItem('access_token');
        if (!token) return false;
        
        try {
            // Basic JWT structure validation
            const parts = token.split('.');
            if (parts.length !== 3) return false;
            
            // Decode payload to check expiration
            const payload = JSON.parse(atob(parts[1]));
            const now = Math.floor(Date.now() / 1000);
            
            if (payload.exp && payload.exp < now) {
                this.logout('Session expired');
                return false;
            }
            
            return true;
        } catch (e) {
            this.logout('Invalid session');
            return false;
        }
    }

    /**
     * Check if user has employer role
     */
    validateEmployerRole() {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            return user.role === 'employer';
        } catch (e) {
            return false;
        }
    }

    /**
     * Initialize security for employer pages
     */
    initializePageSecurity() {
        // Validate authentication and role
        if (!this.validateAuthToken() || !this.validateEmployerRole()) {
            this.logout('Access denied');
            return false;
        }
        
        // Setup page-specific security
        this.preventClickjacking();
        this.setupCSPViolationReporting();
        this.preventURLCredentialExposure();
        
        return true;
    }

    /**
     * Prevent credential exposure through URL parameters
     */
    preventURLCredentialExposure() {
        if (window.location.search) {
            const urlParams = new URLSearchParams(window.location.search);
            const sensitiveParams = ['email', 'password', 'token', 'key', 'secret'];
            
            let foundSensitive = false;
            sensitiveParams.forEach(param => {
                if (urlParams.has(param)) {
                    foundSensitive = true;
                    console.warn(`SECURITY WARNING: Sensitive parameter '${param}' detected in URL`);
                }
            });
            
            if (foundSensitive) {
                // Clear URL parameters immediately
                window.history.replaceState({}, document.title, window.location.pathname);
                
                // Show security warning to user
                if (typeof alert !== 'undefined') {
                    alert('Security Warning: Sensitive information was detected in the URL and has been cleared for your protection.');
                }
            }
        }
    }

    /**
     * Prevent clickjacking attacks
     */
    preventClickjacking() {
        if (window.top !== window.self) {
            window.top.location = window.self.location;
        }
    }

    /**
     * Setup CSP violation reporting
     */
    setupCSPViolationReporting() {
        document.addEventListener('securitypolicyviolation', (e) => {
            console.warn('CSP Violation:', {
                directive: e.violatedDirective,
                blockedURI: e.blockedURI,
                lineNumber: e.lineNumber,
                sourceFile: e.sourceFile
            });
        });
    }
}

// Initialize security module
const employerAuthSecurity = new EmployerAuthSecurity();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmployerAuthSecurity;
} else {
    window.EmployerAuthSecurity = EmployerAuthSecurity;
    window.employerAuthSecurity = employerAuthSecurity;
}