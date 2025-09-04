/**
 * Comprehensive Form Validation Module for Edulink Frontend
 * Enhanced client-side validation matching backend serializer rules
 */

// Validation Configuration
const VALIDATION_CONFIG = {
    // Field-specific validation rules
    FIELDS: {
        email: {
            required: true,
            pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
            maxLength: 254,
            message: 'Please enter a valid email address'
        },
        password: {
            required: true,
            minLength: 8,
            pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
            message: 'Password must contain at least 8 characters with uppercase, lowercase, number and special character'
        },
        confirmPassword: {
            required: true,
            matchField: 'password',
            message: 'Passwords do not match'
        },
        firstName: {
            required: true,
            minLength: 2,
            maxLength: 50,
            pattern: /^[a-zA-Z\s'-]+$/,
            message: 'First name must contain only letters, spaces, hyphens and apostrophes'
        },
        lastName: {
            required: true,
            minLength: 2,
            maxLength: 50,
            pattern: /^[a-zA-Z\s'-]+$/,
            message: 'Last name must contain only letters, spaces, hyphens and apostrophes'
        },
        phone: {
            required: false,
            pattern: /^[+]?[1-9]?[0-9]{7,15}$/,
            message: 'Please enter a valid phone number'
        },
        institutionCode: {
            required: true,
            minLength: 3,
            maxLength: 20,
            pattern: /^[A-Z0-9]+$/,
            message: 'Institution code must contain only uppercase letters and numbers'
        },
        studentId: {
            required: true,
            minLength: 3,
            maxLength: 50,
            pattern: /^[A-Za-z0-9\/\-]+$/,
            message: 'Student ID can contain letters, numbers, slashes and hyphens'
        },
        companyName: {
            required: true,
            minLength: 2,
            maxLength: 100,
            message: 'Company name must be between 2 and 100 characters'
        },
        jobTitle: {
            required: true,
            minLength: 2,
            maxLength: 100,
            message: 'Job title must be between 2 and 100 characters'
        },
        description: {
            required: false,
            maxLength: 2000,
            message: 'Description cannot exceed 2000 characters'
        },
        requirements: {
            required: false,
            maxLength: 1000,
            message: 'Requirements cannot exceed 1000 characters'
        },
        location: {
            required: true,
            minLength: 2,
            maxLength: 100,
            message: 'Location must be between 2 and 100 characters'
        },
        duration: {
            required: true,
            pattern: /^[1-9]\d*$/,
            min: 1,
            max: 52,
            message: 'Duration must be between 1 and 52 weeks'
        },
        salary: {
            required: false,
            pattern: /^\d+(\.\d{1,2})?$/,
            min: 0,
            message: 'Salary must be a valid positive number'
        }
    },
    
    // Custom validation messages
    MESSAGES: {
        required: 'This field is required',
        email: 'Please enter a valid email address',
        minLength: 'Must be at least {min} characters long',
        maxLength: 'Cannot exceed {max} characters',
        pattern: 'Invalid format',
        match: 'Fields do not match',
        min: 'Value must be at least {min}',
        max: 'Value cannot exceed {max}'
    }
};

// Enhanced Form Validator
const FormValidator = {
    /**
     * Initialize validation for all forms
     */
    init() {
        this.setupFormValidation();
        this.setupRealTimeValidation();
        this.setupCustomValidators();
    },
    
    /**
     * Setup form validation
     */
    setupFormValidation() {
        const forms = document.querySelectorAll('form[data-validate="true"], form.needs-validation');
        
        forms.forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                
                if (this.validateForm(form)) {
                    this.handleValidSubmission(form);
                } else {
                    this.handleInvalidSubmission(form);
                }
            });
        });
    },
    
    /**
     * Setup real-time validation
     */
    setupRealTimeValidation() {
        const inputs = document.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            // Validate on blur
            input.addEventListener('blur', () => {
                this.validateField(input, true);
            });
            
            // Real-time validation for specific fields
            if (input.type === 'email' || input.name === 'confirmPassword') {
                input.addEventListener('input', () => {
                    this.validateField(input, false);
                });
            }
            
            // Password strength indicator
            if (input.type === 'password' && input.name === 'password') {
                input.addEventListener('input', () => {
                    this.showPasswordStrength(input);
                });
            }
        });
    },
    
    /**
     * Setup custom validators
     */
    setupCustomValidators() {
        // Institution code validator
        const institutionInputs = document.querySelectorAll('input[name="institutionCode"]');
        institutionInputs.forEach(input => {
            input.addEventListener('blur', async () => {
                if (input.value.trim()) {
                    await this.validateInstitutionCode(input);
                }
            });
        });
        
        // Email uniqueness validator
        const emailInputs = document.querySelectorAll('input[type="email"][data-check-unique="true"]');
        emailInputs.forEach(input => {
            let timeoutId;
            input.addEventListener('input', () => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(async () => {
                    if (input.value.trim() && this.isValidEmail(input.value)) {
                        await this.checkEmailUniqueness(input);
                    }
                }, 1000);
            });
        });
    },
    
    /**
     * Validate individual field
     */
    validateField(field, showError = true) {
        const fieldName = field.name || field.id;
        const value = field.value.trim();
        const rules = VALIDATION_CONFIG.FIELDS[fieldName] || this.getGenericRules(field);
        
        const validation = this.runValidation(value, rules, field);
        
        if (showError) {
            this.updateFieldUI(field, validation.isValid, validation.message);
        }
        
        return validation.isValid;
    },
    
    /**
     * Get generic validation rules based on field attributes
     */
    getGenericRules(field) {
        const rules = {};
        
        if (field.hasAttribute('required')) {
            rules.required = true;
        }
        
        if (field.hasAttribute('minlength')) {
            rules.minLength = parseInt(field.getAttribute('minlength'));
        }
        
        if (field.hasAttribute('maxlength')) {
            rules.maxLength = parseInt(field.getAttribute('maxlength'));
        }
        
        if (field.hasAttribute('pattern')) {
            rules.pattern = new RegExp(field.getAttribute('pattern'));
        }
        
        if (field.type === 'email') {
            rules.pattern = VALIDATION_CONFIG.FIELDS.email.pattern;
        }
        
        return rules;
    },
    
    /**
     * Run validation against rules
     */
    runValidation(value, rules, field) {
        // Required validation
        if (rules.required && !value) {
            return {
                isValid: false,
                message: rules.message || VALIDATION_CONFIG.MESSAGES.required
            };
        }
        
        // Skip other validations if field is empty and not required
        if (!value && !rules.required) {
            return { isValid: true, message: '' };
        }
        
        // Length validations
        if (rules.minLength && value.length < rules.minLength) {
            return {
                isValid: false,
                message: VALIDATION_CONFIG.MESSAGES.minLength.replace('{min}', rules.minLength)
            };
        }
        
        if (rules.maxLength && value.length > rules.maxLength) {
            return {
                isValid: false,
                message: VALIDATION_CONFIG.MESSAGES.maxLength.replace('{max}', rules.maxLength)
            };
        }
        
        // Pattern validation
        if (rules.pattern && !rules.pattern.test(value)) {
            return {
                isValid: false,
                message: rules.message || VALIDATION_CONFIG.MESSAGES.pattern
            };
        }
        
        // Match field validation
        if (rules.matchField) {
            const matchField = document.querySelector(`[name="${rules.matchField}"]`);
            if (matchField && value !== matchField.value) {
                return {
                    isValid: false,
                    message: rules.message || VALIDATION_CONFIG.MESSAGES.match
                };
            }
        }
        
        // Numeric range validation
        if (rules.min !== undefined) {
            const numValue = parseFloat(value);
            if (numValue < rules.min) {
                return {
                    isValid: false,
                    message: VALIDATION_CONFIG.MESSAGES.min.replace('{min}', rules.min)
                };
            }
        }
        
        if (rules.max !== undefined) {
            const numValue = parseFloat(value);
            if (numValue > rules.max) {
                return {
                    isValid: false,
                    message: VALIDATION_CONFIG.MESSAGES.max.replace('{max}', rules.max)
                };
            }
        }
        
        return { isValid: true, message: '' };
    },
    
    /**
     * Update field UI based on validation result
     */
    updateFieldUI(field, isValid, message) {
        // Remove existing classes
        field.classList.remove('is-valid', 'is-invalid', 'border-green-500', 'border-red-500');
        
        // Add appropriate classes
        if (isValid) {
            field.classList.add('is-valid', 'border-green-500');
        } else {
            field.classList.add('is-invalid', 'border-red-500');
        }
        
        // Handle error message
        this.updateErrorMessage(field, message);
    },
    
    /**
     * Update error message display
     */
    updateErrorMessage(field, message) {
        let errorElement = field.parentNode.querySelector('.invalid-feedback, .validation-error');
        
        if (message) {
            if (!errorElement) {
                errorElement = document.createElement('div');
                errorElement.className = 'invalid-feedback validation-error text-red-500 text-sm mt-1';
                field.parentNode.appendChild(errorElement);
            }
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        } else if (errorElement) {
            errorElement.style.display = 'none';
        }
    },
    
    /**
     * Show password strength indicator
     */
    showPasswordStrength(passwordField) {
        const password = passwordField.value;
        const strength = this.calculatePasswordStrength(password);
        
        let strengthIndicator = passwordField.parentNode.querySelector('.password-strength');
        
        if (!strengthIndicator) {
            strengthIndicator = document.createElement('div');
            strengthIndicator.className = 'password-strength mt-2';
            passwordField.parentNode.appendChild(strengthIndicator);
        }
        
        const strengthLevels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
        const colors = ['#dc2626', '#ea580c', '#d97706', '#65a30d', '#16a34a'];
        
        strengthIndicator.innerHTML = `
            <div class="flex items-center space-x-2">
                <div class="flex-1 bg-gray-200 rounded-full h-2">
                    <div class="h-2 rounded-full transition-all duration-300" 
                         style="width: ${(strength.score / 4) * 100}%; background-color: ${colors[strength.score]}"></div>
                </div>
                <span class="text-sm font-medium" style="color: ${colors[strength.score]}">
                    ${strengthLevels[strength.score]}
                </span>
            </div>
            ${strength.suggestions.length > 0 ? `
                <ul class="text-xs text-gray-600 mt-1">
                    ${strength.suggestions.map(s => `<li>• ${s}</li>`).join('')}
                </ul>
            ` : ''}
        `;
    },
    
    /**
     * Calculate password strength
     */
    calculatePasswordStrength(password) {
        let score = 0;
        const suggestions = [];
        
        if (password.length >= 8) score++;
        else suggestions.push('Use at least 8 characters');
        
        if (/[a-z]/.test(password)) score++;
        else suggestions.push('Include lowercase letters');
        
        if (/[A-Z]/.test(password)) score++;
        else suggestions.push('Include uppercase letters');
        
        if (/\d/.test(password)) score++;
        else suggestions.push('Include numbers');
        
        if (/[@$!%*?&]/.test(password)) score++;
        else suggestions.push('Include special characters');
        
        // Bonus points for length and variety
        if (password.length >= 12) score = Math.min(score + 1, 4);
        if (/[^A-Za-z0-9@$!%*?&]/.test(password)) score = Math.min(score + 1, 4);
        
        return { score: Math.max(0, Math.min(score, 4)), suggestions };
    },
    
    /**
     * Validate entire form
     */
    validateForm(form) {
        const fields = form.querySelectorAll('input, textarea, select');
        let isFormValid = true;
        
        fields.forEach(field => {
            if (!this.validateField(field, true)) {
                isFormValid = false;
            }
        });
        
        return isFormValid;
    },
    
    /**
     * Handle valid form submission
     */
    handleValidSubmission(form) {
        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        
        // Sanitize form data
        const formData = new FormData(form);
        const sanitizedData = {};
        
        for (let [key, value] of formData.entries()) {
            sanitizedData[key] = InputSanitizer.sanitizeHTML(value);
        }
        
        // Trigger custom event for form submission
        const submitEvent = new CustomEvent('validFormSubmit', {
            detail: { form, data: sanitizedData }
        });
        form.dispatchEvent(submitEvent);
        
        // Reset button after delay if no custom handler
        setTimeout(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }, 3000);
    },
    
    /**
     * Handle invalid form submission
     */
    handleInvalidSubmission(form) {
        // Focus on first invalid field
        const firstInvalid = form.querySelector('.is-invalid');
        if (firstInvalid) {
            firstInvalid.focus();
            firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        // Show error notification
        ApiHelper.showNotification('Please correct the errors in the form', 'error');
    },
    
    /**
     * Validate institution code
     */
    async validateInstitutionCode(input) {
        try {
            const response = await ApiHelper.request(
                API_CONFIG.ENDPOINTS.INSTITUTIONS.VALIDATE_CODE,
                {
                    method: 'POST',
                    body: JSON.stringify({ code: input.value.trim() })
                }
            );
            
            const result = await response.json();
            
            if (result.valid) {
                this.updateFieldUI(input, true, '');
                // Show institution name if available
                if (result.institution_name) {
                    let nameDisplay = input.parentNode.querySelector('.institution-name');
                    if (!nameDisplay) {
                        nameDisplay = document.createElement('div');
                        nameDisplay.className = 'institution-name text-sm text-green-600 mt-1';
                        input.parentNode.appendChild(nameDisplay);
                    }
                    nameDisplay.textContent = `✓ ${result.institution_name}`;
                }
            } else {
                this.updateFieldUI(input, false, 'Invalid institution code');
            }
        } catch (error) {
            console.warn('Institution code validation failed:', error);
            this.updateFieldUI(input, false, 'Unable to verify institution code');
        }
    },
    
    /**
     * Check email uniqueness
     */
    async checkEmailUniqueness(input) {
        try {
            const response = await ApiHelper.request(
                '/api/auth/check-email/',
                {
                    method: 'POST',
                    body: JSON.stringify({ email: input.value.trim() })
                }
            );
            
            const result = await response.json();
            
            if (result.exists) {
                this.updateFieldUI(input, false, 'This email is already registered');
            } else {
                this.updateFieldUI(input, true, '');
            }
        } catch (error) {
            console.warn('Email uniqueness check failed:', error);
        }
    },
    
    /**
     * Validate email format
     */
    isValidEmail(email) {
        return VALIDATION_CONFIG.FIELDS.email.pattern.test(email);
    }
};

// Export validation module
window.FormValidator = FormValidator;
window.VALIDATION_CONFIG = VALIDATION_CONFIG;

// Initialize validation on page load
document.addEventListener('DOMContentLoaded', function() {
    FormValidator.init();
    console.log('Form validation initialized');
});