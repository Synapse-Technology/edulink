// Registration Form Debug Script
// This script provides comprehensive debugging for the registration form validation issues

class RegistrationDebugger {
    constructor() {
        this.logs = [];
        this.startTime = Date.now();
        this.init();
    }

    init() {
        this.log('DEBUG', 'Registration debugger initialized');
        this.setupFormMonitoring();
        this.setupValidationMonitoring();
        this.setupButtonMonitoring();
        this.setupUniversityCodeMonitoring();
        this.createDebugPanel();
    }

    log(level, message, data = null) {
        const timestamp = Date.now() - this.startTime;
        const logEntry = {
            timestamp,
            level,
            message,
            data: data ? JSON.parse(JSON.stringify(data)) : null
        };
        this.logs.push(logEntry);
        console.log(`[${level}] ${timestamp}ms: ${message}`, data || '');
        this.updateDebugPanel();
    }

    setupFormMonitoring() {
        const form = document.getElementById('registerForm');
        if (!form) {
            this.log('ERROR', 'Registration form not found');
            return;
        }

        // Monitor all form inputs
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', (e) => {
                this.log('INPUT', `Field changed: ${e.target.name || e.target.id}`, {
                    name: e.target.name,
                    id: e.target.id,
                    value: e.target.type === 'password' ? '[HIDDEN]' : e.target.value,
                    required: e.target.required,
                    validity: e.target.validity.valid
                });
            });

            input.addEventListener('blur', (e) => {
                this.log('BLUR', `Field lost focus: ${e.target.name || e.target.id}`, {
                    name: e.target.name,
                    id: e.target.id,
                    value: e.target.type === 'password' ? '[HIDDEN]' : e.target.value,
                    required: e.target.required,
                    validity: e.target.validity.valid,
                    validationMessage: e.target.validationMessage
                });
            });
        });

        // Monitor form submission
        form.addEventListener('submit', (e) => {
            this.log('SUBMIT', 'Form submission attempted');
            this.logFormState();
        });
    }

    setupValidationMonitoring() {
        // Override the validateStep function if it exists
        if (window.validateStep) {
            const originalValidateStep = window.validateStep;
            window.validateStep = (step) => {
                this.log('VALIDATION', `Validating step ${step}`);
                const result = originalValidateStep(step);
                this.log('VALIDATION', `Step ${step} validation result: ${result}`);
                this.logStepState(step);
                return result;
            };
        }
    }

    setupButtonMonitoring() {
        // Monitor method switching buttons
        const methodBtns = document.querySelectorAll('.method-btn');
        methodBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.log('BUTTON', `Method button clicked: ${e.target.dataset.method}`, {
                    method: e.target.dataset.method,
                    currentRegistrationMethod: window.currentRegistrationMethod
                });
            });
        });

        // Monitor next/prev buttons
        const nextBtn = document.getElementById('nextBtn');
        const prevBtn = document.getElementById('prevBtn');
        const submitBtn = document.querySelector('button[type="submit"]');

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.log('BUTTON', 'Next button clicked');
                this.logFormState();
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.log('BUTTON', 'Previous button clicked');
            });
        }

        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                this.log('BUTTON', 'Submit button clicked');
                this.logFormState();
            });
        }
    }

    setupUniversityCodeMonitoring() {
        const validateBtn = document.getElementById('validateCodeBtn');
        const universityCodeInput = document.getElementById('universityCode');
        const validationResult = document.getElementById('codeValidationResult');

        if (validateBtn) {
            validateBtn.addEventListener('click', () => {
                this.log('UNIVERSITY_CODE', 'Validate button clicked', {
                    code: universityCodeInput ? universityCodeInput.value : 'N/A',
                    validationState: validationResult ? validationResult.dataset.validated : 'N/A'
                });
            });
        }

        if (universityCodeInput) {
            universityCodeInput.addEventListener('input', () => {
                this.log('UNIVERSITY_CODE', 'Code input changed', {
                    code: universityCodeInput.value,
                    validationState: validationResult ? validationResult.dataset.validated : 'N/A'
                });
            });
        }

        // Monitor validation result changes
        if (validationResult) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'data-validated') {
                        this.log('UNIVERSITY_CODE', 'Validation state changed', {
                            oldValue: mutation.oldValue,
                            newValue: validationResult.dataset.validated,
                            innerHTML: validationResult.innerHTML
                        });
                    }
                });
            });
            observer.observe(validationResult, {
                attributes: true,
                attributeOldValue: true,
                attributeFilter: ['data-validated']
            });
        }
    }

    logFormState() {
        const form = document.getElementById('registerForm');
        if (!form) return;

        const formData = new FormData(form);
        const formState = {};
        
        // Get all form inputs
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            formState[input.name || input.id] = {
                value: input.type === 'password' ? '[HIDDEN]' : input.value,
                required: input.required,
                valid: input.validity.valid,
                validationMessage: input.validationMessage,
                type: input.type,
                id: input.id,
                name: input.name
            };
        });

        // Get university code validation state
        const validationResult = document.getElementById('codeValidationResult');
        if (validationResult) {
            formState.universityCodeValidation = {
                validated: validationResult.dataset.validated,
                innerHTML: validationResult.innerHTML
            };
        }

        // Get current step
        const activeStep = document.querySelector('.form-step.active');
        const currentStep = activeStep ? Array.from(document.querySelectorAll('.form-step')).indexOf(activeStep) : -1;

        this.log('FORM_STATE', 'Complete form state', {
            currentStep,
            formState,
            currentRegistrationMethod: window.currentRegistrationMethod,
            selectedInstitution: window.selectedInstitution
        });
    }

    logStepState(step) {
        const stepElement = document.querySelectorAll('.form-step')[step];
        if (!stepElement) return;

        const inputs = stepElement.querySelectorAll('input, select, textarea');
        const stepState = {};
        
        inputs.forEach(input => {
            stepState[input.name || input.id] = {
                value: input.type === 'password' ? '[HIDDEN]' : input.value,
                required: input.required,
                valid: input.validity.valid,
                validationMessage: input.validationMessage
            };
        });

        this.log('STEP_STATE', `Step ${step} state`, stepState);
    }

    createDebugPanel() {
        const panel = document.createElement('div');
        panel.id = 'debug-panel';
        panel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 400px;
            max-height: 500px;
            background: #000;
            color: #0f0;
            font-family: monospace;
            font-size: 12px;
            padding: 10px;
            border: 1px solid #0f0;
            z-index: 10000;
            overflow-y: auto;
            display: none;
        `;

        const header = document.createElement('div');
        header.innerHTML = `
            <strong>Registration Debug Panel</strong>
            <button onclick="document.getElementById('debug-panel').style.display='none'" style="float: right; background: #f00; color: #fff; border: none; padding: 2px 5px;">X</button>
            <button onclick="debugger.exportLogs()" style="float: right; background: #00f; color: #fff; border: none; padding: 2px 5px; margin-right: 5px;">Export</button>
            <button onclick="debugger.clearLogs()" style="float: right; background: #ff0; color: #000; border: none; padding: 2px 5px; margin-right: 5px;">Clear</button>
        `;
        
        const content = document.createElement('div');
        content.id = 'debug-content';
        content.style.marginTop = '10px';
        
        panel.appendChild(header);
        panel.appendChild(content);
        document.body.appendChild(panel);

        // Add toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.innerHTML = 'Debug';
        toggleBtn.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: #0f0;
            color: #000;
            border: none;
            padding: 5px 10px;
            z-index: 10001;
            font-weight: bold;
        `;
        toggleBtn.onclick = () => {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        };
        document.body.appendChild(toggleBtn);

        window.debugger = this; // Make debugger globally accessible
    }

    updateDebugPanel() {
        const content = document.getElementById('debug-content');
        if (!content) return;

        const recentLogs = this.logs.slice(-20); // Show last 20 logs
        content.innerHTML = recentLogs.map(log => {
            const color = {
                'ERROR': '#f00',
                'WARN': '#ff0',
                'INFO': '#0ff',
                'DEBUG': '#0f0',
                'VALIDATION': '#f0f',
                'BUTTON': '#fa0',
                'INPUT': '#af0',
                'BLUR': '#aaf',
                'SUBMIT': '#f0a',
                'UNIVERSITY_CODE': '#0fa',
                'FORM_STATE': '#faa',
                'STEP_STATE': '#afa'
            }[log.level] || '#fff';
            
            return `<div style="color: ${color}; margin: 2px 0;">
                [${log.timestamp}ms] ${log.level}: ${log.message}
                ${log.data ? '<br><small>' + JSON.stringify(log.data, null, 2).substring(0, 200) + (JSON.stringify(log.data).length > 200 ? '...' : '') + '</small>' : ''}
            </div>`;
        }).join('');
        
        content.scrollTop = content.scrollHeight;
    }

    exportLogs() {
        const dataStr = JSON.stringify(this.logs, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `registration-debug-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    clearLogs() {
        this.logs = [];
        this.startTime = Date.now();
        this.updateDebugPanel();
        this.log('DEBUG', 'Logs cleared');
    }

    // Test university code validation with the provided code
    testUniversityCode(code = 'EDUJKUAT25-01') {
        this.log('TEST', `Testing university code: ${code}`);
        
        const universityCodeInput = document.getElementById('universityCode');
        const validateBtn = document.getElementById('validateCodeBtn');
        
        if (universityCodeInput && validateBtn) {
            universityCodeInput.value = code;
            universityCodeInput.dispatchEvent(new Event('input', { bubbles: true }));
            
            setTimeout(() => {
                validateBtn.click();
                this.log('TEST', 'University code validation triggered');
            }, 100);
        } else {
            this.log('ERROR', 'University code input or validate button not found');
        }
    }
}

// Initialize debugger when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.registrationDebugger = new RegistrationDebugger();
    });
} else {
    window.registrationDebugger = new RegistrationDebugger();
}

// Add global helper functions
window.testUniversityCode = (code) => {
    if (window.registrationDebugger) {
        window.registrationDebugger.testUniversityCode(code);
    }
};

window.logFormState = () => {
    if (window.registrationDebugger) {
        window.registrationDebugger.logFormState();
    }
};

console.log('Registration Debug Script Loaded - Use testUniversityCode("EDUJKUAT25-01") to test validation');