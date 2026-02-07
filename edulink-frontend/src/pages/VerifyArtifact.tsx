import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, FileText, Calendar, User, Hash, Clock, Download } from 'lucide-react';
import { apiClient } from '../services/api/client';

interface VerificationResult {
  verified: boolean;
  artifact_type: string;
  student_name: string;
  generated_at: string;
  ledger_hash: string;
  ledger_timestamp: string;
  tracking_code: string;
  error?: string;
}

const VerifyArtifact: React.FC = () => {
  const { artifactId } = useParams<{ artifactId: string }>();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (artifactId) {
      verifyArtifact(artifactId);
    }
  }, [artifactId]);

  const verifyArtifact = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<VerificationResult>(`/api/reports/artifacts/verify/${id}/`, {
        headers: { 'skip-auth': 'true' }
      });
      setResult(response);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to verify artifact. It may not exist or the ID is incorrect.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-light d-flex flex-column">
      {/* Header */}
      <header className="bg-white border-bottom py-3">
        <div className="container d-flex justify-content-between align-items-center">
          <Link to="/" className="text-decoration-none d-flex align-items-center gap-2">
            <div className="bg-primary rounded-3 p-1">
              <ShieldCheck className="text-white" size={24} />
            </div>
            <span className="fw-bold fs-4 text-dark" style={{ letterSpacing: '-0.5px' }}>EDULINK</span>
          </Link>
          <div className="text-muted small d-none d-md-block">
            Professional Artifact Verification System
          </div>
        </div>
      </header>

      <main className="flex-grow-1 py-5">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8 col-xl-7">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary mb-3" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="text-muted">Querying Edulink Ledger...</p>
                </div>
              ) : error ? (
                <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                  <div className="bg-danger py-4 text-center text-white">
                    <ShieldAlert size={48} className="mb-2" />
                    <h3 className="fw-bold mb-0">Verification Failed</h3>
                  </div>
                  <div className="card-body p-4 p-md-5 text-center">
                    <p className="lead text-muted mb-4">{error}</p>
                    <div className="d-grid gap-2 d-sm-flex justify-content-sm-center">
                      <Link to="/" className="btn btn-outline-secondary px-4 rounded-pill">Back to Home</Link>
                      <button onClick={() => artifactId && verifyArtifact(artifactId)} className="btn btn-primary px-4 rounded-pill">Try Again</button>
                    </div>
                  </div>
                </div>
              ) : result && result.verified ? (
                <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                  <div className="bg-success py-4 text-center text-white">
                    <ShieldCheck size={48} className="mb-2" />
                    <h3 className="fw-bold mb-0">Authenticity Verified</h3>
                    <p className="mb-0 opacity-75 small">This document is a legitimate Edulink artifact</p>
                  </div>
                  
                  <div className="card-body p-4 p-md-5">
                    <div className="row g-4 mb-5">
                      <div className="col-md-6">
                        <div className="d-flex align-items-start gap-3">
                          <div className="bg-light p-2 rounded-3 text-primary">
                            <User size={20} />
                          </div>
                          <div>
                            <div className="text-muted small text-uppercase fw-bold mb-1">Student Name</div>
                            <div className="fw-bold fs-5 text-dark">{result.student_name}</div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="d-flex align-items-start gap-3">
                          <div className="bg-light p-2 rounded-3 text-primary">
                            <FileText size={20} />
                          </div>
                          <div>
                            <div className="text-muted small text-uppercase fw-bold mb-1">Document Type</div>
                            <div className="fw-bold fs-5 text-dark">{result.artifact_type}</div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="d-flex align-items-start gap-3">
                          <div className="bg-light p-2 rounded-3 text-primary">
                            <Calendar size={20} />
                          </div>
                          <div>
                            <div className="text-muted small text-uppercase fw-bold mb-1">Generated On</div>
                            <div className="fw-bold text-dark">{new Date(result.generated_at).toLocaleDateString(undefined, { dateStyle: 'long' })}</div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="d-flex align-items-start gap-3">
                          <div className="bg-light p-2 rounded-3 text-primary">
                            <Clock size={20} />
                          </div>
                          <div>
                            <div className="text-muted small text-uppercase fw-bold mb-1">Ledger Timestamp</div>
                            <div className="fw-bold text-dark">{new Date(result.ledger_timestamp).toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-light rounded-4 p-4 border border-dashed mb-4">
                      <div className="d-flex align-items-center gap-2 mb-3">
                        <ShieldCheck size={18} className="text-primary" />
                        <span className="fw-bold text-dark">Verification Code</span>
                      </div>
                      <div className="bg-white p-3 rounded-3 border small text-break font-monospace text-dark fw-bold mb-2">
                        {result.tracking_code}
                      </div>
                      <p className="small text-muted mb-0">
                        Use this unique reference code to verify the authenticity of this document at any time through the official Edulink portal.
                      </p>
                    </div>

                    <div className="bg-light rounded-4 p-4 border border-dashed mb-4">
                      <div className="d-flex align-items-center gap-2 mb-3">
                        <Hash size={18} className="text-primary" />
                        <span className="fw-bold text-dark">Immutable Ledger Record</span>
                      </div>
                      <div className="bg-white p-3 rounded-3 border small text-break font-monospace text-muted mb-2">
                        {result.ledger_hash}
                      </div>
                      <p className="small text-muted mb-0">
                        This cryptographic signature provides a permanent, tamper-proof record of this document's issuance on the Edulink ledger.
                      </p>
                    </div>

                    <div className="d-grid gap-3 d-sm-flex align-items-center">
                      <button 
                        onClick={() => window.print()} 
                        className="btn btn-primary px-4 rounded-pill d-flex align-items-center justify-content-center gap-2"
                      >
                        <Download size={18} />
                        Print Verification
                      </button>
                      <Link to="/" className="text-muted text-decoration-none small hover-underline mx-auto mx-sm-0">
                        Learn more about Edulink Trust System
                      </Link>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-5 text-center">
                <p className="text-muted small mb-0">
                  &copy; {new Date().getFullYear()} Edulink Professional Platform. All rights reserved.
                  <br />
                  Secure Artifact Verification Protocol v1.0
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VerifyArtifact;
