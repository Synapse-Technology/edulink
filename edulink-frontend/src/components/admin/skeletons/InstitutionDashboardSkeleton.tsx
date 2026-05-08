import React from 'react';
import './skeleton.css';

const InstitutionDashboardSkeleton: React.FC = () => {
  return (
    <div className="institution-dashboard-skeleton">
      <style>{`
        .institution-dashboard-skeleton {
          animation: skeletonFadeIn 0.35s ease-out;
        }

        @keyframes skeletonFadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .skeleton-block {
          position: relative;
          overflow: hidden;
          background: #eef2f6;
          border-radius: 12px;
        }

        .skeleton-block::after {
          content: '';
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255,255,255,0.65),
            transparent
          );
          animation: skeletonShimmer 1.4s infinite;
        }

        @keyframes skeletonShimmer {
          100% {
            transform: translateX(100%);
          }
        }

        .skeleton-card {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 26px;
          padding: 24px;
        }

        .skeleton-hero {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 28px;
          padding: 28px;
          margin-bottom: 28px;
        }

        .skeleton-pill {
          width: 190px;
          height: 34px;
          border-radius: 999px;
          margin-bottom: 18px;
        }

        .skeleton-title-lg {
          height: 42px;
          width: min(680px, 80%);
          border-radius: 14px;
          margin-bottom: 14px;
        }

        .skeleton-text-line {
          height: 14px;
          border-radius: 999px;
        }

        .skeleton-icon-box {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          margin-bottom: 22px;
        }

        .skeleton-stat-value {
          height: 36px;
          width: 82px;
          border-radius: 12px;
          margin-bottom: 12px;
        }

        .skeleton-section-card {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 26px;
          padding: 20px;
        }

        .skeleton-chart {
          height: 320px;
          border-radius: 22px;
        }

        .skeleton-circle {
          width: 190px;
          height: 190px;
          border-radius: 999px;
        }

        .skeleton-row {
          height: 58px;
          border-radius: 16px;
        }

        @media (max-width: 768px) {
          .skeleton-hero {
            padding: 22px;
            border-radius: 22px;
          }

          .skeleton-title-lg {
            width: 100%;
          }
        }
      `}</style>

      {/* Hero Skeleton */}
      <div className="skeleton-hero">
        <div className="d-flex flex-column flex-xl-row justify-content-between gap-4">
          <div className="flex-grow-1">
            <div className="skeleton-block skeleton-pill" />

            <div className="skeleton-block skeleton-title-lg" />

            <div
              className="skeleton-block skeleton-text-line mb-2"
              style={{ width: '70%' }}
            />

            <div
              className="skeleton-block skeleton-text-line"
              style={{ width: '52%' }}
            />
          </div>

          <div className="d-flex gap-2 flex-wrap align-self-xl-start">
            <div
              className="skeleton-block"
              style={{
                width: 142,
                height: 46,
                borderRadius: 14,
              }}
            />

            <div
              className="skeleton-block"
              style={{
                width: 162,
                height: 46,
                borderRadius: 14,
              }}
            />
          </div>
        </div>
      </div>

      {/* Pilot Readiness Skeleton */}
      <div className="skeleton-section-card mb-4">
        <div className="d-flex justify-content-between align-items-start gap-3 mb-4">
          <div className="flex-grow-1">
            <div
              className="skeleton-block mb-2"
              style={{ width: 260, height: 20 }}
            />

            <div
              className="skeleton-block skeleton-text-line"
              style={{ width: '55%' }}
            />
          </div>

          <div
            className="skeleton-block"
            style={{
              width: 72,
              height: 36,
              borderRadius: 999,
            }}
          />
        </div>

        <div className="row g-3">
          {[1, 2, 3].map(item => (
            <div className="col-lg-4" key={item}>
              <div
                className="skeleton-block"
                style={{
                  height: 92,
                  borderRadius: 18,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="row g-4 mb-4">
        {[1, 2, 3].map(item => (
          <div key={item} className="col-md-4">
            <div className="skeleton-card h-100">
              <div className="d-flex align-items-start justify-content-between mb-4">
                <div className="skeleton-block skeleton-icon-box" />

                <div
                  className="skeleton-block"
                  style={{
                    width: 72,
                    height: 28,
                    borderRadius: 999,
                  }}
                />
              </div>

              <div
                className="skeleton-block skeleton-text-line mb-3"
                style={{ width: '56%' }}
              />

              <div className="skeleton-block skeleton-stat-value" />

              <div
                className="skeleton-block skeleton-text-line mb-2"
                style={{ width: '88%' }}
              />

              <div
                className="skeleton-block skeleton-text-line"
                style={{ width: '62%' }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Charts + Sidebar Widgets Skeleton */}
      <div className="row g-4 mb-4">
        <div className="col-lg-8">
          <div className="skeleton-section-card h-100">
            <div className="d-flex justify-content-between align-items-start mb-4">
              <div>
                <div
                  className="skeleton-block mb-2"
                  style={{ width: 210, height: 20 }}
                />

                <div
                  className="skeleton-block skeleton-text-line"
                  style={{ width: 300 }}
                />
              </div>

              <div
                className="skeleton-block"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 14,
                }}
              />
            </div>

            <div className="skeleton-block skeleton-chart" />
          </div>
        </div>

        <div className="col-lg-4">
          <div className="skeleton-section-card mb-4">
            <div
              className="skeleton-block mb-3"
              style={{ width: 180, height: 20 }}
            />

            <div className="d-flex justify-content-center py-3">
              <div className="skeleton-block skeleton-circle" />
            </div>

            <div
              className="skeleton-block skeleton-text-line mb-2"
              style={{ width: '80%' }}
            />

            <div
              className="skeleton-block skeleton-text-line"
              style={{ width: '60%' }}
            />
          </div>

          <div className="skeleton-section-card">
            <div
              className="skeleton-block mb-4"
              style={{ width: 210, height: 20 }}
            />

            {[1, 2, 3].map(item => (
              <div
                key={item}
                className="skeleton-block skeleton-row mb-3"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Placement Monitoring Widget Skeleton */}
      <div className="skeleton-section-card">
        <div className="d-flex flex-column flex-md-row justify-content-between gap-3 mb-4">
          <div>
            <div
              className="skeleton-block mb-2"
              style={{ width: 240, height: 22 }}
            />

            <div
              className="skeleton-block skeleton-text-line"
              style={{ width: 360 }}
            />
          </div>

          <div
            className="skeleton-block"
            style={{
              width: 270,
              height: 42,
              borderRadius: 14,
            }}
          />
        </div>

        {[1, 2, 3, 4].map(item => (
          <div
            key={item}
            className="skeleton-block skeleton-row mb-3"
          />
        ))}
      </div>
    </div>
  );
};

export default InstitutionDashboardSkeleton;