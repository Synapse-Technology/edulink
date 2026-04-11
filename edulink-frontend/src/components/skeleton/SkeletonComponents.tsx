/**
 * Skeleton Loading Components
 * Placeholder UI while data is loading
 * Provides better perceived performance and UX
 */

import React from 'react';

/**
 * Generic skeleton shimmer effect
 * Used as base for all skeleton components
 */
export const Skeleton: React.FC<{ className?: string; height?: string }> = ({
  className = 'w-full h-4',
  height,
}) => (
  <div
    className={`${className} bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse`}
    style={{ height }}
  />
);

/**
 * Text skeleton (for paragraphs, titles, etc.)
 */
export const TextSkeleton: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className = '',
}) => (
  <div className={`space-y-3 ${className}`}>
    {[...Array(lines)].map((_, i) => (
      <Skeleton key={i} className={`w-full h-4 ${i === lines - 1 ? 'w-3/4' : ''}`} />
    ))}
  </div>
);

/**
 * User/profile card skeleton
 */
export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 1 }) => (
  <div className="space-y-4">
    {[...Array(count)].map((_, idx) => (
      <div key={idx} className="p-4 bg-white rounded-lg shadow animate-pulse">
        <div className="flex gap-4">
          <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="w-32 h-4" />
            <Skeleton className="w-24 h-3" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

/**
 * Table skeleton (rows and cells)
 */
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4,
}) => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead className="bg-gray-100">
        <tr>
          {[...Array(columns)].map((_, i) => (
            <th key={i} className="px-6 py-3">
              <Skeleton className="w-full h-4" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {[...Array(rows)].map((_, rowIdx) => (
          <tr key={rowIdx} className="border-t">
            {[...Array(columns)].map((_, colIdx) => (
              <td key={colIdx} className="px-6 py-4">
                <Skeleton className="w-full h-4" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/**
 * List item skeleton (common for list pages)
 */
export const ListItemSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div className="space-y-3">
    {[...Array(count)].map((_, i) => (
      <div key={i} className="p-4 bg-white rounded-lg shadow animate-pulse">
        <div className="space-y-3">
          <Skeleton className="w-3/4 h-4" />
          <Skeleton className="w-full h-3" />
          <Skeleton className="w-2/3 h-3" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="w-20 h-6 rounded" />
            <Skeleton className="w-20 h-6 rounded" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

/**
 * Form field skeleton
 */
export const FormFieldSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-4">
    {[...Array(count)].map((_, i) => (
      <div key={i}>
        <Skeleton className="w-24 h-4 mb-2" />
        <Skeleton className="w-full h-10 rounded" />
      </div>
    ))}
  </div>
);

/**
 * Dashboard card skeleton (metric cards, etc.)
 */
export const DashboardCardSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {[...Array(count)].map((_, i) => (
      <div key={i} className="p-6 bg-white rounded-lg shadow animate-pulse">
        <Skeleton className="w-1/3 h-4 mb-4" />
        <Skeleton className="w-1/2 h-8 mb-2" />
        <Skeleton className="w-2/3 h-3" />
      </div>
    ))}
  </div>
);

/**
 * Inline loading spinner (for buttons, etc.)
 */
export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <svg
      className={`${sizeClasses[size]} animate-spin text-blue-600`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

/**
 * Full page loading skeleton
 */
export const PageLoadingSkeleton: React.FC<{ type?: 'list' | 'detail' | 'form' | 'dashboard' }> = ({
  type = 'list',
}) => {
  switch (type) {
    case 'detail':
      return (
        <div className="p-6 space-y-6">
          <Skeleton className="w-1/2 h-8 mb-4" />
          <FormFieldSkeleton count={4} />
        </div>
      );
    case 'form':
      return (
        <div className="max-w-2xl mx-auto p-6">
          <Skeleton className="w-1/2 h-8 mb-6" />
          <FormFieldSkeleton count={5} />
          <div className="flex gap-3 mt-6">
            <Skeleton className="flex-1 h-10 rounded" />
            <Skeleton className="flex-1 h-10 rounded" />
          </div>
        </div>
      );
    case 'dashboard':
      return (
        <div className="p-6 space-y-6">
          <DashboardCardSkeleton count={4} />
          <Skeleton className="w-1/4 h-6 mb-4" />
          <TableSkeleton rows={5} columns={4} />
        </div>
      );
    default: // 'list'
      return (
        <div className="p-6 space-y-4">
          <Skeleton className="w-1/3 h-8 mb-6" />
          <ListItemSkeleton count={5} />
        </div>
      );
  }
};

export default {
  Skeleton,
  TextSkeleton,
  CardSkeleton,
  TableSkeleton,
  ListItemSkeleton,
  FormFieldSkeleton,
  DashboardCardSkeleton,
  LoadingSpinner,
  PageLoadingSkeleton,
};
