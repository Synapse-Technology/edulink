import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button } from 'react-bootstrap';
import { Users, Briefcase, FileText, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import PlacementMonitoringWidget from '../../../components/dashboard/institution/PlacementMonitoringWidget';
import InstitutionLayout from '../../../components/admin/institution/InstitutionLayout';
import DashboardCharts from '../../../components/dashboard/institution/DashboardCharts';
import InstitutionDashboardSkeleton from '../../../components/admin/skeletons/InstitutionDashboardSkeleton';
import TrustProgressWidget from '../../../components/dashboard/TrustProgressWidget';
import { SEO } from '../../../components/common';
import { useErrorHandler } from '../../../hooks/useErrorHandler';
import { showToast } from '../../../utils/toast';
import { sanitizeAdminError } from '../../../utils/adminErrorSanitizer';
import { institutionService } from '../../../services/institution/institutionService';
import type { AffiliatedStudent, Department, PlacementStats } from '../../../services/institution/institutionService';
import { internshipService } from '../../../services/internship/internshipService';
import type { InternshipEvidence } from '../../../services/internship/internshipService';
import PendingLogbooksWidget from '../../../components/dashboard/PendingLogbooksWidget';
import PilotReadinessPanel, { type PilotReadinessItem } from '../../../components/pilot/PilotReadinessPanel';

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
  const [pendingLogbooks, setPendingLogbooks] = useState<InternshipEvidence[]>([]);
  const [students, setStudents] = useState<AffiliatedStudent[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const { handleError: handleDashboardError } = useErrorHandler({
    onAuthError: () => showToast.error('Unauthorized access'),
    onUnexpected: (error) => {
      const sanitized = sanitizeAdminError(error);
      showToast.error(sanitized.userMessage);
    },
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [data, trustData, evidenceResponse, studentData, departmentData] = await Promise.all([
          institutionService.getPlacementSuccessStats(),
          institutionService.getTrustProgress(),
          internshipService.getPendingEvidence(),
          institutionService.getStudents(),
          institutionService.getDepartments()
        ]);
        
        // Handle paginated evidence response
        const evidence = Array.isArray(evidenceResponse) ? evidenceResponse : (evidenceResponse as any)?.results || [];
        
        setStats(data);
        setTrustStats(trustData);
        setPendingLogbooks(evidence.filter((e: any) => e.evidence_type === 'LOGBOOK'));
        setStudents(studentData);
        setDepartments(departmentData);
      } catch (error) {
        await handleDashboardError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const readinessItems: PilotReadinessItem[] = [
    {
      id: 'academic-structure',
      label: 'Academic structure configured',
      description: 'Departments and cohorts give the pilot clean reporting and prevent fuzzy student labels from becoming official data.',
      complete: departments.length > 0,
      actionLabel: 'Manage departments',
      actionTo: '/institution/dashboard/academic',
    },
    {
      id: 'student-cohort',
      label: 'Pilot students onboarded',
      description: 'A pilot cohort should have verified or pending students before employers are asked to review applications.',
      complete: students.length > 0 || (stats?.summary.total_students || 0) > 0,
      actionLabel: 'Verify students',
      actionTo: '/institution/dashboard/verification',
    },
    {
      id: 'opportunity-pipeline',
      label: 'Opportunity pipeline active',
      description: 'At least one application or active placement means students and employers are moving through the workflow.',
      complete: (stats?.summary.total_applications || 0) > 0 || (stats?.summary.total_placements || 0) > 0,
      actionLabel: 'Review applications',
      actionTo: '/institution/dashboard/applications',
    },
    {
      id: 'supervision-evidence',
      label: 'Supervision and evidence loop visible',
      description: 'Logbook/evidence review is the core proof that EduLink is more than a listing board.',
      complete: (stats?.quality_control.evidence_count || 0) > 0 || pendingLogbooks.length > 0,
      actionLabel: 'Open logbooks',
      actionTo: '/institution/supervisor-dashboard/logbooks',
    },
    {
      id: 'quality-reporting',
      label: 'Reporting baseline available',
      description: 'Placement, completion, audit readiness, and incident metrics are needed for pilot review meetings.',
      complete: Boolean(stats),
      actionLabel: 'View reports',
      actionTo: '/institution/dashboard/reports',
    },
    {
      id: 'certification',
      label: 'Completion/certification path ready',
      description: 'A verifiable end state helps institutions prove outcomes to students, employers, and accreditation stakeholders.',
      complete: (stats?.funnel.certified || 0) > 0 || (stats?.funnel.completed || 0) > 0,
      actionLabel: 'Open certifications',
      actionTo: '/institution/dashboard/certifications',
    },
  ];

  return (
    <InstitutionLayout>
      <SEO 
        title="Institution Dashboard"
        description="Monitor student placements, verify logbooks, and manage your institution's profile on EduLink KE."
      />
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
              <p className="text-muted mb-0 fs-5">Run a trusted attachment pilot from cohort setup to verified completion.</p>
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

          <PilotReadinessPanel
            title="Institution pilot operating checklist"
            subtitle="Use this to prepare one department, one cohort, and a focused employer group for beta testing."
            items={readinessItems}
            variant="institution"
          />

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
              <div className="mb-4">
                <TrustProgressWidget data={trustStats} isLoading={loading} userType="institution" />
              </div>
              <PendingLogbooksWidget 
                logbooks={pendingLogbooks}
                isLoading={loading}
                viewAllLink="/institution/dashboard/applications"
                reviewLinkPrefix="/institution/supervisor-dashboard/logbooks"
              />
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
