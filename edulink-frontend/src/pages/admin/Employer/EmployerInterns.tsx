import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  GraduationCap,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EmployerLayout } from '../../../components/admin/employer';
import TableSkeleton from '../../../components/admin/skeletons/TableSkeleton';
import { employerService } from '../../../services/employer/employerService';
import { internshipService } from '../../../services/internship/internshipService';
import { sanitizeAdminError } from '../../../utils/adminErrorSanitizer';
import type { InternshipApplication } from '../../../services/internship/internshipService';
import TrustBadge, { type TrustLevel } from '../../../components/common/TrustBadge';
import { showToast } from '../../../utils/toast';
import { FeedbackModal } from '../../../components/common';
import { useFeedbackModal } from '../../../hooks/useFeedbackModal';
import { SEO } from '../../../components/common';

const STYLES = `
  .ei-page { color: var(--el-ink); }

  .ei-hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 22px;
    margin-bottom: 22px;
  }

  .ei-command-card {
    border: 1px solid var(--el-border);
    border-radius: 24px;
    background:
      radial-gradient(circle at top right, var(--el-accent-soft), transparent 36%),
      var(--el-surface);
    padding: 28px;
    box-shadow: var(--el-shadow);
  }

  .ei-kicker {
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--el-accent);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: 10px;
  }

  .ei-title {
    font-size: clamp(2rem, 4vw, 3rem);
    line-height: 1.05;
    letter-spacing: -0.04em;
    font-weight: 820;
    margin: 0 0 12px;
    color: var(--el-ink);
  }

  .ei-title span {
    color: var(--el-muted);
    font-weight: 620;
  }

  .ei-sub {
    color: var(--el-muted);
    font-size: 14px;
    line-height: 1.7;
    margin: 0;
    max-width: 680px;
  }

  .ei-health-card {
    border: 1px solid var(--el-border);
    border-radius: 24px;
    background: linear-gradient(135deg, var(--el-surface), var(--el-surface-2));
    padding: 24px;
    box-shadow: var(--el-shadow);
  }

  .ei-health-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .ei-health-label,
  .ei-card-label {
    color: var(--el-muted);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  .ei-health-score {
    font-size: 3rem;
    font-weight: 830;
    letter-spacing: -0.06em;
    line-height: 1;
  }

  .ei-health-icon {
    width: 46px;
    height: 46px;
    border-radius: 16px;
    background: var(--el-accent);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 12px 28px rgba(26,92,255,0.25);
  }

  .ei-health-note {
    color: var(--el-muted);
    font-size: 12px;
    line-height: 1.6;
    margin-top: 18px;
  }

  .ei-metrics {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 22px;
  }

  .ei-metric {
    border: 1px solid var(--el-border);
    border-radius: 20px;
    background: var(--el-surface);
    padding: 18px;
    min-height: 126px;
    transition: transform 0.12s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  }

  .ei-metric:hover {
    transform: translateY(-2px);
    border-color: var(--el-accent);
    box-shadow: var(--el-shadow);
  }

  .ei-metric-top {
    display: flex;
    justify-content: space-between;
    margin-bottom: 18px;
  }

  .ei-metric-icon {
    width: 40px;
    height: 40px;
    border-radius: 14px;
    background: var(--el-accent-soft);
    color: var(--el-accent);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ei-metric-value {
    font-size: 2rem;
    font-weight: 820;
    line-height: 1;
    letter-spacing: -0.05em;
  }

  .ei-metric-label {
    color: var(--el-muted);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .ei-metric-note {
    color: var(--el-muted);
    font-size: 12px;
    margin: 0;
  }

  .ei-toolbar {
    border: 1px solid var(--el-border);
    border-radius: 22px;
    background: var(--el-surface);
    padding: 18px;
    margin-bottom: 22px;
  }

  .ei-toolbar-grid {
    display: grid;
    grid-template-columns: minmax(260px, 1fr) 220px;
    gap: 12px;
  }

  .ei-search {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--el-surface-2);
    border: 1px solid var(--el-border);
    border-radius: 16px;
    padding: 0 14px;
    height: 46px;
  }

  .ei-search svg { color: var(--el-muted); }

  .ei-search input {
    width: 100%;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--el-ink);
    font-size: 13px;
  }

  .ei-select {
    height: 46px;
    border-radius: 16px;
    border: 1px solid var(--el-border);
    background: var(--el-surface-2);
    color: var(--el-ink);
    padding: 0 14px;
    font-size: 13px;
    font-weight: 700;
    outline: none;
  }

  .ei-card {
    border: 1px solid var(--el-border);
    border-radius: 22px;
    background: var(--el-surface);
    box-shadow: 0 1px 0 rgba(16,19,22,0.02);
    overflow: hidden;
  }

  .ei-card-header {
    padding: 20px 22px 16px;
    border-bottom: 1px solid var(--el-border);
  }

  .ei-card-title {
    font-size: 1.05rem;
    font-weight: 780;
    margin: 0;
    color: var(--el-ink);
  }

  .ei-card-sub {
    color: var(--el-muted);
    font-size: 12px;
    margin: 4px 0 0;
  }

  .ei-table-wrap { overflow-x: auto; }

  .ei-table {
    width: 100%;
    border-collapse: collapse;
  }

  .ei-table th {
    padding: 16px 22px 12px;
    color: var(--el-muted);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .ei-table td {
    padding: 16px 22px;
    border-top: 1px solid var(--el-border);
    vertical-align: middle;
    color: var(--el-ink);
    font-size: 13px;
  }

  .ei-candidate {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 250px;
  }

  .ei-avatar {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    background: var(--el-accent-soft);
    color: var(--el-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 850;
    flex-shrink: 0;
  }

  .ei-name-line {
    display: flex;
    align-items: center;
    gap: 7px;
    flex-wrap: wrap;
  }

  .ei-name {
    font-weight: 760;
    margin: 0;
  }

  .ei-email,
  .ei-muted {
    color: var(--el-muted);
    font-size: 12px;
    margin: 2px 0 0;
  }

  .ei-role {
    font-weight: 760;
    margin: 0 0 3px;
  }

  .ei-status {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border-radius: 999px;
    padding: 6px 10px;
    font-size: 11px;
    font-weight: 800;
    white-space: nowrap;
  }

  .ei-status.active {
    background: rgba(18,183,106,0.12);
    color: #0f9f62;
  }

  .ei-status.completed {
    background: rgba(55,65,81,0.12);
    color: #374151;
  }

  .ei-status.certified {
    background: rgba(26,92,255,0.12);
    color: var(--el-accent);
  }

  .ei-status.default {
    background: var(--el-surface-2);
    color: var(--el-muted);
  }

  .ei-signal {
    margin-top: 7px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 700;
  }

  .ei-signal.good { color: #12b76a; }
  .ei-signal.warn { color: #f59e0b; }

  .ei-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
  }

  .ei-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border-radius: 12px;
    border: 1px solid var(--el-border);
    background: var(--el-surface-2);
    color: var(--el-accent);
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 800;
    transition: all 0.15s ease;
  }

  .ei-btn:hover {
    border-color: var(--el-accent);
    background: var(--el-accent-soft);
    transform: translateY(-1px);
  }

  .ei-btn-success {
    color: #0f9f62;
  }

  .ei-btn-warning {
    color: #b45309;
  }

  .ei-empty {
    padding: 52px 20px;
    text-align: center;
    color: var(--el-muted);
  }

  .ei-empty-icon {
    width: 52px;
    height: 52px;
    border-radius: 18px;
    background: var(--el-surface-2);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
  }

  .ei-empty-title {
    color: var(--el-ink);
    font-size: 15px;
    font-weight: 800;
    margin: 0 0 5px;
  }

  .ei-empty-text {
    margin: 0;
    color: var(--el-muted);
    font-size: 13px;
  }

  .ei-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.48);
    z-index: 1100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .ei-modal {
    width: min(520px, 100%);
    border-radius: 24px;
    background: var(--el-surface);
    border: 1px solid var(--el-border);
    box-shadow: 0 24px 80px rgba(15,23,42,0.22);
    overflow: hidden;
  }

  .ei-modal-header {
    padding: 20px 22px;
    border-bottom: 1px solid var(--el-border);
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: center;
  }

  .ei-modal-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 800;
  }

  .ei-modal-close {
    border: 0;
    background: var(--el-surface-2);
    color: var(--el-muted);
    width: 34px;
    height: 34px;
    border-radius: 12px;
    font-weight: 900;
  }

  .ei-modal-body {
    padding: 22px;
  }

  .ei-modal-context {
    border: 1px solid var(--el-border);
    border-radius: 18px;
    background: var(--el-surface-2);
    padding: 14px;
    margin-bottom: 18px;
  }

  .ei-label {
    color: var(--el-muted);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 7px;
  }

  .ei-modal-name {
    font-weight: 800;
    margin: 0 0 3px;
  }

  .ei-form-select {
    width: 100%;
    height: 46px;
    border-radius: 16px;
    border: 1px solid var(--el-border);
    background: var(--el-surface-2);
    color: var(--el-ink);
    padding: 0 14px;
    font-weight: 700;
    outline: none;
  }

  .ei-help {
    display: flex;
    gap: 6px;
    align-items: center;
    color: var(--el-muted);
    font-size: 12px;
    margin-top: 10px;
  }

  .ei-modal-footer {
    padding: 16px 22px 20px;
    border-top: 1px solid var(--el-border);
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }

  .ei-modal-secondary,
  .ei-modal-primary {
    border-radius: 14px;
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 800;
    border: 1px solid var(--el-border);
  }

  .ei-modal-secondary {
    background: var(--el-surface-2);
    color: var(--el-muted);
  }

  .ei-modal-primary {
    background: var(--el-accent);
    color: white;
    border-color: var(--el-accent);
  }

  .ei-modal-primary:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  @media (max-width: 1180px) {
    .ei-hero { grid-template-columns: 1fr; }
    .ei-health-card { max-width: 520px; }
    .ei-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }

  @media (max-width: 680px) {
    .ei-command-card,
    .ei-health-card,
    .ei-toolbar,
    .ei-card-header {
      padding-left: 18px;
      padding-right: 18px;
    }

    .ei-metrics,
    .ei-toolbar-grid {
      grid-template-columns: 1fr;
    }

    .ei-table {
      min-width: 860px;
    }
  }
`;

const statusOptions = [
  { value: 'ALL', label: 'All interns' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CERTIFIED', label: 'Certified' },
];

const getStatusMeta = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return { label: 'Active', className: 'active', icon: Briefcase };
    case 'COMPLETED':
      return { label: 'Completed', className: 'completed', icon: CheckCircle2 };
    case 'CERTIFIED':
      return { label: 'Certified', className: 'certified', icon: ShieldCheck };
    default:
      return { label: status, className: 'default', icon: GraduationCap };
  }
};

const EmployerInterns: React.FC = () => {
  const navigate = useNavigate();

  const [applications, setApplications] = useState<InternshipApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedApp, setSelectedApp] = useState<InternshipApplication | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const { feedbackProps, showError, showSuccess, showConfirm } = useFeedbackModal();

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setIsLoading(true);

      const appsResponse = await internshipService.getApplications();

      const apps = Array.isArray(appsResponse)
        ? appsResponse
        : (appsResponse as any)?.results || [];

      const interns = apps.filter((app: any) =>
        ['ACTIVE', 'COMPLETED', 'CERTIFIED'].includes(app.status)
      );

      setApplications(interns);
    } catch (error) {
      const sanitized = sanitizeAdminError(error);
      showToast.error(sanitized.userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSupervisors = async () => {
    if (supervisors.length > 0) return;

    try {
      const data = await employerService.getSupervisors();
      setSupervisors(data);
    } catch (error) {
      const sanitized = sanitizeAdminError(error);
      showToast.error(sanitized.userMessage || 'Failed to fetch supervisors');
    }
  };

  const handleReviewClick = (appId: string) => {
    navigate(`/employer/dashboard/applications/${appId}`);
  };

  const handleAssignClick = async (app: InternshipApplication) => {
    setSelectedApp(app);
    setSelectedSupervisor(app.employer_supervisor_id || '');
    await fetchSupervisors();
    setShowAssignModal(true);
  };

  const executeAssignment = async () => {
    if (!selectedApp || !selectedSupervisor) return;

    try {
      setActionLoading(true);

      await internshipService.assignSupervisor(
        selectedApp.id,
        selectedSupervisor,
        'employer'
      );

      showSuccess('Mentor Assigned', 'The mentor has been assigned successfully.');
      setShowAssignModal(false);
      await fetchApplications();
    } catch (error: any) {
      console.error('Failed to assign supervisor:', error);
      const sanitized = sanitizeAdminError(error);

      showError(
        'Assignment Failed',
        'We could not assign the mentor at this time.',
        sanitized.details
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignSupervisor = async () => {
    if (!selectedApp || !selectedSupervisor) return;

    if (
      selectedApp.employer_supervisor_id &&
      selectedApp.employer_supervisor_id !== selectedSupervisor
    ) {
      showConfirm({
        title: 'Change Mentor',
        message:
          'This student already has a mentor assigned. Are you sure you want to change them?',
        onConfirm: executeAssignment,
      });

      return;
    }

    await executeAssignment();
  };

  const filteredInterns = useMemo(() => {
    return applications.filter((app) => {
      if (statusFilter !== 'ALL' && app.status !== statusFilter) return false;

      const query = searchTerm.trim().toLowerCase();

      if (query) {
        const haystack = [
          app.student_info?.name,
          app.student_info?.email,
          app.title,
          app.department,
          app.employer_supervisor_details?.name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }, [applications, statusFilter, searchTerm]);

  const metrics = useMemo(() => {
    const active = applications.filter((app) => app.status === 'ACTIVE').length;
    const completed = applications.filter((app) => app.status === 'COMPLETED').length;
    const certified = applications.filter((app) => app.status === 'CERTIFIED').length;
    const assigned = applications.filter((app) => app.employer_supervisor_id).length;

    const mentorshipRate = applications.length
      ? Math.round((assigned / applications.length) * 100)
      : 0;

    return {
      active,
      completed,
      certified,
      assigned,
      mentorshipRate,
    };
  }, [applications]);

  return (
    <EmployerLayout>
      <SEO
        title="My Interns"
        description="Manage active interns, mentor assignments, and internship outcomes on EduLink KE."
      />

      <style>{STYLES}</style>

      <div className="ei-page">
        <section className="ei-hero">
          <div className="ei-command-card">
            <div className="ei-kicker">
              <Sparkles size={13} />
              Internship Operations
            </div>

            <h1 className="ei-title">
              Active <span>Internships</span>
            </h1>

            <p className="ei-sub">
              Manage intern supervision, mentor assignments, placement outcomes, and
              institution-facing internship accountability.
            </p>
          </div>

          <aside className="ei-health-card">
            <div className="ei-health-top">
              <div>
                <div className="ei-health-label">Mentorship coverage</div>
                <div className="ei-health-score">{metrics.mentorshipRate}%</div>
              </div>

              <div className="ei-health-icon">
                <TrendingUp size={20} />
              </div>
            </div>

            <p className="ei-health-note">
              Percentage of interns with assigned mentors. Missing supervision weakens
              placement trust and student support quality.
            </p>
          </aside>
        </section>

        <section className="ei-metrics">
          <div className="ei-metric">
            <div className="ei-metric-top">
              <div>
                <div className="ei-metric-label">Active interns</div>
                <div className="ei-metric-value">{metrics.active}</div>
              </div>
              <div className="ei-metric-icon">
                <Briefcase size={18} />
              </div>
            </div>
            <p className="ei-metric-note">Currently ongoing placements.</p>
          </div>

          <div className="ei-metric">
            <div className="ei-metric-top">
              <div>
                <div className="ei-metric-label">Completed</div>
                <div className="ei-metric-value">{metrics.completed}</div>
              </div>
              <div className="ei-metric-icon">
                <CheckCircle2 size={18} />
              </div>
            </div>
            <p className="ei-metric-note">Placements marked as completed.</p>
          </div>

          <div className="ei-metric">
            <div className="ei-metric-top">
              <div>
                <div className="ei-metric-label">Certified</div>
                <div className="ei-metric-value">{metrics.certified}</div>
              </div>
              <div className="ei-metric-icon">
                <ShieldCheck size={18} />
              </div>
            </div>
            <p className="ei-metric-note">Institution-ready completion proof.</p>
          </div>

          <div className="ei-metric">
            <div className="ei-metric-top">
              <div>
                <div className="ei-metric-label">Mentors assigned</div>
                <div className="ei-metric-value">{metrics.assigned}</div>
              </div>
              <div className="ei-metric-icon">
                <Users size={18} />
              </div>
            </div>
            <p className="ei-metric-note">Interns with employer supervision.</p>
          </div>
        </section>

        <section className="ei-toolbar">
          <div className="ei-toolbar-grid">
            <div className="ei-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search intern, email, position, department, or mentor..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <select
              className="ei-select"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              {statusOptions.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="ei-card">
          <div className="ei-card-header">
            <div className="ei-card-label">Supervision queue</div>
            <h2 className="ei-card-title">Intern management workspace</h2>
            <p className="ei-card-sub">
              Showing {filteredInterns.length} of {applications.length} internship records.
            </p>
          </div>

          <div className="ei-table-wrap">
            <table className="ei-table">
              <thead>
                <tr>
                  <th>Intern</th>
                  <th>Position</th>
                  <th>Start date</th>
                  <th>Status & mentor</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 0 }}>
                      <TableSkeleton rows={5} columns={5} hasHeader={false} hasActions />
                    </td>
                  </tr>
                ) : filteredInterns.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="ei-empty">
                        <div className="ei-empty-icon">
                          <GraduationCap size={26} />
                        </div>
                        <p className="ei-empty-title">No interns found.</p>
                        <p className="ei-empty-text">
                          Try changing the search term or status filter.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredInterns.map((app) => {
                    const statusMeta = getStatusMeta(app.status);
                    const StatusIcon = statusMeta.icon;
                    const trustLevel = (app.student_info?.trust_level as TrustLevel) || 0;
                    const hasMentor = Boolean(app.employer_supervisor_id);

                    return (
                      <tr key={app.id}>
                        <td>
                          <div className="ei-candidate">
                            <div className="ei-avatar">
                              {app.student_info?.name?.charAt(0) || 'I'}
                            </div>

                            <div>
                              <div className="ei-name-line">
                                <p className="ei-name">
                                  {app.student_info?.name || 'Unknown Intern'}
                                </p>

                                <TrustBadge
                                  level={trustLevel}
                                  entityType="student"
                                  size="sm"
                                  showLabel={false}
                                />
                              </div>

                              <p className="ei-email">
                                {app.student_info?.email || 'No email available'}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td>
                          <p className="ei-role">{app.title || 'Untitled position'}</p>
                          <p className="ei-muted">{app.department || 'No department specified'}</p>
                        </td>

                        <td>
                          <p className="ei-muted">
                            {app.start_date
                              ? new Date(app.start_date).toLocaleDateString()
                              : 'N/A'}
                          </p>
                        </td>

                        <td>
                          <span className={`ei-status ${statusMeta.className}`}>
                            <StatusIcon size={12} />
                            {statusMeta.label}
                          </span>

                          {hasMentor ? (
                            <div className="ei-signal good">
                              <UserCheck size={12} />
                              {app.employer_supervisor_details?.name || 'Mentor assigned'}
                            </div>
                          ) : (
                            app.status === 'ACTIVE' && (
                              <div className="ei-signal warn">
                                <AlertCircle size={12} />
                                No mentor assigned
                              </div>
                            )
                          )}
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div className="ei-actions">
                            <button
                              type="button"
                              className="ei-btn"
                              onClick={() => handleReviewClick(app.id)}
                            >
                              Details
                              <ArrowRight size={13} />
                            </button>

                            {app.status === 'ACTIVE' && (
                              <button
                                type="button"
                                className={`ei-btn ${
                                  hasMentor ? 'ei-btn-success' : 'ei-btn-warning'
                                }`}
                                onClick={() => handleAssignClick(app)}
                              >
                                {hasMentor ? 'Reassign' : 'Assign mentor'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {showAssignModal && selectedApp && (
          <div className="ei-modal-backdrop">
            <div className="ei-modal">
              <div className="ei-modal-header">
                <h5 className="ei-modal-title">Assign Mentor</h5>

                <button
                  type="button"
                  className="ei-modal-close"
                  onClick={() => setShowAssignModal(false)}
                >
                  ×
                </button>
              </div>

              <div className="ei-modal-body">
                <div className="ei-modal-context">
                  <div className="ei-label">Assigning mentor for</div>
                  <p className="ei-modal-name">
                    {selectedApp.student_info?.name || 'Unknown Intern'}
                  </p>
                  <p className="ei-muted">{selectedApp.title}</p>
                </div>

                <div>
                  <div className="ei-label">Select supervisor</div>

                  <select
                    className="ei-form-select"
                    value={selectedSupervisor}
                    onChange={(event) => setSelectedSupervisor(event.target.value)}
                  >
                    <option value="">Choose a mentor...</option>

                    {supervisors.map((supervisor) => (
                      <option key={supervisor.id} value={supervisor.id}>
                        {supervisor.name} ({supervisor.email})
                      </option>
                    ))}
                  </select>

                  <div className="ei-help">
                    <AlertCircle size={12} />
                    Assigned mentors can track logbooks and support internship supervision.
                  </div>
                </div>
              </div>

              <div className="ei-modal-footer">
                <button
                  type="button"
                  className="ei-modal-secondary"
                  onClick={() => setShowAssignModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="ei-modal-primary"
                  onClick={handleAssignSupervisor}
                  disabled={actionLoading || !selectedSupervisor}
                >
                  {actionLoading ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <FeedbackModal {...feedbackProps} />
    </EmployerLayout>
  );
};

export default EmployerInterns;