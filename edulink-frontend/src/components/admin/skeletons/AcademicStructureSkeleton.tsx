import React from 'react';

const SkeletonStyles = () => (
  <style>{`
    .as-skeleton-block {
      position: relative;
      overflow: hidden;
      background: #eef2f6;
      border-radius: 12px;
    }

    .as-skeleton-block::after {
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
      animation: academicSkeletonShimmer 1.45s infinite;
    }

    @keyframes academicSkeletonShimmer {
      100% {
        transform: translateX(100%);
      }
    }

    .academic-skeleton-page {
      animation: academicSkeletonFadeIn 0.35s ease-out;
    }

    @keyframes academicSkeletonFadeIn {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .as-hero {
      background: #ffffff;
      border: 1px solid #e7eaf0;
      border-radius: 28px;
      padding: 28px;
      display: flex;
      justify-content: space-between;
      gap: 24px;
      align-items: flex-start;
      margin-bottom: 24px;
    }

    .as-eyebrow {
      width: 180px;
      height: 14px;
      border-radius: 999px;
      margin-bottom: 18px;
    }

    .as-title {
      width: min(540px, 80%);
      height: 40px;
      border-radius: 14px;
      margin-bottom: 14px;
    }

    .as-text-line {
      height: 14px;
      border-radius: 999px;
    }

    .as-button {
      width: 150px;
      height: 46px;
      border-radius: 14px;
      flex-shrink: 0;
    }

    .as-department-shell {
      background: #ffffff;
      border: 1px solid #e7eaf0;
      border-radius: 24px;
      overflow: hidden;
      margin-bottom: 24px;
    }

    .as-department-header {
      padding: 24px;
      display: flex;
      justify-content: space-between;
      gap: 20px;
      border-bottom: 1px solid #eef2f6;
    }

    .as-icon {
      width: 46px;
      height: 46px;
      border-radius: 16px;
      flex-shrink: 0;
    }

    .as-action-icon {
      width: 34px;
      height: 34px;
      border-radius: 12px;
    }

    .as-cohort-area {
      padding: 22px;
      background: #fbfcfd;
    }

    .as-cohort-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
      gap: 14px;
    }

    .as-cohort-row {
      background: #ffffff;
      border: 1px solid #edf0f4;
      border-radius: 16px;
      padding: 16px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 10px;
    }

    .as-mini-button {
      width: 112px;
      height: 34px;
      border-radius: 12px;
    }

    @media (max-width: 768px) {
      .as-hero,
      .as-department-header,
      .as-cohort-header,
      .as-cohort-row {
        flex-direction: column;
        align-items: flex-start;
      }

      .as-title {
        width: 100%;
      }
    }
  `}</style>
);

export const AcademicStructureSkeleton: React.FC = () => {
  return (
    <div className="academic-skeleton-page">
      <SkeletonStyles />

      <div className="as-hero">
        <div className="flex-grow-1">
          <div className="as-skeleton-block as-eyebrow" />

          <div className="as-skeleton-block as-title" />

          <div
            className="as-skeleton-block as-text-line mb-2"
            style={{ width: '66%' }}
          />

          <div
            className="as-skeleton-block as-text-line"
            style={{ width: '48%' }}
          />
        </div>

        <div className="as-skeleton-block as-button" />
      </div>

      <div className="d-flex flex-column">
        {[1, 2, 3].map(item => (
          <div key={item} className="as-department-shell">
            <div className="as-department-header">
              <div className="d-flex align-items-start gap-3 flex-grow-1">
                <div className="as-skeleton-block as-icon" />

                <div className="flex-grow-1">
                  <div
                    className="as-skeleton-block mb-3"
                    style={{
                      width: 240,
                      height: 22,
                      borderRadius: 12,
                    }}
                  />

                  <div className="d-flex gap-2 flex-wrap">
                    <div
                      className="as-skeleton-block"
                      style={{
                        width: 72,
                        height: 28,
                        borderRadius: 999,
                      }}
                    />

                    <div
                      className="as-skeleton-block"
                      style={{
                        width: 190,
                        height: 28,
                        borderRadius: 999,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="d-flex gap-2">
                <div className="as-skeleton-block as-action-icon" />
                <div className="as-skeleton-block as-action-icon" />
              </div>
            </div>

            <div className="as-cohort-area">
              <div className="as-cohort-header">
                <div
                  className="as-skeleton-block"
                  style={{
                    width: 140,
                    height: 20,
                    borderRadius: 12,
                  }}
                />

                <div className="as-skeleton-block as-mini-button" />
              </div>

              {[1, 2].map(row => (
                <div key={row} className="as-cohort-row">
                  <div className="flex-grow-1">
                    <div
                      className="as-skeleton-block mb-2"
                      style={{
                        width: 220,
                        height: 18,
                        borderRadius: 10,
                      }}
                    />

                    <div
                      className="as-skeleton-block as-text-line"
                      style={{ width: 170 }}
                    />
                  </div>

                  <div className="d-flex gap-2">
                    <div className="as-skeleton-block as-action-icon" />
                    <div className="as-skeleton-block as-action-icon" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const CohortTableSkeleton: React.FC = () => {
  return (
    <div className="w-100">
      <SkeletonStyles />

      <div className="d-flex flex-column gap-2">
        {[1, 2, 3].map(item => (
          <div key={item} className="as-cohort-row mb-0">
            <div className="flex-grow-1">
              <div
                className="as-skeleton-block mb-2"
                style={{
                  width: 220,
                  height: 18,
                  borderRadius: 10,
                }}
              />

              <div
                className="as-skeleton-block as-text-line"
                style={{ width: 160 }}
              />
            </div>

            <div className="d-flex gap-2">
              <div className="as-skeleton-block as-action-icon" />
              <div className="as-skeleton-block as-action-icon" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AcademicStructureSkeleton;