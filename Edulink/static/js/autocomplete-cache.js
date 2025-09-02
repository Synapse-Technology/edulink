/**
 * EdulinkAutocompleteCache - Centralized autocomplete caching system
 * Provides intelligent caching, search, and synchronization for institution data
 */
class EdulinkAutocompleteCache {
    constructor(options = {}) {
        this.config = {
            syncInterval: options.syncInterval || 30 * 60 * 1000, // 30 minutes
            storageKey: options.storageKey || 'edulink_autocomplete_cache',
            apiEndpoint: options.apiEndpoint || '/api/institutions/all/',
            maxRetries: options.maxRetries || 3,
            retryDelay: options.retryDelay || 1000,
            cacheExpiry: options.cacheExpiry || 24 * 60 * 60 * 1000, // 24 hours
            ...options
        };
        
        this.data = {
            institutions: [],
            types: [],
            lastSync: null,
            version: '1.0.0'
        };
        
        this.syncTimer = null;
        this.isInitialized = false;
        this.isSyncing = false;
        
        // Predefined abbreviation mappings
        this.abbreviations = {
            'uni': 'university',
            'univ': 'university',
            'u': 'university',
            'college': 'college',
            'col': 'college',
            'inst': 'institute',
            'institute': 'institute',
            'tech': 'technology',
            'polytechnic': 'polytechnic',
            'poly': 'polytechnic',
            'school': 'school',
            'sch': 'school',
            'academy': 'academy',
            'acad': 'academy'
        };
    }
    
    /**
     * Initialize the cache system
     */
    async init() {
        if (this.isInitialized) return;
        
        try {
            await this.loadFromStorage();
            
            // Check if cache needs refresh
            if (this.shouldSync()) {
                await this.syncWithBackend();
            }
            
            this.startPeriodicSync();
            this.isInitialized = true;
            
            console.log('EdulinkAutocompleteCache initialized successfully');
        } catch (error) {
            console.error('Failed to initialize autocomplete cache:', error);
            // Continue with empty cache
            this.isInitialized = true;
        }
    }
    
    /**
     * Load cached data from localStorage
     */
    async loadFromStorage() {
        try {
            const cached = localStorage.getItem(this.config.storageKey);
            if (cached) {
                const parsedData = JSON.parse(cached);
                
                // Validate cache structure and expiry
                if (this.isValidCache(parsedData)) {
                    this.data = parsedData;
                    console.log(`Loaded ${this.data.institutions.length} institutions from cache`);
                } else {
                    console.log('Cache invalid or expired, will refresh');
                }
            }
        } catch (error) {
            console.error('Error loading from storage:', error);
        }
    }
    
    /**
     * Save current data to localStorage
     */
    saveToStorage() {
        try {
            localStorage.setItem(this.config.storageKey, JSON.stringify(this.data));
        } catch (error) {
            console.error('Error saving to storage:', error);
        }
    }
    
    /**
     * Check if cache is valid and not expired
     */
    isValidCache(data) {
        if (!data || !data.lastSync || !Array.isArray(data.institutions)) {
            return false;
        }
        
        const now = Date.now();
        const lastSync = new Date(data.lastSync).getTime();
        return (now - lastSync) < this.config.cacheExpiry;
    }
    
    /**
     * Check if cache should be synced
     */
    shouldSync() {
        if (!this.data.lastSync) return true;
        
        const now = Date.now();
        const lastSync = new Date(this.data.lastSync).getTime();
        return (now - lastSync) > this.config.syncInterval;
    }
    
    /**
     * Sync data with backend API
     */
    async syncWithBackend(retryCount = 0) {
        if (this.isSyncing) return;
        
        this.isSyncing = true;
        
        try {
            console.log('Syncing autocomplete data with backend...');
            
            const response = await fetch(this.config.apiEndpoint, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.institutions && Array.isArray(data.institutions)) {
                this.data.institutions = data.institutions;
                this.data.types = this.extractUniqueTypes(data.institutions);
                this.data.lastSync = new Date().toISOString();
                
                this.saveToStorage();
                
                console.log(`Successfully synced ${this.data.institutions.length} institutions`);
                
                // Dispatch custom event for other components
                this.dispatchCacheUpdateEvent();
            } else {
                throw new Error('Invalid data format received from API');
            }
            
        } catch (error) {
            console.error('Sync failed:', error);
            
            // Retry logic
            if (retryCount < this.config.maxRetries) {
                console.log(`Retrying sync in ${this.config.retryDelay}ms... (${retryCount + 1}/${this.config.maxRetries})`);
                setTimeout(() => {
                    this.syncWithBackend(retryCount + 1);
                }, this.config.retryDelay * Math.pow(2, retryCount)); // Exponential backoff
            }
        } finally {
            this.isSyncing = false;
        }
    }
    
    /**
     * Extract unique institution types from institutions data
     */
    extractUniqueTypes(institutions) {
        const types = new Set();
        institutions.forEach(inst => {
            if (inst.type) {
                types.add(inst.type.trim());
            }
        });
        return Array.from(types).sort();
    }
    
    /**
     * Start periodic synchronization
     */
    startPeriodicSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }
        
        this.syncTimer = setInterval(() => {
            if (this.shouldSync()) {
                this.syncWithBackend();
            }
        }, this.config.syncInterval);
    }
    
    /**
     * Stop periodic synchronization
     */
    stopPeriodicSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }
    }
    
    /**
     * Search institutions with enhanced matching
     */
    searchInstitutions(query, limit = 10) {
        if (!query || query.length < 2) return [];
        
        const normalizedQuery = query.toLowerCase().trim();
        const results = [];
        
        // Search priority: abbreviation > exact > partial > fuzzy
        const searchMethods = [
            { method: this.searchByAbbreviation.bind(this), type: 'abbreviation' },
            { method: this.searchByExact.bind(this), type: 'exact' },
            { method: this.searchByPartial.bind(this), type: 'partial' },
            { method: this.searchByFuzzy.bind(this), type: 'fuzzy' }
        ];
        
        for (const { method, type } of searchMethods) {
            if (results.length >= limit) break;
            
            const matches = method(normalizedQuery, this.data.institutions, limit - results.length);
            matches.forEach(match => {
                if (!results.find(r => r.value === match.value)) {
                    results.push({ ...match, match_type: type });
                }
            });
        }
        
        return results.slice(0, limit);
    }
    
    /**
     * Search institution types
     */
    searchTypes(query, limit = 10) {
        if (!query || query.length < 1) return [];
        
        const normalizedQuery = query.toLowerCase().trim();
        const results = [];
        
        // Exact matches first
        this.data.types.forEach(type => {
            if (type.toLowerCase() === normalizedQuery) {
                results.push({ value: type, display: type, match_type: 'exact' });
            }
        });
        
        // Partial matches
        this.data.types.forEach(type => {
            if (type.toLowerCase().includes(normalizedQuery) && 
                !results.find(r => r.value === type)) {
                results.push({ value: type, display: type, match_type: 'partial' });
            }
        });
        
        return results.slice(0, limit);
    }
    
    /**
     * Search by abbreviation matching
     */
    searchByAbbreviation(query, institutions, limit) {
        const results = [];
        const expandedQuery = this.abbreviations[query] || query;
        
        if (expandedQuery !== query) {
            institutions.forEach(inst => {
                if (inst.name.toLowerCase().includes(expandedQuery)) {
                    results.push({
                        value: inst.name,
                        display: inst.name,
                        type: inst.type
                    });
                }
            });
        }
        
        return results.slice(0, limit);
    }
    
    /**
     * Search by exact name matching
     */
    searchByExact(query, institutions, limit) {
        const results = [];
        
        institutions.forEach(inst => {
            if (inst.name.toLowerCase() === query) {
                results.push({
                    value: inst.name,
                    display: inst.name,
                    type: inst.type
                });
            }
        });
        
        return results.slice(0, limit);
    }
    
    /**
     * Search by partial name matching
     */
    searchByPartial(query, institutions, limit) {
        const results = [];
        
        institutions.forEach(inst => {
            if (inst.name.toLowerCase().includes(query)) {
                results.push({
                    value: inst.name,
                    display: inst.name,
                    type: inst.type
                });
            }
        });
        
        return results.slice(0, limit);
    }
    
    /**
     * Search by fuzzy matching using Levenshtein distance
     */
    searchByFuzzy(query, institutions, limit) {
        const results = [];
        const maxDistance = Math.max(2, Math.floor(query.length * 0.3));
        
        institutions.forEach(inst => {
            const distance = this.levenshteinDistance(query, inst.name.toLowerCase());
            if (distance <= maxDistance) {
                results.push({
                    value: inst.name,
                    display: inst.name,
                    type: inst.type,
                    distance: distance
                });
            }
        });
        
        // Sort by distance (closer matches first)
        results.sort((a, b) => a.distance - b.distance);
        
        return results.slice(0, limit);
    }
    
    /**
     * Calculate Levenshtein distance between two strings
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
    
    /**
     * Dispatch cache update event
     */
    dispatchCacheUpdateEvent() {
        const event = new CustomEvent('edulinkCacheUpdated', {
            detail: {
                institutionsCount: this.data.institutions.length,
                typesCount: this.data.types.length,
                lastSync: this.data.lastSync
            }
        });
        window.dispatchEvent(event);
    }
    
    /**
     * Get cache statistics
     */
    getStats() {
        return {
            institutionsCount: this.data.institutions.length,
            typesCount: this.data.types.length,
            lastSync: this.data.lastSync,
            isInitialized: this.isInitialized,
            isSyncing: this.isSyncing,
            cacheSize: this.getCacheSize()
        };
    }
    
    /**
     * Get cache size in bytes (approximate)
     */
    getCacheSize() {
        try {
            return new Blob([JSON.stringify(this.data)]).size;
        } catch {
            return 0;
        }
    }
    
    /**
     * Clear cache data
     */
    clearCache() {
        this.data = {
            institutions: [],
            types: [],
            lastSync: null,
            version: '1.0.0'
        };
        
        try {
            localStorage.removeItem(this.config.storageKey);
        } catch (error) {
            console.error('Error clearing cache:', error);
        }
        
        console.log('Cache cleared successfully');
    }
    
    /**
     * Force refresh cache from backend
     */
    async forceRefresh() {
        this.data.lastSync = null;
        await this.syncWithBackend();
    }
    
    /**
     * Cleanup resources
     */
    destroy() {
        this.stopPeriodicSync();
        this.isInitialized = false;
        console.log('EdulinkAutocompleteCache destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EdulinkAutocompleteCache;
} else {
    window.EdulinkAutocompleteCache = EdulinkAutocompleteCache;
}

// Auto-initialize global instance
if (typeof window !== 'undefined') {
    window.EdulinkCache = new EdulinkAutocompleteCache();
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.EdulinkCache.init();
        });
    } else {
        window.EdulinkCache.init();
    }
}