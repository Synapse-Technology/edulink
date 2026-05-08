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
import {
  StudentButton,
  StudentCard,
  StudentColumn,
  StudentEmptyState,
  StudentGrid,
  StudentMetric,
  StudentPagination,
  StudentPageHeader,
  StudentStatus,
  StudentToolbar,
  StudentWorkspacePage,
  StudentWorkspaceShell,
  useStudentPagination,
} from '../../components/student/workspace';

/* ─────────────────────────────────────────────
   Design tokens — unified with student application pages
───────────────────────────────────────────── */
const STYLES = `
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
    color: var(--sw-muted);
    pointer-events: none;
  }

  .sn-input {
    width: 100%;
    background: var(--sw-surface);
    border: 1px solid var(--sw-border);
    border-radius: 999px;
    padding: 11px 14px 11px 42px;
    font-family: var(--sw-font-body);
    font-size: 13px;
    color: var(--sw-text);
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
    box-sizing: border-box;
  }

  .sn-input::placeholder { color: var(--sw-muted); }

  .sn-input:focus {
    border-color: var(--sw-primary);
    box-shadow: inset 0 0 0 1px var(--sw-primary);
    background: var(--sw-surface-soft);
  }

  .sn-alert {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    border-radius: var(--sw-radius);
    padding: 14px 16px;
    font-size: 13px;
    line-height: 1.55;
    margin-bottom: 18px;
    background: var(--sw-danger-soft);
    color: var(--sw-muted-strong);
    border: 1px solid rgba(239,68,68,0.18);
  }

  .sn-alert svg { color: var(--sw-danger); flex-shrink: 0; margin-top: 1px; }

  /* ── Notification feed ── */
  .sn-feed {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 64px;
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
    border-bottom: 1px solid var(--sw-border);
    padding: 18px 22px;
    text-align: left;
    cursor: pointer;
    transition: background 0.15s;
  }

  .sn-item:last-child { border-bottom: none; }

  .sn-item:hover { background: var(--sw-surface-soft); }

  .sn-item.unread {
    background: linear-gradient(90deg, var(--sw-primary-soft), transparent 52%);
  }

  .sn-item.unread:hover {
    background: var(--sw-surface-soft);
  }

  .sn-icon {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: var(--sw-surface-soft);
    color: var(--sw-muted);
    border: 1px solid var(--sw-border);
  }

  .sn-icon.success { background: var(--sw-success-soft); color: var(--sw-success); border-color: rgba(18,183,106,0.16); }
  .sn-icon.info { background: var(--sw-info-soft); color: var(--sw-info); border-color: rgba(14,165,233,0.16); }
  .sn-icon.warning { background: var(--sw-warning-soft); color: var(--sw-warning); border-color: rgba(245,158,11,0.16); }
  .sn-icon.accent { background: var(--sw-primary-soft); color: var(--sw-primary); border-color: rgba(26, 184, 170, 0.16); }

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
    color: var(--sw-text);
    line-height: 1.35;
  }

  .sn-unread-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: var(--sw-primary);
    box-shadow: 0 0 0 4px var(--sw-primary-soft);
    flex-shrink: 0;
  }

  .sn-item-body {
    display: block;
    font-size: 13px;
    color: var(--sw-muted);
    line-height: 1.6;
  }

  .sn-item-time {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    color: var(--sw-muted);
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
    background: var(--sw-surface-soft);
    color: var(--sw-muted);
  }

  @media (max-width: 780px) {
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
    .sn-item { padding: 16px; }
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

  const notificationPagination = useStudentPagination({
    items: filteredNotifications,
    resetKeys: [activeFilter, searchTerm],
  });

  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: Notification[] } = {
      Today: [],
      Yesterday: [],
      Older: [],
    };

    notificationPagination.pageItems.forEach(notification => {
      groups[getGroupLabel(notification.created_at)].push(notification);
    });

    return Object.entries(groups).filter(([, items]) => items.length > 0);
  }, [notificationPagination.pageItems]);

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
      <StudentWorkspaceShell darkMode={isDarkMode}>
      <StudentWorkspacePage>
        <StudentPageHeader
          eyebrow={
            <>
              <Sparkles size={12} />
              EduLink · Activity inbox
            </>
          }
          title="Notification Center"
          subtitle={
            <>
              Review application decisions, verification events, certificate updates, and important account messages from one trusted student inbox.
            </>
          }
          actions={
            notifications.length > 0 ? (
              <StudentButton
                as="button"
                type="button"
                variant="primary"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending || unreadCount === 0}
              >
                {markAllReadMutation.isPending ? <><Loader size={14} /> Updating...</> : <><Check size={15} /> Mark all read</>}
              </StudentButton>
            ) : undefined
          }
        />

        <StudentGrid>
          <StudentColumn span={3}>
            <StudentMetric label="Total" value={notifications.length} note="All account updates" icon={<Bell size={18} />} />
          </StudentColumn>
          <StudentColumn span={3}>
            <StudentMetric label="Unread" value={unreadCount} note="Needs attention" icon={<Circle size={18} />} />
          </StudentColumn>
          <StudentColumn span={3}>
            <StudentMetric label="Applications" value={applicationCount} note="Placement decisions" icon={<MailCheck size={18} />} />
          </StudentColumn>
          <StudentColumn span={3}>
            <StudentMetric label="Trusted" value={verificationCount} note="Verification events" icon={<ShieldCheck size={18} />} />
          </StudentColumn>
        </StudentGrid>

        <div style={{ height: 16 }} />

        {isLoading ? (
          <StudentEmptyState icon={<Loader size={20} />} title="Loading activity">
            Fetching your latest placement, verification, and account updates.
          </StudentEmptyState>
        ) : isError ? (
          <div className="sn-alert" role="alert">
            <AlertCircle size={16} />
            <span>We could not load your notifications. Please refresh the page.</span>
          </div>
        ) : notifications.length === 0 ? (
          <StudentEmptyState icon={<Bell size={20} />} title="No notifications yet">
            When application updates, verification events, or placement actions arrive, they will appear here.
          </StudentEmptyState>
        ) : (
          <>
            <StudentToolbar>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--sw-muted)', fontSize: 13 }}>
                  <Filter size={14} /> Filter
                </span>
                {filters.map(filter => (
                  <StudentButton
                    key={filter.key}
                    as="button"
                    type="button"
                    variant={activeFilter === filter.key ? 'primary' : 'ghost'}
                    onClick={() => setActiveFilter(filter.key)}
                  >
                    {filter.label}
                  </StudentButton>
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
            </StudentToolbar>

            {groupedNotifications.length === 0 ? (
              <StudentEmptyState icon={<Search size={22} />} title="No matching notifications">
                <>
                  Your filter or search is too narrow. Clear the search or switch back to all notifications.
                  <br />
                  <StudentButton
                    as="button"
                    type="button"
                    variant="ghost"
                    onClick={() => { setSearchTerm(''); setActiveFilter('ALL'); }}
                    style={{ marginTop: 14 }}
                  >
                    Reset view
                  </StudentButton>
                </>
              </StudentEmptyState>
            ) : (
              <section className="sn-feed" aria-label="Notification feed">
                {groupedNotifications.map(([groupName, items]) => (
                  <StudentCard
                    key={groupName}
                    label={<><Sparkles size={12} /> {groupName}</>}
                    actions={<StudentStatus>{items.length} update{items.length === 1 ? '' : 's'}</StudentStatus>}
                  >
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
                  </StudentCard>
                ))}
                <StudentPagination
                  page={notificationPagination.page}
                  pageSize={notificationPagination.pageSize}
                  totalItems={notificationPagination.totalItems}
                  totalPages={notificationPagination.totalPages}
                  startItem={notificationPagination.startItem}
                  endItem={notificationPagination.endItem}
                  onPageChange={notificationPagination.setPage}
                  onPageSizeChange={notificationPagination.setPageSize}
                />
              </section>
            )}
          </>
        )}
      </StudentWorkspacePage>
      </StudentWorkspaceShell>
    </StudentLayout>
  );
};

export default StudentNotifications;
