/**
 * Chart Utilities Module
 * Handles Chart.js operations and data visualization
 */

class ChartUtils {
    constructor() {
        this.charts = new Map();
        this.defaultColors = {
            primary: '#2563eb',
            secondary: '#0ea5e9',
            success: '#10b981',
            warning: '#f59e0b',
            danger: '#ef4444',
            info: '#6366f1',
            light: '#f8fafc',
            dark: '#1e293b'
        };
    }

    /**
     * Create or update a line chart
     */
    createLineChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error(`Canvas element with id '${canvasId}' not found`);
            return null;
        }

        // Destroy existing chart if it exists
        this.destroyChart(canvasId);

        const defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: {
                        display: false
                    }
                },
                y: {
                    display: true,
                    beginAtZero: true,
                    grid: {
                        color: '#e5e7eb'
                    }
                }
            },
            elements: {
                line: {
                    tension: 0.4
                },
                point: {
                    radius: 4,
                    hoverRadius: 6
                }
            }
        };

        const chart = new Chart(ctx, {
            type: 'line',
            data: data,
            options: { ...defaultOptions, ...options }
        });

        this.charts.set(canvasId, chart);
        return chart;
    }

    /**
     * Create or update a bar chart
     */
    createBarChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error(`Canvas element with id '${canvasId}' not found`);
            return null;
        }

        this.destroyChart(canvasId);

        const defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#e5e7eb'
                    }
                }
            }
        };

        const chart = new Chart(ctx, {
            type: 'bar',
            data: data,
            options: { ...defaultOptions, ...options }
        });

        this.charts.set(canvasId, chart);
        return chart;
    }

    /**
     * Create or update a doughnut chart
     */
    createDoughnutChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error(`Canvas element with id '${canvasId}' not found`);
            return null;
        }

        this.destroyChart(canvasId);

        const defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom'
                }
            },
            cutout: '60%'
        };

        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: { ...defaultOptions, ...options }
        });

        this.charts.set(canvasId, chart);
        return chart;
    }

    /**
     * Create analytics chart with trend data
     */
    createAnalyticsChart(canvasId, analyticsData) {
        if (!analyticsData || !analyticsData.labels) {
            console.warn('Invalid analytics data provided');
            return null;
        }

        const data = {
            labels: analyticsData.labels,
            datasets: [
                {
                    label: 'Applications',
                    data: analyticsData.applications || [],
                    borderColor: this.defaultColors.primary,
                    backgroundColor: this.defaultColors.primary + '20',
                    fill: true
                },
                {
                    label: 'Views',
                    data: analyticsData.views || [],
                    borderColor: this.defaultColors.secondary,
                    backgroundColor: this.defaultColors.secondary + '20',
                    fill: true
                }
            ]
        };

        return this.createLineChart(canvasId, data, {
            plugins: {
                title: {
                    display: true,
                    text: 'Application Analytics'
                }
            }
        });
    }

    /**
     * Create application status chart
     */
    createApplicationStatusChart(canvasId, statusData) {
        if (!statusData) {
            console.warn('No status data provided');
            return null;
        }

        const data = {
            labels: ['Pending', 'Reviewed', 'Accepted', 'Rejected'],
            datasets: [{
                data: [
                    statusData.pending || 0,
                    statusData.reviewed || 0,
                    statusData.accepted || 0,
                    statusData.rejected || 0
                ],
                backgroundColor: [
                    this.defaultColors.warning,
                    this.defaultColors.info,
                    this.defaultColors.success,
                    this.defaultColors.danger
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        };

        return this.createDoughnutChart(canvasId, data, {
            plugins: {
                title: {
                    display: true,
                    text: 'Application Status Distribution'
                }
            }
        });
    }

    /**
     * Update chart data
     */
    updateChart(canvasId, newData) {
        const chart = this.charts.get(canvasId);
        if (!chart) {
            console.warn(`Chart with id '${canvasId}' not found`);
            return false;
        }

        chart.data = newData;
        chart.update('active');
        return true;
    }

    /**
     * Destroy a specific chart
     */
    destroyChart(canvasId) {
        const chart = this.charts.get(canvasId);
        if (chart) {
            chart.destroy();
            this.charts.delete(canvasId);
        }
    }

    /**
     * Destroy all charts
     */
    destroyAllCharts() {
        this.charts.forEach((chart, canvasId) => {
            chart.destroy();
        });
        this.charts.clear();
    }

    /**
     * Resize all charts
     */
    resizeAllCharts() {
        this.charts.forEach(chart => {
            chart.resize();
        });
    }

    /**
     * Generate color palette
     */
    generateColorPalette(count) {
        const colors = Object.values(this.defaultColors);
        const palette = [];
        
        for (let i = 0; i < count; i++) {
            palette.push(colors[i % colors.length]);
        }
        
        return palette;
    }

    /**
     * Format chart data from API response
     */
    formatChartData(apiData, type = 'line') {
        if (!apiData || !Array.isArray(apiData)) {
            return { labels: [], datasets: [] };
        }

        const labels = apiData.map(item => item.label || item.date || item.name);
        const values = apiData.map(item => item.value || item.count || 0);

        if (type === 'doughnut' || type === 'pie') {
            return {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: this.generateColorPalette(labels.length)
                }]
            };
        }

        return {
            labels: labels,
            datasets: [{
                label: 'Data',
                data: values,
                borderColor: this.defaultColors.primary,
                backgroundColor: this.defaultColors.primary + '20'
            }]
        };
    }

    /**
     * Add loading state to chart container
     */
    showChartLoading(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="flex items-center justify-center h-64">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span class="ml-2 text-gray-600">Loading chart...</span>
            </div>
        `;
    }

    /**
     * Show chart error state
     */
    showChartError(containerId, message = 'Failed to load chart') {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-64 text-gray-500">
                <i class="fas fa-chart-line text-4xl mb-2 opacity-50"></i>
                <p>${message}</p>
                <button onclick="location.reload()" class="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Retry
                </button>
            </div>
        `;
    }

    // Lazy loading support
    async createLazyChart(elementId, chartType, config = {}) {
        const element = document.getElementById(elementId);
        if (!element) {
            throw new Error(`Chart element with id '${elementId}' not found`);
        }

        // Wait for Chart.js if not loaded
        if (typeof Chart === 'undefined') {
            await this.waitForChartJS();
        }

        // Create chart based on type
        switch (chartType) {
            case 'analytics':
                return await this.createAnalyticsChart(elementId, config);
            case 'applications':
                return await this.createApplicationStatusChart(elementId, config);
            case 'line':
                return await this.createLineChart(elementId, config);
            case 'bar':
                return await this.createBarChart(elementId, config);
            case 'doughnut':
                return await this.createDoughnutChart(elementId, config);
            default:
                throw new Error(`Unknown chart type: ${chartType}`);
        }
    }

    waitForChartJS(timeout = 5000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const checkChart = () => {
                if (typeof Chart !== 'undefined') {
                    resolve();
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error('Timeout waiting for Chart.js'));
                } else {
                    setTimeout(checkChart, 100);
                }
            };
            
            checkChart();
        });
    }

    // Check if chart is in viewport for lazy loading
    isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    // Cleanup
    destroy() {
        this.charts.forEach(chart => chart.destroy());
        this.charts.clear();
    }
}

// Initialize chart utilities
const chartUtils = new ChartUtils();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartUtils;
}

// Make available globally
window.chartUtils = chartUtils;
window.ChartUtils = ChartUtils;