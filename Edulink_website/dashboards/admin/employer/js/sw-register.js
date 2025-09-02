/**
 * Service Worker Registration
 * Registers the service worker for client-side caching
 */

class ServiceWorkerManager {
    constructor() {
        this.swRegistration = null;
        this.isSupported = 'serviceWorker' in navigator;
        this.init();
    }

    async init() {
        if (!this.isSupported) {
            console.warn('Service Worker not supported in this browser');
            return;
        }

        try {
            await this.register();
            this.setupEventListeners();
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }

    async register() {
        try {
            this.swRegistration = await navigator.serviceWorker.register('/js/service-worker.js', {
                scope: '/'
            });

            console.log('Service Worker registered successfully:', this.swRegistration.scope);

            // Check for updates
            this.swRegistration.addEventListener('updatefound', () => {
                const newWorker = this.swRegistration.installing;
                console.log('New Service Worker found, installing...');

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed') {
                        if (navigator.serviceWorker.controller) {
                            // New update available
                            this.showUpdateNotification();
                        } else {
                            // First time installation
                            console.log('Service Worker installed for the first time');
                        }
                    }
                });
            });

        } catch (error) {
            console.error('Service Worker registration failed:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', event => {
            if (event.data && event.data.type === 'CACHE_UPDATED') {
                console.log('Cache updated:', event.data.url);
            }
        });

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.swRegistration) {
                this.swRegistration.update();
            }
        });
    }

    showUpdateNotification() {
        // Create update notification
        const notification = document.createElement('div');
        notification.id = 'sw-update-notification';
        notification.className = 'fixed top-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm';
        notification.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center">
                    <i class="fas fa-download mr-2"></i>
                    <span>New version available!</span>
                </div>
                <button id="sw-update-btn" class="ml-3 bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded text-sm">
                    Update
                </button>
                <button id="sw-dismiss-btn" class="ml-2 text-blue-200 hover:text-white">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(notification);

        // Handle update button click
        document.getElementById('sw-update-btn').addEventListener('click', () => {
            this.updateServiceWorker();
            notification.remove();
        });

        // Handle dismiss button click
        document.getElementById('sw-dismiss-btn').addEventListener('click', () => {
            notification.remove();
        });

        // Auto-dismiss after 10 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 10000);
    }

    async updateServiceWorker() {
        if (!this.swRegistration || !this.swRegistration.waiting) {
            return;
        }

        // Tell the waiting service worker to skip waiting
        this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });

        // Reload the page to use the new service worker
        window.location.reload();
    }

    async clearCache() {
        if (!this.isSupported) {
            return false;
        }

        try {
            const messageChannel = new MessageChannel();
            
            return new Promise((resolve) => {
                messageChannel.port1.onmessage = (event) => {
                    resolve(event.data.success);
                };

                navigator.serviceWorker.controller?.postMessage(
                    { type: 'CLEAR_CACHE' },
                    [messageChannel.port2]
                );
            });
        } catch (error) {
            console.error('Failed to clear cache:', error);
            return false;
        }
    }

    async getCacheSize() {
        if (!this.isSupported) {
            return 0;
        }

        try {
            const messageChannel = new MessageChannel();
            
            return new Promise((resolve) => {
                messageChannel.port1.onmessage = (event) => {
                    resolve(event.data.size || 0);
                };

                navigator.serviceWorker.controller?.postMessage(
                    { type: 'GET_CACHE_SIZE' },
                    [messageChannel.port2]
                );
            });
        } catch (error) {
            console.error('Failed to get cache size:', error);
            return 0;
        }
    }

    // Format cache size for display
    formatCacheSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Check if service worker is active
    isActive() {
        return this.swRegistration && navigator.serviceWorker.controller;
    }

    // Get service worker status
    getStatus() {
        if (!this.isSupported) {
            return 'not-supported';
        }
        
        if (!this.swRegistration) {
            return 'not-registered';
        }
        
        if (this.swRegistration.installing) {
            return 'installing';
        }
        
        if (this.swRegistration.waiting) {
            return 'waiting';
        }
        
        if (this.swRegistration.active) {
            return 'active';
        }
        
        return 'unknown';
    }
}

// Initialize service worker manager
const swManager = new ServiceWorkerManager();

// Make available globally
window.swManager = swManager;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ServiceWorkerManager;
}