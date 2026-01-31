import React, { useState, useEffect } from 'react';
import { internshipService, type InternshipOpportunity, type SuccessStory, type InternshipParams } from '../services/internship/internshipService';
import { employerService, type Employer } from '../services/employer/employerService';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { Building2, Code, Megaphone, LineChart, Stethoscope, Wrench, Briefcase } from 'lucide-react';

interface FilterState {
  locationType: string;
  duration: string;
  isVerified: boolean;
  employerType: string;
  department: string; // from category
}

import ApplyModal from '../components/dashboard/student/ApplyModal';
import LoginRequiredModal from '../components/common/LoginRequiredModal';

const Opportunities: React.FC = () => {
  const { user } = useAuth();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    locationType: '',
    duration: '',
    isVerified: false,
    employerType: '',
    department: 'all'
  });
  
  const [opportunities, setOpportunities] = useState<InternshipOpportunity[]>([]);
  const [featuredEmployers, setFeaturedEmployers] = useState<Employer[]>([]);
  const [successStories, setSuccessStories] = useState<SuccessStory[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Apply Modal State
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<InternshipOpportunity | null>(null);

  // Constants
  const categories = [
    { id: 'all', name: 'All', icon: 'bi-grid' },
    { id: 'tech', name: 'Tech', icon: 'bi-laptop' },
    { id: 'marketing', name: 'Marketing', icon: 'bi-megaphone' },
    { id: 'finance', name: 'Finance', icon: 'bi-graph-up' },
    { id: 'healthcare', name: 'Healthcare', icon: 'bi-heart-pulse' },
    { id: 'engineering', name: 'Engineering', icon: 'bi-gear' }
  ];

  // Fetch Data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [employersRes, storiesRes] = await Promise.all([
          employerService.getEmployers({ is_featured: true }),
          internshipService.getSuccessStories()
        ]);
        setFeaturedEmployers(employersRes);
        setSuccessStories(storiesRes);
      } catch (error) {
        console.error('Failed to fetch auxiliary data', error);
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
          department: filters.department !== 'all' ? filters.department : undefined,
        };

        // Handle location type mapping
        if (filters.locationType) {
           // @ts-ignore
           params.location_type = filters.locationType;
        }

        const data = await internshipService.getInternships(params);
        setOpportunities(data);
      } catch (error) {
        console.error('Failed to fetch opportunities', error);
        toast.error('Failed to load opportunities');
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
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (user.role !== 'student') {
      toast.error('Only students can apply for internships');
      return;
    }

    setSelectedOpportunity(opportunity);
    setShowApplyModal(true);
  };

  const handleConfirmApply = async (coverLetter: string) => {
    if (!selectedOpportunity) return;

    try {
      await internshipService.applyForInternship(selectedOpportunity.id, coverLetter);
      toast.success('Application submitted successfully!');
      
      // Update local state to reflect application
      setOpportunities(prev => prev.map(opp => 
        opp.id === selectedOpportunity.id 
          ? { ...opp, student_has_applied: true } 
          : opp
      ));
    } catch (error: any) {
      console.error('Application failed', error);
      throw error; // Re-throw to be caught by the modal's error handler
    }
  };

  const getCategoryColor = (dept: string = '') => {
    const category = dept.toLowerCase();
    if (category.includes('tech') || category.includes('software')) return 'bg-blue-100 text-blue-800';
    if (category.includes('marketing')) return 'bg-yellow-100 text-yellow-800';
    if (category.includes('finance')) return 'bg-indigo-100 text-indigo-800';
    if (category.includes('health')) return 'bg-green-100 text-green-800';
    if (category.includes('engineer')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getCategoryIcon = (dept: string = '') => {
    const category = dept.toLowerCase();
    if (category.includes('tech') || category.includes('software')) return <Code size={48} className="text-primary" />;
    if (category.includes('marketing')) return <Megaphone size={48} className="text-warning" />;
    if (category.includes('finance')) return <LineChart size={48} className="text-info" />;
    if (category.includes('health')) return <Stethoscope size={48} className="text-success" />;
    if (category.includes('engineer')) return <Wrench size={48} className="text-purple" />;
    return <Briefcase size={48} className="text-secondary" />;
  };

  const getCategoryBgColor = (dept: string = '') => {
    const category = dept.toLowerCase();
    if (category.includes('tech') || category.includes('software')) return '#e0f2fe'; // blue-100
    if (category.includes('marketing')) return '#fef9c3'; // yellow-100
    if (category.includes('finance')) return '#e0e7ff'; // indigo-100
    if (category.includes('health')) return '#dcfce7'; // green-100
    if (category.includes('engineer')) return '#f3e8ff'; // purple-100
    return '#f3f4f6'; // gray-100
  };

  return (
    <>
      <main className="main">
        {/* Marketplace Hero */}
        <section className="marketplace-hero text-center" data-aos="fade-in">
          <div className="container">
            <h1 className="display-5 fw-bold mb-3">Find Your Next Opportunity</h1>
            <p className="lead mb-4">Discover verified internships and jobs from top employers and institutions</p>
            <div className="search-bar shadow mx-auto">
              <input 
                type="text" 
                placeholder="Search by role, company, or keyword..." 
                aria-label="Search opportunities"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="button" onClick={() => window.scrollTo({ top: 600, behavior: 'smooth' })}>
                <i className="bi bi-search"></i> Search
              </button>
            </div>
          </div>
        </section>

        {/* Category Quick Filters */}
        <div className="marketplace-categories" data-aos="fade-up">
          {categories.map(category => (
            <button
              key={category.id}
              className={`cat-btn ${filters.department === category.id ? 'active' : ''}`}
              onClick={() => setFilters({ ...filters, department: category.id })}
            >
              <i className={`bi ${category.icon} me-1`}></i>
              {category.name}
            </button>
          ))}
        </div>

        <section className="container mb-5" data-aos="fade-up">
          <div className="row">
            {/* Sidebar Filters */}
            <div className="col-lg-3 mb-4">
              <div className="filter-sidebar p-4 bg-white rounded shadow-sm border">
                <h5 className="fw-bold mb-3">Filters</h5>
                
                {/* Verified Only */}
                <div className="form-check form-switch mb-3">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    id="verifiedSwitch"
                    checked={filters.isVerified}
                    onChange={(e) => setFilters({...filters, isVerified: e.target.checked})}
                  />
                  <label className="form-check-label" htmlFor="verifiedSwitch">Verified Employers Only</label>
                </div>

                <hr className="my-3 text-muted" />

                {/* Location Type */}
                <div className="mb-3">
                  <label className="form-label fw-semibold small text-muted">Location Type</label>
                  <select 
                    className="form-select"
                    value={filters.locationType}
                    onChange={(e) => setFilters({...filters, locationType: e.target.value})}
                  >
                    <option value="">Any Location</option>
                    <option value="ONSITE">On-site</option>
                    <option value="REMOTE">Remote</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </div>

                {/* Duration */}
                <div className="mb-3">
                  <label className="form-label fw-semibold small text-muted">Duration</label>
                  <select 
                    className="form-select"
                    value={filters.duration}
                    onChange={(e) => setFilters({...filters, duration: e.target.value})}
                  >
                    <option value="">Any Duration</option>
                    <option value="1 month">1 Month</option>
                    <option value="3 months">3 Months</option>
                    <option value="6 months">6 Months</option>
                    <option value="1 year">1 Year</option>
                  </select>
                </div>

                {/* Employer Type */}
                <div className="mb-3">
                  <label className="form-label fw-semibold small text-muted">Employer Type</label>
                  <select 
                    className="form-select"
                    value={filters.employerType}
                    onChange={(e) => setFilters({...filters, employerType: e.target.value})}
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
                  onClick={() => {
                    setFilters({
                      locationType: '',
                      duration: '',
                      isVerified: false,
                      employerType: '',
                      department: 'all'
                    });
                    setSearchQuery('');
                  }}
                >
                  Clear All Filters
                </button>
              </div>
            </div>

            {/* Opportunities Grid */}
            <div className="col-lg-9">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0">{opportunities.length} Opportunities Found</h5>
                <div className="text-muted small">Sorted by: Newest</div>
              </div>

              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : opportunities.length > 0 ? (
                <div className="row g-4">
                  {opportunities.map((opportunity) => (
                    <div key={opportunity.id} className="col-md-6 col-xl-4">
                      <div className="opportunity-card h-100">
                        <div className="card-img d-flex align-items-center justify-content-center" style={{height: '200px', backgroundColor: getCategoryBgColor(opportunity.department || '')}}>
                          {getCategoryIcon(opportunity.department || '')}
                        </div>
                        <div className="card-content">
                          <div className="d-flex align-items-center mb-2">
                            <div className="company-avatar d-flex align-items-center justify-content-center">
                              {opportunity.employer_details?.logo ? (
                                <img src={opportunity.employer_details.logo} alt={opportunity.employer_details?.name || 'Company'} />
                              ) : (
                                <Building2 size={20} className="text-muted" />
                              )}
                            </div>
                            <span className={`badge ${getCategoryColor(opportunity.department)}`}>
                              {opportunity.department || 'General'}
                            </span>
                            {opportunity.employer_details?.is_featured && (
                              <span className="badge featured ms-2">Featured</span>
                            )}
                          </div>
                          <h3 className="fw-bold mb-1 fs-5">{opportunity.title}</h3>
                          <div className="location small text-muted">
                            <i className="bi bi-geo-alt me-1"></i> {opportunity.location} ({opportunity.location_type})
                          </div>
                          <div className="salary text-primary small fw-semibold mb-2 mt-1">
                            {opportunity.capacity} Openings
                          </div>
                          <div className="tags mb-3">
                            {opportunity.skills?.slice(0, 2).map(tag => (
                              <span key={tag} className="tag">{tag}</span>
                            ))}
                            {opportunity.skills && opportunity.skills.length > 2 && (
                              <span className="tag">+{opportunity.skills.length - 2}</span>
                            )}
                          </div>
                          <div className="actions mt-auto">
                            <button 
                              className={`btn w-100 ${opportunity.student_has_applied ? 'btn-success' : 'btn-primary'}`}
                              onClick={() => initiateApply(opportunity)}
                              disabled={opportunity.student_has_applied}
                            >
                              {opportunity.student_has_applied ? 'Applied' : 'Apply Now'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-5 bg-light rounded">
                  <p className="lead text-muted mb-0">No opportunities found matching your criteria.</p>
                  <button 
                    className="btn btn-link mt-2"
                    onClick={() => setFilters({...filters, department: 'all', locationType: '', employerType: ''})}
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
              <div className="text-center mb-4">
                <h2 className="fw-bold">Featured Employers</h2>
                <p>Connect with top companies and organizations</p>
              </div>
              <div className="row g-4 justify-content-center">
                {featuredEmployers.map((employer, index) => (
                  <div key={employer.id} className="col-6 col-md-4 col-lg-2" data-aos="fade-up" data-aos-delay={index * 100}>
                    <div className="employer-card text-center h-100">
                      {employer.logo ? (
                        <img src={employer.logo} className="employer-logo" alt={employer.name} />
                      ) : (
                        <div className="employer-logo d-flex align-items-center justify-content-center">
                          <Building2 size={24} className="text-muted" />
                        </div>
                      )}
                      <h6 className="mt-2 mb-1 text-truncate" title={employer.name}>{employer.name}</h6>
                      <small className="text-muted">{employer.organization_type}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Success Stories */}
        {successStories.length > 0 && (
          <section className="marketplace-impact" data-aos="fade-up">
            <div className="container">
              <div className="text-center mb-5">
                <h2 className="fw-bold">Success Stories</h2>
                <p>See how EduLink is transforming careers across Kenya</p>
              </div>
              <div className="row g-4 justify-content-center">
                {successStories.map((story, index) => (
                  <div key={story.id} className="col-md-6 col-lg-4" data-aos="fade-up" data-aos-delay={index * 100}>
                    <div className="testimonial h-100 bg-white p-4 rounded shadow-sm border">
                      <div className="d-flex align-items-center mb-3">
                        <div className="avatar me-3" style={{width: 50, height: 50, borderRadius: '50%', background: '#eee', overflow: 'hidden'}}>
                          <img src="assets/img/testimonials/testimonials-1.jpg" alt={story.student_name} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                        </div>
                        <div>
                          <div className="fw-bold">{story.student_name}</div>
                          <div className="small text-muted">Intern at {story.employer_name}</div>
                        </div>
                      </div>
                      <div className="quote fst-italic text-muted">"{story.student_testimonial}"</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Employer CTA */}
        <section className="marketplace-cta-section" data-aos="fade-up">
          <div className="container text-center">
            <h2 className="fw-bold mb-3">Are You Hiring?</h2>
            <p className="lead mb-4">Post your opportunity and connect with top student talent across Kenya</p>
            <button className="btn btn-light btn-lg">Post an Opportunity</button>
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
        /* Marketplace Hero */
        .marketplace-hero {
          background: linear-gradient(120deg, var(--accent-color) 0%, #22c55e 100%);
          color: #fff;
          padding: 80px 0 60px 0;
          position: relative;
          overflow: hidden;
        }

        .marketplace-hero .search-bar {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
          padding: 20px 24px;
          max-width: 600px;
          margin: 0 auto;
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .marketplace-hero .search-bar input {
          border: none;
          outline: none;
          flex: 1 1 auto;
          font-size: 1.1rem;
          background: transparent;
          color: #222;
        }

        .marketplace-hero .search-bar button {
          background: var(--accent-color);
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 10px 22px;
          font-size: 1.1rem;
          font-weight: 600;
          transition: background 0.2s;
        }

        .marketplace-hero .search-bar button:hover {
          background: #22c55e;
        }

        /* Category Filters */
        .marketplace-categories {
          margin: 0 auto 32px auto;
          max-width: 900px;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          justify-content: center;
          padding: 20px 0;
        }

        .marketplace-categories .cat-btn {
          background: #e0f7f7;
          color: var(--accent-color);
          border: none;
          border-radius: 8px;
          padding: 10px 18px;
          font-size: 1rem;
          font-weight: 600;
          transition: background 0.2s, color 0.2s;
          cursor: pointer;
        }

        .marketplace-categories .cat-btn.active,
        .marketplace-categories .cat-btn:hover {
          background: var(--accent-color);
          color: #fff;
        }

        /* Sidebar */
        .filter-sidebar {
          position: sticky;
          top: 100px;
        }

        /* Opportunity Cards */
        .opportunity-card {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.06);
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
          display: flex;
          flex-direction: column;
          border: 1px solid #f0f0f0;
        }

        .opportunity-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 24px rgba(0,153,153,0.1);
          border-color: #e0f7f7;
        }

        .opportunity-card .card-img {
          width: 100%;
          height: 160px;
          overflow: hidden;
          background: #e0f7f7;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .opportunity-card .card-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s;
        }

        .opportunity-card:hover .card-img img {
          transform: scale(1.05);
        }

        .opportunity-card .card-content {
          padding: 20px;
          flex: 1 1 auto;
          display: flex;
          flex-direction: column;
        }

        .opportunity-card .company-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          overflow: hidden;
          border: 1px solid #e0f7f7;
          margin-right: 10px;
          background: #fff;
        }

        .opportunity-card .company-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .opportunity-card .badge {
          font-size: 0.85em;
          padding: 5px 10px;
          border-radius: 6px;
          background: #e0f7f7;
          color: var(--accent-color);
          font-weight: 600;
        }

        .opportunity-card .badge.featured {
          background: #22c55e;
          color: #fff;
        }

        .opportunity-card .tag {
          display: inline-block;
          background: #f8fafc;
          color: #64748b;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          font-size: 0.8em;
          padding: 2px 8px;
          margin-right: 5px;
        }

        /* Featured Employers */
        .featured-employers {
          background: #f8fafc;
          padding: 60px 0 50px 0;
          margin: 40px 0;
        }

        .employer-card {
          padding: 20px;
          border-radius: 12px;
          transition: transform 0.2s;
          background: #fff;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .employer-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.08);
        }

        .employer-logo {
          width: 80px;
          height: 50px;
          object-fit: contain;
          background: #fff;
          margin: 0 auto;
        }

        /* Success Stories */
        .marketplace-impact {
          background: #e0f7f7;
          padding: 60px 0 50px 0;
        }

        /* CTA Section */
        .marketplace-cta-section {
          background: linear-gradient(120deg, var(--accent-color) 0%, #22c55e 100%);
          color: #fff;
          padding: 80px 0;
          margin-top: 40px;
        }
      `}</style>
    </>
  );
};

export default Opportunities;
