/**
 * Lazy Loading Utility Module
 * Handles lazy loading of charts, images, and other resource-intensive components
 */

class LazyLoader {
    constructor() {
        this.observers = new Map();
        this.loadedComponents = new Set();
        this.loadingComponents = new Set();
        this.init();
    }

    init() {
        // Initialize Intersection Observer for lazy loading
        this.setupIntersectionObserver();
        // Setup lazy loading for existing elements
        this.setupLazyElements();
    }

    setupIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            this.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadComponent(entry.target);
                    }
                });
            }, {
                rootMargin: '50px 0px',
                threshold: 0.1
            });
        }
    }

    setupLazyElements() {
        // Setup lazy loading for charts
        document.querySelectorAll('[data-lazy-chart]').forEach(element => {
            this.observeElement(element);
        });

        // Setup lazy loading for images
        document.querySelectorAll('[data-lazy-src]').forEach(element => {
            this.observeElement(element);
        });

        // Setup lazy loading for components
        document.querySelectorAll('[data-lazy-component]').forEach(element => {
            this.observeElement(element);
        });
    }

    observeElement(element) {
        if (this.observer && !this.loadedComponents.has(element)) {
            this.observer.observe(element);
        }
    }

    async loadComponent(element) {
        const componentId = element.id || element.dataset.componentId;
        
        if (this.loadedComponents.has(element) || this.loadingComponents.has(componentId)) {
            return;
        }

        this.loadingComponents.add(componentId);
        this.observer?.unobserve(element);

        try {
            // Show loading state
            this.showLoadingState(element);

            // Determine component type and load accordingly
            if (element.dataset.lazyChart) {
                await this.loadChart(element);
            } else if (element.dataset.lazySrc) {
                await this.loadImage(element);
            } else if (element.dataset.lazyComponent) {
                await this.loadCustomComponent(element);
            }

            this.loadedComponents.add(element);
            this.hideLoadingState(element);
        } catch (error) {
            console.error('Failed to load lazy component:', error);
            this.showErrorState(element);
        } finally {
            this.loadingComponents.delete(componentId);
        }
    }

    async loadChart(element) {
        const chartType = element.dataset.lazyChart;
        const chartConfig = element.dataset.chartConfig;
        
        // Wait for Chart.js to be available
        if (typeof Chart === 'undefined') {
            await this.waitForScript('Chart');
        }

        // Load chart data if needed
        let config = {};
        if (chartConfig) {
            try {
                config = JSON.parse(chartConfig);
            } catch (e) {
                // Try to get config from a function
                if (window[chartConfig] && typeof window[chartConfig] === 'function') {
                    config = await window[chartConfig]();
                }
            }
        }

        // Create chart based on type
        switch (chartType) {
            case 'analytics':
                if (window.chartUtils) {
                    await window.chartUtils.createAnalyticsChart(element.id, config);
                }
                break;
            case 'applications':
                if (window.chartUtils) {
                    await window.chartUtils.createApplicationStatusChart(element.id, config);
                }
                break;
            case 'line':
                if (window.chartUtils) {
                    await window.chartUtils.createLineChart(element.id, config);
                }
                break;
            case 'bar':
                if (window.chartUtils) {
                    await window.chartUtils.createBarChart(element.id, config);
                }
                break;
            case 'doughnut':
                if (window.chartUtils) {
                    await window.chartUtils.createDoughnutChart(element.id, config);
                }
                break;
            default:
                console.warn(`Unknown chart type: ${chartType}`);
        }
    }

    async loadImage(element) {
        const src = element.dataset.lazySrc;
        const placeholder = element.dataset.placeholder;

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                element.src = src;
                element.classList.add('loaded');
                resolve();
            };
            img.onerror = reject;
            img.src = src;
        });
    }

    async loadCustomComponent(element) {
        const componentName = element.dataset.lazyComponent;
        const componentData = element.dataset.componentData;

        // Load component based on name
        switch (componentName) {
            case 'recent-applications':
                if (window.dashboardManager) {
                    await window.dashboardManager.loadRecentApplications();
                }
                break;
            case 'notifications':
                if (window.dashboardManager) {
                    await window.dashboardManager.loadNotifications();
                }
                break;
            case 'analytics-summary':
                if (window.dashboardManager) {
                    await window.dashboardManager.loadAnalyticsSummary();
                }
                break;
            default:
                // Try to load from global functions
                if (window[`load${componentName}`] && typeof window[`load${componentName}`] === 'function') {
                    await window[`load${componentName}`](componentData ? JSON.parse(componentData) : {});
                }
        }
    }

    showLoadingState(element) {
        element.classList.add('lazy-loading');
        
        // Add loading spinner if not present
        if (!element.querySelector('.lazy-spinner')) {
            const spinner = document.createElement('div');
            spinner.className = 'lazy-spinner';
            spinner.innerHTML = `
                <div class="flex items-center justify-center h-32">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span class="ml-2 text-gray-600">Loading...</span>
                </div>
            `;
            element.appendChild(spinner);
        }
    }

    hideLoadingState(element) {
        element.classList.remove('lazy-loading');
        const spinner = element.querySelector('.lazy-spinner');
        if (spinner) {
            spinner.remove();
        }
    }

    showErrorState(element) {
        element.classList.add('lazy-error');
        element.innerHTML = `
            <div class="flex items-center justify-center h-32 text-red-600">
                <i class="fas fa-exclamation-triangle mr-2"></i>
                <span>Failed to load content</span>
                <button class="ml-2 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200" 
                        onclick="lazyLoader.retryLoad('${element.id}')">
                    Retry
                </button>
            </div>
        `;
    }

    retryLoad(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove('lazy-error');
            this.loadedComponents.delete(element);
            this.loadComponent(element);
        }
    }

    waitForScript(globalVar, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const checkScript = () => {
                if (window[globalVar]) {
                    resolve();
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error(`Timeout waiting for ${globalVar}`));
                } else {
                    setTimeout(checkScript, 100);
                }
            };
            
            checkScript();
        });
    }

    // Manual loading methods
    loadElementById(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            this.loadComponent(element);
        }
    }

    loadElementsBySelector(selector) {
        document.querySelectorAll(selector).forEach(element => {
            this.loadComponent(element);
        });
    }

    // Preload critical components
    preloadCritical() {
        document.querySelectorAll('[data-lazy-critical]').forEach(element => {
            this.loadComponent(element);
        });
    }

    // Cleanup
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
        this.observers.clear();
        this.loadedComponents.clear();
        this.loadingComponents.clear();
    }
}

// Initialize lazy loader
const lazyLoader = new LazyLoader();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LazyLoader;
}

// Make available globally
window.lazyLoader = lazyLoader;
window.LazyLoader = LazyLoader;