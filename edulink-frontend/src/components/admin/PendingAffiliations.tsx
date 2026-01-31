import React, { useState, useEffect } from 'react';

interface StudentInstitutionAffiliation {
  id: string;
  student_id: string;
  institution_id: string;
  status: 'pending' | 'approved' | 'rejected';
  claimed_via: 'domain' | 'manual';
  reviewed_by: string | null;
  review_notes: string;
  institution_name: string;
  student_email: string;
  created_at: string;
  updated_at: string;
}

interface PendingAffiliationsProps {
  institutionId?: string;
}

const PendingAffiliations: React.FC<PendingAffiliationsProps> = ({ institutionId }) => {
  const [affiliations, setAffiliations] = useState<StudentInstitutionAffiliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchPendingAffiliations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let url = '/api/student-affiliations/pending/';
      if (institutionId) {
        url += `?institution_id=${institutionId}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch pending affiliations');
      }

      const data = await response.json();
      setAffiliations(data.pending_affiliations || data.results || data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (affiliationId: string, reviewNotes: string = '') => {
    try {
      setProcessingId(affiliationId);
      
      const response = await fetch(`/api/student-affiliations/${affiliationId}/approve/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ review_notes: reviewNotes }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve affiliation');
      }

      // Remove the approved affiliation from the list
      setAffiliations(prev => prev.filter(affiliation => affiliation.id !== affiliationId));
      
      // Show success message
      alert('Affiliation approved successfully!');
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Failed to approve affiliation'}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (affiliationId: string, reviewNotes: string = '') => {
    try {
      setProcessingId(affiliationId);
      
      const response = await fetch(`/api/student-affiliations/${affiliationId}/reject/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ review_notes: reviewNotes }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject affiliation');
      }

      // Remove the rejected affiliation from the list
      setAffiliations(prev => prev.filter(affiliation => affiliation.id !== affiliationId));
      
      // Show success message
      alert('Affiliation rejected successfully!');
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Failed to reject affiliation'}`);
    } finally {
      setProcessingId(null);
    }
  };

  useEffect(() => {
    fetchPendingAffiliations();
  }, [institutionId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div className="loading-spinner" style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }}></div>
        <p>Loading pending affiliations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#e74c3c' }}>
        <p>Error: {error}</p>
        <button 
          onClick={fetchPendingAffiliations}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (affiliations.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
        <p>No pending affiliations to review.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h3 style={{ marginBottom: '20px', color: '#2c3e50' }}>
        Pending Student Affiliations ({affiliations.length})
      </h3>
      
      <div style={{ display: 'grid', gap: '16px' }}>
        {affiliations.map((affiliation) => (
          <div key={affiliation.id} style={{
            backgroundColor: 'white',
            border: '1px solid #e1e8ed',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <h4 style={{ margin: '0 0 8px 0', color: '#2c3e50' }}>
                  {affiliation.student_email}
                </h4>
                <p style={{ margin: '0', color: '#7f8c8d', fontSize: '14px' }}>
                  Claims affiliation with: <strong>{affiliation.institution_name}</strong>
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  backgroundColor: affiliation.claimed_via === 'domain' ? '#e8f5e8' : '#e3f2fd',
                  color: affiliation.claimed_via === 'domain' ? '#27ae60' : '#1976d2',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  {affiliation.claimed_via === 'domain' ? 'Auto-detected' : 'Manual claim'}
                </span>
              </div>
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <p style={{ margin: '0', color: '#7f8c8d', fontSize: '12px' }}>
                Claimed on: {new Date(affiliation.created_at).toLocaleDateString()}
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleApprove(affiliation.id)}
                disabled={processingId === affiliation.id}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#27ae60',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: processingId === affiliation.id ? 'not-allowed' : 'pointer',
                  opacity: processingId === affiliation.id ? 0.6 : 1,
                  fontSize: '14px',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#229954'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#27ae60'}
              >
                {processingId === affiliation.id ? 'Processing...' : 'Approve'}
              </button>
              
              <button
                onClick={() => {
                  const notes = prompt('Enter rejection reason (optional):');
                  if (notes !== null) {
                    handleReject(affiliation.id, notes);
                  }
                }}
                disabled={processingId === affiliation.id}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: processingId === affiliation.id ? 'not-allowed' : 'pointer',
                  opacity: processingId === affiliation.id ? 0.6 : 1,
                  fontSize: '14px',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#c0392b'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#e74c3c'}
              >
                {processingId === affiliation.id ? 'Processing...' : 'Reject'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PendingAffiliations;