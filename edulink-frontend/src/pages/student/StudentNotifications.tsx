import React, { useCallback, useMemo } from 'react';
import {
  Bell,
  Check,
  CheckCircle,
  Info,
} from 'lucide-react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { notificationService } from '../../services/notifications/notificationService';
import type { Notification } from '../../services/notifications/notificationService';
import { usePusher } from '../../hooks/usePusher';
import { useAuth } from '../../contexts/AuthContext';
import { showToast } from '../../utils/toast';
import StudentLayout from '../../components/dashboard/StudentLayout';
import { formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import '../../styles/student-portal.css';

const StudentNotifications: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading, isError } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationService.getNotifications,
    staleTime: 1000 * 60,
  });

  const unreadCount = notifications.filter(notification => notification.status !== 'read').length;

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

  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: Notification[] } = {
      Today: [],
      Yesterday: [],
      Older: [],
    };

    notifications.forEach(notification => {
      const date = new Date(notification.created_at);
      if (isToday(date)) groups.Today.push(notification);
      else if (isYesterday(date)) groups.Yesterday.push(notification);
      else groups.Older.push(notification);
    });

    return Object.entries(groups).filter(([, items]) => items.length > 0);
  }, [notifications]);

  const handleNewNotification = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [queryClient]);

  usePusher(user ? `user-${user.id}` : undefined, 'notification-received', handleNewNotification);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'EMAIL_VERIFIED':
      case 'INTERNSHIP_ACCEPTED':
      case 'CERTIFICATE_GENERATED':
        return <CheckCircle size={18} />;
      default:
        return <Info size={18} />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.status !== 'read') {
      markReadMutation.mutate(notification.id);
    }
  };

  return (
    <StudentLayout>
      <div className="student-workspace">
        <section className="student-command-hero">
          <div className="student-command-copy">
            <span className="student-kicker">Activity inbox</span>
            <h1>Notifications</h1>
            <p>Review application updates, verification alerts, placement events, and account messages from one trusted inbox.</p>
            <div className="student-command-meta">
              <span><Bell size={15} /> {notifications.length} total</span>
              <span><Info size={15} /> {unreadCount} unread</span>
              <span><CheckCircle size={15} /> Realtime updates enabled</span>
            </div>
          </div>
          <div className="student-command-card">
            <span className="student-kicker">Unread</span>
            <strong>{unreadCount}</strong>
            <p className="student-command-note mb-3">Keep this clear so important placement actions are not missed.</p>
            {notifications.length > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2"
              >
                <Check size={16} />
                Mark all read
              </button>
            )}
          </div>
        </section>

        {isLoading ? (
          <div className="student-surface">
            <div className="student-surface-body text-center py-5">
              <div className="spinner-border text-primary spinner-border-sm" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2 student-muted small">Loading your activity...</p>
            </div>
          </div>
        ) : isError ? (
          <div className="alert alert-danger border-0 rounded-3 d-flex align-items-center" role="alert">
            <Info className="me-2" size={18} />
            <div>We could not load your notifications. Please refresh the page.</div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="student-surface">
            <div className="student-surface-body text-center py-5">
              <div className="student-empty-icon mx-auto mb-3">
                <Bell size={34} />
              </div>
              <h5 className="fw-bold">No notifications yet</h5>
              <p className="student-muted mb-0">When you receive alerts, they will appear here.</p>
            </div>
          </div>
        ) : (
          <section className="student-surface">
            <div className="student-surface-body">
              {groupedNotifications.map(([groupName, items]) => (
                <div key={groupName} className="mb-4">
                  <h6 className="student-kicker mb-3">{groupName}</h6>
                  <div className="student-evidence-rail">
                    {items.map(notification => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className="student-evidence-row"
                        role="button"
                        tabIndex={0}
                      >
                        <div className={`student-evidence-icon ${notification.status === 'read' ? '' : 'success'}`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="min-w-0">
                          <strong>{notification.title}</strong>
                          <span>{notification.body}</span>
                        </div>
                        <span className="student-muted small">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentNotifications;
