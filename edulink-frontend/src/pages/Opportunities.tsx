import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  internshipService,
  type InternshipOpportunity,
  type SuccessStory,
  type InternshipParams,
} from '../services/internship/internshipService';
import {
  employerService,
  type Employer,
} from '../services/employer/employerService';
import { useAuth } from '../contexts/AuthContext';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { showToast } from '../utils/toast';
import { canApplyForInternship } from '../utils/permissions';
import {
  Building2,
  Code,
  Megaphone,
  LineChart,
  Stethoscope,
  Wrench,
  Briefcase,
  MapPin,
  CalendarDays,
  ExternalLink,
  SlidersHorizontal,
} from 'lucide-react';
import { SEO } from '../components/common';

type LocationTypeFilter = '' | 'ONSITE' | 'REMOTE' | 'HYBRID';

interface FilterState {
  locationType: LocationTypeFilter;
  duration: string;
  isVerified: boolean;
  employerType: string;
  department: string; // from category
}

import ApplyModal from '../components/dashboard/student/ApplyModal';
import LoginRequiredModal from '../components/common/LoginRequiredModal';

const Opportunities: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { handleError: handleOpportunitiesError } = useErrorHandler({
    onNotFound: () => showToast.error('No opportunities available'),
    onAuthError: () => showToast.error('Unauthorized access'),
    onUnexpected: error =>
      showToast.error(error.userMessage || 'Failed to load opportunities. Please try again.'),
  });

  const { handleError: handleAuxiliaryError } = useErrorHandler({
    onUnexpected: () => showToast.error('Failed to load featured content'),
  });

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    locationType: '',
    duration: '',
    isVerified: false,
    employerType: '',
    department: 'all',
  });

  const [opportunities, setOpportunities] = useState<InternshipOpportunity[]>(
    []
  );
  const [featuredEmployers, setFeaturedEmployers] = useState<Employer[]>([]);
  const [successStories, setSuccessStories] = useState<SuccessStory[]>([]);
  const [loading, setLoading] = useState(true);

  // Apply Modal State
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] =
    useState<InternshipOpportunity | null>(null);

  // Constants
  const categories = [
    { id: 'all', name: 'All', icon: 'bi-grid' },
    { id: 'tech', name: 'Tech', icon: 'bi-laptop' },
    { id: 'marketing', name: 'Marketing', icon: 'bi-megaphone' },
    { id: 'finance', name: 'Finance', icon: 'bi-graph-up' },
    { id: 'healthcare', name: 'Healthcare', icon: 'bi-heart-pulse' },
    { id: 'engineering', name: 'Engineering', icon: 'bi-gear' },
  ];

  // Fetch Data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [employersRes, storiesRes] = await Promise.all([
          employerService.getEmployers({ is_featured: true }),
          internshipService.getSuccessStories(),
        ]);
        setFeaturedEmployers(employersRes);
        setSuccessStories(storiesRes);
      } catch (error) {
        await handleAuxiliaryError(error);
      }
    };
    fetchInitialData();
  }, []);

  // Fetch Opportunities when filters/search change
  useEffect(() => {
    const fetchOpportunities = async () => {
      setLoading(true);
      try {
        const params: InternshipParams = {
          status: 'OPEN',
          search: searchQuery || undefined,
          location: undefined, // Could add location search specifically if needed
          employer__organization_type: filters.employerType || undefined,
          // employer__trust_level: filters.isVerified ? 2 : undefined, // Assuming 2+ is verified
          // For now, let's use the is_featured as a proxy or just rely on the backend trust level logic if implemented
          // Actually, let's filter by trust level if checked
          // employer__trust_level: filters.isVerified ? 2 : undefined,
          duration: filters.duration || undefined,
          department:
            filters.department !== 'all' ? filters.department : undefined,
        };

        // Handle location type mapping
        if (filters.locationType) {
          params.location_type = filters.locationType;
        }

        const data = await internshipService.getInternships(params);
        setOpportunities(data.results);
      } catch (error) {
        await handleOpportunitiesError(error);
      } finally {
        setLoading(false);
      }
    };

    // Debounce search slightly
    const timer = setTimeout(() => {
      fetchOpportunities();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, filters]);

  const initiateApply = (opportunity: InternshipOpportunity) => {
    if (opportunity.application_mode === 'EXTERNAL' && opportunity.external_apply_url) {
      window.open(opportunity.external_apply_url, '_blank', 'noopener,noreferrer');
      return;
    }

    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (!canApplyForInternship(user)) {
      showToast.error('Only students can apply for internships');
      return;
    }

    setSelectedOpportunity(opportunity);
    setShowApplyModal(true);
  };

  const handleConfirmApply = async (coverLetter: string) => {
    if (!selectedOpportunity) return;

    try {
      await internshipService.applyForInternship(
        selectedOpportunity.id,
        coverLetter
      );
      showToast.success('Application submitted successfully!');

      // Update local state to reflect application
      setOpportunities(prev =>
        prev.map(opp =>
          opp.id === selectedOpportunity.id
            ? { ...opp, student_has_applied: true }
            : opp
        )
      );
    } catch (error: any) {
      console.error('Application failed', error);
      throw error; // Re-throw to be caught by the modal's error handler
    }
  };

  // Client-side deadline validation helper
  const isOpportunityAvailable = (
    opportunity: InternshipOpportunity
  ): boolean => {
    /**
     * Defense-in-depth: Filter expired opportunities on client side.
     * Per architecture: Serializer includes is_deadline_expired, and backend filters,
     * but we add client-side validation for immediate UX feedback.
     */
    if (opportunity.is_deadline_expired === true) {
      return false; // Explicitly expired
    }

    if (opportunity.application_deadline) {
      const deadline = new Date(opportunity.application_deadline);
      if (deadline < new Date()) {
        return false; // Deadline has passed
      }
    }

    return true;
  };

  // Filter opportunities for display
  const availableOpportunities = opportunities.filter(isOpportunityAvailable);
  const activeFilterCount = [
    filters.locationType,
    filters.duration,
    filters.isVerified ? 'verified' : '',
    filters.employerType,
    filters.department !== 'all' ? filters.department : '',
    searchQuery.trim(),
  ].filter(Boolean).length;

  const resetFilters = () => {
    setFilters({
      locationType: '',
      duration: '',
      isVerified: false,
      employerType: '',
      department: 'all',
    });
    setSearchQuery('');
  };

  const formatDate = (date?: string) => {
    if (!date) return 'Not listed';
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getEmployerName = (opportunity: InternshipOpportunity) =>
    opportunity.employer_details?.name ||
    opportunity.external_employer_name ||
    opportunity.external_source_name ||
    'EduLink partner';

  const getInitials = (name?: string) =>
    (name || 'Student')
      .split(' ')
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase();

  const getCategoryColor = (dept: string = '') => {
    const category = dept.toLowerCase();
    if (category.includes('tech') || category.includes('software'))
      return 'bg-primary bg-opacity-10 text-primary';
    if (category.includes('marketing'))
      return 'bg-warning bg-opacity-10 text-warning';
    if (category.includes('finance')) return 'bg-info bg-opacity-10 text-info';
    if (category.includes('health'))
      return 'bg-success bg-opacity-10 text-success';
    if (category.includes('engineer'))
      return 'bg-danger bg-opacity-10 text-danger';
    return 'bg-secondary bg-opacity-10 text-secondary';
  };

  const getCategoryIcon = (dept: string = '', size = 48) => {
    const category = dept.toLowerCase();
    if (category.includes('tech') || category.includes('software'))
      return <Code size={size} className="text-primary" />;
    if (category.includes('marketing'))
      return <Megaphone size={size} className="text-warning" />;
    if (category.includes('finance'))
      return <LineChart size={size} className="text-info" />;
    if (category.includes('health'))
      return <Stethoscope size={size} className="text-success" />;
    if (category.includes('engineer'))
      return <Wrench size={size} className="text-danger" />;
    return <Briefcase size={size} className="text-secondary" />;
  };

  const getCategoryBgColor = (dept: string = '') => {
    const category = dept.toLowerCase();
    if (category.includes('tech') || category.includes('software'))
      return '#e0f2fe'; // blue-100
    if (category.includes('marketing')) return '#fef9c3'; // yellow-100
    if (category.includes('finance')) return '#e0e7ff'; // indigo-100
    if (category.includes('health')) return '#dcfce7'; // green-100
    if (category.includes('engineer')) return '#f3e8ff'; // purple-100
    return '#f3f4f6'; // gray-100
  };

  return (
    <>
      <SEO
        title="Find Opportunities"
        description="Browse and apply for verified internship and graduate job opportunities across Kenya. Filter by category, location, and employer type."
        keywords="find internships, jobs kenya, student opportunities, verified jobs"
      />
      <main className="main opportunities-page">
        <section className="opportunities-header" data-aos="fade-in">
          <div className="container">
            <div className="opportunities-header-grid">
              <div>
                <div className="opportunities-eyebrow">
                  Verified attachments and internships
                </div>
                <h1 className="opportunities-title">
                  Find and compare opportunities faster
                </h1>
                <p className="opportunities-subtitle">
                  Search EduLink-hosted applications and curated external listings from one place.
                </p>
              </div>

              <div className="opportunities-search-panel">
                <label className="opportunities-search-label" htmlFor="opportunity-search">
                  Search opportunities
                </label>
                <div className="opportunities-search">
                  <input
                    id="opportunity-search"
                    type="text"
                    placeholder="Role, company, skill, or keyword"
                    aria-label="Search opportunities"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                  <button type="button" aria-label="Search">
                    <i className="bi bi-search"></i>
                  </button>
                </div>
                <div className="opportunities-search-meta">
                  <span>{availableOpportunities.length} active now</span>
                  <span>{activeFilterCount} filters applied</span>
                </div>
              </div>
            </div>

            <div className="marketplace-categories" data-aos="fade-up">
              {categories.map(category => (
                <button
                  key={category.id}
                  className={`cat-btn ${filters.department === category.id ? 'active' : ''}`}
                  onClick={() =>
                    setFilters({ ...filters, department: category.id })
                  }
                >
                  <i className={`bi ${category.icon} me-1`}></i>
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="container opportunities-results-section" data-aos="fade-up">
          <div className="row g-4">
            {/* Sidebar Filters */}
            <div className="col-lg-3 mb-4">
              <div className="filter-sidebar">
                <div className="filter-sidebar-header">
                  <div>
                    <h5 className="fw-bold mb-1">Refine</h5>
                    <div className="text-muted small">
                      {activeFilterCount} active filter{activeFilterCount === 1 ? '' : 's'}
                    </div>
                  </div>
                  <SlidersHorizontal size={18} />
                </div>

                {/* Verified Only */}
                <div className="form-check form-switch filter-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="verifiedSwitch"
                    checked={filters.isVerified}
                    onChange={e =>
                      setFilters({ ...filters, isVerified: e.target.checked })
                    }
                  />
                  <label className="form-check-label" htmlFor="verifiedSwitch">
                    Verified Employers Only
                  </label>
                </div>

                {/* Location Type */}
                <div className="filter-field">
                  <label className="form-label fw-semibold small text-muted">
                    Location Type
                  </label>
                  <select
                    className="form-select"
                    value={filters.locationType}
                    onChange={e =>
                      setFilters({
                        ...filters,
                        locationType: e.target.value as LocationTypeFilter,
                      })
                    }
                  >
                    <option value="">Any Location</option>
                    <option value="ONSITE">On-site</option>
                    <option value="REMOTE">Remote</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </div>

                {/* Duration */}
                <div className="filter-field">
                  <label className="form-label fw-semibold small text-muted">
                    Duration
                  </label>
                  <select
                    className="form-select"
                    value={filters.duration}
                    onChange={e =>
                      setFilters({ ...filters, duration: e.target.value })
                    }
                  >
                    <option value="">Any Duration</option>
                    <option value="1 month">1 Month</option>
                    <option value="3 months">3 Months</option>
                    <option value="6 months">6 Months</option>
                    <option value="1 year">1 Year</option>
                  </select>
                </div>

                {/* Employer Type */}
                <div className="filter-field">
                  <label className="form-label fw-semibold small text-muted">
                    Employer Type
                  </label>
                  <select
                    className="form-select"
                    value={filters.employerType}
                    onChange={e =>
                      setFilters({ ...filters, employerType: e.target.value })
                    }
                  >
                    <option value="">Any Type</option>
                    <option value="CORPORATE">Corporate</option>
                    <option value="STARTUP">Startup</option>
                    <option value="NGO">NGO</option>
                    <option value="GOVERNMENT">Government</option>
                  </select>
                </div>

                <button
                  className="btn btn-outline-secondary w-100 btn-sm mt-2"
                  onClick={resetFilters}
                >
                  Clear All Filters
                </button>
              </div>
            </div>

            {/* Opportunities Grid */}
            <div className="col-lg-9">
              <div className="results-toolbar">
                <h5 className="fw-bold mb-0">
                  {availableOpportunities.length} active opportunities
                </h5>
                <div className="text-muted small">Sorted by newest</div>
              </div>

              {loading ? (
                <div className="loading-state">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : availableOpportunities.length > 0 ? (
                <div className="row g-4">
                  {availableOpportunities.map(opportunity => (
                    <div key={opportunity.id} className="col-12">
                      <article className="opportunity-card">
                        <div
                          className="opportunity-card-icon"
                          style={{
                            backgroundColor: getCategoryBgColor(
                              opportunity.department || ''
                            ),
                          }}
                        >
                          {getCategoryIcon(opportunity.department || '', 34)}
                        </div>

                        <div className="opportunity-card-body">
                          <div className="opportunity-card-topline">
                            <span
                              className={`badge rounded-pill ${getCategoryColor(opportunity.department)}`}
                            >
                              {opportunity.department || 'General'}
                            </span>
                            <span
                              className={`source-badge ${opportunity.application_mode === 'EXTERNAL' ? 'external' : 'internal'}`}
                            >
                              {opportunity.application_mode === 'EXTERNAL'
                                ? 'External portal'
                                : 'Apply in EduLink'}
                            </span>
                            {opportunity.employer_details?.is_featured && (
                              <span className="badge featured rounded-pill">
                                Featured
                              </span>
                            )}
                          </div>

                          <div className="opportunity-card-main">
                            <div>
                              <h3 className="opportunity-card-title">
                                {opportunity.title}
                              </h3>
                              <div className="opportunity-employer">
                                {opportunity.employer_details?.logo ? (
                                  <img
                                    src={opportunity.employer_details.logo}
                                    alt={getEmployerName(opportunity)}
                                  />
                                ) : (
                                  <Building2 size={16} />
                                )}
                                <span>{getEmployerName(opportunity)}</span>
                              </div>
                            </div>

                            <div className="openings-box">
                              <strong>{opportunity.capacity || 1}</strong>
                              <span>openings</span>
                            </div>
                          </div>

                          <div className="opportunity-meta-grid">
                            <div className="opportunity-meta-item">
                              <MapPin size={15} />
                              <span>
                                {opportunity.location || 'Location not listed'}
                                {opportunity.location_type ? ` · ${opportunity.location_type}` : ''}
                              </span>
                            </div>
                            <div className="opportunity-meta-item">
                              <CalendarDays size={15} />
                              <span>Deadline {formatDate(opportunity.application_deadline)}</span>
                            </div>
                            <div className="opportunity-meta-item">
                              <Briefcase size={15} />
                              <span>{opportunity.duration || 'Duration not listed'}</span>
                            </div>
                          </div>

                          {opportunity.skills && opportunity.skills.length > 0 && (
                            <div className="opportunity-tags">
                              {opportunity.skills.slice(0, 5).map(tag => (
                                <span key={tag} className="tag-pill">
                                  {tag}
                                </span>
                              ))}
                              {opportunity.skills.length > 5 && (
                                <span className="tag-pill muted">
                                  +{opportunity.skills.length - 5} more
                                </span>
                              )}
                            </div>
                          )}

                          <div className="opportunity-card-actions">
                            <button
                              className="btn btn-outline-primary btn-sm"
                              onClick={() =>
                                navigate(`/opportunities/${opportunity.id}`)
                              }
                            >
                              Details
                            </button>
                            <button
                              className={`btn btn-sm ${opportunity.student_has_applied ? 'btn-success' : 'btn-primary'}`}
                              onClick={() => initiateApply(opportunity)}
                              disabled={opportunity.student_has_applied}
                            >
                              {opportunity.application_mode === 'EXTERNAL' && (
                                <ExternalLink size={14} className="me-1" />
                              )}
                              {opportunity.application_mode === 'EXTERNAL'
                                ? 'Apply on Source'
                                : opportunity.student_has_applied
                                ? 'Applied'
                                : 'Apply Now'}
                            </button>
                          </div>
                        </div>
                      </article>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-5 bg-light rounded">
                  {opportunities.length > 0 &&
                  availableOpportunities.length === 0 ? (
                    <>
                      <p className="lead text-muted mb-2">
                        All matching opportunities have expired.
                      </p>
                      <p className="text-muted small mb-3">
                        Their application deadlines have passed. Check back soon
                        for new opportunities!
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="lead text-muted mb-0">
                        No opportunities found matching your criteria.
                      </p>
                    </>
                  )}
                  <button
                    className="btn btn-link mt-2"
                    onClick={resetFilters}
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Featured Employers */}
        {featuredEmployers.length > 0 && (
          <section className="featured-employers" data-aos="fade-up">
            <div className="container">
              <div className="section-heading-row">
                <div>
                  <h2 className="fw-bold mb-1">Featured Employers</h2>
                  <p className="mb-0 text-muted">
                    Verified organizations currently engaging student talent.
                  </p>
                </div>
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                  Browse Opportunities
                </button>
              </div>
              <div className="featured-employer-strip">
                {featuredEmployers.map((employer, index) => (
                  <button
                    key={employer.id}
                    className="employer-card"
                    data-aos="fade-up"
                    data-aos-delay={index * 100}
                    type="button"
                  >
                    {employer.logo ? (
                      <img
                        src={employer.logo}
                        className="employer-logo"
                        alt=""
                      />
                    ) : (
                      <span className="employer-logo placeholder-logo">
                        <Building2 size={20} />
                      </span>
                    )}
                    <span className="employer-card-copy">
                      <strong title={employer.name}>{employer.name}</strong>
                      <small>{employer.organization_type}</small>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Success Stories */}
        {successStories.length > 0 && (
          <section className="marketplace-impact" data-aos="fade-up">
            <div className="container">
              <div className="section-heading-row">
                <div>
                  <h2 className="fw-bold mb-1">Recent Student Outcomes</h2>
                  <p className="mb-0 text-muted">
                    Placement proof from verified logbooks and completion records.
                  </p>
                </div>
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => navigate('/success-stories')}
                >
                  View All Stories
                </button>
              </div>
              <div className="outcomes-grid">
                {successStories.slice(0, 3).map((story, index) => (
                  <div
                    key={story.id}
                    className="outcome-card"
                    data-aos="fade-up"
                    data-aos-delay={index * 100}
                  >
                    <div className="outcome-card-header">
                      <div className="outcome-avatar" aria-hidden="true">
                        {getInitials(story.student_name)}
                      </div>
                      <div className="min-width-0">
                        <div className="fw-bold text-truncate">
                          {story.student_name || 'Student'}
                        </div>
                        <div className="small text-muted text-truncate">
                          {story.employer_name
                            ? `Intern at ${story.employer_name}`
                            : 'Verified internship graduate'}
                        </div>
                      </div>
                    </div>
                    <p className="outcome-quote">
                      "{story.student_testimonial || story.employer_feedback}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Employer CTA */}
        <section className="marketplace-cta-section" data-aos="fade-up">
          <div className="container">
            <div className="cta-panel">
              <div>
                <h2 className="fw-bold mb-2">Hiring interns or attachees?</h2>
                <p className="lead mb-0">
                  Verified employers can publish opportunities and manage student applications inside EduLink.
                </p>
              </div>
              <div className="cta-actions">
                <button
                  className="btn btn-light btn-lg"
                  onClick={() => navigate('/employer/onboarding')}
                >
                  Register as Employer
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Apply Modal */}
      <ApplyModal
        show={showApplyModal}
        onHide={() => setShowApplyModal(false)}
        onConfirm={handleConfirmApply}
        title={selectedOpportunity?.title || ''}
        employerName={selectedOpportunity?.employer_details?.name}
      />

      <LoginRequiredModal
        show={showLoginModal}
        onHide={() => setShowLoginModal(false)}
      />

      <style>{`
        .opportunities-page {
          background: #f8fafc;
        }

        .opportunities-header {
          background: #ffffff;
          border-bottom: 1px solid #e5e7eb;
          padding: 42px 0 20px;
        }

        .opportunities-header-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(320px, 520px);
          gap: 32px;
          align-items: end;
        }

        .opportunities-eyebrow {
          color: var(--accent-color);
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0;
          margin-bottom: 10px;
          text-transform: uppercase;
        }

        .opportunities-title {
          color: #0f172a;
          font-size: 2.25rem;
          font-weight: 800;
          line-height: 1.12;
          margin: 0 0 10px;
        }

        .opportunities-subtitle {
          color: #64748b;
          font-size: 1rem;
          line-height: 1.6;
          margin: 0;
          max-width: 640px;
        }

        .opportunities-search-panel {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
        }

        .opportunities-search-label {
          color: #475569;
          display: block;
          font-size: 0.78rem;
          font-weight: 700;
          margin-bottom: 8px;
          text-transform: uppercase;
        }

        .opportunities-search {
          align-items: center;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          display: flex;
          gap: 8px;
          min-height: 48px;
          padding: 0 8px 0 14px;
        }

        .opportunities-search:focus-within {
          border-color: var(--accent-color);
          box-shadow: 0 0 0 3px rgba(0,153,153,0.12);
        }

        .opportunities-search input {
          background: transparent;
          border: 0;
          color: #0f172a;
          flex: 1 1 auto;
          font-size: 0.98rem;
          min-width: 0;
          outline: 0;
        }

        .opportunities-search button {
          align-items: center;
          background: var(--accent-color);
          border: 0;
          border-radius: 6px;
          color: #ffffff;
          display: inline-flex;
          height: 36px;
          justify-content: center;
          width: 42px;
        }

        .opportunities-search-meta {
          color: #64748b;
          display: flex;
          flex-wrap: wrap;
          font-size: 0.82rem;
          gap: 12px;
          justify-content: space-between;
          margin-top: 10px;
        }

        .marketplace-categories {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 22px 0 0;
        }

        .marketplace-categories .cat-btn {
          background: #ffffff;
          border: 1px solid #dbe3ea;
          border-radius: 999px;
          color: #334155;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 650;
          min-height: 38px;
          padding: 8px 14px;
          transition: background 0.2s, border-color 0.2s, color 0.2s;
        }

        .marketplace-categories .cat-btn.active,
        .marketplace-categories .cat-btn:hover {
          background: #e6f7f7;
          border-color: var(--accent-color);
          color: var(--accent-color);
        }

        .opportunities-results-section {
          padding-top: 28px;
          padding-bottom: 56px;
        }

        .filter-sidebar {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 18px;
          position: sticky;
          top: 96px;
        }

        .filter-sidebar-header {
          align-items: center;
          border-bottom: 1px solid #edf2f7;
          color: #0f172a;
          display: flex;
          justify-content: space-between;
          margin-bottom: 16px;
          padding-bottom: 14px;
        }

        .filter-switch {
          background: #f8fafc;
          border-radius: 8px;
          margin-bottom: 16px;
          padding: 12px 12px 12px 42px;
        }

        .filter-field {
          margin-bottom: 14px;
        }

        .filter-sidebar .form-select,
        .filter-sidebar .btn {
          border-radius: 7px;
        }

        .results-toolbar {
          align-items: center;
          display: flex;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .loading-state {
          align-items: center;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          display: flex;
          justify-content: center;
          min-height: 240px;
        }

        .opportunity-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          display: grid;
          grid-template-columns: 92px minmax(0, 1fr);
          overflow: hidden;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .opportunity-card:hover {
          border-color: rgba(0,153,153,0.45);
          box-shadow: 0 14px 32px rgba(15,23,42,0.08);
        }

        .opportunity-card-icon {
          align-items: center;
          display: flex;
          justify-content: center;
          min-height: 100%;
        }

        .opportunity-card-body {
          padding: 18px;
        }

        .opportunity-card-topline {
          align-items: center;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 10px;
        }

        .opportunity-card .badge.featured {
          background: #ecfdf3;
          border: 1px solid #bbf7d0;
          color: #15803d;
        }

        .source-badge {
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 0.35rem 0.58rem;
        }

        .source-badge.internal {
          background: #e0f2fe;
          color: #0369a1;
        }

        .source-badge.external {
          background: #fff7ed;
          color: #c2410c;
        }

        .opportunity-card-main {
          align-items: flex-start;
          display: flex;
          gap: 18px;
          justify-content: space-between;
        }

        .opportunity-card-title {
          color: #0f172a;
          font-size: 1.18rem;
          font-weight: 800;
          line-height: 1.32;
          margin: 0 0 8px;
        }

        .opportunity-employer {
          align-items: center;
          color: #475569;
          display: flex;
          font-size: 0.92rem;
          font-weight: 600;
          gap: 8px;
        }

        .opportunity-employer img {
          height: 20px;
          object-fit: contain;
          width: 20px;
        }

        .openings-box {
          align-items: center;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          color: #0f172a;
          display: flex;
          flex-direction: column;
          min-width: 76px;
          padding: 8px 10px;
          text-align: center;
        }

        .openings-box strong {
          color: var(--accent-color);
          font-size: 1.1rem;
          line-height: 1;
        }

        .openings-box span {
          color: #64748b;
          font-size: 0.68rem;
          font-weight: 700;
          margin-top: 4px;
          text-transform: uppercase;
        }

        .opportunity-meta-grid {
          display: grid;
          gap: 8px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          margin-top: 16px;
        }

        .opportunity-meta-item {
          align-items: center;
          background: #f8fafc;
          border-radius: 7px;
          color: #475569;
          display: flex;
          font-size: 0.83rem;
          gap: 8px;
          min-width: 0;
          padding: 9px 10px;
        }

        .opportunity-meta-item svg {
          color: var(--accent-color);
          flex: 0 0 auto;
        }

        .opportunity-meta-item span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .opportunity-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 14px;
        }

        .tag-pill {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 999px;
          color: #475569;
          display: inline-block;
          font-size: 0.74rem;
          font-weight: 650;
          padding: 4px 10px;
        }

        .tag-pill.muted {
          color: #64748b;
        }

        .opportunity-card-actions {
          align-items: center;
          border-top: 1px solid #edf2f7;
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 16px;
          padding-top: 14px;
        }

        .opportunity-card-actions .btn {
          align-items: center;
          border-radius: 7px;
          display: inline-flex;
          font-weight: 700;
          justify-content: center;
          min-height: 36px;
          padding-left: 18px;
          padding-right: 18px;
        }

        .featured-employers {
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          padding: 44px 0;
          margin: 0;
        }

        .section-heading-row {
          align-items: center;
          display: flex;
          gap: 20px;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .section-heading-row .btn {
          border-radius: 7px;
          flex: 0 0 auto;
          font-weight: 700;
        }

        .featured-employer-strip {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        }

        .employer-card {
          align-items: center;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          color: inherit;
          display: flex;
          gap: 12px;
          min-height: 76px;
          padding: 14px;
          text-align: left;
          transition: border-color 0.2s, box-shadow 0.2s;
          width: 100%;
        }

        .employer-card:hover {
          border-color: rgba(0,153,153,0.45);
          box-shadow: 0 10px 24px rgba(15,23,42,0.07);
        }

        .employer-logo {
          align-items: center;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          display: flex;
          flex: 0 0 auto;
          height: 44px;
          justify-content: center;
          object-fit: contain;
          padding: 6px;
          width: 44px;
        }

        .placeholder-logo {
          color: #64748b;
        }

        .employer-card-copy {
          min-width: 0;
        }

        .employer-card-copy strong,
        .employer-card-copy small {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .employer-card-copy strong {
          color: #0f172a;
          font-size: 0.94rem;
        }

        .employer-card-copy small {
          color: #64748b;
          font-size: 0.78rem;
        }

        /* Success Stories */
        .marketplace-impact {
          background: #ffffff;
          border-top: 1px solid #e2e8f0;
          padding: 44px 0;
        }

        .outcomes-grid {
          display: grid;
          gap: 14px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .outcome-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 18px;
        }

        .outcome-card-header {
          align-items: center;
          display: flex;
          gap: 12px;
          margin-bottom: 14px;
          min-width: 0;
        }

        .outcome-avatar {
          align-items: center;
          background: #e6f7f7;
          border: 1px solid rgba(0,153,153,0.2);
          border-radius: 50%;
          color: var(--accent-color);
          display: flex;
          flex: 0 0 auto;
          font-size: 0.78rem;
          font-weight: 800;
          height: 42px;
          justify-content: center;
          width: 42px;
        }

        .min-width-0 {
          min-width: 0;
        }

        .outcome-quote {
          color: #475569;
          font-size: 0.92rem;
          line-height: 1.62;
          margin: 0;
        }

        /* CTA Section */
        .marketplace-cta-section {
          background: #0f766e;
          color: #fff;
          padding: 52px 0;
          margin-top: 0;
        }

        .cta-panel {
          align-items: center;
          display: flex;
          gap: 28px;
          justify-content: space-between;
        }

        .cta-panel p {
          color: rgba(255,255,255,0.78);
          max-width: 760px;
        }

        .cta-actions {
          display: flex;
          flex: 0 0 auto;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: flex-end;
        }

        .cta-actions .btn {
          border-radius: 7px;
          font-weight: 800;
        }

        @media (max-width: 991.98px) {
          .opportunities-header-grid {
            grid-template-columns: 1fr;
            gap: 22px;
          }

          .filter-sidebar {
            position: static;
          }

          .outcomes-grid {
            grid-template-columns: 1fr;
          }

          .cta-panel {
            align-items: flex-start;
            flex-direction: column;
          }

          .cta-actions {
            justify-content: flex-start;
          }
        }

        @media (max-width: 767.98px) {
          .opportunities-header {
            padding: 32px 0 16px;
          }

          .opportunities-title {
            font-size: 1.8rem;
          }

          .opportunities-search-panel {
            padding: 12px;
          }

          .marketplace-categories {
            flex-wrap: nowrap;
            margin-left: -12px;
            margin-right: -12px;
            overflow-x: auto;
            padding-left: 12px;
            padding-right: 12px;
            scrollbar-width: none;
          }

          .marketplace-categories::-webkit-scrollbar {
            display: none;
          }

          .marketplace-categories .cat-btn {
            flex: 0 0 auto;
          }

          .results-toolbar {
            align-items: flex-start;
            flex-direction: column;
            gap: 4px;
          }

          .opportunity-card {
            grid-template-columns: 1fr;
          }

          .opportunity-card-icon {
            min-height: 72px;
          }

          .opportunity-card-main {
            flex-direction: column;
          }

          .openings-box {
            align-items: baseline;
            flex-direction: row;
            gap: 6px;
            min-width: 0;
          }

          .opportunity-meta-grid {
            grid-template-columns: 1fr;
          }

          .opportunity-card-actions {
            align-items: stretch;
            flex-direction: column;
          }

          .opportunity-card-actions .btn {
            width: 100%;
          }

          .section-heading-row {
            align-items: flex-start;
            flex-direction: column;
            gap: 12px;
          }

          .section-heading-row .btn {
            width: 100%;
          }

          .cta-actions,
          .cta-actions .btn {
            width: 100%;
          }
        }

        @media (max-width: 575.98px) {
          .opportunities-search-meta {
            flex-direction: column;
            gap: 4px;
          }

          .opportunities-results-section {
            padding-top: 20px;
          }

          .filter-sidebar {
            padding: 14px;
          }

          .featured-employers,
          .marketplace-impact,
          .marketplace-cta-section {
            padding: 44px 0;
          }
        }
      `}</style>
    </>
  );
};

export default Opportunities;
