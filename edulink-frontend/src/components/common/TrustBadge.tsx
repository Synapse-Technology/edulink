import React from 'react';
import { Shield, ShieldCheck, Award, Star } from 'lucide-react';

export type TrustLevel = 0 | 1 | 2 | 3 | 4;
export type EntityType = 'student' | 'employer' | 'institution';

interface TrustBadgeProps {
  level: TrustLevel;
  entityType: EntityType;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const TrustBadge: React.FC<TrustBadgeProps> = ({ 
  level, 
  entityType, 
  showLabel = true, 
  size = 'md',
  className = ''
}) => {
  
  const getBadgeConfig = () => {
    // Shared colors based on level
    const colors = {
      0: 'bg-secondary text-white',
      1: 'bg-info text-white',
      2: 'bg-primary text-white',
      3: 'bg-success text-white',
      4: 'bg-warning text-dark', // Gold/Platinum for highest tier
    };

    const sizeClasses = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-3 py-1 text-sm',
      lg: 'px-4 py-2 text-base',
    };

    const iconSizes = {
      sm: 12,
      md: 16,
      lg: 20,
    };

    // Specific labels per entity
    const labels = {
      student: {
        0: 'Unverified',
        1: 'Document Verified',
        2: 'Institution Verified',
        3: 'Internship Completed',
        4: 'Certified',
      },
      employer: {
        0: 'Unverified',
        1: 'Verified Entity',
        2: 'Active Host',
        3: 'Trusted Partner',
        4: 'Strategic Partner',
      },
      institution: {
        0: 'Registered',
        1: 'Active',
        2: 'High Trust',
        3: 'Strategic Partner',
        4: 'Strategic Partner',
      }
    };

    const icons = {
      0: Shield,
      1: ShieldCheck,
      2: ShieldCheck,
      3: Award,
      4: Star,
    };

    const Icon = icons[level] || Shield;

    return {
      label: labels[entityType][level] || 'Unknown',
      colorClass: colors[level] || 'bg-secondary',
      sizeClass: sizeClasses[size],
      iconSize: iconSizes[size],
      Icon,
    };
  };

  const config = getBadgeConfig();
  const Icon = config.Icon;

  return (
    <div className={`d-inline-flex align-items-center rounded-pill fw-medium ${config.colorClass} ${config.sizeClass} ${className}`} title={`Trust Level ${level}: ${config.label}`}>
      <Icon size={config.iconSize} className={showLabel ? "me-1" : ""} />
      {showLabel && <span>{config.label}</span>}
    </div>
  );
};

export default TrustBadge;
