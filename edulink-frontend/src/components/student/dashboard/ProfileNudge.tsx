import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';

interface ProfileNudgeProps {
  score: number;
  missingItems: string[];
}

const ProfileNudge: React.FC<ProfileNudgeProps> = ({ score, missingItems }) => {
  const { isDarkMode } = useTheme();

  if (score >= 100 || missingItems.length === 0) return null;

  return (
    <div className={`student-section-block p-3 border-start border-4 border-primary ${isDarkMode ? 'bg-primary bg-opacity-10' : 'bg-primary bg-opacity-10'}`}>
      <div className="d-flex align-items-start gap-3">
        <div className="student-row-icon primary">
          <AlertCircle size={20} />
        </div>
        <div className="flex-grow-1">
          <h6 className={`fw-bold mb-1 ${isDarkMode ? 'text-info' : 'text-primary'}`}>Complete your profile</h6>
          <p className={`small mb-3 ${isDarkMode ? 'text-light opacity-75' : 'student-muted'}`}>
            Your profile is {Math.round(score)}% complete. Add the missing items below to improve employer confidence.
          </p>
          <div className="d-flex flex-wrap gap-2 mb-3">
            {missingItems.map((item, idx) => (
              <span key={idx} className={`badge rounded-pill px-3 py-2 fw-normal ${isDarkMode ? 'bg-secondary bg-opacity-50 text-light' : 'bg-white text-dark border'}`}>
                {item}
              </span>
            ))}
          </div>
          <Link to="/dashboard/student/profile" className="btn btn-primary btn-sm d-inline-flex align-items-center gap-2">
            Update profile
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ProfileNudge;
