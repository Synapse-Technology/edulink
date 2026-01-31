import React from 'react';

const EmployerDashboardSkeleton: React.FC = () => {
  return (
    <div className="container-fluid p-0">
      {/* Welcome Section Skeleton */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="skeleton skeleton-title mb-2" style={{ width: '200px' }}></div>
          <div className="skeleton skeleton-text" style={{ width: '300px' }}></div>
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="row mb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="col-md-6 col-lg-3 mb-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div className="flex-grow-1">
                    <div className="skeleton skeleton-text w-50 mb-2"></div>
                    <div className="skeleton skeleton-title mb-1" style={{ height: '32px' }}></div>
                    <div className="skeleton skeleton-text w-75"></div>
                  </div>
                  <div className="skeleton skeleton-icon rounded-circle"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="row">
        <div className="col-lg-8 mb-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-transparent border-bottom py-3 d-flex justify-content-between align-items-center">
              <div className="skeleton skeleton-text w-25"></div>
              <div className="skeleton skeleton-button" style={{ width: '80px', height: '30px' }}></div>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table mb-0">
                  <thead className="bg-light">
                    <tr>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <th key={i} className="border-0"><div className="skeleton skeleton-text"></div></th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3].map((i) => (
                      <tr key={i}>
                        <td className="ps-4">
                          <div className="d-flex align-items-center">
                            <div className="skeleton skeleton-avatar me-3"></div>
                            <div>
                              <div className="skeleton skeleton-text w-100 mb-1" style={{ width: '100px' }}></div>
                              <div className="skeleton skeleton-text w-75" style={{ width: '150px' }}></div>
                            </div>
                          </div>
                        </td>
                        {[1, 2, 3, 4].map((j) => (
                          <td key={j}><div className="skeleton skeleton-text"></div></td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-lg-4 mb-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-transparent border-bottom py-3">
              <div className="skeleton skeleton-text w-50"></div>
            </div>
            <div className="card-body">
              <div className="d-grid gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="d-flex align-items-center p-3 border rounded">
                    <div className="skeleton skeleton-avatar me-3" style={{ width: '40px', height: '40px', borderRadius: '4px' }}></div>
                    <div className="flex-grow-1">
                      <div className="skeleton skeleton-text w-50 mb-1"></div>
                      <div className="skeleton skeleton-text w-25"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
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

        .skeleton-button {
          height: 38px;
          width: 100px;
        }

        .skeleton-icon {
          height: 48px;
          width: 48px;
        }

        .skeleton-avatar {
          height: 40px;
          width: 40px;
          border-radius: 50%;
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

export default EmployerDashboardSkeleton;
