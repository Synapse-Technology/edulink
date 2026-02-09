
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { internshipService, type InternshipOpportunity } from '../services/internship/internshipService';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { 
  Building2, 
  MapPin, 
  Clock, 
  Users, 
  Briefcase, 
  CheckCircle2, 
  ArrowLeft,
  Share2
} from 'lucide-react';
import ApplyModal from '../components/dashboard/student/ApplyModal';
import LoginRequiredModal from '../components/common/LoginRequiredModal';

const OpportunityDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [opportunity, setOpportunity] = useState<InternshipOpportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    const fetchOpportunity = async () => {
      if (!id) return;
      try {
        const data = await internshipService.getInternship(id);
        setOpportunity(data);
      } catch (error) {
        console.error('Failed to fetch opportunity details', error);
        toast.error('Failed to load opportunity details');
        navigate('/opportunities');
      } finally {
        setLoading(false);
      }
    };

    fetchOpportunity();
  }, [id, navigate]);

  const initiateApply = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (user.role !== 'student') {
      toast.error('Only students can apply for internships');
      return;
    }

    setShowApplyModal(true);
  };

  const handleConfirmApply = async (coverLetter: string) => {
    if (!opportunity) return;

    try {
      await internshipService.applyForInternship(opportunity.id, coverLetter);
      toast.success('Application submitted successfully!');
      
      // Update local state
      setOpportunity(prev => prev ? { ...prev, student_has_applied: true } : null);
    } catch (error: any) {
      console.error('Application failed', error);
      throw error;
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: opportunity?.title,
          text: `Check out this internship at ${opportunity?.employer_details?.name}`,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!opportunity) return null;

  return (
    <div className="bg-light min-vh-100 pb-5">
      {/* Header / Breadcrumb */}
      <div className="bg-white border-bottom py-3">
        <div className="container">
          <button 
            onClick={() => navigate('/opportunities')}
            className="btn btn-link text-decoration-none p-0 d-flex align-items-center text-muted"
          >
            <ArrowLeft size={18} className="me-2" />
            Back to Opportunities
          </button>
        </div>
      </div>

      <div className="container py-4">
        <div className="row g-4">
          {/* Main Content */}
          <div className="col-lg-8">
            <div className="bg-white rounded-3 shadow-sm p-4 mb-4">
              <div className="d-flex justify-content-between align-items-start mb-4">
                <div className="d-flex gap-3">
                  <div className="bg-light rounded p-3 d-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px' }}>
                    {opportunity.employer_details?.logo ? (
                      <img 
                        src={opportunity.employer_details.logo} 
                        alt={opportunity.employer_details.name} 
                        className="img-fluid"
                      />
                    ) : (
                      <Building2 size={40} className="text-secondary" />
                    )}
                  </div>
                  <div>
                    <h1 className="h2 fw-bold mb-2">{opportunity.title}</h1>
                    <div className="d-flex align-items-center text-muted flex-wrap gap-2">
                      <span className="fw-medium text-primary fs-5">{opportunity.employer_details?.name || 'Company Name'}</span>
                      <span className="text-muted">•</span>
                      <span className="badge bg-light text-dark border">{opportunity.department || 'General'}</span>
                      {opportunity.employer_details?.is_featured && (
                         <span className="badge bg-success-subtle text-success border border-success-subtle">Verified Employer</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary btn-sm p-2 rounded-circle" title="Share" onClick={handleShare}>
                    <Share2 size={20} />
                  </button>
                </div>
              </div>

              <div className="d-flex flex-wrap gap-4 mb-4 pb-4 border-bottom">
                <div className="d-flex align-items-center text-muted">
                  <div className="bg-light p-2 rounded-circle me-2">
                    <MapPin size={20} className="text-primary" />
                  </div>
                  <div>
                    <div className="small fw-bold text-uppercase text-muted" style={{fontSize: '0.75rem'}}>Location</div>
                    <div className="fw-medium text-dark">{opportunity.location} ({opportunity.location_type})</div>
                  </div>
                </div>
                <div className="d-flex align-items-center text-muted">
                  <div className="bg-light p-2 rounded-circle me-2">
                    <Briefcase size={20} className="text-info" />
                  </div>
                  <div>
                    <div className="small fw-bold text-uppercase text-muted" style={{fontSize: '0.75rem'}}>Duration</div>
                    <div className="fw-medium text-dark">{opportunity.duration || 'Flexible'}</div>
                  </div>
                </div>
                <div className="d-flex align-items-center text-muted">
                  <div className="bg-light p-2 rounded-circle me-2">
                    <Users size={20} className="text-warning" />
                  </div>
                  <div>
                    <div className="small fw-bold text-uppercase text-muted" style={{fontSize: '0.75rem'}}>Openings</div>
                    <div className="fw-medium text-dark">{opportunity.capacity} Spots</div>
                  </div>
                </div>
                {opportunity.application_deadline && (
                  <div className="d-flex align-items-center text-muted">
                    <div className="bg-light p-2 rounded-circle me-2">
                      <Clock size={20} className="text-danger" />
                    </div>
                    <div>
                      <div className="small fw-bold text-uppercase text-muted" style={{fontSize: '0.75rem'}}>Deadline</div>
                      <div className="fw-medium text-danger">{new Date(opportunity.application_deadline).toLocaleDateString()}</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-5">
                <h4 className="fw-bold mb-3">About the Internship</h4>
                <div className="text-secondary lh-lg" style={{ whiteSpace: 'pre-line' }}>
                  {opportunity.description}
                </div>
              </div>

              <div className="mb-4">
                <h4 className="fw-bold mb-3">Required Skills</h4>
                <div className="d-flex flex-wrap gap-2">
                  {opportunity.skills?.map(skill => (
                    <span key={skill} className="badge bg-primary bg-opacity-10 text-primary px-3 py-2 fw-medium fs-6">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="col-lg-4">
            <div className="bg-white rounded-3 shadow-sm p-4 sticky-top" style={{ top: '20px' }}>
              <h5 className="fw-bold mb-4">Application Summary</h5>
              
              <div className="d-grid gap-3 mb-4">
                <button 
                  className={`btn btn-lg ${opportunity.student_has_applied ? 'btn-success' : 'btn-primary'}`}
                  onClick={initiateApply}
                  disabled={opportunity.student_has_applied}
                >
                  {opportunity.student_has_applied ? 'Applied' : 'Apply Now'}
                </button>
                {opportunity.student_has_applied && (
                  <div className="alert alert-success d-flex align-items-center mb-0 p-2 small">
                    <CheckCircle2 size={16} className="me-2" />
                    You have applied for this position
                  </div>
                )}
              </div>

              <div className="small text-muted mb-4">
                <p className="mb-2">
                  <strong>Note:</strong> Make sure your profile and CV are up to date before applying.
                </p>
              </div>

              <hr />

              <div className="mt-4">
                <h6 className="fw-bold mb-3">About {opportunity.employer_details?.name}</h6>
                <p className="small text-muted mb-0">
                  {opportunity.employer_details?.organization_type || 'Organization'} based in {opportunity.location}.
                  {opportunity.employer_details?.is_featured && (
                    <span className="badge bg-success ms-2">Verified Employer</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ApplyModal 
        show={showApplyModal}
        onHide={() => setShowApplyModal(false)}
        onConfirm={handleConfirmApply}
        title={opportunity.title}
        employerName={opportunity.employer_details?.name}
      />

      <LoginRequiredModal 
        show={showLoginModal}
        onHide={() => setShowLoginModal(false)}
      />
    </div>
  );
};

export default OpportunityDetails;
