/**
 * Frontend Security Module for Edulink
 * Comprehensive security utilities and validation
 */

// Security Configuration
const SECURITY_CONFIG = {
    // Password requirements
    PASSWORD: {
        MIN_LENGTH: 8,
        REQUIRE_UPPERCASE: true,
        REQUIRE_LOWERCASE: true,
        REQUIRE_NUMBERS: true,
        REQUIRE_SPECIAL: true,
        SPECIAL_CHARS: '!@#$%^&*()_+-=[]{}|;:,.<>?'
    },
    
    // Input validation limits
    INPUT_LIMITS: {
        EMAIL_MAX_LENGTH: 254,
        NAME_MAX_LENGTH: 100,
        PHONE_MAX_LENGTH: 20,
        MESSAGE_MAX_LENGTH: 1000,
        DESCRIPTION_MAX_LENGTH: 2000
    },
    
    // Security patterns
    PATTERNS: {
        EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        PHONE: /^[+]?[1-9]?[0-9]{7,15}$/,
        ALPHANUMERIC: /^[a-zA-Z0-9\s]+$/,
        NO_SCRIPT_TAGS: /<script[^>]*>.*?<\/script>/gi,
        SQL_INJECTION: /(union|select|insert|update|delete|drop|create|alter|exec|execute)/i
    }
};

// Form Security Manager
const FormSecurity = {
    /**
     * Initialize security for all forms on the page
     */
    initializeForms() {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            this.secureForm(form);
        });
    },
    
    /**
     * Secure a specific form
     */
    secureForm(form) {
        // Add CSRF token if not present
        this.addCSRFToken(form);
        
        // Add real-time validation
        this.addRealTimeValidation(form);
        
        // Secure form submission
        form.addEventListener('submit', (e) => {
            if (!this.validateForm(form)) {
                e.preventDefault();
                return false;
            }
            
            // Sanitize form data before submission
            this.sanitizeFormInputs(form);
        });
    },
    
    /**
     * Add CSRF token to form
     */
    addCSRFToken(form) {
        const csrfToken = ApiHelper.getCSRFToken();
        if (csrfToken && !form.querySelector('input[name="csrfmiddlewaretoken"]')) {
            const csrfInput = document.createElement('input');
            csrfInput.type = 'hidden';
            csrfInput.name = 'csrfmiddlewaretoken';
            csrfInput.value = csrfToken;
            form.appendChild(csrfInput);
        }
    },
    
    /**
     * Add real-time validation to form inputs
     */
    addRealTimeValidation(form) {
        const inputs = form.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            // Add input event listener for real-time validation
            input.addEventListener('input', () => {
                this.validateInput(input);
            });
            
            // Add blur event for final validation
            input.addEventListener('blur', () => {
                this.validateInput(input, true);
            });
        });
    },
    
    /**
     * Validate individual input
     */
    validateInput(input, showErrors = false) {
        const value = input.value.trim();
        const type = input.type || input.tagName.toLowerCase();
        const name = input.name || input.id;
        
        let isValid = true;
        let errorMessage = '';
        
        // Required field validation
        if (input.hasAttribute('required') && !value) {
            isValid = false;
            errorMessage = 'This field is required';
        }
        
        // Type-specific validation
        if (value && isValid) {
            switch (type) {
                case 'email':
                    if (!SECURITY_CONFIG.PATTERNS.EMAIL.test(value)) {
                        isValid = false;
                        errorMessage = 'Please enter a valid email address';
                    } else if (value.length > SECURITY_CONFIG.INPUT_LIMITS.EMAIL_MAX_LENGTH) {
                        isValid = false;
                        errorMessage = 'Email address is too long';
                    }
                    break;
                    
                case 'password':
                    const passwordValidation = this.validatePassword(value);
                    if (!passwordValidation.isValid) {
                        isValid = false;
                        errorMessage = passwordValidation.message;
                    }
                    break;
                    
                case 'tel':
                    if (!SECURITY_CONFIG.PATTERNS.PHONE.test(value)) {
                        isValid = false;
                        errorMessage = 'Please enter a valid phone number';
                    }
                    break;
                    
                case 'text':
                case 'textarea':
                    // Check for potential security threats
                    if (SECURITY_CONFIG.PATTERNS.NO_SCRIPT_TAGS.test(value)) {
                        isValid = false;
                        errorMessage = 'Invalid characters detected';
                    } else if (SECURITY_CONFIG.PATTERNS.SQL_INJECTION.test(value)) {
                        isValid = false;
                        errorMessage = 'Invalid input detected';
                    }
                    
                    // Length validation
                    const maxLength = this.getMaxLength(name, type);
                    if (value.length > maxLength) {
                        isValid = false;
                        errorMessage = `Input is too long (max ${maxLength} characters)`;
                    }
                    break;
            }
        }
        
        // Update UI
        this.updateInputValidationUI(input, isValid, showErrors ? errorMessage : '');
        
        return isValid;
    },
    
    /**
     * Validate password strength
     */
    validatePassword(password) {
        const config = SECURITY_CONFIG.PASSWORD;
        const errors = [];
        
        if (password.length < config.MIN_LENGTH) {
            errors.push(`at least ${config.MIN_LENGTH} characters`);
        }
        
        if (config.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
            errors.push('one uppercase letter');
        }
        
        if (config.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
            errors.push('one lowercase letter');
        }
        
        if (config.REQUIRE_NUMBERS && !/\d/.test(password)) {
            errors.push('one number');
        }
        
        if (config.REQUIRE_SPECIAL && !new RegExp(`[${config.SPECIAL_CHARS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`).test(password)) {
            errors.push('one special character');
        }
        
        return {
            isValid: errors.length === 0,
            message: errors.length > 0 ? `Password must contain ${errors.join(', ')}` : 'Password is strong'
        };
    },
    
    /**
     * Get maximum length for input based on name and type
     */
    getMaxLength(name, type) {
        const limits = SECURITY_CONFIG.INPUT_LIMITS;
        
        if (name.includes('email')) return limits.EMAIL_MAX_LENGTH;
        if (name.includes('name')) return limits.NAME_MAX_LENGTH;
        if (name.includes('phone')) return limits.PHONE_MAX_LENGTH;
        if (name.includes('message') || type === 'textarea') return limits.MESSAGE_MAX_LENGTH;
        if (name.includes('description')) return limits.DESCRIPTION_MAX_LENGTH;
        
        return limits.NAME_MAX_LENGTH; // Default
    },
    
    /**
     * Update input validation UI
     */
    updateInputValidationUI(input, isValid, errorMessage) {
        // Remove existing validation classes
        input.classList.remove('is-valid', 'is-invalid', 'border-green-500', 'border-red-500');
        
        // Add appropriate classes
        if (isValid) {
            input.classList.add('is-valid', 'border-green-500');
        } else if (errorMessage) {
            input.classList.add('is-invalid', 'border-red-500');
        }
        
        // Handle error message display
        let errorElement = input.parentNode.querySelector('.validation-error');
        
        if (errorMessage) {
            if (!errorElement) {
                errorElement = document.createElement('div');
                errorElement.className = 'validation-error text-red-500 text-sm mt-1';
                input.parentNode.appendChild(errorElement);
            }
            errorElement.textContent = errorMessage;
            errorElement.style.display = 'block';
        } else if (errorElement) {
            errorElement.style.display = 'none';
        }
    },
    
    /**
     * Validate entire form
     */
    validateForm(form) {
        const inputs = form.querySelectorAll('input, textarea, select');
        let isFormValid = true;
        
        inputs.forEach(input => {
            if (!this.validateInput(input, true)) {
                isFormValid = false;
            }
        });
        
        return isFormValid;
    },
    
    /**
     * Sanitize form inputs before submission
     */
    sanitizeFormInputs(form) {
        const inputs = form.querySelectorAll('input[type="text"], input[type="email"], textarea');
        
        inputs.forEach(input => {
            if (input.type !== 'password') {
                input.value = InputSanitizer.sanitizeHTML(input.value);
            }
        });
    }
};

// Content Security Policy Helper
const CSPHelper = {
    /**
     * Check if inline scripts are allowed
     */
    isInlineScriptAllowed() {
        try {
            eval('1');
            return true;
        } catch (e) {
            return false;
        }
    },
    
    /**
     * Safely execute script content
     */
    safeExecute(scriptContent, context = window) {
        if (!this.isInlineScriptAllowed()) {
            console.warn('Inline script execution blocked by CSP');
            return false;
        }
        
        try {
            return Function(scriptContent).call(context);
        } catch (error) {
            console.error('Script execution failed:', error);
            return false;
        }
    }
};

// Session Security Manager
const SessionSecurity = {
    /**
     * Initialize session security
     */
    init() {
        this.setupSessionTimeout();
        this.setupTabVisibilityHandling();
        this.setupSecurityHeaders();
    },
    
    /**
     * Setup automatic session timeout
     */
    setupSessionTimeout() {
        let timeoutId;
        const TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes
        
        const resetTimeout = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                this.handleSessionTimeout();
            }, TIMEOUT_DURATION);
        };
        
        // Reset timeout on user activity
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, resetTimeout, true);
        });
        
        resetTimeout();
    },
    
    /**
     * Handle session timeout
     */
    handleSessionTimeout() {
        ApiHelper.showNotification('Session expired due to inactivity', 'warning');
        ApiHelper.clearAuthTokens();
        
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 3000);
    },
    
    /**
     * Setup tab visibility handling
     */
    setupTabVisibilityHandling() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Tab is hidden - could implement additional security measures
                console.log('Tab hidden - security monitoring active');
            } else {
                // Tab is visible - verify session is still valid
                this.verifySession();
            }
        });
    },
    
    /**
     * Verify session validity
     */
    async verifySession() {
        const token = ApiHelper.getAuthToken();
        if (!token) return;
        
        try {
            const response = await ApiHelper.request(API_CONFIG.ENDPOINTS.MONITORING.HEALTH, {
                method: 'GET'
            });
            
            if (!response.ok) {
                throw new Error('Session verification failed');
            }
        } catch (error) {
            console.warn('Session verification failed:', error);
            // Only show session expired message if not on login page
            if (!window.location.pathname.includes('login')) {
                ApiHelper.handleAuthError();
            }
        }
    },
    
    /**
     * Setup security headers for requests
     */
    setupSecurityHeaders() {
        // Override fetch to add security headers
        const originalFetch = window.fetch;
        window.fetch = function(url, options = {}) {
            options.headers = {
                ...options.headers,
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'X-XSS-Protection': '1; mode=block'
            };
            
            return originalFetch(url, options);
        };
    }
};

// Export security modules
window.FormSecurity = FormSecurity;
window.CSPHelper = CSPHelper;
window.SessionSecurity = SessionSecurity;
window.SECURITY_CONFIG = SECURITY_CONFIG;

// Initialize security on page load
document.addEventListener('DOMContentLoaded', function() {
    FormSecurity.initializeForms();
    SessionSecurity.init();
    
    console.log('Frontend security initialized');
});

// Additional security event listeners
window.addEventListener('beforeunload', function() {
    // Clear sensitive data before page unload
    if (sessionStorage.getItem('clearOnUnload')) {
        sessionStorage.clear();
    }
});

// Prevent right-click in production (optional)
if (API_CONFIG.BASE_URL.includes('https://')) {
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });
    
    // Prevent F12, Ctrl+Shift+I, Ctrl+U
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && e.key === 'I') ||
            (e.ctrlKey && e.key === 'u')) {
            e.preventDefault();
        }
    });
}