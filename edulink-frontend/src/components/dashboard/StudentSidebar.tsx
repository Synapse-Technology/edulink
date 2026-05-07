import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  House,
  Search,
  ListCheck,
  Briefcase,
  BookOpen,
  FileText,
  Building2,
  Bell,
  FolderOpen,
  ClipboardPlus,
  LifeBuoy,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import edulinkLogo from '../../assets/images/edulink-logo-v1-select.svg';

const SIDEBAR_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');

  :root {
    --ink: #0d0f12;
    --ink-2: #3a3d44;
    --ink-3: #6b7280;
    --ink-4: #9ca3af;
    --surface: #f5fcfb;
    --surface-2: #f0faf8;
    --surface-3: #e6f3f1;
    --border: #d4ebe8;
    --border-2: #c0ddd9;
    --accent: #1ab8aa;
    --accent-soft: rgba(26,184,170,0.08);
    --danger: #ef4444;
    --danger-soft: rgba(239,68,68,0.10);
    --radius-sm: 8px;
    --radius: 14px;
    --radius-lg: 20px;
    --shadow: 0 4px 16px rgba(26,184,170,0.08), 0 1px 4px rgba(26,184,170,0.04);
    --font-display: 'Instrument Serif', Georgia, serif;
    --font-body: 'DM Sans', -apple-system, sans-serif;
  }

  .ss-dark {
    --ink: #f0ede8;
    --ink-2: #c9c4bc;
    --ink-3: #8a8580;
    --ink-4: #5a5650;
    --surface: #0f1a19;
    --surface-2: #152320;
    --surface-3: #1a2f2c;
    --border: #2a4240;
    --border-2: #356765;
    --accent: #4dd9ca;
    --accent-soft: rgba(77,217,202,0.10);
    --danger-soft: rgba(239,68,68,0.12);
    --shadow: 0 4px 16px rgba(26,184,170,0.12);
  }

  /* ── Shell ── */
  .ss-shell {
    font-family: var(--font-body);
    background: linear-gradient(180deg, var(--surface-2) 0%, rgba(240,250,248,0.8) 100%);
    width: 272px;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    flex-shrink: 0;
    box-shadow: inset -1px 0 0 rgba(26,184,170,0.06);
  }
  .ss-shell.ss-dark {
    background: linear-gradient(180deg, var(--surface-2) 0%, rgba(21,35,32,0.9) 100%);
    box-shadow: inset -1px 0 0 rgba(77,217,202,0.08);
  }

  /* ── Brand ── */
  .ss-brand {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 20px 20px 16px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .ss-brand-mark {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
  }
  .ss-brand-mark img {
    width: 26px;
    height: 26px;
    object-fit: contain;
    filter: brightness(0) invert(1);
  }
  .ss-brand-title {
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: 400;
    color: var(--ink);
    margin: 0;
    line-height: 1;
  }
  .ss-brand-sub {
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink-4);
    margin-top: 2px;
  }

  /* ── Nav ── */
  .ss-nav {
    flex: 1;
    overflow-y: auto;
    padding: 12px 10px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .ss-nav::-webkit-scrollbar { width: 3px; }
  .ss-nav::-webkit-scrollbar-track { background: transparent; }
  .ss-nav::-webkit-scrollbar-thumb { background: var(--border-2); border-radius: 3px; }

  /* Section label */
  .ss-nav-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--ink-4);
    padding: 12px 10px 4px;
  }
  .ss-nav-label:first-child { padding-top: 4px; }

  /* Nav link */
  .ss-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border-radius: var(--radius);
    font-size: 13px;
    font-weight: 500;
    color: var(--ink-3);
    text-decoration: none;
    transition: background 0.12s, color 0.12s;
    position: relative;
    border: 1px solid transparent;
  }
  .ss-link:hover {
    background: var(--surface-3);
    color: var(--ink-2);
    border-color: var(--border);
  }
  .ss-link.active {
    background: var(--accent-soft);
    color: var(--accent);
    border-color: rgba(26,92,255,0.12);
    font-weight: 600;
  }
  .ss-link-icon {
    width: 30px;
    height: 30px;
    border-radius: 9px;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: inherit;
    transition: background 0.12s;
  }
  .ss-link:hover .ss-link-icon {
    background: var(--surface-2);
  }
  .ss-link.active .ss-link-icon {
    background: var(--accent-soft);
  }

  /* Active indicator dot */
  .ss-link.active::before {
     display: none;
    }
    .ss-link.active {
      box-shadow: inset 0 0 0 2px var(--accent);
  }

  /* Divider */
  .ss-divider {
    height: 1px;
    background: var(--border);
    margin: 8px 10px;
  }

  /* ── Footer ── */
  .ss-footer {
    border-top: 1px solid var(--border);
    padding: 12px 10px;
    flex-shrink: 0;
  }
  .ss-logout {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border-radius: var(--radius);
    font-size: 13px;
    font-weight: 500;
    color: var(--ink-3);
    background: none;
    border: 1px solid transparent;
    width: 100%;
    cursor: pointer;
    font-family: var(--font-body);
    transition: background 0.12s, color 0.12s, border-color 0.12s;
    text-align: left;
  }
  .ss-logout:hover {
    background: var(--danger-soft);
    color: var(--danger);
    border-color: rgba(239,68,68,0.15);
    box-shadow: inset 0 0 0 2px var(--danger);
  }
  .ss-logout-icon {
    width: 30px;
    height: 30px;
    border-radius: 9px;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: inherit;
    transition: background 0.12s;
  }
  .ss-logout:hover .ss-logout-icon {
    background: var(--danger-soft);
  }
`;

interface NavGroup {
  label: string;
  items: Array<{ to: string; label: string; icon: React.ReactNode }>;
}
const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard/student', label: 'Dashboard', icon: <House size={16} /> },
      { to: '/opportunities', label: 'Browse internships', icon: <Search size={16} /> },
    ],
  },
  {
    label: 'My journey',
    items: [
      { to: '/dashboard/student/applications', label: 'Application tracker', icon: <ListCheck size={16} /> },
      { to: '/dashboard/student/internship', label: 'Active internship', icon: <Briefcase size={16} /> },
      { to: '/dashboard/student/external-placement', label: 'Declare placement', icon: <ClipboardPlus size={16} /> },
      { to: '/dashboard/student/logbook', label: 'Logbook & history', icon: <BookOpen size={16} /> },
      { to: '/dashboard/student/artifacts', label: 'Artifacts & reports', icon: <FolderOpen size={16} /> },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/dashboard/student/profile', label: 'Profile & CV', icon: <FileText size={16} /> },
      { to: '/dashboard/student/affiliation', label: 'Institution affiliation', icon: <Building2 size={16} /> },
      { to: '/dashboard/student/notifications', label: 'Notifications', icon: <Bell size={16} /> },
      { to: '/support', label: 'Support', icon: <LifeBuoy size={16} /> },
    ],
  },
];

interface StudentSidebarProps {
  isDarkMode?: boolean;
}

const StudentSidebar: React.FC<StudentSidebarProps> = ({ isDarkMode = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <style>{SIDEBAR_STYLES}</style>
      <aside
        className={`ss-shell${isDarkMode ? ' ss-dark' : ''}`}
        role="navigation"
        aria-label="Student dashboard navigation"
      >
        {/* Brand */}
        <div className="ss-brand">
          <div className="ss-brand-mark">
            <img src={edulinkLogo} alt="" aria-hidden="true" />
          </div>
          <div>
            <h1 className="ss-brand-title">EduLink</h1>
            <div className="ss-brand-sub">Student portal</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="ss-nav" aria-label="Main navigation">
          {NAV_GROUPS.map((group, gi) => (
            <React.Fragment key={group.label}>
              {gi > 0 && <div className="ss-divider" />}
              <div className="ss-nav-label">{group.label}</div>
              {group.items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`ss-link${isActive(item.to) ? ' active' : ''}`}
                  aria-current={isActive(item.to) ? 'page' : undefined}
                >
                  <div className="ss-link-icon" aria-hidden="true">{item.icon}</div>
                  {item.label}
                </Link>
              ))}
            </React.Fragment>
          ))}
        </nav>

        {/* Footer */}
        <div className="ss-footer">
          <button type="button" className="ss-logout" onClick={handleLogout}>
            <div className="ss-logout-icon" aria-hidden="true"><LogOut size={16} /></div>
            Log out
          </button>
        </div>
      </aside>
    </>
  );
};

export default StudentSidebar;