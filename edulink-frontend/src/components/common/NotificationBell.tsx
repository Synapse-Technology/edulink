import React, { useCallback } from 'react';
import { Bell, Sparkles } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { notificationService } from '../../services/notifications/notificationService';
import { usePusher } from '../../hooks/usePusher';

interface NotificationBellProps {
  isDarkMode?: boolean;
  className?: string;
  userId?: string;
  linkTo?: string;
}

const STYLES = `
  .nb-link {
    --nb-ink: #0d0f12;
    --nb-ink-3: #6b7280;
    --nb-ink-4: #9ca3af;
    --nb-surface: #f2f0ed;
    --nb-surface-2: #e8e5e0;
    --nb-border: #e4e1dc;
    --nb-accent: #1a5cff;
    --nb-accent-soft: rgba(26,92,255,0.09);
    --nb-danger: #ef4444;
    --nb-danger-soft: rgba(239,68,68,0.12);
    --nb-shadow: 0 4px 16px rgba(0,0,0,0.07),0 1px 4px rgba(0,0,0,0.04);

    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    border-radius: 999px;
    background: var(--nb-surface);
    border: 1px solid var(--nb-border);
    color: var(--nb-ink-3);
    text-decoration: none;
    outline: none;
    transition: transform 0.15s ease, box-shadow 0.15s ease, color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
  }

  .nb-link.nb-dark {
    --nb-ink: #f0ede8;
    --nb-ink-3: #8a8580;
    --nb-ink-4: #5a5650;
    --nb-surface: #1c1c1c;
    --nb-surface-2: #252525;
    --nb-border: #2a2a2a;
    --nb-accent: #4d7fff;
    --nb-accent-soft: rgba(77,127,255,0.12);
    --nb-shadow: 0 4px 16px rgba(0,0,0,0.30);
  }

  .nb-link:hover {
    color: var(--nb-accent);
    background: var(--nb-accent-soft);
    border-color: rgba(26,92,255,0.24);
    box-shadow: var(--nb-shadow);
    transform: translateY(-1px);
  }

  .nb-link.nb-dark:hover {
    border-color: rgba(77,127,255,0.28);
  }

  .nb-link:active {
    transform: scale(0.96);
  }

  .nb-link:focus-visible {
    box-shadow: 0 0 0 3px var(--nb-accent-soft), var(--nb-shadow);
    color: var(--nb-accent);
  }

  .nb-link.nb-has-unread {
    color: var(--nb-accent);
    background: var(--nb-accent-soft);
    border-color: rgba(26,92,255,0.20);
  }

  .nb-icon-wrap {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .nb-has-unread .nb-bell-icon {
    animation: nb-ring 1.4s ease-in-out infinite;
    transform-origin: 50% 0%;
  }

  @keyframes nb-ring {
    0%, 100% { transform: rotate(0deg); }
    8% { transform: rotate(12deg); }
    16% { transform: rotate(-10deg); }
    24% { transform: rotate(8deg); }
    32% { transform: rotate(-5deg); }
    40% { transform: rotate(0deg); }
  }

  .nb-pulse {
    position: absolute;
    inset: -7px;
    border-radius: 999px;
    border: 1px solid var(--nb-accent);
    opacity: 0;
    animation: nb-pulse 1.8s ease-out infinite;
    pointer-events: none;
  }

  @keyframes nb-pulse {
    0% { transform: scale(0.72); opacity: 0.36; }
    70% { transform: scale(1.28); opacity: 0; }
    100% { transform: scale(1.28); opacity: 0; }
  }

  .nb-count {
    position: absolute;
    top: -6px;
    right: -7px;
    min-width: 20px;
    height: 20px;
    padding: 0 5px;
    border-radius: 999px;
    background: var(--nb-danger);
    color: #fff;
    border: 2px solid var(--nb-surface);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 800;
    line-height: 1;
    box-shadow: 0 5px 14px var(--nb-danger-soft);
  }

  .nb-spark {
    position: absolute;
    top: 4px;
    right: 5px;
    color: var(--nb-accent);
    opacity: 0.88;
  }

  .nb-sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
`;

const formatUnreadCount = (count: number) => {
  if (count > 99) return '99+';
  return String(count);
};

const NotificationBell: React.FC<NotificationBellProps> = ({
  isDarkMode = false,
  className = '',
  userId,
  linkTo = '/dashboard/student/notifications',
}) => {
  const queryClient = useQueryClient();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: notificationService.getUnreadCount,
    enabled: !!userId,
    staleTime: 1000 * 60,
  });

  const hasUnread = unreadCount > 0;

  const handleNewNotification = useCallback((data?: any) => {
    if (data?.title) {
      toast(data.title, {
        icon: '🔔',
        duration: 4000,
        position: 'top-right',
      });
    }

    queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [queryClient]);

  usePusher(
    userId ? `user-${userId}` : undefined,
    'notification-received',
    handleNewNotification
  );

  return (
    <>
      <style>{STYLES}</style>
      <Link
        to={linkTo}
        className={`nb-link${isDarkMode ? ' nb-dark' : ''}${hasUnread ? ' nb-has-unread' : ''}${className ? ` ${className}` : ''}`}
        aria-label={hasUnread ? `${unreadCount} unread notifications` : 'No unread notifications'}
        title={hasUnread ? `${unreadCount} unread notifications` : 'Notifications'}
      >
        <span className="nb-icon-wrap" aria-hidden="true">
          {hasUnread && <span className="nb-pulse" />}
          <Bell size={20} className="nb-bell-icon" />
        </span>

        {hasUnread && (
          <>
            <Sparkles size={9} className="nb-spark" aria-hidden="true" />
            <span className="nb-count">
              {formatUnreadCount(unreadCount)}
            </span>
          </>
        )}

        <span className="nb-sr-only">
          {hasUnread ? `${unreadCount} unread notifications` : 'Notifications'}
        </span>
      </Link>
    </>
  );
};

export default NotificationBell;
