import React from 'react';

interface AdminLayoutSkeletonProps {
  hasSidebar?: boolean;
  hasHeader?: boolean;
  contentType?: 'dashboard' | 'table' | 'form' | 'stats';
}

const AdminLayoutSkeleton: React.FC<AdminLayoutSkeletonProps> = ({ 
  hasSidebar = true, 
  hasHeader = true, 
  contentType = 'dashboard' 
}) => {
  return (
    <div className="d-flex min-vh-100">
      {/* Sidebar Skeleton */}
      {hasSidebar && (
        <div className="skeleton-sidebar d-flex flex-column p-3" style={{ width: '250px' }}>
          <div className="skeleton skeleton-logo mb-4"></div>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="d-flex align-items-center mb-3">
              <div className="skeleton skeleton-icon-sm me-3"></div>
              <div className="skeleton skeleton-text w-75"></div>
            </div>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-grow-1 d-flex flex-column">
        {/* Header Skeleton */}
        {hasHeader && (
          <div className="skeleton-header d-flex justify-content-between align-items-center p-3 border-bottom">
            <div className="skeleton skeleton-text w-25"></div>
            <div className="d-flex align-items-center">
              <div className="skeleton skeleton-avatar me-3"></div>
              <div className="skeleton skeleton-text w-100 me-3"></div>
              <div className="skeleton skeleton-icon-sm"></div>
            </div>
          </div>
        )}

        {/* Content Skeleton */}
        <div className="flex-grow-1 p-4">
          {contentType === 'dashboard' && (
            <>
              {/* Stats Cards */}
              <div className="row mb-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="col-md-6 col-lg-3 mb-3">
                    <div className="card border-0 shadow-sm h-100">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <div className="skeleton skeleton-text w-50 mb-2"></div>
                            <div className="skeleton skeleton-title mb-1"></div>
                            <div className="skeleton skeleton-text w-75"></div>
                          </div>
                          <div className="skeleton skeleton-icon"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Charts/Tables */}
              <div className="row">
                <div className="col-lg-8 mb-4">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-header bg-transparent border-bottom">
                      <div className="skeleton skeleton-text w-25"></div>
                    </div>
                    <div className="card-body">
                      <div className="skeleton skeleton-chart-lg"></div>
                    </div>
                  </div>
                </div>
                <div className="col-lg-4 mb-4">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-header bg-transparent border-bottom">
                      <div className="skeleton skeleton-text w-50"></div>
                    </div>
                    <div className="card-body">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="d-flex align-items-center mb-3">
                          <div className="skeleton skeleton-avatar me-3"></div>
                          <div className="flex-grow-1">
                            <div className="skeleton skeleton-text w-75 mb-1"></div>
                            <div className="skeleton skeleton-text w-50"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {contentType === 'table' && (
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-transparent border-bottom">
                <div className="skeleton skeleton-text w-25"></div>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <th key={i}><div className="skeleton skeleton-text"></div></th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <tr key={i}>
                          {[1, 2, 3, 4, 5].map((j) => (
                            <td key={j}><div className="skeleton skeleton-text"></div></td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .skeleton-sidebar {
          background: #f8f9fa;
          border-right: 1px solid #dee2e6;
        }

        .skeleton-header {
          background: white;
          border-bottom: 1px solid #dee2e6;
        }

        .skeleton {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
          border-radius: 4px;
        }

        .skeleton-logo {
          height: 40px;
          width: 150px;
        }

        .skeleton-text {
          height: 16px;
        }

        .skeleton-title {
          height: 24px;
          width: 80px;
        }

        .skeleton-button {
          height: 38px;
          width: 100px;
        }

        .skeleton-icon {
          height: 48px;
          width: 48px;
          border-radius: 8px;
        }

        .skeleton-icon-sm {
          height: 24px;
          width: 24px;
          border-radius: 4px;
        }

        .skeleton-avatar {
          height: 40px;
          width: 40px;
          border-radius: 50%;
        }

        .skeleton-chart-lg {
          height: 300px;
          width: 100%;
          border-radius: 8px;
        }

        .w-25 {
          width: 25%;
        }

        .w-50 {
          width: 50%;
        }

        .w-75 {
          width: 75%;
        }

        .w-100 {
          width: 100px;
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

export default AdminLayoutSkeleton;