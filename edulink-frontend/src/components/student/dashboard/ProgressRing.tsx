import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';

interface ProgressRingProps {
  progress: number;
  size: number;
  strokeWidth: number;
}

const ProgressRing: React.FC<ProgressRingProps> = ({ 
  progress, 
  size, 
  strokeWidth 
}) => {
  const { isDarkMode } = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="position-relative d-inline-block">
      <svg 
        width={size} 
        height={size} 
        viewBox={`0 0 ${size} ${size}`}
        className="transform-90"
        style={{ maxWidth: '100%', height: 'auto' }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isDarkMode ? "#374151" : "#e9ecef"}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isDarkMode ? "#20c997" : "#0d6efd"}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="position-absolute top-50 start-50 translate-middle text-center">
        <span className={`h6 fw-bold ${isDarkMode ? 'text-info' : 'text-primary'}`} style={isDarkMode ? { textShadow: '0 0 6px rgba(32, 201, 151, 0.3)' } : {}}>{Math.round(progress)}%</span>
      </div>
    </div>
  );
};

export default ProgressRing;
