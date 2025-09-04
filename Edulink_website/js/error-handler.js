/**
 * Comprehensive Error Handling Module for Edulink Frontend
 * Enhanced error management, user feedback, and API response handling
 */

// Error Configuration
const ERROR_CONFIG = {
    // Error types and their handling strategies
    TYPES: {
        NETWORK: 'network',
        AUTHENTICATION: 'authentication',
        AUTHORIZATION: 'authorization',
        VALIDATION: 'validation',
        SERVER: 'server',
        CLIENT: 'client',
        TIMEOUT: 'timeout',
        RATE_LIMIT: 'rate_limit'
    },
    
    // HTTP status code mappings
    STATUS_CODES: {
        400: { type: 'validation', severity: 'warning', retry: false },
        401: { type: 'authentication', severity: 'error', retry: false },
        403: { type: 'authorization', severity: 'error', retry: false },
        404: { type: 'client', severity: 'warning', retry: false },
        408: { type: 'timeout', severity: 'warning', retry: true },
        409: { type: 'validation', severity: 'warning', retry: false },
        422: { type: 'validation', severity: 'warning', retry: false },
        429: { type: 'rate_limit', severity: 'warning', retry: true },
        500: { type: 'server', severity: 'error', retry: true },
        502: { type: 'server', severity: 'error', retry: true },
        503: { type: 'server', severity: 'error', retry: true },
        504: { type: 'timeout', severity: 'error', retry: true }
    },
    
    // User-friendly error messages
    MESSAGES: {
        network: {
            title: 'Connection Problem',
            message: 'Unable to connect to the server. Please check your internet connection and try again.',
            action: 'Retry'
        },
        authentication: {
            title: 'Authentication Required',
            message: 'Your session has expired. Please log in again to continue.',
            action: 'Login'
        },
        authorization: {
            title: 'Access Denied',
            message: 'You do not have permission to perform this action.',
            action: 'Contact Support'
        },
        validation: {
            title: 'Invalid Input',
            message: 'Please check your input and try again.',
            action: 'Fix Errors'
        },
        server: {
            title: 'Server Error',
            message: 'Something went wrong on our end. We\'re working to fix it.',
            action: 'Try Again'
        },
        client: {
            title: 'Not Found',
            message: 'The requested resource could not be found.',
            action: 'Go Back'
        },
        timeout: {
            title: 'Request Timeout',
            message: 'The request took too long to complete. Please try again.',
            action: 'Retry'
        },
        rate_limit: {
            title: 'Too Many Requests',
            message: 'You\'re making requests too quickly. Please wait a moment and try again.',
            action: 'Wait'
        }
    },
    
    // Retry configuration
    RETRY: {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffFactor: 2
    },
    
    // Notification settings
    NOTIFICATION: {
        duration: 5000,
        position: 'top-right',
        showProgress: true
    }
};

// Enhanced Error Handler
const ErrorHandler = {
    // Error tracking
    errorLog: [],
    retryAttempts: new Map(),
    
    /**
     * Initialize error handling
     */
    init() {
        this.setupGlobalErrorHandlers();
        this.setupUnhandledPromiseRejection();
        this.setupNetworkErrorDetection();
        this.createNotificationContainer();
    },
    
    /**
     * Setup global error handlers
     */
    setupGlobalErrorHandlers() {
        // Global JavaScript error handler
        window.addEventListener('error', (event) => {
            this.handleJavaScriptError(event.error, event.filename, event.lineno, event.colno);
        });
        
        // Resource loading error handler
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                this.handleResourceError(event.target);
            }
        }, true);
    },
    
    /**
     * Setup unhandled promise rejection handler
     */
    setupUnhandledPromiseRejection() {
        window.addEventListener('unhandledrejection', (event) => {
            this.handlePromiseRejection(event.reason);
            event.preventDefault();
        });
    },
    
    /**
     * Setup network error detection
     */
    setupNetworkErrorDetection() {
        // Monitor online/offline status
        window.addEventListener('online', () => {
            this.showNotification('Connection restored', 'success');
        });
        
        window.addEventListener('offline', () => {
            this.showNotification('Connection lost. Working offline.', 'warning', 0);
        });
    },
    
    /**
     * Handle API response errors
     */
    async handleApiError(response, requestInfo = {}) {
        const errorInfo = this.analyzeApiError(response, requestInfo);
        
        // Log error
        this.logError(errorInfo);
        
        // Handle specific error types
        switch (errorInfo.type) {
            case ERROR_CONFIG.TYPES.AUTHENTICATION:
                return this.handleAuthenticationError(errorInfo);
            
            case ERROR_CONFIG.TYPES.AUTHORIZATION:
                return this.handleAuthorizationError(errorInfo);
            
            case ERROR_CONFIG.TYPES.VALIDATION:
                return this.handleValidationError(errorInfo);
            
            case ERROR_CONFIG.TYPES.RATE_LIMIT:
                return this.handleRateLimitError(errorInfo);
            
            case ERROR_CONFIG.TYPES.SERVER:
            case ERROR_CONFIG.TYPES.TIMEOUT:
                return this.handleRetryableError(errorInfo);
            
            default:
                return this.handleGenericError(errorInfo);
        }
    },
    
    /**
     * Analyze API error response
     */
    analyzeApiError(response, requestInfo) {
        const statusConfig = ERROR_CONFIG.STATUS_CODES[response.status] || 
                           { type: 'client', severity: 'error', retry: false };
        
        return {
            status: response.status,
            statusText: response.statusText,
            type: statusConfig.type,
            severity: statusConfig.severity,
            canRetry: statusConfig.retry,
            url: response.url || requestInfo.url,
            method: requestInfo.method || 'GET',
            timestamp: new Date().toISOString(),
            requestId: this.generateRequestId()
        };
    },
    
    /**
     * Handle authentication errors
     */
    async handleAuthenticationError(errorInfo) {
        // Clear stored tokens
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        sessionStorage.removeItem('access_token');
        
        // Show authentication error
        const config = ERROR_CONFIG.MESSAGES.authentication;
        this.showErrorModal(config.title, config.message, [
            {
                text: 'Login',
                action: () => this.redirectToLogin(),
                primary: true
            },
            {
                text: 'Cancel',
                action: () => this.closeErrorModal()
            }
        ]);
        
        return { handled: true, shouldRetry: false };
    },
    
    /**
     * Handle authorization errors
     */
    async handleAuthorizationError(errorInfo) {
        const config = ERROR_CONFIG.MESSAGES.authorization;
        this.showNotification(config.message, 'error');
        
        return { handled: true, shouldRetry: false };
    },
    
    /**
     * Handle validation errors
     */
    async handleValidationError(errorInfo) {
        try {
            const response = await fetch(errorInfo.url);
            const errorData = await response.json();
            
            if (errorData.errors) {
                this.displayFieldErrors(errorData.errors);
            } else {
                const config = ERROR_CONFIG.MESSAGES.validation;
                this.showNotification(errorData.message || config.message, 'warning');
            }
        } catch (e) {
            const config = ERROR_CONFIG.MESSAGES.validation;
            this.showNotification(config.message, 'warning');
        }
        
        return { handled: true, shouldRetry: false };
    },
    
    /**
     * Handle rate limit errors
     */
    async handleRateLimitError(errorInfo) {
        const config = ERROR_CONFIG.MESSAGES.rate_limit;
        const retryAfter = this.getRetryAfterDelay(errorInfo);
        
        this.showNotification(
            `${config.message} Please wait ${Math.ceil(retryAfter / 1000)} seconds.`,
            'warning',
            retryAfter
        );
        
        return { 
            handled: true, 
            shouldRetry: true, 
            retryAfter: retryAfter 
        };
    },
    
    /**
     * Handle retryable errors
     */
    async handleRetryableError(errorInfo) {
        const requestKey = `${errorInfo.method}:${errorInfo.url}`;
        const attempts = this.retryAttempts.get(requestKey) || 0;
        
        if (attempts < ERROR_CONFIG.RETRY.maxAttempts) {
            const delay = this.calculateRetryDelay(attempts);
            this.retryAttempts.set(requestKey, attempts + 1);
            
            this.showNotification(
                `Request failed. Retrying in ${Math.ceil(delay / 1000)} seconds... (${attempts + 1}/${ERROR_CONFIG.RETRY.maxAttempts})`,
                'info',
                delay
            );
            
            return { 
                handled: true, 
                shouldRetry: true, 
                retryAfter: delay 
            };
        } else {
            // Max retries reached
            this.retryAttempts.delete(requestKey);
            const config = ERROR_CONFIG.MESSAGES[errorInfo.type];
            
            this.showErrorModal(config.title, 
                `${config.message} After ${ERROR_CONFIG.RETRY.maxAttempts} attempts, the request could not be completed.`,
                [
                    {
                        text: 'Contact Support',
                        action: () => this.openSupportDialog(errorInfo),
                        primary: true
                    },
                    {
                        text: 'Close',
                        action: () => this.closeErrorModal()
                    }
                ]
            );
            
            return { handled: true, shouldRetry: false };
        }
    },
    
    /**
     * Handle generic errors
     */
    async handleGenericError(errorInfo) {
        const config = ERROR_CONFIG.MESSAGES[errorInfo.type] || ERROR_CONFIG.MESSAGES.client;
        this.showNotification(config.message, errorInfo.severity);
        
        return { handled: true, shouldRetry: false };
    },
    
    /**
     * Handle JavaScript errors
     */
    handleJavaScriptError(error, filename, lineno, colno) {
        const errorInfo = {
            type: 'javascript',
            message: error.message,
            filename: filename,
            lineno: lineno,
            colno: colno,
            stack: error.stack,
            timestamp: new Date().toISOString()
        };
        
        this.logError(errorInfo);
        
        // Only show user notification for critical errors
        if (this.isCriticalError(error)) {
            this.showNotification(
                'An unexpected error occurred. Please refresh the page if problems persist.',
                'error'
            );
        }
    },
    
    /**
     * Handle resource loading errors
     */
    handleResourceError(element) {
        const errorInfo = {
            type: 'resource',
            element: element.tagName,
            src: element.src || element.href,
            timestamp: new Date().toISOString()
        };
        
        this.logError(errorInfo);
        
        // Try to recover from resource errors
        this.attemptResourceRecovery(element);
    },
    
    /**
     * Handle promise rejections
     */
    handlePromiseRejection(reason) {
        const errorInfo = {
            type: 'promise_rejection',
            reason: reason,
            timestamp: new Date().toISOString()
        };
        
        this.logError(errorInfo);
        
        // Handle specific promise rejection types
        if (reason && reason.name === 'AbortError') {
            // Request was aborted, don't show error
            return;
        }
        
        this.showNotification(
            'An operation could not be completed. Please try again.',
            'warning'
        );
    },
    
    /**
     * Display field-specific validation errors
     */
    displayFieldErrors(errors) {
        Object.keys(errors).forEach(fieldName => {
            const field = document.querySelector(`[name="${fieldName}"]`);
            if (field) {
                const errorMessages = Array.isArray(errors[fieldName]) 
                    ? errors[fieldName] 
                    : [errors[fieldName]];
                
                FormValidator.updateFieldUI(field, false, errorMessages[0]);
            }
        });
    },
    
    /**
     * Show notification
     */
    showNotification(message, type = 'info', duration = ERROR_CONFIG.NOTIFICATION.duration) {
        const container = document.getElementById('notification-container');
        if (!container) return;
        
        const notification = document.createElement('div');
        const notificationId = 'notification-' + Date.now();
        notification.id = notificationId;
        
        const typeClasses = {
            success: 'bg-green-500 border-green-600',
            error: 'bg-red-500 border-red-600',
            warning: 'bg-yellow-500 border-yellow-600',
            info: 'bg-blue-500 border-blue-600'
        };
        
        const typeIcons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        notification.className = `notification ${typeClasses[type]} text-white p-4 rounded-lg shadow-lg mb-3 transform transition-all duration-300 translate-x-full opacity-0`;
        
        notification.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                    <i class="${typeIcons[type]}"></i>
                    <span class="font-medium">${message}</span>
                </div>
                <button class="ml-4 text-white hover:text-gray-200 focus:outline-none" onclick="ErrorHandler.closeNotification('${notificationId}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            ${duration > 0 && ERROR_CONFIG.NOTIFICATION.showProgress ? `
                <div class="mt-2 bg-white bg-opacity-20 rounded-full h-1">
                    <div class="progress-bar bg-white h-1 rounded-full" style="animation: progress ${duration}ms linear"></div>
                </div>
            ` : ''}
        `;
        
        container.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full', 'opacity-0');
        }, 100);
        
        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.closeNotification(notificationId);
            }, duration);
        }
    },
    
    /**
     * Close notification
     */
    closeNotification(notificationId) {
        const notification = document.getElementById(notificationId);
        if (notification) {
            notification.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }
    },
    
    /**
     * Show error modal
     */
    showErrorModal(title, message, actions = []) {
        // Remove existing modal
        this.closeErrorModal();
        
        const modal = document.createElement('div');
        modal.id = 'error-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all duration-300 scale-95 opacity-0">
                <div class="p-6">
                    <div class="flex items-center space-x-3 mb-4">
                        <div class="flex-shrink-0">
                            <i class="fas fa-exclamation-triangle text-red-500 text-2xl"></i>
                        </div>
                        <h3 class="text-lg font-semibold text-gray-900">${title}</h3>
                    </div>
                    <p class="text-gray-600 mb-6">${message}</p>
                    <div class="flex space-x-3 justify-end">
                        ${actions.map(action => `
                            <button class="px-4 py-2 rounded-lg font-medium transition-colors ${
                                action.primary 
                                    ? 'bg-blue-500 text-white hover:bg-blue-600' 
                                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                            }" onclick="(${action.action.toString()})()">
                                ${action.text}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Animate in
        setTimeout(() => {
            const modalContent = modal.querySelector('div > div');
            modalContent.classList.remove('scale-95', 'opacity-0');
        }, 100);
    },
    
    /**
     * Close error modal
     */
    closeErrorModal() {
        const modal = document.getElementById('error-modal');
        if (modal) {
            const modalContent = modal.querySelector('div > div');
            modalContent.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    },
    
    /**
     * Create notification container
     */
    createNotificationContainer() {
        if (document.getElementById('notification-container')) return;
        
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'fixed top-4 right-4 z-50 max-w-sm';
        
        document.body.appendChild(container);
        
        // Add CSS for progress animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes progress {
                from { width: 100%; }
                to { width: 0%; }
            }
        `;
        document.head.appendChild(style);
    },
    
    /**
     * Utility functions
     */
    generateRequestId() {
        return Math.random().toString(36).substr(2, 9);
    },
    
    calculateRetryDelay(attempt) {
        const delay = ERROR_CONFIG.RETRY.baseDelay * Math.pow(ERROR_CONFIG.RETRY.backoffFactor, attempt);
        return Math.min(delay, ERROR_CONFIG.RETRY.maxDelay);
    },
    
    getRetryAfterDelay(errorInfo) {
        // Try to get retry-after header value, default to 30 seconds
        return 30000;
    },
    
    isCriticalError(error) {
        const criticalPatterns = [
            /Cannot read property/,
            /Cannot access before initialization/,
            /is not a function/,
            /Network Error/
        ];
        
        return criticalPatterns.some(pattern => pattern.test(error.message));
    },
    
    attemptResourceRecovery(element) {
        // Try to reload failed resources
        if (element.tagName === 'IMG') {
            setTimeout(() => {
                element.src = element.src + '?retry=' + Date.now();
            }, 2000);
        }
    },
    
    redirectToLogin() {
        window.location.href = '/login.html';
    },
    
    openSupportDialog(errorInfo) {
        // Implementation for support dialog
        console.log('Opening support dialog for error:', errorInfo);
        this.closeErrorModal();
    },
    
    logError(errorInfo) {
        // Add to error log
        this.errorLog.push(errorInfo);
        
        // Keep only last 100 errors
        if (this.errorLog.length > 100) {
            this.errorLog.shift();
        }
        
        // Log to console in development
        if (window.ENVIRONMENT?.isDevelopment) {
            console.error('Error logged:', errorInfo);
        }
        
        // Send to monitoring service in production
        if (window.ENVIRONMENT?.isProduction && window.ErrorTracker) {
            window.ErrorTracker.logError(errorInfo);
        }
    },
    
    /**
     * Get error statistics
     */
    getErrorStats() {
        const stats = {
            total: this.errorLog.length,
            byType: {},
            recent: this.errorLog.slice(-10)
        };
        
        this.errorLog.forEach(error => {
            stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
        });
        
        return stats;
    }
};

// Export error handler
window.ErrorHandler = ErrorHandler;
window.ERROR_CONFIG = ERROR_CONFIG;

// Initialize error handling on page load
document.addEventListener('DOMContentLoaded', function() {
    ErrorHandler.init();
    console.log('Error handling initialized');
});

// Enhanced ApiHelper integration
if (window.ApiHelper) {
    const originalRequest = window.ApiHelper.request;
    
    window.ApiHelper.request = async function(url, options = {}) {
        try {
            const response = await originalRequest.call(this, url, options);
            
            if (!response.ok) {
                const errorResult = await ErrorHandler.handleApiError(response, { url, ...options });
                
                if (errorResult.shouldRetry && errorResult.retryAfter) {
                    // Wait and retry
                    await new Promise(resolve => setTimeout(resolve, errorResult.retryAfter));
                    return originalRequest.call(this, url, options);
                }
                
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Clear retry attempts on success
            const requestKey = `${options.method || 'GET'}:${url}`;
            ErrorHandler.retryAttempts.delete(requestKey);
            
            return response;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw error; // Don't handle abort errors
            }
            
            // Handle network errors
            const errorInfo = {
                type: ERROR_CONFIG.TYPES.NETWORK,
                message: error.message,
                url: url,
                method: options.method || 'GET',
                timestamp: new Date().toISOString()
            };
            
            const errorResult = await ErrorHandler.handleApiError(
                { status: 0, statusText: 'Network Error', url }, 
                { url, ...options }
            );
            
            if (errorResult.shouldRetry && errorResult.retryAfter) {
                await new Promise(resolve => setTimeout(resolve, errorResult.retryAfter));
                return originalRequest.call(this, url, options);
            }
            
            throw error;
        }
    };
}