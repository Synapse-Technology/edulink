/**
 * Dashboard Manager Module
 * Coordinates dashboard functionality and manages data flow between components
 */

class DashboardManager {
    constructor() {
        this.apiUtils = new APIUtils();
        this.chartUtils = new ChartUtils();
        this.isInitialized = false;
        this.refreshInterval = null;
        this.refreshRate = 30000; // 30 seconds
    }

    /**
     * Initialize the dashboard
     */
    async init() {
        if (this.isInitialized) return;

        try {
            DOMUtils.showLoadingSpinner('dashboard-content');
            
            // Load initial data
            await Promise.all([
                this.loadDashboardData(),
                this.loadRecentApplications(),
                this.loadNotifications()
            ]);

            // Setup auto-refresh
            this.startAutoRefresh();
            
            // Setup event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            DOMUtils.hideLoadingSpinner('dashboard-content');
            
        } catch (error) {
            console.error('Failed to initialize dashboard:', error);
            DOMUtils.showError('dashboard-content', 'Failed to load dashboard data');
        }
    }

    /**
     * Load main dashboard data
     */
    async loadDashboardData() {
        try {
            const data = await this.apiUtils.get(this.apiUtils.config.endpoints.dashboard);
            
            if (data) {
                this.updateDashboardStats(data.statistics);
                this.updateAnalyticsCharts(data.analytics);
                this.updateRecentActivity(data.recent_activity);
            }
            
            return data;
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            throw error;
        }
    }

    /**
     * Update dashboard statistics
     */
    updateDashboardStats(stats) {
        if (!stats) return;

        const statElements = {
            'total-applications': stats.total_applications || 0,
            'pending-applications': stats.pending_applications || 0,
            'active-internships': stats.active_internships || 0,
            'completion-rate': stats.completion_rate || 0
        };

        Object.entries(statElements).forEach(([elementId, value]) => {
            const element = document.getElementById(elementId);
            if (element) {
                if (elementId === 'completion-rate') {
                    element.textContent = `${value}%`;
                } else {
                    element.textContent = DOMUtils.formatNumber(value);
                }
            }
        });

        // Update trend indicators
        this.updateTrendIndicators(stats.trends);
    }

    /**
     * Update trend indicators
     */
    updateTrendIndicators(trends) {
        if (!trends) return;

        Object.entries(trends).forEach(([key, trend]) => {
            const trendElement = document.getElementById(`${key}-trend`);
            if (trendElement && trend) {
                const isPositive = trend.change >= 0;
                const icon = isPositive ? 'fa-arrow-up' : 'fa-arrow-down';
                const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
                
                trendElement.innerHTML = `
                    <i class="fas ${icon} ${colorClass}"></i>
                    <span class="${colorClass}">${Math.abs(trend.change)}%</span>
                `;
            }
        });
    }

    /**
     * Update analytics charts
     */
    updateAnalyticsCharts(analytics) {
        if (!analytics) return;

        // Application trends chart
        if (analytics.application_trends) {
            this.chartUtils.createAnalyticsChart('applications-chart', analytics.application_trends);
        }

        // Application status distribution
        if (analytics.status_distribution) {
            this.chartUtils.createApplicationStatusChart('status-chart', analytics.status_distribution);
        }

        // Monthly performance chart
        if (analytics.monthly_performance) {
            const data = {
                labels: analytics.monthly_performance.labels,
                datasets: [{
                    label: 'Applications Received',
                    data: analytics.monthly_performance.applications,
                    borderColor: this.chartUtils.defaultColors.primary,
                    backgroundColor: this.chartUtils.defaultColors.primary + '20',
                    fill: true
                }]
            };
            
            this.chartUtils.createLineChart('performance-chart', data);
        }
    }

    /**
     * Load recent applications
     */
    async loadRecentApplications() {
        try {
            const applications = await this.apiUtils.get(this.apiUtils.config.endpoints.recentApplications);
            this.updateRecentApplicationsList(applications);
            return applications;
        } catch (error) {
            console.error('Error loading recent applications:', error);
            throw error;
        }
    }

    /**
     * Update recent applications list
     */
    updateRecentApplicationsList(applications) {
        const container = document.getElementById('recent-applications-list');
        if (!container || !applications) return;

        if (applications.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-inbox text-4xl mb-2 opacity-50"></i>
                    <p>No recent applications</p>
                </div>
            `;
            return;
        }

        container.innerHTML = applications.map(app => `
            <div class="application-item border-b border-gray-200 py-3 hover:bg-gray-50">
                <div class="flex items-center justify-between">
                    <div class="flex-1">
                        <h4 class="font-medium text-gray-900">${DOMUtils.sanitizeHTML(app.applicant_name)}</h4>
                        <p class="text-sm text-gray-600">${DOMUtils.sanitizeHTML(app.position_title)}</p>
                        <p class="text-xs text-gray-500">${DOMUtils.formatRelativeTime(app.applied_at)}</p>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="status-badge px-2 py-1 text-xs rounded-full ${
                            app.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            app.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                            app.status === 'accepted' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                        }">
                            ${app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                        </span>
                        <button onclick="viewApplication('${app.id}')" class="text-blue-600 hover:text-blue-800">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Load notifications
     */
    async loadNotifications() {
        try {
            const notifications = await this.apiUtils.get(this.apiUtils.config.endpoints.notifications);
            this.updateNotificationsList(notifications);
            return notifications;
        } catch (error) {
            console.error('Error loading notifications:', error);
            throw error;
        }
    }

    /**
     * Update notifications list
     */
    updateNotificationsList(notifications) {
        const container = document.getElementById('notifications-list');
        if (!container || !notifications) return;

        if (notifications.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-bell-slash text-4xl mb-2 opacity-50"></i>
                    <p>No new notifications</p>
                </div>
            `;
            return;
        }

        container.innerHTML = notifications.slice(0, 5).map(notification => `
            <div class="notification-item border-b border-gray-200 py-3 hover:bg-gray-50 ${
                !notification.read ? 'bg-blue-50' : ''
            }">
                <div class="flex items-start space-x-3">
                    <div class="flex-shrink-0">
                        <i class="fas ${
                            notification.type === 'application' ? 'fa-file-alt text-blue-600' :
                            notification.type === 'message' ? 'fa-envelope text-green-600' :
                            notification.type === 'system' ? 'fa-cog text-gray-600' :
                            'fa-bell text-yellow-600'
                        }"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-900">
                            ${DOMUtils.sanitizeHTML(notification.title)}
                        </p>
                        <p class="text-sm text-gray-600">
                            ${DOMUtils.sanitizeHTML(notification.message)}
                        </p>
                        <p class="text-xs text-gray-500 mt-1">
                            ${DOMUtils.formatRelativeTime(notification.created_at)}
                        </p>
                    </div>
                    ${!notification.read ? '<div class="w-2 h-2 bg-blue-600 rounded-full"></div>' : ''}
                </div>
            </div>
        `).join('');
    }

    /**
     * Update recent activity
     */
    updateRecentActivity(activities) {
        const container = document.getElementById('recent-activity-list');
        if (!container || !activities) return;

        if (activities.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-history text-4xl mb-2 opacity-50"></i>
                    <p>No recent activity</p>
                </div>
            `;
            return;
        }

        container.innerHTML = activities.slice(0, 10).map(activity => `
            <div class="activity-item border-b border-gray-200 py-2">
                <div class="flex items-center space-x-3">
                    <div class="flex-shrink-0">
                        <i class="fas ${
                            activity.type === 'application' ? 'fa-file-alt text-blue-600' :
                            activity.type === 'interview' ? 'fa-calendar text-green-600' :
                            activity.type === 'update' ? 'fa-edit text-yellow-600' :
                            'fa-info-circle text-gray-600'
                        }"></i>
                    </div>
                    <div class="flex-1">
                        <p class="text-sm text-gray-900">${DOMUtils.sanitizeHTML(activity.description)}</p>
                        <p class="text-xs text-gray-500">${DOMUtils.formatRelativeTime(activity.timestamp)}</p>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshDashboard());
        }

        // Auto-refresh toggle
        const autoRefreshToggle = document.getElementById('auto-refresh-toggle');
        if (autoRefreshToggle) {
            autoRefreshToggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.startAutoRefresh();
                } else {
                    this.stopAutoRefresh();
                }
            });
        }

        // Window resize handler for charts
        window.addEventListener('resize', DOMUtils.debounce(() => {
            this.chartUtils.resizeAllCharts();
        }, 250));
    }

    /**
     * Refresh dashboard data
     */
    async refreshDashboard() {
        try {
            DOMUtils.setLoadingState('dashboard-content', true);
            
            await Promise.all([
                this.loadDashboardData(),
                this.loadRecentApplications(),
                this.loadNotifications()
            ]);
            
            DOMUtils.showSuccess('dashboard-content', 'Dashboard refreshed successfully');
        } catch (error) {
            console.error('Error refreshing dashboard:', error);
            DOMUtils.showError('dashboard-content', 'Failed to refresh dashboard');
        } finally {
            DOMUtils.setLoadingState('dashboard-content', false);
        }
    }

    /**
     * Start auto-refresh
     */
    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        this.refreshInterval = setInterval(() => {
            this.refreshDashboard();
        }, this.refreshRate);
    }

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.stopAutoRefresh();
        this.chartUtils.destroyAllCharts();
        this.isInitialized = false;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardManager;
} else {
    window.DashboardManager = DashboardManager;
}