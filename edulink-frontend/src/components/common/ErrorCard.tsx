import React from 'react';
import { Link } from 'react-router-dom';

interface ErrorCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  link: string;
  linkText: string;
  delay?: number;
}

const ErrorCard: React.FC<ErrorCardProps> = ({ 
  icon, 
  title, 
  description, 
  link, 
  linkText, 
  delay = 0 
}) => {
  return (
    <div 
      className="error-card h-100" 
      data-aos="fade-up" 
      data-aos-delay={delay}
      style={{
        background: 'var(--surface-color)',
        border: '1px solid color-mix(in srgb, var(--default-color), transparent 90%)',
        borderRadius: '16px',
        padding: '2rem',
        textAlign: 'center',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      <div>
        <div 
          className="error-card-icon mb-4" 
          style={{
            width: '70px',
            height: '70px',
            margin: '0 auto 1.5rem',
            background: 'color-mix(in srgb, var(--accent-color), transparent 90%)',
            border: '2px solid color-mix(in srgb, var(--accent-color), transparent 70%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-color)',
            fontSize: '1.75rem',
            transition: 'all 0.3s ease'
          }}
        >
          {icon}
        </div>
        
        <h4 
          className="error-card-title mb-3" 
          style={{
            color: 'var(--heading-color)',
            fontWeight: '600',
            marginBottom: '1rem',
            fontFamily: 'var(--heading-font)',
            fontSize: '1.25rem'
          }}
        >
          {title}
        </h4>
        
        <p 
          className="error-card-description mb-4" 
          style={{
            color: 'color-mix(in srgb, var(--default-color), transparent 30%)',
            fontSize: '0.95rem',
            marginBottom: '1.5rem',
            lineHeight: '1.6'
          }}
        >
          {description}
        </p>
      </div>
      
      <Link 
        to={link} 
        className="btn btn-sm btn-primary"
        style={{
          background: 'var(--accent-color)',
          border: 'none',
          color: 'white',
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
          borderRadius: '8px',
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          transition: 'all 0.3s ease',
          fontFamily: 'var(--nav-font)',
          fontWeight: '500'
        }}
      >
        {linkText}
        <i className="bi bi-arrow-right"></i>
      </Link>
    </div>
  );
};

export default ErrorCard;