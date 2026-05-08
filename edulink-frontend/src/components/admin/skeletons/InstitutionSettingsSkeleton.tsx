import React from 'react';
import './skeleton.css';

const InstitutionSettingsSkeleton: React.FC = () => {
  return (
    <div className="institution-settings-skeleton">
      <style>{`
        .institution-settings-skeleton {
          animation: settingsSkeletonFadeIn 0.35s ease-out;
        }

        @keyframes settingsSkeletonFadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .is-skeleton-block {
          position: relative;
          overflow: hidden;
          background: #eef2f6;
          border-radius: 12px;
        }

        .is-skeleton-block::after {
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
          animation: settingsShimmer 1.45s infinite;
        }

        @keyframes settingsShimmer {
          100% {
            transform: translateX(100%);
          }
        }

        .is-hero {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 30px;
          padding: 30px;
          margin-bottom: 24px;
        }

        .is-pill {
          width: 190px;
          height: 34px;
          border-radius: 999px;
          margin-bottom: 18px;
        }

        .is-title {
          height: 44px;
          width: min(720px, 82%);
          border-radius: 14px;
          margin-bottom: 14px;
        }

        .is-text-line {
          height: 14px;
          border-radius: 999px;
        }

        .is-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 24px;
          align-items: start;
        }

        .is-sidebar,
        .is-main {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 26px;
        }

        .is-sidebar {
          padding: 12px;
          position: sticky;
          top: 92px;
        }

        .is-nav-item {
          height: 50px;
          border-radius: 16px;
          margin-bottom: 8px;
        }

        .is-main-header {
          padding: 24px;
          border-bottom: 1px solid #eef2f6;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
        }

        .is-button {
          height: 44px;
          border-radius: 14px;
        }

        .is-main-body {
          padding: 24px;
        }

        .is-profile-card {
          background: #fbfcfd;
          border: 1px solid #edf0f4;
          border-radius: 24px;
          padding: 22px;
          margin-bottom: 24px;
        }

        .is-logo {
          width: 86px;
          height: 86px;
          border-radius: 24px;
        }

        .is-pill-small {
          width: 88px;
          height: 28px;
          border-radius: 999px;
        }

        .is-info-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .is-info-card {
          background: #ffffff;
          border: 1px solid #edf0f4;
          border-radius: 22px;
          padding: 20px;
        }

        .is-input {
          height: 46px;
          border-radius: 14px;
        }

        .is-textarea {
          height: 110px;
          border-radius: 18px;
        }

        .is-section-title {
          height: 22px;
          border-radius: 12px;
          margin-bottom: 10px;
        }

        .is-divider {
          height: 1px;
          background: #eef2f6;
          margin: 24px 0;
        }

        @media (max-width: 992px) {
          .is-layout {
            grid-template-columns: 1fr;
          }

          .is-sidebar {
            position: static;
          }

          .is-info-grid {
            grid-template-columns: 1fr;
          }

          .is-main-header {
            flex-direction: column;
          }
        }

        @media (max-width: 768px) {
          .is-hero {
            padding: 22px;
            border-radius: 24px;
          }

          .is-title {
            width: 100%;
          }
        }
      `}</style>

      {/* Hero Skeleton */}
      <div className="is-hero">
        <div className="d-flex flex-column flex-xl-row justify-content-between gap-4">
          <div className="flex-grow-1">
            <div className="is-skeleton-block is-pill" />

            <div className="is-skeleton-block is-title" />

            <div
              className="is-skeleton-block is-text-line mb-2"
              style={{ width: '70%' }}
            />

            <div
              className="is-skeleton-block is-text-line"
              style={{ width: '52%' }}
            />
          </div>

          <div className="d-flex gap-2 align-self-xl-start flex-wrap">
            <div
              className="is-skeleton-block is-button"
              style={{ width: 142 }}
            />

            <div
              className="is-skeleton-block is-button"
              style={{ width: 170 }}
            />
          </div>
        </div>
      </div>

      {/* Layout */}
      <div className="is-layout">
        {/* Sidebar */}
        <aside className="is-sidebar">
          {[1, 2, 3].map(item => (
            <div
              key={item}
              className="is-skeleton-block is-nav-item"
            />
          ))}
        </aside>

        {/* Main Content */}
        <section className="is-main">
          {/* Header */}
          <div className="is-main-header">
            <div>
              <div
                className="is-skeleton-block is-section-title"
                style={{ width: 220 }}
              />

              <div
                className="is-skeleton-block is-text-line"
                style={{ width: 320 }}
              />
            </div>

            <div
              className="is-skeleton-block is-button"
              style={{ width: 148 }}
            />
          </div>

          {/* Body */}
          <div className="is-main-body">
            {/* Institution Identity Card */}
            <div className="is-profile-card">
              <div className="d-flex align-items-center gap-4 flex-wrap">
                <div className="is-skeleton-block is-logo" />

                <div className="flex-grow-1">
                  <div
                    className="is-skeleton-block mb-3"
                    style={{
                      width: 240,
                      height: 28,
                      borderRadius: 12,
                    }}
                  />

                  <div
                    className="is-skeleton-block is-text-line mb-2"
                    style={{ width: '80%' }}
                  />

                  <div
                    className="is-skeleton-block is-text-line mb-4"
                    style={{ width: '62%' }}
                  />

                  <div className="d-flex gap-2 flex-wrap">
                    <div className="is-skeleton-block is-pill-small" />
                    <div className="is-skeleton-block is-pill-small" />
                    <div className="is-skeleton-block is-pill-small" />
                  </div>
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="is-info-grid">
              {[1, 2, 3, 4, 5, 6].map(item => (
                <div className="is-info-card" key={item}>
                  <div
                    className="is-skeleton-block mb-3"
                    style={{
                      width: 110,
                      height: 14,
                      borderRadius: 999,
                    }}
                  />

                  <div
                    className="is-skeleton-block"
                    style={{
                      width: item === 6 ? '92%' : '72%',
                      height: 20,
                      borderRadius: 10,
                    }}
                  />

                  {item === 6 && (
                    <>
                      <div
                        className="is-skeleton-block is-text-line mt-3 mb-2"
                        style={{ width: '88%' }}
                      />

                      <div
                        className="is-skeleton-block is-text-line"
                        style={{ width: '65%' }}
                      />
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="is-divider" />

            {/* Editable Form Skeleton */}
            <div className="mb-4">
              <div
                className="is-skeleton-block is-section-title"
                style={{ width: 180 }}
              />

              <div
                className="is-skeleton-block is-text-line"
                style={{ width: 320 }}
              />
            </div>

            <div className="row g-4 mb-4">
              {[1, 2].map(item => (
                <div className="col-md-6" key={item}>
                  <div
                    className="is-skeleton-block mb-2"
                    style={{
                      width: 110,
                      height: 14,
                      borderRadius: 999,
                    }}
                  />

                  <div className="is-skeleton-block is-input" />
                </div>
              ))}
            </div>

            <div className="row g-4 mb-4">
              {[1, 2].map(item => (
                <div className="col-md-6" key={item}>
                  <div
                    className="is-skeleton-block mb-2"
                    style={{
                      width: 100,
                      height: 14,
                      borderRadius: 999,
                    }}
                  />

                  <div className="is-skeleton-block is-input" />
                </div>
              ))}
            </div>

            <div className="mb-4">
              <div
                className="is-skeleton-block mb-2"
                style={{
                  width: 90,
                  height: 14,
                  borderRadius: 999,
                }}
              />

              <div className="is-skeleton-block is-textarea" />
            </div>

            <div className="mb-4">
              <div
                className="is-skeleton-block mb-2"
                style={{
                  width: 120,
                  height: 14,
                  borderRadius: 999,
                }}
              />

              <div className="is-skeleton-block is-textarea" />
            </div>

            {/* Footer Actions */}
            <div className="d-flex justify-content-end gap-2 flex-wrap">
              <div
                className="is-skeleton-block is-button"
                style={{ width: 110 }}
              />

              <div
                className="is-skeleton-block is-button"
                style={{ width: 148 }}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default InstitutionSettingsSkeleton;