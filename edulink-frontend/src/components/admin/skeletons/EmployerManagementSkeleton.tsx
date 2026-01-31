import React from 'react';

const EmployerManagementSkeleton: React.FC = () => {
  return (
    <div className="container-fluid p-4">
      {/* Page Header Skeleton */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <div className="skeleton skeleton-title mb-2" style={{ width: '250px', height: '32px' }}></div>
          <div className="skeleton skeleton-text" style={{ width: '350px' }}></div>
        </div>
        <div className="skeleton skeleton-button" style={{ width: '120px', height: '38px' }}></div>
      </div>

      {/* Stats Cards Skeleton - Updated to show 4 cards */}
      <div className="row g-4 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="col-md-6 col-lg-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div className="flex-grow-1">
                    <div className="skeleton skeleton-text w-50 mb-2"></div>
                    <div className="skeleton skeleton-title mb-1" style={{ height: '28px', width: '60px' }}></div>
                    <div className="skeleton skeleton-text w-75"></div>
                  </div>
                  <div className="skeleton skeleton-icon" style={{ width: '48px', height: '48px', borderRadius: '12px' }}></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="card border-0 shadow-sm">
        {/* Card Header with Tabs and Search */}
        <div className="card-header bg-transparent border-bottom-0 pt-4 px-4 pb-0">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
            {/* Tabs Skeleton */}
            <div className="d-flex gap-4">
              <div className="skeleton skeleton-text" style={{ width: '140px', height: '24px' }}></div>
              <div className="skeleton skeleton-text" style={{ width: '140px', height: '24px' }}></div>
            </div>
            
            {/* Search and Filter Skeleton */}
            <div className="d-flex gap-2">
              <div className="skeleton skeleton-input" style={{ width: '250px', height: '38px' }}></div>
              <div className="skeleton skeleton-input" style={{ width: '120px', height: '38px' }}></div>
            </div>
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="ps-4"><div className="skeleton skeleton-text" style={{ width: '120px' }}></div></th>
                  <th><div className="skeleton skeleton-text" style={{ width: '100px' }}></div></th>
                  <th><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></th>
                  <th><div className="skeleton skeleton-text" style={{ width: '100px' }}></div></th>
                  <th><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></th>
                  <th className="text-end pe-4"><div className="skeleton skeleton-text ms-auto" style={{ width: '60px' }}></div></th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td className="ps-4">
                      <div className="py-1">
                        <div className="skeleton skeleton-text mb-1" style={{ width: '140px' }}></div>
                        <div className="skeleton skeleton-text" style={{ width: '100px', height: '12px' }}></div>
                      </div>
                    </td>
                    <td>
                      <div className="py-1">
                        <div className="skeleton skeleton-text mb-1" style={{ width: '120px' }}></div>
                        <div className="skeleton skeleton-text" style={{ width: '80px', height: '12px' }}></div>
                      </div>
                    </td>
                    <td><div className="skeleton skeleton-badge" style={{ width: '80px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '60px' }}></div></td>
                    <td><div className="skeleton skeleton-badge" style={{ width: '70px' }}></div></td>
                    <td className="text-end pe-4">
                      <div className="d-flex justify-content-end gap-2">
                        <div className="skeleton skeleton-button" style={{ width: '32px', height: '32px' }}></div>
                        <div className="skeleton skeleton-button" style={{ width: '32px', height: '32px' }}></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

        .skeleton-input {
          height: 38px;
          width: 100%;
        }

        .skeleton-icon {
          height: 48px;
          width: 48px;
          border-radius: 8px;
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

export default EmployerManagementSkeleton;
