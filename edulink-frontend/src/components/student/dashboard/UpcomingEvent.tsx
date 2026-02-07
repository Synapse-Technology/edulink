import React from 'react';
import { Calendar, Clock, Users, ChevronRight } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';

interface UpcomingEventProps {
  title: string;
  date: string;
  time: string;
  type: 'interview' | 'deadline' | 'meeting';
}

const UpcomingEvent: React.FC<UpcomingEventProps> = ({ title, date, time, type }) => {
  const { isDarkMode } = useTheme();

  const getTypeIcon = () => {
    switch (type) {
      case 'interview':
        return <Users className={isDarkMode ? 'text-info' : 'text-info'} size={16} />;
      case 'deadline':
        return <Clock className={isDarkMode ? 'text-warning' : 'text-warning'} size={16} />;
      default:
        return <Calendar className={isDarkMode ? 'text-info' : 'text-primary'} size={16} />;
    }
  };

  return (
    <div className="d-flex align-items-center gap-3 p-3 border-bottom border-light">
      <div className={`rounded-circle p-2 ${isDarkMode ? 'bg-secondary' : 'bg-light'}`}>
        {getTypeIcon()}
      </div>
      <div className="flex-grow-1">
        <h6 className={`fw-semibold mb-1 ${isDarkMode ? 'text-info' : ''}`} style={isDarkMode ? { textShadow: '0 0 6px rgba(32, 201, 151, 0.3)' } : {}}>{title}</h6>
        <p className={`small mb-0 ${isDarkMode ? 'text-light opacity-75' : 'text-muted'}`}>{date} at {time}</p>
      </div>
      <ChevronRight size={16} className={isDarkMode ? 'text-light opacity-75' : 'text-muted'} />
    </div>
  );
};

export default UpcomingEvent;
