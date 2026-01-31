import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Users, 
  Building, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Server, 
  Database, 
  Globe, 
  Shield, 
  Mail,
  RefreshCw,
  Cpu,
  HardDrive,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import axios from 'axios';
import AdminLayout from '../../../components/admin/AdminLayout';
import AdminDashboardSkeleton from '../../../components/admin/skeletons/AdminDashboardSkeleton';

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  uptime: string;
  last_check: string;
  services: {
    database: 'healthy' | 'degraded' | 'critical';
    redis: 'healthy' | 'degraded' | 'critical';
    email_service: 'healthy' | 'degraded' | 'critical';
    file_storage: 'healthy' | 'degraded' | 'critical';
  };
}

interface SystemStats {
  total_users: number;
  total_users_trend: number;
  active_users: number;
  total_institutions: number;
  total_institutions_trend: number;
  total_internships: number;
  total_internships_trend: number;
  total_applications: number;
  total_applications_trend: number;
  system_load: number;
  response_time: number;
  memory_usage: number;
  disk_usage: number;
  api_requests: number;
}

interface RecentActivity {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  details: string;
  severity: 'info' | 'warning' | 'error';
}

const SystemHealthDashboard: React.FC = () => {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'services' | 'performance' | 'activity'>('overview');
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    fetchSystemData();
    const interval = setInterval(() => {
      fetchSystemData();
      setRefreshCount(prev => prev + 1);
    }, 300000);
    return () => clearInterval(interval);
  }, []);

  const fetchSystemData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) throw new Error('No authentication token');

      const [healthResponse, statsResponse, activityResponse] = await Promise.all([
        axios.get('/api/admin/system/health/', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        axios.get('/api/admin/system/stats/', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        axios.get('/api/admin/system/activity/', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      setSystemHealth(healthResponse.data);
      setSystemStats(statsResponse.data);
      setRecentActivity(activityResponse.data);
      setError('');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || 'Failed to load system data');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getHealthBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25">
          <CheckCircle size={14} className="me-1" />
          Healthy
        </span>;
      case 'degraded':
        return <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25">
          <AlertTriangle size={14} className="me-1" />
          Degraded
        </span>;
      case 'critical':
        return <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25">
          <AlertTriangle size={14} className="me-1" />
          Critical
        </span>;
      default:
        return <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25">
          Unknown
        </span>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'info':
        return <span className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25">Info</span>;
      case 'warning':
        return <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25">Warning</span>;
      case 'error':
        return <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25">Error</span>;
      default:
        return <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25">Unknown</span>;
    }
  };

  const renderTrendBadge = (trend: number) => {
    const isPositive = trend >= 0;
    const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
    const colorClass = isPositive ? 'success' : 'danger';
    
    return (
      <span className={`badge bg-${colorClass} bg-opacity-10 text-${colorClass}`}>
        <Icon size={14} className="me-1" />
        {isPositive ? '+' : ''}{trend}%
      </span>
    );
  };

  const getServiceStatus = (service: string, status: string) => {
    const Icon = service === 'database' ? Database :
                 service === 'redis' ? Server :
                 service === 'email_service' ? Mail :
                 service === 'file_storage' ? Globe : Activity;
    
    const colors = {
      healthy: { bg: 'bg-success bg-opacity-10', text: 'text-success', border: 'border-success border-opacity-25' },
      degraded: { bg: 'bg-warning bg-opacity-10', text: 'text-warning', border: 'border-warning border-opacity-25' },
      critical: { bg: 'bg-danger bg-opacity-10', text: 'text-danger', border: 'border-danger border-opacity-25' }
    };

    const color = colors[status as keyof typeof colors] || colors.healthy;

    return (
      <div className={`card border ${color.border} ${color.bg}`}>
        <div className="card-body">
          <div className="d-flex align-items-center mb-3">
            <div className={`rounded-circle ${color.bg} p-2 me-3`}>
              <Icon size={20} className={color.text} />
            </div>
            <div>
              <h6 className="mb-0 text-capitalize">{service.replace('_', ' ')}</h6>
              <small className="text-muted">Core Service</small>
            </div>
          </div>
          {getHealthBadge(status)}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <AdminDashboardSkeleton />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Page Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h1 className="h3 fw-bold mb-1">System Health & Analytics</h1>
                <p className="text-muted mb-0">Monitor platform performance and system metrics</p>
              </div>
              <div className="d-flex align-items-center">
                <div className="me-3">
                  {systemHealth && getHealthBadge(systemHealth.status)}
                </div>
                <button
                  className="btn btn-outline-primary"
                  onClick={() => {
                    fetchSystemData();
                    setRefreshCount(prev => prev + 1);
                  }}
                >
                  <RefreshCw size={16} className="me-2" />
                  Refresh
                </button>
              </div>
            </div>

        {/* System Overview Cards */}
        <div className="row g-4 mb-4">
          <div className="col-md-3 col-sm-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <div className="rounded-circle bg-primary bg-opacity-10 p-3">
                    <Users size={20} className="text-primary" />
                  </div>
                  {systemStats && renderTrendBadge(systemStats.total_users_trend)}
                </div>
                <h3 className="card-title mb-1">{systemStats?.total_users?.toLocaleString() || '0'}</h3>
                <p className="text-muted mb-0 small">Total Users</p>
                <div className="mt-2">
                  <span className="text-success small fw-semibold">
                    {systemStats?.active_users || 0} active
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-md-3 col-sm-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <div className="rounded-circle bg-success bg-opacity-10 p-3">
                    <Building size={20} className="text-success" />
                  </div>
                  {systemStats && renderTrendBadge(systemStats.total_institutions_trend)}
                </div>
                <h3 className="card-title mb-1">{systemStats?.total_institutions?.toLocaleString() || '0'}</h3>
                <p className="text-muted mb-0 small">Institutions</p>
                <div className="mt-2">
                  <span className="text-muted small">Educational Partners</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-md-3 col-sm-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <div className="rounded-circle bg-warning bg-opacity-10 p-3">
                    <TrendingUp size={20} className="text-warning" />
                  </div>
                  {systemStats && renderTrendBadge(systemStats.total_internships_trend)}
                </div>
                <h3 className="card-title mb-1">{systemStats?.total_internships?.toLocaleString() || '0'}</h3>
                <p className="text-muted mb-0 small">Internships</p>
                <div className="mt-2">
                  <span className="text-muted small">Available Positions</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-md-3 col-sm-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <div className="rounded-circle bg-danger bg-opacity-10 p-3">
                    <Activity size={20} className="text-danger" />
                  </div>
                  {systemStats && renderTrendBadge(systemStats.total_applications_trend)}
                </div>
                <h3 className="card-title mb-1">{systemStats?.total_applications?.toLocaleString() || '0'}</h3>
                <p className="text-muted mb-0 small">Applications</p>
                <div className="mt-2">
                  <span className="text-muted small">Total Submitted</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="row">
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-0 pt-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h4 className="card-title mb-1">System Dashboard</h4>
                    <p className="text-muted mb-0 small">Real-time platform monitoring and analytics</p>
                  </div>
                  <div className="d-flex align-items-center">
                    <span className="badge bg-light text-dark me-3">
                      <Clock size={12} className="me-1" />
                      Auto-refresh in: 5m
                    </span>
                    <small className="text-muted">
                      Last updated: {new Date().toLocaleTimeString()}
                    </small>
                  </div>
                </div>

                {/* Error Alert */}
                {error && (
                  <div className="alert alert-danger alert-dismissible fade show mt-3" role="alert">
                    <AlertTriangle size={18} className="me-2" />
                    {error}
                    <button type="button" className="btn-close" onClick={() => setError('')}></button>
                  </div>
                )}

                {/* Tabs */}
                <ul className="nav nav-tabs mt-3 border-bottom-0" role="tablist">
                  <li className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                      onClick={() => setActiveTab('overview')}
                    >
                      <BarChart3 size={16} className="me-2" />
                      Overview
                    </button>
                  </li>
                  <li className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${activeTab === 'services' ? 'active' : ''}`}
                      onClick={() => setActiveTab('services')}
                    >
                      <Server size={16} className="me-2" />
                      Services ({Object.keys(systemHealth?.services || {}).length})
                    </button>
                  </li>
                  <li className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${activeTab === 'performance' ? 'active' : ''}`}
                      onClick={() => setActiveTab('performance')}
                    >
                      <Cpu size={16} className="me-2" />
                      Performance
                    </button>
                  </li>
                  <li className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${activeTab === 'activity' ? 'active' : ''}`}
                      onClick={() => setActiveTab('activity')}
                    >
                      <Activity size={16} className="me-2" />
                      Activity ({recentActivity.length})
                    </button>
                  </li>
                </ul>
              </div>

              <div className="card-body">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="tab-pane fade show active">
                    <div className="row g-4">
                      {/* Service Health */}
                      <div className="col-lg-6">
                        <div className="card border h-100">
                          <div className="card-header bg-light">
                            <div className="d-flex align-items-center">
                              <Server size={18} className="me-2 text-primary" />
                              <h6 className="mb-0">Service Health Status</h6>
                            </div>
                          </div>
                          <div className="card-body">
                            <div className="row g-3">
                              {systemHealth?.services && Object.entries(systemHealth.services).map(([service, status]) => (
                                <div key={service} className="col-md-6">
                                  {getServiceStatus(service, status)}
                                </div>
                              ))}
                            </div>
                            <div className="mt-4 pt-3 border-top">
                              <div className="row">
                                <div className="col-6">
                                  <div className="small text-muted">System Uptime</div>
                                  <div className="fw-semibold">{systemHealth?.uptime || 'N/A'}</div>
                                </div>
                                <div className="col-6">
                                  <div className="small text-muted">Last Check</div>
                                  <div className="fw-semibold">
                                    {systemHealth ? new Date(systemHealth.last_check).toLocaleTimeString() : 'N/A'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Performance Metrics */}
                      <div className="col-lg-6">
                        <div className="card border h-100">
                          <div className="card-header bg-light">
                            <div className="d-flex align-items-center">
                              <Cpu size={18} className="me-2 text-primary" />
                              <h6 className="mb-0">Performance Metrics</h6>
                            </div>
                          </div>
                          <div className="card-body">
                            <div className="row g-3">
                              <div className="col-md-6">
                                <div className="card border-0 bg-light">
                                  <div className="card-body">
                                    <div className="d-flex align-items-center mb-3">
                                      <div className="rounded-circle bg-primary bg-opacity-10 p-2 me-3">
                                        <Cpu size={16} className="text-primary" />
                                      </div>
                                      <div>
                                        <div className="fw-semibold">System Load</div>
                                        <small className="text-muted">CPU Utilization</small>
                                      </div>
                                    </div>
                                    <h4 className="mb-1">{systemStats?.system_load?.toFixed(1) || '0.0'}%</h4>
                                    <div className="progress" style={{height: '6px'}}>
                                      <div 
                                        className={`progress-bar ${
                                          (systemStats?.system_load || 0) > 80 ? 'bg-danger' : 
                                          (systemStats?.system_load || 0) > 60 ? 'bg-warning' : 'bg-success'
                                        }`}
                                        style={{width: `${systemStats?.system_load || 0}%`}}
                                      ></div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="col-md-6">
                                <div className="card border-0 bg-light">
                                  <div className="card-body">
                                    <div className="d-flex align-items-center mb-3">
                                      <div className="rounded-circle bg-success bg-opacity-10 p-2 me-3">
                                        <Clock size={16} className="text-success" />
                                      </div>
                                      <div>
                                        <div className="fw-semibold">Response Time</div>
                                        <small className="text-muted">API Latency</small>
                                      </div>
                                    </div>
                                    <h4 className="mb-1">{systemStats?.response_time || 0}ms</h4>
                                    <div className="progress" style={{height: '6px'}}>
                                      <div 
                                        className={`progress-bar ${
                                          (systemStats?.response_time || 0) > 500 ? 'bg-danger' : 
                                          (systemStats?.response_time || 0) > 200 ? 'bg-warning' : 'bg-success'
                                        }`}
                                        style={{width: `${Math.min((systemStats?.response_time || 0) / 10, 100)}%`}}
                                      ></div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="col-md-6">
                                <div className="card border-0 bg-light">
                                  <div className="card-body">
                                    <div className="d-flex align-items-center mb-3">
                                      <div className="rounded-circle bg-warning bg-opacity-10 p-2 me-3">
                                        <HardDrive size={16} className="text-warning" />
                                      </div>
                                      <div>
                                        <div className="fw-semibold">Memory Usage</div>
                                        <small className="text-muted">RAM Utilization</small>
                                      </div>
                                    </div>
                                    <h4 className="mb-1">{systemStats?.memory_usage?.toFixed(1) || '0.0'}%</h4>
                                    <div className="progress" style={{height: '6px'}}>
                                      <div 
                                        className={`progress-bar ${
                                          (systemStats?.memory_usage || 0) > 90 ? 'bg-danger' : 
                                          (systemStats?.memory_usage || 0) > 70 ? 'bg-warning' : 'bg-success'
                                        }`}
                                        style={{width: `${systemStats?.memory_usage || 0}%`}}
                                      ></div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="col-md-6">
                                <div className="card border-0 bg-light">
                                  <div className="card-body">
                                    <div className="d-flex align-items-center mb-3">
                                      <div className="rounded-circle bg-info bg-opacity-10 p-2 me-3">
                                        <Database size={16} className="text-info" />
                                      </div>
                                      <div>
                                        <div className="fw-semibold">Disk Usage</div>
                                        <small className="text-muted">Storage Utilization</small>
                                      </div>
                                    </div>
                                    <h4 className="mb-1">{systemStats?.disk_usage?.toFixed(1) || '0.0'}%</h4>
                                    <div className="progress" style={{height: '6px'}}>
                                      <div 
                                        className={`progress-bar ${
                                          (systemStats?.disk_usage || 0) > 90 ? 'bg-danger' : 
                                          (systemStats?.disk_usage || 0) > 70 ? 'bg-warning' : 'bg-success'
                                        }`}
                                        style={{width: `${systemStats?.disk_usage || 0}%`}}
                                      ></div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Services Tab */}
                {activeTab === 'services' && (
                  <div className="tab-pane fade show active">
                    <div className="row g-4">
                      {systemHealth?.services && Object.entries(systemHealth.services).map(([service, status]) => (
                        <div key={service} className="col-lg-3 col-md-6">
                          {getServiceStatus(service, status)}
                        </div>
                      ))}
                      <div className="col-12">
                        <div className="card border">
                          <div className="card-body">
                            <h6 className="mb-3">System Information</h6>
                            <div className="row">
                              <div className="col-md-4">
                                <div className="d-flex justify-content-between mb-2">
                                  <span className="text-muted">Uptime:</span>
                                  <span className="fw-semibold">{systemHealth?.uptime || 'N/A'}</span>
                                </div>
                              </div>
                              <div className="col-md-4">
                                <div className="d-flex justify-content-between mb-2">
                                  <span className="text-muted">Last Check:</span>
                                  <span className="fw-semibold">
                                    {systemHealth ? new Date(systemHealth.last_check).toLocaleString() : 'N/A'}
                                  </span>
                                </div>
                              </div>
                              <div className="col-md-4">
                                <div className="d-flex justify-content-between mb-2">
                                  <span className="text-muted">Overall Status:</span>
                                  {systemHealth ? getHealthBadge(systemHealth.status) : <span>N/A</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Performance Tab */}
                {activeTab === 'performance' && (
                  <div className="tab-pane fade show active">
                    <div className="row g-4">
                      <div className="col-md-6">
                        <div className="card border h-100">
                          <div className="card-header bg-light">
                            <h6 className="mb-0">Resource Utilization</h6>
                          </div>
                          <div className="card-body">
                            <div className="row g-3">
                              <div className="col-12">
                                <div className="d-flex justify-content-between mb-1">
                                  <span className="text-muted">CPU Usage</span>
                                  <span className="fw-semibold">{systemStats?.system_load?.toFixed(1) || '0.0'}%</span>
                                </div>
                                <div className="progress" style={{height: '10px'}}>
                                  <div 
                                    className={`progress-bar ${
                                      (systemStats?.system_load || 0) > 80 ? 'bg-danger' : 
                                      (systemStats?.system_load || 0) > 60 ? 'bg-warning' : 'bg-success'
                                    }`}
                                    style={{width: `${systemStats?.system_load || 0}%`}}
                                  ></div>
                                </div>
                              </div>
                              <div className="col-12">
                                <div className="d-flex justify-content-between mb-1">
                                  <span className="text-muted">Memory Usage</span>
                                  <span className="fw-semibold">{systemStats?.memory_usage?.toFixed(1) || '0.0'}%</span>
                                </div>
                                <div className="progress" style={{height: '10px'}}>
                                  <div 
                                    className={`progress-bar ${
                                      (systemStats?.memory_usage || 0) > 90 ? 'bg-danger' : 
                                      (systemStats?.memory_usage || 0) > 70 ? 'bg-warning' : 'bg-success'
                                    }`}
                                    style={{width: `${systemStats?.memory_usage || 0}%`}}
                                  ></div>
                                </div>
                              </div>
                              <div className="col-12">
                                <div className="d-flex justify-content-between mb-1">
                                  <span className="text-muted">Disk Usage</span>
                                  <span className="fw-semibold">{systemStats?.disk_usage?.toFixed(1) || '0.0'}%</span>
                                </div>
                                <div className="progress" style={{height: '10px'}}>
                                  <div 
                                    className={`progress-bar ${
                                      (systemStats?.disk_usage || 0) > 90 ? 'bg-danger' : 
                                      (systemStats?.disk_usage || 0) > 70 ? 'bg-warning' : 'bg-success'
                                    }`}
                                    style={{width: `${systemStats?.disk_usage || 0}%`}}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="card border h-100">
                          <div className="card-header bg-light">
                            <h6 className="mb-0">Network & API Performance</h6>
                          </div>
                          <div className="card-body">
                            <div className="row g-3">
                              <div className="col-12">
                                <div className="d-flex justify-content-between mb-1">
                                  <span className="text-muted">API Response Time</span>
                                  <span className="fw-semibold">{systemStats?.response_time || 0}ms</span>
                                </div>
                                <div className="progress" style={{height: '10px'}}>
                                  <div 
                                    className={`progress-bar ${
                                      (systemStats?.response_time || 0) > 500 ? 'bg-danger' : 
                                      (systemStats?.response_time || 0) > 200 ? 'bg-warning' : 'bg-success'
                                    }`}
                                    style={{width: `${Math.min((systemStats?.response_time || 0) / 5, 100)}%`}}
                                  ></div>
                                </div>
                              </div>
                              <div className="col-12">
                                <div className="d-flex justify-content-between mb-1">
                                  <span className="text-muted">API Requests</span>
                                  <span className="fw-semibold">{systemStats?.api_requests?.toLocaleString() || '0'}/min</span>
                                </div>
                                <div className="progress" style={{height: '10px'}}>
                                  <div 
                                    className="progress-bar bg-info"
                                    style={{width: '65%'}}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Activity Tab */}
                {activeTab === 'activity' && (
                  <div className="tab-pane fade show active">
                    <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      <table className="table table-hover mb-0">
                        <thead className="sticky-top bg-white">
                          <tr>
                            <th>Action</th>
                            <th>Details</th>
                            <th>Actor</th>
                            <th>Severity</th>
                            <th>Timestamp</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentActivity.map((activity) => (
                            <tr key={activity.id}>
                              <td>
                                <div className="fw-semibold">{activity.action}</div>
                              </td>
                              <td>
                                <small className="text-muted">{activity.details}</small>
                              </td>
                              <td>
                                <div className="d-flex align-items-center">
                                  <div className="rounded-circle bg-primary bg-opacity-10 p-1 me-2">
                                    <Shield size={12} className="text-primary" />
                                  </div>
                                  {activity.actor}
                                </div>
                              </td>
                              <td>
                                {getSeverityBadge(activity.severity)}
                              </td>
                              <td>
                                <div className="small text-muted">
                                  {new Date(activity.timestamp).toLocaleString()}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {recentActivity.length === 0 && (
                      <div className="text-center py-5">
                        <Activity size={48} className="text-muted mb-3" />
                        <h5 className="text-muted">No recent activity</h5>
                        <p className="text-muted">System activity will appear here</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="card-footer bg-transparent border-0">
                <div className="row align-items-center">
                  <div className="col-md-6">
                    <small className="text-muted">
                      <Activity size={12} className="me-1" />
                      Auto-refreshing every 5 minutes • Refreshed {refreshCount} times
                    </small>
                  </div>
                  <div className="col-md-6 text-end">
                    <small className="text-muted">
                      Current time: {new Date().toLocaleTimeString()} • 
                      <span className={`ms-2 ${systemHealth?.status === 'healthy' ? 'text-success' : 
                                       systemHealth?.status === 'degraded' ? 'text-warning' : 'text-danger'}`}>
                        <span className="d-inline-block rounded-circle me-1" style={{
                          width: '8px', 
                          height: '8px', 
                          backgroundColor: systemHealth?.status === 'healthy' ? '#198754' : 
                                         systemHealth?.status === 'degraded' ? '#ffc107' : '#dc3545'
                        }}></span>
                        System {systemHealth?.status || 'Unknown'}
                      </span>
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    </AdminLayout>
  );
};

export default SystemHealthDashboard;