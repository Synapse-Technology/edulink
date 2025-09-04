/**
 * EduLink Error Handler JavaScript
 * Centralized error display system with accessibility and responsive design
 */

class ErrorHandler {
    constructor() {
        this.toastContainer = null;
        this.activeToasts = new Set();
        this.modalOverlay = null;
        this.init();
    }

    init() {
        // Create toast container
        this.createToastContainer();
        
        // Bind global error handlers
        this.bindGlobalHandlers();
        
        // Initialize ARIA live regions for screen readers
        this.createAriaLiveRegions();
    }

    createToastContainer() {
        if (!this.toastContainer) {
            this.toastContainer = document.createElement('div');
            this.toastContainer.className = 'error-toast-container';
            this.toastContainer.setAttribute('aria-live', 'polite');
            this.toastContainer.setAttribute('aria-label', 'Notifications');
            document.body.appendChild(this.toastContainer);
        }
    }

    createAriaLiveRegions() {
        // Create polite announcements region
        const politeRegion = document.createElement('div');
        politeRegion.setAttribute('aria-live', 'polite');
        politeRegion.setAttribute('aria-atomic', 'true');
        politeRegion.className = 'sr-only';
        politeRegion.id = 'error-announcements-polite';
        document.body.appendChild(politeRegion);

        // Create assertive announcements region
        const assertiveRegion = document.createElement('div');
        assertiveRegion.setAttribute('aria-live', 'assertive');
        assertiveRegion.setAttribute('aria-atomic', 'true');
        assertiveRegion.className = 'sr-only';
        assertiveRegion.id = 'error-announcements-assertive';
        document.body.appendChild(assertiveRegion);
    }

    bindGlobalHandlers() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.showError({
                type: 'error',
                title: 'Unexpected Error',
                message: 'An unexpected error occurred. Please try again.',
                details: event.reason?.message || 'Unknown error',
                actions: [{
                    text: 'Reload Page',
                    action: () => window.location.reload()
                }]
            });
        });

        // Handle JavaScript errors
        window.addEventListener('error', (event) => {
            console.error('JavaScript Error:', event.error);
            this.showError({
                type: 'error',
                title: 'Script Error',
                message: 'A script error occurred. Some features may not work properly.',
                details: event.error?.message || 'Unknown script error'
            });
        });

        // Handle network errors
        window.addEventListener('offline', () => {
            this.showError({
                type: 'warning',
                title: 'Connection Lost',
                message: 'You are currently offline. Some features may not be available.',
                persistent: true
            });
        });

        window.addEventListener('online', () => {
            this.showSuccess({
                title: 'Connection Restored',
                message: 'You are back online. All features are now available.'
            });
        });
    }

    /**
     * Display an error message
     * @param {Object} options - Error display options
     * @param {string} options.type - Error type: 'info', 'success', 'warning', 'error', 'critical'
     * @param {string} options.title - Error title
     * @param {string} options.message - Error message
     * @param {string} options.details - Additional error details
     * @param {Array} options.actions - Array of action objects {text, action, secondary}
     * @param {string} options.displayType - Display type: 'inline', 'toast', 'modal'
     * @param {HTMLElement} options.container - Container for inline errors
     * @param {boolean} options.dismissible - Whether error can be dismissed
     * @param {number} options.autoHide - Auto-hide timeout in milliseconds
     * @param {boolean} options.persistent - Whether error persists across page loads
     */
    showError(options) {
        const config = {
            type: 'error',
            displayType: 'toast',
            dismissible: true,
            autoHide: options.type === 'critical' ? 0 : 5000,
            persistent: false,
            ...options
        };

        // Announce to screen readers
        this.announceToScreenReader(config.title + '. ' + config.message, config.type === 'critical');

        switch (config.displayType) {
            case 'inline':
                return this.createInlineError(config);
            case 'modal':
                return this.createModalError(config);
            case 'toast':
            default:
                return this.createToastError(config);
        }
    }

    showSuccess(options) {
        return this.showError({ ...options, type: 'success' });
    }

    showWarning(options) {
        return this.showError({ ...options, type: 'warning' });
    }

    showInfo(options) {
        return this.showError({ ...options, type: 'info' });
    }

    showCritical(options) {
        return this.showError({ ...options, type: 'critical', displayType: 'modal', autoHide: 0 });
    }

    createInlineError(config) {
        const errorElement = this.createErrorElement(config, 'inline');
        
        if (config.container) {
            // Clear existing errors in container
            const existingErrors = config.container.querySelectorAll('.error-component');
            existingErrors.forEach(error => error.remove());
            
            config.container.appendChild(errorElement);
        }
        
        return errorElement;
    }

    createToastError(config) {
        const errorElement = this.createErrorElement(config, 'toast');
        errorElement.classList.add('error-toast');
        
        this.toastContainer.appendChild(errorElement);
        this.activeToasts.add(errorElement);
        
        // Trigger animation
        requestAnimationFrame(() => {
            errorElement.classList.add('show');
        });
        
        // Auto-hide if configured
        if (config.autoHide > 0) {
            setTimeout(() => {
                this.dismissError(errorElement);
            }, config.autoHide);
        }
        
        return errorElement;
    }

    createModalError(config) {
        // Remove existing modal if present
        if (this.modalOverlay) {
            this.modalOverlay.remove();
        }

        this.modalOverlay = document.createElement('div');
        this.modalOverlay.className = 'error-modal-overlay';
        this.modalOverlay.setAttribute('role', 'dialog');
        this.modalOverlay.setAttribute('aria-modal', 'true');
        this.modalOverlay.setAttribute('aria-labelledby', 'error-modal-title');
        
        const modal = document.createElement('div');
        modal.className = 'error-modal';
        
        const header = document.createElement('div');
        header.className = 'error-modal__header';
        
        const title = document.createElement('h2');
        title.id = 'error-modal-title';
        title.className = 'error-component__title';
        title.textContent = config.title;
        header.appendChild(title);
        
        const body = document.createElement('div');
        body.className = 'error-modal__body';
        
        const errorContent = this.createErrorElement(config, 'modal');
        errorContent.classList.remove('error-component');
        body.appendChild(errorContent);
        
        const footer = document.createElement('div');
        footer.className = 'error-modal__footer';
        
        // Add actions or default close button
        if (config.actions && config.actions.length > 0) {
            config.actions.forEach(action => {
                const button = this.createActionButton(action);
                footer.appendChild(button);
            });
        }
        
        // Always add close button
        const closeButton = this.createActionButton({
            text: 'Close',
            action: () => this.dismissModal(),
            secondary: true
        });
        footer.appendChild(closeButton);
        
        modal.appendChild(header);
        modal.appendChild(body);
        modal.appendChild(footer);
        this.modalOverlay.appendChild(modal);
        
        // Handle escape key and backdrop click
        this.modalOverlay.addEventListener('click', (e) => {
            if (e.target === this.modalOverlay) {
                this.dismissModal();
            }
        });
        
        document.addEventListener('keydown', this.handleModalKeydown.bind(this));
        
        document.body.appendChild(this.modalOverlay);
        
        // Focus management
        const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) {
            firstFocusable.focus();
        }
        
        return this.modalOverlay;
    }

    createErrorElement(config, variant = 'default') {
        const errorElement = document.createElement('div');
        errorElement.className = `error-component error-component--${config.type}`;
        
        if (variant === 'inline') {
            errorElement.classList.add('error-component--inline');
        } else if (variant === 'compact') {
            errorElement.classList.add('error-component--compact');
        }
        
        errorElement.setAttribute('role', 'alert');
        errorElement.setAttribute('aria-live', config.type === 'critical' ? 'assertive' : 'polite');
        
        // Icon
        const icon = document.createElement('div');
        icon.className = 'error-component__icon';
        icon.setAttribute('aria-hidden', 'true');
        
        const iconElement = document.createElement('i');
        iconElement.className = this.getIconClass(config.type);
        icon.appendChild(iconElement);
        
        // Content
        const content = document.createElement('div');
        content.className = 'error-component__content';
        
        if (config.title) {
            const title = document.createElement('div');
            title.className = 'error-component__title';
            title.textContent = config.title;
            content.appendChild(title);
        }
        
        if (config.message) {
            const message = document.createElement('div');
            message.className = 'error-component__message';
            message.textContent = config.message;
            content.appendChild(message);
        }
        
        if (config.details) {
            const details = document.createElement('div');
            details.className = 'error-component__details';
            details.textContent = config.details;
            content.appendChild(details);
        }
        
        // Actions
        if (config.actions && config.actions.length > 0) {
            const actions = document.createElement('div');
            actions.className = 'error-component__actions';
            
            config.actions.forEach(action => {
                const button = this.createActionButton(action);
                actions.appendChild(button);
            });
            
            content.appendChild(actions);
        }
        
        // Dismiss button
        if (config.dismissible) {
            const dismissButton = document.createElement('button');
            dismissButton.className = 'error-component__dismiss';
            dismissButton.setAttribute('aria-label', 'Dismiss notification');
            dismissButton.innerHTML = '<i class="fas fa-times"></i>';
            dismissButton.addEventListener('click', () => {
                this.dismissError(errorElement);
            });
            errorElement.appendChild(dismissButton);
        }
        
        errorElement.appendChild(icon);
        errorElement.appendChild(content);
        
        return errorElement;
    }

    createActionButton(action) {
        const button = document.createElement('button');
        button.className = `error-action-btn ${action.secondary ? 'error-action-btn--secondary' : ''}`;
        button.textContent = action.text;
        
        if (action.icon) {
            const icon = document.createElement('i');
            icon.className = action.icon;
            button.insertBefore(icon, button.firstChild);
        }
        
        button.addEventListener('click', () => {
            if (typeof action.action === 'function') {
                action.action();
            }
        });
        
        return button;
    }

    getIconClass(type) {
        const icons = {
            info: 'fas fa-info-circle',
            success: 'fas fa-check-circle',
            warning: 'fas fa-exclamation-triangle',
            error: 'fas fa-exclamation-circle',
            critical: 'fas fa-times-circle'
        };
        return icons[type] || icons.error;
    }

    dismissError(errorElement) {
        if (errorElement.classList.contains('error-toast')) {
            errorElement.classList.remove('show');
            setTimeout(() => {
                if (errorElement.parentNode) {
                    errorElement.parentNode.removeChild(errorElement);
                }
                this.activeToasts.delete(errorElement);
            }, 300);
        } else {
            if (errorElement.parentNode) {
                errorElement.parentNode.removeChild(errorElement);
            }
        }
    }

    dismissModal() {
        if (this.modalOverlay) {
            document.removeEventListener('keydown', this.handleModalKeydown.bind(this));
            this.modalOverlay.remove();
            this.modalOverlay = null;
        }
    }

    handleModalKeydown(event) {
        if (event.key === 'Escape') {
            this.dismissModal();
        }
    }

    announceToScreenReader(message, assertive = false) {
        const regionId = assertive ? 'error-announcements-assertive' : 'error-announcements-polite';
        const region = document.getElementById(regionId);
        
        if (region) {
            region.textContent = message;
            // Clear after announcement
            setTimeout(() => {
                region.textContent = '';
            }, 1000);
        }
    }

    // Form validation helpers
    showFieldError(fieldElement, message) {
        this.clearFieldError(fieldElement);
        
        const fieldContainer = fieldElement.closest('.form-field') || fieldElement.parentNode;
        fieldContainer.classList.add('form-field--error');
        
        const errorElement = document.createElement('div');
        errorElement.className = 'form-field-error';
        errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        errorElement.setAttribute('role', 'alert');
        
        fieldContainer.appendChild(errorElement);
        
        // Update field aria-describedby
        const errorId = `error-${Date.now()}`;
        errorElement.id = errorId;
        fieldElement.setAttribute('aria-describedby', errorId);
        fieldElement.setAttribute('aria-invalid', 'true');
    }

    clearFieldError(fieldElement) {
        const fieldContainer = fieldElement.closest('.form-field') || fieldElement.parentNode;
        fieldContainer.classList.remove('form-field--error');
        
        const existingError = fieldContainer.querySelector('.form-field-error');
        if (existingError) {
            existingError.remove();
        }
        
        fieldElement.removeAttribute('aria-describedby');
        fieldElement.removeAttribute('aria-invalid');
    }

    // API error handling
    handleApiError(error, context = {}) {
        let errorConfig = {
            type: 'error',
            title: 'Request Failed',
            message: 'An error occurred while processing your request.',
            displayType: context.displayType || 'toast'
        };

        if (error.response) {
            // Server responded with error status
            const status = error.response.status;
            const data = error.response.data;

            switch (status) {
                case 400:
                    errorConfig.title = 'Invalid Request';
                    errorConfig.message = data.message || 'Please check your input and try again.';
                    if (data.errors) {
                        errorConfig.details = Object.entries(data.errors)
                            .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
                            .join('\n');
                    }
                    break;
                case 401:
                    errorConfig.title = 'Authentication Required';
                    errorConfig.message = 'Please log in to continue.';
                    errorConfig.actions = [{
                        text: 'Log In',
                        action: () => window.location.href = '/auth/login/'
                    }];
                    break;
                case 403:
                    errorConfig.title = 'Access Denied';
                    errorConfig.message = 'You do not have permission to perform this action.';
                    break;
                case 404:
                    errorConfig.title = 'Not Found';
                    errorConfig.message = 'The requested resource was not found.';
                    break;
                case 429:
                    errorConfig.title = 'Too Many Requests';
                    errorConfig.message = 'Please wait a moment before trying again.';
                    errorConfig.type = 'warning';
                    break;
                case 500:
                    errorConfig.title = 'Server Error';
                    errorConfig.message = 'An internal server error occurred. Please try again later.';
                    errorConfig.actions = [{
                        text: 'Retry',
                        action: context.retryAction
                    }];
                    break;
                default:
                    errorConfig.details = `HTTP ${status}: ${error.response.statusText}`;
            }
        } else if (error.request) {
            // Network error
            errorConfig.title = 'Network Error';
            errorConfig.message = 'Unable to connect to the server. Please check your internet connection.';
            errorConfig.actions = [{
                text: 'Retry',
                action: context.retryAction
            }];
        } else {
            // Other error
            errorConfig.details = error.message;
        }

        return this.showError(errorConfig);
    }

    // Utility methods
    clearAllErrors(container = document) {
        const errors = container.querySelectorAll('.error-component');
        errors.forEach(error => this.dismissError(error));
    }

    clearAllToasts() {
        this.activeToasts.forEach(toast => this.dismissError(toast));
    }
}

// Global instance
window.ErrorHandler = new ErrorHandler();

// Convenience methods
window.showError = (options) => window.ErrorHandler.showError(options);
window.showSuccess = (options) => window.ErrorHandler.showSuccess(options);
window.showWarning = (options) => window.ErrorHandler.showWarning(options);
window.showInfo = (options) => window.ErrorHandler.showInfo(options);
window.showCritical = (options) => window.ErrorHandler.showCritical(options);

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandler;
}

// Add screen reader only styles if not present
if (!document.querySelector('style[data-error-handler-styles]')) {
    const style = document.createElement('style');
    style.setAttribute('data-error-handler-styles', 'true');
    style.textContent = `
        .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        }
    `;
    document.head.appendChild(style);
}