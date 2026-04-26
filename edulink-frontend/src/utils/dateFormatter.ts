/**
 * Centralized date formatting utility
 * Ensures consistent date display across entire application
 * This is the single source of truth for all date formatting
 */

type FormatOptions = {
  includeTime?: boolean;
  timezone?: string;
  locale?: string;
};

export const dateFormatter = {
  /**
   * Short format: "Jan 15, 2026"
   * Use for tables, lists, and compact displays
   */
  shortDate: (date: string | Date, options?: FormatOptions): string => {
    try {
      return new Date(date).toLocaleDateString(options?.locale || 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  },

  /**
   * Long format: "January 15, 2026"
   * Use for important dates, headers, and formal displays
   */
  longDate: (date: string | Date, options?: FormatOptions): string => {
    try {
      return new Date(date).toLocaleDateString(options?.locale || 'en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  },

  /**
   * With time: "Jan 15, 2026 at 2:30 PM"
   * Use when both date and time are important
   */
  dateWithTime: (date: string | Date, options?: FormatOptions): string => {
    try {
      return new Date(date).toLocaleString(options?.locale || 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid date';
    }
  },

  /**
   * ISO format: "2026-01-15"
   * Use for API calls, storage, and data exports
   */
  isoDate: (date: string | Date): string => {
    try {
      return new Date(date).toISOString().split('T')[0];
    } catch {
      return 'Invalid date';
    }
  },

  /**
   * Relative time: "2 hours ago", "3 days ago"
   * Use for activity feeds, timestamps
   */
  relativeTime: (date?: string | Date): string => {
    if (!date) return 'Invalid date';

    try {
      const now = new Date();
      const diff = now.getTime() - new Date(date).getTime();
      const seconds = Math.floor(diff / 1000);

      if (seconds < 60) return 'Just now';
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      if (days < 7) return `${days}d ago`;
      if (days < 30) return `${Math.floor(days / 7)}w ago`;
      return dateFormatter.shortDate(date);
    } catch {
      return 'Invalid date';
    }
  },

  /**
   * Date range: "Jan 15 - Feb 20, 2026"
   * Use for showing duration between two dates
   */
  dateRange: (startDate: string | Date, endDate: string | Date): string => {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      const startFormatted = start.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      const endFormatted = end.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      return `${startFormatted} - ${endFormatted}`;
    } catch {
      return 'Invalid date range';
    }
  },
};
