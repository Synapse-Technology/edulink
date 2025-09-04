// Institution Search Functionality
// This script handles the institution search feature in the registration form

(function() {
    'use strict';

    // Initialize institution search when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        initializeInstitutionSearch();
    });

    function initializeInstitutionSearch() {
        const searchInput = document.querySelector('#institution-search');
        const searchResults = document.querySelector('#search-results');
        
        if (!searchInput || !searchResults) {
            console.log('Institution search elements not found');
            return;
        }

        let searchTimeout;
        
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const query = this.value.trim();
            
            if (query.length < 2) {
                searchResults.innerHTML = '';
                searchResults.style.display = 'none';
                return;
            }
            
            searchTimeout = setTimeout(() => {
                searchInstitutions(query);
            }, 300);
        });
    }

    function searchInstitutions(query) {
        const searchResults = document.querySelector('#search-results');
        
        // Show loading state
        searchResults.innerHTML = '<div class="search-loading">Searching...</div>';
        searchResults.style.display = 'block';
        
        // Make API call to search institutions
        fetch(`/institutions/search/?q=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(data => {
                displaySearchResults(data.results || []);
            })
            .catch(error => {
                console.error('Institution search error:', error);
                searchResults.innerHTML = '<div class="search-error">Search temporarily unavailable</div>';
            });
    }

    function displaySearchResults(results) {
        const searchResults = document.querySelector('#search-results');
        
        if (results.length === 0) {
            searchResults.innerHTML = '<div class="no-results">No institutions found</div>';
            return;
        }
        
        const resultsHTML = results.map(institution => `
            <div class="search-result-item" data-id="${institution.id}">
                <div class="institution-name">${institution.name}</div>
                <div class="institution-location">${institution.location || ''}</div>
            </div>
        `).join('');
        
        searchResults.innerHTML = resultsHTML;
        
        // Add click handlers for result items
        searchResults.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', function() {
                selectInstitution(this);
            });
        });
    }

    function selectInstitution(element) {
        const institutionId = element.dataset.id;
        const institutionName = element.querySelector('.institution-name').textContent;
        
        const searchInput = document.querySelector('#institution-search');
        const searchResults = document.querySelector('#search-results');
        const hiddenInput = document.querySelector('#selected-institution-id');
        
        if (searchInput) searchInput.value = institutionName;
        if (searchResults) searchResults.style.display = 'none';
        if (hiddenInput) hiddenInput.value = institutionId;
        
        // Trigger custom event for other scripts
        document.dispatchEvent(new CustomEvent('institutionSelected', {
            detail: { id: institutionId, name: institutionName }
        }));
    }

    // Close search results when clicking outside
    document.addEventListener('click', function(event) {
        const searchContainer = document.querySelector('.institution-search-container');
        if (searchContainer && !searchContainer.contains(event.target)) {
            const searchResults = document.querySelector('#search-results');
            if (searchResults) searchResults.style.display = 'none';
        }
    });

})();