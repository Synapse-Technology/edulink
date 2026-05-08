import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import './InstitutionWorkspace.css';

type Tone = 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'muted';
type PageSize = 25 | 50 | 100;

export const INSTITUTION_PAGE_SIZE_OPTIONS: PageSize[] = [25, 50, 100];

export const InstitutionWorkspacePage: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className = '', children }) => (
  <div className={`iw-page ${className}`.trim()}>{children}</div>
);

export const InstitutionHero: React.FC<{
  eyebrow?: React.ReactNode;
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}> = ({ eyebrow, icon, title, subtitle, actions, aside, className = '' }) => (
  <section className={`iw-hero ${aside ? 'iw-hero-with-aside' : ''} ${className}`.trim()}>
    <div className="iw-command-card">
      {eyebrow && (
        <div className="iw-kicker">
          {icon}
          {eyebrow}
        </div>
      )}
      <h1 className="iw-title">{title}</h1>
      {subtitle && <p className="iw-subtitle">{subtitle}</p>}
      {actions && <div className="iw-hero-actions">{actions}</div>}
    </div>
    {aside && <aside className="iw-health-card">{aside}</aside>}
  </section>
);

export const InstitutionHealth: React.FC<{
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  note?: React.ReactNode;
}> = ({ label, value, icon, note }) => (
  <>
    <div className="iw-health-top">
      <div>
        <div className="iw-label">{label}</div>
        <div className="iw-health-score">{value}</div>
      </div>
      {icon && <div className="iw-health-icon">{icon}</div>}
    </div>
    {note && <p className="iw-health-note">{note}</p>}
  </>
);

export const InstitutionMetricGrid: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className = '', children }) => (
  <section className={`iw-metrics ${className}`.trim()}>{children}</section>
);

export const InstitutionMetric: React.FC<{
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}> = ({ label, value, note, icon, className = '' }) => (
  <div className={`iw-metric ${className}`.trim()}>
    <div className="iw-metric-top">
      <div>
        <div className="iw-metric-label">{label}</div>
        <div className="iw-metric-value">{value}</div>
      </div>
      {icon && <div className="iw-metric-icon">{icon}</div>}
    </div>
    {note && <p className="iw-metric-note">{note}</p>}
  </div>
);

export const InstitutionToolbar: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className = '', children }) => (
  <section className={`iw-toolbar ${className}`.trim()}>{children}</section>
);

export const InstitutionToolbarGrid: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className = '', children }) => (
  <div className={`iw-toolbar-grid ${className}`.trim()}>{children}</div>
);

export const InstitutionSearch: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}> = ({ value, onChange, placeholder, className = '' }) => (
  <label className={`iw-search ${className}`.trim()}>
    <Search size={16} />
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  </label>
);

export const InstitutionSelect: React.FC<
  React.SelectHTMLAttributes<HTMLSelectElement> & { leadingIcon?: React.ReactNode }
> = ({ leadingIcon, className = '', children, ...props }) => (
  <label className={`iw-select-wrap ${leadingIcon ? 'has-icon' : ''}`.trim()}>
    {leadingIcon}
    <select className={`iw-select ${className}`.trim()} {...props}>
      {children}
    </select>
  </label>
);

export const InstitutionPanel: React.FC<{
  label?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ label, title, subtitle, actions, className = '', children }) => (
  <section className={`iw-panel ${className}`.trim()}>
    {(label || title || subtitle || actions) && (
      <div className="iw-panel-header">
        <div>
          {label && <div className="iw-label">{label}</div>}
          {title && <h2 className="iw-panel-title">{title}</h2>}
          {subtitle && <p className="iw-panel-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="iw-panel-actions">{actions}</div>}
      </div>
    )}
    {children}
  </section>
);

export const InstitutionTableWrap: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className = '', children }) => (
  <div className={`iw-table-wrap ${className}`.trim()}>{children}</div>
);

export const InstitutionButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost' | 'success' | 'warning' | 'danger';
  }
> = ({ variant = 'secondary', className = '', children, ...props }) => (
  <button type="button" className={`iw-btn iw-btn-${variant} ${className}`.trim()} {...props}>
    {children}
  </button>
);

export const InstitutionStatus: React.FC<{
  tone?: Tone;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ tone = 'default', icon, className = '', children }) => (
  <span className={`iw-status iw-status-${tone} ${className}`.trim()}>
    {icon}
    {children}
  </span>
);

export const InstitutionEmptyState: React.FC<{
  icon?: React.ReactNode;
  title: React.ReactNode;
  message?: React.ReactNode;
  action?: React.ReactNode;
}> = ({ icon, title, message, action }) => (
  <div className="iw-empty">
    {icon && <div className="iw-empty-icon">{icon}</div>}
    <p className="iw-empty-title">{title}</p>
    {message && <p className="iw-empty-text">{message}</p>}
    {action && <div className="iw-empty-action">{action}</div>}
  </div>
);

export function useInstitutionPagination<T>(items: T[], initialPageSize: PageSize = 25) {
  const [pageSize, setPageSize] = useState<PageSize>(initialPageSize);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const pagedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, pageSize, safePage]);

  const setSafePageSize = (next: PageSize) => {
    setPageSize(next);
    setPage(1);
  };

  return {
    page: safePage,
    pageSize,
    totalPages,
    totalItems: items.length,
    pagedItems,
    setPage,
    setPageSize: setSafePageSize,
  };
}

export const InstitutionPagination: React.FC<{
  page: number;
  pageSize: PageSize;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSize) => void;
}> = ({ page, pageSize, totalItems, totalPages, onPageChange, onPageSizeChange }) => {
  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(totalItems, page * pageSize);

  return (
    <div className="iw-pagination">
      <div className="iw-pagination-meta">
        Showing {from}-{to} of {totalItems}
      </div>
      <div className="iw-pagination-controls">
        <select
          className="iw-pagination-size"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value) as PageSize)}
          aria-label="Rows per page"
        >
          {INSTITUTION_PAGE_SIZE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option} rows
            </option>
          ))}
        </select>
        <button
          type="button"
          className="iw-page-btn"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="iw-page-count">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          className="iw-page-btn"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
};
