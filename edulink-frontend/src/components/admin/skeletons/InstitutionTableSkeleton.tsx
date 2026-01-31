import React from 'react';
import './skeleton.css';

interface InstitutionTableSkeletonProps {
  hasSummaryCards?: boolean;
  summaryCardsCount?: number;
  hasSeparateFilterCard?: boolean;
  hasInternalTableFilter?: boolean;
  tableColumns?: number;
}

const InstitutionTableSkeleton: React.FC<InstitutionTableSkeletonProps> = ({
  hasSummaryCards = false,
  summaryCardsCount = 3,
  hasSeparateFilterCard = false,
  hasInternalTableFilter = false,
  tableColumns = 5
}) => {
  return (
    <div className="container-fluid p-0">
      {/* Header Skeleton */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <div className="skeleton skeleton-title mb-2" style={{ width: '250px' }}></div>
          <div className="skeleton skeleton-text" style={{ width: '350px' }}></div>
        </div>
        <div className="skeleton skeleton-button" style={{ width: '180px', height: '38px' }}></div>
      </div>

      {/* Summary Cards Skeleton */}
      {hasSummaryCards && (
        <div className="row g-4 mb-4">
          {Array.from({ length: summaryCardsCount }).map((_, i) => (
            <div key={i} className="col-md-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <div className="skeleton skeleton-text mb-2" style={{ width: '100px' }}></div>
                      <div className="skeleton skeleton-title" style={{ width: '60px', height: '32px' }}></div>
                    </div>
                    <div className="skeleton skeleton-icon rounded" style={{ width: '24px', height: '24px' }}></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Separate Filter Card Skeleton */}
      {hasSeparateFilterCard && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-4">
                <div className="skeleton skeleton-input" style={{ height: '38px' }}></div>
              </div>
              <div className="col-md-3">
                <div className="skeleton skeleton-input" style={{ height: '38px' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table Card Skeleton */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {hasInternalTableFilter && (
            <div className="p-3 border-bottom">
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="skeleton skeleton-input" style={{ height: '38px' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div className="table-responsive">
            <table className="table mb-0 align-middle">
              <thead className="bg-light">
                <tr>
                  {Array.from({ length: tableColumns }).map((_, i) => (
                    <th key={i} className={`border-0 py-3 ${i === 0 ? 'ps-4' : ''} ${i === tableColumns - 1 ? 'pe-4 text-end' : ''}`}>
                      <div className={`skeleton skeleton-text ${i === tableColumns - 1 ? 'ms-auto' : ''}`} style={{ width: '80px' }}></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    {Array.from({ length: tableColumns }).map((_, j) => (
                      <td key={j} className={`${j === 0 ? 'ps-4' : ''} ${j === tableColumns - 1 ? 'pe-4 text-end' : ''}`}>
                        {j === 0 ? (
                          <div className="d-flex align-items-center">
                            <div className="skeleton skeleton-icon rounded-circle me-3" style={{ width: '40px', height: '40px' }}></div>
                            <div>
                              <div className="skeleton skeleton-text mb-1" style={{ width: '120px' }}></div>
                              <div className="skeleton skeleton-text" style={{ width: '150px' }}></div>
                            </div>
                          </div>
                        ) : j === tableColumns - 1 ? (
                          <div className="d-flex justify-content-end gap-2">
                             <div className="skeleton skeleton-button-sm" style={{ width: '32px', height: '32px' }}></div>
                          </div>
                        ) : (
                          <div className="skeleton skeleton-text" style={{ width: '80%' }}></div>
                        )}
                      </td>
                    ))}
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
        
        .skeleton-input {
          background: #e0e0e0;
          border-radius: 6px;
        }

        .skeleton-button {
          border-radius: 6px;
        }

        .skeleton-button-sm {
          border-radius: 4px;
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

export default InstitutionTableSkeleton;
