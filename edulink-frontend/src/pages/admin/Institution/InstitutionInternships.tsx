import React, { useState, useEffect } from 'react';
import {
  Button,
  Form,
  Row,
  Col,
  Alert,
} from 'react-bootstrap';
import {
  Search,
  Plus,
  BookOpen,
  MoreHorizontal,
  Briefcase,
  ClipboardList,
  Calendar,
  Building2,
  MapPin,
} from 'lucide-react';

import { internshipService } from '../../../services/internship/internshipService';
import { institutionService } from '../../../services/institution/institutionService';
import { sanitizeAdminError } from '../../../utils/adminErrorSanitizer';

import type { InternshipOpportunity } from '../../../services/internship/internshipService';

import InstitutionTableSkeleton from '../../../components/admin/skeletons/InstitutionTableSkeleton';
import CreateInternshipModal from '../../../components/dashboard/institution/CreateInternshipModal';
import { InstitutionWorkspacePage } from '../../../components/institution/workspace';

const InstitutionInternships: React.FC = () => {
  const [internships, setInternships] = useState<InternshipOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [institutionId, setInstitutionId] = useState<string | undefined>(undefined);

  const isInstitutionHosted = (
    opportunity: InternshipOpportunity,
    currentInstitutionId = institutionId
  ) => (
    !opportunity.employer_id &&
    opportunity.origin !== 'EXTERNAL_STUDENT_DECLARED' &&
    (!currentInstitutionId || opportunity.institution_id === currentInstitutionId)
  );

  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        const inst = await institutionService.getProfile();
        if (inst) {
          setInstitutionId(inst.id);
        }
        await fetchInternships(inst?.id);
      } catch (err) {
        console.error('Failed to fetch institution context', err);
        await fetchInternships();
      }
    };

    fetchWorkspace();
  }, []);

  const fetchInternships = async (currentInstitutionId = institutionId) => {
    try {
      setLoading(true);

      const response = await internshipService.getInternships();

      setInternships(
        (response.results || []).filter(opportunity =>
          isInstitutionHosted(opportunity, currentInstitutionId)
        )
      );
    } catch (err: any) {
      const sanitized = sanitizeAdminError(err);
      setError(sanitized.message || sanitized.userMessage || 'Failed to load internships');
    } finally {
      setLoading(false);
    }
  };

  const filteredInternships = internships.filter(i =>
    i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openCount = internships.filter(i => i.status === 'OPEN').length;

  const inactiveCount = internships.filter(
    i => i.status === 'CLOSED' || i.status === 'DRAFT'
  ).length;

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'internship-status-open';
      case 'DRAFT':
        return 'internship-status-draft';
      case 'CLOSED':
        return 'internship-status-closed';
      default:
        return 'internship-status-default';
    }
  };

  if (loading) {
    return (
      <InstitutionTableSkeleton
        hasSummaryCards={true}
        hasInternalTableFilter={true}
      />
    );
  }

  if (error) {
    return (
      <Alert variant="danger" className="rounded-4">
        {error}
      </Alert>
    );
  }

  return (
    <InstitutionWorkspacePage className="institution-internships-page">
      <style>{`
        .internships-hero {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 30px;
          padding: 30px;
          margin-bottom: 24px;
        }

        .internships-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          background: #f4f6f8;
          border: 1px solid #e6e9ee;
          font-size: 0.74rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 18px;
        }

        .internships-title {
          font-size: clamp(1.8rem, 3vw, 2.45rem);
          font-weight: 760;
          letter-spacing: -0.06em;
          line-height: 1.05;
          color: #111827;
          margin-bottom: 12px;
        }

        .internships-subtitle {
          color: #64748b;
          max-width: 740px;
          line-height: 1.75;
          margin-bottom: 0;
        }

        .internships-primary-btn {
          min-height: 44px;
          border-radius: 14px !important;
          background: #111827 !important;
          border: none !important;
          color: #ffffff !important;
          font-weight: 650 !important;
          padding-inline: 18px !important;
          box-shadow: none !important;
        }

        .internships-stat-card {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 24px;
          padding: 24px;
          height: 100%;
        }

        .internships-stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          background: #f6f7f9;
          border: 1px solid #edf0f4;
          color: #111827;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
        }

        .internships-stat-label {
          font-size: 0.74rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #64748b;
          margin-bottom: 8px;
        }

        .internships-stat-value {
          font-size: 1.9rem;
          font-weight: 760;
          letter-spacing: -0.05em;
          color: #111827;
          line-height: 1;
          margin-bottom: 6px;
        }

        .internships-stat-sub {
          color: #64748b;
          font-size: 0.86rem;
          margin-bottom: 0;
        }

        .internships-card {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 26px;
          overflow: hidden;
        }

        .internships-card-header {
          padding: 22px 24px;
          border-bottom: 1px solid #eef2f6;
          background: #ffffff;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
        }

        .internships-card-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1.05rem;
          font-weight: 730;
          letter-spacing: -0.03em;
          color: #111827;
          margin-bottom: 4px;
        }

        .internships-card-subtitle {
          color: #64748b;
          font-size: 0.88rem;
          margin-bottom: 0;
        }

        .internships-input {
          min-height: 46px;
          border-radius: 14px !important;
          border: 1px solid #dbe2ea !important;
          box-shadow: none !important;
        }

        .internships-input:focus {
          border-color: #111827 !important;
        }

        .internships-table-wrap {
          width: 100%;
          overflow-x: auto;
          overflow-y: auto;
          max-height: 560px;
        }

        .internships-table {
          width: 100%;
          min-width: 1000px;
          margin-bottom: 0;
          table-layout: fixed;
        }

        .internships-table thead th {
          position: sticky;
          top: 0;
          z-index: 3;
          border: none !important;
          background: #f8fafc;
          color: #64748b;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 700;
          padding: 16px 18px;
          white-space: nowrap;
        }

        .internships-table tbody td {
          border-top: 1px solid #f1f5f9;
          padding: 18px;
          vertical-align: middle;
          background: #ffffff;
        }

        .internships-table tbody tr:hover td {
          background: #fbfcfd;
        }

        .title-col {
          width: 320px;
        }

        .department-col {
          width: 220px;
        }

        .status-col {
          width: 140px;
        }

        .capacity-col {
          width: 120px;
        }

        .dates-col {
          width: 230px;
        }

        .actions-col {
          width: 100px;
        }

        .internship-title {
          font-weight: 720;
          color: #111827;
          line-height: 1.3;
        }

        .internship-muted {
          color: #64748b;
          font-size: 0.78rem;
          margin-top: 4px;
        }

        .internship-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          border-radius: 999px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #475569;
          font-size: 0.78rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .internship-status-open {
          background: #f0fdf4;
          border-color: #dcfce7;
          color: #166534;
        }

        .internship-status-draft {
          background: #f8fafc;
          border-color: #e2e8f0;
          color: #64748b;
        }

        .internship-status-closed {
          background: #fef2f2;
          border-color: #fee2e2;
          color: #991b1b;
        }

        .internship-status-default {
          background: #eff6ff;
          border-color: #dbeafe;
          color: #1d4ed8;
        }

        .internships-icon-btn {
          height: 36px;
          min-width: 36px;
          border-radius: 12px !important;
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          color: #475569 !important;
          display: inline-flex !important;
          align-items: center;
          justify-content: center;
          box-shadow: none !important;
        }

        .internships-empty-state {
          background: #ffffff;
          border: 1px dashed #dbe2ea;
          border-radius: 22px;
          padding: 52px 24px;
          text-align: center;
        }

        @media (max-width: 768px) {
          .internships-hero {
            padding: 22px;
          }

          .internships-card-header {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="internships-hero">
        <div className="d-flex flex-column flex-xl-row justify-content-between gap-4">
          <div>
            <div className="internships-eyebrow">
              <Briefcase size={15} />
              Institution-Hosted Internships
            </div>

            <h1 className="internships-title">
              Manage opportunities created by your institution.
            </h1>

            <p className="internships-subtitle">
              Publish, monitor, and manage internships offered directly through
              your institution for student placement and attachment workflows.
            </p>
          </div>

          <Button
            className="internships-primary-btn d-flex align-items-center gap-2 align-self-xl-start"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={17} />
            Post Internship
          </Button>
        </div>
      </div>

      <CreateInternshipModal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        onSuccess={fetchInternships}
        institution_id={institutionId}
      />

      <Row className="g-4 mb-4">
        <Col md={4}>
          <div className="internships-stat-card">
            <div className="internships-stat-icon">
              <Briefcase size={22} />
            </div>

            <div className="internships-stat-label">
              Total Opportunities
            </div>

            <div className="internships-stat-value">
              {internships.length}
            </div>

            <p className="internships-stat-sub">
              Opportunities hosted by institution
            </p>
          </div>
        </Col>

        <Col md={4}>
          <div className="internships-stat-card">
            <div className="internships-stat-icon">
              <BookOpen size={22} />
            </div>

            <div className="internships-stat-label">
              Open Positions
            </div>

            <div className="internships-stat-value">
              {openCount}
            </div>

            <p className="internships-stat-sub">
              Currently visible to students
            </p>
          </div>
        </Col>

        <Col md={4}>
          <div className="internships-stat-card">
            <div className="internships-stat-icon">
              <ClipboardList size={22} />
            </div>

            <div className="internships-stat-label">
              Draft / Closed
            </div>

            <div className="internships-stat-value">
              {inactiveCount}
            </div>

            <p className="internships-stat-sub">
              Not actively accepting applications
            </p>
          </div>
        </Col>
      </Row>

      <div className="internships-card">
        <div className="internships-card-header">
          <div>
            <div className="internships-card-title">
              <Building2 size={18} />
              Opportunity Directory
            </div>

            <p className="internships-card-subtitle">
              Review institution-hosted opportunities and their publishing state.
            </p>
          </div>
        </div>

        <div className="p-4 border-bottom">
          <Row className="g-3">
            <Col lg={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold text-muted">
                  Search Opportunities
                </Form.Label>

                <div className="position-relative">
                  <Search
                    size={16}
                    className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"
                  />

                  <Form.Control
                    placeholder="Search by title or department"
                    className="internships-input ps-5"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </Form.Group>
            </Col>
          </Row>
        </div>

        <div className="internships-table-wrap">
          <table className="table internships-table align-middle">
            <thead>
              <tr>
                <th className="title-col">Title</th>
                <th className="department-col">Department</th>
                <th className="status-col">Status</th>
                <th className="capacity-col">Capacity</th>
                <th className="dates-col">Dates</th>
                <th className="actions-col text-end">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredInternships.length > 0 ? (
                filteredInternships.map(internship => (
                  <tr key={internship.id}>
                    <td className="title-col">
                      <div className="internship-title">
                        {internship.title}
                      </div>

                      <div className="internship-muted d-flex align-items-center gap-1">
                        <MapPin size={13} />
                        {internship.location_type || 'Location not specified'}
                      </div>
                    </td>

                    <td className="department-col">
                      <span className="internship-pill">
                        {internship.department || '-'}
                      </span>
                    </td>

                    <td className="status-col">
                      <span className={`internship-pill ${getStatusClass(internship.status)}`}>
                        {internship.status}
                      </span>
                    </td>

                    <td className="capacity-col">
                      <span className="internship-pill">
                        {internship.capacity}
                      </span>
                    </td>

                    <td className="dates-col">
                      <span className="internship-pill">
                        <Calendar size={13} />
                        {internship.start_date
                          ? new Date(internship.start_date).toLocaleDateString()
                          : 'TBD'}
                        {' - '}
                        {internship.end_date
                          ? new Date(internship.end_date).toLocaleDateString()
                          : 'TBD'}
                      </span>
                    </td>

                    <td className="actions-col text-end">
                      <Button className="internships-icon-btn">
                        <MoreHorizontal size={18} />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <div className="internships-empty-state">
                      <Briefcase size={48} className="text-muted mb-3" />

                      <h5 className="fw-semibold mb-2">
                        No internships found
                      </h5>

                      <p className="text-muted mb-4">
                        No opportunities match your current search.
                      </p>

                      <Button
                        className="internships-primary-btn"
                        onClick={() => setShowCreateModal(true)}
                      >
                        Post Internship
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </InstitutionWorkspacePage>
  );
};

export default InstitutionInternships;
