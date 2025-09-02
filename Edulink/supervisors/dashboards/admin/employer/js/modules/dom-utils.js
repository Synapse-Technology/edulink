/**
 * DOM Utilities Module
 * Handles common DOM manipulation and UI operations
 */

class DOMUtils {
    /**
     * Show element by removing hidden class
     */
    static showElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove('hidden');
        }
    }

    /**
     * Hide element by adding hidden class
     */
    static hideElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add('hidden');
        }
    }

    /**
     * Toggle element visibility
     */
    static toggleElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.toggle('hidden');
        }
    }

    /**
     * Set loading state for an element
     */
    static setLoadingState(elementId, isLoading = true) {
        const element = document.getElementById(elementId);
        if (!element) return;

        if (isLoading) {
            element.classList.add('opacity-50', 'pointer-events-none');
            element.setAttribute('aria-busy', 'true');
        } else {
            element.classList.remove('opacity-50', 'pointer-events-none');
            element.removeAttribute('aria-busy');
        }
    }

    /**
     * Create and show loading spinner
     */
    static showLoadingSpinner(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner flex items-center justify-center p-8';
        spinner.innerHTML = `
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span class="ml-2 text-gray-600">Loading...</span>
        `;
        
        container.innerHTML = '';
        container.appendChild(spinner);
    }

    /**
     * Remove loading spinner
     */
    static hideLoadingSpinner(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const spinner = container.querySelector('.loading-spinner');
        if (spinner) {
            spinner.remove();
        }
    }

    /**
     * Show error message in container
     */
    static showError(containerId, message = 'An error occurred') {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="error-message bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <div class="text-red-600 mb-2">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <p class="text-red-800">${message}</p>
                <button onclick="location.reload()" class="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                    Retry
                </button>
            </div>
        `;
    }

    /**
     * Show success message
     */
    static showSuccess(containerId, message = 'Operation successful') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const successDiv = document.createElement('div');
        successDiv.className = 'success-message bg-green-50 border border-green-200 rounded-lg p-4 text-center mb-4';
        successDiv.innerHTML = `
            <div class="text-green-600 mb-2">
                <i class="fas fa-check-circle"></i>
            </div>
            <p class="text-green-800">${message}</p>
        `;
        
        container.insertBefore(successDiv, container.firstChild);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.remove();
            }
        }, 3000);
    }

    /**
     * Format number with commas
     */
    static formatNumber(num) {
        if (num === null || num === undefined) return '0';
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    /**
     * Format date to readable string
     */
    static formatDate(dateString) {
        if (!dateString) return 'N/A';
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * Format relative time (e.g., "2 hours ago")
     */
    static formatRelativeTime(dateString) {
        if (!dateString) return 'N/A';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        
        return this.formatDate(dateString);
    }

    /**
     * Sanitize HTML to prevent XSS
     */
    static sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    /**
     * Debounce function calls
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function calls
     */
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Add event listener with cleanup
     */
    static addEventListenerWithCleanup(element, event, handler) {
        element.addEventListener(event, handler);
        
        // Return cleanup function
        return () => {
            element.removeEventListener(event, handler);
        };
    }

    /**
     * Create modal dialog
     */
    static createModal(title, content, options = {}) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                <div class="flex items-center justify-between p-4 border-b">
                    <h3 class="text-lg font-semibold">${title}</h3>
                    <button class="modal-close text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="p-4">
                    ${content}
                </div>
                ${options.showFooter !== false ? `
                    <div class="flex justify-end space-x-2 p-4 border-t">
                        <button class="modal-cancel px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
                        <button class="modal-confirm px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Confirm</button>
                    </div>
                ` : ''}
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        const closeModal = () => modal.remove();
        modal.querySelector('.modal-close').addEventListener('click', closeModal);
        
        if (options.showFooter !== false) {
            modal.querySelector('.modal-cancel').addEventListener('click', closeModal);
            modal.querySelector('.modal-confirm').addEventListener('click', () => {
                if (options.onConfirm) options.onConfirm();
                closeModal();
            });
        }
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        return modal;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DOMUtils;
} else {
    window.DOMUtils = DOMUtils;
}