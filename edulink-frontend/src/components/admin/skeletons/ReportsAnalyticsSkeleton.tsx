import React from 'react';
import './skeleton.css';

const ReportsAnalyticsSkeleton: React.FC = () => {
  return (
    <div className="reports-analytics-skeleton">
      <style>{`
        .reports-analytics-skeleton {
          animation: reportsSkeletonFadeIn 0.35s ease-out;
        }

        @keyframes reportsSkeletonFadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .ra-skeleton-block {
          position: relative;
          overflow: hidden;
          background: #eef2f6;
          border-radius: 12px;
        }

        .ra-skeleton-block::after {
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
          animation: reportsSkeletonShimmer 1.4s infinite;
        }

        @keyframes reportsSkeletonShimmer {
          100% {
            transform: translateX(100%);
          }
        }

        .ra-hero {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 30px;
          padding: 32px;
          margin-bottom: 24px;
        }

        .ra-pill {
          width: 210px;
          height: 36px;
          border-radius: 999px;
          margin-bottom: 18px;
        }

        .ra-title {
          height: 46px;
          width: min(760px, 82%);
          border-radius: 14px;
          margin-bottom: 14px;
        }

        .ra-text-line {
          height: 14px;
          border-radius: 999px;
        }

        .ra-button {
          height: 46px;
          border-radius: 14px;
        }

        .ra-filter-shell,
        .ra-card,
        .ra-stat-card {
          background: #ffffff;
          border: 1px solid #e7eaf0;
        }

        .ra-filter-shell {
          border-radius: 24px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .ra-stat-card {
          border-radius: 24px;
          padding: 24px;
          height: 100%;
        }

        .ra-stat-icon {
          width: 50px;
          height: 50px;
          border-radius: 16px;
          margin-bottom: 20px;
        }

        .ra-stat-value {
          width: 88px;
          height: 36px;
          border-radius: 12px;
          margin-bottom: 12px;
        }

        .ra-card {
          border-radius: 26px;
          overflow: hidden;
        }

        .ra-card-header {
          padding: 24px;
          border-bottom: 1px solid #eef2f6;
        }

        .ra-chart {
          height: 340px;
          border-radius: 22px;
        }

        .ra-row {
          height: 58px;
          border-radius: 16px;
        }

        .ra-input {
          height: 46px;
          border-radius: 14px;
        }

        .ra-circle {
          width: 190px;
          height: 190px;
          border-radius: 999px;
        }

        .ra-soft-panel {
          background: #fbfcfd;
          border: 1px solid #edf0f4;
          border-radius: 20px;
          padding: 22px;
        }

        @media (max-width: 768px) {
          .ra-hero {
            padding: 24px;
          }

          .ra-title {
            width: 100%;
          }
        }
      `}</style>

      {/* Hero */}
      <div className="ra-hero">
        <div className="d-flex flex-column flex-xl-row justify-content-between gap-4">
          <div className="flex-grow-1">
            <div className="ra-skeleton-block ra-pill" />

            <div className="ra-skeleton-block ra-title" />

            <div
              className="ra-skeleton-block ra-text-line mb-2"
              style={{ width: '72%' }}
            />

            <div
              className="ra-skeleton-block ra-text-line"
              style={{ width: '54%' }}
            />
          </div>

          <div className="d-flex gap-2 align-self-xl-start flex-wrap">
            <div
              className="ra-skeleton-block ra-button"
              style={{ width: 150 }}
            />

            <div
              className="ra-skeleton-block ra-button"
              style={{ width: 168 }}
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="ra-filter-shell">
        <div className="d-flex align-items-center gap-2 mb-4">
          <div
            className="ra-skeleton-block"
            style={{ width: 38, height: 38, borderRadius: 14 }}
          />

          <div>
            <div
              className="ra-skeleton-block mb-2"
              style={{ width: 180, height: 18 }}
            />

            <div
              className="ra-skeleton-block ra-text-line"
              style={{ width: 260 }}
            />
          </div>
        </div>

        <div className="row g-3">
          <div className="col-md-3">
            <div
              className="ra-skeleton-block ra-text-line mb-2"
              style={{ width: 80 }}
            />
            <div className="ra-skeleton-block ra-input" />
          </div>

          <div className="col-md-3">
            <div
              className="ra-skeleton-block ra-text-line mb-2"
              style={{ width: 76 }}
            />
            <div className="ra-skeleton-block ra-input" />
          </div>

          <div className="col-md-6 d-flex align-items-end gap-2">
            <div
              className="ra-skeleton-block ra-button"
              style={{ width: 130 }}
            />
            <div
              className="ra-skeleton-block ra-button"
              style={{ width: 92 }}
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row g-4 mb-4">
        {[1, 2, 3, 4].map(item => (
          <div className="col-xl-3 col-md-6" key={item}>
            <div className="ra-stat-card">
              <div className="d-flex justify-content-between align-items-start mb-4">
                <div className="ra-skeleton-block ra-stat-icon" />

                <div
                  className="ra-skeleton-block"
                  style={{
                    width: 78,
                    height: 28,
                    borderRadius: 999,
                  }}
                />
              </div>

              <div
                className="ra-skeleton-block ra-text-line mb-3"
                style={{ width: '60%' }}
              />

              <div className="ra-skeleton-block ra-stat-value" />

              <div
                className="ra-skeleton-block ra-text-line"
                style={{ width: '74%' }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Source Breakdown Cards */}
      <div className="row g-4 mb-4">
        {[1, 2, 3].map(item => (
          <div className="col-lg-4" key={item}>
            <div className="ra-stat-card">
              <div className="d-flex justify-content-between align-items-start mb-4">
                <div className="ra-skeleton-block ra-stat-icon" />

                <div
                  className="ra-skeleton-block"
                  style={{
                    width: 74,
                    height: 28,
                    borderRadius: 999,
                  }}
                />
              </div>

              <div className="ra-skeleton-block ra-stat-value" />

              <div
                className="ra-skeleton-block ra-text-line mb-2"
                style={{ width: '62%' }}
              />

              <div
                className="ra-skeleton-block ra-text-line"
                style={{ width: '82%' }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Funnel + Department Performance */}
      <div className="row g-4 mb-4">
        <div className="col-lg-4">
          <div className="ra-card h-100">
            <div className="ra-card-header">
              <div
                className="ra-skeleton-block mb-2"
                style={{ width: 190, height: 20 }}
              />

              <div
                className="ra-skeleton-block ra-text-line"
                style={{ width: 240 }}
              />
            </div>

            <div className="p-4">
              {[1, 2, 3, 4, 5].map(item => (
                <div key={item} className="mb-4">
                  <div className="d-flex justify-content-between mb-2">
                    <div
                      className="ra-skeleton-block ra-text-line"
                      style={{ width: 90 }}
                    />
                    <div
                      className="ra-skeleton-block ra-text-line"
                      style={{ width: 38 }}
                    />
                  </div>

                  <div
                    className="ra-skeleton-block"
                    style={{ height: 8, borderRadius: 999 }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="ra-card h-100">
            <div className="ra-card-header">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div
                    className="ra-skeleton-block mb-2"
                    style={{ width: 230, height: 20 }}
                  />

                  <div
                    className="ra-skeleton-block ra-text-line"
                    style={{ width: 320 }}
                  />
                </div>

                <div
                  className="ra-skeleton-block"
                  style={{ width: 92, height: 30, borderRadius: 999 }}
                />
              </div>
            </div>

            <div className="p-4">
              {[1, 2, 3, 4].map(item => (
                <div
                  key={item}
                  className="ra-skeleton-block ra-row mb-3"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cohort Performance */}
      <div className="ra-card mb-4">
        <div className="ra-card-header">
          <div
            className="ra-skeleton-block mb-2"
            style={{ width: 220, height: 20 }}
          />

          <div
            className="ra-skeleton-block ra-text-line"
            style={{ width: 300 }}
          />
        </div>

        <div className="p-4">
          {[1, 2, 3].map(item => (
            <div key={item} className="ra-skeleton-block ra-row mb-3" />
          ))}
        </div>
      </div>

      {/* Bottom Panels */}
      <div className="row g-4">
        <div className="col-lg-6">
          <div className="ra-card h-100">
            <div className="ra-card-header">
              <div
                className="ra-skeleton-block mb-2"
                style={{ width: 200, height: 20 }}
              />

              <div
                className="ra-skeleton-block ra-text-line"
                style={{ width: 280 }}
              />
            </div>

            <div className="p-4">
              <div className="row g-4 mb-4">
                {[1, 2].map(item => (
                  <div className="col-sm-6" key={item}>
                    <div className="ra-soft-panel">
                      <div
                        className="ra-skeleton-block ra-text-line mb-3"
                        style={{ width: '70%' }}
                      />

                      <div className="ra-skeleton-block ra-stat-value" />

                      <div
                        className="ra-skeleton-block ra-text-line"
                        style={{ width: '80%' }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="ra-skeleton-block"
                style={{ height: 118, borderRadius: 20 }}
              />
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="ra-card h-100">
            <div className="ra-card-header">
              <div
                className="ra-skeleton-block mb-2"
                style={{ width: 200, height: 20 }}
              />

              <div
                className="ra-skeleton-block ra-text-line"
                style={{ width: 270 }}
              />
            </div>

            <div className="p-4">
              <div className="ra-soft-panel text-center py-5">
                <div className="d-flex justify-content-center mb-4">
                  <div className="ra-skeleton-block ra-circle" />
                </div>

                <div
                  className="ra-skeleton-block mx-auto mb-3"
                  style={{ width: 90, height: 38, borderRadius: 12 }}
                />

                <div
                  className="ra-skeleton-block mx-auto mb-2"
                  style={{ width: 190, height: 18 }}
                />

                <div
                  className="ra-skeleton-block mx-auto ra-text-line"
                  style={{ width: 300 }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsAnalyticsSkeleton;