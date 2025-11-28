/**
 * Beautiful Loading Spinner Component for Institution Admin Dashboard
 * A reusable, modern loading spinner with customizable messages and progress bar
 */

// Show loading indicator with custom message
function showLoading(message = 'Loading...', showProgress = false) {
    // Remove existing loading indicator if any
    hideLoading();
    
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-indicator';
    
    // Create beautiful loading spinner with modern design
    loadingDiv.innerHTML = `
        <div class="loading-overlay">
            <div class="loading-container">
                <div class="loading-spinner-modern">
                    <div class="spinner-ring"></div>
                    <div class="spinner-ring"></div>
                    <div class="spinner-ring"></div>
                </div>
                <div class="loading-text">${message}</div>
                ${showProgress ? '<div class="loading-progress"><div class="progress-bar"></div></div>' : ''}
            </div>
        </div>
    `;
    
    // Add modern CSS styles
    const style = document.createElement('style');
    style.textContent = `
        .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            animation: fadeIn 0.3s ease-out;
        }
        
        .loading-container {
            background: white;
            padding: 40px;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
            text-align: center;
            min-width: 280px;
            animation: slideUp 0.3s ease-out;
        }
        
        .loading-spinner-modern {
            position: relative;
            width: 60px;
            height: 60px;
            margin: 0 auto 20px;
        }
        
        .spinner-ring {
            position: absolute;
            width: 100%;
            height: 100%;
            border: 3px solid transparent;
            border-radius: 50%;
            animation: spin 1.5s linear infinite;
        }
        
        .spinner-ring:nth-child(1) {
            border-top-color: #007bff;
            animation-delay: 0s;
        }
        
        .spinner-ring:nth-child(2) {
            border-right-color: #28a745;
            animation-delay: 0.3s;
            width: 80%;
            height: 80%;
            top: 10%;
            left: 10%;
        }
        
        .spinner-ring:nth-child(3) {
            border-bottom-color: #ffc107;
            animation-delay: 0.6s;
            width: 60%;
            height: 60%;
            top: 20%;
            left: 20%;
        }
        
        .loading-text {
            font-size: 16px;
            font-weight: 500;
            color: #495057;
            margin-bottom: 10px;
        }
        
        .loading-progress {
            width: 100%;
            height: 4px;
            background: #e9ecef;
            border-radius: 2px;
            overflow: hidden;
            margin-top: 15px;
        }
        
        .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #007bff, #28a745);
            border-radius: 2px;
            animation: progress 2s ease-in-out infinite;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        @keyframes progress {
            0% { width: 0%; }
            50% { width: 70%; }
            100% { width: 100%; }
        }
    `;
    
    loadingDiv.appendChild(style);
    document.body.appendChild(loadingDiv);
}

// Hide loading indicator with smooth animation
function hideLoading() {
    const loadingDiv = document.getElementById('loading-indicator');
    if (loadingDiv) {
        loadingDiv.style.animation = 'fadeOut 0.3s ease-out';
        const fadeOutStyle = document.createElement('style');
        fadeOutStyle.textContent = `
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(fadeOutStyle);
        
        setTimeout(() => {
            loadingDiv.remove();
            fadeOutStyle.remove();
        }, 300);
    }
}

// Page-specific loading messages
const LoadingMessages = {
    applications: {
        loading: 'Loading applications...',
        filtering: 'Filtering applications...',
        updating: 'Updating application status...',
        exporting: 'Exporting applications data...'
    },
    internships: {
        loading: 'Loading internships...',
        creating: 'Creating new internship...',
        updating: 'Updating internship details...',
        deleting: 'Removing internship...'
    },
    students: {
        loading: 'Loading students...',
        enrolling: 'Enrolling new student...',
        updating: 'Updating student information...',
        searching: 'Searching students...'
    },
    supervisors: {
        loading: 'Loading supervisors...',
        adding: 'Adding new supervisor...',
        updating: 'Updating supervisor details...',
        assigning: 'Assigning supervisor...'
    },
    reports: {
        loading: 'Loading reports...',
        generating: 'Generating report...',
        exporting: 'Exporting report data...',
        analyzing: 'Analyzing data...'
    },
    settings: {
        loading: 'Loading settings...',
        saving: 'Saving configuration...',
        updating: 'Updating preferences...',
        syncing: 'Syncing data...'
    },
    departments: {
        loading: 'Loading departments...',
        creating: 'Creating department...',
        updating: 'Updating department...',
        deleting: 'Removing department...'
    },
    dashboard: {
        loading: 'Loading dashboard...',
        refreshing: 'Refreshing data...',
        updating: 'Updating statistics...'
    }
};

// Utility function to show page-specific loading
function showPageLoading(page, action = 'loading', showProgress = false) {
    const message = LoadingMessages[page] && LoadingMessages[page][action] 
        ? LoadingMessages[page][action] 
        : 'Loading...';
    showLoading(message, showProgress);
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { showLoading, hideLoading, showPageLoading, LoadingMessages };
}