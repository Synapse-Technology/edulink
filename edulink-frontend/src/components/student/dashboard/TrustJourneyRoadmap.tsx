import React from 'react';
import { Shield, ShieldCheck, Award, Star, CheckCircle, Circle } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { getTrustLabel } from '../../../services/trust/trustService';

interface TrustStep {
  level: number;
  label: string;
  description: string;
  icon: React.ElementType;
}

const STEPS: TrustStep[] = [
  { 
    level: 1, 
    label: getTrustLabel('student', 1), 
    description: 'Upload your CV, admission letter, and school ID.',
    icon: Shield
  },
  { 
    level: 2, 
    label: getTrustLabel('student', 2), 
    description: 'Claim your institution and get verified by your campus admin.',
    icon: ShieldCheck
  },
  { 
    level: 3, 
    label: getTrustLabel('student', 3), 
    description: 'Successfully complete your first verified internship.',
    icon: Award
  },
  { 
    level: 4, 
    label: getTrustLabel('student', 4), 
    description: 'Earn your official completion certificate and top-tier status.',
    icon: Star
  }
];

interface TrustJourneyRoadmapProps {
  currentLevel: number;
}

const TrustJourneyRoadmap: React.FC<TrustJourneyRoadmapProps> = ({ currentLevel }) => {
  const { isDarkMode } = useTheme();

  return (
    <section className={isDarkMode ? 'text-white' : 'text-dark'}>
      <div className="student-section-header">
        <h5 className="student-section-title d-flex align-items-center gap-2">
          <ShieldCheck className="text-primary" size={20} />
          Trust journey
        </h5>
      </div>
        
        <div className="position-relative">
          <div className="student-trust-list">
            {STEPS.map((step, index) => {
              const isCompleted = currentLevel >= step.level;
              const isCurrent = currentLevel === step.level - 1;
              const isLast = index === STEPS.length - 1;
              
              return (
                <div key={step.level} className="d-flex align-items-start position-relative">
                  {/* Vertical Line Segment (between icons) */}
                  {!isLast && (
                    <div 
                      className="position-absolute border-start border-2 opacity-25" 
                      style={{ 
                        borderColor: isDarkMode ? '#334155' : '#e2e8f0', 
                        left: '1rem', 
                        top: '2rem', 
                        bottom: '-1.5rem', // Connects through the gap-4
                        zIndex: 0
                      }}
                    ></div>
                  )}

                  {/* Step Dot */}
                  <div 
                    className={`rounded-circle d-flex align-items-center justify-content-center z-1 shadow-sm transition-all flex-shrink-0`}
                    style={{ 
                      width: '2rem', 
                      height: '2rem',
                      backgroundColor: isCompleted ? '#10b981' : (isCurrent ? '#0d6efd' : (isDarkMode ? '#1e293b' : '#f8fafc')),
                      border: `2px solid ${isCompleted ? '#10b981' : (isCurrent ? '#0d6efd' : (isDarkMode ? '#334155' : '#e2e8f0'))}`,
                      color: isCompleted || isCurrent ? 'white' : (isDarkMode ? '#64748b' : '#94a3b8')
                    }}
                  >
                    {isCompleted ? <CheckCircle size={14} /> : (isCurrent ? <step.icon size={14} /> : <Circle size={8} />)}
                  </div>

                  <div className={`ms-3 transition-all ${!isCompleted && !isCurrent ? 'opacity-50' : ''}`}>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <h6 className={`mb-0 fw-bold ${isCurrent ? 'text-primary' : (isCompleted ? 'text-success' : '')}`}>
                        {step.label}
                      </h6>
                      {isCompleted && (
                        <span className="badge bg-success bg-opacity-10 text-success rounded-pill extra-small px-2">
                          Verified
                        </span>
                      )}
                    </div>
                    <p className={`small mb-0 ${isDarkMode ? 'text-light opacity-75' : 'text-muted'}`}>
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
    </section>
  );
};

export default TrustJourneyRoadmap;
