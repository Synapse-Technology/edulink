import React from 'react';

const StudentPageSkeleton: React.FC = () => {
  return (
    <div className="container-fluid px-4 px-lg-5 pt-4">
      {/* Header Skeleton */}
      <div className="mb-4">
         <div className="skeleton skeleton-title mb-2" style={{ width: '250px', height: '32px' }}></div>
         <div className="skeleton skeleton-text" style={{ width: '350px' }}></div>
      </div>

      {/* Main Content Skeleton */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-5 text-center">
           <div className="skeleton skeleton-circle mx-auto mb-4" style={{ width: '80px', height: '80px', borderRadius: '50%' }}></div>
           <div className="skeleton skeleton-title mx-auto mb-3" style={{ width: '300px' }}></div>
           <div className="skeleton skeleton-text rounded-pill mx-auto mb-4" style={{ width: '100px', height: '24px' }}></div>
           
           <div className="skeleton skeleton-text mx-auto mb-2" style={{ width: '60%' }}></div>
           <div className="skeleton skeleton-text mx-auto" style={{ width: '40%' }}></div>
        </div>
      </div>

      <style>{`
        .skeleton {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
          border-radius: 4px;
        }

        .skeleton-title {
          height: 24px;
          width: 120px;
        }

        .skeleton-text {
          height: 14px;
        }

        .skeleton-circle {
           background-color: #e0e0e0;
        }

        @keyframes loading {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
};

export default StudentPageSkeleton;
