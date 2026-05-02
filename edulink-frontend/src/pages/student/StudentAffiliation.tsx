import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  FileCheck,
  Plus,
  Loader
} from 'lucide-react';
import StudentLayout from '../../components/dashboard/StudentLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { studentService } from '../../services/student/studentService';
import { institutionService } from '../../services/institution/institutionService';
import { showToast } from '../../utils/toast';
import type { Affiliation, Institution } from '../../services/student/studentService';
import StudentAffiliationSkeleton from '../../components/student/skeletons/StudentAffiliationSkeleton';
import AffiliationDocumentUploader from '../../components/student/AffiliationDocumentUploader';
import { getUserFacingErrorMessage } from '../../utils/userFacingErrors';
import '../../styles/student-portal.css';

const StudentAffiliation: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
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

  // Onboarding Modal State
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [universityName, setUniversityName] = useState('');
  const [isSubmittingOnboarding, setIsSubmittingOnboarding] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState<'idle' | 'success' | 'error' | 'duplicate'>('idle');
  const [submittedRequests, setSubmittedRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profile = await studentService.getProfile();
        setStudentId(profile.id);
        const data = await studentService.getAffiliations(profile.id);
        setAffiliations(data);
      } catch (err) {
        console.error('Failed to load affiliations:', err);
        showToast.error('Failed to load affiliation status.');
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
    setError(null);
    
    if (val.length < 2) {
      setSearchResults([]);
      return;
    }
    
    try {
      setIsSearching(true);
      const results = await studentService.searchInstitutions(val);
      setSearchResults(results);
      
      // If no results, show tooltip hint
      if (results.length === 0) {
        // Don't show error, just keep it empty to show request button
      }
    } catch (err) {
      console.error('Search failed:', err);
      setError('Search failed. Please try again.');
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
      showToast.success('Affiliation claimed successfully!');
    } catch (err: any) {
      console.error(err);
      const errorMsg = getUserFacingErrorMessage(err?.message, err?.status) || 'We could not submit your affiliation claim. Please try again.';
      setError(errorMsg);
      showToast.error(errorMsg);
    } finally {
      setClaiming(false);
    }
  };

  const handleOnboardingSubmit = async () => {
    const normalizedName = universityName.trim().toLowerCase();
    
    // Check for duplicate submission
    if (submittedRequests.has(normalizedName)) {
      setOnboardingStatus('duplicate');
      showToast.info(`You've already requested to add "${universityName}" to Edulink.`);
      setTimeout(() => {
        setShowOnboardingModal(false);
        setUniversityName('');
        setOnboardingStatus('idle');
      }, 2000);
      return;
    }

    if (!universityName.trim()) return;

    setIsSubmittingOnboarding(true);
    setOnboardingStatus('idle');

    try {
      await institutionService.recordInterest({
        raw_name: universityName.trim(),
        user_email: user?.email || '',
        email_domain: user?.email?.split('@')[1] || '',
      });

      // Add to submitted requests to prevent duplicates
      setSubmittedRequests(prev => new Set([...prev, normalizedName]));
      
      setOnboardingStatus('success');
      setUniversityName('');
      
      // Close modal after 2.5 seconds on success
      setTimeout(() => {
        setShowOnboardingModal(false);
        setOnboardingStatus('idle');
      }, 2500);

    } catch (error: any) {
      console.error('Failed to record institution interest:', error);
      setOnboardingStatus('error');
    } finally {
      setIsSubmittingOnboarding(false);
    }
  };

  const getStatusBadge = (affiliation: Affiliation) => {
    const { status, claimed_via } = affiliation;
    
    if (status === 'approved' || status === 'verified') {
      if (claimed_via === 'domain') {
        return (
          <span className="badge bg-success">
            <CheckCircle size={14} className="me-1" style={{ display: 'inline' }} />
            Auto-Verified
          </span>
        );
      }
      return (
        <span className="badge bg-success">
          <CheckCircle size={14} className="me-1" style={{ display: 'inline' }} />
          Verified
        </span>
      );
    }
    
    if (status === 'pending') {
      if (affiliation.verification_document_url) {
        return (
          <span className="badge bg-info">
            <FileCheck size={14} className="me-1" style={{ display: 'inline' }} />
            Document Submitted
          </span>
        );
      }
      return (
        <span className="badge bg-warning text-dark">
          <Clock size={14} className="me-1" style={{ display: 'inline' }} />
          Pending Review
        </span>
      );
    }
    
    if (status === 'rejected') {
      return <span className="badge bg-danger">Rejected</span>;
    }
    
    return <span className="badge bg-secondary">{status}</span>;
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
      const isAutoVerified = currentAffiliation.claimed_via === 'domain';
      const isPending = currentAffiliation.status === 'pending';
      const hasDocument = !!currentAffiliation.verification_document_url;
      const isVerified = currentAffiliation.status === 'approved' || currentAffiliation.status === 'verified';

      return (
        <div className="student-workspace-grid">
          <main>
            <section className="student-surface">
              <div className="student-surface-body">
                <div className="student-surface-header">
                  <div>
                    <h2>
                  {currentAffiliation.institution_name || currentAffiliation.institution?.name}
                    </h2>
                    <p className="student-muted mb-0">
                      {isVerified ? 'Your student status is trusted for applications and placement workflows.' : 'Your institution claim is moving through verification.'}
                    </p>
                  </div>
                  <div>{getStatusBadge(currentAffiliation)}</div>
                </div>

                {isAutoVerified && (
                  <div className={`d-flex align-items-start gap-2 ${isDarkMode ? 'text-light opacity-75' : 'text-muted'}`}>
                    <CheckCircle size={18} className="text-success flex-shrink-0 mt-1" />
                    <p className="mb-0">
                      Your student status was automatically verified using your institutional email. You can now apply for internships.
                    </p>
                  </div>
                )}

                {isPending && !hasDocument && (
                  <p className={isDarkMode ? 'text-light opacity-75' : 'text-muted'}>
                    Your affiliation claim is pending review. Please upload a verification document below to help speed up the process.
                  </p>
                )}

                {isPending && hasDocument && (
                  <p className={isDarkMode ? 'text-light opacity-75' : 'text-muted'}>
                    Your verification document has been submitted. The institution admin will review and approve it shortly.
                  </p>
                )}

                {isVerified && !isAutoVerified && (
                  <div className={`d-flex align-items-start gap-2 ${isDarkMode ? 'text-light opacity-75' : 'text-muted'}`}>
                    <CheckCircle size={18} className="text-success flex-shrink-0 mt-1" />
                    <p className="mb-0">
                      Your student status has been verified by the institution admin. You can now apply for internships.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </main>

          <aside>
            <section className="student-surface">
              <div className="student-surface-body">
                <div className="student-surface-header">
                  <div>
                    <h2>Verification Stage</h2>
                    <p className="student-muted mb-0">Where this claim currently stands.</p>
                  </div>
                </div>
                <div className="student-evidence-rail">
                  <div className="student-evidence-row">
                    <div className={`student-evidence-icon ${isVerified ? 'success' : 'warn'}`}>
                      {isVerified ? <CheckCircle size={18} /> : <Clock size={18} />}
                    </div>
                    <div>
                      <strong>{isVerified ? 'Verified' : 'Pending review'}</strong>
                      <span>{hasDocument ? 'Document submitted for review.' : 'Document may be required.'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </aside>

            {/* Document Uploader for Pending Affiliations */}
            {isPending && !hasDocument && (
              <div className="student-workspace-grid" style={{ gridColumn: '1 / -1' }}>
                <main>
                <AffiliationDocumentUploader
                  studentId={studentId}
                  affiliationId={currentAffiliation.id}
                  onSuccess={(updated) => {
                    setAffiliations(affiliations.map(a => 
                      a.id === updated.id ? updated : a
                    ));
                  }}
                  isDarkMode={isDarkMode}
                />
                </main>
              </div>
            )}

            {/* Document Status Display */}
            {isPending && hasDocument && (
              <div className="mt-4">
                <div className={`alert alert-info d-flex align-items-start ${isDarkMode ? 'bg-info bg-opacity-10 border-info' : ''}`}>
                  <FileCheck size={20} className="me-3 flex-shrink-0 mt-1" />
                  <div>
                    <strong>Document Submitted</strong>
                    <p className="mb-0 small mt-1">
                      Your verification document was uploaded on{' '}
                      {currentAffiliation.verification_document_uploaded_at 
                        ? new Date(currentAffiliation.verification_document_uploaded_at).toLocaleDateString()
                        : 'recently'}.
                      {' '}The institution admin will review it soon.
                    </p>
                  </div>
                </div>
              </div>
            )}
        </div>
      );
    }

    return (
      <div className="student-workspace-grid">
        <main>
          <section className="student-surface">
            <div className="student-surface-body">
              <div className="student-surface-header">
                <div>
                  <h2>Claim Your Institution</h2>
                  <p className={isDarkMode ? 'text-light opacity-75 mb-0' : 'text-muted mb-0'}>
                  Search for your university or college to verify your student status.
                </p>
                </div>
                <Building2 size={28} className={isDarkMode ? 'text-info' : 'text-primary'} />
              </div>

              {error && (
                <div className="alert alert-danger d-flex align-items-center mb-4">
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

              <div className="mb-4">
                <div className="input-group input-group-lg position-relative">
                  <span className={`input-group-text ${isDarkMode ? 'bg-secondary border-secondary text-light' : 'bg-light'}`}>
                    <Search size={20} />
                  </span>
                  <input
                    type="text"
                    className={`form-control ${isDarkMode ? 'bg-dark border-secondary text-white' : ''}`}
                    placeholder="Search institution name... (minimum 2 characters)"
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    autoComplete="off"
                  />
                  {isSearching && (
                    <div className="position-absolute end-0 top-50 translate-middle-y me-3">
                      <Loader size={20} className="text-primary spinner" style={{ animation: 'spin 1s linear infinite' }} />
                    </div>
                  )}
                </div>
                
                <style>{`
                  @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                  }
                  .spinner {
                    animation: spin 1s linear infinite !important;
                  }
                `}</style>

                {/* Searching Indicator */}
                {query.length >= 2 && isSearching && (
                  <div className={`mt-3 p-3 d-flex align-items-center rounded-2 ${
                    isDarkMode 
                      ? 'bg-info bg-opacity-10 border border-info' 
                      : 'bg-info bg-opacity-10 border border-info'
                  }`}>
                    <Loader size={18} className="text-info me-2" style={{ animation: 'spin 1s linear infinite' }} />
                    <small className={isDarkMode ? 'text-info' : 'text-info'}>
                      Searching for universities...
                    </small>
                  </div>
                )}

                {/* Search Results Dropdown */}
                {query.length >= 2 && searchResults.length > 0 && !selectedInstitution && (
                  <div 
                    className={`mt-2 rounded-3 shadow-sm ${isDarkMode ? 'bg-dark border border-secondary' : 'bg-white'}`}
                    style={{ maxHeight: '300px', overflowY: 'auto', zIndex: 1000 }}
                  >
                    <div className={`list-group list-group-flush ${isDarkMode ? 'bg-dark' : ''}`}>
                      {searchResults.map((inst) => (
                        <button
                          key={inst.id}
                          type="button"
                          className={`list-group-item list-group-item-action d-flex align-items-center gap-3 py-3 px-4 ${
                            isDarkMode ? 'bg-dark text-white border-secondary hover-effect' : 'border-bottom'
                          }`}
                          onClick={() => {
                            setSelectedInstitution(inst);
                            setQuery(inst.name);
                            setSearchResults([]);
                            setError(null);
                          }}
                          style={{
                            transition: 'all 0.2s ease',
                            borderBottom: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : undefined
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.05)' : '#f8f9fa';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = isDarkMode ? '#0f172a' : 'white';
                          }}
                        >
                          <Building2 size={18} className={isDarkMode ? 'text-info' : 'text-primary'} />
                          <div className="text-start">
                            <div className="fw-semibold">{inst.name}</div>
                            {inst.domain && <small className={isDarkMode ? 'text-light opacity-50' : 'text-muted'}>{inst.domain}</small>}
                          </div>
                          <CheckCircle size={18} className="ms-auto text-success opacity-0" style={{ transition: 'opacity 0.2s' }} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Results - Show Request Button */}
                {query.length >= 2 && searchResults.length === 0 && !isSearching && !selectedInstitution && (
                  <div className={`mt-4 p-4 rounded-3 text-center border-2 border-dashed ${
                    isDarkMode 
                      ? 'bg-dark border-secondary' 
                      : 'bg-light border-secondary'
                  }`}>
                    <AlertCircle size={32} className={`mb-3 ${isDarkMode ? 'text-warning' : 'text-warning'}`} />
                    <h5 className={isDarkMode ? 'text-white' : ''}>University Not Found</h5>
                    <p className={isDarkMode ? 'text-light opacity-75' : 'text-muted mb-3'}>
                      We couldn't find "{query}" in our onboarded universities. 
                    </p>
                    <p className={isDarkMode ? 'text-light opacity-75' : 'text-muted mb-4'}>
                      Want to get your university added to Edulink?
                    </p>
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-lg rounded-pill"
                      onClick={() => {
                        setUniversityName(query);
                        setShowOnboardingModal(true);
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
                    >
                      <Plus size={20} />
                      Request University Onboarding
                    </button>
                  </div>
                )}

                {/* Search Helper Text */}
                {query.length === 0 && (
                  <div className={`mt-3 p-3 rounded-2 ${
                    isDarkMode 
                      ? 'bg-info bg-opacity-10 border border-info' 
                      : 'bg-primary bg-opacity-10 border border-primary'
                  }`}>
                    <small className={isDarkMode ? 'text-info' : 'text-primary'}>
                      Tip: Start typing your university name to see suggestions (e.g., "University of", "Nairobi", etc.)
                    </small>
                  </div>
                )}
              </div>

              {selectedInstitution && (
                <div className={`alert d-flex justify-content-between align-items-center ${isDarkMode ? 'alert-dark border-secondary' : 'alert-light'} mb-4`}>
                  <div>
                    <small className={`d-block ${isDarkMode ? 'text-light opacity-75' : 'text-muted'}`}>Selected Institution</small>
                    <strong className={isDarkMode ? 'text-white' : ''}>{selectedInstitution.name}</strong>
                  </div>
                  <button 
                    className={`btn btn-sm ${isDarkMode ? 'btn-outline-light' : 'btn-outline-secondary'}`}
                    onClick={() => {
                      setSelectedInstitution(null);
                      setQuery('');
                    }}
                  >
                    Change
                  </button>
                </div>
              )}

              <button 
                className="btn btn-primary w-100 btn-lg rounded-pill fw-semibold"
                disabled={!selectedInstitution || claiming}
                onClick={handleClaim}
              >
                {claiming ? (
                  <>
                    <Loader size={18} className="me-2" style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                    Submitting...
                  </>
                ) : (
                  'Claim Affiliation'
                )}
              </button>
            </div>
          </section>
        </main>
      </div>
    );
  };

  return (
    <>
      <StudentLayout>
        <div className="student-workspace">
        <section className="student-command-hero">
          <div className="student-command-copy">
            <span className="student-kicker">Institution trust</span>
            <h1>Institution Affiliation</h1>
            <p>Connect your student record to your institution so applications, verification, and attachment workflows can move with trust.</p>
            <div className="student-command-meta">
              <span><Building2 size={15} /> Institution claim</span>
              <span><FileCheck size={15} /> Verification document</span>
              <span><CheckCircle size={15} /> Application trust</span>
            </div>
          </div>
          <div className="student-command-card">
            <span className="student-kicker">Claims</span>
            <strong>{affiliations.length}</strong>
            <p className="student-command-note">Approved affiliation unlocks trusted student workflows.</p>
          </div>
        </section>
        {renderContent()}
        </div>
      </StudentLayout>

      {/* University Onboarding Request Modal */}
      {showOnboardingModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          backdropFilter: 'blur(4px)',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: isDarkMode ? '#1a2332' : 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '440px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            {onboardingStatus === 'success' ? (
              <div className="animate-in fade-in zoom-in duration-300">
                <div style={{
                  width: '64px',
                  height: '64px',
                  backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  color: '#10b981'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <h3 style={{ 
                  marginBottom: '12px', 
                  color: isDarkMode ? '#e0e7ff' : '#111827', 
                  fontSize: '20px', 
                  fontWeight: '600',
                  textAlign: 'center'
                }}>Thank you!</h3>
                <p style={{ 
                  color: isDarkMode ? '#9ca3af' : '#4b5563', 
                  fontSize: '15px', 
                  lineHeight: '1.5',
                  textAlign: 'center'
                }}>
                  We've recorded your interest in {universityName}. Our team will look into adding your institution to Edulink.
                </p>
              </div>
            ) : (
              <>
                <h3 style={{ 
                  marginBottom: '16px', 
                  color: isDarkMode ? '#e0e7ff' : '#111827', 
                  fontSize: '20px', 
                  fontWeight: '600',
                  textAlign: 'left'
                }}>Help us expand!</h3>
                <p style={{ 
                  marginBottom: '20px', 
                  color: isDarkMode ? '#9ca3af' : '#4b5563', 
                  fontSize: '15px', 
                  lineHeight: '1.5',
                  textAlign: 'left'
                }}>
                  We couldn't find your institution in our system. Would you like to request that we add it to Edulink?
                </p>
                
                <div style={{ position: 'relative', marginBottom: '24px' }}>
                  <input
                    type="text"
                    placeholder="Enter your institution name"
                    value={universityName}
                    onChange={(e) => {
                      setUniversityName(e.target.value);
                      if (onboardingStatus === 'error' || onboardingStatus === 'duplicate') setOnboardingStatus('idle');
                    }}
                    disabled={isSubmittingOnboarding}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      border: (onboardingStatus === 'error' || onboardingStatus === 'duplicate') ? '2px solid #ef4444' : `1px solid ${isDarkMode ? '#374151' : '#d1d5db'}`,
                      borderRadius: '10px',
                      fontSize: '15px',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      backgroundColor: isSubmittingOnboarding ? (isDarkMode ? '#111827' : '#f9fafb') : (isDarkMode ? '#0f172a' : 'white'),
                      color: isDarkMode ? '#e0e7ff' : '#111827'
                    }}
                    onFocus={(e) => {
                      if (onboardingStatus !== 'error') e.currentTarget.style.borderColor = '#10b981';
                    }}
                    onBlur={(e) => {
                      if (onboardingStatus !== 'error') e.currentTarget.style.borderColor = isDarkMode ? '#374151' : '#d1d5db';
                    }}
                  />
                  {onboardingStatus === 'error' && (
                    <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px', textAlign: 'left', fontWeight: '500' }}>
                      Something went wrong. Please try again.
                    </p>
                  )}
                  {onboardingStatus === 'duplicate' && (
                    <p style={{ color: '#f59e0b', fontSize: '12px', marginTop: '6px', textAlign: 'left', fontWeight: '500' }}>
                      You've already submitted a request for this institution.
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowOnboardingModal(false);
                      setUniversityName('');
                      setOnboardingStatus('idle');
                      setQuery('');
                    }}
                    disabled={isSubmittingOnboarding}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '10px',
                      backgroundColor: isDarkMode ? '#1f2937' : 'white',
                      color: isDarkMode ? '#9ca3af' : '#374151',
                      cursor: isSubmittingOnboarding ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: `1px solid ${isDarkMode ? '#374151' : '#d1d5db'}`,
                      transition: 'all 0.2s',
                      opacity: isSubmittingOnboarding ? 0.7 : 1
                    }}
                  >
                    Maybe later
                  </button>
                  <button
                    type="button"
                    onClick={handleOnboardingSubmit}
                    disabled={isSubmittingOnboarding || !universityName.trim()}
                    style={{
                      padding: '10px 24px',
                      borderRadius: '10px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      cursor: (isSubmittingOnboarding || !universityName.trim()) ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s',
                      opacity: (isSubmittingOnboarding || !universityName.trim()) ? 0.7 : 1
                    }}
                  >
                    {isSubmittingOnboarding ? (
                      <>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTop: '2px solid white',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite'
                        }}></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Plus size={18} />
                        Request Onboarding
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .hover-effect:hover {
          background-color: rgba(17, 204, 173, 0.1) !important;
        }
      `}</style>
    </>
  );
};

export default StudentAffiliation;
