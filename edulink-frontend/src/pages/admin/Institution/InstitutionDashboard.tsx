import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button } from 'react-bootstrap';
import { Users, Briefcase, FileText, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import PlacementMonitoringWidget from '../../../components/dashboard/institution/PlacementMonitoringWidget';
import InstitutionLayout from '../../../components/admin/institution/InstitutionLayout';
import DashboardCharts from '../../../components/dashboard/institution/DashboardCharts';
import InstitutionDashboardSkeleton from '../../../components/admin/skeletons/InstitutionDashboardSkeleton';
import TrustProgressWidget from '../../../components/dashboard/TrustProgressWidget';
import { institutionService } from '../../../services/institution/institutionService';
import type { PlacementStats } from '../../../services/institution/institutionService';

const StatCard = ({ title, value, icon: Icon, color, bgColor, trend }: { title: string, value: number, icon: any, color: string, bgColor: string, trend: number }) => {
  const isPositive = trend >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  
  return (
    <Card className="border-0 shadow-sm h-100 transition-hover hover-lift rounded-4 overflow-hidden bg-white">
      <div className="position-absolute top-0 end-0 p-3 opacity-10">
        <Icon size={80} style={{ color: color }} />
      </div>
      <Card.Body className="p-4 position-relative">
        <div className="d-flex align-items-center mb-4">
          <div className="p-3 rounded-3 d-flex align-items-center justify-content-center shadow-sm" style={{ backgroundColor: bgColor }}>
            <Icon size={24} style={{ color: color }} strokeWidth={2.5} />
          </div>
          <div className="ms-3">
            <p className="text-muted small text-uppercase mb-0 fw-bold" style={{ letterSpacing: '0.8px' }}>{title}</p>
            <h2 className="mb-0 fw-bold text-dark" style={{ fontSize: '1.85rem' }}>{value.toLocaleString()}</h2>
          </div>
        </div>
        <div className="d-flex align-items-center pt-3 border-top border-light mt-auto">
          <div className={`d-flex align-items-center small fw-bold me-2 px-2 py-1 rounded-pill ${isPositive ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}`}>
            <TrendIcon size={14} className="me-1" />
            <span>{isPositive ? '+' : ''}{trend}%</span>
          </div>
          <span className="text-muted" style={{ fontSize: '0.75rem' }}>since last month</span>
        </div>
      </Card.Body>
    </Card>
  );
};

const InstitutionDashboard: React.FC = () => {
  const [stats, setStats] = useState<PlacementStats | null>(null);
  const [trustStats, setTrustStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [data, trustData] = await Promise.all([
          institutionService.getPlacementSuccessStats(),
          institutionService.getTrustProgress()
        ]);
        setStats(data);
        setTrustStats(trustData);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <InstitutionLayout>
      <style>{`
        .hover-lift {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .hover-lift:hover {
          transform: translateY(-5px);
          box-shadow: 0 .5rem 1rem rgba(0,0,0,.15)!important;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
      
      {loading ? (
        <InstitutionDashboardSkeleton />
      ) : (
        <div className="animate-fade-in">
          {/* Header Section */}
          <div className="mb-5 d-flex flex-column flex-md-row justify-content-between align-items-md-end gap-3">
            <div>
              <h2 className="fw-bold text-dark mb-1">Dashboard Overview</h2>
              <p className="text-muted mb-0 fs-5">Welcome back! Here's what's happening with your placements today.</p>
            </div>
            <div className="d-flex gap-2">
              <Button variant="white" className="shadow-sm border-0 rounded-3 px-3 d-flex align-items-center gap-2">
                <Calendar size={18} className="text-primary" />
                <span className="fw-semibold small">Last 30 Days</span>
              </Button>
              <Button variant="primary" className="shadow-sm rounded-3 px-4 fw-bold">
                Generate Report
              </Button>
            </div>
          </div>

          <Row className="g-4 mb-4">
            <Col md={4}>
              <StatCard 
                title="Total Placements" 
                value={stats?.summary.total_placements || 0} 
                icon={Users} 
                color="#0d6efd" 
                bgColor="#e7f1ff"
                trend={stats?.summary.total_trend || 0}
              />
            </Col>
            <Col md={4}>
              <StatCard 
                title="Active Internships" 
                value={stats?.funnel.active || 0} 
                icon={Briefcase} 
                color="#198754" 
                bgColor="#d1e7dd"
                trend={0}
              />
            </Col>
            <Col md={4}>
              <StatCard 
                title="Pending Applications" 
                value={stats?.funnel.applied || 0} 
                icon={FileText} 
                color="#fd7e14" 
                bgColor="#ffecdc"
                trend={0}
              />
            </Col>
          </Row>

          <Row className="g-4 mb-4">
            <Col lg={8}>
              <DashboardCharts stats={stats} />
            </Col>
            <Col lg={4}>
              <TrustProgressWidget data={trustStats} isLoading={loading} userType="institution" />
            </Col>
          </Row>

          <div className="mt-5">
            <PlacementMonitoringWidget />
          </div>
        </div>
      )}
    </InstitutionLayout>
  );
};

export default InstitutionDashboard;
