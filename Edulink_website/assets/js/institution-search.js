/**
 * Optimized Institution Search with Client-Side Caching
 * This implementation reduces server load and improves UX by:
 * 1. Caching all institutions data locally
 * 2. Performing client-side search with debouncing
 * 3. Only refreshing cache periodically
 */

class InstitutionSearchManager {
    constructor() {
        this.API_BASE_URL = 'http://127.0.0.1:8000/api';
        this.institutionsCache = null;
        this.cacheTimestamp = null;
        this.CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
        this.searchTimeout = null;
        this.DEBOUNCE_DELAY = 150; // Reduced from 300ms for better responsiveness
        this.MIN_SEARCH_LENGTH = 2;
        this.MAX_RESULTS = 10;
        
        this.initializeSearch();
    }

    async initializeSearch() {
        await this.loadInstitutionsData();
        this.setupEventListeners();
    }

    /**
     * Load all institutions data and cache it locally
     */
    async loadInstitutionsData() {
        try {
            // Check if we have valid cached data
            if (this.institutionsCache && this.isCacheValid()) {
                console.log('Using cached institutions data');
                return;
            }

            console.log('Fetching fresh institutions data...');
            const response = await fetch(`${this.API_BASE_URL}/institutions/all/`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.institutionsCache = data.institutions;
            this.cacheTimestamp = Date.now();
            
            console.log(`Loaded ${this.institutionsCache.length} institutions into cache`);
            
            // Store in localStorage for persistence across page reloads
            this.saveCacheToStorage();
            
        } catch (error) {
            console.error('Failed to load institutions data:', error);
            
            // Try to load from localStorage as fallback
            this.loadCacheFromStorage();
            
            if (!this.institutionsCache) {
                this.showError('Failed to load institutions data. Please refresh the page.');
            }
        }
    }

    /**
     * Check if current cache is still valid
     */
    isCacheValid() {
        if (!this.cacheTimestamp) return false;
        return (Date.now() - this.cacheTimestamp) < this.CACHE_DURATION;
    }

    /**
     * Save cache to localStorage
     */
    saveCacheToStorage() {
        try {
            const cacheData = {
                institutions: this.institutionsCache,
                timestamp: this.cacheTimestamp
            };
            localStorage.setItem('edulink_institutions_cache', JSON.stringify(cacheData));
        } catch (error) {
            console.warn('Failed to save cache to localStorage:', error);
        }
    }

    /**
     * Load cache from localStorage
     */
    loadCacheFromStorage() {
        try {
            const cached = localStorage.getItem('edulink_institutions_cache');
            if (cached) {
                const cacheData = JSON.parse(cached);
                
                // Check if localStorage cache is still valid
                if ((Date.now() - cacheData.timestamp) < this.CACHE_DURATION) {
                    this.institutionsCache = cacheData.institutions;
                    this.cacheTimestamp = cacheData.timestamp;
                    console.log('Loaded institutions from localStorage cache');
                    return true;
                }
            }
        } catch (error) {
            console.warn('Failed to load cache from localStorage:', error);
        }
        return false;
    }

    /**
     * Setup event listeners for search functionality
     */
    setupEventListeners() {
        const searchInput = document.getElementById('institutionSearch');
        const searchResults = document.getElementById('searchResults');
        
        if (!searchInput || !searchResults) {
            console.error('Search elements not found');
            return;
        }

        // Input event with debouncing
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            if (query.length < this.MIN_SEARCH_LENGTH) {
                this.hideSearchResults();
                return;
            }

            // Clear previous timeout
            clearTimeout(this.searchTimeout);
            
            // Set new timeout for debounced search
            this.searchTimeout = setTimeout(() => {
                this.performClientSideSearch(query);
            }, this.DEBOUNCE_DELAY);
        });

        // Hide results when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.institution-search-container')) {
                this.hideSearchResults();
            }
        });

        // Handle keyboard navigation
        searchInput.addEventListener('keydown', (e) => {
            this.handleKeyboardNavigation(e);
        });
    }

    /**
     * Perform client-side search through cached data
     */
    performClientSideSearch(query) {
        if (!this.institutionsCache) {
            this.showError('Institution data not loaded. Please refresh the page.');
            return;
        }

        const searchTerm = query.toLowerCase();
        const results = this.institutionsCache.filter(institution => {
            return (
                institution.name.toLowerCase().includes(searchTerm) ||
                institution.display_name.toLowerCase().includes(searchTerm) ||
                institution.institution_type.toLowerCase().includes(searchTerm) ||
                (institution.county && institution.county.toLowerCase().includes(searchTerm))
            );
        });

        // Sort results by relevance
        const sortedResults = this.sortSearchResults(results, searchTerm);
        
        // Limit results
        const limitedResults = sortedResults.slice(0, this.MAX_RESULTS);
        
        this.displaySearchResults(limitedResults, query);
    }

    /**
     * Sort search results by relevance
     */
    sortSearchResults(results, searchTerm) {
        return results.sort((a, b) => {
            // Exact name matches first
            const aNameMatch = a.name.toLowerCase() === searchTerm;
            const bNameMatch = b.name.toLowerCase() === searchTerm;
            if (aNameMatch && !bNameMatch) return -1;
            if (!aNameMatch && bNameMatch) return 1;

            // Name starts with search term
            const aNameStarts = a.name.toLowerCase().startsWith(searchTerm);
            const bNameStarts = b.name.toLowerCase().startsWith(searchTerm);
            if (aNameStarts && !bNameStarts) return -1;
            if (!aNameStarts && bNameStarts) return 1;

            // Registered institutions first
            if (a.status === 'registered' && b.status !== 'registered') return -1;
            if (a.status !== 'registered' && b.status === 'registered') return 1;

            // Verified institutions first
            if (a.is_verified && !b.is_verified) return -1;
            if (!a.is_verified && b.is_verified) return 1;

            // Alphabetical order
            return a.name.localeCompare(b.name);
        });
    }

    /**
     * Display search results
     */
    displaySearchResults(results, query) {
        const searchResults = document.getElementById('searchResults');
        
        if (results.length === 0) {
            searchResults.innerHTML = `
                <div style="padding: 12px; color: #666; text-align: center;">
                    <i class="fas fa-search" style="margin-right: 8px;"></i>
                    No institutions found for "${query}"
                </div>
            `;
        } else {
            searchResults.innerHTML = results.map((institution, index) => {
                const statusBadge = this.getStatusBadge(institution.status, institution.is_verified);
                return `
                    <div class="search-result-item" 
                         data-institution='${JSON.stringify(institution)}' 
                         data-index="${index}"
                         style="padding: 12px; border-bottom: 1px solid #eee; cursor: pointer; transition: background 0.2s;" 
                         onmouseover="this.style.background='#f5f5f5'" 
                         onmouseout="this.style.background='white'">
                        <div style="font-weight: 600; color: #333; margin-bottom: 4px;">
                            ${this.highlightSearchTerm(institution.display_name, query)}
                        </div>
                        <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
                            ${institution.institution_type.toUpperCase()} • ${institution.accreditation_body.toUpperCase()}
                            ${institution.county ? ` • ${institution.county}` : ''}
                        </div>
                        ${statusBadge}
                    </div>
                `;
            }).join('');
            
            // Add click handlers
            this.attachResultClickHandlers();
        }
        
        searchResults.style.display = 'block';
    }

    /**
     * Highlight search term in results
     */
    highlightSearchTerm(text, searchTerm) {
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        return text.replace(regex, '<mark style="background: #fff3cd; padding: 1px 2px;">$1</mark>');
    }

    /**
     * Attach click handlers to search results
     */
    attachResultClickHandlers() {
        const resultItems = document.querySelectorAll('.search-result-item');
        resultItems.forEach(item => {
            item.addEventListener('click', () => {
                const institution = JSON.parse(item.dataset.institution);
                this.selectInstitution(institution);
            });
        });
    }

    /**
     * Handle keyboard navigation in search results
     */
    handleKeyboardNavigation(e) {
        const searchResults = document.getElementById('searchResults');
        const resultItems = searchResults.querySelectorAll('.search-result-item');
        
        if (resultItems.length === 0) return;

        let currentIndex = -1;
        const highlighted = searchResults.querySelector('.search-result-item.highlighted');
        if (highlighted) {
            currentIndex = parseInt(highlighted.dataset.index);
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                currentIndex = Math.min(currentIndex + 1, resultItems.length - 1);
                this.highlightResult(resultItems, currentIndex);
                break;
            case 'ArrowUp':
                e.preventDefault();
                currentIndex = Math.max(currentIndex - 1, 0);
                this.highlightResult(resultItems, currentIndex);
                break;
            case 'Enter':
                e.preventDefault();
                if (currentIndex >= 0 && resultItems[currentIndex]) {
                    const institution = JSON.parse(resultItems[currentIndex].dataset.institution);
                    this.selectInstitution(institution);
                }
                break;
            case 'Escape':
                this.hideSearchResults();
                break;
        }
    }

    /**
     * Highlight a specific result item
     */
    highlightResult(resultItems, index) {
        // Remove previous highlight
        resultItems.forEach(item => {
            item.classList.remove('highlighted');
            item.style.background = 'white';
        });

        // Add highlight to current item
        if (resultItems[index]) {
            resultItems[index].classList.add('highlighted');
            resultItems[index].style.background = '#e3f2fd';
            resultItems[index].scrollIntoView({ block: 'nearest' });
        }
    }

    /**
     * Select an institution
     */
    selectInstitution(institution) {
        const searchInput = document.getElementById('institutionSearch');
        const selectedInstitutionDiv = document.getElementById('selectedInstitution');
        const selectedInstitutionId = document.getElementById('selectedInstitutionId');
        
        searchInput.value = institution.display_name;
        this.hideSearchResults();
        
        const statusBadge = this.getStatusBadge(institution.status, institution.is_verified);
        selectedInstitutionDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: 600; margin-bottom: 4px;">${institution.display_name}</div>
                    <div style="font-size: 12px; opacity: 0.8;">
                        ${institution.institution_type.toUpperCase()} • ${institution.accreditation_body.toUpperCase()}
                        ${institution.county ? ` • ${institution.county}` : ''}
                    </div>
                </div>
                ${statusBadge}
            </div>
        `;
        selectedInstitutionDiv.style.display = 'block';
        
        // Set the institution ID for form submission
        if (institution.status === 'registered') {
            selectedInstitutionId.value = institution.id;
        } else {
            selectedInstitutionId.value = `master_${institution.id}`;
        }

        // Store selected institution globally
        window.selectedInstitution = institution;
        
        // Trigger custom event for other parts of the application
        document.dispatchEvent(new CustomEvent('institutionSelected', {
            detail: { institution }
        }));
    }

    /**
     * Get status badge HTML
     */
    getStatusBadge(status, isVerified) {
        if (status === 'registered') {
            const verificationStatus = isVerified ? 'Verified' : 'Pending Verification';
            const badgeColor = isVerified ? '#4caf50' : '#ff9800';
            const icon = isVerified ? '✓' : '⏳';
            return `<span style="display: inline-block; padding: 2px 8px; background: ${badgeColor}; color: white; border-radius: 12px; font-size: 10px; font-weight: 600;">${icon} ${verificationStatus}</span>`;
        } else {
            return '<span style="display: inline-block; padding: 2px 8px; background: #9e9e9e; color: white; border-radius: 12px; font-size: 10px; font-weight: 600;">⚠ Not Registered</span>';
        }
    }

    /**
     * Hide search results
     */
    hideSearchResults() {
        const searchResults = document.getElementById('searchResults');
        if (searchResults) {
            searchResults.style.display = 'none';
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        const searchResults = document.getElementById('searchResults');
        if (searchResults) {
            searchResults.innerHTML = `
                <div style="padding: 12px; color: #d32f2f; text-align: center;">
                    <i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>
                    ${message}
                </div>
            `;
            searchResults.style.display = 'block';
        }
    }

    /**
     * Refresh cache manually
     */
    async refreshCache() {
        this.institutionsCache = null;
        this.cacheTimestamp = null;
        localStorage.removeItem('edulink_institutions_cache');
        await this.loadInstitutionsData();
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            cached: !!this.institutionsCache,
            count: this.institutionsCache ? this.institutionsCache.length : 0,
            timestamp: this.cacheTimestamp,
            age: this.cacheTimestamp ? Date.now() - this.cacheTimestamp : null,
            valid: this.isCacheValid()
        };
    }
}

// Initialize the search manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.institutionSearchManager = new InstitutionSearchManager();
    
    // Expose refresh function globally for debugging
    window.refreshInstitutionCache = () => {
        return window.institutionSearchManager.refreshCache();
    };
    
    // Expose cache stats for debugging
    window.getInstitutionCacheStats = () => {
        return window.institutionSearchManager.getCacheStats();
    };
});