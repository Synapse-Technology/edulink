import React from 'react';

const StudentProfileSkeleton: React.FC = () => {
  return (
    <div className="container-fluid px-4 px-lg-5 pt-4">
      {/* Header Skeleton */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="d-flex flex-column flex-md-row align-items-center gap-4">
            <div className="skeleton skeleton-circle" style={{ width: '100px', height: '100px', borderRadius: '50%' }}></div>
            <div className="text-center text-md-start flex-grow-1">
              <div className="skeleton skeleton-title mb-2" style={{ width: '250px', height: '32px' }}></div>
              <div className="skeleton skeleton-text mb-2" style={{ width: '180px' }}></div>
              <div className="d-flex justify-content-center justify-content-md-start gap-2">
                <div className="skeleton skeleton-text rounded-pill" style={{ width: '80px', height: '24px' }}></div>
                <div className="skeleton skeleton-text rounded-pill" style={{ width: '100px', height: '24px' }}></div>
              </div>
            </div>
            <div className="skeleton skeleton-button" style={{ width: '140px', height: '40px' }}></div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Sidebar/Info Skeleton */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body p-4">
              <div className="skeleton skeleton-title mb-4" style={{ width: '120px' }}></div>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="mb-3">
                  <div className="skeleton skeleton-text mb-1" style={{ width: '80px' }}></div>
                  <div className="skeleton skeleton-text w-100" style={{ height: '20px' }}></div>
                </div>
              ))}
            </div>
          </div>

          <div className="card border-0 shadow-sm">
             <div className="card-body p-4">
               <div className="skeleton skeleton-title mb-4" style={{ width: '150px' }}></div>
               <div className="d-flex flex-wrap gap-2">
                 {[1, 2, 3, 4, 5].map((i) => (
                   <div key={i} className="skeleton skeleton-text rounded-pill" style={{ width: '70px', height: '28px' }}></div>
                 ))}
               </div>
             </div>
          </div>
        </div>

        {/* Main Content/Documents Skeleton */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-transparent border-bottom px-4 py-3">
               <div className="skeleton skeleton-title" style={{ width: '180px' }}></div>
            </div>
            <div className="card-body p-4">
              <div className="row g-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="col-md-6">
                    <div className="border rounded p-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="d-flex align-items-center gap-2">
                           <div className="skeleton skeleton-icon" style={{ width: '20px', height: '20px' }}></div>
                           <div className="skeleton skeleton-text" style={{ width: '100px' }}></div>
                        </div>
                        <div className="skeleton skeleton-text rounded-pill" style={{ width: '60px' }}></div>
                      </div>
                      <div className="skeleton skeleton-button w-100 mt-2" style={{ height: '32px' }}></div>
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
          height: 14px;
        }

        .skeleton-button {
          height: 38px;
        }

        .skeleton-circle {
          background-color: #e0e0e0;
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

export default StudentProfileSkeleton;
