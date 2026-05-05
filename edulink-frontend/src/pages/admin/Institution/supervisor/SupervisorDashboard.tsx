import React, { useEffect, useState } from 'react';
import { Alert } from 'react-bootstrap';
import { Outlet } from 'react-router-dom';
import { useAuthStore } from '../../../../stores/authStore';
import { institutionService, type SupervisorProfile } from '../../../../services/institution/institutionService';
import { internshipService, type InternshipApplication, type InternshipEvidence, type Incident } from '../../../../services/internship/internshipService';
import SupervisorLayout from '../../../../components/admin/institution/supervisor/SupervisorLayout';
import SupervisorDashboardSkeleton from '../../../../components/admin/skeletons/SupervisorDashboardSkeleton';
import { showToast } from '../../../../utils/toast';
import { sanitizeAdminError } from '../../../../utils/adminErrorSanitizer';

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

const SupervisorDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<SupervisorProfile | null>(null);
  const [internships, setInternships] = useState<InternshipApplication[]>([]);
  const [recentEvidence, setRecentEvidence] = useState<InternshipEvidence[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [
          profileResponse,
          applicationsResponse,
          evidenceResponse,
          incidentsResponse
        ] = await Promise.all([
          institutionService.getSupervisorProfile(),
          internshipService.getApplications(),
          internshipService.getPendingEvidence(),
          internshipService.getIncidents()
        ]);
        
        // Handle paginated responses
        const applicationsData = Array.isArray(applicationsResponse) ? applicationsResponse : (applicationsResponse as any)?.results || [];
        const evidenceData = Array.isArray(evidenceResponse) ? evidenceResponse : (evidenceResponse as any)?.results || [];
        const incidentsData = Array.isArray(incidentsResponse) ? incidentsResponse : (incidentsResponse as any)?.results || [];
        const assignedPlacements = applicationsData.filter((application: InternshipApplication) =>
          ['ACCEPTED', 'ACTIVE', 'COMPLETED', 'CERTIFIED'].includes(application.status)
        );
        
        setProfile(profileResponse);
        setInternships(assignedPlacements);
        setRecentEvidence(evidenceData.filter((e: InternshipEvidence) => e.evidence_type === 'LOGBOOK'));
        setIncidents(incidentsData);
      } catch (err: any) {
        const sanitized = sanitizeAdminError(err);
        console.error("Dashboard error:", sanitized.title);
        showToast.error(sanitized.userMessage);
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <SupervisorLayout>
        <SupervisorDashboardSkeleton />
      </SupervisorLayout>
    );
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  const context: SupervisorDashboardContext = {
    user,
    profile,
    internships,
    recentEvidence,
    incidents,
    assignedStudentsCount: internships.length,
    pendingLogbooksCount: recentEvidence.length,
    reviewedLogbooksCount: 0, // Placeholder
    hoursLoggedCount: 0 // Placeholder
  };

  return (
    <SupervisorLayout>
      <Outlet context={context} />
    </SupervisorLayout>
  );
};

export default SupervisorDashboard;
