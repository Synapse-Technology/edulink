import React from 'react';

export const AcademicStructureSkeleton: React.FC = () => {
  return (
    <div className="academic-structure">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <div className="skeleton skeleton-title mb-2"></div>
          <div className="skeleton skeleton-text w-75"></div>
        </div>
        <div className="skeleton skeleton-button"></div>
      </div>

      {/* Accordion List Skeleton */}
      <div className="d-flex flex-column gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="border rounded p-3 shadow-sm bg-white">
            <div className="d-flex align-items-center gap-3">
              <div className="skeleton skeleton-icon rounded-circle" style={{ width: '20px', height: '20px' }}></div>
              <div className="flex-grow-1">
                <div className="skeleton skeleton-text w-25 mb-1"></div>
                <div className="skeleton skeleton-text w-15"></div>
              </div>
              <div className="d-flex gap-2">
                 <div className="skeleton skeleton-icon" style={{ width: '16px', height: '16px' }}></div>
                 <div className="skeleton skeleton-icon" style={{ width: '16px', height: '16px' }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .skeleton {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
          border-radius: 4px;
        }
        .skeleton-title { height: 28px; width: 200px; }
        .skeleton-text { height: 16px; }
        .skeleton-button { height: 38px; width: 150px; }
        .skeleton-icon { background-color: #e0e0e0; border-radius: 4px; }
        
        @keyframes loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

export const CohortTableSkeleton: React.FC = () => {
  return (
    <div className="w-100">
      <div className="table-responsive">
        <table className="table mb-0 bg-white rounded shadow-sm">
          <thead className="table-light">
            <tr>
              {[1, 2, 3, 4].map((i) => (
                <th key={i}><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map((i) => (
              <tr key={i}>
                {[1, 2, 3, 4].map((j) => (
                  <td key={j}><div className="skeleton skeleton-text w-75"></div></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style>{`
        .skeleton {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
          border-radius: 4px;
        }
        .skeleton-text { height: 16px; }
        @keyframes loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

export default AcademicStructureSkeleton;
