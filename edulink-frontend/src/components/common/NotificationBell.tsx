import React, { useCallback } from 'react';
import { Bell } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../../services/notifications/notificationService';
import { usePusher } from '../../hooks/usePusher';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

interface NotificationBellProps {
  isDarkMode?: boolean;
  className?: string;
  userId?: string;
  linkTo?: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ 
  isDarkMode = false, 
  className = "", 
  userId,
  linkTo = "/dashboard/student/notifications"
}) => {
  const queryClient = useQueryClient();

  // Fetch unread count using TanStack Query
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: notificationService.getUnreadCount,
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minute
  });

  // Handle real-time notification events
  const handleNewNotification = useCallback((data?: any) => {
    // Show toast for the new notification
    if (data && data.title) {
      toast(data.title, {
        icon: '🔔',
        duration: 4000,
        position: 'top-right',
      });
    }

    // Invalidate the count query to refetch from server
    queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
    
    // Also invalidate the main notifications list if the user is on that page
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [queryClient]);

  // Subscribe to real-time notification events
  usePusher(
    userId ? `user-${userId}` : undefined,
    'notification-received',
    handleNewNotification
  );

  return (
    <Link 
      to={linkTo}
      className={`btn btn-link position-relative p-2 rounded-circle hover-bg-opacity ${className} ${
        isDarkMode ? 'text-info' : 'text-secondary'
      }`}
      style={{ 
        backgroundColor: isDarkMode ? 'rgba(32, 201, 151, 0.1)' : 'rgba(108, 117, 125, 0.05)',
        textShadow: isDarkMode ? '0 0 8px rgba(32, 201, 151, 0.3)' : 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        textDecoration: 'none'
      }}
    >
      <Bell size={20} />
      {unreadCount > 0 && (
        <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-white" style={{ fontSize: '0.65rem' }}>
          {unreadCount > 99 ? '99+' : unreadCount}
          <span className="visually-hidden">unread notifications</span>
        </span>
      )}
    </Link>
  );
};

export default NotificationBell;
