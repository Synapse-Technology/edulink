import React from 'react';

interface StudentAffiliationSkeletonProps {
  isDarkMode?: boolean;
}

const StudentAffiliationSkeleton: React.FC<StudentAffiliationSkeletonProps> = ({ isDarkMode }) => {
  const skeletonBaseColor = isDarkMode ? '#2b3035' : '#f0f0f0';
  const skeletonHighlightColor = isDarkMode ? '#3d4246' : '#e0e0e0';

  return (
    <div className="row justify-content-center">
      <div className="col-lg-8">
        <div className={`card mb-4 ${isDarkMode ? 'bg-dark border-secondary' : 'bg-white'}`} style={{ borderRadius: '16px' }}>
          <div className="card-body p-4">
            <div className="text-center mb-4">
              <div className="skeleton rounded-circle mx-auto mb-3" style={{ width: '48px', height: '48px' }}></div>
              <div className="skeleton mx-auto mb-2" style={{ width: '200px', height: '32px' }}></div>
              <div className="skeleton mx-auto" style={{ width: '300px', height: '20px' }}></div>
            </div>

            <div className="mb-4">
              <div className="skeleton w-100" style={{ height: '48px', borderRadius: '0.375rem' }}></div>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-4">
              <div className="skeleton" style={{ width: '150px', height: '20px' }}></div>
            </div>

            <div className="skeleton w-100" style={{ height: '48px', borderRadius: '0.375rem' }}></div>
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

export default StudentAffiliationSkeleton;
