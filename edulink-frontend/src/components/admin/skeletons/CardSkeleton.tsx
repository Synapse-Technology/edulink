import React from 'react';

interface CardSkeletonProps {
  count?: number;
  hasIcon?: boolean;
  hasChart?: boolean;
}

const CardSkeleton: React.FC<CardSkeletonProps> = ({ 
  count = 1, 
  hasIcon = true, 
  hasChart = false 
}) => {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="col-md-6 col-lg-3 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div className="flex-grow-1">
                  <div className="skeleton skeleton-text w-75 mb-2"></div>
                  <div className="skeleton skeleton-title mb-1"></div>
                  {hasChart && (
                    <div className="mt-3">
                      <div className="skeleton skeleton-chart"></div>
                    </div>
                  )}
                  <div className="skeleton skeleton-text w-50 mt-2"></div>
                </div>
                {hasIcon && (
                  <div className="skeleton skeleton-icon"></div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

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

        .skeleton-title {
          height: 24px;
          width: 60px;
        }

        .skeleton-icon {
          height: 48px;
          width: 48px;
          border-radius: 8px;
        }

        .skeleton-chart {
          height: 40px;
          width: 80px;
          border-radius: 4px;
        }

        .w-75 {
          width: 75%;
        }

        .w-50 {
          width: 50%;
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
    </>
  );
};

export default CardSkeleton;