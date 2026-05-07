import React, { useCallback, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Check,
  CheckCircle,
  Circle,
  FileCheck,
  Filter,
  Info,
  Loader,
  MailCheck,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { notificationService } from '../../services/notifications/notificationService';
import type { Notification } from '../../services/notifications/notificationService';
import { usePusher } from '../../hooks/usePusher';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { showToast } from '../../utils/toast';
import StudentLayout from '../../components/dashboard/StudentLayout';

/* ─────────────────────────────────────────────
   Design tokens — unified with student application pages
───────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');

  :root {
    --ink: #0d0f12;
    --ink-2: #3a3d44;
    --ink-3: #6b7280;
    --ink-4: #9ca3af;
    --surface: #f9f8f6;
    --surface-2: #f2f0ed;
    --surface-3: #e8e5e0;
    --surface-4: #ffffff;
    --border: #e4e1dc;
    --border-2: #d1ccc5;
    --accent: #1a5cff;
    --accent-2: #e8eeff;
    --accent-soft: rgba(26,92,255,0.08);
    --success: #12b76a;
    --success-soft: rgba(18,183,106,0.10);
    --warning: #f59e0b;
    --warning-soft: rgba(245,158,11,0.10);
    --danger: #ef4444;
    --danger-soft: rgba(239,68,68,0.10);
    --info: #0ea5e9;
    --info-soft: rgba(14,165,233,0.10);
    --radius-sm: 8px;
    --radius: 14px;
    --radius-lg: 20px;
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.06),0 1px 2px rgba(0,0,0,0.04);
    --shadow: 0 4px 16px rgba(0,0,0,0.07),0 1px 4px rgba(0,0,0,0.04);
    --shadow-lg: 0 12px 40px rgba(0,0,0,0.10),0 2px 8px rgba(0,0,0,0.05);
    --font-display: 'Instrument Serif', Georgia, serif;
    --font-body: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  .dark-mode {
    --ink: #f0ede8;
    --ink-2: #c9c4bc;
    --ink-3: #8a8580;
    --ink-4: #5a5650;
    --surface: #141414;
    --surface-2: #1c1c1c;
    --surface-3: #252525;
    --surface-4: #181818;
    --border: #2a2a2a;
    --border-2: #353535;
    --accent: #4d7fff;
    --accent-2: #1a2340;
    --accent-soft: rgba(77,127,255,0.10);
    --success-soft: rgba(18,183,106,0.12);
    --warning-soft: rgba(245,158,11,0.12);
    --danger-soft: rgba(239,68,68,0.12);
    --info-soft: rgba(14,165,233,0.12);
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.30);
    --shadow: 0 4px 16px rgba(0,0,0,0.30);
    --shadow-lg: 0 12px 40px rgba(0,0,0,0.40);
  }

  .sn-page {
    font-family: var(--font-body);
    color: var(--ink);
    background: var(--surface);
    min-height: 100vh;
  }

  /* ── Hero ── */
  .sn-hero {
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 32px;
    align-items: stretch;
    padding: 48px 0 32px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 24px;
    animation: sn-fade-up 0.45s ease both;
  }

  @keyframes sn-fade-up {
    from { opacity: 0; transform: translateY(14px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .sn-hero-copy {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }

  .sn-eyebrow {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 8px;
  }

  .sn-hero-title {
    font-family: var(--font-display);
    font-size: clamp(2rem, 4vw, 2.9rem);
    font-weight: 400;
    line-height: 1.08;
    color: var(--ink);
    margin: 0 0 10px;
  }

  .sn-hero-title em {
    font-style: italic;
    color: var(--ink-3);
  }

  .sn-hero-sub {
    font-size: 14px;
    color: var(--ink-3);
    max-width: 630px;
    line-height: 1.65;
    margin: 0 0 22px;
  }

  .sn-hero-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    font-size: 13px;
    color: var(--ink-3);
  }

  .sn-hero-meta span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .sn-command-card {
    background: linear-gradient(135deg, var(--surface-2), var(--accent-2));
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 22px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 220px;
    box-shadow: var(--shadow-sm);
  }

  .sn-command-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .sn-command-icon {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    background: var(--accent);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 22px rgba(26,92,255,0.22);
  }

  .sn-command-number {
    font-family: var(--font-display);
    font-size: 3rem;
    line-height: 1;
    font-weight: 400;
    color: var(--ink);
    margin-top: 20px;
  }

  .sn-command-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-4);
    margin-bottom: 8px;
  }

  .sn-command-note {
    font-size: 12px;
    color: var(--ink-3);
    line-height: 1.55;
    margin: 0 0 16px;
  }

  /* ── Buttons ── */
  .sn-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 500;
    border-radius: var(--radius);
    padding: 10px 16px;
    border: none;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.12s, box-shadow 0.15s, background 0.15s;
    white-space: nowrap;
    text-decoration: none;
  }

  .sn-btn:active { transform: scale(0.98); }
  .sn-btn:disabled { opacity: 0.45; cursor: not-allowed; pointer-events: none; }

  .sn-btn-primary {
    background: var(--accent);
    color: #fff;
    box-shadow: 0 1px 3px rgba(26,92,255,0.25);
  }

  .sn-btn-primary:hover {
    color: #fff;
    box-shadow: 0 4px 16px rgba(26,92,255,0.35);
    transform: translateY(-1px);
  }

  .sn-btn-outline {
    background: transparent;
    color: var(--accent);
    border: 1px solid rgba(26,92,255,0.30);
  }

  .sn-btn-outline:hover {
    color: var(--accent);
    background: var(--accent-soft);
  }

  /* ── Metrics ── */
  .sn-metrics {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 24px;
    animation: sn-fade-up 0.45s 0.08s ease both;
  }

  .sn-metric-card {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 18px;
    display: flex;
    align-items: center;
    gap: 14px;
    min-height: 92px;
  }

  .sn-metric-icon {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .sn-metric-icon.blue { background: var(--accent-soft); color: var(--accent); }
  .sn-metric-icon.green { background: var(--success-soft); color: var(--success); }
  .sn-metric-icon.orange { background: var(--warning-soft); color: var(--warning); }
  .sn-metric-icon.sky { background: var(--info-soft); color: var(--info); }

  .sn-metric-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-4);
    margin-bottom: 4px;
  }

  .sn-metric-value {
    font-size: 22px;
    font-weight: 600;
    color: var(--ink);
    line-height: 1;
  }

  /* ── Controls ── */
  .sn-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 18px;
    animation: sn-fade-up 0.45s 0.12s ease both;
  }

  .sn-filter-chips {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .sn-chip {
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--ink-3);
    border-radius: 999px;
    padding: 8px 13px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }

  .sn-chip:hover {
    color: var(--ink);
    background: var(--surface-3);
  }

  .sn-chip.active {
    color: #fff;
    background: var(--accent);
    border-color: var(--accent);
    box-shadow: 0 4px 16px rgba(26,92,255,0.22);
  }

  .sn-search-wrap {
    position: relative;
    width: min(360px, 100%);
    flex-shrink: 0;
  }

  .sn-search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--ink-4);
    pointer-events: none;
  }

  .sn-input {
    width: 100%;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 11px 14px 11px 42px;
    font-family: var(--font-body);
    font-size: 13px;
    color: var(--ink);
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
    box-sizing: border-box;
  }

  .sn-input::placeholder { color: var(--ink-4); }

  .sn-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
    background: var(--surface-3);
  }

  /* ── States ── */
  .sn-state {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 56px 24px;
    text-align: center;
    margin-bottom: 64px;
  }

  .sn-state-icon {
    width: 58px;
    height: 58px;
    border-radius: 18px;
    background: var(--accent-soft);
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
  }

  .sn-state-title {
    font-family: var(--font-display);
    font-size: 1.45rem;
    font-weight: 400;
    color: var(--ink);
    margin: 0 0 8px;
  }

  .sn-state-text {
    font-size: 14px;
    color: var(--ink-3);
    line-height: 1.6;
    max-width: 430px;
    margin: 0 auto 22px;
  }

  .sn-alert {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    border-radius: var(--radius);
    padding: 14px 16px;
    font-size: 13px;
    line-height: 1.55;
    margin-bottom: 18px;
    background: var(--danger-soft);
    color: var(--ink-2);
    border: 1px solid rgba(239,68,68,0.18);
  }

  .sn-alert svg { color: var(--danger); flex-shrink: 0; margin-top: 1px; }

  /* ── Notification feed ── */
  .sn-feed {
    display: flex;
    flex-direction: column;
    gap: 18px;
    margin-bottom: 64px;
    animation: sn-fade-up 0.45s 0.16s ease both;
  }

  .sn-group {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .sn-group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 17px 22px;
    border-bottom: 1px solid var(--border);
  }

  .sn-group-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    color: var(--ink-4);
    margin: 0;
  }

  .sn-group-count {
    font-size: 12px;
    color: var(--ink-4);
  }

  .sn-list {
    display: flex;
    flex-direction: column;
  }

  .sn-item {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr) auto;
    gap: 14px;
    align-items: flex-start;
    width: 100%;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--border);
    padding: 18px 22px;
    text-align: left;
    cursor: pointer;
    transition: background 0.15s;
  }

  .sn-item:last-child { border-bottom: none; }

  .sn-item:hover { background: var(--surface-3); }

  .sn-item.unread {
    background: linear-gradient(90deg, var(--accent-soft), transparent 52%);
  }

  .sn-item.unread:hover {
    background: var(--surface-3);
  }

  .sn-icon {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: var(--surface-3);
    color: var(--ink-4);
    border: 1px solid var(--border);
  }

  .sn-icon.success { background: var(--success-soft); color: var(--success); border-color: rgba(18,183,106,0.16); }
  .sn-icon.info { background: var(--info-soft); color: var(--info); border-color: rgba(14,165,233,0.16); }
  .sn-icon.warning { background: var(--warning-soft); color: var(--warning); border-color: rgba(245,158,11,0.16); }
  .sn-icon.accent { background: var(--accent-soft); color: var(--accent); border-color: rgba(26,92,255,0.16); }

  .sn-item-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 5px;
  }

  .sn-item-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--ink);
    line-height: 1.35;
  }

  .sn-unread-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: var(--accent);
    box-shadow: 0 0 0 4px var(--accent-soft);
    flex-shrink: 0;
  }

  .sn-item-body {
    display: block;
    font-size: 13px;
    color: var(--ink-3);
    line-height: 1.6;
  }

  .sn-item-time {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    color: var(--ink-4);
    white-space: nowrap;
    padding-top: 2px;
  }

  .sn-type-badge {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 4px 8px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    background: var(--surface-3);
    color: var(--ink-4);
  }

  @media (max-width: 1120px) {
    .sn-hero { grid-template-columns: 1fr; }
    .sn-command-card { max-width: 520px; }
    .sn-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }

  @media (max-width: 780px) {
    .sn-controls {
      align-items: stretch;
      flex-direction: column;
    }
    .sn-search-wrap { width: 100%; }
    .sn-item {
      grid-template-columns: 42px minmax(0, 1fr);
    }
    .sn-item-time {
      grid-column: 2;
      padding-top: 0;
    }
  }

  @media (max-width: 640px) {
    .sn-hero { padding-top: 40px; }
    .sn-metrics { grid-template-columns: 1fr; }
    .sn-item { padding: 16px; }
    .sn-group-header { padding: 16px; }
  }
`;

type NotificationFilter = 'ALL' | 'UNREAD' | 'APPLICATIONS' | 'VERIFICATION' | 'SYSTEM';

type NotificationVisual = {
  icon: React.ElementType;
  tone: 'success' | 'info' | 'warning' | 'accent' | 'neutral';
  label: string;
};

const getNotificationVisual = (type: string): NotificationVisual => {
  switch (type) {
    case 'EMAIL_VERIFIED':
      return { icon: MailCheck, tone: 'success', label: 'Verified' };
    case 'INTERNSHIP_ACCEPTED':
      return { icon: Trophy, tone: 'success', label: 'Placement' };
    case 'CERTIFICATE_GENERATED':
      return { icon: FileCheck, tone: 'success', label: 'Certificate' };
    case 'APPLICATION_STATUS_UPDATED':
    case 'APPLICATION_SUBMITTED':
    case 'INTERNSHIP_SHORTLISTED':
      return { icon: BriefcaseIcon, tone: 'info', label: 'Application' };
    case 'INSTITUTION_VERIFIED':
    case 'AFFILIATION_APPROVED':
      return { icon: ShieldCheck, tone: 'success', label: 'Trust' };
    case 'WARNING':
    case 'ACTION_REQUIRED':
      return { icon: AlertCircle, tone: 'warning', label: 'Action' };
    default:
      return { icon: Info, tone: 'accent', label: 'Update' };
  }
};

const BriefcaseIcon = ({ size = 18 }: { size?: number }) => <Bell size={size} />;

const getGroupLabel = (createdAt: string) => {
  const date = new Date(createdAt);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return 'Older';
};

const matchesFilter = (notification: Notification, filter: NotificationFilter) => {
  const type = notification.type || '';

  switch (filter) {
    case 'UNREAD':
      return notification.status !== 'read';
    case 'APPLICATIONS':
      return type.includes('INTERNSHIP') || type.includes('APPLICATION');
    case 'VERIFICATION':
      return type.includes('VERIFIED') || type.includes('CERTIFICATE') || type.includes('AFFILIATION');
    case 'SYSTEM':
      return !type.includes('INTERNSHIP') && !type.includes('APPLICATION') && !type.includes('VERIFIED') && !type.includes('CERTIFICATE') && !type.includes('AFFILIATION');
    case 'ALL':
    default:
      return true;
  }
};

const StudentNotifications: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: notifications = [], isLoading, isError } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationService.getNotifications,
    staleTime: 1000 * 60,
  });

  const unreadCount = notifications.filter(notification => notification.status !== 'read').length;
  const applicationCount = notifications.filter(notification => matchesFilter(notification, 'APPLICATIONS')).length;
  const verificationCount = notifications.filter(notification => matchesFilter(notification, 'VERIFICATION')).length;

  const markAllReadMutation = useMutation({
    mutationFn: notificationService.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      showToast.success('All notifications marked as read');
    },
    onError: () => {
      showToast.error('We could not update your notifications. Please try again.');
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleNewNotification = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [queryClient]);

  usePusher(user ? `user-${user.id}` : undefined, 'notification-received', handleNewNotification);

  const filteredNotifications = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return notifications.filter(notification => {
      const filterMatch = matchesFilter(notification, activeFilter);
      if (!normalizedSearch) return filterMatch;

      const searchable = [
        notification.title,
        notification.body,
        notification.type,
        notification.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return filterMatch && searchable.includes(normalizedSearch);
    });
  }, [notifications, activeFilter, searchTerm]);

  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: Notification[] } = {
      Today: [],
      Yesterday: [],
      Older: [],
    };

    filteredNotifications.forEach(notification => {
      groups[getGroupLabel(notification.created_at)].push(notification);
    });

    return Object.entries(groups).filter(([, items]) => items.length > 0);
  }, [filteredNotifications]);

  const handleNotificationClick = (notification: Notification) => {
    if (notification.status !== 'read') {
      markReadMutation.mutate(notification.id);
    }
  };

  const filters: { key: NotificationFilter; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'UNREAD', label: 'Unread' },
    { key: 'APPLICATIONS', label: 'Applications' },
    { key: 'VERIFICATION', label: 'Verification' },
    { key: 'SYSTEM', label: 'System' },
  ];

  return (
    <StudentLayout>
      <style>{STYLES}</style>
      <div className={`sn-page${isDarkMode ? ' dark-mode' : ''}`}>
        <section className="sn-hero">
          <div className="sn-hero-copy">
            <div className="sn-eyebrow">
              <Sparkles size={12} />
              EduLink · Activity inbox
            </div>
            <h1 className="sn-hero-title">
              Notification <em>Center</em>
            </h1>
            <p className="sn-hero-sub">
              Review application decisions, verification events, certificate updates, and important account messages from one trusted student inbox.
            </p>
            <div className="sn-hero-meta">
              <span><Bell size={14} /> {notifications.length} total</span>
              <span><Info size={14} /> {unreadCount} unread</span>
              <span><CheckCircle size={14} /> Realtime updates enabled</span>
            </div>
          </div>

          <aside className="sn-command-card">
            <div>
              <div className="sn-command-top">
                <div>
                  <div className="sn-command-label">Unread</div>
                  <div className="sn-command-number">{unreadCount}</div>
                </div>
                <div className="sn-command-icon">
                  <Bell size={20} />
                </div>
              </div>
              <p className="sn-command-note">
                Keep this clear so placement decisions, verification actions, and certificate events are not missed.
              </p>
            </div>

            {notifications.length > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending || unreadCount === 0}
                className="sn-btn sn-btn-primary"
              >
                {markAllReadMutation.isPending ? <><Loader size={14} /> Updating...</> : <><Check size={15} /> Mark all read</>}
              </button>
            )}
          </aside>
        </section>

        <section className="sn-metrics" aria-label="Notification metrics">
          <div className="sn-metric-card">
            <div className="sn-metric-icon blue"><Bell size={19} /></div>
            <div>
              <div className="sn-metric-label">Total</div>
              <div className="sn-metric-value">{notifications.length}</div>
            </div>
          </div>
          <div className="sn-metric-card">
            <div className="sn-metric-icon orange"><Circle size={19} /></div>
            <div>
              <div className="sn-metric-label">Unread</div>
              <div className="sn-metric-value">{unreadCount}</div>
            </div>
          </div>
          <div className="sn-metric-card">
            <div className="sn-metric-icon sky"><Bell size={19} /></div>
            <div>
              <div className="sn-metric-label">Applications</div>
              <div className="sn-metric-value">{applicationCount}</div>
            </div>
          </div>
          <div className="sn-metric-card">
            <div className="sn-metric-icon green"><ShieldCheck size={19} /></div>
            <div>
              <div className="sn-metric-label">Trusted</div>
              <div className="sn-metric-value">{verificationCount}</div>
            </div>
          </div>
        </section>

        {isLoading ? (
          <div className="sn-state">
            <div className="sn-state-icon"><Loader size={26} /></div>
            <h2 className="sn-state-title">Loading activity</h2>
            <p className="sn-state-text">Fetching your latest placement, verification, and account updates.</p>
          </div>
        ) : isError ? (
          <div className="sn-alert" role="alert">
            <AlertCircle size={16} />
            <span>We could not load your notifications. Please refresh the page.</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="sn-state">
            <div className="sn-state-icon"><Bell size={28} /></div>
            <h2 className="sn-state-title">No notifications yet</h2>
            <p className="sn-state-text">
              When application updates, verification events, or placement actions arrive, they will appear here.
            </p>
          </div>
        ) : (
          <>
            <section className="sn-controls" aria-label="Notification controls">
              <div className="sn-filter-chips">
                <span className="sn-hero-meta" style={{ gap: 6 }}>
                  <span><Filter size={14} /> Filter</span>
                </span>
                {filters.map(filter => (
                  <button
                    key={filter.key}
                    type="button"
                    className={`sn-chip${activeFilter === filter.key ? ' active' : ''}`}
                    onClick={() => setActiveFilter(filter.key)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <div className="sn-search-wrap">
                <Search size={15} className="sn-search-icon" />
                <input
                  className="sn-input"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search notifications..."
                  aria-label="Search notifications"
                />
              </div>
            </section>

            {groupedNotifications.length === 0 ? (
              <div className="sn-state">
                <div className="sn-state-icon"><Search size={26} /></div>
                <h2 className="sn-state-title">No matching notifications</h2>
                <p className="sn-state-text">
                  Your filter or search is too narrow. Clear the search or switch back to all notifications.
                </p>
                <button
                  type="button"
                  className="sn-btn sn-btn-outline"
                  onClick={() => { setSearchTerm(''); setActiveFilter('ALL'); }}
                >
                  Reset view
                </button>
              </div>
            ) : (
              <section className="sn-feed" aria-label="Notification feed">
                {groupedNotifications.map(([groupName, items]) => (
                  <div key={groupName} className="sn-group">
                    <div className="sn-group-header">
                      <h2 className="sn-group-title">
                        <Sparkles size={12} />
                        {groupName}
                      </h2>
                      <span className="sn-group-count">{items.length} update{items.length === 1 ? '' : 's'}</span>
                    </div>

                    <div className="sn-list">
                      {items.map(notification => {
                        const visual = getNotificationVisual(notification.type);
                        const Icon = visual.icon;
                        const isUnread = notification.status !== 'read';

                        return (
                          <button
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`sn-item${isUnread ? ' unread' : ''}`}
                            type="button"
                          >
                            <div className={`sn-icon ${visual.tone === 'neutral' ? '' : visual.tone}`}>
                              <Icon size={18} />
                            </div>

                            <div style={{ minWidth: 0 }}>
                              <div className="sn-item-title-row">
                                {isUnread && <span className="sn-unread-dot" aria-label="Unread notification" />}
                                <span className="sn-item-title">{notification.title}</span>
                                <span className="sn-type-badge">{visual.label}</span>
                              </div>
                              <span className="sn-item-body">{notification.body}</span>
                            </div>

                            <span className="sn-item-time">
                              {isUnread ? <Circle size={10} /> : <CheckCircle size={12} />}
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentNotifications;
