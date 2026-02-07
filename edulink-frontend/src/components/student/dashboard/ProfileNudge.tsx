import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, CheckCircle } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';

interface ProfileNudgeProps {
  score: number;
  missingItems: string[];
}

const ProfileNudge: React.FC<ProfileNudgeProps> = ({ score, missingItems }) => {
  const { isDarkMode } = useTheme();

  if (score >= 100 || missingItems.length === 0) return null;

  return (
    <div className={`card border-0 shadow-sm rounded-4 mb-4 overflow-hidden ${isDarkMode ? 'bg-primary bg-opacity-10' : 'bg-primary bg-opacity-10'}`} style={{ borderLeft: '4px solid #0d6efd !important' }}>
      <div className="card-body p-4">
        <div className="d-flex align-items-start gap-3">
          <div className="bg-primary text-white rounded-circle p-2 flex-shrink-0">
            <AlertCircle size={20} />
          </div>
          <div className="flex-grow-1">
            <h6 className={`fw-bold mb-1 ${isDarkMode ? 'text-info' : 'text-primary'}`}>Complete Your Profile</h6>
            <p className={`small mb-3 ${isDarkMode ? 'text-light opacity-75' : 'text-muted'}`}>
              Your profile is {Math.round(score)}% complete. Upload these items to increase your visibility to employers:
            </p>
            <div className="d-flex flex-wrap gap-2 mb-3">
              {missingItems.map((item, idx) => (
                <span key={idx} className={`badge rounded-pill px-3 py-2 fw-normal ${isDarkMode ? 'bg-secondary bg-opacity-50 text-light' : 'bg-white text-dark border'}`}>
                  {item}
                </span>
              ))}
            </div>
            <Link to="/dashboard/student/profile" className="btn btn-primary btn-sm rounded-pill px-4 d-inline-flex align-items-center gap-2 transition-all hover-lift">
              Update Profile
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileNudge;
