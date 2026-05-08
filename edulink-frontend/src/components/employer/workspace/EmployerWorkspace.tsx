import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import './EmployerWorkspace.css';

type Tone = 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'muted';
type PageSize = 25 | 50 | 100;

interface ClassNameProps {
  className?: string;
  children: React.ReactNode;
}

export const EMPLOYER_PAGE_SIZE_OPTIONS: PageSize[] = [25, 50, 100];

export const EmployerWorkspacePage: React.FC<ClassNameProps> = ({ className = '', children }) => (
  <div className={`ew-page ${className}`.trim()}>{children}</div>
);

interface EmployerHeroProps {
  eyebrow?: React.ReactNode;
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}

export const EmployerHero: React.FC<EmployerHeroProps> = ({
  eyebrow,
  icon,
  title,
  subtitle,
  actions,
  aside,
  className = '',
}) => (
  <section className={`ew-hero ${aside ? 'ew-hero-with-aside' : ''} ${className}`.trim()}>
    <div className="ew-command-card">
      {eyebrow && (
        <div className="ew-kicker">
          {icon}
          {eyebrow}
        </div>
      )}
      <h1 className="ew-title">{title}</h1>
      {subtitle && <p className="ew-subtitle">{subtitle}</p>}
      {actions && <div className="ew-hero-actions">{actions}</div>}
    </div>
    {aside && <aside className="ew-health-card">{aside}</aside>}
  </section>
);

interface EmployerHealthProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  note?: React.ReactNode;
}

export const EmployerHealth: React.FC<EmployerHealthProps> = ({ label, value, icon, note }) => (
  <>
    <div className="ew-health-top">
      <div>
        <div className="ew-label">{label}</div>
        <div className="ew-health-score">{value}</div>
      </div>
      {icon && <div className="ew-health-icon">{icon}</div>}
    </div>
    {note && <p className="ew-health-note">{note}</p>}
  </>
);

export const EmployerMetricGrid: React.FC<ClassNameProps> = ({ className = '', children }) => (
  <section className={`ew-metrics ${className}`.trim()}>{children}</section>
);

interface EmployerMetricProps {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  icon?: React.ReactNode;
  as?: 'div' | 'button' | 'a';
  href?: string;
  onClick?: () => void;
  className?: string;
}

export const EmployerMetric: React.FC<EmployerMetricProps> = ({
  label,
  value,
  note,
  icon,
  as = 'div',
  href,
  onClick,
  className = '',
}) => {
  const Component = as;

  return (
    <Component
      className={`ew-metric ${className}`.trim()}
      href={as === 'a' ? href : undefined}
      onClick={as === 'button' ? onClick : undefined}
      type={as === 'button' ? 'button' : undefined}
    >
      <div className="ew-metric-top">
        <div>
          <div className="ew-metric-label">{label}</div>
          <div className="ew-metric-value">{value}</div>
        </div>
        {icon && <div className="ew-metric-icon">{icon}</div>}
      </div>
      {note && <p className="ew-metric-note">{note}</p>}
    </Component>
  );
};

export const EmployerToolbar: React.FC<ClassNameProps> = ({ className = '', children }) => (
  <section className={`ew-toolbar ${className}`.trim()}>{children}</section>
);

export const EmployerToolbarGrid: React.FC<ClassNameProps> = ({ className = '', children }) => (
  <div className={`ew-toolbar-grid ${className}`.trim()}>{children}</div>
);

interface EmployerSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}

export const EmployerSearch: React.FC<EmployerSearchProps> = ({
  value,
  onChange,
  placeholder,
  className = '',
}) => (
  <label className={`ew-search ${className}`.trim()}>
    <Search size={16} />
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  </label>
);

interface EmployerSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  leadingIcon?: React.ReactNode;
}

export const EmployerSelect: React.FC<EmployerSelectProps> = ({
  leadingIcon,
  className = '',
  children,
  ...props
}) => (
  <label className={`ew-select-wrap ${leadingIcon ? 'has-icon' : ''}`.trim()}>
    {leadingIcon}
    <select className={`ew-select ${className}`.trim()} {...props}>
      {children}
    </select>
  </label>
);

interface EmployerPanelProps {
  label?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const EmployerPanel: React.FC<EmployerPanelProps> = ({
  label,
  title,
  subtitle,
  actions,
  children,
  className = '',
}) => (
  <section className={`ew-panel ${className}`.trim()}>
    {(label || title || subtitle || actions) && (
      <div className="ew-panel-header">
        <div>
          {label && <div className="ew-label">{label}</div>}
          {title && <h2 className="ew-panel-title">{title}</h2>}
          {subtitle && <p className="ew-panel-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="ew-panel-actions">{actions}</div>}
      </div>
    )}
    {children}
  </section>
);

export const EmployerTableWrap: React.FC<ClassNameProps> = ({ className = '', children }) => (
  <div className={`ew-table-wrap ${className}`.trim()}>{children}</div>
);

interface EmployerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'success' | 'warning' | 'danger';
}

export const EmployerButton: React.FC<EmployerButtonProps> = ({
  variant = 'secondary',
  className = '',
  children,
  ...props
}) => (
  <button type="button" className={`ew-btn ew-btn-${variant} ${className}`.trim()} {...props}>
    {children}
  </button>
);

interface EmployerStatusProps {
  tone?: Tone;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const EmployerStatus: React.FC<EmployerStatusProps> = ({
  tone = 'default',
  icon,
  children,
  className = '',
}) => (
  <span className={`ew-status ew-status-${tone} ${className}`.trim()}>
    {icon}
    {children}
  </span>
);

interface EmployerEmptyStateProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  message?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmployerEmptyState: React.FC<EmployerEmptyStateProps> = ({
  icon,
  title,
  message,
  action,
}) => (
  <div className="ew-empty">
    {icon && <div className="ew-empty-icon">{icon}</div>}
    <p className="ew-empty-title">{title}</p>
    {message && <p className="ew-empty-text">{message}</p>}
    {action && <div className="ew-empty-action">{action}</div>}
  </div>
);

export function useEmployerPagination<T>(
  items: T[],
  initialPageSize: PageSize = 25
) {
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

interface EmployerPaginationProps {
  page: number;
  pageSize: PageSize;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSize) => void;
}

export const EmployerPagination: React.FC<EmployerPaginationProps> = ({
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
}) => {
  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(totalItems, page * pageSize);

  return (
    <div className="ew-pagination">
      <div className="ew-pagination-meta">
        Showing {from}-{to} of {totalItems}
      </div>
      <div className="ew-pagination-controls">
        <select
          className="ew-pagination-size"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value) as PageSize)}
          aria-label="Rows per page"
        >
          {EMPLOYER_PAGE_SIZE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option} rows
            </option>
          ))}
        </select>
        <button
          type="button"
          className="ew-page-btn"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="ew-page-count">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          className="ew-page-btn"
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
