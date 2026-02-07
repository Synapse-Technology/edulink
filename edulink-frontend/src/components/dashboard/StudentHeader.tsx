import React, { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Sun, Moon, ChevronDown, User, LifeBuoy, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { studentService } from '../../services/student/studentService';
import TrustBadge, { type TrustLevel } from '../common/TrustBadge';
import NotificationBell from '../common/NotificationBell';
import defaultProfile from '../../assets/images/default_profile.jpg';

interface StudentHeaderProps {
  onMobileMenuClick?: () => void;
  isMobileMenuOpen?: boolean;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

const StudentHeader: React.FC<StudentHeaderProps> = ({
  onMobileMenuClick,
  isMobileMenuOpen = false,
}) => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const [profilePic, setProfilePic] = useState<string>(defaultProfile);
  const [trustLevel, setTrustLevel] = useState<number>(0);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await studentService.getProfile();
        if (profile.profile_picture) {
          setProfilePic(profile.profile_picture);
        } else if (user?.avatar) {
          setProfilePic(user.avatar);
        }
        if (profile.trust_level !== undefined) {
          setTrustLevel(profile.trust_level);
        }
      } catch (error) {
        console.error('Failed to fetch profile picture:', error);
      }
    };
    fetchProfile();
  }, [user]);

  const handleMobileMenuClick = useCallback(() => {
    if (onMobileMenuClick) {
      onMobileMenuClick();
    }
  }, [onMobileMenuClick]);

  const toggleUserMenu = useCallback(() => {
    setIsUserMenuOpen((prev) => !prev);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    setIsUserMenuOpen(false);
    navigate('/login');
  }, [logout, navigate]);

  return (
    <>
      {/* Header */}
      <nav 
        className={`navbar navbar-expand-lg rounded-4 shadow-sm px-3 px-sm-4 px-lg-5 mb-4 ${
          isDarkMode ? 'navbar-dark bg-dark border border-secondary' : 'navbar-light bg-white border border-light'
        }`}
        style={{ height: '80px' }}
      >
        <div className="container-fluid p-0">
          {/* Mobile Menu Toggle */}
          <button 
            onClick={handleMobileMenuClick}
            className="navbar-toggler d-lg-none btn btn-primary rounded-circle p-2 me-3"
            type="button"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <X size={20} />
            ) : (
              <Menu size={20} />
            )}
          </button>

          {/* Brand/Title Section */}
          <div className="d-none d-lg-flex flex-column">
            <span className={`text-uppercase fw-semibold small tracking-wide ${isDarkMode ? 'text-info opacity-75' : 'text-muted'}`} style={isDarkMode ? { textShadow: '0 0 6px rgba(32, 201, 151, 0.2)' } : {}}>
              Student Space
            </span>
            <span className={`h6 mb-0 fw-bold ${isDarkMode ? 'text-info' : ''}`} style={isDarkMode ? { textShadow: '0 0 8px rgba(32, 201, 151, 0.3)' } : {}}>
              Dashboard
            </span>
          </div>

          {/* Right Side Controls */}
          <div className="d-flex align-items-center gap-3 gap-sm-4 ms-auto">
            {/* Notifications */}
            <NotificationBell isDarkMode={isDarkMode} userId={user?.id} />

            {/* Dark Mode Toggle */}
            <button 
              onClick={toggleDarkMode}
              className={`btn btn-outline-${isDarkMode ? 'light' : 'dark'} rounded-circle p-2`}
              title="Toggle dark mode"
              aria-pressed={isDarkMode}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Trust Badge */}
            <div className="d-none d-md-block">
               <TrustBadge level={trustLevel as TrustLevel} entityType="student" size="sm" />
            </div>

            {/* User Menu */}
            <div className="dropdown">
              <button
                type="button"
                onClick={toggleUserMenu}
                className="btn btn-outline-secondary dropdown-toggle d-flex align-items-center gap-2 px-3 py-2 rounded-pill"
                aria-haspopup="menu"
                aria-expanded={isUserMenuOpen}
              >
                <img 
                  src={profilePic} 
                  className="rounded-circle" 
                  alt="Profile" 
                  style={{ 
                    width: '32px', 
                    height: '32px', 
                    objectFit: 'cover',
                    border: '2px solid var(--bs-primary)'
                  }} 
                />
                <div className="d-none d-sm-block text-start">
                  <div className={`text-uppercase fw-semibold small ${isDarkMode ? 'text-info opacity-75' : 'text-muted'}`} style={isDarkMode ? { textShadow: '0 0 4px rgba(32, 201, 151, 0.2)' } : {}}>
                    Student
                  </div>
                  <div className={`fw-medium ${isDarkMode ? 'text-info' : ''}`} style={isDarkMode ? { textShadow: '0 0 6px rgba(32, 201, 151, 0.3)' } : {}}>
                    {user ? `${user.firstName} ${user.lastName}` : 'Student'}
                  </div>
                </div>
                <ChevronDown size={16} className={`transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isUserMenuOpen && (
                <div className={`dropdown-menu dropdown-menu-end show mt-2 shadow-lg border-0 rounded-3 ${isDarkMode ? 'bg-dark' : ''}`}>
                  <Link
                    to="/dashboard/student/profile"
                    className={`dropdown-item d-flex align-items-center gap-2 py-2 ${isDarkMode ? 'text-info' : ''}`}
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <User size={16} />
                    View Profile
                  </Link>
                  <Link
                    to="/dashboard/student/support"
                    className={`dropdown-item d-flex align-items-center gap-2 py-2 ${isDarkMode ? 'text-info' : ''}`}
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <LifeBuoy size={16} />
                    Support
                  </Link>
                  <div className={`dropdown-divider ${isDarkMode ? 'border-secondary' : ''}`}></div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className={`dropdown-item d-flex align-items-center gap-2 py-2 ${isDarkMode ? 'text-info' : 'text-danger'}`}
                  >
                    <LogOut size={16} />
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <style>{`
        .tracking-wide {
          letter-spacing: 0.1em;
        }
        .rotate-180 {
          transform: rotate(180deg);
        }
      `}</style>
    </>
  );
};

export default StudentHeader;