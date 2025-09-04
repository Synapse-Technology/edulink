/**
 * Production Configuration and Optimization for Edulink Frontend
 * Handles environment-specific settings and performance optimizations
 */

// Production Environment Configuration
const PRODUCTION_CONFIG = {
    // Environment settings
    ENVIRONMENT: {
        IS_PRODUCTION: window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1',
        IS_DEVELOPMENT: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
        IS_STAGING: window.location.hostname.includes('staging'),
        VERSION: '1.0.0-beta'
    },
    
    // Performance settings
    PERFORMANCE: {
        ENABLE_CACHING: true,
        CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
        LAZY_LOAD_IMAGES: true,
        COMPRESS_REQUESTS: true,
        DEBOUNCE_DELAY: 300,
        THROTTLE_DELAY: 100
    },
    
    // Asset optimization
    ASSETS: {
        CDN_BASE_URL: 'https://cdn.edulink.com',
        IMAGE_QUALITY: 85,
        ENABLE_WEBP: true,
        PRELOAD_CRITICAL_ASSETS: true
    },
    
    // Monitoring and analytics
    MONITORING: {
        ENABLE_ERROR_TRACKING: true,
        ENABLE_PERFORMANCE_MONITORING: true,
        ENABLE_USER_ANALYTICS: false, // Privacy-focused
        ERROR_SAMPLE_RATE: 0.1
    },
    
    // Security settings for production
    SECURITY: {
        ENABLE_HTTPS_REDIRECT: true,
        STRICT_TRANSPORT_SECURITY: true,
        CONTENT_SECURITY_POLICY: true,
        DISABLE_CONSOLE_IN_PROD: true
    }
};

// Performance Optimization Manager
const PerformanceManager = {
    /**
     * Initialize performance optimizations
     */
    init() {
        this.setupLazyLoading();
        this.setupImageOptimization();
        this.setupCaching();
        this.setupDebouncing();
        this.monitorPerformance();
    },
    
    /**
     * Setup lazy loading for images and content
     */
    setupLazyLoading() {
        if (!PRODUCTION_CONFIG.PERFORMANCE.LAZY_LOAD_IMAGES) return;
        
        // Intersection Observer for lazy loading
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const src = img.dataset.src;
                    
                    if (src) {
                        img.src = src;
                        img.classList.remove('lazy');
                        img.classList.add('loaded');
                        observer.unobserve(img);
                    }
                }
            });
        }, {
            rootMargin: '50px 0px',
            threshold: 0.01
        });
        
        // Observe all lazy images
        document.querySelectorAll('img[data-src]').forEach(img => {
            img.classList.add('lazy');
            imageObserver.observe(img);
        });
    },
    
    /**
     * Setup image optimization
     */
    setupImageOptimization() {
        // Convert images to WebP if supported
        if (PRODUCTION_CONFIG.ASSETS.ENABLE_WEBP && this.supportsWebP()) {
            document.querySelectorAll('img').forEach(img => {
                if (img.src && !img.src.includes('.webp')) {
                    const webpSrc = img.src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
                    
                    // Test if WebP version exists
                    const testImg = new Image();
                    testImg.onload = () => {
                        img.src = webpSrc;
                    };
                    testImg.src = webpSrc;
                }
            });
        }
    },
    
    /**
     * Check WebP support
     */
    supportsWebP() {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    },
    
    /**
     * Setup intelligent caching
     */
    setupCaching() {
        if (!PRODUCTION_CONFIG.PERFORMANCE.ENABLE_CACHING) return;
        
        // Cache API responses
        const originalRequest = ApiHelper.request;
        ApiHelper.request = async function(endpoint, options = {}, urlParams = {}, rateCategory = 'API_REQUESTS') {
            const cacheKey = `api_cache_${endpoint}_${JSON.stringify(urlParams)}`;
            const cached = CacheManager.get(cacheKey);
            
            // Return cached data for GET requests
            if (cached && (!options.method || options.method === 'GET')) {
                return {
                    ok: true,
                    json: () => Promise.resolve(cached.data),
                    cached: true
                };
            }
            
            // Make actual request
            const response = await originalRequest.call(this, endpoint, options, urlParams, rateCategory);
            
            // Cache successful GET responses
            if (response.ok && (!options.method || options.method === 'GET')) {
                const data = await response.clone().json();
                CacheManager.set(cacheKey, { data, timestamp: Date.now() });
            }
            
            return response;
        };
    },
    
    /**
     * Setup debouncing for search and input events
     */
    setupDebouncing() {
        // Debounce search inputs
        document.querySelectorAll('input[type="search"], input[name*="search"]').forEach(input => {
            let timeoutId;
            const originalHandler = input.oninput;
            
            input.oninput = function(e) {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    if (originalHandler) originalHandler.call(this, e);
                }, PRODUCTION_CONFIG.PERFORMANCE.DEBOUNCE_DELAY);
            };
        });
    },
    
    /**
     * Monitor performance metrics
     */
    monitorPerformance() {
        if (!PRODUCTION_CONFIG.MONITORING.ENABLE_PERFORMANCE_MONITORING) return;
        
        // Monitor page load performance
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perfData = performance.getEntriesByType('navigation')[0];
                const metrics = {
                    loadTime: perfData.loadEventEnd - perfData.loadEventStart,
                    domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
                    firstPaint: this.getFirstPaint(),
                    timestamp: Date.now()
                };
                
                // Log performance metrics
                console.log('Performance Metrics:', metrics);
                
                // Send to monitoring service if configured
                this.sendPerformanceMetrics(metrics);
            }, 1000);
        });
    },
    
    /**
     * Get First Paint timing
     */
    getFirstPaint() {
        const paintEntries = performance.getEntriesByType('paint');
        const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
        return firstPaint ? firstPaint.startTime : null;
    },
    
    /**
     * Send performance metrics to monitoring service
     */
    async sendPerformanceMetrics(metrics) {
        try {
            await ApiHelper.request(API_CONFIG.ENDPOINTS.MONITORING.METRICS, {
                method: 'POST',
                body: JSON.stringify({
                    type: 'performance',
                    data: metrics,
                    userAgent: navigator.userAgent,
                    url: window.location.href
                })
            });
        } catch (error) {
            console.warn('Failed to send performance metrics:', error);
        }
    }
};

// Cache Manager
const CacheManager = {
    /**
     * Get cached data
     */
    get(key) {
        try {
            const cached = localStorage.getItem(`cache_${key}`);
            if (!cached) return null;
            
            const data = JSON.parse(cached);
            const now = Date.now();
            
            // Check if cache is expired
            if (now - data.timestamp > PRODUCTION_CONFIG.PERFORMANCE.CACHE_DURATION) {
                this.remove(key);
                return null;
            }
            
            return data;
        } catch (error) {
            console.warn('Cache get error:', error);
            return null;
        }
    },
    
    /**
     * Set cached data
     */
    set(key, data) {
        try {
            localStorage.setItem(`cache_${key}`, JSON.stringify({
                ...data,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.warn('Cache set error:', error);
            // Clear some cache if storage is full
            this.clearOldCache();
        }
    },
    
    /**
     * Remove cached data
     */
    remove(key) {
        try {
            localStorage.removeItem(`cache_${key}`);
        } catch (error) {
            console.warn('Cache remove error:', error);
        }
    },
    
    /**
     * Clear old cache entries
     */
    clearOldCache() {
        const now = Date.now();
        const keys = Object.keys(localStorage);
        
        keys.forEach(key => {
            if (key.startsWith('cache_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (now - data.timestamp > PRODUCTION_CONFIG.PERFORMANCE.CACHE_DURATION) {
                        localStorage.removeItem(key);
                    }
                } catch (error) {
                    localStorage.removeItem(key);
                }
            }
        });
    }
};

// Error Tracking Manager
const ErrorTracker = {
    /**
     * Initialize error tracking
     */
    init() {
        if (!PRODUCTION_CONFIG.MONITORING.ENABLE_ERROR_TRACKING) return;
        
        // Global error handler
        window.addEventListener('error', (event) => {
            this.trackError({
                type: 'javascript',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error ? event.error.stack : null
            });
        });
        
        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            this.trackError({
                type: 'promise',
                message: event.reason.message || 'Unhandled promise rejection',
                stack: event.reason.stack
            });
        });
    },
    
    /**
     * Track error
     */
    async trackError(errorData) {
        // Sample errors to avoid overwhelming the server
        if (Math.random() > PRODUCTION_CONFIG.MONITORING.ERROR_SAMPLE_RATE) {
            return;
        }
        
        const errorReport = {
            ...errorData,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            userId: ApiHelper.getAuthToken() ? 'authenticated' : 'anonymous'
        };
        
        try {
            await ApiHelper.request(API_CONFIG.ENDPOINTS.MONITORING.METRICS, {
                method: 'POST',
                body: JSON.stringify({
                    type: 'error',
                    data: errorReport
                })
            });
        } catch (error) {
            console.warn('Failed to track error:', error);
        }
    }
};

// Production Security Enhancements
const ProductionSecurity = {
    /**
     * Initialize production security
     */
    init() {
        if (!PRODUCTION_CONFIG.ENVIRONMENT.IS_PRODUCTION) return;
        
        this.disableConsole();
        this.setupHTTPSRedirect();
        this.setupCSP();
        this.preventDevTools();
    },
    
    /**
     * Disable console in production
     */
    disableConsole() {
        if (PRODUCTION_CONFIG.SECURITY.DISABLE_CONSOLE_IN_PROD) {
            console.log = console.warn = console.error = console.info = console.debug = () => {};
        }
    },
    
    /**
     * Setup HTTPS redirect
     */
    setupHTTPSRedirect() {
        if (PRODUCTION_CONFIG.SECURITY.ENABLE_HTTPS_REDIRECT && 
            window.location.protocol === 'http:' && 
            !window.location.hostname.includes('localhost')) {
            window.location.href = window.location.href.replace('http:', 'https:');
        }
    },
    
    /**
     * Setup Content Security Policy
     */
    setupCSP() {
        if (!PRODUCTION_CONFIG.SECURITY.CONTENT_SECURITY_POLICY) return;
        
        // Add CSP meta tag if not present
        if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
            const cspMeta = document.createElement('meta');
            cspMeta.httpEquiv = 'Content-Security-Policy';
            cspMeta.content = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'";
            document.head.appendChild(cspMeta);
        }
    },
    
    /**
     * Prevent dev tools (basic deterrent)
     */
    preventDevTools() {
        // Detect dev tools opening
        let devtools = {
            open: false,
            orientation: null
        };
        
        const threshold = 160;
        
        setInterval(() => {
            if (window.outerHeight - window.innerHeight > threshold || 
                window.outerWidth - window.innerWidth > threshold) {
                if (!devtools.open) {
                    devtools.open = true;
                    console.warn('Developer tools detected');
                    // Could implement additional security measures here
                }
            } else {
                devtools.open = false;
            }
        }, 500);
    }
};

// Asset Preloader
const AssetPreloader = {
    /**
     * Preload critical assets
     */
    preloadCriticalAssets() {
        if (!PRODUCTION_CONFIG.ASSETS.PRELOAD_CRITICAL_ASSETS) return;
        
        const criticalAssets = [
            'assets/js/main.js',
            '/images/logo.png'
        ];
        
        criticalAssets.forEach(asset => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = asset;
            
            if (asset.endsWith('.css')) {
                link.as = 'style';
            } else if (asset.endsWith('.js')) {
                link.as = 'script';
            } else if (asset.match(/\.(png|jpg|jpeg|gif|webp)$/)) {
                link.as = 'image';
            }
            
            document.head.appendChild(link);
        });
    }
};

// Export production modules
window.PRODUCTION_CONFIG = PRODUCTION_CONFIG;
window.PerformanceManager = PerformanceManager;
window.CacheManager = CacheManager;
window.ErrorTracker = ErrorTracker;
window.ProductionSecurity = ProductionSecurity;
window.AssetPreloader = AssetPreloader;

// Initialize production features
document.addEventListener('DOMContentLoaded', function() {
    PerformanceManager.init();
    ErrorTracker.init();
    ProductionSecurity.init();
    AssetPreloader.preloadCriticalAssets();
    
    console.log(`Edulink Frontend v${PRODUCTION_CONFIG.ENVIRONMENT.VERSION} initialized`);
});

// Service Worker registration for production
if ('serviceWorker' in navigator && PRODUCTION_CONFIG.ENVIRONMENT.IS_PRODUCTION) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}