import React from 'react';

interface StudentInternshipSkeletonProps {
  isDarkMode?: boolean;
}

const StudentInternshipSkeleton: React.FC<StudentInternshipSkeletonProps> = ({ isDarkMode }) => {
  const skeletonBaseColor = isDarkMode ? '#1e293b' : '#f0f0f0';
  const skeletonHighlightColor = isDarkMode ? '#334155' : '#e0e0e0';

  return (
    <div className="container-fluid px-4 px-lg-5 pt-4">
      {/* Header Skeleton */}
      <div className="mb-4 text-center">
         <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
            <div className="skeleton" style={{ width: '60px', height: '2px' }}></div>
            <div className="skeleton skeleton-title" style={{ width: '250px', height: '32px' }}></div>
            <div className="skeleton" style={{ width: '60px', height: '2px' }}></div>
         </div>
         <div className="skeleton skeleton-text mx-auto" style={{ width: '300px' }}></div>
      </div>

      {/* Internship Info Pill Skeleton */}
      <div className="mb-4 text-center">
         <div className={`d-inline-block px-4 py-2 rounded-pill border shadow-sm ${isDarkMode ? 'border-secondary' : 'bg-white'}`} style={{ minWidth: '300px', backgroundColor: isDarkMode ? '#1e293b' : undefined }}>
            <div className="d-flex justify-content-center align-items-center gap-2">
               <div className="skeleton skeleton-text" style={{ width: '100px' }}></div>
               <div className="skeleton skeleton-text rounded-circle" style={{ width: '4px', height: '4px' }}></div>
               <div className="skeleton skeleton-text" style={{ width: '100px' }}></div>
            </div>
         </div>
      </div>

      {/* Calendar Skeleton */}
      <div className={`card mb-4 shadow-sm border-0 ${isDarkMode ? '' : 'bg-white'}`} style={{ backgroundColor: isDarkMode ? '#1e293b' : undefined }}>
        <div className="card-body p-4">
           {/* Calendar Header */}
           <div className="d-flex justify-content-between mb-4">
              <div className="d-flex gap-2">
                 <div className="skeleton skeleton-button" style={{ width: '40px' }}></div>
                 <div className="skeleton skeleton-button" style={{ width: '40px' }}></div>
                 <div className="skeleton skeleton-button" style={{ width: '60px' }}></div>
              </div>
              <div className="skeleton skeleton-title" style={{ width: '150px' }}></div>
              <div className="d-flex gap-2">
                 <div className="skeleton skeleton-button" style={{ width: '60px' }}></div>
                 <div className="skeleton skeleton-button" style={{ width: '60px' }}></div>
              </div>
           </div>
           
           {/* Calendar Grid */}
           <div className={`row g-0 border-top border-start ${isDarkMode ? 'border-secondary' : ''}`}>
              {[...Array(35)].map((_, i) => (
                 <div key={i} className={`col border-end border-bottom p-2 ${isDarkMode ? 'border-secondary' : ''}`} style={{ height: '100px', minWidth: '14%' }}>
                    <div className="d-flex justify-content-end">
                       <div className="skeleton skeleton-text rounded-circle" style={{ width: '20px', height: '20px' }}></div>
                    </div>
                 </div>
              ))}
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

        .skeleton-button {
          height: 38px;
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

export default StudentInternshipSkeleton;
