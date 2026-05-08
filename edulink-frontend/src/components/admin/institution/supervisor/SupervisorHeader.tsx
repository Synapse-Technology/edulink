// ─── SupervisorHeader.tsx ──────────────────────────────────────────────────
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Menu, User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../../../../stores/authStore';
import styled, { keyframes, css } from 'styled-components';

const scaleIn = keyframes`
  from { opacity: 0; transform: translateY(-6px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)   scale(1); }
`;

const Header = styled.nav`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1030;
  height: var(--header-h);
  background: var(--white);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 1.5rem;
  gap: 0.75rem;
  box-shadow: var(--shadow-xs);
`;

const MenuToggle = styled.button`
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  color: var(--slate);
  border-radius: var(--radius-sm);
  transition: background 0.14s, color 0.14s;
  flex-shrink: 0;

  &:hover { background: var(--mist); color: var(--navy); }

  @media (max-width: 991px) { display: flex; align-items: center; }
`;

const PageTitle = styled.h5`
  font-size: 14px;
  font-weight: 600;
  color: var(--navy);
  letter-spacing: -0.01em;
  margin: 0;
  white-space: nowrap;

  @media (max-width: 767px) { display: none; }
`;

const Spacer = styled.div`
  flex: 1;
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const Sep = styled.div`
  width: 1px;
  height: 20px;
  background: var(--border-md);
  margin: 0 6px;
`;

const IconBtn = styled.button`
  position: relative;
  background: none;
  border: none;
  cursor: pointer;
  padding: 7px;
  color: var(--slate);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.14s, color 0.14s;

  &:hover { background: var(--mist); color: var(--navy); }
`;

const Badge = styled.span`
  position: absolute;
  top: 4px;
  right: 4px;
  min-width: 16px;
  height: 16px;
  background: #E53E3E;
  color: white;
  font-size: 9px;
  font-weight: 700;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid var(--white);
  padding: 0 3px;
`;

const UserBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px 4px 4px;
  border-radius: var(--radius);
  transition: background 0.14s;

  &:hover { background: var(--mist); }
`;

const Avatar = styled.div`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--accent-dim);
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid rgba(47,111,237,0.2);
  flex-shrink: 0;
`;

const UserMeta = styled.div`
  text-align: left;
  @media (max-width: 575px) { display: none; }

  p { font-size: 13px; font-weight: 600; color: var(--navy); margin: 0; line-height: 1.2; }
  span { font-size: 11px; color: var(--steel); }
`;

const DropdownWrap = styled.div`
  position: relative;
`;

const Dropdown = styled.div<{ $open: boolean }>`
  display: ${p => p.$open ? 'block' : 'none'};
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 200px;
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  animation: ${p => p.$open ? css`${scaleIn} 0.18s ease both` : 'none'};
  z-index: 999;
`;

const DropItem = styled.button<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 9px 14px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: ${p => p.$danger ? '#C53030' : 'var(--slate)'};
  text-align: left;
  transition: background 0.12s, color 0.12s;

  &:hover {
    background: ${p => p.$danger ? '#FFF5F5' : 'var(--mist)'};
    color: ${p => p.$danger ? '#C53030' : 'var(--navy)'};
  }

  svg { flex-shrink: 0; }
`;

const DropDivider = styled.div`
  height: 1px;
  background: var(--border);
  margin: 4px 0;
`;

const NotifDropdown = styled(Dropdown)`
  min-width: 280px;
`;

const NotifHeader = styled.div`
  padding: 10px 14px 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);

  span { font-size: 12px; font-weight: 600; color: var(--steel); text-transform: uppercase; letter-spacing: 0.06em; }
`;

const NotifEmpty = styled.div`
  padding: 2rem 1rem;
  text-align: center;
  color: var(--steel);
  font-size: 13px;
`;

interface SupervisorHeaderProps {
  onToggleSidebar: () => void;
  notificationCount?: number;
}

const SupervisorHeader: React.FC<SupervisorHeaderProps> = ({
  onToggleSidebar,
  notificationCount = 0,
}) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [userOpen, setUserOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}` || 'S';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/institution/login');
  };

  return (
    <Header>
      <MenuToggle onClick={onToggleSidebar} aria-label="Toggle sidebar">
        <Menu size={20} />
      </MenuToggle>

      <PageTitle>Supervisor Portal</PageTitle>
      <Spacer />

      <Actions>
        {/* Notifications */}
        <DropdownWrap ref={notifRef}>
          <IconBtn
            aria-label="Notifications"
            onClick={() => { setNotifOpen(o => !o); setUserOpen(false); }}
          >
            <Bell size={18} />
            {notificationCount > 0 && <Badge>{notificationCount}</Badge>}
          </IconBtn>
          <NotifDropdown $open={notifOpen}>
            <NotifHeader>
              <span>Notifications</span>
              {notificationCount > 0 && (
                <span style={{ color: 'var(--accent)', textTransform: 'none', letterSpacing: 0, fontSize: '12px' }}>
                  {notificationCount} new
                </span>
              )}
            </NotifHeader>
            <NotifEmpty>No new notifications</NotifEmpty>
          </NotifDropdown>
        </DropdownWrap>

        <Sep />

        {/* User menu */}
        <DropdownWrap ref={userRef}>
          <UserBtn
            onClick={() => { setUserOpen(o => !o); setNotifOpen(false); }}
            aria-haspopup="true"
            aria-expanded={userOpen}
          >
            <Avatar>{initials}</Avatar>
            <UserMeta>
              <p>{user?.firstName} {user?.lastName}</p>
              <span>Supervisor</span>
            </UserMeta>
            <ChevronDown
              size={13}
              style={{
                color: 'var(--steel)',
                transform: userOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
                marginLeft: 2,
              }}
            />
          </UserBtn>

          <Dropdown $open={userOpen}>
            <DropItem>
              <User size={15} />
              Profile
            </DropItem>
            <DropItem>
              <Settings size={15} />
              Settings
            </DropItem>
            <DropDivider />
            <DropItem $danger onClick={handleLogout}>
              <LogOut size={15} />
              Sign out
            </DropItem>
          </Dropdown>
        </DropdownWrap>
      </Actions>
    </Header>
  );
};

export default SupervisorHeader;