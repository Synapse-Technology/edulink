import React, { useState, useCallback, useMemo } from 'react';
import { 
  CheckCircle,
  Info,
  Bell,
  MoreVertical,
  Check
} from 'lucide-react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { notificationService } from '../../services/notifications/notificationService';
import type { Notification } from '../../services/notifications/notificationService';
import { usePusher } from '../../hooks/usePusher';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import StudentSidebar from '../../components/dashboard/StudentSidebar';
import StudentHeader from '../../components/dashboard/StudentHeader';
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns';
import toast from 'react-hot-toast';

const StudentNotifications: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const queryClient = useQueryClient();

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  // Fetch notifications
  const { data: notifications = [], isLoading, isError } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationService.getNotifications,
    staleTime: 1000 * 60,
  });

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: notificationService.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
    onError: () => {
      toast.error('Failed to update notifications');
    }
  });

  // Mark single as read mutation
  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    if (!notifications) return [];

    const groups: { [key: string]: Notification[] } = {
      'Today': [],
      'Yesterday': [],
      'Older': []
    };

    notifications.forEach(notification => {
      const date = new Date(notification.created_at);
      if (isToday(date)) {
        groups['Today'].push(notification);
      } else if (isYesterday(date)) {
        groups['Yesterday'].push(notification);
      } else {
        groups['Older'].push(notification);
      }
    });

    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  }, [notifications]);

  // Handle real-time notifications
  const handleNewNotification = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [queryClient]);

  usePusher(
    user ? `user-${user.id}` : undefined,
    'notification-received',
    handleNewNotification
  );

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'EMAIL_VERIFIED':
      case 'INTERNSHIP_ACCEPTED':
      case 'CERTIFICATE_GENERATED':
        return <CheckCircle size={18} className="text-success" />;
      default:
        return <Info size={18} className="text-primary" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.status !== 'read') {
      markReadMutation.mutate(notification.id);
    }
  };

  return (
    <div className={`min-vh-100 ${isDarkMode ? 'text-white' : 'bg-light'}`} style={{ backgroundColor: isDarkMode ? '#0f172a' : undefined }}>
      {/* Sidebar & Mobile Menu */}
      {isMobileMenuOpen && (
        <div 
          className="d-lg-none position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50" 
          style={{ zIndex: 1039 }}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      <div className={`${isMobileMenuOpen ? 'd-block' : 'd-none'} d-lg-block position-fixed top-0 start-0 h-100 d-flex flex-column`} style={{ zIndex: 1040, width: '280px' }}>
        <StudentSidebar isDarkMode={isDarkMode} />
      </div>

      <div 
        className="d-flex flex-column min-vh-100 main-content-margin"
        onClick={isMobileMenuOpen ? () => setIsMobileMenuOpen(false) : undefined}
      >
        <style>{`
          .main-content-margin {
            margin-left: 0;
            max-width: 100vw;
          }
          @media (min-width: 992px) {
            .main-content-margin {
              margin-left: 280px !important;
              max-width: calc(100vw - 280px) !important;
            }
          }
          .notification-card {
            transition: background-color 0.2s ease;
            cursor: pointer;
          }
          .notification-unread {
            border-left: 3px solid #0d6efd !important;
          }
          .section-title {
            font-size: 0.85rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin: 1.5rem 0 0.75rem 0;
          }
          .btn-link-formal {
            font-size: 0.9rem;
            color: #0d6efd;
            text-decoration: none;
            font-weight: 500;
            padding: 0;
          }
          .btn-link-formal:hover {
            text-decoration: underline;
          }
        `}</style>
        
        <div className="px-4 px-lg-5 pt-4">
          <StudentHeader
            onMobileMenuClick={toggleMobileMenu}
            isMobileMenuOpen={isMobileMenuOpen}
          />
        </div>

        <div className="flex-grow-1 px-4 px-lg-5 pb-5">
            {/* Header */}
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-end mb-4 pt-2 gap-3">
               <div>
                  <h2 className={`fw-bold mb-1 ${isDarkMode ? 'text-white' : 'text-dark'}`} style={{ fontSize: '1.75rem' }}>Notifications</h2>
                  <p className={`mb-0 ${isDarkMode ? 'text-light opacity-75' : 'text-muted'}`} style={{ fontSize: '0.95rem' }}>
                    Manage your alerts and system messages.
                  </p>
               </div>
               {notifications && notifications.length > 0 && (
                 <button 
                  onClick={() => markAllReadMutation.mutate()}
                  disabled={markAllReadMutation.isPending}
                  className="btn btn-link-formal d-flex align-items-center gap-1"
                 >
                   <Check size={16} />
                   Mark all as read
                 </button>
               )}
            </div>

            {/* Notifications Content */}
            {isLoading ? (
              <div className="py-5 text-center">
                <div className="spinner-border text-primary spinner-border-sm" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2 text-muted small">Loading your activity...</p>
              </div>
            ) : isError ? (
              <div className="alert alert-danger border-0 rounded-3 shadow-sm d-flex align-items-center" role="alert">
                <Info className="me-2" size={18} />
                <div>Failed to load notifications. Please refresh the page.</div>
              </div>
            ) : notifications?.length === 0 ? (
              <div className="card border-0 shadow-sm rounded-4 p-5 text-center">
                <div className="bg-light rounded-circle p-4 d-inline-block mb-3 mx-auto">
                  <Bell size={40} className="text-muted opacity-50" />
                </div>
                <h5 className="fw-bold">No notifications yet</h5>
                <p className="text-muted mb-0">When you receive alerts, they will appear here.</p>
              </div>
            ) : (
              <div className="notifications-list">
                {groupedNotifications.map(([groupName, items]) => (
                  <div key={groupName} className="mb-4">
                    <h6 className="section-title">{groupName}</h6>
                    <div className="d-flex flex-column gap-2">
                      {items.map((notification) => (
                        <div 
                          key={notification.id} 
                          onClick={() => handleNotificationClick(notification)}
                          className={`notification-card p-3 rounded-3 shadow-sm d-flex align-items-start gap-3 ${notification.status !== 'read' ? 'notification-unread' : ''}`}
                        >
                          <div className={`flex-shrink-0 rounded-circle p-2 ${notification.type.includes('SUCCESS') ? 'bg-success-subtle' : 'bg-primary-subtle'}`}>
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-grow-1 min-w-0">
                            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start mb-1 gap-1">
                              <h6 className={`mb-0 fw-bold text-truncate w-100 ${isDarkMode ? 'text-white' : 'text-dark'}`} style={{ fontSize: '0.95rem' }}>
                                {notification.title}
                              </h6>
                              <span className="text-muted flex-shrink-0" style={{ fontSize: '0.75rem' }}>
                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="mb-0 text-muted" style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                              {notification.body}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default StudentNotifications;
