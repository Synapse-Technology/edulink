import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: { value: number; isPositive: boolean };
  link?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, description, trend, link }) => {
  const { isDarkMode } = useTheme();

  const CardContent = () => (
    <div className={`card h-100 hover-shadow transition-all ${isDarkMode ? 'bg-dark border-secondary' : 'bg-white'}`} style={{ borderRadius: '16px', border: isDarkMode ? '1px solid #374151' : '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
      <div className="card-body d-flex flex-column justify-content-between">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <p className={`small mb-1 ${isDarkMode ? 'text-info opacity-75' : 'text-muted'}`}>{title}</p>
            <h4 className={`fw-bold mb-0 ${isDarkMode ? 'text-info' : 'text-primary'}`} style={isDarkMode ? { textShadow: '0 0 10px rgba(32, 201, 151, 0.5)' } : {}}>{value}</h4>
          </div>
          <div className="bg-primary bg-opacity-10 rounded-circle p-3">
            {icon}
          </div>
        </div>
        {description && (
          <p className={`small mb-2 ${isDarkMode ? 'text-light opacity-75' : 'text-muted'}`}>{description}</p>
        )}
        {trend && (
          <div className="d-flex align-items-center gap-1">
            <TrendingUp 
              size={14} 
              className={trend.isPositive ? (isDarkMode ? 'text-success' : 'text-success') : (isDarkMode ? 'text-danger' : 'text-danger')} 
            />
            <small className={trend.isPositive ? (isDarkMode ? 'text-success' : 'text-success') : (isDarkMode ? 'text-danger' : 'text-danger')} style={isDarkMode ? { textShadow: '0 0 8px rgba(255, 255, 255, 0.3)' } : {}}>
              {trend.isPositive ? '+' : '-'}{trend.value}%
            </small>
          </div>
        )}
      </div>
    </div>
  );

  return link ? (
    <Link to={link} className="text-decoration-none text-inherit h-100 d-block">
      <CardContent />
    </Link>
  ) : (
    <CardContent />
  );
};

export default StatCard;
