import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  CheckCircle, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import StudentHeader from '../../components/dashboard/StudentHeader';
import StudentSidebar from '../../components/dashboard/StudentSidebar';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { studentService } from '../../services/student/studentService';
import type { Affiliation, Institution } from '../../services/student/studentService';
import StudentAffiliationSkeleton from '../../components/student/skeletons/StudentAffiliationSkeleton';

const StudentAffiliation: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [affiliations, setAffiliations] = useState<Affiliation[]>([]);
  const [studentId, setStudentId] = useState('');
  
  // Search State
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Institution[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profile = await studentService.getProfile();
        setStudentId(profile.id);
        const data = await studentService.getAffiliations(profile.id);
        setAffiliations(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load affiliation status.");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (val.length < 3) {
      setSearchResults([]);
      return;
    }
    
    try {
      setIsSearching(true);
      const results = await studentService.searchInstitutions(val);
      setSearchResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClaim = async () => {
    if (!selectedInstitution || !studentId) return;
    
    try {
      setClaiming(true);
      await studentService.claimAffiliation(studentId, selectedInstitution.id);
      // Refresh
      const data = await studentService.getAffiliations(studentId);
      setAffiliations(data);
      setSelectedInstitution(null);
      setQuery('');
      setSearchResults([]);
    } catch (err) {
      console.error(err);
      setError("Failed to claim affiliation.");
    } finally {
      setClaiming(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
      case 'verified':
        return <span className="badge bg-success">Verified</span>;
      case 'pending':
        return <span className="badge bg-warning text-dark">Pending Verification</span>;
      case 'rejected':
        return <span className="badge bg-danger">Rejected</span>;
      default:
        return <span className="badge bg-secondary">{status}</span>;
    }
  };

  const renderContent = () => {
    if (loading) return <StudentAffiliationSkeleton isDarkMode={isDarkMode} />;

    // Check for active or pending affiliations
    const currentAffiliation = affiliations.find(a => 
      a.status === 'approved' || a.status === 'pending' || a.status === 'verified'
    );
    
    // Also check for rejected ones to show history/status
    const rejectedAffiliations = affiliations.filter(a => a.status === 'rejected');

    if (currentAffiliation) {
      return (
        <div className={`card mb-4 ${isDarkMode ? 'bg-dark border-secondary' : 'bg-white'}`}>
          <div className="card-body p-5 text-center">
            {currentAffiliation.status === 'approved' || currentAffiliation.status === 'verified' ? (
              <CheckCircle size={64} className="text-success mb-3" />
            ) : (
              <Clock size={64} className="text-warning mb-3" />
            )}
            
            <h2 className={`mb-3 ${isDarkMode ? 'text-white' : ''}`}>
              {currentAffiliation.institution_name || currentAffiliation.institution?.name}
            </h2>
            
            <div className="mb-4">
              {getStatusBadge(currentAffiliation.status)}
            </div>

            {currentAffiliation.status === 'pending' && (
              <p className={isDarkMode ? 'text-light opacity-75' : 'text-muted'}>
                Your request has been sent to the institution admin. You will be notified once they verify your student status.
              </p>
            )}

            {currentAffiliation.status === 'approved' && (
              <p className={isDarkMode ? 'text-light opacity-75' : 'text-muted'}>
                You are a verified student of this institution. This badge increases your trust score with employers.
              </p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className={`card mb-4 ${isDarkMode ? 'bg-dark border-secondary' : 'bg-white'}`}>
            <div className="card-body p-4">
              <div className="text-center mb-4">
                <Building2 size={48} className={`mb-3 ${isDarkMode ? 'text-info' : 'text-primary'}`} />
                <h3 className={`fw-bold ${isDarkMode ? 'text-white' : ''}`}>Claim Your Institution</h3>
                <p className={isDarkMode ? 'text-light opacity-75' : 'text-muted'}>
                  Search for your university or college to verify your student status.
                </p>
              </div>

              {error && (
                <div className="alert alert-danger d-flex align-items-center">
                  <AlertCircle size={18} className="me-2" />
                  {error}
                </div>
              )}

              {rejectedAffiliations.length > 0 && (
                <div className="alert alert-warning mb-4">
                  <strong>Previous request rejected:</strong>
                  <ul className="mb-0 mt-2">
                    {rejectedAffiliations.map(a => (
                      <li key={a.id}>
                        {a.institution_name || a.institution?.name} - {a.review_notes || 'No reason provided'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mb-4 position-relative">
                <div className="input-group input-group-lg">
                  <span className={`input-group-text ${isDarkMode ? 'bg-secondary border-secondary text-light' : 'bg-light'}`}>
                    <Search size={20} />
                  </span>
                  <input
                    type="text"
                    className={`form-control ${isDarkMode ? 'bg-dark border-secondary text-white' : ''}`}
                    placeholder="Search institution name..."
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                  {isSearching && (
                    <div className="position-absolute end-0 top-50 translate-middle-y me-3">
                      <div className="spinner-border spinner-border-sm text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  )}
                </div>
                
                {searchResults.length > 0 && !selectedInstitution && (
                  <div className={`list-group mt-2 position-absolute w-100 shadow-sm ${isDarkMode ? 'bg-dark' : 'bg-white'}`} style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                    {searchResults.map(inst => (
                      <button
                        key={inst.id}
                        className={`list-group-item list-group-item-action ${isDarkMode ? 'bg-dark text-white border-secondary' : ''}`}
                        onClick={() => {
                          setSelectedInstitution(inst);
                          setQuery(inst.name);
                          setSearchResults([]);
                        }}
                      >
                        {inst.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedInstitution && (
                <div className={`alert ${isDarkMode ? 'alert-dark border-secondary' : 'alert-light'} mb-4`}>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <small className="text-muted d-block">Selected Institution</small>
                      <strong>{selectedInstitution.name}</strong>
                    </div>
                    <button 
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => {
                        setSelectedInstitution(null);
                        setQuery('');
                      }}
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}

              <button 
                className="btn btn-primary w-100 btn-lg"
                disabled={!selectedInstitution || claiming}
                onClick={handleClaim}
              >
                {claiming ? 'Submitting...' : 'Claim Affiliation'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-vh-100 ${isDarkMode ? 'text-white' : 'bg-light'}`} style={{ backgroundColor: isDarkMode ? '#0f172a' : undefined }}>
      {/* Sidebar & Mobile Menu */}
      {isMobileMenuOpen && (
        <div 
          className="d-lg-none position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50" 
          style={{ zIndex: 1039 }}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      <div className={`${isMobileMenuOpen ? 'd-block' : 'd-none'} d-lg-block position-fixed top-0 start-0 h-100 d-flex flex-column`} style={{ zIndex: 1040, width: '280px' }}>
        <StudentSidebar isDarkMode={isDarkMode} />
      </div>

      <div 
        className="d-flex flex-column min-vh-100 overflow-auto main-content-margin"
        onClick={isMobileMenuOpen ? () => setIsMobileMenuOpen(false) : undefined}
      >
        <style>{`
          .main-content-margin {
            margin-left: 0;
            max-width: 100vw;
          }
          @media (min-width: 992px) {
            .main-content-margin {
              margin-left: 280px !important;
              max-width: calc(100vw - 280px) !important;
            }
          }
        `}</style>
        
        <div className="px-4 px-lg-5 pt-4">
          <StudentHeader
            onMobileMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            isMobileMenuOpen={isMobileMenuOpen}
          />
        </div>

        <div className="flex-grow-1 px-4 px-lg-5 pb-4">
          <h1 className={`display-6 fw-bold mb-4 ${isDarkMode ? 'text-info' : ''}`}>
            Institution Affiliation
          </h1>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default StudentAffiliation;