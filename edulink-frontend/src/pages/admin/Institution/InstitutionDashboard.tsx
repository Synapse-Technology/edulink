import React, { useState, useEffect } from 'react';
import { Row, Col } from 'react-bootstrap';
import {
  Users,
  Briefcase,
  FileText,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Building2,
  Activity,
} from 'lucide-react';

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
import type {
  AffiliatedStudent,
  Department,
  PlacementStats,
} from '../../../services/institution/institutionService';
import { internshipService } from '../../../services/internship/internshipService';
import type { InternshipEvidence } from '../../../services/internship/internshipService';
import PendingLogbooksWidget from '../../../components/dashboard/PendingLogbooksWidget';
import PilotReadinessPanel, {
  type PilotReadinessItem,
} from '../../../components/pilot/PilotReadinessPanel';
import {
  InstitutionButton,
  InstitutionHero,
  InstitutionMetric,
  InstitutionMetricGrid,
  InstitutionWorkspacePage,
} from '../../../components/institution/workspace';

const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  description,
}: {
  title: string;
  value: number;
  icon: any;
  trend: number;
  description: string;
}) => {
  const isPositive = trend >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <InstitutionMetric
      className="institution-stat-card h-100"
      label={title}
      value={value.toLocaleString()}
      icon={<Icon size={22} strokeWidth={2.2} />}
      note={(
        <>
          <span
            className={`institution-trend ${isPositive ? 'is-positive' : 'is-negative'}`}
          >
            <TrendIcon size={13} />
            {isPositive ? '+' : ''}
            {trend}%
          </span>
          <span className="d-block mt-2">{description}</span>
        </>
      )}
    />
  );
};

const InstitutionDashboard: React.FC = () => {
  const [stats, setStats] = useState<PlacementStats | null>(null);
  const [trustStats, setTrustStats] = useState<any>(null);
  const [pendingLogbooks, setPendingLogbooks] = useState<InternshipEvidence[]>([]);
  const [students, setStudents] = useState<AffiliatedStudent[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [dateRange, setDateRange] = useState<{ date_from: string; date_to: string }>(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 30);

    return {
      date_from: from.toISOString().slice(0, 10),
      date_to: to.toISOString().slice(0, 10),
    };
  });

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
        setLoading(true);

        const [
          data,
          trustData,
          evidenceResponse,
          studentData,
          departmentData,
        ] = await Promise.all([
          institutionService.getPlacementSuccessStats(dateRange),
          institutionService.getTrustProgress(),
          internshipService.getPendingEvidence(),
          institutionService.getStudents(),
          institutionService.getDepartments(),
        ]);

        const evidence = Array.isArray(evidenceResponse)
          ? evidenceResponse
          : (evidenceResponse as any)?.results || [];

        setStats(data);
        setTrustStats(trustData);
        setPendingLogbooks(
          evidence.filter((e: any) => e.evidence_type === 'LOGBOOK')
        );
        setStudents(studentData);
        setDepartments(departmentData);
      } catch (error) {
        await handleDashboardError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [dateRange]);

  const handleLast30Days = () => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 30);

    setDateRange({
      date_from: from.toISOString().slice(0, 10),
      date_to: to.toISOString().slice(0, 10),
    });
  };

  const handleGenerateReport = async () => {
    setExporting(true);

    try {
      const blob = await institutionService.exportReport(dateRange);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');

      a.href = url;
      a.download = `institution_placement_report_${dateRange.date_from}_to_${dateRange.date_to}.csv`;

      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast.success('Report generated');
    } catch (error) {
      await handleDashboardError(error);
    } finally {
      setExporting(false);
    }
  };

  const readinessItems: PilotReadinessItem[] = [
    {
      id: 'academic-structure',
      label: 'Academic structure configured',
      description:
        'Departments and cohorts give the pilot clean reporting and prevent fuzzy student labels from becoming official data.',
      complete: departments.length > 0,
      actionLabel: 'Manage departments',
      actionTo: '/institution/dashboard/academic',
    },
    {
      id: 'student-cohort',
      label: 'Pilot students onboarded',
      description:
        'A pilot cohort should have verified or pending students before employers are asked to review applications.',
      complete: students.length > 0 || (stats?.summary.total_students || 0) > 0,
      actionLabel: 'Verify students',
      actionTo: '/institution/dashboard/verification',
    },
    {
      id: 'opportunity-pipeline',
      label: 'Opportunity pipeline active',
      description:
        'At least one application or active placement means students and employers are moving through the workflow.',
      complete:
        (stats?.summary.total_applications || 0) > 0 ||
        (stats?.summary.total_placements || 0) > 0,
      actionLabel: 'Review applications',
      actionTo: '/institution/dashboard/applications',
    },
    {
      id: 'supervision-evidence',
      label: 'Supervision and evidence loop visible',
      description:
        'Logbook/evidence review is the core proof that EduLink is more than a listing board.',
      complete:
        (stats?.quality_control.evidence_count || 0) > 0 ||
        pendingLogbooks.length > 0,
      actionLabel: 'Open logbooks',
      actionTo: '/institution/supervisor-dashboard/logbooks',
    },
    {
      id: 'quality-reporting',
      label: 'Reporting baseline available',
      description:
        'Placement, completion, audit readiness, and incident metrics are needed for pilot review meetings.',
      complete: Boolean(stats),
      actionLabel: 'View reports',
      actionTo: '/institution/dashboard/reports',
    },
    {
      id: 'certification',
      label: 'Completion/certification path ready',
      description:
        'A verifiable end state helps institutions prove outcomes to students, employers, and accreditation stakeholders.',
      complete:
        (stats?.funnel.certified || 0) > 0 ||
        (stats?.funnel.completed || 0) > 0,
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
        .institution-dashboard-shell {
          animation: institutionFadeIn 0.45s ease-out forwards;
        }

        @keyframes institutionFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .institution-hero {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 28px;
          padding: 28px;
          margin-bottom: 28px;
        }

        .institution-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #f4f6f8;
          border: 1px solid #e6e9ee;
          color: #475569;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 8px 12px;
          border-radius: 999px;
          margin-bottom: 18px;
        }

        .institution-title {
          color: #111827;
          font-size: clamp(1.7rem, 3vw, 2.45rem);
          font-weight: 750;
          letter-spacing: -0.055em;
          line-height: 1.08;
          margin-bottom: 10px;
        }

        .institution-subtitle {
          color: #64748b;
          font-size: 1rem;
          line-height: 1.7;
          max-width: 680px;
          margin-bottom: 0;
        }

        .institution-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .institution-btn-soft {
          background: #ffffff !important;
          color: #111827 !important;
          border: 1px solid #dfe3ea !important;
          border-radius: 14px !important;
          height: 46px;
          padding-left: 16px !important;
          padding-right: 16px !important;
          font-weight: 650 !important;
          box-shadow: none !important;
        }

        .institution-btn-dark {
          background: #111827 !important;
          color: #ffffff !important;
          border: 1px solid #111827 !important;
          border-radius: 14px !important;
          height: 46px;
          padding-left: 18px !important;
          padding-right: 18px !important;
          font-weight: 700 !important;
          box-shadow: none !important;
        }

        .institution-btn-soft:hover,
        .institution-btn-dark:hover {
          transform: translateY(-1px);
        }

        .institution-stat-card {
          background: #ffffff;
          border: 1px solid #e7eaf0 !important;
          border-radius: 24px !important;
          box-shadow: none !important;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .institution-stat-card:hover {
          transform: translateY(-3px);
          border-color: #cfd6df !important;
        }

        .institution-stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          background: #f5f7fa;
          color: #111827;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #edf0f4;
        }

        .institution-trend {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.78rem;
          font-weight: 700;
          padding: 6px 10px;
          border-radius: 999px;
        }

        .institution-trend.is-positive {
          background: #f0fdf4;
          color: #166534;
          border: 1px solid #dcfce7;
        }

        .institution-trend.is-negative {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fee2e2;
        }

        .institution-stat-label {
          color: #64748b;
          font-size: 0.82rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.055em;
        }

        .institution-stat-value {
          color: #111827;
          font-size: 2rem;
          font-weight: 760;
          letter-spacing: -0.05em;
          line-height: 1;
        }

        .institution-stat-description {
          color: #64748b;
          font-size: 0.88rem;
          line-height: 1.55;
        }

        .institution-section-card {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 26px;
          padding: 20px;
          box-shadow: none;
        }

        .institution-dashboard-shell :global(.card) {
          border-radius: 24px;
        }

        @media (max-width: 768px) {
          .institution-hero {
            padding: 22px;
            border-radius: 22px;
          }

          .institution-actions {
            width: 100%;
          }

          .institution-actions button {
            flex: 1;
          }
        }
      `}</style>

      {loading ? (
        <InstitutionDashboardSkeleton />
      ) : (
        <InstitutionWorkspacePage className="institution-dashboard-shell">
          <InstitutionHero
            className="institution-hero"
            icon={<Building2 size={15} />}
            eyebrow="Institution Command Center"
            title="Manage placements, supervision, and certification with confidence."
            subtitle="A calm operational view for tracking student attachment workflows, reviewing evidence, monitoring placement quality, and preparing institutional reports."
            actions={(
              <>
                <InstitutionButton
                  variant="ghost"
                  className="institution-btn-soft"
                  onClick={handleLast30Days}
                >
                  <Calendar size={17} />
                  Last 30 Days
                </InstitutionButton>

                <InstitutionButton
                  variant="primary"
                  className="institution-btn-dark"
                  onClick={handleGenerateReport}
                  disabled={exporting}
                >
                  <Download size={17} />
                  {exporting ? 'Generating...' : 'Generate Report'}
                </InstitutionButton>
              </>
            )}
          />

          <div className="mb-4">
            <PilotReadinessPanel
              title="Institution pilot operating checklist"
              subtitle="Use this to prepare one department, one cohort, and a focused employer group for beta testing."
              items={readinessItems}
              variant="institution"
            />
          </div>

          <InstitutionMetricGrid className="g-4 mb-4">
              <StatCard
                title="Total Placements"
                value={stats?.summary.total_placements || 0}
                icon={Users}
                trend={stats?.summary.total_trend || 0}
                description="Students currently mapped to verified placement outcomes."
              />

              <StatCard
                title="Active Internships"
                value={stats?.funnel.active || 0}
                icon={Briefcase}
                trend={0}
                description="Ongoing attachments requiring supervision and progress tracking."
              />

              <StatCard
                title="Pending Applications"
                value={stats?.funnel.applied || 0}
                icon={FileText}
                trend={0}
                description="Student applications waiting for review, matching, or approval."
              />
          </InstitutionMetricGrid>

          <Row className="g-4 mb-4">
            <Col lg={8}>
              <div className="institution-section-card h-100">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <div>
                    <h5 className="fw-bold text-dark mb-1">
                      Placement Analytics
                    </h5>
                    <p className="text-muted small mb-0">
                      Track flow from applications to certified completion.
                    </p>
                  </div>

                  <Activity size={20} className="text-muted" />
                </div>

                <DashboardCharts stats={stats} />
              </div>
            </Col>

            <Col lg={4}>
              <div className="institution-section-card mb-4">
                <TrustProgressWidget
                  data={trustStats}
                  isLoading={loading}
                  userType="institution"
                />
              </div>

              <div className="institution-section-card">
                <PendingLogbooksWidget
                  logbooks={pendingLogbooks}
                  isLoading={loading}
                  viewAllLink="/institution/dashboard/applications"
                  reviewLinkPrefix="/institution/supervisor-dashboard/logbooks"
                />
              </div>
            </Col>
          </Row>

          <div className="institution-section-card mt-4">
            <PlacementMonitoringWidget />
          </div>
        </InstitutionWorkspacePage>
      )}
    </InstitutionLayout>
  );
};

export default InstitutionDashboard;
