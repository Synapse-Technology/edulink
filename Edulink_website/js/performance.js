/**
 * Performance Optimization Module for Edulink Frontend
 * Advanced caching, lazy loading, and performance monitoring
 */

// Performance Configuration
const PERFORMANCE_CONFIG = {
    // Cache settings
    CACHE: {
        version: '1.0.0',
        maxSize: 50 * 1024 * 1024, // 50MB
        defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
        cleanupInterval: 60 * 60 * 1000, // 1 hour
        compressionThreshold: 1024 // 1KB
    },
    
    // Lazy loading settings
    LAZY_LOADING: {
        rootMargin: '50px',
        threshold: 0.1,
        imageQuality: 0.8,
        placeholderColor: '#f3f4f6'
    },
    
    // Performance monitoring
    MONITORING: {
        sampleRate: 0.1, // 10% of users
        metricsInterval: 30000, // 30 seconds
        maxMetrics: 100
    },
    
    // Bundle optimization
    BUNDLE: {
        chunkSize: 244 * 1024, // 244KB
        preloadThreshold: 0.5, // 50% probability
        criticalResources: [
            '/js/config.js',
            '/js/security.js',
            'assets/css/main.css'
        ]
    }
};

// Advanced Cache Manager
const AdvancedCacheManager = {
    cache: new Map(),
    metadata: new Map(),
    
    /**
     * Initialize cache manager
     */
    init() {
        this.loadCacheFromStorage();
        this.startCleanupInterval();
        this.monitorCacheSize();
    },
    
    /**
     * Set cache item with compression and metadata
     */
    async set(key, data, options = {}) {
        const ttl = options.ttl || PERFORMANCE_CONFIG.CACHE.defaultTTL;
        const compress = options.compress !== false;
        
        let processedData = data;
        let isCompressed = false;
        
        // Compress large data
        if (compress && this.getDataSize(data) > PERFORMANCE_CONFIG.CACHE.compressionThreshold) {
            try {
                processedData = await this.compressData(data);
                isCompressed = true;
            } catch (error) {
                console.warn('Cache compression failed:', error);
            }
        }
        
        const cacheItem = {
            data: processedData,
            timestamp: Date.now(),
            ttl: ttl,
            compressed: isCompressed,
            size: this.getDataSize(processedData),
            accessCount: 0,
            lastAccess: Date.now()
        };
        
        this.cache.set(key, cacheItem);
        this.updateMetadata(key, cacheItem);
        
        // Check cache size and cleanup if needed
        await this.ensureCacheSize();
        
        // Persist to localStorage
        this.saveCacheToStorage(key, cacheItem);
    },
    
    /**
     * Get cache item with decompression
     */
    async get(key) {
        const cacheItem = this.cache.get(key);
        
        if (!cacheItem) {
            return null;
        }
        
        // Check if expired
        if (Date.now() - cacheItem.timestamp > cacheItem.ttl) {
            this.delete(key);
            return null;
        }
        
        // Update access statistics
        cacheItem.accessCount++;
        cacheItem.lastAccess = Date.now();
        
        let data = cacheItem.data;
        
        // Decompress if needed
        if (cacheItem.compressed) {
            try {
                data = await this.decompressData(data);
            } catch (error) {
                console.warn('Cache decompression failed:', error);
                this.delete(key);
                return null;
            }
        }
        
        return data;
    },
    
    /**
     * Delete cache item
     */
    delete(key) {
        this.cache.delete(key);
        this.metadata.delete(key);
        localStorage.removeItem(`cache_${key}`);
    },
    
    /**
     * Clear all cache
     */
    clear() {
        this.cache.clear();
        this.metadata.clear();
        
        // Clear localStorage cache items
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('cache_')) {
                localStorage.removeItem(key);
            }
        });
    },
    
    /**
     * Compress data using built-in compression
     */
    async compressData(data) {
        const jsonString = JSON.stringify(data);
        
        if (typeof CompressionStream !== 'undefined') {
            const stream = new CompressionStream('gzip');
            const writer = stream.writable.getWriter();
            const reader = stream.readable.getReader();
            
            writer.write(new TextEncoder().encode(jsonString));
            writer.close();
            
            const chunks = [];
            let done = false;
            
            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) chunks.push(value);
            }
            
            return new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], []));
        }
        
        // Fallback: simple base64 encoding
        return btoa(jsonString);
    },
    
    /**
     * Decompress data
     */
    async decompressData(compressedData) {
        if (typeof DecompressionStream !== 'undefined' && compressedData instanceof Uint8Array) {
            const stream = new DecompressionStream('gzip');
            const writer = stream.writable.getWriter();
            const reader = stream.readable.getReader();
            
            writer.write(compressedData);
            writer.close();
            
            const chunks = [];
            let done = false;
            
            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) chunks.push(value);
            }
            
            const decompressed = new TextDecoder().decode(
                new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], []))
            );
            
            return JSON.parse(decompressed);
        }
        
        // Fallback: base64 decoding
        return JSON.parse(atob(compressedData));
    },
    
    /**
     * Get data size in bytes
     */
    getDataSize(data) {
        if (data instanceof Uint8Array) {
            return data.length;
        }
        return new Blob([JSON.stringify(data)]).size;
    },
    
    /**
     * Ensure cache doesn't exceed size limit
     */
    async ensureCacheSize() {
        const totalSize = Array.from(this.cache.values())
            .reduce((sum, item) => sum + item.size, 0);
        
        if (totalSize > PERFORMANCE_CONFIG.CACHE.maxSize) {
            await this.evictLeastUsed();
        }
    },
    
    /**
     * Evict least recently used items
     */
    async evictLeastUsed() {
        const items = Array.from(this.cache.entries())
            .map(([key, item]) => ({ key, ...item }))
            .sort((a, b) => {
                // Sort by access frequency and recency
                const scoreA = a.accessCount * (Date.now() - a.lastAccess);
                const scoreB = b.accessCount * (Date.now() - b.lastAccess);
                return scoreA - scoreB;
            });
        
        // Remove bottom 25% of items
        const itemsToRemove = Math.ceil(items.length * 0.25);
        
        for (let i = 0; i < itemsToRemove; i++) {
            this.delete(items[i].key);
        }
    },
    
    /**
     * Load cache from localStorage
     */
    loadCacheFromStorage() {
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('cache_')) {
                    const cacheKey = key.replace('cache_', '');
                    const cacheItem = JSON.parse(localStorage.getItem(key));
                    
                    // Check if not expired
                    if (Date.now() - cacheItem.timestamp <= cacheItem.ttl) {
                        this.cache.set(cacheKey, cacheItem);
                        this.updateMetadata(cacheKey, cacheItem);
                    } else {
                        localStorage.removeItem(key);
                    }
                }
            });
        } catch (error) {
            console.warn('Failed to load cache from storage:', error);
        }
    },
    
    /**
     * Save cache item to localStorage
     */
    saveCacheToStorage(key, cacheItem) {
        try {
            // Don't save compressed data to localStorage (too large)
            if (!cacheItem.compressed) {
                localStorage.setItem(`cache_${key}`, JSON.stringify(cacheItem));
            }
        } catch (error) {
            console.warn('Failed to save cache to storage:', error);
        }
    },
    
    /**
     * Update cache metadata
     */
    updateMetadata(key, cacheItem) {
        this.metadata.set(key, {
            size: cacheItem.size,
            timestamp: cacheItem.timestamp,
            accessCount: cacheItem.accessCount,
            lastAccess: cacheItem.lastAccess
        });
    },
    
    /**
     * Start cleanup interval
     */
    startCleanupInterval() {
        setInterval(() => {
            this.cleanup();
        }, PERFORMANCE_CONFIG.CACHE.cleanupInterval);
    },
    
    /**
     * Cleanup expired items
     */
    cleanup() {
        const now = Date.now();
        const expiredKeys = [];
        
        this.cache.forEach((item, key) => {
            if (now - item.timestamp > item.ttl) {
                expiredKeys.push(key);
            }
        });
        
        expiredKeys.forEach(key => this.delete(key));
    },
    
    /**
     * Monitor cache size
     */
    monitorCacheSize() {
        if (window.ENVIRONMENT?.isDevelopment) {
            setInterval(() => {
                const totalSize = Array.from(this.cache.values())
                    .reduce((sum, item) => sum + item.size, 0);
                
                console.log(`Cache size: ${(totalSize / 1024 / 1024).toFixed(2)}MB (${this.cache.size} items)`);
            }, 60000); // Every minute
        }
    },
    
    /**
     * Get cache statistics
     */
    getStats() {
        const totalSize = Array.from(this.cache.values())
            .reduce((sum, item) => sum + item.size, 0);
        
        const totalAccesses = Array.from(this.cache.values())
            .reduce((sum, item) => sum + item.accessCount, 0);
        
        return {
            itemCount: this.cache.size,
            totalSize: totalSize,
            averageSize: totalSize / this.cache.size || 0,
            totalAccesses: totalAccesses,
            hitRate: totalAccesses / (totalAccesses + this.missCount || 0),
            compressionRatio: this.getCompressionRatio()
        };
    },
    
    /**
     * Get compression ratio
     */
    getCompressionRatio() {
        const compressedItems = Array.from(this.cache.values())
            .filter(item => item.compressed);
        
        if (compressedItems.length === 0) return 0;
        
        return compressedItems.length / this.cache.size;
    }
};

// Enhanced Lazy Loading Manager
const LazyLoadingManager = {
    observer: null,
    imageObserver: null,
    loadedImages: new Set(),
    
    /**
     * Initialize lazy loading
     */
    init() {
        this.setupIntersectionObserver();
        this.setupImageLazyLoading();
        this.setupContentLazyLoading();
        this.preloadCriticalImages();
    },
    
    /**
     * Setup intersection observer
     */
    setupIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            this.observer = new IntersectionObserver(
                this.handleIntersection.bind(this),
                {
                    rootMargin: PERFORMANCE_CONFIG.LAZY_LOADING.rootMargin,
                    threshold: PERFORMANCE_CONFIG.LAZY_LOADING.threshold
                }
            );
        }
    },
    
    /**
     * Setup image lazy loading
     */
    setupImageLazyLoading() {
        if ('IntersectionObserver' in window) {
            this.imageObserver = new IntersectionObserver(
                this.handleImageIntersection.bind(this),
                {
                    rootMargin: '100px',
                    threshold: 0.01
                }
            );
            
            // Observe all lazy images
            document.querySelectorAll('img[data-src], img[loading="lazy"]').forEach(img => {
                this.prepareImageForLazyLoading(img);
                this.imageObserver.observe(img);
            });
        }
    },
    
    /**
     * Setup content lazy loading
     */
    setupContentLazyLoading() {
        if (this.observer) {
            document.querySelectorAll('[data-lazy-load]').forEach(element => {
                this.observer.observe(element);
            });
        }
    },
    
    /**
     * Handle intersection for general elements
     */
    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                this.loadElement(entry.target);
                this.observer.unobserve(entry.target);
            }
        });
    },
    
    /**
     * Handle image intersection
     */
    handleImageIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                this.loadImage(entry.target);
                this.imageObserver.unobserve(entry.target);
            }
        });
    },
    
    /**
     * Prepare image for lazy loading
     */
    prepareImageForLazyLoading(img) {
        // Create placeholder
        if (!img.src && !img.style.backgroundColor) {
            img.style.backgroundColor = PERFORMANCE_CONFIG.LAZY_LOADING.placeholderColor;
            img.style.minHeight = '200px';
        }
        
        // Add loading class
        img.classList.add('lazy-loading');
    },
    
    /**
     * Load image with optimization
     */
    async loadImage(img) {
        const src = img.dataset.src || img.src;
        if (!src || this.loadedImages.has(src)) return;
        
        try {
            // Preload image
            const preloadImg = new Image();
            
            await new Promise((resolve, reject) => {
                preloadImg.onload = resolve;
                preloadImg.onerror = reject;
                preloadImg.src = this.optimizeImageUrl(src, img);
            });
            
            // Apply loaded image
            img.src = preloadImg.src;
            img.classList.remove('lazy-loading');
            img.classList.add('lazy-loaded');
            
            this.loadedImages.add(src);
            
            // Fade in animation
            img.style.opacity = '0';
            img.style.transition = 'opacity 0.3s ease-in-out';
            
            requestAnimationFrame(() => {
                img.style.opacity = '1';
            });
            
        } catch (error) {
            console.warn('Failed to load image:', src, error);
            img.classList.add('lazy-error');
        }
    },
    
    /**
     * Optimize image URL based on device and viewport
     */
    optimizeImageUrl(src, img) {
        // Get optimal dimensions
        const rect = img.getBoundingClientRect();
        const devicePixelRatio = window.devicePixelRatio || 1;
        
        const optimalWidth = Math.ceil(rect.width * devicePixelRatio);
        const optimalHeight = Math.ceil(rect.height * devicePixelRatio);
        
        // Add optimization parameters if supported by backend
        const url = new URL(src, window.location.origin);
        
        if (optimalWidth > 0) {
            url.searchParams.set('w', optimalWidth.toString());
        }
        
        if (optimalHeight > 0) {
            url.searchParams.set('h', optimalHeight.toString());
        }
        
        // Add quality parameter
        url.searchParams.set('q', (PERFORMANCE_CONFIG.LAZY_LOADING.imageQuality * 100).toString());
        
        // Add format optimization
        if (this.supportsWebP()) {
            url.searchParams.set('f', 'webp');
        }
        
        return url.toString();
    },
    
    /**
     * Load lazy element content
     */
    async loadElement(element) {
        const loadType = element.dataset.lazyLoad;
        
        try {
            switch (loadType) {
                case 'component':
                    await this.loadComponent(element);
                    break;
                case 'content':
                    await this.loadContent(element);
                    break;
                case 'script':
                    await this.loadScript(element);
                    break;
                default:
                    console.warn('Unknown lazy load type:', loadType);
            }
        } catch (error) {
            console.error('Failed to lazy load element:', error);
        }
    },
    
    /**
     * Load component dynamically
     */
    async loadComponent(element) {
        const componentName = element.dataset.component;
        const componentUrl = element.dataset.componentUrl;
        
        if (componentUrl) {
            const response = await fetch(componentUrl);
            const html = await response.text();
            element.innerHTML = html;
        }
    },
    
    /**
     * Load content from API
     */
    async loadContent(element) {
        const contentUrl = element.dataset.contentUrl;
        
        if (contentUrl) {
            const cachedContent = await AdvancedCacheManager.get(`content_${contentUrl}`);
            
            if (cachedContent) {
                element.innerHTML = cachedContent;
            } else {
                const response = await fetch(contentUrl);
                const content = await response.text();
                element.innerHTML = content;
                
                // Cache content
                await AdvancedCacheManager.set(`content_${contentUrl}`, content, {
                    ttl: 30 * 60 * 1000 // 30 minutes
                });
            }
        }
    },
    
    /**
     * Load script dynamically
     */
    async loadScript(element) {
        const scriptUrl = element.dataset.scriptUrl;
        
        if (scriptUrl) {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = scriptUrl;
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }
    },
    
    /**
     * Preload critical images
     */
    preloadCriticalImages() {
        const criticalImages = document.querySelectorAll('img[data-critical="true"]');
        
        criticalImages.forEach(img => {
            const src = img.dataset.src || img.src;
            if (src) {
                const preloadLink = document.createElement('link');
                preloadLink.rel = 'preload';
                preloadLink.as = 'image';
                preloadLink.href = src;
                document.head.appendChild(preloadLink);
            }
        });
    },
    
    /**
     * Check WebP support
     */
    supportsWebP() {
        if (this._webpSupport !== undefined) {
            return this._webpSupport;
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        
        this._webpSupport = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
        return this._webpSupport;
    }
};

// Performance Monitor
const PerformanceMonitor = {
    metrics: [],
    observer: null,
    
    /**
     * Initialize performance monitoring
     */
    init() {
        if (Math.random() > PERFORMANCE_CONFIG.MONITORING.sampleRate) {
            return; // Skip monitoring for this user
        }
        
        this.setupPerformanceObserver();
        this.startMetricsCollection();
        this.monitorVitals();
    },
    
    /**
     * Setup performance observer
     */
    setupPerformanceObserver() {
        if ('PerformanceObserver' in window) {
            this.observer = new PerformanceObserver((list) => {
                list.getEntries().forEach(entry => {
                    this.recordMetric(entry);
                });
            });
            
            try {
                this.observer.observe({ entryTypes: ['navigation', 'resource', 'paint', 'largest-contentful-paint'] });
            } catch (error) {
                console.warn('Performance observer setup failed:', error);
            }
        }
    },
    
    /**
     * Start metrics collection
     */
    startMetricsCollection() {
        setInterval(() => {
            this.collectCurrentMetrics();
        }, PERFORMANCE_CONFIG.MONITORING.metricsInterval);
    },
    
    /**
     * Monitor Core Web Vitals
     */
    monitorVitals() {
        // Largest Contentful Paint
        if ('PerformanceObserver' in window) {
            try {
                const lcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    this.recordVital('LCP', lastEntry.startTime);
                });
                lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
            } catch (error) {
                console.warn('LCP monitoring failed:', error);
            }
        }
        
        // First Input Delay
        if ('PerformanceEventTiming' in window) {
            const fidObserver = new PerformanceObserver((list) => {
                list.getEntries().forEach(entry => {
                    if (entry.name === 'first-input') {
                        this.recordVital('FID', entry.processingStart - entry.startTime);
                    }
                });
            });
            
            try {
                fidObserver.observe({ entryTypes: ['first-input'] });
            } catch (error) {
                console.warn('FID monitoring failed:', error);
            }
        }
        
        // Cumulative Layout Shift
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
            list.getEntries().forEach(entry => {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                }
            });
            this.recordVital('CLS', clsValue);
        });
        
        try {
            clsObserver.observe({ entryTypes: ['layout-shift'] });
        } catch (error) {
            console.warn('CLS monitoring failed:', error);
        }
    },
    
    /**
     * Record performance metric
     */
    recordMetric(entry) {
        const metric = {
            name: entry.name,
            type: entry.entryType,
            startTime: entry.startTime,
            duration: entry.duration,
            timestamp: Date.now()
        };
        
        this.metrics.push(metric);
        
        // Keep only recent metrics
        if (this.metrics.length > PERFORMANCE_CONFIG.MONITORING.maxMetrics) {
            this.metrics.shift();
        }
    },
    
    /**
     * Record Core Web Vital
     */
    recordVital(name, value) {
        const vital = {
            name: name,
            value: value,
            timestamp: Date.now(),
            url: window.location.href
        };
        
        // Send to analytics if available
        if (window.gtag) {
            window.gtag('event', name, {
                value: Math.round(value),
                custom_parameter_1: window.location.pathname
            });
        }
        
        // Log in development
        if (window.ENVIRONMENT?.isDevelopment) {
            console.log(`Core Web Vital - ${name}:`, value);
        }
    },
    
    /**
     * Collect current performance metrics
     */
    collectCurrentMetrics() {
        const metrics = {
            memory: this.getMemoryUsage(),
            timing: this.getTimingMetrics(),
            cache: AdvancedCacheManager.getStats(),
            timestamp: Date.now()
        };
        
        // Send to monitoring service if available
        if (window.ENVIRONMENT?.isProduction && window.ErrorTracker) {
            window.ErrorTracker.logPerformanceMetrics(metrics);
        }
    },
    
    /**
     * Get memory usage
     */
    getMemoryUsage() {
        if ('memory' in performance) {
            return {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            };
        }
        return null;
    },
    
    /**
     * Get timing metrics
     */
    getTimingMetrics() {
        const navigation = performance.getEntriesByType('navigation')[0];
        
        if (navigation) {
            return {
                domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
                firstPaint: this.getFirstPaint(),
                firstContentfulPaint: this.getFirstContentfulPaint()
            };
        }
        
        return null;
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
     * Get First Contentful Paint timing
     */
    getFirstContentfulPaint() {
        const paintEntries = performance.getEntriesByType('paint');
        const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        return fcp ? fcp.startTime : null;
    }
};

// Bundle Optimizer
const BundleOptimizer = {
    loadedChunks: new Set(),
    preloadedResources: new Set(),
    
    /**
     * Initialize bundle optimization
     */
    init() {
        this.preloadCriticalResources();
        this.setupDynamicImports();
        this.optimizeResourceHints();
    },
    
    /**
     * Preload critical resources
     */
    preloadCriticalResources() {
        PERFORMANCE_CONFIG.BUNDLE.criticalResources.forEach(resource => {
            if (!this.preloadedResources.has(resource)) {
                this.preloadResource(resource);
                this.preloadedResources.add(resource);
            }
        });
    },
    
    /**
     * Preload individual resource
     */
    preloadResource(href) {
        const link = document.createElement('link');
        link.rel = 'preload';
        
        if (href.endsWith('.js')) {
            link.as = 'script';
        } else if (href.endsWith('.css')) {
            link.as = 'style';
        } else {
            link.as = 'fetch';
            link.crossOrigin = 'anonymous';
        }
        
        link.href = href;
        document.head.appendChild(link);
    },
    
    /**
     * Setup dynamic imports
     */
    setupDynamicImports() {
        // Monitor for dynamic import opportunities
        document.addEventListener('click', (event) => {
            const target = event.target.closest('[data-dynamic-import]');
            if (target) {
                const modulePath = target.dataset.dynamicImport;
                this.loadModule(modulePath);
            }
        });
    },
    
    /**
     * Load module dynamically
     */
    async loadModule(modulePath) {
        if (this.loadedChunks.has(modulePath)) {
            return;
        }
        
        try {
            const module = await import(modulePath);
            this.loadedChunks.add(modulePath);
            return module;
        } catch (error) {
            console.error('Failed to load module:', modulePath, error);
        }
    },
    
    /**
     * Optimize resource hints
     */
    optimizeResourceHints() {
        // Add dns-prefetch for external domains
        const externalDomains = this.getExternalDomains();
        externalDomains.forEach(domain => {
            const link = document.createElement('link');
            link.rel = 'dns-prefetch';
            link.href = `//${domain}`;
            document.head.appendChild(link);
        });
    },
    
    /**
     * Get external domains from page resources
     */
    getExternalDomains() {
        const domains = new Set();
        const currentDomain = window.location.hostname;
        
        // Check all links and scripts
        document.querySelectorAll('a[href], script[src], link[href], img[src]').forEach(element => {
            const url = element.href || element.src;
            if (url) {
                try {
                    const urlObj = new URL(url);
                    if (urlObj.hostname !== currentDomain) {
                        domains.add(urlObj.hostname);
                    }
                } catch (error) {
                    // Invalid URL, skip
                }
            }
        });
        
        return Array.from(domains);
    }
};

// Export performance modules
window.AdvancedCacheManager = AdvancedCacheManager;
window.LazyLoadingManager = LazyLoadingManager;
window.PerformanceMonitor = PerformanceMonitor;
window.BundleOptimizer = BundleOptimizer;
window.PERFORMANCE_CONFIG = PERFORMANCE_CONFIG;

// Initialize performance optimization on page load
document.addEventListener('DOMContentLoaded', function() {
    AdvancedCacheManager.init();
    LazyLoadingManager.init();
    PerformanceMonitor.init();
    BundleOptimizer.init();
    
    console.log('Performance optimization initialized');
});

// Enhanced ApiHelper integration for caching
if (window.ApiHelper) {
    const originalRequest = window.ApiHelper.request;
    
    window.ApiHelper.request = async function(url, options = {}) {
        const method = options.method || 'GET';
        const cacheKey = `api_${method}_${url}`;
        
        // Check cache for GET requests
        if (method === 'GET' && !options.skipCache) {
            const cachedResponse = await AdvancedCacheManager.get(cacheKey);
            if (cachedResponse) {
                return new Response(JSON.stringify(cachedResponse), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }
        
        const response = await originalRequest.call(this, url, options);
        
        // Cache successful GET responses
        if (response.ok && method === 'GET' && !options.skipCache) {
            try {
                const responseData = await response.clone().json();
                await AdvancedCacheManager.set(cacheKey, responseData, {
                    ttl: options.cacheTTL || 5 * 60 * 1000 // 5 minutes default
                });
            } catch (error) {
                // Response is not JSON, skip caching
            }
        }
        
        return response;
    };
}