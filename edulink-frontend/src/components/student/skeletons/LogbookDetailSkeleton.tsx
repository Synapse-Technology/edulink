import React from 'react';

interface LogbookDetailSkeletonProps {
  isDarkMode?: boolean;
}

const LogbookDetailSkeleton: React.FC<LogbookDetailSkeletonProps> = ({ isDarkMode }) => {
  const skeletonBaseColor = isDarkMode ? '#2b3035' : '#f0f0f0';
  const skeletonHighlightColor = isDarkMode ? '#3d4246' : '#e0e0e0';

  return (
    <div className="container-fluid">
      {/* Breadcrumb Skeleton */}
      <div className="mb-4">
        <div className="skeleton" style={{ width: '150px', height: '20px' }}></div>
      </div>

      {/* Title & Status Skeleton */}
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center gap-3 mb-4">
        <div>
          <div className="skeleton mb-2" style={{ width: '300px', height: '32px' }}></div>
          <div className="d-flex gap-3">
            <div className="skeleton" style={{ width: '120px', height: '16px' }}></div>
            <div className="skeleton" style={{ width: '150px', height: '16px' }}></div>
          </div>
        </div>
        <div className="skeleton rounded-pill" style={{ width: '100px', height: '36px' }}></div>
      </div>

      <div className="row g-4">
        {/* Left Column: Entries Timeline */}
        <div className="col-lg-8">
          <div className={`card border-0 rounded-4 shadow-sm ${isDarkMode ? 'bg-dark' : 'bg-white'}`}>
            <div className="card-header bg-transparent border-0 pt-4 px-4">
              <div className="skeleton" style={{ width: '200px', height: '24px' }}></div>
            </div>
            <div className="card-body p-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="mb-4 ps-4 border-start border-2 position-relative" style={{ borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
                  <div className="position-absolute rounded-circle bg-primary" style={{ width: '12px', height: '12px', left: '-7px', top: '5px' }}></div>
                  <div className={`p-4 rounded-4 ${isDarkMode ? 'bg-secondary bg-opacity-10' : 'bg-light'}`}>
                    <div className="d-flex justify-content-between mb-3">
                      <div>
                        <div className="skeleton mb-1" style={{ width: '100px', height: '18px' }}></div>
                        <div className="skeleton" style={{ width: '150px', height: '14px' }}></div>
                      </div>
                      <div className="skeleton rounded-pill" style={{ width: '80px', height: '24px' }}></div>
                    </div>
                    <div className="skeleton mb-2" style={{ width: '100%', height: '14px' }}></div>
                    <div className="skeleton mb-2" style={{ width: '90%', height: '14px' }}></div>
                    <div className="skeleton" style={{ width: '40%', height: '14px' }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Sidebar Cards */}
        <div className="col-lg-4">
          <div className="d-flex flex-column gap-4">
            {/* Info Card Skeleton */}
            <div className={`card border-0 rounded-4 shadow-sm ${isDarkMode ? 'bg-dark' : 'bg-white'}`}>
              <div className="card-body p-4">
                <div className="skeleton mb-4" style={{ width: '120px', height: '14px' }}></div>
                <div className="d-flex align-items-center gap-3 mb-4">
                  <div className="skeleton rounded-circle" style={{ width: '48px', height: '48px' }}></div>
                  <div>
                    <div className="skeleton mb-2" style={{ width: '150px', height: '18px' }}></div>
                    <div className="skeleton" style={{ width: '100px', height: '14px' }}></div>
                  </div>
                </div>
                <hr className="my-4 opacity-10" />
                <div className="d-flex justify-content-between mb-2">
                  <div className="skeleton" style={{ width: '80px', height: '14px' }}></div>
                  <div className="skeleton" style={{ width: '60px', height: '14px' }}></div>
                </div>
                <div className="d-flex justify-content-between">
                  <div className="skeleton" style={{ width: '80px', height: '14px' }}></div>
                  <div className="skeleton rounded-pill" style={{ width: '60px', height: '20px' }}></div>
                </div>
              </div>
            </div>

            {/* Feedback Card Skeleton */}
            <div className={`card border-0 rounded-4 shadow-sm ${isDarkMode ? 'bg-dark' : 'bg-white'}`}>
              <div className="card-body p-4">
                <div className="skeleton mb-4" style={{ width: '150px', height: '14px' }}></div>
                <div className="p-3 rounded-4 mb-3 border-start border-4 border-info bg-info bg-opacity-5">
                  <div className="skeleton mb-2" style={{ width: '100px', height: '14px' }}></div>
                  <div className="skeleton mb-1" style={{ width: '100%', height: '14px' }}></div>
                  <div className="skeleton" style={{ width: '60%', height: '14px' }}></div>
                </div>
                <div className="p-3 rounded-4 border-start border-4 border-warning bg-warning bg-opacity-5">
                  <div className="skeleton mb-2" style={{ width: '100px', height: '14px' }}></div>
                  <div className="skeleton mb-1" style={{ width: '100%', height: '14px' }}></div>
                  <div className="skeleton" style={{ width: '60%', height: '14px' }}></div>
                </div>
              </div>
            </div>

            {/* Action Button Skeleton */}
            <div className="skeleton rounded-3" style={{ width: '100%', height: '45px' }}></div>
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

export default LogbookDetailSkeleton;
