// Institution Registration Form JavaScript
class InstitutionRegistration {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 4;
        this.formData = {};
        this.init();
    }

    init() {
        this.bindEvents();
        this.setInstitutionTypeFromURL();
        this.updateUI();
    }

    bindEvents() {
        // Navigation buttons
        document.getElementById('nextBtn').addEventListener('click', () => this.nextStep());
        document.getElementById('prevBtn').addEventListener('click', () => this.prevStep());

        // Institution type selection
        document.querySelectorAll('.type-option').forEach(option => {
            option.addEventListener('click', () => this.selectInstitutionType(option));
        });

        // Form validation on input
        document.querySelectorAll('input, select, textarea').forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearError(input));
        });

        // Form submission
        document.getElementById('registrationForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitForm();
        });
    }

    setInstitutionTypeFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const type = urlParams.get('type');
        if (type) {
            const option = document.querySelector(`[data-type="${type}"]`);
            if (option) {
                this.selectInstitutionType(option);
            }
        }
    }

    selectInstitutionType(option) {
        // Remove previous selection
        document.querySelectorAll('.type-option').forEach(opt => opt.classList.remove('selected'));
        
        // Add selection to clicked option
        option.classList.add('selected');
        
        // Set hidden input value
        document.getElementById('institutionType').value = option.dataset.type;
        
        // Enable next button
        this.updateNavigationButtons();
    }

    nextStep() {
        if (this.validateCurrentStep()) {
            if (this.currentStep < this.totalSteps) {
                this.currentStep++;
                this.updateUI();
                
                // If moving to review step, populate review content
                if (this.currentStep === 4) {
                    this.populateReviewContent();
                }
            } else {
                this.submitForm();
            }
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateUI();
        }
    }

    updateUI() {
        // Update progress steps
        document.querySelectorAll('.step').forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.remove('active', 'completed');
            
            if (stepNumber < this.currentStep) {
                step.classList.add('completed');
            } else if (stepNumber === this.currentStep) {
                step.classList.add('active');
            }
        });

        // Update form steps
        document.querySelectorAll('.form-step').forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.remove('active');
            
            if (stepNumber === this.currentStep) {
                step.classList.add('active');
            }
        });

        this.updateNavigationButtons();
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');

        // Show/hide previous button
        if (this.currentStep === 1) {
            prevBtn.style.display = 'none';
        } else {
            prevBtn.style.display = 'inline-flex';
        }

        // Update next button text
        if (this.currentStep === this.totalSteps) {
            nextBtn.innerHTML = '<i class="fas fa-check"></i> Submit Registration';
        } else {
            nextBtn.innerHTML = 'Next <i class="fas fa-arrow-right"></i>';
        }

        // Enable/disable next button based on current step validation
        const isValid = this.isCurrentStepValid();
        nextBtn.disabled = !isValid;
    }

    isCurrentStepValid() {
        switch (this.currentStep) {
            case 1:
                return document.getElementById('institutionType').value !== '';
            case 2:
                return this.validateStep2();
            case 3:
                return this.validateStep3();
            case 4:
                return true; // Review step is always valid if we got here
            default:
                return false;
        }
    }

    validateCurrentStep() {
        switch (this.currentStep) {
            case 1:
                return this.validateStep1();
            case 2:
                return this.validateStep2();
            case 3:
                return this.validateStep3();
            case 4:
                return true;
            default:
                return false;
        }
    }

    validateStep1() {
        const institutionType = document.getElementById('institutionType').value;
        if (!institutionType) {
            this.showError('institutionType', 'Please select an institution type');
            return false;
        }
        return true;
    }

    validateStep2() {
        let isValid = true;
        
        // Required fields
        const requiredFields = ['institutionName', 'establishedYear'];
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (!field.value.trim()) {
                this.showError(fieldId, 'This field is required');
                isValid = false;
            }
        });

        // Validate established year
        const establishedYear = document.getElementById('establishedYear');
        const currentYear = new Date().getFullYear();
        if (establishedYear.value && (establishedYear.value < 1800 || establishedYear.value > currentYear)) {
            this.showError('establishedYear', `Year must be between 1800 and ${currentYear}`);
            isValid = false;
        }

        // Validate website URL if provided
        const website = document.getElementById('website');
        if (website.value && !this.isValidURL(website.value)) {
            this.showError('website', 'Please enter a valid URL');
            isValid = false;
        }

        return isValid;
    }

    validateStep3() {
        let isValid = true;
        
        // Required fields
        const requiredFields = ['contactEmail', 'contactPhone', 'firstName', 'lastName', 'address', 'city', 'county'];
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (!field.value.trim()) {
                this.showError(fieldId, 'This field is required');
                isValid = false;
            }
        });

        // Validate email
        const email = document.getElementById('contactEmail');
        if (email.value && !this.isValidEmail(email.value)) {
            this.showError('contactEmail', 'Please enter a valid email address');
            isValid = false;
        }

        // Validate phone number
        const phone = document.getElementById('contactPhone');
        if (phone.value && !this.isValidPhone(phone.value)) {
            this.showError('contactPhone', 'Please enter a valid phone number');
            isValid = false;
        }

        return isValid;
    }

    validateField(field) {
        this.clearError(field);
        
        if (field.hasAttribute('required') && !field.value.trim()) {
            this.showError(field.id, 'This field is required');
            return false;
        }

        // Specific field validations
        switch (field.type) {
            case 'email':
                if (field.value && !this.isValidEmail(field.value)) {
                    this.showError(field.id, 'Please enter a valid email address');
                    return false;
                }
                break;
            case 'url':
                if (field.value && !this.isValidURL(field.value)) {
                    this.showError(field.id, 'Please enter a valid URL');
                    return false;
                }
                break;
            case 'tel':
                if (field.value && !this.isValidPhone(field.value)) {
                    this.showError(field.id, 'Please enter a valid phone number');
                    return false;
                }
                break;
            case 'number':
                if (field.id === 'establishedYear') {
                    const currentYear = new Date().getFullYear();
                    if (field.value && (field.value < 1800 || field.value > currentYear)) {
                        this.showError(field.id, `Year must be between 1800 and ${currentYear}`);
                        return false;
                    }
                }
                break;
        }

        this.updateNavigationButtons();
        return true;
    }

    showError(fieldId, message) {
        const errorElement = document.getElementById(fieldId + 'Error');
        if (errorElement) {
            errorElement.textContent = message;
        }
        
        const field = document.getElementById(fieldId);
        if (field) {
            field.style.borderColor = '#dc2626';
        }
    }

    clearError(field) {
        const errorElement = document.getElementById(field.id + 'Error');
        if (errorElement) {
            errorElement.textContent = '';
        }
        field.style.borderColor = '#e5e7eb';
        this.updateNavigationButtons();
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    isValidPhone(phone) {
        // Kenyan phone number validation
        const phoneRegex = /^(\+254|0)[17]\d{8}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    }

    populateReviewContent() {
        const formData = this.collectFormData();
        const reviewContent = document.getElementById('reviewContent');
        
        const institutionTypeLabels = {
            'university': 'Higher Education Institution',
            'tvet': 'TVET Institution'
        };

        reviewContent.innerHTML = `
            <div style="display: grid; gap: 2rem;">
                <div style="background: #f8fafc; padding: 1.5rem; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <h4 style="color: #1e293b; margin-bottom: 1rem; font-weight: 600;">Institution Details</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                        <div>
                            <strong>Type:</strong><br>
                            <span style="color: #64748b;">${institutionTypeLabels[formData.institution_type] || formData.institution_type}</span>
                        </div>
                        <div>
                            <strong>Name:</strong><br>
                            <span style="color: #64748b;">${formData.institution_name}</span>
                        </div>
                        <div>
                            <strong>Established:</strong><br>
                            <span style="color: #64748b;">${formData.established_year}</span>
                        </div>
                        ${formData.registration_number ? `
                        <div>
                            <strong>Registration Number:</strong><br>
                            <span style="color: #64748b;">${formData.registration_number}</span>
                        </div>
                        ` : ''}
                    </div>
                    ${formData.website ? `
                    <div style="margin-top: 1rem;">
                        <strong>Website:</strong><br>
                        <a href="${formData.website}" target="_blank" style="color: #1e3a8a;">${formData.website}</a>
                    </div>
                    ` : ''}
                    ${formData.description ? `
                    <div style="margin-top: 1rem;">
                        <strong>Description:</strong><br>
                        <span style="color: #64748b;">${formData.description}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div style="background: #f8fafc; padding: 1.5rem; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <h4 style="color: #1e293b; margin-bottom: 1rem; font-weight: 600;">Contact Information</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                        <div>
                            <strong>Email:</strong><br>
                            <span style="color: #64748b;">${formData.contact_email}</span>
                        </div>
                        <div>
                            <strong>Phone:</strong><br>
                            <span style="color: #64748b;">${formData.contact_phone}</span>
                        </div>
                        <div>
                            <strong>Contact Person:</strong><br>
                            <span style="color: #64748b;">${formData.first_name} ${formData.last_name}</span>
                        </div>
                        ${formData.contact_title ? `
                        <div>
                            <strong>Title:</strong><br>
                            <span style="color: #64748b;">${formData.contact_title}</span>
                        </div>
                        ` : ''}
                    </div>
                    <div style="margin-top: 1rem;">
                        <strong>Address:</strong><br>
                        <span style="color: #64748b;">${formData.address}, ${formData.city}, ${formData.county}</span>
                    </div>
                </div>
            </div>
        `;
    }

    collectFormData() {
        const formData = {};
        const form = document.getElementById('registrationForm');
        const formElements = form.querySelectorAll('input, select, textarea');
        
        formElements.forEach(element => {
            if (element.name && element.value) {
                formData[element.name] = element.value;
            }
        });
        
        // Automatically set role based on institution type
        const institutionType = formData.institution_type || formData.institutionType;
        if (institutionType) {
            if (['university', 'tvet', 'college'].includes(institutionType)) {
                formData.role = 'institution_admin';
            } else if (['company', 'ngo', 'government'].includes(institutionType)) {
                formData.role = 'employer';
            } else {
                formData.role = 'institution_admin'; // default
            }
        }
        
        return formData;
    }

    async submitForm() {
        const formData = this.collectFormData();
        
        // Show loading state
        this.showLoadingState();
        
        try {
            // API endpoint for registration
            const response = await fetch(ApiHelper.getUrl(API_CONFIG.ENDPOINTS.REGISTRATION.INSTITUTIONS), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                body: JSON.stringify(formData)
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showSuccessState(result);
            } else {
                const error = await response.json();
                this.showErrorState(error);
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showErrorState({ message: 'Network error. Please check your connection and try again.' });
        }
    }

    showLoadingState() {
        document.querySelector('.form-content').style.display = 'none';
        document.querySelector('.form-actions').style.display = 'none';
        document.getElementById('loadingState').style.display = 'block';
    }

    showSuccessState(result) {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('successState').style.display = 'block';
        
        // Update success message with reference number if provided
        if (result.reference_number) {
            const successDescription = document.querySelector('.success-description');
            successDescription.innerHTML += `<br><br><strong>Reference Number: ${result.reference_number}</strong>`;
        }
    }

    showErrorState(error) {
        document.getElementById('loadingState').style.display = 'none';
        document.querySelector('.form-content').style.display = 'block';
        document.querySelector('.form-actions').style.display = 'flex';
        
        // Show error message
        alert(`Registration failed: ${error.message || 'Please check your information and try again.'}`);
        
        // If there are field-specific errors, show them
        if (error.errors) {
            Object.keys(error.errors).forEach(fieldName => {
                const fieldId = fieldName.replace('_', '');
                this.showError(fieldId, error.errors[fieldName][0]);
            });
        }
    }

    getCSRFToken() {
        // Get CSRF token from cookie or meta tag
        const token = document.querySelector('meta[name="csrf-token"]');
        return token ? token.getAttribute('content') : '';
    }
}

// Initialize the registration form when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new InstitutionRegistration();
});

// Add some utility functions for better UX
document.addEventListener('DOMContentLoaded', () => {
    // Auto-format phone numbers
    const phoneInput = document.getElementById('contactPhone');
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.startsWith('254')) {
                value = '+' + value;
            } else if (value.startsWith('0')) {
                value = '+254' + value.substring(1);
            }
            e.target.value = value;
        });
    }

    // Auto-capitalize institution name
    const nameInput = document.getElementById('institutionName');
    if (nameInput) {
        nameInput.addEventListener('input', (e) => {
            const words = e.target.value.split(' ');
            const capitalizedWords = words.map(word => 
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            );
            e.target.value = capitalizedWords.join(' ');
        });
    }
});