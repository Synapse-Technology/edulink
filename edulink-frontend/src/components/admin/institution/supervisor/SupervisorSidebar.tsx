// ─── SupervisorSidebar.tsx ─────────────────────────────────────────────────
import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  AlertTriangle,
  Settings,
  BookOpen,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../../../stores/authStore';
import styled from 'styled-components';

const Aside = styled.aside<{ $isMobile: boolean; $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: var(--sidebar-w);
  padding-top: var(--header-h);
  background: var(--white);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  z-index: 1020;
  transform: ${p => (p.$isMobile && !p.$isOpen ? 'translateX(-100%)' : 'translateX(0)')};
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${p => p.$isMobile && p.$isOpen ? 'var(--shadow-sm)' : 'none'};
`;

const BrandBar = styled.div`
  display: none;
  @media (max-width: 991px) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 1rem;
    height: var(--header-h);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
`;

const BrandLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
`;

const BrandMark = styled.div`
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: var(--navy);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg { color: white; }
`;

const BrandText = styled.div`
  h6 {
    font-size: 14px;
    font-weight: 600;
    color: var(--navy);
    line-height: 1.2;
    margin: 0;
    letter-spacing: -0.01em;
  }
  span {
    font-size: 11px;
    color: var(--steel);
    font-weight: 400;
    letter-spacing: 0.01em;
  }
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: var(--steel);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;

  &:hover { background: var(--mist); color: var(--navy); }
`;

const NavSection = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 1rem 0.75rem;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

const NavLabel = styled.p`
  font-size: 10.5px;
  font-weight: 600;
  color: var(--steel);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0 0.5rem;
  margin: 0 0 6px;
`;

const NavItem = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  font-size: 13.5px;
  font-weight: 500;
  color: var(--slate);
  text-decoration: none;
  margin-bottom: 2px;
  transition: background 0.14s, color 0.14s;
  position: relative;

  svg { flex-shrink: 0; transition: color 0.14s; }

  &:hover {
    background: var(--mist);
    color: var(--navy);
    svg { color: var(--navy); }
  }

  &.active {
    background: var(--accent-dim);
    color: var(--accent);
    font-weight: 600;
    svg { color: var(--accent); }

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 20%;
      height: 60%;
      width: 3px;
      background: var(--accent);
      border-radius: 0 3px 3px 0;
    }
  }
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid var(--border);
  margin: 10px 0.5rem;
`;

const UserFooter = styled.div`
  padding: 0.875rem 1rem;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
`;

const Avatar = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--accent-dim);
  color: var(--accent);
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1.5px solid rgba(47, 111, 237, 0.2);
`;

const UserInfo = styled.div`
  overflow: hidden;
  p {
    font-size: 13px;
    font-weight: 600;
    color: var(--navy);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: 0;
    line-height: 1.3;
  }
  span {
    font-size: 11px;
    color: var(--steel);
  }
`;

interface SupervisorSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

const menuItems = [
  { id: 'overview',  label: 'Overview',   icon: LayoutDashboard, path: '/institution/supervisor-dashboard/overview' },
  { id: 'logbooks',  label: 'Logbooks',   icon: FileText,         path: '/institution/supervisor-dashboard/logbooks' },
  { id: 'students',  label: 'Students',   icon: Users,            path: '/institution/supervisor-dashboard/students' },
  { id: 'incidents', label: 'Incidents',  icon: AlertTriangle,    path: '/institution/supervisor-dashboard/incidents' },
];

const secondaryItems = [
  { id: 'settings',  label: 'Settings',   icon: Settings,         path: '/institution/supervisor-dashboard/settings' },
];

const SupervisorSidebar: React.FC<SupervisorSidebarProps> = ({
  isOpen = true,
  onClose,
  isMobile = false,
}) => {
  const { user } = useAuthStore();
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}` || 'S';

  return (
    <Aside $isMobile={isMobile} $isOpen={isOpen}>
      <BrandBar>
        <BrandLink to="/institution/supervisor-dashboard">
          <BrandMark>
            <BookOpen size={16} />
          </BrandMark>
          <BrandText>
            <h6>EduLink</h6>
            <span>Supervisor Portal</span>
          </BrandText>
        </BrandLink>
        {isMobile && (
          <CloseBtn onClick={onClose} aria-label="Close sidebar">
            <X size={18} />
          </CloseBtn>
        )}
      </BrandBar>

      <NavSection>
        <NavLabel>Menu</NavLabel>
        {menuItems.map(({ id, label, icon: Icon, path }) => (
          <NavItem
            key={id}
            to={path}
            onClick={() => isMobile && onClose?.()}
          >
            <Icon size={16} />
            {label}
          </NavItem>
        ))}

        <Divider />

        <NavLabel>Account</NavLabel>
        {secondaryItems.map(({ id, label, icon: Icon, path }) => (
          <NavItem
            key={id}
            to={path}
            onClick={() => isMobile && onClose?.()}
          >
            <Icon size={16} />
            {label}
          </NavItem>
        ))}
      </NavSection>

      <UserFooter>
        <Avatar>{initials}</Avatar>
        <UserInfo>
          <p>{user?.firstName} {user?.lastName}</p>
          <span>Supervisor</span>
        </UserInfo>
      </UserFooter>
    </Aside>
  );
};

export default SupervisorSidebar;
