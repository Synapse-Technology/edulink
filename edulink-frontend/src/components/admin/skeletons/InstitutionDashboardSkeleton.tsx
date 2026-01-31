import React from 'react';
import './skeleton.css';

const InstitutionDashboardSkeleton: React.FC = () => {
  return (
    <div className="container-fluid p-0">
      {/* Stats Cards Skeleton */}
      <div className="row g-4 mb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="col-md-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="skeleton skeleton-text w-50 mb-2"></div>
                <div className="skeleton skeleton-title mb-0" style={{ height: '32px', width: '60px' }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section Skeleton */}
      <div className="row g-4 mb-4">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-transparent border-bottom">
              <div className="skeleton skeleton-text w-25"></div>
            </div>
            <div className="card-body">
              <div className="skeleton" style={{ height: '300px', width: '100%' }}></div>
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-transparent border-bottom">
              <div className="skeleton skeleton-text w-50"></div>
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-center align-items-center h-100">
                <div className="skeleton rounded-circle" style={{ height: '200px', width: '200px' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Placement Monitoring Widget Skeleton */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-transparent border-bottom">
          <div className="skeleton skeleton-text w-25"></div>
        </div>
        <div className="card-body">
          <div className="skeleton skeleton-text w-100 mb-3"></div>
          <div className="skeleton skeleton-text w-100 mb-3"></div>
          <div className="skeleton skeleton-text w-100"></div>
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
          height: 16px;
        }

        .skeleton-icon {
          height: 48px;
          width: 48px;
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

export default InstitutionDashboardSkeleton;
