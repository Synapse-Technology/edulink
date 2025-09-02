// Responsive Sidebar Functionality for Institution Dashboard
// This script handles mobile sidebar toggle, overlay, and responsive behavior

// Sidebar toggle functionality
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.mobile-overlay');
    const body = document.body;
    
    if (sidebar && overlay) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
        body.classList.toggle('sidebar-open');
    }
}

function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.mobile-overlay');
    const body = document.body;
    
    if (sidebar && overlay) {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        body.classList.remove('sidebar-open');
    }
}

// Initialize responsive sidebar functionality
function initResponsiveSidebar() {
    // Close sidebar when clicking on main content on mobile
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                closeSidebar();
            }
        });
    }
    
    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            closeSidebar();
        }
    });
    
    // Close sidebar on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && window.innerWidth <= 768) {
            closeSidebar();
        }
    });
    
    // Prevent body scroll when sidebar is open on mobile
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const isOpen = sidebar.classList.contains('open');
                    if (window.innerWidth <= 768) {
                        document.body.style.overflow = isOpen ? 'hidden' : '';
                    }
                }
            });
        });
        
        observer.observe(sidebar, {
            attributes: true,
            attributeFilter: ['class']
        });
    }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initResponsiveSidebar);
} else {
    initResponsiveSidebar();
}