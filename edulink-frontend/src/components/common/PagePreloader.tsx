import React, { useEffect, useState } from 'react';

const PagePreloader: React.FC = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 700);

    return () => clearTimeout(timeout);
  }, []);

  if (!loading) return null;

  return (
    <>
      <div className="page-preloader">
        <div className="preloader-spinner" />
      </div>

      <style>{`
        .page-preloader {
          position: fixed;
          inset: 0;
          background: rgba(255,255,255,.96);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          backdrop-filter: blur(3px);
        }

        .preloader-spinner {
          width: 42px;
          height: 42px;
          border-radius: 999px;
          border: 4px solid #e5e7eb;
          border-top-color: #069b8e;
          animation: spin .7s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
};

export default PagePreloader;