/**
 * Opportunities Page JavaScript
 * Handles dynamic loading and display of opportunities from the backend API
 */

// External Opportunities Management
class ExternalOpportunitiesManager {
    constructor() {
        this.apiBaseUrl = window.API_CONFIG.BASE_URL;
        this.currentPage = 1;
        this.currentFilters = {};
        this.isLoading = false;
        this.attributionStyles = null;
        
        this.initializeEventListeners();
        this.loadAttributionStyles();
        this.loadOpportunities();
    }
    
    async loadOpportunities(page = 1) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoading();
        
        try {
            const params = new URLSearchParams({
                page: page,
                page_size: 20,
                ...this.currentFilters
            });
            
            const response = await fetch(`${this.apiBaseUrl}/internships/external/?${params}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (page === 1) {
                this.clearOpportunities();
            }
            
            this.renderOpportunities(data.results);
            this.updatePagination(data);
            this.updateResultsInfo(data);
            this.updateMetadata(data.metadata);
            
        } catch (error) {
            console.error('Error loading opportunities:', error);
            this.showError('Failed to load opportunities. Please try again.');
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }
    
    renderOpportunities(opportunities) {
        const container = document.getElementById('opportunities-grid');
        
        opportunities.forEach(opportunity => {
            const card = this.createOpportunityCard(opportunity);
            container.appendChild(card);
        });
    }
    
    async loadAttributionStyles() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/internships/external/attribution/styles/`);
            if (response.ok) {
                this.attributionStyles = await response.json();
                this.injectAttributionCSS();
            }
        } catch (error) {
            console.error('Error loading attribution styles:', error);
        }
    }
    
    injectAttributionCSS() {
        if (!this.attributionStyles || !this.attributionStyles.css) return;
        
        // Check if CSS is already injected
        if (document.getElementById('attribution-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'attribution-styles';
        style.textContent = this.attributionStyles.css;
        document.head.appendChild(style);
    }
    
    createOpportunityCard(opportunity) {
        const card = document.createElement('div');
        card.className = 'opportunity-card external-opportunity';
        card.dataset.opportunityId = opportunity.id;
        
        // Quality indicator
        const qualityClass = this.getQualityClass(opportunity.quality_score);
        
        // Get attribution HTML
        const attributionHtml = opportunity.attribution?.card || 
            `<div class="attribution-fallback">Source: ${this.escapeHtml(opportunity.source?.name || 'External')}</div>`;
        
        card.innerHTML = `
            <div class="opportunity-header">
                <div class="opportunity-badge external-badge">
                    <i class="fas fa-external-link-alt"></i>
                    External
                </div>
                <div class="quality-indicator ${qualityClass}">
                    ${this.renderQualityStars(opportunity.quality_score)}
                </div>
            </div>
            
            <div class="opportunity-content">
                <h3 class="opportunity-title">${this.escapeHtml(opportunity.title)}</h3>
                
                <div class="opportunity-meta">
                    <div class="company-info">
                        <i class="fas fa-building"></i>
                        <span>${this.escapeHtml(opportunity.company || 'Company not specified')}</span>
                    </div>
                    
                    ${opportunity.location ? `
                        <div class="location-info">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${this.escapeHtml(opportunity.location)}</span>
                        </div>
                    ` : ''}
                    
                    ${opportunity.category ? `
                        <div class="category-info">
                            <i class="fas fa-tag"></i>
                            <span>${this.escapeHtml(opportunity.category)}</span>
                        </div>
                    ` : ''}
                    
                    ${opportunity.is_recent ? `
                        <div class="recent-badge">
                            <i class="fas fa-clock"></i>
                            <span>New</span>
                        </div>
                    ` : ''}
                </div>
                
                ${opportunity.description ? `
                    <p class="opportunity-description">
                        ${this.truncateText(this.escapeHtml(opportunity.description), 150)}
                    </p>
                ` : ''}
                
                ${this.renderSalaryInfo(opportunity)}
                
                <div class="opportunity-attribution">
                    ${attributionHtml}
                </div>
            </div>
            
            <div class="opportunity-actions">
                <button class="btn btn-primary view-details-btn" 
                        onclick="opportunitiesManager.viewOpportunityDetails(${opportunity.id})">
                    <i class="fas fa-eye"></i>
                    View Details
                </button>
                
                <a href="${opportunity.external_url}" 
                   class="btn btn-outline-primary apply-btn"
                   target="_blank" 
                   rel="noopener noreferrer"
                   onclick="opportunitiesManager.trackExternalClick(${opportunity.id}, this.href)">
                    <i class="fas fa-external-link-alt"></i>
                    Apply Now
                </a>
            </div>
        `;
        
        return card;
    }
    
    async trackExternalClick(opportunityId, url) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/internships/external/track-click/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                body: JSON.stringify({
                    opportunity_id: opportunityId
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('Click tracked successfully:', data.tracking_result);
            }
        } catch (error) {
            console.error('Error tracking click:', error);
        }
        
        // Continue with navigation
        return true;
    }
    
    updateResultsInfo(data) {
        const resultsInfo = document.getElementById('results-info');
        if (!resultsInfo) return;
        
        const { count, results } = data;
        const start = (this.currentPage - 1) * 20 + 1;
        const end = Math.min(start + results.length - 1, count);
        
        resultsInfo.innerHTML = `
            <div class="results-summary">
                <span class="results-count">Showing ${start}-${end} of ${count} opportunities</span>
                ${data.metadata ? `
                    <div class="results-metadata">
                        <span class="metadata-item">
                            <i class="fas fa-database"></i>
                            ${data.metadata.active_sources} sources
                        </span>
                        <span class="metadata-item">
                            <i class="fas fa-star"></i>
                            Avg quality: ${data.metadata.average_quality}/5
                        </span>
                        <span class="metadata-item">
                            <i class="fas fa-clock"></i>
                            ${data.metadata.recent_opportunities} new this week
                        </span>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    updateMetadata(metadata) {
        if (!metadata) return;
        
        // Update any metadata displays
        const metadataElements = document.querySelectorAll('[data-metadata]');
        metadataElements.forEach(element => {
            const key = element.dataset.metadata;
            if (metadata[key] !== undefined) {
                element.textContent = metadata[key];
            }
        });
    }
    
    // Utility methods
    getQualityClass(score) {
        if (score >= 0.8) return 'quality-high';
        if (score >= 0.6) return 'quality-medium';
        return 'quality-low';
    }
    
    renderQualityStars(score) {
        const stars = Math.round(score * 5);
        return '★'.repeat(stars) + '☆'.repeat(5 - stars);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    }
    
    renderSalaryInfo(opportunity) {
        if (!opportunity.salary_min && !opportunity.salary_max) return '';
        
        let salaryText = '';
        if (opportunity.salary_min && opportunity.salary_max) {
            salaryText = `$${opportunity.salary_min} - $${opportunity.salary_max}`;
        } else if (opportunity.salary_min) {
            salaryText = `From $${opportunity.salary_min}`;
        } else {
            salaryText = `Up to $${opportunity.salary_max}`;
        }
        
        return `
            <div class="salary-info">
                <i class="fas fa-dollar-sign"></i>
                <span>${salaryText}</span>
            </div>
        `;
    }
    
    // Placeholder methods for compatibility
    initializeEventListeners() {}
    showLoading() {}
    hideLoading() {}
    showError(message) { console.error(message); }
    clearOpportunities() {
        const container = document.getElementById('opportunities-grid');
        if (container) container.innerHTML = '';
    }
    updatePagination(data) {}
}

class OpportunitiesManager {
    constructor() {
        this.apiConfig = window.API_CONFIG;
        this.currentPage = 1;
        this.itemsPerPage = 12;
        this.totalItems = 0;
        this.currentFilters = {
            category: '',
            location: '',
            search: '',
            source: '',
            quality: ''
        };
        this.isLoading = false;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadOpportunities();
        this.setupInfiniteScroll();
    }
    
    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('opportunity-search');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.currentFilters.search = e.target.value;
                    this.resetAndLoad();
                }, 500);
            });
        }
        
        // Category filters
        const categoryFilters = document.querySelectorAll('.category-filter');
        categoryFilters.forEach(filter => {
            filter.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Update active state
                categoryFilters.forEach(f => f.classList.remove('active'));
                filter.classList.add('active');
                
                this.currentFilters.category = filter.dataset.category || '';
                this.resetAndLoad();
            });
        });
        
        // Location filter
        const locationSelect = document.getElementById('location-filter');
        if (locationSelect) {
            locationSelect.addEventListener('change', (e) => {
                this.currentFilters.location = e.target.value;
                this.resetAndLoad();
            });
        }
        
        // Source filter
        const sourceSelect = document.getElementById('source-filter');
        if (sourceSelect) {
            sourceSelect.addEventListener('change', (e) => {
                this.currentFilters.source = e.target.value;
                this.resetAndLoad();
            });
        }
        
        // Quality filter
        const qualitySelect = document.getElementById('quality-filter');
        if (qualitySelect) {
            qualitySelect.addEventListener('change', (e) => {
                this.currentFilters.quality = e.target.value;
                this.resetAndLoad();
            });
        }
        
        // Sort options
        const sortSelect = document.getElementById('sort-options');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.currentFilters.sort = e.target.value;
                this.resetAndLoad();
            });
        }
    }
    
    setupInfiniteScroll() {
        const container = document.getElementById('opportunities-container');
        if (!container) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.isLoading) {
                    this.loadMoreOpportunities();
                }
            });
        }, {
            rootMargin: '100px'
        });
        
        // Create and observe a sentinel element
        const sentinel = document.createElement('div');
        sentinel.id = 'scroll-sentinel';
        sentinel.style.height = '1px';
        container.appendChild(sentinel);
        observer.observe(sentinel);
    }
    
    async loadOpportunities() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoading();
        
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                page_size: this.itemsPerPage,
                ...this.currentFilters
            });
            
            // Remove empty filters
            for (const [key, value] of params.entries()) {
                if (!value) {
                    params.delete(key);
                }
            }
            
            const response = await fetch(`${this.apiConfig.BASE_URL}${this.apiConfig.ENDPOINTS.INTERNSHIPS.LIST}?${params}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (this.currentPage === 1) {
                this.clearOpportunities();
            }
            
            this.renderOpportunities(data.results || data);
            this.updatePagination(data);
            
        } catch (error) {
            console.error('Failed to load opportunities:', error);
            this.showError('Failed to load opportunities. Please try again.');
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }
    
    async loadMoreOpportunities() {
        if (this.currentPage * this.itemsPerPage >= this.totalItems) {
            return; // No more items to load
        }
        
        this.currentPage++;
        await this.loadOpportunities();
    }
    
    resetAndLoad() {
        this.currentPage = 1;
        this.loadOpportunities();
    }
    
    renderOpportunities(opportunities) {
        const container = document.getElementById('opportunities-grid');
        if (!container) return;
        
        opportunities.forEach(opportunity => {
            const opportunityCard = this.createOpportunityCard(opportunity);
            container.appendChild(opportunityCard);
        });
        
        // Update results count
        this.updateResultsCount();
    }
    
    createOpportunityCard(opportunity) {
        const card = document.createElement('div');
        card.className = 'opportunity-card';
        card.dataset.opportunityId = opportunity.id;
        
        // Determine if this is an external opportunity
        const isExternal = opportunity.external_opportunity;
        const source = isExternal ? opportunity.external_opportunity.source : null;
        
        card.innerHTML = `
            <div class="opportunity-image">
                <img src="${opportunity.image || '/static/images/default-opportunity.jpg'}" 
                     alt="${opportunity.title}" 
                     onerror="this.src='/static/images/default-opportunity.jpg'">
                ${isExternal ? `<div class="external-badge" title="External Source: ${source.name}">
                    <i class="fas fa-external-link-alt"></i>
                </div>` : ''}
            </div>
            
            <div class="opportunity-content">
                <div class="opportunity-header">
                    <div class="company-info">
                        <div class="company-avatar">
                            <img src="${opportunity.employer.logo || '/static/images/default-company.png'}" 
                                 alt="${opportunity.employer.name}">
                        </div>
                        <div class="company-details">
                            <h4>${opportunity.employer.name}</h4>
                            ${opportunity.employer.is_verified ? '<span class="verified-badge"><i class="fas fa-check-circle"></i></span>' : ''}
                        </div>
                    </div>
                    
                    ${this.renderOpportunityBadges(opportunity, isExternal)}
                </div>
                
                <h3 class="opportunity-title">${opportunity.title}</h3>
                
                <div class="opportunity-meta">
                    <div class="meta-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${opportunity.location || 'Location not specified'}</span>
                    </div>
                    
                    ${opportunity.stipend ? `
                        <div class="meta-item">
                            <i class="fas fa-dollar-sign"></i>
                            <span>${this.formatStipend(opportunity.stipend, opportunity.currency)}</span>
                        </div>
                    ` : ''}
                    
                    <div class="meta-item">
                        <i class="fas fa-calendar-alt"></i>
                        <span>${this.formatDate(opportunity.deadline) || 'No deadline'}</span>
                    </div>
                </div>
                
                <p class="opportunity-description">${this.truncateText(opportunity.description, 120)}</p>
                
                ${this.renderSkillTags(opportunity.required_skills)}
                
                <div class="opportunity-footer">
                    ${this.renderSourceAttribution(isExternal, source)}
                    
                    <div class="opportunity-actions">
                        ${isExternal ? `
                            <button class="btn btn-outline" onclick="window.open('${opportunity.external_opportunity.external_url}', '_blank')">
                                <i class="fas fa-external-link-alt"></i> View Original
                            </button>
                        ` : ''}
                        
                        <button class="btn btn-primary" onclick="opportunitiesManager.viewOpportunity(${opportunity.id})">
                            <i class="fas fa-eye"></i> View Details
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Add click tracking for external opportunities
        if (isExternal) {
            card.addEventListener('click', () => {
                this.trackExternalClick(opportunity.id);
            });
        }
        
        return card;
    }
    
    renderOpportunityBadges(opportunity, isExternal) {
        const badges = [];
        
        // Category badge
        if (opportunity.category) {
            badges.push(`<span class="badge badge-category">${this.formatCategory(opportunity.category)}</span>`);
        }
        
        // Experience level badge
        if (opportunity.experience_level) {
            badges.push(`<span class="badge badge-level">${this.formatExperienceLevel(opportunity.experience_level)}</span>`);
        }
        
        // External source badge
        if (isExternal) {
            const qualityClass = this.getQualityClass(opportunity.external_opportunity.data_quality_score);
            badges.push(`<span class="badge badge-external ${qualityClass}" title="Data Quality: ${(opportunity.external_opportunity.data_quality_score * 100).toFixed(0)}%">
                External
            </span>`);
        }
        
        // Featured badge
        if (opportunity.is_featured) {
            badges.push(`<span class="badge badge-featured"><i class="fas fa-star"></i> Featured</span>`);
        }
        
        return `<div class="opportunity-badges">${badges.join('')}</div>`;
    }
    
    renderSourceAttribution(isExternal, source) {
        if (!isExternal || !source) return '';
        
        return `
            <div class="source-attribution">
                <small>
                    <i class="fas fa-info-circle"></i>
                    Source: <strong>${source.name}</strong>
                    ${source.website ? `• <a href="${source.website}" target="_blank" rel="noopener">Visit Site</a>` : ''}
                </small>
            </div>
        `;
    }
    
    renderSkillTags(skills) {
        if (!skills) return '';
        
        const skillList = typeof skills === 'string' ? skills.split(',') : skills;
        const tags = skillList.slice(0, 4).map(skill => 
            `<span class="skill-tag">${skill.trim()}</span>`
        ).join('');
        
        const remaining = skillList.length - 4;
        const moreTag = remaining > 0 ? `<span class="skill-tag more">+${remaining} more</span>` : '';
        
        return `<div class="skill-tags">${tags}${moreTag}</div>`;
    }
    
    formatCategory(category) {
        return category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    formatExperienceLevel(level) {
        const levels = {
            'entry': 'Entry Level',
            'intermediate': 'Intermediate',
            'advanced': 'Advanced',
            'senior': 'Senior Level'
        };
        return levels[level] || level;
    }
    
    formatStipend(amount, currency = 'USD') {
        if (!amount) return '';
        
        const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
        
        return formatter.format(amount);
    }
    
    formatDate(dateString) {
        if (!dateString) return null;
        
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = date - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
            return 'Expired';
        } else if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Tomorrow';
        } else if (diffDays <= 7) {
            return `${diffDays} days left`;
        } else {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
            });
        }
    }
    
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    }
    
    getQualityClass(score) {
        if (score >= 0.8) return 'quality-high';
        if (score >= 0.6) return 'quality-medium';
        return 'quality-low';
    }
    
    clearOpportunities() {
        const container = document.getElementById('opportunities-grid');
        if (container) {
            // Keep the sentinel element for infinite scroll
            const sentinel = document.getElementById('scroll-sentinel');
            container.innerHTML = '';
            if (sentinel) {
                container.appendChild(sentinel);
            }
        }
    }
    
    updatePagination(data) {
        this.totalItems = data.count || data.length || 0;
        
        // Update pagination info
        const paginationInfo = document.getElementById('pagination-info');
        if (paginationInfo) {
            const start = (this.currentPage - 1) * this.itemsPerPage + 1;
            const end = Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
            paginationInfo.textContent = `Showing ${start}-${end} of ${this.totalItems} opportunities`;
        }
    }
    
    updateResultsCount() {
        const container = document.getElementById('opportunities-grid');
        const count = container ? container.children.length - 1 : 0; // -1 for sentinel
        
        const countElement = document.getElementById('results-count');
        if (countElement) {
            countElement.textContent = `${count} opportunities found`;
        }
    }
    
    showLoading() {
        const loader = document.getElementById('opportunities-loader');
        if (loader) {
            loader.style.display = 'block';
        }
    }
    
    hideLoading() {
        const loader = document.getElementById('opportunities-loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }
    
    showError(message) {
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.innerHTML = `
                <div class="alert alert-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    ${message}
                    <button onclick="opportunitiesManager.resetAndLoad()" class="btn btn-sm btn-outline">Retry</button>
                </div>
            `;
            errorContainer.style.display = 'block';
        }
    }
    
    async trackExternalClick(opportunityId) {
        try {
            await fetch(`${this.apiConfig.BASE_URL}/api/internships/${opportunityId}/track-click/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                }
            });
        } catch (error) {
            console.warn('Failed to track click:', error);
        }
    }
    
    viewOpportunity(opportunityId) {
        // Navigate to opportunity detail page
        window.location.href = `/opportunities/${opportunityId}/`;
    }
    
    getCSRFToken() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'csrftoken') {
                return value;
            }
        }
        return '';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize based on page type
    if (document.getElementById('external-opportunities-page')) {
        window.opportunitiesManager = new ExternalOpportunitiesManager();
    } else {
        window.opportunitiesManager = new OpportunitiesManager();
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OpportunitiesManager;
}