/**
 * Institution Supervisor Dashboard JavaScript
 * Common functionality and utilities for all dashboard pages
 */

// Global dashboard object
const InstitutionDashboard = {
  // Configuration
  config: {
    apiBaseUrl: '/api/institution-supervisor',
    refreshInterval: 30000, // 30 seconds
    animationDuration: 300,
    chartColors: {
      primary: '#667eea',
      secondary: '#764ba2',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      info: '#3b82f6'
    }
  },

  // State management
  state: {
    currentUser: null,
    notifications: [],
    activeFilters: {},
    isLoading: false
  },

  // Initialize dashboard
  init() {
    this.setupMobileMenu();
    this.setupNotifications();
    this.setupGlobalEventListeners();
    this.loadUserData();
    this.startPeriodicUpdates();
  },

  // Mobile menu functionality
  setupMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');

    if (mobileMenuBtn && sidebar && mobileMenuOverlay) {
      mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        mobileMenuOverlay.classList.toggle('hidden');
      });

      mobileMenuOverlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        mobileMenuOverlay.classList.add('hidden');
      });

      // Close mobile menu when clicking on navigation links
      document.querySelectorAll('#sidebar a').forEach(link => {
        link.addEventListener('click', () => {
          sidebar.classList.remove('open');
          mobileMenuOverlay.classList.add('hidden');
        });
      });
    }
  },

  // Notification system
  setupNotifications() {
    this.createNotificationContainer();
  },

  createNotificationContainer() {
    if (!document.getElementById('notification-container')) {
      const container = document.createElement('div');
      container.id = 'notification-container';
      container.className = 'fixed top-4 right-4 z-50 space-y-2';
      document.body.appendChild(container);
    }
  },

  showNotification(message, type = 'info', duration = 5000) {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    const id = 'notification-' + Date.now();
    
    const typeClasses = {
      success: 'bg-green-500 text-white',
      error: 'bg-red-500 text-white',
      warning: 'bg-yellow-500 text-white',
      info: 'bg-blue-500 text-white'
    };

    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    };

    notification.id = id;
    notification.className = `${typeClasses[type]} px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 transform translate-x-full transition-transform duration-300`;
    notification.innerHTML = `
      <i class="${icons[type]}"></i>
      <span class="flex-1">${message}</span>
      <button onclick="InstitutionDashboard.closeNotification('${id}')" class="text-white hover:text-gray-200">
        <i class="fas fa-times"></i>
      </button>
    `;

    container.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.classList.remove('translate-x-full');
    }, 10);

    // Auto remove
    if (duration > 0) {
      setTimeout(() => {
        this.closeNotification(id);
      }, duration);
    }

    return id;
  },

  closeNotification(id) {
    const notification = document.getElementById(id);
    if (notification) {
      notification.classList.add('translate-x-full');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }
  },

  // Global event listeners
  setupGlobalEventListeners() {
    // Handle form submissions
    document.addEventListener('submit', (e) => {
      if (e.target.classList.contains('ajax-form')) {
        e.preventDefault();
        this.handleAjaxForm(e.target);
      }
    });

    // Handle loading states
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('loading-btn')) {
        this.setLoadingState(e.target, true);
      }
    });

    // Handle keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardShortcuts(e);
    });
  },

  // Load user data
  async loadUserData() {
    try {
      // Simulate API call
      const userData = {
        id: 1,
        name: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@university.edu',
        role: 'Institution Supervisor',
        department: 'Computer Science',
        avatar: null
      };
      
      this.state.currentUser = userData;
      this.updateUserInterface(userData);
    } catch (error) {
      console.error('Failed to load user data:', error);
      this.showNotification('Failed to load user data', 'error');
    }
  },

  updateUserInterface(userData) {
    // Update profile sections
    const profileElements = document.querySelectorAll('[data-user-name]');
    profileElements.forEach(el => {
      el.textContent = userData.name;
    });

    const roleElements = document.querySelectorAll('[data-user-role]');
    roleElements.forEach(el => {
      el.textContent = userData.role;
    });
  },

  // Periodic updates
  startPeriodicUpdates() {
    setInterval(() => {
      this.refreshDashboardData();
    }, this.config.refreshInterval);
  },

  async refreshDashboardData() {
    if (this.state.isLoading) return;
    
    try {
      this.state.isLoading = true;
      // Simulate API calls for different page types
      const currentPage = this.getCurrentPage();
      
      switch (currentPage) {
        case 'dashboard':
          await this.refreshDashboardStats();
          break;
        case 'interns':
          await this.refreshInternsData();
          break;
        case 'logbooks':
          await this.refreshLogbooksData();
          break;
        case 'feedback':
          await this.refreshFeedbackData();
          break;
      }
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      this.state.isLoading = false;
    }
  },

  getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('assigned_interns')) return 'interns';
    if (path.includes('logbooks')) return 'logbooks';
    if (path.includes('feedback')) return 'feedback';
    return 'dashboard';
  },

  // Data refresh methods
  async refreshDashboardStats() {
    // Simulate API call
    const stats = {
      totalInterns: 24,
      activePlacements: 18,
      pendingReviews: 8,
      averagePerformance: 4.2
    };
    
    this.updateStatsCards(stats);
  },

  async refreshInternsData() {
    // Refresh interns list if on interns page
    if (typeof renderInterns === 'function') {
      // Trigger re-render if function exists
      const event = new CustomEvent('dataRefresh', { detail: { type: 'interns' } });
      document.dispatchEvent(event);
    }
  },

  async refreshLogbooksData() {
    // Refresh logbooks if on logbooks page
    if (typeof renderLogbooks === 'function') {
      const event = new CustomEvent('dataRefresh', { detail: { type: 'logbooks' } });
      document.dispatchEvent(event);
    }
  },

  async refreshFeedbackData() {
    // Refresh feedback data if on feedback page
    const event = new CustomEvent('dataRefresh', { detail: { type: 'feedback' } });
    document.dispatchEvent(event);
  },

  updateStatsCards(stats) {
    Object.keys(stats).forEach(key => {
      const element = document.querySelector(`[data-stat="${key}"]`);
      if (element) {
        this.animateNumber(element, parseInt(element.textContent) || 0, stats[key]);
      }
    });
  },

  // Utility functions
  animateNumber(element, from, to, duration = 1000) {
    const start = Date.now();
    const update = () => {
      const progress = Math.min((Date.now() - start) / duration, 1);
      const current = Math.floor(from + (to - from) * progress);
      element.textContent = current;
      
      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };
    update();
  },

  formatDate(date, format = 'short') {
    const options = {
      short: { month: 'short', day: 'numeric' },
      long: { year: 'numeric', month: 'long', day: 'numeric' },
      time: { hour: '2-digit', minute: '2-digit' }
    };
    
    return new Intl.DateTimeFormat('en-US', options[format]).format(new Date(date));
  },

  formatNumber(number, decimals = 0) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(number);
  },

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Form handling
  async handleAjaxForm(form) {
    const formData = new FormData(form);
    const submitBtn = form.querySelector('[type="submit"]');
    
    try {
      this.setLoadingState(submitBtn, true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.showNotification('Form submitted successfully!', 'success');
      form.reset();
    } catch (error) {
      this.showNotification('Failed to submit form', 'error');
    } finally {
      this.setLoadingState(submitBtn, false);
    }
  },

  setLoadingState(element, isLoading) {
    if (isLoading) {
      element.disabled = true;
      element.classList.add('loading');
      const originalText = element.textContent;
      element.dataset.originalText = originalText;
      element.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Loading...';
    } else {
      element.disabled = false;
      element.classList.remove('loading');
      element.textContent = element.dataset.originalText || 'Submit';
    }
  },

  // Keyboard shortcuts
  handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + K for search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i]');
      if (searchInput) {
        searchInput.focus();
      }
    }
    
    // Escape to close modals
    if (e.key === 'Escape') {
      const openModal = document.querySelector('.modal:not(.hidden)');
      if (openModal) {
        openModal.classList.add('hidden');
      }
    }
  },

  // Chart utilities
  createChart(canvas, config) {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js not loaded');
      return null;
    }
    
    const ctx = canvas.getContext('2d');
    return new Chart(ctx, {
      ...config,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: config.options?.plugins?.legend?.display ?? true
          }
        },
        ...config.options
      }
    });
  },

  // Export utilities
  exportToCSV(data, filename) {
    const csv = this.convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  convertToCSV(data) {
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        }).join(',')
      )
    ].join('\n');
    
    return csvContent;
  },

  // Local storage utilities
  saveToStorage(key, data) {
    try {
      localStorage.setItem(`institution_dashboard_${key}`, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  },

  loadFromStorage(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(`institution_dashboard_${key}`);
      return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
      console.warn('Failed to load from localStorage:', error);
      return defaultValue;
    }
  },

  // Theme utilities
  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.saveToStorage('theme', theme);
  },

  getTheme() {
    return this.loadFromStorage('theme', 'light');
  },

  // Performance monitoring
  measurePerformance(name, fn) {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    console.log(`${name} took ${end - start} milliseconds`);
    return result;
  }
};

// Initialize dashboard when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    InstitutionDashboard.init();
  });
} else {
  InstitutionDashboard.init();
}

// Export for global access
window.InstitutionDashboard = InstitutionDashboard;