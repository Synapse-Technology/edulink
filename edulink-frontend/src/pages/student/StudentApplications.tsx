import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  CalendarDays,
  CheckCircle,
  Clock,
  FileText,
  MapPin,
  Search,
  Send,
  XCircle,
} from 'lucide-react';
import StudentLayout from '../../components/dashboard/StudentLayout';
import { useTheme } from '../../contexts/ThemeContext';
import { internshipService, type InternshipApplication } from '../../services/internship/internshipService';
import { dateFormatter } from '../../utils/dateFormatter';
import {
  StudentButton,
  StudentCard,
  StudentColumn,
  StudentEmptyState,
  StudentGrid,
  StudentMetric,
  StudentPagination,
  StudentPageHeader,
  StudentStatus,
  StudentToolbar,
  StudentWorkspacePage,
  StudentWorkspaceShell,
  useStudentPagination,
} from '../../components/student/workspace';

type StatusFilter = 'ALL' | 'APPLIED' | 'SHORTLISTED' | 'ACCEPTED' | 'ACTIVE' | 'COMPLETED' | 'REJECTED';

const filters: { key: StatusFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'APPLIED', label: 'Applied' },
  { key: 'SHORTLISTED', label: 'Shortlisted' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'REJECTED', label: 'Rejected' },
];

const toneForStatus = (status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
  if (['ACTIVE', 'COMPLETED', 'CERTIFIED'].includes(status)) return 'success';
  if (['SHORTLISTED', 'ACCEPTED'].includes(status)) return 'info';
  if (status === 'APPLIED') return 'warning';
  if (['REJECTED', 'TERMINATED', 'WITHDRAWN'].includes(status)) return 'danger';
  return 'default';
};

const nextActionForStatus = (status: string): string => {
  switch (status) {
    case 'APPLIED':
      return 'Wait for employer or institution review.';
    case 'SHORTLISTED':
      return 'Watch for interview or offer instructions.';
    case 'ACCEPTED':
      return 'Prepare for attachment start and supervisor assignment.';
    case 'ACTIVE':
      return 'Keep your logbook and evidence current.';
    case 'COMPLETED':
      return 'Wait for final certification.';
    case 'CERTIFIED':
      return 'Download your verified artifacts.';
    case 'REJECTED':
      return 'Review other matched opportunities.';
    default:
      return 'Open details for the latest workflow state.';
  }
};

const StudentApplications: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [applications, setApplications] = useState<InternshipApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadApplications = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await internshipService.getApplications();
        if (mounted) setApplications(Array.isArray(data) ? data : []);
      } catch {
        if (mounted) setError('We could not load your applications. Please refresh the page.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadApplications();
    return () => {
      mounted = false;
    };
  }, []);

  const metrics = useMemo(() => {
    const active = applications.filter((app) => app.status === 'ACTIVE').length;
    const pending = applications.filter((app) => ['APPLIED', 'SHORTLISTED', 'ACCEPTED'].includes(app.status)).length;
    const completed = applications.filter((app) => ['COMPLETED', 'CERTIFIED'].includes(app.status)).length;
    return { total: applications.length, pending, active, completed };
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return applications.filter((app) => {
      const matchesStatus = activeFilter === 'ALL' || app.status === activeFilter;
      const matchesSearch =
        !term ||
        app.title?.toLowerCase().includes(term) ||
        app.department?.toLowerCase().includes(term) ||
        app.employer_details?.name?.toLowerCase().includes(term) ||
        app.location?.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [activeFilter, applications, searchTerm]);

  const applicationPagination = useStudentPagination({
    items: filteredApplications,
    resetKeys: [activeFilter, searchTerm],
  });

  return (
    <StudentLayout>
      <StudentWorkspaceShell darkMode={isDarkMode}>
        <StudentWorkspacePage>
          <StudentPageHeader
            eyebrow={<><SparklineIcon /> Application workspace</>}
            title="Applications"
            subtitle="Track every placement application from first submission to active attachment, completion, and certification."
            actions={
              <StudentButton as={Link} to="/opportunities" variant="primary">
                <Search size={16} />
                Browse internships
              </StudentButton>
            }
          />

          <StudentGrid>
            <StudentColumn span={3}>
              <StudentMetric label="Total" value={metrics.total} note="Submitted applications" icon={<FileText size={18} />} />
            </StudentColumn>
            <StudentColumn span={3}>
              <StudentMetric label="In review" value={metrics.pending} note="Pending decisions" icon={<Clock size={18} />} />
            </StudentColumn>
            <StudentColumn span={3}>
              <StudentMetric label="Active" value={metrics.active} note="Current placements" icon={<Briefcase size={18} />} />
            </StudentColumn>
            <StudentColumn span={3}>
              <StudentMetric label="Completed" value={metrics.completed} note="Finished or certified" icon={<CheckCircle size={18} />} />
            </StudentColumn>
          </StudentGrid>

          <div style={{ height: 16 }} />

          <StudentToolbar>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {filters.map((filter) => (
                <StudentButton
                  key={filter.key}
                  as="button"
                  type="button"
                  variant={activeFilter === filter.key ? 'primary' : 'ghost'}
                  onClick={() => setActiveFilter(filter.key)}
                >
                  {filter.label}
                </StudentButton>
              ))}
            </div>
            <div style={{ minWidth: 260, maxWidth: 420, width: '100%' }}>
              <input
                className="sw-input"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search role, employer, location..."
                aria-label="Search applications"
              />
            </div>
          </StudentToolbar>

          <div style={{ height: 16 }} />

          {isLoading ? (
            <StudentEmptyState icon={<Clock size={20} />} title="Loading applications">
              Fetching your placement application history.
            </StudentEmptyState>
          ) : error ? (
            <StudentEmptyState icon={<XCircle size={20} />} title="Applications unavailable">
              {error}
            </StudentEmptyState>
          ) : filteredApplications.length === 0 ? (
            <StudentEmptyState icon={<Send size={20} />} title="No applications found">
              {applications.length === 0
                ? 'Apply to an opportunity and it will appear here.'
                : 'Adjust your filter or search to see more applications.'}
            </StudentEmptyState>
          ) : (
            <>
            <StudentGrid>
              {applicationPagination.pageItems.map((application) => (
                <StudentColumn span={12} key={application.id}>
                  <StudentCard
                    label={application.employer_details?.name || 'Placement application'}
                    title={application.title || 'Untitled role'}
                    subtitle={nextActionForStatus(application.status)}
                    actions={<StudentStatus tone={toneForStatus(application.status)}>{application.status}</StudentStatus>}
                  >
                    <div className="sap-row">
                      <div className="sap-row-meta">
                        <span><Briefcase size={14} /> {application.department || 'No department specified'}</span>
                        <span><MapPin size={14} /> {application.location || 'Location not specified'}</span>
                        <span><CalendarDays size={14} /> Applied {dateFormatter.shortDate(application.created_at)}</span>
                      </div>
                      <StudentButton as={Link} to={`/dashboard/student/applications/${application.id}`} variant="default">
                        View details
                      </StudentButton>
                    </div>
                  </StudentCard>
                </StudentColumn>
              ))}
            </StudentGrid>
            <StudentPagination
              page={applicationPagination.page}
              pageSize={applicationPagination.pageSize}
              totalItems={applicationPagination.totalItems}
              totalPages={applicationPagination.totalPages}
              startItem={applicationPagination.startItem}
              endItem={applicationPagination.endItem}
              onPageChange={applicationPagination.setPage}
              onPageSizeChange={applicationPagination.setPageSize}
            />
            </>
          )}
        </StudentWorkspacePage>
      </StudentWorkspaceShell>
    </StudentLayout>
  );
};

function SparklineIcon() {
  return <span style={{ width: 8, height: 8, borderRadius: 999, background: 'currentColor', display: 'inline-block' }} />;
}

export default StudentApplications;
