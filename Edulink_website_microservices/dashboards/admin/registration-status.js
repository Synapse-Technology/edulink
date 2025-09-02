class RegistrationStatusChecker {
    constructor() {
        this.form = document.getElementById('statusForm');
        this.referenceInput = document.getElementById('referenceNumber');
        this.searchBtn = document.getElementById('searchBtn');
        this.loading = document.getElementById('loading');
        this.errorMessage = document.getElementById('errorMessage');
        this.statusResult = document.getElementById('statusResult');
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.checkStatus();
        });

        // Format reference number as user types
        this.referenceInput.addEventListener('input', (e) => {
            let value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
            e.target.value = value;
        });
    }

    async checkStatus() {
        const referenceNumber = this.referenceInput.value.trim();
        
        if (!referenceNumber) {
            this.showError('Please enter a reference number.');
            return;
        }

        if (!this.validateReferenceFormat(referenceNumber)) {
            this.showError('Please enter a valid reference number format (e.g., REF-2024-001234).');
            return;
        }

        this.showLoading();
        this.hideError();
        this.hideResult();

        try {
            // Try to determine if it's an institution or employer registration
            const response = await this.fetchRegistrationStatus(referenceNumber);
            
            if (response.ok) {
                const data = await response.json();
                this.displayStatus(data);
            } else if (response.status === 404) {
                this.showError('Registration not found. Please check your reference number and try again.');
            } else {
                const errorData = await response.json();
                this.showError(errorData.message || 'Unable to retrieve status. Please try again later.');
            }
        } catch (error) {
            console.error('Status check error:', error);
            this.showError('Network error. Please check your connection and try again.');
        } finally {
            this.hideLoading();
        }
    }

    async fetchRegistrationStatus(referenceNumber) {
        // First try institutions endpoint
        try {
            const institutionResponse = await fetch(`/api/registration/institutions/status/${referenceNumber}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                }
            });
            
            if (institutionResponse.ok) {
                return institutionResponse;
            }
        } catch (error) {
            console.log('Institution endpoint failed, trying employer endpoint');
        }

        // If institution fails, try employer endpoint
        return await fetch(`/api/registration/employers/status/${referenceNumber}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCSRFToken()
            }
        });
    }

    validateReferenceFormat(reference) {
        // Basic validation for reference number format
        const pattern = /^[A-Z]{2,4}-\d{4}-\d{6}$/;
        return pattern.test(reference);
    }

    displayStatus(data) {
        const statusResult = this.statusResult;
        const statusIcon = document.getElementById('statusIcon');
        const statusTitle = document.getElementById('statusTitle');
        const statusDetails = document.getElementById('statusDetails');
        const statusMessage = document.getElementById('statusMessage');

        // Clear previous content
        statusResult.className = 'status-result';
        statusIcon.innerHTML = '';
        statusTitle.innerHTML = '';
        statusDetails.innerHTML = '';
        statusMessage.innerHTML = '';

        // Set status-specific styling and content
        const status = data.status.toLowerCase();
        let statusClass, iconClass, title, message;

        switch (status) {
            case 'pending':
                statusClass = 'status-pending';
                iconClass = 'fas fa-clock';
                title = 'Application Pending';
                message = 'Your registration application has been received and is waiting for initial review.';
                break;
            case 'under_review':
            case 'under-review':
                statusClass = 'status-under-review';
                iconClass = 'fas fa-search';
                title = 'Under Review';
                message = 'Your application is currently being reviewed by our team. We will contact you if additional information is needed.';
                break;
            case 'approved':
                statusClass = 'status-approved';
                iconClass = 'fas fa-check-circle';
                title = 'Application Approved';
                message = 'Congratulations! Your registration has been approved. You should receive your login credentials via email shortly.';
                break;
            case 'rejected':
                statusClass = 'status-rejected';
                iconClass = 'fas fa-times-circle';
                title = 'Application Rejected';
                message = 'Unfortunately, your application could not be approved at this time. Please see the details below for more information.';
                break;
            default:
                statusClass = 'status-pending';
                iconClass = 'fas fa-question-circle';
                title = 'Status Unknown';
                message = 'Unable to determine the current status of your application.';
        }

        // Apply styling and content
        statusResult.classList.add(statusClass);
        statusIcon.innerHTML = `<i class="${iconClass}"></i>`;
        statusTitle.textContent = title;

        // Build details section
        const details = [
            { label: 'Reference Number', value: data.reference_number || 'N/A' },
            { label: 'Application Type', value: this.formatApplicationType(data.type || data.application_type) },
            { label: 'Submitted Date', value: this.formatDate(data.submitted_date || data.created_at) },
            { label: 'Last Updated', value: this.formatDate(data.updated_at || data.last_updated) }
        ];

        if (data.institution_name || data.company_name) {
            details.splice(1, 0, {
                label: 'Organization', 
                value: data.institution_name || data.company_name
            });
        }

        if (data.expected_completion_date) {
            details.push({
                label: 'Expected Completion',
                value: this.formatDate(data.expected_completion_date)
            });
        }

        statusDetails.innerHTML = details.map(detail => `
            <div class="detail-row">
                <span class="detail-label">${detail.label}:</span>
                <span class="detail-value">${detail.value}</span>
            </div>
        `).join('');

        // Add custom message if provided
        if (data.message || data.notes) {
            statusMessage.innerHTML = `
                <strong>Additional Information:</strong><br>
                ${data.message || data.notes}
            `;
        } else {
            statusMessage.innerHTML = message;
        }

        // Show the result
        statusResult.style.display = 'block';
    }

    formatApplicationType(type) {
        if (!type) return 'N/A';
        
        const typeMap = {
            'institution': 'Institution Registration',
            'employer': 'Employer Registration',
            'university': 'Higher Education Institution',
            'tvet': 'TVET Institution',
            'higher_education': 'Higher Education Institution',
            'technical_vocational': 'TVET Institution'
        };
        
        return typeMap[type.toLowerCase()] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return dateString;
        }
    }

    showLoading() {
        this.loading.style.display = 'block';
        this.searchBtn.disabled = true;
        this.searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
    }

    hideLoading() {
        this.loading.style.display = 'none';
        this.searchBtn.disabled = false;
        this.searchBtn.innerHTML = '<i class="fas fa-search"></i> Check Status';
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.style.display = 'block';
    }

    hideError() {
        this.errorMessage.style.display = 'none';
    }

    hideResult() {
        this.statusResult.style.display = 'none';
    }

    getCSRFToken() {
        const token = document.querySelector('meta[name="csrf-token"]');
        return token ? token.getAttribute('content') : '';
    }
}

// Initialize the status checker when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RegistrationStatusChecker();

    // Auto-focus on the reference input
    const referenceInput = document.getElementById('referenceNumber');
    if (referenceInput) {
        referenceInput.focus();
    }

    // Check if there's a reference number in the URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');
    if (refParam && referenceInput) {
        referenceInput.value = refParam;
        // Auto-trigger the search if reference is provided in URL
        setTimeout(() => {
            document.getElementById('statusForm').dispatchEvent(new Event('submit'));
        }, 500);
    }
});