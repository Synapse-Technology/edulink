import React from 'react';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  hasHeader?: boolean;
  hasActions?: boolean;
}

const TableSkeleton: React.FC<TableSkeletonProps> = ({ 
  rows = 5, 
  columns = 4, 
  hasHeader = true,
  hasActions = true 
}) => {
  return (
    <div className="table-responsive">
      <table className="table table-hover">
        {hasHeader && (
          <thead>
            <tr>
              {Array.from({ length: columns }, (_, i) => (
                <th key={i}>
                  <div className="skeleton skeleton-text" style={{ width: `${Math.random() * 50 + 50}px` }}></div>
                </th>
              ))}
              {hasActions && (
                <th style={{ width: '120px' }}>
                  <div className="skeleton skeleton-text w-75"></div>
                </th>
              )}
            </tr>
          </thead>
        )}
        <tbody>
          {Array.from({ length: rows }, (_, i) => (
            <tr key={i}>
              {Array.from({ length: columns }, (_, j) => (
                <td key={j}>
                  <div 
                    className="skeleton skeleton-text" 
                    style={{ width: `${Math.random() * 60 + 40}px` }}
                  ></div>
                </td>
              ))}
              {hasActions && (
                <td>
                  <div className="d-flex gap-2">
                    <div className="skeleton skeleton-button-sm"></div>
                    <div className="skeleton skeleton-button-sm"></div>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <style>{`
        .skeleton {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
          border-radius: 4px;
        }

        .skeleton-text {
          height: 16px;
        }

        .skeleton-button-sm {
          height: 30px;
          width: 50px;
        }

        .w-75 {
          width: 75%;
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

export default TableSkeleton;