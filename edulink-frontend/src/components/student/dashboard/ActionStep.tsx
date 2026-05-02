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
    <div className="student-action-row">
      <div className={`student-action-number ${status === 'completed' ? 'complete' : ''}`}>
        {status === 'completed' ? <CheckCircle size={18} /> : number}
      </div>
      <div>
        <h6 className={`fw-semibold mb-1 ${isDarkMode ? 'text-info' : styles.text}`}>{title}</h6>
        <p className={`small mb-0 ${isDarkMode ? 'text-light opacity-75' : 'student-muted'}`}>{description}</p>
      </div>
      {actionText && actionLink && status === 'current' && (
        <Link to={actionLink} className="btn btn-primary btn-sm">
          {actionText}
        </Link>
      )}
    </div>
  );
};

export default ActionStep;
