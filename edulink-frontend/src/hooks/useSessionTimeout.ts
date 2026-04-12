import React, { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { showToast } from '../utils/toast';

/**
 * useSessionTimeout - Monitor user inactivity and auto-logout
 *
 * Configuration:
 * - totalSessionTime: Total session duration in milliseconds (default 30 minutes)
 * - warningTime: Time before expiry to warn user in milliseconds (default 5 minutes)
 * - checkInterval: How often to check for timeout in milliseconds (default 1 minute)
 *
 * Events tracked: mouse move, click, keyboard, scroll, focus
 * Auto-logout: Silent redirect to login page after timeout
 * Warning: Toast notification when 5 minutes remaining
 *
 * Usage in App.tsx:
 * ```
 * function App() {
 *   useSessionTimeout();
 *   return (
 *     // app content
 *   );
 * }
 * ```
 */
export const useSessionTimeout = (config?: {
  totalSessionTime?: number; // milliseconds (default 30 min)
  warningTime?: number; // milliseconds (default 5 min)
  checkInterval?: number; // milliseconds (default 1 min)
}) => {
  const {
    totalSessionTime = 30 * 60 * 1000, // 30 minutes
    warningTime = 5 * 60 * 1000, // 5 minutes
    checkInterval = 1 * 60 * 1000, // 1 minute
  } = config || {};

  const logout = useAuthStore((state) => state.logout);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Track activity timestamps
  const lastActivityRef = useRef<number>(Date.now());
  const warningShownRef = useRef<boolean>(false);
  const checkIntervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Record user activity
   */
  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false; // Reset warning flag on new activity
  }, []);

  /**
   * Check if session has expired
   */
  const checkSessionTimeout = useCallback(() => {
    if (!isAuthenticated) {
      return;
    }

    const now = Date.now();
    const inactiveTime = now - lastActivityRef.current;
    const timeRemaining = totalSessionTime - inactiveTime;

    // Session expired - logout
    if (timeRemaining <= 0) {
      warningShownRef.current = false;
      logout();
      showToast.error('Your session has expired. Please log in again.');
      return;
    }

    // Warn when 5 minutes remaining (only once per session)
    if (timeRemaining <= warningTime && !warningShownRef.current) {
      warningShownRef.current = true;
      const minutesRemaining = Math.floor(timeRemaining / 60000);
      showToast.warning(`Your session will expire in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}. Please save your work.`);
    }
  }, [isAuthenticated, totalSessionTime, warningTime, logout]);

  /**
   * Setup activity tracking
   */
  useEffect(() => {
    if (!isAuthenticated) return;

    // Track user activities
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'focus'];

    activityEvents.forEach((event) => {
      window.addEventListener(event, recordActivity, { passive: true });
    });

    // Setup periodic check for timeout
    const intervalId = setInterval(checkSessionTimeout, checkInterval);
    checkIntervalIdRef.current = intervalId;

    return () => {
      // Cleanup
      activityEvents.forEach((event) => {
        window.removeEventListener(event, recordActivity);
      });

      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isAuthenticated, recordActivity, checkSessionTimeout, checkInterval]);

  /**
   * Reset session timer (useful for explicit user actions)
   * Can be called from logout handlers or other places
   */
  const resetSessionTimer = useCallback(() => {
    recordActivity();
  }, [recordActivity]);

  return {
    resetSessionTimer,
  };
};

/**
 * Alternative: useSessionTimeout hook with visual countdown
 * Shows remaining time in UI
 */
export const useSessionTimeoutWithCountdown = (config?: {
  totalSessionTime?: number;
  warningTime?: number;
  checkInterval?: number;
}) => {
  const {
    totalSessionTime = 30 * 60 * 1000,
    warningTime = 5 * 60 * 1000,
    checkInterval = 1000, // 1 second for countdown precision
  } = config || {};

  const logout = useAuthStore((state) => state.logout);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const lastActivityRef = useRef<number>(Date.now());
  const timeRemainingRef = useRef<number>(totalSessionTime);
  const warningShownRef = useRef<boolean>(false);
  const [timeRemaining, setTimeRemaining] = React.useState<number>(totalSessionTime);

  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    timeRemainingRef.current = totalSessionTime;
    warningShownRef.current = false;
    setTimeRemaining(totalSessionTime);
  }, [totalSessionTime]);

  const checkSessionTimeout = useCallback(() => {
    if (!isAuthenticated) return;

    const now = Date.now();
    const inactiveTime = now - lastActivityRef.current;
    const remaining = Math.max(0, totalSessionTime - inactiveTime);

    timeRemainingRef.current = remaining;
    setTimeRemaining(remaining);

    // Session expired
    if (remaining <= 0) {
      warningShownRef.current = false;
      logout();
      showToast.error('Your session has expired. Please log in again.');
      return;
    }

    // Warn at 5 minutes
    if (remaining <= warningTime && !warningShownRef.current) {
      warningShownRef.current = true;
      const minutesRemaining = Math.floor(remaining / 60000);
      showToast.warning(`Your session will expire in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}. Please save your work.`);
    }
  }, [isAuthenticated, totalSessionTime, warningTime, logout]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'focus'];

    activityEvents.forEach((event) => {
      window.addEventListener(event, recordActivity, { passive: true });
    });

    const intervalId = setInterval(checkSessionTimeout, checkInterval);

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, recordActivity);
      });
      clearInterval(intervalId);
    };
  }, [isAuthenticated, recordActivity, checkSessionTimeout, checkInterval]);

  const resetSessionTimer = useCallback(() => {
    recordActivity();
  }, [recordActivity]);

  // Format time remaining as MM:SS for display
  const formatTimeRemaining = (): string => {
    const totalSeconds = Math.floor(timeRemaining / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return {
    timeRemaining,
    formattedTime: formatTimeRemaining(),
    isWarning: timeRemaining <= warningTime,
    resetSessionTimer,
  };
};
