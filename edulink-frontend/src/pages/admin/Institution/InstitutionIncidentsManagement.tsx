import React, { useState, useEffect } from 'react';
import {
  Button,
  Form,
  Row,
  Col,
} from 'react-bootstrap';
import {
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  ShieldAlert,
  ClipboardList,
  User,
  Calendar,
  Filter,
} from 'lucide-react';
import { internshipService } from '../../../services/internship/internshipService';
import type { Incident } from '../../../services/internship/internshipService';
import { toast } from 'react-hot-toast';
import IncidentDetailsModal from '../../../components/incident/IncidentDetailsModal';
import InstitutionTableSkeleton from '../../../components/admin/skeletons/InstitutionTableSkeleton';
import { InstitutionWorkspacePage } from '../../../components/institution/workspace';

const InstitutionIncidentsManagement: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const data = await internshipService.getIncidents();
      setIncidents(data);
    } catch (err) {
      console.error('Failed to fetch incidents', err);
      toast.error('Failed to load incidents');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (incident: Incident) => {
    setSelectedIncident(incident);
    setShowDetailsModal(true);
  };

  const handleIncidentUpdate = (updated: Incident) => {
    setIncidents(prev =>
      prev.map(inc => (inc.id === updated.id ? updated : inc))
    );
    setSelectedIncident(updated);
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'incident-status-open';
      case 'ASSIGNED':
        return 'incident-status-assigned';
      case 'INVESTIGATING':
        return 'incident-status-investigating';
      case 'PENDING_APPROVAL':
        return 'incident-status-pending';
      case 'RESOLVED':
        return 'incident-status-resolved';
      case 'DISMISSED':
        return 'incident-status-dismissed';
      default:
        return 'incident-status-default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RESOLVED':
      case 'DISMISSED':
        return <CheckCircle size={14} />;
      case 'OPEN':
        return <AlertTriangle size={14} />;
      default:
        return <Clock size={14} />;
    }
  };

  const filteredIncidents = incidents.filter(incident => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      incident.title.toLowerCase().includes(search) ||
      incident.description.toLowerCase().includes(search) ||
      (incident.student_info?.name || '').toLowerCase().includes(search) ||
      (incident.student_info?.email || '').toLowerCase().includes(search) ||
      (incident.internship_title || '').toLowerCase().includes(search);

    const matchesStatus =
      statusFilter === 'ALL' || incident.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: incidents.length,
    open: incidents.filter(i => i.status === 'OPEN').length,
    investigating: incidents.filter(i => i.status === 'INVESTIGATING').length,
    closed: incidents.filter(
      i => i.status === 'RESOLVED' || i.status === 'DISMISSED'
    ).length,
  };

  if (loading) {
    return <InstitutionTableSkeleton tableColumns={6} />;
  }

  return (
    <InstitutionWorkspacePage className="institution-incidents-page">
      <style>{`
        .incidents-hero {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 30px;
          padding: 30px;
          margin-bottom: 24px;
        }

        .incidents-eyebrow {
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

        .incidents-title {
          font-size: clamp(1.8rem, 3vw, 2.45rem);
          font-weight: 760;
          letter-spacing: -0.06em;
          line-height: 1.05;
          color: #111827;
          margin-bottom: 12px;
        }

        .incidents-subtitle {
          color: #64748b;
          max-width: 780px;
          line-height: 1.75;
          margin-bottom: 0;
        }

        .incident-stat-card {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 24px;
          padding: 24px;
          height: 100%;
        }

        .incident-stat-icon {
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

        .incident-stat-label {
          font-size: 0.74rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #64748b;
          margin-bottom: 8px;
        }

        .incident-stat-value {
          font-size: 1.9rem;
          font-weight: 760;
          letter-spacing: -0.05em;
          color: #111827;
          line-height: 1;
          margin-bottom: 6px;
        }

        .incident-stat-sub {
          color: #64748b;
          font-size: 0.86rem;
          margin-bottom: 0;
        }

        .incidents-card {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 26px;
          overflow: hidden;
        }

        .incidents-card-header {
          padding: 22px 24px;
          border-bottom: 1px solid #eef2f6;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
        }

        .incidents-card-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1.05rem;
          font-weight: 730;
          letter-spacing: -0.03em;
          color: #111827;
          margin-bottom: 4px;
        }

        .incidents-card-subtitle {
          color: #64748b;
          font-size: 0.88rem;
          margin-bottom: 0;
        }

        .incidents-input,
        .incidents-select {
          min-height: 46px;
          border-radius: 14px !important;
          border: 1px solid #dbe2ea !important;
          box-shadow: none !important;
        }

        .incidents-input:focus,
        .incidents-select:focus {
          border-color: #111827 !important;
        }

        .incidents-table-wrap {
          width: 100%;
          overflow-x: auto;
          overflow-y: auto;
          max-height: 620px;
        }

        .incidents-table {
          width: 100%;
          min-width: 1180px;
          table-layout: fixed;
          margin-bottom: 0;
        }

        .incidents-table thead th {
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

        .incidents-table tbody td {
          border-top: 1px solid #f1f5f9;
          padding: 18px;
          vertical-align: middle;
          background: #ffffff;
        }

        .incidents-table tbody tr:hover td {
          background: #fbfcfd;
        }

        .status-col { width: 190px; }
        .incident-col { width: 330px; }
        .student-col { width: 260px; }
        .internship-col { width: 230px; }
        .reported-col { width: 150px; }
        .actions-col { width: 170px; }

        .incident-title {
          font-weight: 720;
          color: #111827;
          line-height: 1.3;
        }

        .incident-description {
          color: #64748b;
          font-size: 0.8rem;
          margin-top: 6px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 280px;
        }

        .incident-primary-text {
          font-weight: 700;
          color: #111827;
          line-height: 1.3;
        }

        .incident-muted {
          color: #64748b;
          font-size: 0.8rem;
          margin-top: 5px;
        }

        .incident-pill {
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

        .incident-status-open {
          background: #fef2f2;
          border-color: #fee2e2;
          color: #991b1b;
        }

        .incident-status-assigned {
          background: #fffbeb;
          border-color: #fde68a;
          color: #92400e;
        }

        .incident-status-investigating {
          background: #eff6ff;
          border-color: #dbeafe;
          color: #1d4ed8;
        }

        .incident-status-pending {
          background: #eef2ff;
          border-color: #e0e7ff;
          color: #3730a3;
        }

        .incident-status-resolved {
          background: #f0fdf4;
          border-color: #dcfce7;
          color: #166534;
        }

        .incident-status-dismissed {
          background: #f8fafc;
          border-color: #e2e8f0;
          color: #64748b;
        }

        .incident-status-default {
          background: #f8fafc;
          border-color: #e2e8f0;
          color: #475569;
        }

        .incidents-primary-btn {
          min-height: 42px;
          border-radius: 14px !important;
          background: #111827 !important;
          border: 1px solid #111827 !important;
          color: #ffffff !important;
          font-weight: 700 !important;
          padding-inline: 18px !important;
          box-shadow: none !important;
        }

        .incidents-soft-btn {
          min-height: 42px;
          border-radius: 14px !important;
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          color: #111827 !important;
          font-weight: 700 !important;
          padding-inline: 18px !important;
          box-shadow: none !important;
        }

        .incidents-empty-state {
          background: #ffffff;
          border: 1px dashed #dbe2ea;
          border-radius: 22px;
          padding: 52px 24px;
          text-align: center;
        }

        @media (max-width: 768px) {
          .incidents-hero {
            padding: 22px;
          }

          .incidents-card-header {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="incidents-hero">
        <div>
          <div className="incidents-eyebrow">
            <ShieldAlert size={15} />
            Incident Management
          </div>

          <h1 className="incidents-title">
            Monitor, triage, and resolve placement incidents.
          </h1>

          <p className="incidents-subtitle">
            Review student-reported issues, track investigation status, and keep
            institution placement records accountable and audit-ready.
          </p>
        </div>
      </div>

      <Row className="g-4 mb-4">
        <Col md={3}>
          <div className="incident-stat-card">
            <div className="incident-stat-icon">
              <ClipboardList size={22} />
            </div>
            <div className="incident-stat-label">Total Incidents</div>
            <div className="incident-stat-value">{stats.total}</div>
            <p className="incident-stat-sub">All reported cases</p>
          </div>
        </Col>

        <Col md={3}>
          <div className="incident-stat-card">
            <div className="incident-stat-icon">
              <AlertTriangle size={22} />
            </div>
            <div className="incident-stat-label">Open</div>
            <div className="incident-stat-value">{stats.open}</div>
            <p className="incident-stat-sub">Awaiting action</p>
          </div>
        </Col>

        <Col md={3}>
          <div className="incident-stat-card">
            <div className="incident-stat-icon">
              <Clock size={22} />
            </div>
            <div className="incident-stat-label">Investigating</div>
            <div className="incident-stat-value">{stats.investigating}</div>
            <p className="incident-stat-sub">Under review</p>
          </div>
        </Col>

        <Col md={3}>
          <div className="incident-stat-card">
            <div className="incident-stat-icon">
              <CheckCircle size={22} />
            </div>
            <div className="incident-stat-label">Closed</div>
            <div className="incident-stat-value">{stats.closed}</div>
            <p className="incident-stat-sub">Resolved or dismissed</p>
          </div>
        </Col>
      </Row>

      <div className="incidents-card">
        <div className="incidents-card-header">
          <div>
            <div className="incidents-card-title">
              <AlertTriangle size={18} />
              Incident Queue
            </div>

            <p className="incidents-card-subtitle">
              Search, filter, and open incident records for investigation.
            </p>
          </div>
        </div>

        <div className="p-4 border-bottom">
          <Row className="g-3">
            <Col lg={8}>
              <Form.Group>
                <Form.Label className="small fw-semibold text-muted">
                  Search Incidents
                </Form.Label>

                <div className="position-relative">
                  <Search
                    size={16}
                    className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"
                  />

                  <Form.Control
                    placeholder="Search by title, description, student, or internship"
                    value={searchTerm}
                    onChange={event => setSearchTerm(event.target.value)}
                    className="incidents-input ps-5"
                  />
                </div>
              </Form.Group>
            </Col>

            <Col lg={4}>
              <Form.Group>
                <Form.Label className="small fw-semibold text-muted">
                  Status Filter
                </Form.Label>

                <div className="position-relative">
                  <Filter
                    size={16}
                    className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"
                  />

                  <Form.Select
                    value={statusFilter}
                    onChange={event => setStatusFilter(event.target.value)}
                    className="incidents-select ps-5"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="OPEN">Open</option>
                    <option value="ASSIGNED">Assigned</option>
                    <option value="INVESTIGATING">Investigating</option>
                    <option value="PENDING_APPROVAL">Pending Approval</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="DISMISSED">Dismissed</option>
                  </Form.Select>
                </div>
              </Form.Group>
            </Col>
          </Row>
        </div>

        <div className="incidents-table-wrap">
          <table className="table incidents-table align-middle">
            <thead>
              <tr>
                <th className="status-col">Status</th>
                <th className="incident-col">Incident</th>
                <th className="student-col">Student</th>
                <th className="internship-col">Internship</th>
                <th className="reported-col">Reported</th>
                <th className="actions-col text-end">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredIncidents.length > 0 ? (
                filteredIncidents.map(incident => (
                  <tr key={incident.id}>
                    <td className="status-col">
                      <span className={`incident-pill ${getStatusClass(incident.status)}`}>
                        {getStatusIcon(incident.status)}
                        {incident.status.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="incident-col">
                      <div className="incident-title">
                        {incident.title}
                      </div>
                      <div className="incident-description">
                        {incident.description}
                      </div>
                    </td>

                    <td className="student-col">
                      <div className="incident-primary-text d-flex align-items-center gap-2">
                        <User size={14} className="text-muted" />
                        {incident.student_info?.name || 'Unknown'}
                      </div>

                      <div className="incident-muted">
                        {incident.student_info?.email || 'No email'}
                      </div>
                    </td>

                    <td className="internship-col">
                      <span className="incident-pill">
                        <BriefcaseIcon />
                        {incident.internship_title || 'N/A'}
                      </span>
                    </td>

                    <td className="reported-col">
                      <span className="incident-pill">
                        <Calendar size={13} />
                        {new Date(incident.created_at).toLocaleDateString()}
                      </span>
                    </td>

                    <td className="actions-col text-end">
                      <Button
                        className="incidents-soft-btn"
                        onClick={() => handleViewDetails(incident)}
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <div className="incidents-empty-state">
                      <CheckCircle size={48} className="text-muted mb-3" />
                      <h5 className="fw-semibold mb-2">No incidents found</h5>
                      <p className="text-muted mb-0">
                        {statusFilter !== 'ALL'
                          ? `No incidents with status "${statusFilter.replace('_', ' ')}".`
                          : 'No incidents have been reported yet.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedIncident && (
        <IncidentDetailsModal
          show={showDetailsModal}
          onHide={() => setShowDetailsModal(false)}
          incident={selectedIncident}
          onUpdate={handleIncidentUpdate}
          isAdmin={true}
        />
      )}
    </InstitutionWorkspacePage>
  );
};

const BriefcaseIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

export default InstitutionIncidentsManagement;
