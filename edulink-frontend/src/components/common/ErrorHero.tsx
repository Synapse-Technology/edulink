import React from 'react';

interface ErrorHeroProps {
  errorCode: string;
  title: string;
  description: string;
}

const ErrorHero: React.FC<ErrorHeroProps> = ({ 
  errorCode, 
  title, 
  description
}) => {
  return (
    <section 
      className="error-hero page-title" 
      style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        backgroundColor: 'var(--accent-color)',
        position: 'relative',
        overflow: 'hidden',
        color: 'var(--contrast-color)'
      }}
    >
      {/* Animated background elements */}
      <div 
        className="error-hero-bg" 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.05,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          animation: 'float 20s ease-in-out infinite'
        }}
      />
      
      <div className="container text-center" data-aos="fade-up">
        <div 
          className="error-content" 
          style={{
            maxWidth: '800px',
            margin: '0 auto',
            position: 'relative',
            zIndex: 2
          }}
        >
          {/* Error badge */}
          <div 
            className="error-badge mb-4" 
            data-aos="fade-up" 
            data-aos-delay="100"
            style={{
              display: 'inline-block',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '25px',
              padding: '12px 24px',
              marginBottom: '2rem'
            }}
          >
            <span 
              style={{
                color: '#ffffff',
                fontWeight: '600',
                fontSize: '0.9rem',
                letterSpacing: '2px',
                textTransform: 'uppercase'
              }}
            >
              {errorCode} Error
            </span>
          </div>

          {/* Error code - Plain white text */}
          <h1 
            className="error-code mb-4" 
            data-aos="fade-up" 
            data-aos-delay="200"
            style={{
              fontSize: 'clamp(6rem, 15vw, 12rem)',
              fontWeight: '800',
              color: '#ffffff',
              marginBottom: '1rem',
              lineHeight: '1',
              fontFamily: 'var(--heading-font)',
              letterSpacing: '-0.05em'
            }}
          >
            {errorCode}
          </h1>

          {/* Error title */}
          <h2 
            className="error-title mb-4" 
            data-aos="fade-up" 
            data-aos-delay="300"
            style={{
              fontSize: 'clamp(1.8rem, 5vw, 3rem)',
              fontWeight: '700',
              color: 'var(--contrast-color)',
              marginBottom: '1.5rem',
              fontFamily: 'var(--heading-font)',
              letterSpacing: '-0.02em'
            }}
          >
            {title}
          </h2>

          {/* Error description */}
          <p 
            className="error-description" 
            data-aos="fade-up" 
            data-aos-delay="400"
            style={{
              fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
              color: 'rgba(255, 255, 255, 0.9)',
              maxWidth: '600px',
              marginLeft: 'auto',
              marginRight: 'auto',
              lineHeight: '1.7',
              fontWeight: '400'
            }}
          >
            {description}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        .error-hero {
          position: relative;
        }
      `}</style>
    </section>
  );
};

export default ErrorHero;