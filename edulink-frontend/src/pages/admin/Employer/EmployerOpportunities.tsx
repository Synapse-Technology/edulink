import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Search, MapPin, Calendar, Users, Briefcase } from 'lucide-react';
import { FeedbackModal } from '../../../components/common';
import { useFeedbackModal } from '../../../hooks/useFeedbackModal';
import { EmployerLayout } from '../../../components/admin/employer';
import { employerService } from '../../../services/employer/employerService';
import { internshipService } from '../../../services/internship/internshipService';
import type { InternshipOpportunity } from '../../../services/internship/internshipService';
import CreateInternshipModal from '../../../components/dashboard/institution/CreateInternshipModal';
import InternshipDetailsModal from '../../../components/dashboard/InternshipDetailsModal';

const EmployerOpportunities: React.FC = () => {
  const [opportunities, setOpportunities] = useState<InternshipOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedInternship, setSelectedInternship] = useState<InternshipOpportunity | null>(null);
  const [employerId, setEmployerId] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
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
        if (employer) {
          setEmployerId(employer.id);
        }
      } catch (err) {
        console.error("Failed to fetch employer context", err);
      }
    };
    fetchEmployerId();
  }, []);

  useEffect(() => {
    fetchOpportunities();
  }, [statusFilter]);

  const fetchOpportunities = async () => {
    try {
      setIsLoading(true);
      const allInternships = await internshipService.getInternships({
        status: statusFilter || undefined
      });
      setOpportunities(allInternships);
    } catch (error) {
      console.error('Failed to fetch opportunities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOpportunities = opportunities.filter(opp => 
    opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    opp.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    opp.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePublish = async (id: string) => {
      try {
          await internshipService.publishOpportunity(id);
          fetchOpportunities();
      } catch (error: any) {
          console.error('Failed to publish:', error);
          showError(
            'Publish Failed',
            'We encountered an error while trying to publish this opportunity.',
            error.response?.data?.error || error.message
          );
      }
  };

  return (
    <EmployerLayout>
      <div className="container-fluid p-0">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold text-dark mb-1">My Opportunities</h2>
            <p className="text-muted mb-0">Manage your internship listings and track their status.</p>
          </div>
          <button 
            className="btn btn-primary d-flex align-items-center"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={20} className="me-2" />
            Post New Opportunity
          </button>
        </div>

        {/* Filters and Search */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-4">
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">
                    <Search size={18} className="text-muted" />
                  </span>
                  <input 
                    type="text" 
                    className="form-control border-start-0 bg-light" 
                    placeholder="Search opportunities..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="col-md-3">
                <select 
                  className="form-select bg-light"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="OPEN">Open</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Opportunities List */}
        <div className="row">
          {isLoading ? (
            <div className="container-fluid p-0">
               <div className="row">
                {[1, 2, 3].map(i => (
                  <div key={i} className="col-12 mb-3">
                    <div className="card border-0 shadow-sm">
                      <div className="card-body">
                        <div className="d-flex justify-content-between">
                          <div className="d-flex flex-grow-1">
                            <div className="skeleton skeleton-icon me-3"></div>
                            <div className="flex-grow-1">
                              <div className="skeleton skeleton-title mb-2"></div>
                              <div className="d-flex gap-3 mb-2">
                                <div className="skeleton skeleton-text" style={{ width: '100px' }}></div>
                                <div className="skeleton skeleton-text" style={{ width: '80px' }}></div>
                                <div className="skeleton skeleton-text" style={{ width: '100px' }}></div>
                              </div>
                              <div className="d-flex gap-2">
                                <div className="skeleton skeleton-badge"></div>
                                <div className="skeleton skeleton-badge"></div>
                              </div>
                            </div>
                          </div>
                          <div className="d-flex flex-column align-items-end justify-content-between">
                            <div className="skeleton skeleton-badge mb-3"></div>
                            <div className="d-flex gap-2">
                              <div className="skeleton skeleton-button-sm"></div>
                              <div className="skeleton skeleton-button-sm"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <style>{`
                .skeleton {
                  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                  background-size: 200% 100%;
                  animation: loading 1.5s infinite;
                  border-radius: 4px;
                }
                .skeleton-title { height: 24px; width: 200px; }
                .skeleton-text { height: 16px; }
                .skeleton-icon { height: 60px; width: 60px; border-radius: 8px; }
                .skeleton-badge { height: 24px; width: 80px; border-radius: 12px; }
                .skeleton-button-sm { height: 30px; width: 80px; }
                @keyframes loading {
                  0% { background-position: 200% 0; }
                  100% { background-position: -200% 0; }
                }
              `}</style>
            </div>
          ) : filteredOpportunities.length === 0 ? (
            <div className="col-12">
              <div className="card border-0 shadow-sm text-center py-5">
                <div className="card-body">
                  <div className="bg-light rounded-circle d-inline-flex p-4 mb-3">
                    <Briefcase size={32} className="text-muted" />
                  </div>
                  <h5>No opportunities found</h5>
                  <p className="text-muted mb-3">
                    {searchQuery || statusFilter 
                      ? "No opportunities match your current filters." 
                      : "Get started by posting your first internship opportunity."}
                  </p>
                  <button 
                    className="btn btn-outline-primary"
                    onClick={() => setShowCreateModal(true)}
                  >
                    Post Opportunity
                  </button>
                </div>
              </div>
            </div>
          ) : (
            filteredOpportunities.map(opp => (
              <div key={opp.id} className="col-12 mb-3">
                <div className="card border-0 shadow-sm">
                  <div className="card-body">
                    <div className="d-flex justify-content-between">
                      <div className="d-flex">
                        <div className="bg-primary bg-opacity-10 rounded p-3 me-3 d-flex align-items-center justify-content-center" style={{width: '60px', height: '60px'}}>
                          <Briefcase size={24} className="text-primary" />
                        </div>
                        <div>
                          <h5 className="fw-bold mb-1">{opp.title}</h5>
                          <div className="d-flex flex-wrap gap-3 text-muted small mb-2">
                            <span className="d-flex align-items-center">
                              <MapPin size={14} className="me-1" />
                              {opp.location_type === 'ONSITE' ? opp.location : opp.location_type}
                            </span>
                            <span className="d-flex align-items-center">
                              <Users size={14} className="me-1" />
                              {opp.capacity} Positions
                            </span>
                            <span className="d-flex align-items-center">
                              <Calendar size={14} className="me-1" />
                              {opp.created_at ? new Date(opp.created_at).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                          <div className="d-flex gap-2">
                            {opp.skills.map((skill, idx) => (
                              <span key={idx} className="badge bg-light text-secondary border">{skill}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-end">
                        <span className={`badge mb-3 ${
                          opp.status === 'OPEN' ? 'bg-success' : 
                          opp.status === 'DRAFT' ? 'bg-secondary' : 'bg-dark'
                        }`}>
                          {opp.status}
                        </span>
                        <div className="d-flex gap-2 justify-content-end">
                          {opp.status === 'DRAFT' && (
                              <button 
                                className="btn btn-sm btn-success"
                                onClick={() => handlePublish(opp.id)}
                              >
                                Publish
                              </button>
                          )}
                          <button 
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => navigate(`/employer/dashboard/opportunities/${opp.id}`)}
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
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
