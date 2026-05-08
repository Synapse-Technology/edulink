import { useEffect, useMemo, useState } from 'react';
import type { ElementType, ReactNode } from 'react';
import './StudentWorkspace.css';

type Tone = 'default' | 'success' | 'warning' | 'danger' | 'info';
type StudentPageSize = 25 | 50 | 100;

const STUDENT_PAGE_SIZES: StudentPageSize[] = [25, 50, 100];

export function StudentWorkspaceShell({
  children,
  darkMode = false,
}: {
  children: ReactNode;
  darkMode?: boolean;
}) {
  return <div className={`sw-shell${darkMode ? ' dark-mode' : ''}`}>{children}</div>;
}

export function StudentWorkspacePage({ children }: { children: ReactNode }) {
  return <div className="sw-page">{children}</div>;
}

export function StudentPageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="sw-page-header">
      <div>
        {eyebrow && <div className="sw-eyebrow">{eyebrow}</div>}
        <h1 className="sw-title">{title}</h1>
        {subtitle && <p className="sw-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="sw-actions">{actions}</div>}
    </section>
  );
}

export function StudentGrid({ children }: { children: ReactNode }) {
  return <div className="sw-grid">{children}</div>;
}

export function StudentColumn({
  span = 12,
  children,
}: {
  span?: 3 | 4 | 6 | 8 | 12;
  children: ReactNode;
}) {
  return <div className={`sw-col-${span}`}>{children}</div>;
}

export function StudentCard({
  label,
  title,
  subtitle,
  actions,
  children,
}: {
  label?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="sw-card">
      {(label || title || subtitle || actions) && (
        <div className="sw-card-header">
          <div>
            {label && <p className="sw-card-label">{label}</p>}
            {title && <h2 className="sw-card-title">{title}</h2>}
            {subtitle && <p className="sw-card-subtitle">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children && <div className="sw-card-body">{children}</div>}
    </section>
  );
}

export function StudentMetric({
  label,
  value,
  note,
  icon,
}: {
  label: ReactNode;
  value: ReactNode;
  note?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="sw-metric">
      <div>
        <div className="sw-metric-label">{label}</div>
        <div className="sw-metric-value">{value}</div>
        {note && <div className="sw-metric-note">{note}</div>}
      </div>
      {icon && <div className="sw-icon-tile">{icon}</div>}
    </div>
  );
}

export function StudentButton({
  as: Component = 'button',
  variant = 'default',
  className = '',
  ...props
}: {
  as?: ElementType;
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
  className?: string;
  [key: string]: unknown;
}) {
  const variantClass = variant === 'default' ? '' : ` sw-btn-${variant}`;
  return <Component className={`sw-btn${variantClass}${className ? ` ${className}` : ''}`} {...props} />;
}

export function StudentStatus({ tone = 'default', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`sw-status${tone === 'default' ? '' : ` ${tone}`}`}>{children}</span>;
}

export function StudentToolbar({ children }: { children: ReactNode }) {
  return <div className="sw-toolbar">{children}</div>;
}

export function StudentEmptyState({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="sw-state">
      <div>
        {icon && <div className="sw-icon-tile">{icon}</div>}
        <h2 className="sw-state-title">{title}</h2>
        {children && <div className="sw-state-text">{children}</div>}
      </div>
    </div>
  );
}

export function useStudentPagination<T>({
  items,
  initialPageSize = 25,
  resetKeys = [],
}: {
  items: T[];
  initialPageSize?: StudentPageSize;
  resetKeys?: unknown[];
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<StudentPageSize>(initialPageSize);

  const resetToken = useMemo(() => JSON.stringify(resetKeys), [resetKeys]);
  useEffect(() => {
    setPage(1);
  }, [resetToken]);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const pageItems = items.slice(startIndex, endIndex);

  return {
    page: currentPage,
    pageSize,
    pageItems,
    totalItems,
    totalPages,
    startItem: totalItems === 0 ? 0 : startIndex + 1,
    endItem: endIndex,
    setPage,
    setPageSize: (nextPageSize: StudentPageSize) => {
      setPageSize(nextPageSize);
      setPage(1);
    },
  };
}

export function StudentPagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  startItem,
  endItem,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: StudentPageSize;
  totalItems: number;
  totalPages: number;
  startItem: number;
  endItem: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: StudentPageSize) => void;
}) {
  if (totalItems === 0) return null;

  return (
    <div className="sw-pagination">
      <div className="sw-pagination-summary">
        Showing {startItem}-{endItem} of {totalItems}
      </div>
      <div className="sw-pagination-controls">
        <label className="sw-pagination-size">
          Rows
          <select
            className="sw-select sw-page-size"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value) as StudentPageSize)}
          >
            {STUDENT_PAGE_SIZES.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>
        <StudentButton
          as="button"
          type="button"
          variant="ghost"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Previous
        </StudentButton>
        <span className="sw-pagination-page">Page {page} of {totalPages}</span>
        <StudentButton
          as="button"
          type="button"
          variant="ghost"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          Next
        </StudentButton>
      </div>
    </div>
  );
}
