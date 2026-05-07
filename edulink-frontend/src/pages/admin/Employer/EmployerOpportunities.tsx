import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  MapPin,
  Plus,
  Search,
  Users,
} from 'lucide-react';
import { FeedbackModal } from '../../../components/common';
import { useFeedbackModal } from '../../../hooks/useFeedbackModal';
import { EmployerLayout } from '../../../components/admin/employer';
import { employerService } from '../../../services/employer/employerService';
import { internshipService } from '../../../services/internship/internshipService';
import type { InternshipOpportunity } from '../../../services/internship/internshipService';
import CreateInternshipModal from '../../../components/dashboard/institution/CreateInternshipModal';
import InternshipDetailsModal from '../../../components/dashboard/InternshipDetailsModal';
import { sanitizeAdminError } from '../../../utils/adminErrorSanitizer';

const STYLES = `
  .eo-page {
    color: var(--el-ink);
  }

  .eo-hero {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 24px;
  }

  .eo-kicker {
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--el-accent);
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 10px;
  }

  .eo-title {
    font-size: clamp(2rem, 4vw, 3rem);
    line-height: 1;
    letter-spacing: -0.05em;
    font-weight: 850;
    color: var(--el-ink);
    margin: 0 0 10px;
  }

  .eo-title span {
    color: var(--el-muted);
    font-weight: 650;
  }

  .eo-subtitle {
    max-width: 680px;
    color: var(--el-muted);
    font-size: 14px;
    line-height: 1.7;
    margin: 0;
  }

  .eo-create-btn {
    border: none;
    border-radius: 16px;
    background: var(--el-accent);
    color: #fff;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 18px;
    font-size: 13px;
    font-weight: 800;
    box-shadow: 0 12px 28px rgba(26,92,255,0.22);
    white-space: nowrap;
  }

  .eo-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 20px;
  }

  .eo-stat {
    border: 1px solid var(--el-border);
    border-radius: 20px;
    background: var(--el-surface);
    padding: 16px;
  }

  .eo-stat-top {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  .eo-stat-label {
    color: var(--el-muted);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .eo-stat-value {
    color: var(--el-ink);
    font-size: 2rem;
    font-weight: 850;
    letter-spacing: -0.06em;
    line-height: 1;
  }

  .eo-stat-icon {
    width: 38px;
    height: 38px;
    border-radius: 14px;
    background: var(--el-accent-soft);
    color: var(--el-accent);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .eo-toolbar {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
  }

  .eo-search {
    flex: 1;
    position: relative;
  }

  .eo-search svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--el-muted);
  }

  .eo-search input,
  .eo-select {
    width: 100%;
    min-height: 48px;
    border-radius: 16px;
    border: 1px solid var(--el-border);
    background: var(--el-surface);
    color: var(--el-ink);
    padding: 0 16px;
    font-size: 13px;
    outline: none;
  }

  .eo-search input {
    padding-left: 42px;
  }

  .eo-search input:focus,
  .eo-select:focus {
    border-color: var(--el-accent);
    box-shadow: 0 0 0 3px var(--el-accent-soft);
  }

  .eo-select-wrap {
    min-width: 210px;
    position: relative;
  }

  .eo-select-wrap svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--el-muted);
    pointer-events: none;
  }

  .eo-select {
    padding-left: 42px;
  }

  .eo-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .eo-card {
    position: relative;
    overflow: hidden;
    border: 1px solid var(--el-border);
    border-radius: 24px;
    background:
      radial-gradient(circle at top right, var(--el-accent-soft), transparent 34%),
      var(--el-surface);
  }

  .eo-status-rail {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
  }

  .eo-status-rail.open { background: #12b76a; }
  .eo-status-rail.draft { background: #6b7280; }
  .eo-status-rail.closed { background: #ef4444; }

  .eo-card-main {
    padding: 22px;
  }

  .eo-card-top {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 18px;
  }

  .eo-role {
    display: flex;
    gap: 14px;
    min-width: 0;
  }

  .eo-role-icon {
    width: 52px;
    height: 52px;
    border-radius: 18px;
    background: var(--el-accent-soft);
    color: var(--el-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .eo-role h3 {
    margin: 0 0 7px;
    font-size: 1rem;
    font-weight: 820;
    color: var(--el-ink);
  }

  .eo-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    color: var(--el-muted);
    font-size: 12px;
  }

  .eo-meta span {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .eo-badge {
    border-radius: 999px;
    padding: 7px 12px;
    font-size: 11px;
    font-weight: 800;
    height: fit-content;
    white-space: nowrap;
  }

  .eo-badge.open {
    background: rgba(18,183,106,0.12);
    color: #12b76a;
  }

  .eo-badge.draft {
    background: rgba(107,114,128,0.12);
    color: #6b7280;
  }

  .eo-badge.closed {
    background: rgba(239,68,68,0.12);
    color: #ef4444;
  }

  .eo-skills {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 18px;
  }

  .eo-skills span {
    border-radius: 999px;
    padding: 7px 11px;
    background: var(--el-surface-2);
    border: 1px solid var(--el-border);
    font-size: 11px;
    font-weight: 700;
    color: var(--el-ink);
  }

  .eo-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .eo-publish-btn,
  .eo-view-btn {
    border-radius: 14px;
    padding: 10px 14px;
    font-size: 12px;
    font-weight: 800;
    transition: transform 0.12s ease, opacity 0.15s ease;
  }

  .eo-publish-btn {
    border: none;
    background: #12b76a;
    color: #fff;
  }

  .eo-publish-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .eo-view-btn {
    border: 1px solid var(--el-border);
    background: var(--el-surface-2);
    color: var(--el-ink);
  }

  .eo-publish-btn:hover,
  .eo-view-btn:hover {
    transform: translateY(-1px);
  }

  .eo-empty {
    border: 1px solid var(--el-border);
    border-radius: 24px;
    background: var(--el-surface);
    padding: 56px 24px;
    text-align: center;
  }

  .eo-empty-icon {
    width: 72px;
    height: 72px;
    border-radius: 24px;
    background: var(--el-surface-2);
    color: var(--el-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 18px;
  }

  .eo-empty h3 {
    color: var(--el-ink);
    font-size: 1.2rem;
    font-weight: 820;
    margin: 0 0 8px;
  }

  .eo-empty p {
    color: var(--el-muted);
    font-size: 13px;
    line-height: 1.6;
    max-width: 420px;
    margin: 0 auto 20px;
  }

  .eo-skeleton-card {
    border: 1px solid var(--el-border);
    border-radius: 24px;
    background: var(--el-surface);
    padding: 22px;
  }

  .eo-skeleton {
    display: block;
    border-radius: 10px;
    background: linear-gradient(
      90deg,
      var(--el-surface-2) 25%,
      var(--el-border) 50%,
      var(--el-surface-2) 75%
    );
    background-size: 220% 100%;
    animation: eo-loading 1.4s infinite ease;
  }

  .eo-skeleton-row {
    display: flex;
    gap: 14px;
  }

  .eo-skeleton-icon {
    width: 52px;
    height: 52px;
    border-radius: 18px;
  }

  .eo-skeleton-title {
    width: 260px;
    height: 22px;
    margin-bottom: 12px;
  }

  .eo-skeleton-line {
    width: 420px;
    max-width: 100%;
    height: 13px;
    margin-bottom: 12px;
  }

  .eo-skeleton-pill {
    width: 80px;
    height: 28px;
    border-radius: 999px;
  }

  @keyframes eo-loading {
    0% { background-position: 220% 0; }
    100% { background-position: -220% 0; }
  }

  @media (max-width: 980px) {
    .eo-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 768px) {
    .eo-hero,
    .eo-toolbar,
    .eo-card-top {
      flex-direction: column;
      align-items: stretch;
    }

    .eo-create-btn {
      width: 100%;
      justify-content: center;
    }

    .eo-select-wrap {
      min-width: 0;
    }
  }

  @media (max-width: 560px) {
    .eo-stats {
      grid-template-columns: 1fr;
    }

    .eo-role {
      flex-direction: column;
    }
  }
`;

const getStatusKey = (status?: string) => (status || 'DRAFT').toLowerCase();

const EmployerOpportunities: React.FC = () => {
  const [opportunities, setOpportunities] = useState<InternshipOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedInternship, setSelectedInternship] = useState<InternshipOpportunity | null>(null);
  const [employerId, setEmployerId] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { feedbackProps, showError } = useFeedbackModal();

  useEffect(() => {
    if (id) {
      const loadInternship = async () => {
        try {
          const data = await internshipService.getInternship(id);
          setSelectedInternship(data);
          setShowDetailsModal(true);
        } catch (err) {
          console.error('Failed to load internship details', err);
        }
      };

      loadInternship();
    } else {
      setShowDetailsModal(false);
      setSelectedInternship(null);
    }
  }, [id]);

  useEffect(() => {
    const fetchEmployerId = async () => {
      try {
        const employer = await employerService.getCurrentEmployer();
        if (employer) setEmployerId(employer.id);
      } catch (err) {
        console.error('Failed to fetch employer context', err);
      }
    };

    fetchEmployerId();
  }, []);

  const fetchOpportunities = async () => {
    try {
      setIsLoading(true);

      const response = await internshipService.getInternships({
        status: statusFilter || undefined,
      });

      setOpportunities(response.results || []);
    } catch (error) {
      console.error('Failed to fetch opportunities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, [statusFilter]);

  const filteredOpportunities = useMemo(() => {
    const query = searchQuery.toLowerCase();

    return opportunities.filter((opp) =>
      (opp.title || '').toLowerCase().includes(query) ||
      (opp.location || '').toLowerCase().includes(query) ||
      (opp.department || '').toLowerCase().includes(query)
    );
  }, [opportunities, searchQuery]);

  const opportunityStats = useMemo(() => {
    return {
      total: opportunities.length,
      open: opportunities.filter((opp) => opp.status === 'OPEN').length,
      draft: opportunities.filter((opp) => opp.status === 'DRAFT').length,
      closed: opportunities.filter((opp) => opp.status === 'CLOSED').length,
    };
  }, [opportunities]);

  const handlePublish = async (opportunityId: string) => {
    try {
      setPublishingId(opportunityId);
      await internshipService.publishOpportunity(opportunityId);
      fetchOpportunities();
    } catch (error: any) {
      console.error('Failed to publish:', error);
      const sanitized = sanitizeAdminError(error);

      showError(
        'Publish Failed',
        'We encountered an error while trying to publish this opportunity.',
        sanitized.details
      );
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <EmployerLayout>
      <style>{STYLES}</style>

      <div className="eo-page">
        <section className="eo-hero">
          <div>
            <div className="eo-kicker">
              <Briefcase size={13} />
              Opportunity operations
            </div>

            <h1 className="eo-title">
              Internship <span>pipeline</span>
            </h1>

            <p className="eo-subtitle">
              Manage recruitment, visibility, applications, and supervision readiness
              from a single employer workspace.
            </p>
          </div>

          <button
            type="button"
            className="eo-create-btn"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={17} />
            Post opportunity
          </button>
        </section>

        <section className="eo-stats">
          <div className="eo-stat">
            <div className="eo-stat-top">
              <div>
                <div className="eo-stat-label">Total roles</div>
                <div className="eo-stat-value">{opportunityStats.total}</div>
              </div>
              <div className="eo-stat-icon">
                <Briefcase size={18} />
              </div>
            </div>
          </div>

          <div className="eo-stat">
            <div className="eo-stat-top">
              <div>
                <div className="eo-stat-label">Open</div>
                <div className="eo-stat-value">{opportunityStats.open}</div>
              </div>
              <div className="eo-stat-icon">
                <CheckCircle2 size={18} />
              </div>
            </div>
          </div>

          <div className="eo-stat">
            <div className="eo-stat-top">
              <div>
                <div className="eo-stat-label">Draft</div>
                <div className="eo-stat-value">{opportunityStats.draft}</div>
              </div>
              <div className="eo-stat-icon">
                <Clock size={18} />
              </div>
            </div>
          </div>

          <div className="eo-stat">
            <div className="eo-stat-top">
              <div>
                <div className="eo-stat-label">Closed</div>
                <div className="eo-stat-value">{opportunityStats.closed}</div>
              </div>
              <div className="eo-stat-icon">
                <Calendar size={18} />
              </div>
            </div>
          </div>
        </section>

        <section className="eo-toolbar">
          <div className="eo-search">
            <Search size={16} />

            <input
              type="text"
              placeholder="Search opportunities..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <div className="eo-select-wrap">
            <Filter size={16} />

            <select
              className="eo-select"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </section>

        <section className="eo-list">
          {isLoading ? (
            [1, 2, 3].map((item) => (
              <div className="eo-skeleton-card" key={item}>
                <div className="eo-skeleton-row">
                  <span className="eo-skeleton eo-skeleton-icon" />

                  <div style={{ flex: 1 }}>
                    <span className="eo-skeleton eo-skeleton-title" />
                    <span className="eo-skeleton eo-skeleton-line" />

                    <div style={{ display: 'flex', gap: 8 }}>
                      <span className="eo-skeleton eo-skeleton-pill" />
                      <span className="eo-skeleton eo-skeleton-pill" />
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : filteredOpportunities.length === 0 ? (
            <div className="eo-empty">
              <div className="eo-empty-icon">
                <Briefcase size={32} />
              </div>

              <h3>No opportunities found</h3>

              <p>
                {searchQuery || statusFilter
                  ? 'No opportunities match your current filters. Adjust the search or status filter.'
                  : 'Start your employer pipeline by posting your first internship opportunity.'}
              </p>

              <button
                type="button"
                className="eo-create-btn"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus size={16} />
                Post opportunity
              </button>
            </div>
          ) : (
            filteredOpportunities.map((opp) => {
              const statusKey = getStatusKey(opp.status);

              return (
                <article className="eo-card" key={opp.id}>
                  <div className={`eo-status-rail ${statusKey}`} />

                  <div className="eo-card-main">
                    <div className="eo-card-top">
                      <div className="eo-role">
                        <div className="eo-role-icon">
                          <Briefcase size={20} />
                        </div>

                        <div>
                          <h3>{opp.title}</h3>

                          <div className="eo-meta">
                            <span>
                              <MapPin size={13} />
                              {opp.location_type === 'ONSITE'
                                ? opp.location
                                : opp.location_type}
                            </span>

                            <span>
                              <Users size={13} />
                              {opp.capacity} positions
                            </span>

                            <span>
                              <Calendar size={13} />
                              {opp.created_at
                                ? new Date(opp.created_at).toLocaleDateString()
                                : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className={`eo-badge ${statusKey}`}>
                        {opp.status}
                      </div>
                    </div>

                    {Boolean((opp.skills || []).length) && (
                      <div className="eo-skills">
                        {(opp.skills || []).map((skill, index) => (
                          <span key={`${skill}-${index}`}>{skill}</span>
                        ))}
                      </div>
                    )}

                    <div className="eo-actions">
                      {opp.status === 'DRAFT' && (
                        <button
                          type="button"
                          className="eo-publish-btn"
                          onClick={() => handlePublish(opp.id)}
                          disabled={publishingId === opp.id}
                        >
                          {publishingId === opp.id ? 'Publishing...' : 'Publish'}
                        </button>
                      )}

                      <button
                        type="button"
                        className="eo-view-btn"
                        onClick={() =>
                          navigate(`/employer/dashboard/opportunities/${opp.id}`)
                        }
                      >
                        View details
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>

      <CreateInternshipModal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        onSuccess={fetchOpportunities}
        employer_id={employerId}
      />

      <InternshipDetailsModal
        show={showDetailsModal}
        onHide={() => navigate('/employer/dashboard/opportunities')}
        internship={selectedInternship}
      />

      <FeedbackModal {...feedbackProps} />
    </EmployerLayout>
  );
};

export default EmployerOpportunities;