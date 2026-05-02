import React, { useEffect, useState } from 'react';
import { Briefcase, CheckCircle, Clock, FileText, Upload } from 'lucide-react';
import StudentLayout from '../../components/dashboard/StudentLayout';
import { useAuth } from '../../contexts/AuthContext';
import { internshipService, type ExternalPlacementDeclaration } from '../../services/internship/internshipService';
import { showToast } from '../../utils/toast';
import { getUserFacingErrorMessage } from '../../utils/userFacingErrors';
import '../../styles/student-portal.css';

const ExternalPlacement: React.FC = () => {
  const { user } = useAuth();
  const [declarations, setDeclarations] = useState<ExternalPlacementDeclaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    institution_id: user?.institution_id || '',
    company_name: '',
    company_contact_name: '',
    company_contact_email: '',
    company_contact_phone: '',
    role_title: '',
    location: '',
    location_type: 'ONSITE' as 'ONSITE' | 'REMOTE' | 'HYBRID',
    start_date: '',
    end_date: '',
    source_url: '',
    student_notes: '',
  });

  const loadDeclarations = async () => {
    try {
      setLoading(true);
      setDeclarations(await internshipService.getExternalPlacementDeclarations());
    } catch (error) {
      showToast.error('Failed to load external placement declarations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeclarations();
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.institution_id) {
      showToast.error('Your account must have an institution before declaring a placement.');
      return;
    }

    try {
      setSubmitting(true);
      await internshipService.declareExternalPlacement({
        ...formData,
        proof_document: proofFile || undefined,
      });
      showToast.success('External placement submitted for institution review.');
      setFormData(prev => ({
        ...prev,
        company_name: '',
        company_contact_name: '',
        company_contact_email: '',
        company_contact_phone: '',
        role_title: '',
        location: '',
        location_type: 'ONSITE',
        start_date: '',
        end_date: '',
        source_url: '',
        student_notes: '',
      }));
      setProofFile(null);
      await loadDeclarations();
    } catch (error: any) {
      showToast.error(getUserFacingErrorMessage(error?.message, error?.status) || 'Failed to submit external placement.');
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (status: ExternalPlacementDeclaration['status']) => {
    const variant = status === 'APPROVED' ? 'success' : status === 'REJECTED' ? 'danger' : status === 'CHANGES_REQUESTED' ? 'warning' : 'secondary';
    return <span className={`badge bg-${variant}`}>{status.replace('_', ' ')}</span>;
  };

  return (
    <StudentLayout>
      <div className="student-workspace">
        <section className="student-command-hero">
          <div className="student-command-copy">
            <span className="student-kicker">Placement declaration</span>
            <h1>External Placement</h1>
            <p>Declare an internship or attachment secured outside EduLink so your institution can verify it, assign oversight, and unlock logbooks.</p>
            <div className="student-command-meta">
              <span><Briefcase size={15} /> Placement facts</span>
              <span><Upload size={15} /> Proof upload</span>
              <span><CheckCircle size={15} /> Institution review</span>
            </div>
          </div>
          <div className="student-command-card">
            <span className="student-kicker">Declarations</span>
            <strong>{declarations.length}</strong>
            <p className="student-command-note">Your submitted external placements and review outcomes appear here.</p>
          </div>
        </section>

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="student-surface">
            <div className="student-surface-body">
              <div className="student-surface-header">
                <div>
                  <h2>Placement Details</h2>
                  <p className="student-muted mb-0">Submit clear employer, role, dates, contact, and evidence details for faster review.</p>
                </div>
              </div>
                  <div className="student-evidence-rail mb-4">
                    <div className="student-evidence-row">
                      <div className="student-evidence-icon success">1</div>
                      <div>
                        <strong>Placement facts</strong>
                        <span>Company, role, dates, and location.</span>
                      </div>
                    </div>
                    <div className="student-evidence-row">
                      <div className="student-evidence-icon">2</div>
                      <div>
                        <strong>Employer contact</strong>
                        <span>Give the institution someone to verify with.</span>
                      </div>
                    </div>
                    <div className="student-evidence-row">
                      <div className="student-evidence-icon warn">3</div>
                      <div>
                        <strong>Proof document</strong>
                        <span>Attach an offer letter, email, or equivalent evidence.</span>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="student-placement-form">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Company name</label>
                        <input className="form-control" name="company_name" value={formData.company_name} onChange={handleChange} required />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Role title</label>
                        <input className="form-control" name="role_title" value={formData.role_title} onChange={handleChange} required />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Start date</label>
                        <input type="date" className="form-control" name="start_date" value={formData.start_date} onChange={handleChange} required />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">End date</label>
                        <input type="date" className="form-control" name="end_date" value={formData.end_date} onChange={handleChange} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Location</label>
                        <input className="form-control" name="location" value={formData.location} onChange={handleChange} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Work mode</label>
                        <select className="form-select" name="location_type" value={formData.location_type} onChange={handleChange}>
                          <option value="ONSITE">On-site</option>
                          <option value="HYBRID">Hybrid</option>
                          <option value="REMOTE">Remote</option>
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Company contact name</label>
                        <input className="form-control" name="company_contact_name" value={formData.company_contact_name} onChange={handleChange} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Company contact email</label>
                        <input type="email" className="form-control" name="company_contact_email" value={formData.company_contact_email} onChange={handleChange} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Company contact phone</label>
                        <input className="form-control" name="company_contact_phone" value={formData.company_contact_phone} onChange={handleChange} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Original opportunity URL</label>
                        <input type="url" className="form-control" name="source_url" value={formData.source_url} onChange={handleChange} />
                      </div>
                      <div className="col-12">
                        <label className="form-label d-flex align-items-center gap-2"><Upload size={16} /> Offer letter or proof</label>
                        <input type="file" className="form-control" onChange={(event) => setProofFile(event.target.files?.[0] || null)} />
                      </div>
                      <div className="col-12">
                        <label className="form-label">Notes to institution</label>
                        <textarea className="form-control" rows={3} name="student_notes" value={formData.student_notes} onChange={handleChange} />
                      </div>
                    </div>
                    <button className="btn btn-primary mt-4" disabled={submitting}>
                      {submitting ? 'Submitting...' : 'Submit for Review'}
                    </button>
                  </form>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="student-surface">
            <div className="student-surface-body">
              <div className="student-surface-header">
                <div>
                  <h2>Review History</h2>
                  <p className="student-muted mb-0">Follow what your institution has approved, rejected, or asked you to revise.</p>
                </div>
              </div>
                  {loading ? (
                    <p className="text-muted mb-0">Loading...</p>
                  ) : declarations.length === 0 ? (
                    <>
                      <div className="student-empty-icon mb-3">
                        <FileText size={28} />
                      </div>
                      <p className="text-muted mb-0">No external placements submitted yet.</p>
                    </>
                  ) : (
                    <div className="student-history-list">
                      {declarations.map(declaration => (
                        <div key={declaration.id} className="student-history-item">
                          <div className="d-flex justify-content-between gap-3">
                            <div>
                              <h6 className="fw-bold mb-1">{declaration.role_title}</h6>
                              <p className="text-muted small mb-2">{declaration.company_name}</p>
                            </div>
                            {statusBadge(declaration.status)}
                          </div>
                          {declaration.status === 'APPROVED' && (
                            <div className="small text-success d-flex align-items-center gap-1">
                              <CheckCircle size={14} /> Logbooks are unlocked for this placement.
                            </div>
                          )}
                          {declaration.status === 'PENDING' && (
                            <div className="small text-muted d-flex align-items-center gap-1">
                              <Clock size={14} /> Waiting for institution review.
                            </div>
                          )}
                          {declaration.review_notes && <p className="small mb-0 mt-2">{declaration.review_notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </StudentLayout>
  );
};

export default ExternalPlacement;
