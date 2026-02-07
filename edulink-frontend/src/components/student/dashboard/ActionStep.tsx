import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';

interface ActionStepProps {
  number: number;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'pending';
  actionText?: string;
  actionLink?: string;
}

const ActionStep: React.FC<ActionStepProps> = ({ number, title, description, status, actionText, actionLink }) => {
  const { isDarkMode } = useTheme();

  const getStatusStyles = () => {
    switch (status) {
      case 'completed':
        return {
          bg: 'bg-success bg-opacity-10 border-success',
          numberBg: 'bg-success text-white',
          text: 'text-success'
        };
      case 'current':
        return {
          bg: 'bg-primary bg-opacity-10 border-primary',
          numberBg: 'bg-primary text-white',
          text: 'text-primary'
        };
      default:
        return {
          bg: 'bg-light border-light',
          numberBg: 'bg-secondary text-white',
          text: 'text-muted'
        };
    }
  };

  const styles = getStatusStyles();

  return (
    <div className={`card mb-3 ${isDarkMode ? 'bg-dark border-secondary' : 'bg-white'}`} style={{ borderRadius: '16px', border: isDarkMode ? '1px solid #374151' : '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
      <div className="card-body">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <div className={`rounded-circle d-flex align-items-center justify-content-center fw-bold ${styles.numberBg}`} 
                 style={{ width: '40px', height: '40px' }}>
              {status === 'completed' ? <CheckCircle size={20} /> : number}
            </div>
            <div>
              <h6 className={`fw-semibold mb-1 ${isDarkMode ? 'text-info' : styles.text}`} style={isDarkMode ? { textShadow: '0 0 8px rgba(32, 201, 151, 0.3)' } : {}}>{title}</h6>
              <p className={`small mb-0 ${isDarkMode ? 'text-light opacity-75' : 'text-muted'}`}>{description}</p>
            </div>
          </div>
          {actionText && actionLink && status === 'current' && (
            <Link to={actionLink} className="btn btn-primary btn-sm">
              {actionText}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActionStep;
