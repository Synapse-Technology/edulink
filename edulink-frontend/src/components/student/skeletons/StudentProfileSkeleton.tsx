import React from 'react';

interface StudentProfileSkeletonProps {
  isDarkMode?: boolean;
}

const StudentProfileSkeleton: React.FC<StudentProfileSkeletonProps> = ({
  isDarkMode = false,
}) => {
  return (
    <div className={`sp-skeleton-page${isDarkMode ? ' dark-mode' : ''}`}>
      <style>{STYLES}</style>

      <header className="sps-hero">
        <div>
          <span className="sps-skeleton sps-eyebrow" />
          <span className="sps-skeleton sps-title" />
          <span className="sps-skeleton sps-title soft" />

          <div className="sps-sub">
            <span className="sps-skeleton sps-sub-line" />
            <span className="sps-skeleton sps-sub-line short" />
          </div>

          <div className="sps-meta">
            <span className="sps-skeleton sps-meta-item" />
            <span className="sps-skeleton sps-meta-item wide" />
            <span className="sps-skeleton sps-meta-item" />
          </div>

          <div className="sps-actions">
            <span className="sps-skeleton sps-primary-btn" />
            <span className="sps-skeleton sps-ghost-btn" />
          </div>
        </div>

        <aside className="sps-passport">
          <span className="sps-skeleton sps-passport-label" />
          <span className="sps-skeleton sps-avatar" />
          <span className="sps-skeleton sps-ring" />
          <span className="sps-skeleton sps-score" />
          <span className="sps-skeleton sps-passport-copy" />
          <span className="sps-skeleton sps-trust-badge" />
        </aside>
      </header>

      <section className="sps-checks-section">
        <div className="sps-section-head">
          <span className="sps-skeleton sps-section-eyebrow" />
          <span className="sps-skeleton sps-section-title" />
          <span className="sps-skeleton sps-section-sub" />
        </div>

        <div className="sps-check-grid">
          {[1, 2, 3, 4].map((item) => (
            <div className="sps-check" key={item}>
              <span className="sps-skeleton sps-check-icon" />
              <span className="sps-skeleton sps-check-title" />
              <span className="sps-skeleton sps-check-desc" />
              <span className="sps-skeleton sps-check-desc short" />
            </div>
          ))}
        </div>
      </section>

      <div className="sps-flow">
        <main className="sps-main">
          <section className="sps-card">
            <div className="sps-card-header">
              <div>
                <span className="sps-skeleton sps-card-label" />
                <span className="sps-skeleton sps-card-title" />
              </div>
              <span className="sps-skeleton sps-small-btn" />
            </div>

            <div className="sps-card-body">
              {[1, 2, 3].map((item) => (
                <div className="sps-doc-row" key={item}>
                  <span className="sps-doc-accent" />
                  <span className="sps-skeleton sps-doc-icon" />
                  <div className="sps-doc-copy">
                    <span className="sps-skeleton sps-doc-title" />
                    <span className="sps-skeleton sps-doc-desc" />
                  </div>
                  <div className="sps-doc-actions">
                    <span className="sps-skeleton sps-doc-badge" />
                    <span className="sps-skeleton sps-doc-btn" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="sps-card">
            <div className="sps-card-header">
              <div>
                <span className="sps-skeleton sps-card-label" />
                <span className="sps-skeleton sps-card-title small" />
              </div>
              <span className="sps-skeleton sps-small-btn" />
            </div>

            <div className="sps-card-body">
              <div className="sps-skills-wrap">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <span className="sps-skeleton sps-skill-pill" key={item} />
                ))}
              </div>
            </div>
          </section>
        </main>

        <aside className="sps-sidebar">
          <section className="sps-card">
            <div className="sps-card-header">
              <span className="sps-skeleton sps-side-heading" />
              <span className="sps-skeleton sps-side-icon" />
            </div>

            <div className="sps-card-body compact">
              {[1, 2, 3].map((item) => (
                <div className="sps-record-item" key={item}>
                  <div>
                    <span className="sps-skeleton sps-record-label" />
                    <span className="sps-skeleton sps-record-value" />
                  </div>
                  <span className="sps-skeleton sps-record-icon" />
                </div>
              ))}
            </div>
          </section>

          <section className="sps-tip">
            <span className="sps-skeleton sps-tip-icon" />
            <span className="sps-skeleton sps-tip-title" />
            <span className="sps-skeleton sps-tip-line" />
            <span className="sps-skeleton sps-tip-line short" />
          </section>
        </aside>
      </div>
    </div>
  );
};

const STYLES = `
  .sp-skeleton-page {
    --surface: #f9f8f6;
    --surface-2: #f2f0ed;
    --surface-3: #e8e5e0;
    --border: #e4e1dc;
    --border-2: #d1ccc5;
    --accent-2: #e8eeff;
    --radius: 14px;
    --radius-lg: 20px;
    --sk-base: #e8e5e0;
    --sk-mid: #f7f5f1;

    background: var(--surface);
    min-height: 100vh;
  }

  .sp-skeleton-page.dark-mode {
    --surface: #141414;
    --surface-2: #1c1c1c;
    --surface-3: #252525;
    --border: #2a2a2a;
    --border-2: #353535;
    --accent-2: #1a2340;
    --sk-base: #252525;
    --sk-mid: #343434;
  }

  .sps-skeleton {
    display: block;
    border-radius: 8px;
    background: linear-gradient(
      90deg,
      var(--sk-base) 25%,
      var(--sk-mid) 50%,
      var(--sk-base) 75%
    );
    background-size: 220% 100%;
    animation: sps-loading 1.45s infinite ease;
  }

  @keyframes sps-loading {
    0% { background-position: 220% 0; }
    100% { background-position: -220% 0; }
  }

  .sps-hero {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 32px;
    align-items: end;
    padding: 48px 0 32px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 40px;
  }

  .sps-eyebrow {
    width: 220px;
    height: 12px;
    border-radius: 999px;
    margin-bottom: 12px;
  }

  .sps-title {
    width: min(430px, 100%);
    height: 44px;
    border-radius: 12px;
    margin-bottom: 8px;
  }

  .sps-title.soft {
    width: min(280px, 70%);
    opacity: 0.72;
    margin-bottom: 18px;
  }

  .sps-sub {
    display: flex;
    flex-direction: column;
    gap: 9px;
    margin-bottom: 20px;
  }

  .sps-sub-line {
    width: min(460px, 100%);
    height: 14px;
  }

  .sps-sub-line.short {
    width: min(360px, 82%);
  }

  .sps-meta,
  .sps-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 16px;
  }

  .sps-meta {
    margin-bottom: 20px;
  }

  .sps-meta-item {
    width: 132px;
    height: 16px;
    border-radius: 999px;
  }

  .sps-meta-item.wide {
    width: 190px;
  }

  .sps-primary-btn,
  .sps-ghost-btn {
    height: 40px;
    border-radius: var(--radius);
  }

  .sps-primary-btn { width: 132px; }
  .sps-ghost-btn { width: 164px; }

  .sps-passport {
    min-width: 200px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .sps-passport-label {
    width: 132px;
    height: 11px;
    border-radius: 999px;
  }

  .sps-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
  }

  .sps-ring {
    width: 52px;
    height: 52px;
    border-radius: 50%;
  }

  .sps-score {
    width: 78px;
    height: 38px;
    border-radius: 12px;
  }

  .sps-passport-copy {
    width: 136px;
    height: 26px;
  }

  .sps-trust-badge {
    width: 92px;
    height: 24px;
    border-radius: 999px;
  }

  .sps-checks-section {
    margin-bottom: 40px;
  }

  .sps-section-head {
    margin-bottom: 20px;
  }

  .sps-section-eyebrow {
    width: 136px;
    height: 11px;
    border-radius: 999px;
    margin-bottom: 8px;
  }

  .sps-section-title {
    width: min(520px, 100%);
    height: 32px;
    border-radius: 12px;
    margin-bottom: 10px;
  }

  .sps-section-sub {
    width: min(390px, 82%);
    height: 13px;
  }

  .sps-check-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }

  .sps-check {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .sps-check-icon {
    width: 30px;
    height: 30px;
    border-radius: 9px;
  }

  .sps-check-title {
    width: 138px;
    max-width: 100%;
    height: 14px;
  }

  .sps-check-desc {
    width: 100%;
    height: 12px;
  }

  .sps-check-desc.short {
    width: 74%;
  }

  .sps-flow {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 24px;
    margin-bottom: 64px;
  }

  .sps-main,
  .sps-sidebar {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .sps-card {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .sps-card-header {
    padding: 20px 24px 16px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .sps-card-body {
    padding: 20px 24px;
  }

  .sps-card-body.compact {
    padding-top: 8px;
    padding-bottom: 8px;
  }

  .sps-card-label {
    width: 112px;
    height: 11px;
    border-radius: 999px;
    margin-bottom: 8px;
  }

  .sps-card-title {
    width: 220px;
    height: 24px;
    border-radius: 10px;
  }

  .sps-card-title.small {
    width: 136px;
  }

  .sps-small-btn {
    width: 104px;
    height: 32px;
    border-radius: var(--radius);
  }

  .sps-doc-row {
    position: relative;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    margin-bottom: 10px;
    overflow: hidden;
  }

  .sps-doc-row:last-child {
    margin-bottom: 0;
  }

  .sps-doc-accent {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: var(--border-2);
  }

  .sps-doc-icon {
    width: 36px;
    height: 36px;
    border-radius: 11px;
  }

  .sps-doc-copy {
    min-width: 0;
  }

  .sps-doc-title {
    width: 150px;
    height: 14px;
    margin-bottom: 8px;
  }

  .sps-doc-desc {
    width: min(380px, 100%);
    height: 12px;
  }

  .sps-doc-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .sps-doc-badge {
    width: 84px;
    height: 22px;
    border-radius: 8px;
  }

  .sps-doc-btn {
    width: 86px;
    height: 32px;
    border-radius: var(--radius);
  }

  .sps-skills-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .sps-skill-pill {
    width: 82px;
    height: 28px;
    border-radius: 999px;
  }

  .sps-skill-pill:nth-child(2) { width: 112px; }
  .sps-skill-pill:nth-child(4) { width: 96px; }
  .sps-skill-pill:nth-child(6) { width: 126px; }

  .sps-side-heading {
    width: 140px;
    height: 13px;
    border-radius: 999px;
  }

  .sps-side-icon {
    width: 16px;
    height: 16px;
    border-radius: 6px;
  }

  .sps-record-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 13px 0;
    border-bottom: 1px solid var(--border);
  }

  .sps-record-item:first-child {
    padding-top: 0;
  }

  .sps-record-item:last-child {
    padding-bottom: 0;
    border-bottom: none;
  }

  .sps-record-label {
    width: 118px;
    height: 11px;
    border-radius: 999px;
    margin-bottom: 8px;
  }

  .sps-record-value {
    width: 160px;
    max-width: 100%;
    height: 16px;
  }

  .sps-record-icon {
    width: 30px;
    height: 30px;
    border-radius: 9px;
    flex-shrink: 0;
  }

  .sps-tip {
    background: linear-gradient(135deg, var(--accent-2), var(--surface-2));
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 18px 20px;
  }

  .sps-tip-icon {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    margin-bottom: 12px;
  }

  .sps-tip-title {
    width: 220px;
    max-width: 100%;
    height: 14px;
    margin-bottom: 10px;
  }

  .sps-tip-line {
    width: 100%;
    height: 12px;
    margin-bottom: 8px;
  }

  .sps-tip-line.short {
    width: 74%;
    margin-bottom: 0;
  }

  @media (max-width: 1100px) {
    .sps-flow {
      grid-template-columns: 1fr;
    }

    .sps-check-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 768px) {
    .sps-hero {
      grid-template-columns: 1fr;
    }

    .sps-passport {
      align-items: flex-start;
      min-width: 0;
    }

    .sps-check-grid {
      grid-template-columns: 1fr;
    }

    .sps-card-header {
      align-items: flex-start;
      flex-direction: column;
    }

    .sps-small-btn {
      width: 100%;
    }

    .sps-doc-row {
      grid-template-columns: auto 1fr;
    }

    .sps-doc-actions {
      grid-column: 1 / -1;
      padding-left: 50px;
    }
  }
`;

export default StudentProfileSkeleton;