import React from 'react';

interface StudentDashboardSkeletonProps {
  isDarkMode?: boolean;
}

const StudentDashboardSkeleton: React.FC<StudentDashboardSkeletonProps> = ({
  isDarkMode = false,
}) => {
  return (
    <div className={`sd-skeleton-page${isDarkMode ? ' dark-mode' : ''}`}>
      <style>{STYLES}</style>

      {/* Hero */}
      <header className="sds-hero">
        <div>
          <span className="sds-skeleton sds-eyebrow" />
          <span className="sds-skeleton sds-title" />
          <span className="sds-skeleton sds-title soft" />

          <div className="sds-sub">
            <span className="sds-skeleton sds-sub-line" />
            <span className="sds-skeleton sds-sub-line short" />
          </div>

          <div className="sds-actions">
            <span className="sds-skeleton sds-primary-btn" />
            <span className="sds-skeleton sds-ghost-btn" />
          </div>
        </div>

        <aside className="sds-passport">
          <span className="sds-skeleton sds-passport-label" />
          <span className="sds-skeleton sds-ring" />
          <span className="sds-skeleton sds-passport-score" />
          <span className="sds-skeleton sds-passport-copy" />
        </aside>
      </header>

      {/* Metrics */}
      <section className="sds-metrics">
        {[1, 2, 3, 4].map((item) => (
          <div className="sds-metric" key={item}>
            <span className="sds-skeleton sds-metric-icon" />
            <span className="sds-skeleton sds-metric-label" />
            <span className="sds-skeleton sds-metric-value" />
            <span className="sds-skeleton sds-metric-detail" />
          </div>
        ))}
      </section>

      {/* Onboarding */}
      <section className="sds-checks-section">
        <div className="sds-section-head">
          <div>
            <span className="sds-skeleton sds-section-eyebrow" />
            <span className="sds-skeleton sds-section-title" />
            <span className="sds-skeleton sds-section-sub" />
          </div>
        </div>

        <div className="sds-check-grid">
          {[1, 2, 3, 4].map((item) => (
            <div className="sds-check" key={item}>
              <span className="sds-skeleton sds-check-icon" />
              <span className="sds-skeleton sds-check-title" />
              <span className="sds-skeleton sds-check-desc" />
              <span className="sds-skeleton sds-check-desc short" />
            </div>
          ))}
        </div>
      </section>

      {/* Flow */}
      <div className="sds-flow">
        <main className="sds-main">
          {/* Placement */}
          <section className="sds-card">
            <div className="sds-card-header">
              <div>
                <span className="sds-skeleton sds-card-label" />
                <span className="sds-skeleton sds-card-title" />
              </div>
              <span className="sds-skeleton sds-small-btn" />
            </div>

            <div className="sds-card-body">
              <div className="sds-placement-meta">
                <span className="sds-skeleton sds-meta-item" />
                <span className="sds-skeleton sds-meta-item wide" />
                <span className="sds-skeleton sds-meta-item" />
              </div>

              <div className="sds-progress-block">
                <div className="sds-progress-head">
                  <span className="sds-skeleton sds-progress-label" />
                  <span className="sds-skeleton sds-progress-percent" />
                </div>
                <span className="sds-skeleton sds-progress-track" />
                <span className="sds-skeleton sds-progress-days" />
              </div>

              <div className="sds-placement-actions">
                <span className="sds-skeleton sds-primary-btn small" />
                <span className="sds-skeleton sds-ghost-btn small" />
              </div>
            </div>
          </section>

          {/* Next actions */}
          <section className="sds-card">
            <div className="sds-card-header">
              <div>
                <span className="sds-skeleton sds-card-label" />
                <span className="sds-skeleton sds-card-title small" />
              </div>
            </div>

            <div className="sds-card-body">
              <div className="sds-action-grid">
                {[1, 2, 3].map((item) => (
                  <div className="sds-action-card" key={item}>
                    <span className="sds-skeleton sds-action-priority" />
                    <span className="sds-skeleton sds-action-icon" />
                    <span className="sds-skeleton sds-action-title" />
                    <span className="sds-skeleton sds-action-desc" />
                    <span className="sds-skeleton sds-action-desc short" />
                    <span className="sds-skeleton sds-action-cta" />
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Recent applications */}
          <section className="sds-card">
            <div className="sds-card-header">
              <div>
                <span className="sds-skeleton sds-card-label" />
                <span className="sds-skeleton sds-card-title small" />
              </div>
              <span className="sds-skeleton sds-small-btn" />
            </div>

            <div className="sds-card-body">
              <div className="sds-table">
                {[1, 2, 3, 4].map((item) => (
                  <div className="sds-table-row" key={item}>
                    <span className="sds-skeleton sds-table-company" />
                    <span className="sds-skeleton sds-table-position" />
                    <span className="sds-skeleton sds-table-badge" />
                    <span className="sds-skeleton sds-table-date" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>

        <aside className="sds-sidebar">
          {/* Trust Journey */}
          <section className="sds-card">
            <div className="sds-card-header">
              <span className="sds-skeleton sds-side-heading" />
              <span className="sds-skeleton sds-trust-level" />
            </div>

            <div className="sds-card-body compact">
              {[1, 2, 3, 4].map((item) => (
                <div className="sds-side-step" key={item}>
                  <span className="sds-skeleton sds-side-dot" />
                  <span className="sds-skeleton sds-side-line" />
                </div>
              ))}
            </div>
          </section>

          {/* Upcoming */}
          <section className="sds-card">
            <div className="sds-card-header">
              <span className="sds-skeleton sds-side-heading short" />
              <span className="sds-skeleton sds-side-icon" />
            </div>
            <div className="sds-card-body compact">
              {[1, 2].map((item) => (
                <div className="sds-event" key={item}>
                  <span className="sds-skeleton sds-event-title" />
                  <span className="sds-skeleton sds-event-date" />
                </div>
              ))}
            </div>
          </section>

          {/* Trust history */}
          <section className="sds-card">
            <div className="sds-card-header">
              <span className="sds-skeleton sds-side-heading" />
              <span className="sds-skeleton sds-side-icon" />
            </div>
            <div className="sds-card-body compact">
              {[1, 2, 3].map((item) => (
                <div className="sds-ledger" key={item}>
                  <span className="sds-skeleton sds-ledger-title" />
                  <span className="sds-skeleton sds-ledger-date" />
                </div>
              ))}
            </div>
          </section>

          {/* Quick links */}
          <section className="sds-card">
            <div className="sds-card-header">
              <span className="sds-skeleton sds-side-heading short" />
            </div>
            <div className="sds-card-body">
              {[1, 2, 3].map((item) => (
                <div className="sds-quick-link" key={item}>
                  <span className="sds-skeleton sds-quick-icon" />
                  <span className="sds-skeleton sds-quick-text" />
                </div>
              ))}
            </div>
          </section>

          {/* Tip */}
          <section className="sds-tip">
            <span className="sds-skeleton sds-tip-icon" />
            <span className="sds-skeleton sds-tip-title" />
            <span className="sds-skeleton sds-tip-line" />
            <span className="sds-skeleton sds-tip-line short" />
          </section>
        </aside>
      </div>
    </div>
  );
};

const STYLES = `
  .sd-skeleton-page {
    --ink: #0d0f12;
    --ink-2: #3a3d44;
    --ink-3: #6b7280;
    --ink-4: #9ca3af;
    --surface: #f9f8f6;
    --surface-2: #f2f0ed;
    --surface-3: #e8e5e0;
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

  .sd-skeleton-page.dark-mode {
    --ink: #f0ede8;
    --ink-2: #c9c4bc;
    --ink-3: #8a8580;
    --ink-4: #5a5650;
    --surface: #141414;
    --surface-2: #1c1c1c;
    --surface-3: #252525;
    --border: #2a2a2a;
    --border-2: #353535;
    --accent: #4d7fff;
    --accent-2: #1a2340;
    --accent-soft: rgba(77,127,255,0.10);
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.30);
    --sk-base: #252525;
    --sk-mid: #343434;
  }

  .sds-skeleton {
    display: block;
    border-radius: 8px;
    background: linear-gradient(
      90deg,
      var(--sk-base) 25%,
      var(--sk-mid) 50%,
      var(--sk-base) 75%
    );
    background-size: 220% 100%;
    animation: sds-loading 1.45s infinite ease;
  }

  @keyframes sds-loading {
    0% { background-position: 220% 0; }
    100% { background-position: -220% 0; }
  }

  .sds-hero {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 32px;
    align-items: end;
    padding: 48px 0 32px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 40px;
  }

  .sds-eyebrow {
    width: 210px;
    height: 12px;
    border-radius: 999px;
    margin-bottom: 12px;
  }

  .sds-title {
    width: min(430px, 100%);
    height: 44px;
    border-radius: 12px;
    margin-bottom: 8px;
  }

  .sds-title.soft {
    width: min(260px, 70%);
    opacity: 0.72;
    margin-bottom: 18px;
  }

  .sds-sub {
    display: flex;
    flex-direction: column;
    gap: 9px;
    margin-bottom: 20px;
  }

  .sds-sub-line {
    width: min(460px, 100%);
    height: 14px;
  }

  .sds-sub-line.short {
    width: min(340px, 82%);
  }

  .sds-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .sds-primary-btn,
  .sds-ghost-btn {
    height: 40px;
    border-radius: var(--radius);
  }

  .sds-primary-btn {
    width: 182px;
  }

  .sds-ghost-btn {
    width: 164px;
  }

  .sds-primary-btn.small,
  .sds-ghost-btn.small {
    width: 136px;
    height: 38px;
  }

  .sds-passport {
    min-width: 200px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .sds-passport-label {
    width: 132px;
    height: 12px;
    border-radius: 999px;
  }

  .sds-ring {
    width: 52px;
    height: 52px;
    border-radius: 50%;
  }

  .sds-passport-score {
    width: 78px;
    height: 42px;
    border-radius: 12px;
  }

  .sds-passport-copy {
    width: 136px;
    height: 28px;
  }

  .sds-metrics {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 40px;
  }

  .sds-metric {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .sds-metric-icon {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    margin-bottom: 4px;
  }

  .sds-metric-label {
    width: 94px;
    height: 11px;
    border-radius: 999px;
  }

  .sds-metric-value {
    width: 84px;
    height: 26px;
    border-radius: 10px;
  }

  .sds-metric-detail {
    width: 150px;
    max-width: 100%;
    height: 12px;
  }

  .sds-checks-section {
    margin-bottom: 40px;
  }

  .sds-section-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 20px;
  }

  .sds-section-eyebrow {
    width: 142px;
    height: 11px;
    border-radius: 999px;
    margin-bottom: 8px;
  }

  .sds-section-title {
    width: min(520px, 100%);
    height: 32px;
    border-radius: 12px;
    margin-bottom: 10px;
  }

  .sds-section-sub {
    width: min(430px, 85%);
    height: 13px;
  }

  .sds-check-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }

  .sds-check {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .sds-check-icon {
    width: 30px;
    height: 30px;
    border-radius: 9px;
  }

  .sds-check-title {
    width: 138px;
    max-width: 100%;
    height: 14px;
  }

  .sds-check-desc {
    width: 100%;
    height: 12px;
  }

  .sds-check-desc.short {
    width: 74%;
  }

  .sds-flow {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 24px;
    margin-bottom: 64px;
  }

  .sds-main,
  .sds-sidebar {
    min-width: 0;
  }

  .sds-main,
  .sds-sidebar {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .sds-card {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .sds-card-header {
    padding: 20px 24px 16px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .sds-card-body {
    padding: 20px 24px;
  }

  .sds-card-body.compact {
    padding-top: 8px;
    padding-bottom: 8px;
  }

  .sds-card-label {
    width: 132px;
    height: 11px;
    border-radius: 999px;
    margin-bottom: 8px;
  }

  .sds-card-title {
    width: 250px;
    max-width: 100%;
    height: 24px;
    border-radius: 10px;
  }

  .sds-card-title.small {
    width: 180px;
  }

  .sds-small-btn {
    width: 104px;
    height: 34px;
    border-radius: var(--radius);
  }

  .sds-placement-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    margin-bottom: 20px;
  }

  .sds-meta-item {
    width: 128px;
    height: 14px;
    border-radius: 999px;
  }

  .sds-meta-item.wide {
    width: 170px;
  }

  .sds-progress-block {
    margin-bottom: 20px;
  }

  .sds-progress-head {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .sds-progress-label {
    width: 142px;
    height: 12px;
    border-radius: 999px;
  }

  .sds-progress-percent {
    width: 42px;
    height: 18px;
    border-radius: 8px;
  }

  .sds-progress-track {
    width: 100%;
    height: 5px;
    border-radius: 999px;
    margin-bottom: 8px;
  }

  .sds-progress-days {
    width: 128px;
    height: 12px;
  }

  .sds-placement-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .sds-action-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .sds-action-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .sds-action-priority {
    width: 76px;
    height: 10px;
    border-radius: 999px;
  }

  .sds-action-icon {
    width: 36px;
    height: 36px;
    border-radius: 11px;
  }

  .sds-action-title {
    width: 136px;
    max-width: 100%;
    height: 15px;
  }

  .sds-action-desc {
    width: 100%;
    height: 12px;
  }

  .sds-action-desc.short {
    width: 76%;
  }

  .sds-action-cta {
    width: 92px;
    height: 12px;
    border-radius: 999px;
    margin-top: 4px;
  }

  .sds-table {
    display: flex;
    flex-direction: column;
  }

  .sds-table-row {
    display: grid;
    grid-template-columns: 1.2fr 1.5fr 0.8fr 0.8fr;
    gap: 16px;
    align-items: center;
    padding: 13px 0;
    border-bottom: 1px solid var(--border);
  }

  .sds-table-row:first-child {
    padding-top: 0;
  }

  .sds-table-row:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .sds-table-company,
  .sds-table-position,
  .sds-table-date {
    height: 13px;
  }

  .sds-table-company {
    width: 120px;
  }

  .sds-table-position {
    width: 160px;
    max-width: 100%;
  }

  .sds-table-badge {
    width: 78px;
    height: 22px;
    border-radius: 8px;
  }

  .sds-table-date {
    width: 84px;
  }

  .sds-side-heading {
    width: 122px;
    height: 13px;
    border-radius: 999px;
  }

  .sds-side-heading.short {
    width: 86px;
  }

  .sds-trust-level {
    width: 76px;
    height: 25px;
    border-radius: var(--radius);
  }

  .sds-side-icon {
    width: 16px;
    height: 16px;
    border-radius: 6px;
  }

  .sds-side-step,
  .sds-event,
  .sds-ledger {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 13px 0;
    border-bottom: 1px solid var(--border);
  }

  .sds-event,
  .sds-ledger {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }

  .sds-side-step:first-child,
  .sds-event:first-child,
  .sds-ledger:first-child {
    padding-top: 0;
  }

  .sds-side-step:last-child,
  .sds-event:last-child,
  .sds-ledger:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .sds-side-dot {
    width: 28px;
    height: 28px;
    border-radius: 9px;
    flex-shrink: 0;
  }

  .sds-side-line {
    width: 180px;
    max-width: 100%;
    height: 13px;
  }

  .sds-event-title {
    width: 200px;
    max-width: 100%;
    height: 13px;
  }

  .sds-event-date {
    width: 120px;
    height: 11px;
  }

  .sds-ledger {
    flex-direction: row;
    justify-content: space-between;
  }

  .sds-ledger-title {
    width: 150px;
    height: 12px;
  }

  .sds-ledger-date {
    width: 72px;
    height: 11px;
  }

  .sds-quick-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-radius: var(--radius);
  }

  .sds-quick-icon {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    flex-shrink: 0;
  }

  .sds-quick-text {
    width: 150px;
    height: 13px;
  }

  .sds-tip {
    background: linear-gradient(135deg, var(--accent-2), var(--surface-2));
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 18px 20px;
  }

  .sds-tip-icon {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    margin-bottom: 12px;
  }

  .sds-tip-title {
    width: 180px;
    height: 14px;
    margin-bottom: 10px;
  }

  .sds-tip-line {
    width: 100%;
    height: 12px;
    margin-bottom: 8px;
  }

  .sds-tip-line.short {
    width: 74%;
    margin-bottom: 0;
  }

  @media (max-width: 1100px) {
    .sds-flow {
      grid-template-columns: 1fr;
    }

    .sds-metrics {
      grid-template-columns: repeat(2, 1fr);
    }

    .sds-check-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 768px) {
    .sds-hero {
      grid-template-columns: 1fr;
    }

    .sds-passport {
      align-items: flex-start;
      min-width: 0;
    }

    .sds-metrics {
      grid-template-columns: repeat(2, 1fr);
    }

    .sds-check-grid,
    .sds-action-grid {
      grid-template-columns: 1fr;
    }

    .sds-table-row {
      grid-template-columns: 1fr;
      gap: 8px;
    }
  }

  @media (max-width: 480px) {
    .sds-metrics {
      grid-template-columns: 1fr;
    }
  }
`;

export default StudentDashboardSkeleton;