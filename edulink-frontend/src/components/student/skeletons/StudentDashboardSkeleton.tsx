import React from 'react';

interface StudentDashboardSkeletonProps {
  isDarkMode?: boolean;
}

const StudentDashboardSkeleton: React.FC<StudentDashboardSkeletonProps> = ({ isDarkMode }) => {
  const skeletonBaseColor = isDarkMode ? '#1e293b' : '#f0f0f0';
  const skeletonHighlightColor = isDarkMode ? '#334155' : '#e0e0e0';

  return (
    <div className="container-fluid px-4 px-lg-5 pt-4">
      {/* Welcome Section Skeleton */}
      <div className="row align-items-center mb-4">
        <div className="col-lg-8">
          <div className="skeleton skeleton-title mb-2" style={{ width: '300px', height: '40px' }}></div>
          <div className="skeleton skeleton-text" style={{ width: '400px' }}></div>
        </div>
        <div className="col-lg-4 text-lg-end mt-3 mt-lg-0">
          <div className="d-inline-block text-center">
            <div className="skeleton skeleton-text mb-2 mx-auto" style={{ width: '100px' }}></div>
            <div className="skeleton skeleton-circle mx-auto" style={{ width: '80px', height: '80px', borderRadius: '50%' }}></div>
          </div>
        </div>
      </div>

      {/* Quick Stats Skeleton */}
      <div className="row g-4 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="col-md-6 col-lg-3">
            <div className={`card border-0 shadow-sm h-100 ${isDarkMode ? 'bg-slate-800' : ''}`}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div className="skeleton skeleton-icon rounded p-2" style={{ width: '40px', height: '40px' }}></div>
                  <div className="skeleton skeleton-text rounded-pill" style={{ width: '60px', height: '20px' }}></div>
                </div>
                <div className="skeleton skeleton-title mb-1" style={{ width: '100px', height: '32px' }}></div>
                <div className="skeleton skeleton-text w-75"></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        {/* Action Steps Skeleton */}
        <div className="col-lg-8">
          <div className={`card border-0 shadow-sm h-100 ${isDarkMode ? 'bg-slate-800' : ''}`}>
            <div className="card-header bg-transparent border-0 pt-4 px-4">
              <div className="skeleton skeleton-title mb-0" style={{ width: '150px' }}></div>
            </div>
            <div className="card-body p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="d-flex align-items-center mb-4 last:mb-0">
                  <div className="skeleton skeleton-circle me-3" style={{ width: '32px', height: '32px', borderRadius: '50%' }}></div>
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <div className="skeleton skeleton-text" style={{ width: '120px', height: '18px' }}></div>
                      <div className="skeleton skeleton-text rounded-pill" style={{ width: '80px' }}></div>
                    </div>
                    <div className="skeleton skeleton-text w-50"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Applications Skeleton */}
        <div className="col-lg-4">
          <div className={`card border-0 shadow-sm h-100 ${isDarkMode ? 'bg-slate-800' : ''}`}>
            <div className="card-header bg-transparent border-0 pt-4 px-4">
              <div className="skeleton skeleton-title mb-0" style={{ width: '180px' }}></div>
            </div>
            <div className="card-body p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="mb-3 pb-3 border-bottom last:border-0">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <div className="skeleton skeleton-text mb-1" style={{ width: '120px', height: '18px' }}></div>
                      <div className="skeleton skeleton-text" style={{ width: '100px' }}></div>
                    </div>
                    <div className="skeleton skeleton-text rounded-pill" style={{ width: '70px' }}></div>
                  </div>
                  <div className="skeleton skeleton-text w-25"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

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

        .skeleton-icon {
          background-color: ${skeletonHighlightColor};
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

export default StudentDashboardSkeleton;
