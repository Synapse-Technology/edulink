import React, { useState, useEffect, useRef } from 'react';
import {
  Award,
  BookOpen,
  Camera,
  CheckCircle,
  Edit,
  FileText,
  Mail,
  User,
} from 'lucide-react';
import StudentLayout from '../../components/dashboard/StudentLayout';
import ProfileWizard from '../../components/student/ProfileWizard';
import TrustBadge, { type TrustLevel } from '../../components/common/TrustBadge';
import { DocumentPreviewModal } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { showToast } from '../../utils/toast';
import { getErrorMessage, logError } from '../../utils/errorMapper';
import { studentService } from '../../services/student/studentService';
import type { Affiliation, StudentProfile as IStudentProfile } from '../../services/student/studentService';
import StudentProfileSkeleton from '../../components/student/skeletons/StudentProfileSkeleton';
import defaultProfile from '../../assets/images/default_profile.jpg';
import '../../styles/student-portal.css';

const StudentProfile: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<IStudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [readinessScore, setReadinessScore] = useState(0);
  const [missingItems, setMissingItems] = useState<string[]>([]);
  const [currentAffiliation, setCurrentAffiliation] = useState<Affiliation | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await studentService.getProfile();
        setProfile(data);
        const [stats, affiliationData] = await Promise.all([
          studentService.getDashboardStats(data.id).catch(() => null),
          studentService.getAffiliations(data.id).catch(() => []),
        ]);

        if (stats?.profile && typeof stats.profile.score === 'number') {
          setReadinessScore(stats.profile.score);
        }

        const currentAffiliation = affiliationData.find(affiliation =>
          ['approved', 'verified', 'pending'].includes(affiliation.status)
        );
        setCurrentAffiliation(currentAffiliation || null);
        const missing: string[] = [];
        if (!data.cv) missing.push('CV / Resume');
        if (!data.admission_letter) missing.push('Admission Letter');
        if (!data.id_document) missing.push('School ID');
        if (!data.skills || data.skills.length === 0) missing.push('Skills');
        if (!data.course_of_study) missing.push('Academic Info');
        if (!data.is_verified && !currentAffiliation) missing.push('Institution Verification');
        setMissingItems(missing);
      } catch (error) {
        const message = getErrorMessage(error, { action: 'Load Profile' });
        showToast.error(message);
        logError(error, { action: 'Load Profile' });
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    try {
      setUploading(true);
      const updatedProfile = await studentService.updateProfile(profile.id, {
        profile_picture: file,
      });
      setProfile(updatedProfile);
      showToast.success('Profile picture updated successfully');
    } catch (error) {
      const message = getErrorMessage(error, { action: 'Upload Profile Picture' });
      showToast.error(message);
      logError(error, { action: 'Upload Profile Picture', data: { fileName: file.name } });
    } finally {
      setUploading(false);
    }
  };

  const handleViewDocument = (path: string | null | undefined, title: string) => {
    if (!path) return;
    setPreviewTitle(title);
    setPreviewUrl(path);
    setPreviewOpen(true);
  };

  const documents = [
    {
      title: 'CV / Resume',
      path: profile?.cv,
      icon: <FileText size={20} />,
      copy: 'Primary document employers review before shortlisting.',
    },
    {
      title: 'Admission Letter',
      path: profile?.admission_letter,
      icon: <Award size={20} />,
      copy: 'Supports student-status and institution verification.',
    },
    {
      title: 'ID Document',
      path: profile?.id_document,
      icon: <User size={20} />,
      copy: 'Used for trust checks and placement administration.',
    },
  ];

  const readinessItems = [
    {
      label: 'Academic profile',
      complete: Boolean(profile?.course_of_study && profile?.current_year && profile?.registration_number),
      copy: 'Course, year, and registration number are complete.',
    },
    {
      label: 'Skills profile',
      complete: Boolean(profile?.skills && profile.skills.length >= 3),
      copy: `${profile?.skills?.length || 0} skills listed for matching.`,
    },
    {
      label: 'Document vault',
      complete: documents.every(document => Boolean(document.path)),
      copy: 'CV, admission letter, and ID document are uploaded.',
    },
  ];

  const fallbackReadinessScore = Math.round((readinessItems.filter(item => item.complete).length / readinessItems.length) * 100);
  const roundedReadinessScore = Math.round(readinessScore || fallbackReadinessScore);

  const ProfilePhoto = () => (
    <div
      className="position-relative d-inline-block"
      style={{ cursor: 'pointer' }}
      onClick={handleImageClick}
      role="button"
      tabIndex={0}
      aria-label="Click to change profile picture"
      onKeyDown={(event) => event.key === 'Enter' && handleImageClick()}
    >
      <img
        src={profile?.profile_picture || user?.avatar || defaultProfile}
        alt="Profile"
        className="student-profile-photo"
      />
      <div className="position-absolute bottom-0 end-0 bg-primary text-white rounded-circle p-2 border border-2 border-white" title="Change photo">
        <Camera size={16} />
      </div>
      {uploading && (
        <div className="position-absolute top-50 start-50 translate-middle">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}
      <input
        type="file"
        ref={fileInputRef}
        className="d-none"
        accept="image/*"
        onChange={handleImageChange}
      />
    </div>
  );

  return (
    <StudentLayout>
      {loading ? (
        <StudentProfileSkeleton />
      ) : (
        <div className="student-workspace">
          <section className="student-command-hero">
            <div className="student-command-copy">
              <span className="student-kicker">Career passport</span>
              <h1>Profile & CV</h1>
              <p>Keep your identity, academic record, skills, and documents application-ready so employers and institutions can trust your placement journey.</p>
              <div className="student-command-meta">
                <span><User size={15} /> {user?.firstName} {user?.lastName}</span>
                <span><Mail size={15} /> {profile?.email || user?.email}</span>
                <span><BookOpen size={15} /> {profile?.registration_number || 'Registration pending'}</span>
              </div>
            </div>
            <div className="student-command-card">
              <div className="d-flex align-items-start gap-3">
                <ProfilePhoto />
                <div className="min-w-0">
                  <span className="student-kicker">Readiness</span>
                  <strong>{roundedReadinessScore}%</strong>
                  <p className="student-command-note mb-3">
                    {missingItems.length === 0 ? 'Profile verified and ready for trusted applications.' : `${missingItems.length} item${missingItems.length === 1 ? '' : 's'} still need attention.`}
                  </p>
                  <TrustBadge level={(profile?.trust_level || 0) as TrustLevel} entityType="student" size="sm" />
                </div>
              </div>
            </div>
          </section>

          <div className="student-workspace-grid">
            <main>
              <section className="student-surface">
                <div className="student-surface-body">
                  <div className="student-surface-header">
                    <div>
                      <h2>Application Readiness</h2>
                      <p className="student-muted mb-0">These checks shape how complete your profile feels to employers.</p>
                    </div>
                    <button className="btn btn-primary d-flex align-items-center gap-2" onClick={() => setShowWizard(true)}>
                      <Edit size={18} />
                      Edit
                    </button>
                  </div>
                  <div className="student-evidence-rail">
                    {readinessItems.map(item => (
                      <div className="student-evidence-row" key={item.label}>
                        <div className={`student-evidence-icon ${item.complete ? 'success' : 'warn'}`}>
                          {item.complete ? <CheckCircle size={18} /> : <FileText size={18} />}
                        </div>
                        <div>
                          <strong>{item.label}</strong>
                          <span>{item.copy}</span>
                        </div>
                        <span className={`badge ${item.complete ? 'bg-success' : 'bg-warning text-dark'}`}>
                          {item.complete ? 'Ready' : 'Needs update'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="student-surface">
                <div className="student-surface-body">
                  <div className="student-surface-header">
                    <div>
                      <h2>Document Vault</h2>
                      <p className="student-muted mb-0">Keep the exact documents used during applications and verification.</p>
                    </div>
                  </div>
                  <div className="d-grid gap-3">
                    {documents.map(document => (
                      <div className="student-document-row" key={document.title}>
                        <div className={`student-evidence-icon ${document.path ? 'success' : 'warn'}`}>
                          {document.icon}
                        </div>
                        <div>
                          <strong>{document.title}</strong>
                          <span>{document.path ? `Uploaded. ${document.copy}` : `Missing. ${document.copy}`}</span>
                        </div>
                        {document.path ? (
                          <button className="btn btn-sm btn-outline-primary" onClick={() => handleViewDocument(document.path, document.title)}>
                            Preview
                          </button>
                        ) : (
                          <button className="btn btn-sm btn-primary" onClick={() => setShowWizard(true)}>
                            Upload
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </main>

            <aside>
              <section className="student-surface">
                <div className="student-surface-body">
                  <div className="student-surface-header">
                    <div>
                      <h2>Academic Record</h2>
                      <p className="student-muted mb-0">Details used for matching and verification.</p>
                    </div>
                  </div>
                  <div className="student-history-list">
                    <div className="student-history-item">
                      <span className="student-muted small">Course of study</span>
                      <div className="fw-bold">{profile?.course_of_study || 'Not set'}</div>
                    </div>
                    <div className="student-history-item">
                      <span className="student-muted small">Current year</span>
                      <div className="fw-bold">{profile?.current_year || 'Not set'}</div>
                    </div>
                    <div className="student-history-item">
                      <span className="student-muted small">Registration number</span>
                      <div className="fw-bold">{profile?.registration_number || 'Not set'}</div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="student-surface">
                <div className="student-surface-body">
                  <div className="student-surface-header">
                    <div>
                      <h2>Skills</h2>
                      <p className="student-muted mb-0">Keep these specific and employer-readable.</p>
                    </div>
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {profile?.skills && profile.skills.length > 0 ? (
                      profile.skills.map((skill, idx) => (
                        <span key={idx} className="student-soft-pill">{skill}</span>
                      ))
                    ) : (
                      <span className="student-muted small">No skills added yet.</span>
                    )}
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>
      )}

      {profile && (
        <ProfileWizard
          show={showWizard}
          onHide={() => setShowWizard(false)}
          studentId={profile.id}
          initialData={{
            course_of_study: profile.course_of_study,
            current_year: profile.current_year,
            registration_number: profile.registration_number,
            skills: profile.skills,
            cv: profile.cv,
            admission_letter: profile.admission_letter,
            id_document: profile.id_document,
            institution_id: profile.institution_id,
            is_verified: profile.is_verified,
            has_affiliation_claim: Boolean(currentAffiliation),
          }}
          onComplete={() => {
            setShowWizard(false);
            window.location.reload();
          }}
        />
      )}

      <DocumentPreviewModal
        show={previewOpen}
        onHide={() => setPreviewOpen(false)}
        title={previewTitle}
        url={previewUrl}
      />
    </StudentLayout>
  );
};

export default StudentProfile;
