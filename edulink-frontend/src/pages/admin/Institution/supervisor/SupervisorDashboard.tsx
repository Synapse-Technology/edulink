import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuthStore } from '../../../../stores/authStore';
import { institutionService, type SupervisorProfile } from '../../../../services/institution/institutionService';
import { internshipService, type InternshipApplication, type InternshipEvidence, type Incident } from '../../../../services/internship/internshipService';
import SupervisorLayout from '../../../../components/admin/institution/supervisor/SupervisorLayout';
import SupervisorDashboardSkeleton from '../../../../components/admin/skeletons/SupervisorDashboardSkeleton';
import { showToast } from '../../../../utils/toast';
import { sanitizeAdminError } from '../../../../utils/adminErrorSanitizer';
import styled, { keyframes } from 'styled-components';

export interface SupervisorDashboardContext {
  user: any;
  profile: SupervisorProfile | null;
  internships: InternshipApplication[];
  recentEvidence: InternshipEvidence[];
  incidents: Incident[];
  assignedStudentsCount: number;
  pendingLogbooksCount: number;
  reviewedLogbooksCount: number;
  hoursLoggedCount: number;
}

/* ─── Animations ─────────────────────────────────────────────────── */
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// shimmer animation removed (unused)

/* ─── Design tokens ───────────────────────────────────────────────── */
const tokens = {
  navy:    '#0F2A4A',
  navyMid: '#1A3F6F',
  slate:   '#4A5568',
  steel:   '#718096',
  mist:    '#EEF2F7',
  fog:     '#F7F9FC',
  white:   '#FFFFFF',
  accent:  '#2563EB',
  accentL: '#DBEAFE',
  success: '#059669',
  successL:'#D1FAE5',
  warning: '#D97706',
  warningL:'#FEF3C7',
  danger:  '#DC2626',
  dangerL: '#FEE2E2',
  border:  'rgba(15, 42, 74, 0.10)',
  radius:  '12px',
  radiusSm:'8px',
} as const;

/* ─── Styled components ───────────────────────────────────────────── */
const DashboardRoot = styled.div`
  min-height: 100vh;
  background: ${tokens.fog};
  font-family: 'DM Sans', 'Segoe UI', system-ui, sans-serif;
  color: ${tokens.navy};
  animation: ${fadeUp} 0.35s ease both;
`;

const ErrorBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 2rem auto;
  max-width: 600px;
  padding: 1rem 1.25rem;
  background: ${tokens.dangerL};
  border: 1px solid rgba(220, 38, 38, 0.2);
  border-left: 4px solid ${tokens.danger};
  border-radius: ${tokens.radius};
  font-size: 14px;
  color: #7f1d1d;
  animation: ${fadeUp} 0.3s ease both;

  svg {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    color: ${tokens.danger};
  }

  strong {
    font-weight: 600;
    display: block;
    margin-bottom: 2px;
  }
`;

/* ─── Component ───────────────────────────────────────────────────── */
const SupervisorDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [profile, setProfile]             = useState<SupervisorProfile | null>(null);
  const [internships, setInternships]     = useState<InternshipApplication[]>([]);
  const [recentEvidence, setRecentEvidence] = useState<InternshipEvidence[]>([]);
  const [incidents, setIncidents]         = useState<Incident[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [profileResponse, applicationsResponse, evidenceResponse, incidentsResponse] =
          await Promise.all([
            institutionService.getSupervisorProfile(),
            internshipService.getApplications(),
            internshipService.getPendingEvidence(),
            internshipService.getIncidents(),
          ]);

        const toArray = (r: any) => Array.isArray(r) ? r : r?.results ?? [];

        const applicationsData = toArray(applicationsResponse);
        const evidenceData     = toArray(evidenceResponse);
        const incidentsData    = toArray(incidentsResponse);

        const assignedPlacements = applicationsData.filter((a: InternshipApplication) =>
          ['ACCEPTED', 'ACTIVE', 'COMPLETED', 'CERTIFIED'].includes(a.status)
        );

        setProfile(profileResponse);
        setInternships(assignedPlacements);
        setRecentEvidence(evidenceData.filter((e: InternshipEvidence) => e.evidence_type === 'LOGBOOK'));
        setIncidents(incidentsData);
      } catch (err: any) {
        const sanitized = sanitizeAdminError(err);
        console.error('Dashboard error:', sanitized.title);
        showToast.error(sanitized.userMessage);
        setError('Unable to load dashboard data. Please refresh or contact support.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  /* Loading state */
  if (loading) {
    return (
      <SupervisorLayout>
        <SupervisorDashboardSkeleton />
      </SupervisorLayout>
    );
  }

  /* Error state — inline, branded */
  if (error) {
    return (
      <DashboardRoot>
        <ErrorBanner role="alert">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <strong>Something went wrong</strong>
            {error}
          </div>
        </ErrorBanner>
      </DashboardRoot>
    );
  }

  /* Context payload */
  const context: SupervisorDashboardContext = {
    user,
    profile,
    internships,
    recentEvidence,
    incidents,
    assignedStudentsCount: internships.length,
    pendingLogbooksCount:  recentEvidence.length,
    reviewedLogbooksCount: 0,
    hoursLoggedCount:      0,
  };

  return (
    <DashboardRoot>
      <SupervisorLayout>
        <Outlet context={context} />
      </SupervisorLayout>
    </DashboardRoot>
  );
};

export default SupervisorDashboard;