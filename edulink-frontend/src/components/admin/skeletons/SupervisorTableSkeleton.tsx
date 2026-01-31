import React from 'react';
import './skeleton.css';

interface SupervisorTableSkeletonProps {
  hasAction?: boolean;
}

const SupervisorTableSkeleton: React.FC<SupervisorTableSkeletonProps> = ({ hasAction = false }) => {
  return (
    <div className="container-fluid p-0">
      {/* Header Skeleton */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <div className="skeleton skeleton-title mb-2" style={{ width: '200px' }}></div>
          <div className="skeleton skeleton-text" style={{ width: '300px' }}></div>
        </div>
        {hasAction && (
          <div className="skeleton skeleton-button" style={{ width: '150px', height: '38px' }}></div>
        )}
      </div>

      {/* Table Card Skeleton */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table mb-0 align-middle">
              <thead className="bg-light">
                <tr>
                  <th className="ps-4 border-0"><div className="skeleton skeleton-text" style={{ width: '150px' }}></div></th>
                  <th className="border-0"><div className="skeleton skeleton-text" style={{ width: '100px' }}></div></th>
                  <th className="border-0"><div className="skeleton skeleton-text" style={{ width: '120px' }}></div></th>
                  <th className="border-0"><div className="skeleton skeleton-text" style={{ width: '100px' }}></div></th>
                  <th className="pe-4 border-0 text-end"><div className="skeleton skeleton-text ms-auto" style={{ width: '80px' }}></div></th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <tr key={i}>
                    <td className="ps-4">
                      <div className="d-flex align-items-center">
                        <div className="skeleton skeleton-icon rounded-circle me-2" style={{ width: '32px', height: '32px' }}></div>
                        <div>
                          <div className="skeleton skeleton-text mb-1" style={{ width: '120px' }}></div>
                          <div className="skeleton skeleton-text" style={{ width: '150px' }}></div>
                        </div>
                      </div>
                    </td>
                    <td><div className="skeleton skeleton-text w-75"></div></td>
                    <td><div className="skeleton skeleton-text w-50"></div></td>
                    <td><div className="skeleton skeleton-badge" style={{ width: '80px', height: '24px', borderRadius: '12px' }}></div></td>
                    <td className="pe-4 text-end">
                      <div className="d-flex justify-content-end gap-2">
                        <div className="skeleton skeleton-button-sm" style={{ width: '80px', height: '32px' }}></div>
                        <div className="skeleton skeleton-button-sm" style={{ width: '80px', height: '32px' }}></div>
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
        }

        .skeleton-text {
          height: 16px;
        }

        .skeleton-icon {
          background: #e0e0e0;
        }

        .skeleton-button {
          border-radius: 4px;
        }

        .skeleton-button-sm {
          border-radius: 4px;
        }
        
        .skeleton-badge {
           background: #e0e0e0;
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

export default SupervisorTableSkeleton;
