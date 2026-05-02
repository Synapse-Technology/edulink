import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, TrendingUp } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: { value: number; isPositive: boolean };
  link?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, description, trend, link }) => {
  const content = (
    <div className="student-metric">
      <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
        <div>
          <p className="student-kicker mb-2">{title}</p>
          <h3 className="student-metric-value">{value}</h3>
        </div>
        <div className="student-row-icon primary">{icon}</div>
      </div>
      {description && <p className="student-muted small mb-2">{description}</p>}
      {trend && (
        <div className="d-flex align-items-center gap-1">
          <TrendingUp size={14} className={trend.isPositive ? 'text-success' : 'text-danger'} />
          <small className={trend.isPositive ? 'text-success' : 'text-danger'}>
            {trend.isPositive ? '+' : '-'}{trend.value}%
          </small>
        </div>
      )}
      {link && <ArrowUpRight size={16} className="student-muted position-absolute end-0 bottom-0 me-3 mb-3" />}
    </div>
  );

  return link ? (
    <Link to={link} className="student-metric-link position-relative">
      {content}
    </Link>
  ) : (
    content
  );
};

export default StatCard;
