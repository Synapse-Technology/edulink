import React from 'react';

interface StudentApplicationsSkeletonProps {
  isDarkMode?: boolean;
}

const StudentApplicationsSkeleton: React.FC<StudentApplicationsSkeletonProps> = ({
  isDarkMode = false,
}) => {
  return (
    <div className={`sap-skeleton-page${isDarkMode ? ' dark-mode' : ''}`}>
      <style>{STYLES}</style>

      <div className="saps-back-row">
        <span className="saps-skeleton saps-back-pill" />
      </div>

      <section className="saps-hero">
        <div className="saps-hero-copy">
          <span className="saps-skeleton saps-eyebrow" />
          <span className="saps-skeleton saps-title" />
          <span className="saps-skeleton saps-title soft" />

          <div className="saps-sub">
            <span className="saps-skeleton saps-sub-line" />
            <span className="saps-skeleton saps-sub-line short" />
          </div>

          <div className="saps-meta">
            <span className="saps-skeleton saps-meta-pill" />
            <span className="saps-skeleton saps-meta-pill" />
            <span className="saps-skeleton saps-meta-pill wide" />
          </div>
        </div>

        <aside className="saps-pipeline-card">
          <div className="saps-pipeline-top">
            <div>
              <span className="saps-skeleton saps-pipeline-label" />
              <span className="saps-skeleton saps-pipeline-number" />
            </div>
            <span className="saps-skeleton saps-pipeline-icon" />
          </div>

          <div className="saps-pipeline-copy">
            <span className="saps-skeleton saps-pipeline-line" />
            <span className="saps-skeleton saps-pipeline-line short" />
          </div>

          <span className="saps-skeleton saps-pipeline-btn" />
        </aside>
      </section>

      <section className="saps-metrics">
        {[1, 2, 3, 4].map((item) => (
          <div className="saps-metric-card" key={item}>
            <span className="saps-skeleton saps-metric-icon" />
            <div>
              <span className="saps-skeleton saps-metric-label" />
              <span className="saps-skeleton saps-metric-value" />
            </div>
          </div>
        ))}
      </section>

      <section className="saps-controls">
        <div className="saps-chips">
          <span className="saps-skeleton saps-filter-label" />
          {[1, 2, 3, 4, 5].map((item) => (
            <span className="saps-skeleton saps-chip" key={item} />
          ))}
        </div>

        <span className="saps-skeleton saps-search" />
      </section>

      <section className="saps-list">
        {[1, 2, 3].map((item) => (
          <article className="saps-application-card" key={item}>
            <div className="saps-card-main">
              <div className="saps-card-content">
                <div className="saps-card-head">
                  <span className="saps-skeleton saps-logo" />

                  <div className="saps-card-title-block">
                    <div className="saps-company-line">
                      <span className="saps-skeleton saps-company" />
                      <span className="saps-skeleton saps-mini-badge" />
                    </div>

                    <span className="saps-skeleton saps-role-title" />
                    <span className="saps-skeleton saps-department" />
                  </div>
                </div>

                <div className="saps-card-meta">
                  <span className="saps-skeleton saps-card-meta-item" />
                  <span className="saps-skeleton saps-card-meta-item wide" />
                  <span className="saps-skeleton saps-card-meta-item" />
                </div>

                <div className="saps-progress">
                  {[1, 2, 3, 4, 5].map((step) => (
                    <div className="saps-progress-step" key={step}>
                      <span className="saps-skeleton saps-progress-dot" />
                      <span className="saps-skeleton saps-progress-label" />
                    </div>
                  ))}
                </div>
              </div>

              <aside className="saps-side-panel">
                <div>
                  <span className="saps-skeleton saps-status-badge" />

                  <div className="saps-next-action">
                    <span className="saps-skeleton saps-next-label" />
                    <span className="saps-skeleton saps-next-line" />
                    <span className="saps-skeleton saps-next-line short" />
                  </div>
                </div>

                <span className="saps-skeleton saps-view-btn" />
              </aside>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
};

const STYLES = `
  .sap-skeleton-page {
    --ink: #0d0f12;
    --ink-3: #6b7280;
    --ink-4: #9ca3af;
    --surface: #f9f8f6;
    --surface-2: #f2f0ed;
    --surface-3: #e8e5e0;
    --surface-4: #ffffff;
    --border: #e4e1dc;
    --border-2: #d1ccc5;
    --accent: #1a5cff;
    --accent-2: #e8eeff;
    --accent-soft: rgba(26,92,255,0.08);
    --radius: 14px;
    --radius-lg: 20px;
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
    --font-body: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --sk-base: #e8e5e0;
    --sk-mid: #f7f5f1;

    font-family: var(--font-body);
    color: var(--ink);
    background: var(--surface);
    min-height: 100vh;
  }

  .sap-skeleton-page.dark-mode {
    --ink: #f0ede8;
    --ink-3: #8a8580;
    --ink-4: #5a5650;
    --surface: #141414;
    --surface-2: #1c1c1c;
    --surface-3: #252525;
    --surface-4: #181818;
    --border: #2a2a2a;
    --border-2: #353535;
    --accent: #4d7fff;
    --accent-2: #1a2340;
    --accent-soft: rgba(77,127,255,0.10);
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.30);
    --sk-base: #252525;
    --sk-mid: #343434;
  }

  .saps-skeleton {
    display: block;
    border-radius: 8px;
    background: linear-gradient(
      90deg,
      var(--sk-base) 25%,
      var(--sk-mid) 50%,
      var(--sk-base) 75%
    );
    background-size: 220% 100%;
    animation: saps-loading 1.45s infinite ease;
  }

  @keyframes saps-loading {
    0% { background-position: 220% 0; }
    100% { background-position: -220% 0; }
  }

  .saps-back-row {
    padding-top: 24px;
    margin-bottom: -18px;
  }

  .saps-back-pill {
    width: 162px;
    height: 34px;
    border-radius: 999px;
  }

  .saps-hero {
    display: grid;
    grid-template-columns: 1fr 360px;
    gap: 32px;
    align-items: stretch;
    padding: 48px 0 32px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 28px;
  }

  .saps-hero-copy {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }

  .saps-eyebrow {
    width: 210px;
    height: 12px;
    border-radius: 999px;
    margin-bottom: 12px;
  }

  .saps-title {
    width: min(430px, 100%);
    height: 46px;
    border-radius: 12px;
    margin-bottom: 8px;
  }

  .saps-title.soft {
    width: min(280px, 72%);
    opacity: 0.72;
    margin-bottom: 18px;
  }

  .saps-sub {
    display: flex;
    flex-direction: column;
    gap: 9px;
    margin-bottom: 22px;
  }

  .saps-sub-line {
    width: min(610px, 100%);
    height: 14px;
  }

  .saps-sub-line.short {
    width: min(460px, 84%);
  }

  .saps-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
  }

  .saps-meta-pill {
    width: 132px;
    height: 16px;
    border-radius: 999px;
  }

  .saps-meta-pill.wide {
    width: 158px;
  }

  .saps-pipeline-card {
    background: linear-gradient(135deg, var(--surface-2), var(--accent-2));
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 22px;
    min-height: 225px;
    box-shadow: var(--shadow-sm);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .saps-pipeline-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .saps-pipeline-label {
    width: 118px;
    height: 12px;
    border-radius: 999px;
    margin-bottom: 16px;
  }

  .saps-pipeline-number {
    width: 84px;
    height: 52px;
    border-radius: 12px;
  }

  .saps-pipeline-icon {
    width: 42px;
    height: 42px;
    border-radius: 14px;
  }

  .saps-pipeline-copy {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 18px 0;
  }

  .saps-pipeline-line {
    width: 100%;
    height: 12px;
  }

  .saps-pipeline-line.short {
    width: 78%;
  }

  .saps-pipeline-btn {
    width: 100%;
    height: 42px;
    border-radius: var(--radius);
  }

  .saps-metrics {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 24px;
  }

  .saps-metric-card {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 18px;
    display: flex;
    align-items: center;
    gap: 14px;
    min-height: 92px;
  }

  .saps-metric-icon {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    flex-shrink: 0;
  }

  .saps-metric-label {
    width: 92px;
    height: 11px;
    border-radius: 999px;
    margin-bottom: 10px;
  }

  .saps-metric-value {
    width: 44px;
    height: 24px;
    border-radius: 10px;
  }

  .saps-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 18px;
  }

  .saps-chips {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .saps-filter-label {
    width: 72px;
    height: 16px;
    border-radius: 999px;
    margin-right: 2px;
  }

  .saps-chip {
    width: 88px;
    height: 34px;
    border-radius: 999px;
  }

  .saps-chip:nth-child(3) {
    width: 118px;
  }

  .saps-search {
    width: min(360px, 100%);
    height: 40px;
    border-radius: var(--radius);
    flex-shrink: 0;
  }

  .saps-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 64px;
  }

  .saps-application-card {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .saps-card-main {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 250px;
    gap: 22px;
    padding: 22px 24px;
  }

  .saps-card-head {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    margin-bottom: 16px;
  }

  .saps-logo {
    width: 48px;
    height: 48px;
    border-radius: 16px;
    flex-shrink: 0;
  }

  .saps-card-title-block {
    min-width: 0;
    flex: 1;
  }

  .saps-company-line {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 8px;
  }

  .saps-company {
    width: 140px;
    height: 13px;
  }

  .saps-mini-badge {
    width: 118px;
    height: 22px;
    border-radius: 999px;
  }

  .saps-role-title {
    width: min(360px, 100%);
    height: 22px;
    margin-bottom: 9px;
    border-radius: 10px;
  }

  .saps-department {
    width: 180px;
    height: 13px;
  }

  .saps-card-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px 18px;
    margin-bottom: 18px;
  }

  .saps-card-meta-item {
    width: 132px;
    height: 14px;
    border-radius: 999px;
  }

  .saps-card-meta-item.wide {
    width: 170px;
  }

  .saps-progress {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 8px;
    background: var(--surface-3);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 10px;
  }

  .saps-progress-step {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  .saps-progress-dot {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .saps-progress-label {
    width: 58px;
    height: 11px;
    border-radius: 999px;
  }

  .saps-side-panel {
    border-left: 1px solid var(--border);
    padding-left: 22px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 16px;
  }

  .saps-status-badge {
    width: 112px;
    height: 28px;
    border-radius: 999px;
    margin-bottom: 12px;
  }

  .saps-next-action {
    background: var(--surface-3);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 12px;
  }

  .saps-next-label {
    width: 98px;
    height: 11px;
    border-radius: 999px;
    margin-bottom: 10px;
  }

  .saps-next-line {
    width: 100%;
    height: 12px;
    margin-bottom: 8px;
  }

  .saps-next-line.short {
    width: 72%;
    margin-bottom: 0;
  }

  .saps-view-btn {
    width: 128px;
    height: 40px;
    border-radius: var(--radius);
    align-self: flex-end;
  }

  @media (max-width: 1180px) {
    .saps-hero {
      grid-template-columns: 1fr;
    }

    .saps-pipeline-card {
      max-width: 520px;
    }

    .saps-metrics {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 920px) {
    .saps-controls {
      align-items: stretch;
      flex-direction: column;
    }

    .saps-search {
      width: 100%;
    }

    .saps-card-main {
      grid-template-columns: 1fr;
    }

    .saps-side-panel {
      border-left: none;
      border-top: 1px solid var(--border);
      padding-left: 0;
      padding-top: 18px;
    }

    .saps-view-btn {
      align-self: flex-start;
    }
  }

  @media (max-width: 680px) {
    .saps-hero {
      padding-top: 40px;
    }

    .saps-title {
      height: 38px;
    }

    .saps-metrics {
      grid-template-columns: 1fr;
    }

    .saps-card-main {
      padding: 18px;
    }

    .saps-progress {
      grid-template-columns: 1fr;
      gap: 7px;
    }

    .saps-progress-label {
      width: 120px;
    }
  }
`;

export default StudentApplicationsSkeleton;