import React from 'react';

interface StudentApplicationsSkeletonProps {
  isDarkMode?: boolean;
}

const StudentApplicationsSkeleton: React.FC<StudentApplicationsSkeletonProps> = ({ isDarkMode }) => {
  const skeletonBaseColor = isDarkMode ? '#1e293b' : '#f0f0f0';
  const skeletonHighlightColor = isDarkMode ? '#334155' : '#e0e0e0';

  return (
    <div className="flex-grow-1 px-4 px-lg-5 pb-4">
      <style>{`
        .skeleton {
          background: linear-gradient(90deg, ${skeletonBaseColor} 25%, ${skeletonHighlightColor} 50%, ${skeletonBaseColor} 75%);
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

        @keyframes loading {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
      {/* Header Skeleton */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <div className="skeleton rounded" style={{ width: '32px', height: '32px' }}></div>
        <div className="skeleton skeleton-title mb-0" style={{ width: '200px', height: '32px' }}></div>
      </div>

      {/* Applications Grid Skeleton */}
      <div className="row g-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="col-12">
            <div className={`card border-0 shadow-sm ${isDarkMode ? '' : 'bg-white'}`} style={{ borderRadius: '12px', backgroundColor: isDarkMode ? '#1e293b' : undefined }}>
              <div className="card-body p-4">
                <div className="row align-items-center">
                  <div className="col-md-8">
                    <div className="d-flex align-items-start justify-content-between mb-2">
                      <div className="skeleton skeleton-title mb-1" style={{ width: '250px', height: '24px' }}></div>
                    </div>
                    
                    <div className="skeleton skeleton-text mb-2" style={{ width: '150px' }}></div>
                    
                    <div className="d-flex flex-wrap gap-3 mt-3">
                      <div className="d-flex align-items-center gap-1">
                        <div className="skeleton rounded-circle" style={{ width: '14px', height: '14px' }}></div>
                        <div className="skeleton skeleton-text mb-0" style={{ width: '100px' }}></div>
                      </div>
                      <div className="d-flex align-items-center gap-1">
                        <div className="skeleton rounded-circle" style={{ width: '14px', height: '14px' }}></div>
                        <div className="skeleton skeleton-text mb-0" style={{ width: '120px' }}></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-md-4 text-md-end mt-3 mt-md-0 d-flex flex-column align-items-md-end justify-content-center gap-3">
                    <div className="d-none d-md-block">
                      <div className="skeleton rounded-pill" style={{ width: '100px', height: '24px' }}></div>
                    </div>
                    
                    <div className="skeleton rounded" style={{ width: '120px', height: '32px' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentApplicationsSkeleton;
