import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  FileText,
  Calendar,
  User,
  Clock,
  Printer,
  ChevronRight,
} from 'lucide-react';
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
      const response = await apiClient.get<VerificationResult>(
        `/api/reports/artifacts/verify/${id}/`,
        {
          headers: { 'skip-auth': 'true' },
        }
      );

      setResult(response);
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          'This artifact could not be verified.'
      );
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(undefined, {
      dateStyle: 'long',
    });
  };

  return (
    <div
      className="min-vh-100"
      style={{
        background: '#f7f8fa',
      }}
    >
      {/* Header */}
      <header
        className="border-bottom"
        style={{
          background: '#ffffff',
          borderColor: '#e9ecef',
        }}
      >
        <div className="container py-3">
          <div className="d-flex align-items-center justify-content-between">
            <Link
              to="/"
              className="text-decoration-none d-flex align-items-center gap-3"
            >
              <div
                className="d-flex align-items-center justify-content-center"
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: '#111827',
                }}
              >
                <ShieldCheck size={20} color="white" />
              </div>

              <div>
                <div
                  className="fw-semibold text-dark"
                  style={{
                    fontSize: '1rem',
                    letterSpacing: '-0.03em',
                  }}
                >
                  EduLink KE
                </div>

                <div
                  className="text-muted"
                  style={{
                    fontSize: '0.78rem',
                  }}
                >
                  Artifact Verification
                </div>
              </div>
            </Link>

            <div
              className="d-none d-md-flex align-items-center gap-2 text-muted"
              style={{ fontSize: '0.82rem' }}
            >
              <span>Secure Ledger Validation</span>
            </div>
          </div>
        </div>
      </header>

      <main className="py-5">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-xl-8 col-lg-9">

              {/* Loading */}
              {loading && (
                <div className="text-center py-5">
                  <div
                    className="spinner-border"
                    role="status"
                    style={{
                      width: '3rem',
                      height: '3rem',
                      borderWidth: '0.25rem',
                    }}
                  />
                  <p className="text-muted mt-4 mb-0">
                    Verifying artifact authenticity...
                  </p>
                </div>
              )}

              {/* Error */}
              {!loading && error && (
                <div
                  className="bg-white border rounded-4 p-5 text-center"
                  style={{
                    borderColor: '#e5e7eb',
                  }}
                >
                  <div
                    className="mx-auto mb-4 d-flex align-items-center justify-content-center"
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 20,
                      background: '#fef2f2',
                    }}
                  >
                    <ShieldAlert size={32} color="#dc2626" />
                  </div>

                  <h2
                    className="fw-semibold text-dark mb-3"
                    style={{
                      letterSpacing: '-0.04em',
                    }}
                  >
                    Verification Failed
                  </h2>

                  <p
                    className="text-muted mx-auto mb-4"
                    style={{
                      maxWidth: 460,
                    }}
                  >
                    {error}
                  </p>

                  <div className="d-flex justify-content-center gap-3 flex-wrap">
                    <button
                      onClick={() =>
                        artifactId && verifyArtifact(artifactId)
                      }
                      className="btn btn-dark px-4"
                      style={{
                        borderRadius: 12,
                        height: 46,
                      }}
                    >
                      Retry Verification
                    </button>

                    <Link
                      to="/"
                      className="btn btn-light px-4"
                      style={{
                        borderRadius: 12,
                        height: 46,
                        border: '1px solid #dee2e6',
                      }}
                    >
                      Return Home
                    </Link>
                  </div>
                </div>
              )}

              {/* Success */}
              {!loading && result?.verified && (
                <>
                  {/* Verification Status */}
                  <div
                    className="bg-white border rounded-4 p-4 p-lg-5 mb-4"
                    style={{
                      borderColor: '#e5e7eb',
                    }}
                  >
                    <div className="text-center mb-5">
                      <div
                        className="mx-auto mb-4 d-flex align-items-center justify-content-center"
                        style={{
                          width: 88,
                          height: 88,
                          borderRadius: 24,
                          background: '#ecfdf3',
                        }}
                      >
                        <ShieldCheck size={42} color="#16a34a" />
                      </div>

                      <div
                        className="d-inline-flex align-items-center gap-2 px-3 py-2 mb-4"
                        style={{
                          borderRadius: 999,
                          background: '#f0fdf4',
                          border: '1px solid #dcfce7',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          color: '#166534',
                        }}
                      >
                        VERIFIED AUTHENTIC DOCUMENT
                      </div>

                      <h1
                        className="fw-semibold text-dark mb-3"
                        style={{
                          fontSize: '2rem',
                          letterSpacing: '-0.06em',
                        }}
                      >
                        Artifact Successfully Verified
                      </h1>

                      <p
                        className="text-muted mx-auto mb-0"
                        style={{
                          maxWidth: 580,
                          lineHeight: 1.7,
                        }}
                      >
                        This document exists on the EduLink verification ledger
                        and has passed integrity validation checks.
                      </p>
                    </div>

                    {/* Main Grid */}
                    <div className="row g-4">

                      <div className="col-md-6">
                        <div className="border rounded-4 p-4 h-100">
                          <div className="d-flex align-items-start gap-3">
                            <User size={20} className="text-muted mt-1" />

                            <div>
                              <div className="text-muted small mb-2">
                                Student
                              </div>

                              <div className="fw-semibold text-dark fs-5">
                                {result.student_name}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="border rounded-4 p-4 h-100">
                          <div className="d-flex align-items-start gap-3">
                            <FileText size={20} className="text-muted mt-1" />

                            <div>
                              <div className="text-muted small mb-2">
                                Artifact Type
                              </div>

                              <div className="fw-semibold text-dark fs-5">
                                {result.artifact_type}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="border rounded-4 p-4 h-100">
                          <div className="d-flex align-items-start gap-3">
                            <Calendar size={20} className="text-muted mt-1" />

                            <div>
                              <div className="text-muted small mb-2">
                                Generated On
                              </div>

                              <div className="fw-medium text-dark">
                                {formatDate(result.generated_at)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="border rounded-4 p-4 h-100">
                          <div className="d-flex align-items-start gap-3">
                            <Clock size={20} className="text-muted mt-1" />

                            <div>
                              <div className="text-muted small mb-2">
                                Ledger Timestamp
                              </div>

                              <div className="fw-medium text-dark">
                                {new Date(
                                  result.ledger_timestamp
                                ).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Verification Metadata */}
                  <div
                    className="bg-white border rounded-4 p-4 p-lg-5 mb-4"
                    style={{
                      borderColor: '#e5e7eb',
                    }}
                  >
                    <div className="mb-4">
                      <h4
                        className="fw-semibold text-dark mb-2"
                        style={{
                          letterSpacing: '-0.04em',
                        }}
                      >
                        Verification Metadata
                      </h4>

                      <p className="text-muted mb-0">
                        Public authenticity references associated with this
                        artifact.
                      </p>
                    </div>

                    <div className="mb-4">
                      <div className="text-muted small mb-2">
                        Tracking Code
                      </div>

                      <div
                        className="border rounded-3 p-3 bg-light font-monospace fw-semibold"
                        style={{
                          wordBreak: 'break-word',
                        }}
                      >
                        {result.tracking_code}
                      </div>
                    </div>

                    <div>
                      <div className="text-muted small mb-2">
                        Ledger Signature
                      </div>

                      <div
                        className="border rounded-3 p-3 bg-light font-monospace small text-muted"
                        style={{
                          wordBreak: 'break-word',
                          lineHeight: 1.7,
                        }}
                      >
                        {result.ledger_hash}
                      </div>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="d-flex flex-column flex-md-row gap-3 align-items-center justify-content-between">
                    <button
                      onClick={() => window.print()}
                      className="btn btn-dark px-4 d-flex align-items-center gap-2"
                      style={{
                        borderRadius: 12,
                        height: 48,
                      }}
                    >
                      <Printer size={18} />
                      Print Verification
                    </button>

                    <Link
                      to="/trust-policy"
                      className="text-decoration-none text-dark fw-medium d-flex align-items-center gap-2"
                    >
                      Learn more about the trust policy
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                </>
              )}

              {/* Footer */}
              <div className="text-center mt-5 pt-3">
                <p
                  className="text-muted mb-0"
                  style={{
                    fontSize: '0.82rem',
                    lineHeight: 1.8,
                  }}
                >
                  © {new Date().getFullYear()} EduLink KE
                  <br />
                  Secure document authenticity infrastructure
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