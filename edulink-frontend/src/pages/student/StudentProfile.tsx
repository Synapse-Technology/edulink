import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Mail, 
  BookOpen, 
  Award, 
  FileText, 
  Edit,
  Camera
} from 'lucide-react';
import StudentHeader from '../../components/dashboard/StudentHeader';
import StudentSidebar from '../../components/dashboard/StudentSidebar';
import ProfileWizard from '../../components/student/ProfileWizard';
import TrustBadge, { type TrustLevel } from '../../components/common/TrustBadge';
import { DocumentPreviewModal } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { studentService } from '../../services/student/studentService';
import type { StudentProfile as IStudentProfile } from '../../services/student/studentService';
import StudentProfileSkeleton from '../../components/student/skeletons/StudentProfileSkeleton';
import defaultProfile from '../../assets/images/default_profile.jpg';

const StudentProfile: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [profile, setProfile] = useState<IStudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview Modal State
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await studentService.getProfile();
        setProfile(data);
      } catch (error) {
        console.error('Failed to fetch profile', error);
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
    if (file && profile) {
      try {
        setUploading(true);
        const updatedProfile = await studentService.updateProfile(profile.id, {
          profile_picture: file
        });
        setProfile(updatedProfile);
        // Force header update if possible, or reload page.
        // For now, we rely on page reload or navigation to update header.
        // Ideally we should update a global context or store.
      } catch (error) {
        console.error('Failed to upload profile picture', error);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleViewDocument = (path: string | null | undefined, title: string = 'Document') => {
    if (!path) return;
    setPreviewTitle(title);
    setPreviewUrl(path);
    setPreviewOpen(true);
  };

  const DocumentCard: React.FC<{
    title: string;
    path?: string | null;
    icon: React.ReactNode;
  }> = ({ title, path, icon }) => (
    <div className={`p-3 border rounded d-flex align-items-center justify-content-between ${isDarkMode ? 'border-secondary bg-dark' : 'bg-light border-light'}`}>
      <div className="d-flex align-items-center gap-3">
        <div className={`p-2 rounded-circle ${isDarkMode ? 'bg-secondary' : 'bg-white'}`}>
          {icon}
        </div>
        <div>
          <h6 className={`mb-0 fw-semibold ${isDarkMode ? 'text-light' : 'text-dark'}`}>{title}</h6>
          <small className={isDarkMode ? 'text-light opacity-75' : 'text-secondary'}>
            {path ? 'Uploaded' : 'Not uploaded'}
          </small>
        </div>
      </div>
      {path && (
        <button 
          onClick={() => handleViewDocument(path, title)}
          className="btn btn-sm btn-outline-primary d-flex align-items-center gap-2"
        >
          <FileText size={14} />
          Preview
        </button>
      )}
    </div>
  );

  return (
    <div className={`min-vh-100 ${isDarkMode ? 'text-white' : 'bg-light'}`} style={{ backgroundColor: isDarkMode ? '#0f172a' : undefined }}>
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="d-lg-none position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50" 
          style={{ zIndex: 1039 }}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`${isMobileMenuOpen ? 'd-block' : 'd-none'} d-lg-block position-fixed top-0 start-0 h-100 d-flex flex-column`} style={{ zIndex: 1040, width: '280px' }}>
        <StudentSidebar isDarkMode={isDarkMode} />
      </div>

      {/* Main Content */}
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

        {loading ? (
          <StudentProfileSkeleton />
        ) : (
          <div className="flex-grow-1 px-4 px-lg-5 pb-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className={`display-6 fw-bold ${isDarkMode ? 'text-info' : ''}`}>
              My Profile
            </h1>
            <button 
              className="btn btn-primary d-flex align-items-center gap-2"
              onClick={() => setShowWizard(true)}
            >
              <Edit size={18} />
              Edit Profile
            </button>
          </div>

          <div className="row g-4">
            {/* Basic Info Card */}
            <div className="col-md-6">
              <div className={`card h-100 ${isDarkMode ? 'bg-dark border-secondary' : 'bg-white'}`} style={{ borderRadius: '16px' }}>
                <div className="card-body p-4">
                  <h5 className={`fw-bold mb-4 ${isDarkMode ? 'text-info' : 'text-primary'}`}>
                    Basic Information
                  </h5>
                  
                  <div className="d-flex justify-content-center mb-4 position-relative">
                    <div className="position-relative" style={{ cursor: 'pointer' }} onClick={handleImageClick}>
                      <img 
                        src={profile?.profile_picture || user?.avatar || defaultProfile} 
                        alt="Profile" 
                        className="rounded-circle object-fit-cover border border-3 border-primary"
                        style={{ width: '120px', height: '120px' }}
                      />
                      <div className="position-absolute bottom-0 end-0 bg-primary text-white rounded-circle p-2 border border-2 border-white">
                        <Camera size={16} />
                      </div>
                      {uploading && (
                         <div className="position-absolute top-50 start-50 translate-middle">
                           <div className="spinner-border text-primary" role="status">
                             <span className="visually-hidden">Loading...</span>
                           </div>
                         </div>
                      )}
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="d-none" 
                      accept="image/*" 
                      onChange={handleImageChange} 
                    />
                  </div>

                  <div className="d-flex justify-content-center mb-4">
                    <TrustBadge 
                      level={(profile?.trust_level || 0) as TrustLevel} 
                      entityType="student" 
                      size="lg" 
                    />
                  </div>

                  <div className="mb-3">
                    <label className={`small ${isDarkMode ? 'text-light opacity-75' : 'text-secondary'}`}>Full Name</label>
                    <div className="d-flex align-items-center gap-2 mt-1">
                      <User size={18} className={isDarkMode ? 'text-light' : 'text-dark'} />
                      <span className={`fw-medium ${isDarkMode ? 'text-light' : ''}`}>{user?.firstName} {user?.lastName}</span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className={`small ${isDarkMode ? 'text-light opacity-75' : 'text-secondary'}`}>Email Address</label>
                    <div className="d-flex align-items-center gap-2 mt-1">
                      <Mail size={18} className={isDarkMode ? 'text-light' : 'text-dark'} />
                      <span className={`fw-medium ${isDarkMode ? 'text-light' : ''}`}>{profile?.email}</span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className={`small ${isDarkMode ? 'text-light opacity-75' : 'text-secondary'}`}>Registration Number</label>
                    <div className="d-flex align-items-center gap-2 mt-1">
                      <BookOpen size={18} className={isDarkMode ? 'text-light' : 'text-dark'} />
                      <span className={`fw-medium ${isDarkMode ? 'text-light' : ''}`}>{profile?.registration_number || 'Not set'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Academic Info Card */}
            <div className="col-md-6">
              <div className={`card h-100 ${isDarkMode ? 'bg-dark border-secondary' : 'bg-white'}`} style={{ borderRadius: '16px' }}>
                <div className="card-body p-4">
                  <h5 className={`fw-bold mb-4 ${isDarkMode ? 'text-info' : 'text-primary'}`}>
                    Academic Details
                  </h5>

                  <div className="mb-3">
                    <label className={`small ${isDarkMode ? 'text-light opacity-75' : 'text-secondary'}`}>Course of Study</label>
                    <div className={`fw-medium mt-1 ${isDarkMode ? 'text-light' : ''}`}>{profile?.course_of_study || 'Not set'}</div>
                  </div>

                  <div className="mb-3">
                    <label className={`small ${isDarkMode ? 'text-light opacity-75' : 'text-secondary'}`}>Current Year</label>
                    <div className={`fw-medium mt-1 ${isDarkMode ? 'text-light' : ''}`}>{profile?.current_year || 'Not set'}</div>
                  </div>

                  <div>
                    <label className={`small ${isDarkMode ? 'text-light opacity-75' : 'text-secondary'}`}>Skills</label>
                    <div className="d-flex flex-wrap gap-2 mt-2">
                      {profile?.skills && profile.skills.length > 0 ? (
                        profile.skills.map((skill, idx) => (
                          <span key={idx} className={`badge ${isDarkMode ? 'bg-secondary text-light' : 'bg-light text-dark'}`}>
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className={`small ${isDarkMode ? 'text-light opacity-75' : 'text-muted'}`}>No skills added</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Documents Card */}
            <div className="col-12">
              <div className={`card ${isDarkMode ? 'bg-dark border-secondary' : 'bg-white'}`} style={{ borderRadius: '16px' }}>
                <div className="card-body p-4">
                  <h5 className={`fw-bold mb-4 ${isDarkMode ? 'text-info' : 'text-primary'}`}>
                    My Documents
                  </h5>
                  <div className="row g-4">
                    <div className="col-md-4">
                      <DocumentCard 
                        title="CV / Resume" 
                        path={profile?.cv} 
                        icon={<FileText size={20} className={isDarkMode ? 'text-info' : 'text-primary'} />} 
                      />
                    </div>
                    <div className="col-md-4">
                      <DocumentCard 
                        title="Admission Letter" 
                        path={profile?.admission_letter} 
                        icon={<Award size={20} className={isDarkMode ? 'text-info' : 'text-primary'} />} 
                      />
                    </div>
                    <div className="col-md-4">
                      <DocumentCard 
                        title="ID Document" 
                        path={profile?.id_document} 
                        icon={<User size={20} className={isDarkMode ? 'text-info' : 'text-primary'} />} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
              id_document: profile.id_document
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
      </div>
    </div>
  );
};

export default StudentProfile;
