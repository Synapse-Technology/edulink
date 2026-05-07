import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Sun, Moon, ChevronDown, User, LifeBuoy, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { studentService } from '../../services/student/studentService';
import TrustBadge, { type TrustLevel } from '../common/TrustBadge';
import NotificationBell from '../common/NotificationBell';
import defaultProfile from '../../assets/images/default_profile.jpg';

const HEADER_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');

  :root {
    --ink: #0d0f12;
    --ink-2: #3a3d44;
    --ink-3: #6b7280;
    --ink-4: #9ca3af;
    --surface: #f9f8f6;
    --surface-2: #f2f0ed;
    --surface-3: #e8e5e0;
    --border: #e4e1dc;
    --border-2: #d1ccc5;
    --accent: #1a5cff;
    --accent-soft: rgba(26,92,255,0.08);
    --danger: #ef4444;
    --danger-soft: rgba(239,68,68,0.10);
    --radius-sm: 8px;
    --radius: 14px;
    --radius-lg: 20px;
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
    --shadow: 0 4px 16px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04);
    --shadow-lg: 0 12px 40px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05);
    --font-display: 'Instrument Serif', Georgia, serif;
    --font-body: 'DM Sans', -apple-system, sans-serif;
  }

  .sh-dark {
    --ink: #f0ede8;
    --ink-2: #c9c4bc;
    --ink-3: #8a8580;
    --ink-4: #5a5650;
    --surface: #141414;
    --surface-2: #1c1c1c;
    --surface-3: #252525;
    --border: #2a2a2a;
    --border-2: #353535;
    --accent: #4d7fff;
    --accent-soft: rgba(77,127,255,0.10);
    --danger-soft: rgba(239,68,68,0.12);
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.30);
    --shadow: 0 4px 16px rgba(0,0,0,0.30);
    --shadow-lg: 0 12px 40px rgba(0,0,0,0.40);
  }

  /* ── Header bar ── */
  .sh-bar {
    font-family: var(--font-body);
    background: var(--surface);
    border-bottom: 2px solid var(--accent);
    height: 64px;
    display: flex;
    align-items: center;
    padding: 0 24px;
    gap: 16px;
    position: sticky;
    top: 0;
    z-index: 100;
    box-shadow: 0 2px 8px rgba(26,92,255,0.06);
  }

  /* Context block (left) */
  .sh-context {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .sh-context-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent);
  }
  .sh-context-title {
    font-family: var(--font-display);
    font-size: 1.05rem;
    font-weight: 400;
    color: var(--ink);
    line-height: 1;
  }
  .sh-context-title em { font-style: italic; color: var(--ink-3); }

  /* Spacer */
  .sh-spacer { flex: 1; }

  /* Icon button (notifications, dark mode toggle) */
  .sh-icon-btn {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--ink-3);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
    flex-shrink: 0;
  }
  .sh-icon-btn:hover { background: var(--surface-3); border-color: var(--border-2); color: var(--ink); }

  /* Mobile hamburger */
  .sh-hamburger {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--ink-2);
    display: none;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.15s;
  }
  .sh-hamburger:hover { background: var(--surface-3); }

  @media (max-width: 1024px) {
    .sh-hamburger { display: flex; }
    .sh-context { display: none; }
  }

  /* User menu trigger */
  .sh-user-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 5px 12px 5px 5px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    font-family: var(--font-body);
  }
  .sh-user-btn:hover { background: var(--surface-3); border-color: var(--border-2); }

  .sh-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid var(--accent-soft);
    display: block;
    flex-shrink: 0;
  }
  .sh-user-name-block { display: flex; flex-direction: column; gap: 1px; text-align: left; }
  .sh-user-role {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    color: var(--ink-4);
  }
  .sh-user-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--ink);
    white-space: nowrap;
  }
  .sh-chevron {
    color: var(--ink-4);
    transition: transform 0.2s;
    flex-shrink: 0;
  }
  .sh-chevron.open { transform: rotate(180deg); }

  @media (max-width: 640px) {
    .sh-user-name-block { display: none; }
    .sh-user-btn { padding: 5px; }
  }

  /* Dropdown */
  .sh-dropdown-wrap { position: relative; }

  .sh-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    min-width: 200px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
    animation: sh-drop-in 0.15s cubic-bezier(0.34,1.56,0.64,1);
    z-index: 200;
  }
  @keyframes sh-drop-in {
    from { opacity: 0; transform: translateY(-6px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .sh-dropdown-header {
    padding: 14px 16px 12px;
    border-bottom: 1px solid var(--border);
  }
  .sh-dropdown-fullname {
    font-size: 14px;
    font-weight: 600;
    color: var(--ink);
  }
  .sh-dropdown-email {
    font-size: 11px;
    color: var(--ink-4);
    margin-top: 2px;
  }

  .sh-dropdown-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 16px;
    font-size: 13px;
    font-weight: 500;
    color: var(--ink-2);
    text-decoration: none;
    transition: background 0.12s, color 0.12s;
    background: none;
    border: none;
    width: 100%;
    cursor: pointer;
    font-family: var(--font-body);
  }
  .sh-dropdown-item:hover { background: var(--surface-2); color: var(--ink); }
  .sh-dropdown-item.danger { color: var(--danger); }
  .sh-dropdown-item.danger:hover { background: var(--danger-soft); }

  .sh-dropdown-item-icon {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: var(--surface-3);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--ink-3);
    transition: background 0.12s, color 0.12s;
  }
  .sh-dropdown-item:hover .sh-dropdown-item-icon { background: var(--accent-soft); color: var(--accent); }
  .sh-dropdown-item.danger:hover .sh-dropdown-item-icon { background: var(--danger-soft); color: var(--danger); }

  .sh-dropdown-divider {
    height: 1px;
    background: var(--border);
    margin: 4px 0;
  }

  /* Trust badge wrapper */
  .sh-trust-wrap {
    flex-shrink: 0;
  }
  @media (max-width: 768px) {
    .sh-trust-wrap { display: none; }
  }
`;

interface StudentHeaderProps {
  onMobileMenuClick?: () => void;
  isMobileMenuOpen?: boolean;
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  /* ── Profile fetch ── */
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const profile = await studentService.getProfile();
        const picUrl = (profile as any).profile_picture_url || profile.profile_picture;
        if (picUrl) setProfilePic(picUrl);
        else if (user?.avatar) setProfilePic(user.avatar);
        if (profile.trust_level !== undefined) setTrustLevel(profile.trust_level);
      } catch {
        if (user?.avatar) setProfilePic(user.avatar);
      }
    })();
  }, [user?.id]);

  /* ── Close dropdown on outside click ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isUserMenuOpen]);

  const handleLogout = useCallback(() => {
    logout();
    setIsUserMenuOpen(false);
    navigate('/login');
  }, [logout, navigate]);

  const fullName = user ? `${user.firstName} ${user.lastName}` : 'Student';

  return (
    <>
      <style>{HEADER_STYLES}</style>
      <nav className={`sh-bar${isDarkMode ? ' sh-dark' : ''}`} aria-label="Student portal header">

        {/* Mobile hamburger */}
        <button
          className="sh-hamburger"
          onClick={onMobileMenuClick}
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        {/* Context label */}
        <div className="sh-context">
          <span className="sh-context-label">Student space</span>
          <span className="sh-context-title">Career <em>dashboard</em></span>
        </div>

        <div className="sh-spacer" />

        {/* Notifications */}
        <NotificationBell isDarkMode={isDarkMode} userId={user?.id} />

        {/* Dark mode toggle */}
        <button
          className="sh-icon-btn"
          onClick={toggleDarkMode}
          title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-pressed={isDarkMode}
        >
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Trust badge */}
        <div className="sh-trust-wrap">
          <TrustBadge level={trustLevel as TrustLevel} entityType="student" size="sm" />
        </div>

        {/* User dropdown */}
        <div className="sh-dropdown-wrap" ref={dropdownRef}>
          <button
            type="button"
            className="sh-user-btn"
            onClick={() => setIsUserMenuOpen(v => !v)}
            aria-haspopup="menu"
            aria-expanded={isUserMenuOpen}
          >
            <img src={profilePic} className="sh-avatar" alt={fullName} />
            <div className="sh-user-name-block">
              <span className="sh-user-role">Student</span>
              <span className="sh-user-name">{fullName}</span>
            </div>
            <ChevronDown size={14} className={`sh-chevron${isUserMenuOpen ? ' open' : ''}`} />
          </button>

          {isUserMenuOpen && (
            <div className="sh-dropdown" role="menu">
              <div className="sh-dropdown-header">
                <div className="sh-dropdown-fullname">{fullName}</div>
                {user?.email && <div className="sh-dropdown-email">{user.email}</div>}
              </div>

              <Link
                to="/dashboard/student/profile"
                className="sh-dropdown-item"
                role="menuitem"
                onClick={() => setIsUserMenuOpen(false)}
              >
                <div className="sh-dropdown-item-icon"><User size={14} /></div>
                View profile
              </Link>

              <Link
                to="/support"
                className="sh-dropdown-item"
                role="menuitem"
                onClick={() => setIsUserMenuOpen(false)}
              >
                <div className="sh-dropdown-item-icon"><LifeBuoy size={14} /></div>
                Support
              </Link>

              <div className="sh-dropdown-divider" />

              <button
                type="button"
                className="sh-dropdown-item danger"
                role="menuitem"
                onClick={handleLogout}
              >
                <div className="sh-dropdown-item-icon"><LogOut size={14} /></div>
                Log out
              </button>
            </div>
          )}
        </div>
      </nav>
    </>
  );
};

export default StudentHeader;