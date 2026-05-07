import React from 'react';

interface StudentAffiliationSkeletonProps {
  isDarkMode?: boolean;
}

const StudentAffiliationSkeleton: React.FC<StudentAffiliationSkeletonProps> = ({
  isDarkMode = false,
}) => {
  return (
    <div className={`sa-skeleton-page${isDarkMode ? ' dark-mode' : ''}`}>
      <style>{STYLES}</style>

      {/* Hero */}
      <header className="sas-hero">
        <div>
          <div className="sas-eyebrow">
            <span className="sas-dot" />
            <span className="sas-skeleton sas-eyebrow-line" />
          </div>

          <span className="sas-skeleton sas-title" />
          <span className="sas-skeleton sas-title soft" />

          <div className="sas-sub-wrap">
            <span className="sas-skeleton sas-sub-line" />
            <span className="sas-skeleton sas-sub-line short" />
          </div>

          <div className="sas-meta">
            <span className="sas-skeleton sas-meta-pill" />
            <span className="sas-skeleton sas-meta-pill wide" />
            <span className="sas-skeleton sas-meta-pill" />
          </div>
        </div>

        <aside className="sas-hero-card">
          <span className="sas-skeleton sas-card-label" />
          <span className="sas-skeleton sas-claim-num" />
          <span className="sas-skeleton sas-card-copy" />
          <span className="sas-skeleton sas-card-copy short" />
        </aside>
      </header>

      {/* Body */}
      <div className="sas-layout">
        <main className="sas-main">
          <section className="sas-card">
            <div className="sas-card-header">
              <div>
                <span className="sas-skeleton sas-header-label" />
                <span className="sas-skeleton sas-header-title" />
              </div>
              <span className="sas-skeleton sas-header-icon" />
            </div>

            <div className="sas-card-body">
              <div className="sas-search">
                <span className="sas-search-icon" />
                <span className="sas-skeleton sas-search-input" />
              </div>

              <div className="sas-hint">
                <span className="sas-skeleton sas-hint-icon" />
                <span className="sas-skeleton sas-hint-line" />
              </div>

              <div className="sas-dropdown-preview">
                {[1, 2, 3].map((item) => (
                  <div className="sas-dropdown-row" key={item}>
                    <span className="sas-skeleton sas-inst-icon" />
                    <div className="sas-inst-copy">
                      <span className="sas-skeleton sas-inst-name" />
                      <span className="sas-skeleton sas-inst-domain" />
                    </div>
                    <span className="sas-skeleton sas-check" />
                  </div>
                ))}
              </div>

              <span className="sas-skeleton sas-submit-btn" />
            </div>
          </section>
        </main>

        <aside className="sas-sidebar">
          <section className="sas-card">
            <div className="sas-card-header">
              <div>
                <span className="sas-skeleton sas-header-label" />
                <span className="sas-skeleton sas-side-title" />
              </div>
            </div>

            <div className="sas-card-body">
              <div className="sas-steps">
                {[1, 2, 3].map((item) => (
                  <div className="sas-step" key={item}>
                    <span className="sas-skeleton sas-step-num" />
                    <div className="sas-step-copy">
                      <span className="sas-skeleton sas-step-title" />
                      <span className="sas-skeleton sas-step-sub" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="sas-tip">
            <span className="sas-skeleton sas-tip-icon" />
            <span className="sas-skeleton sas-tip-title" />
            <span className="sas-skeleton sas-tip-line" />
            <span className="sas-skeleton sas-tip-line short" />
          </section>
        </aside>
      </div>
    </div>
  );
};

const STYLES = `
  .sa-skeleton-page {
    --ink: #0d0f12;
    --ink-3: #6b7280;
    --ink-4: #9ca3af;
    --surface: #f9f8f6;
    --surface-2: #f2f0ed;
    --surface-3: #e8e5e0;
    --border: #e4e1dc;
    --border-2: #d1ccc5;
    --accent: #1a5cff;
    --accent-soft: rgba(26,92,255,0.08);
    --radius-sm: 8px;
    --radius: 14px;
    --radius-lg: 20px;
    --shadow: 0 4px 16px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04);
    --font-display: 'Instrument Serif', Georgia, serif;
    --font-body: 'DM Sans', -apple-system, sans-serif;
    --sk-base: #e8e5e0;
    --sk-mid: #f6f4f0;

    font-family: var(--font-body);
    color: var(--ink);
    background: var(--surface);
    min-height: 100vh;
  }

  .sa-skeleton-page.dark-mode {
    --ink: #f0ede8;
    --ink-3: #8a8580;
    --ink-4: #5a5650;
    --surface: #141414;
    --surface-2: #1c1c1c;
    --surface-3: #252525;
    --border: #2a2a2a;
    --border-2: #353535;
    --accent: #4d7fff;
    --accent-soft: rgba(77,127,255,0.10);
    --shadow: 0 4px 16px rgba(0,0,0,0.30);
    --sk-base: #252525;
    --sk-mid: #343434;
  }

  .sas-skeleton {
    display: block;
    border-radius: 8px;
    background: linear-gradient(
      90deg,
      var(--sk-base) 25%,
      var(--sk-mid) 50%,
      var(--sk-base) 75%
    );
    background-size: 220% 100%;
    animation: sas-loading 1.45s infinite ease;
  }

  @keyframes sas-loading {
    0% { background-position: 220% 0; }
    100% { background-position: -220% 0; }
  }

  .sas-hero {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 32px;
    align-items: end;
    padding: 48px 0 32px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 40px;
  }

  .sas-eyebrow {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .sas-dot {
    width: 12px;
    height: 12px;
    border-radius: 999px;
    background: var(--accent-soft);
    border: 1px solid rgba(26,92,255,0.18);
  }

  .sas-eyebrow-line {
    width: 190px;
    height: 12px;
    border-radius: 999px;
  }

  .sas-title {
    width: min(420px, 100%);
    height: 44px;
    border-radius: 12px;
    margin-bottom: 8px;
  }

  .sas-title.soft {
    width: min(250px, 70%);
    opacity: 0.72;
    margin-bottom: 18px;
  }

  .sas-sub-wrap {
    display: flex;
    flex-direction: column;
    gap: 9px;
    margin-bottom: 20px;
  }

  .sas-sub-line {
    width: min(520px, 100%);
    height: 14px;
  }

  .sas-sub-line.short {
    width: min(390px, 85%);
  }

  .sas-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
  }

  .sas-meta-pill {
    width: 132px;
    height: 16px;
    border-radius: 999px;
  }

  .sas-meta-pill.wide {
    width: 166px;
  }

  .sas-hero-card {
    min-width: 175px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 24px 28px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 9px;
  }

  .sas-card-label {
    width: 72px;
    height: 11px;
    border-radius: 999px;
  }

  .sas-claim-num {
    width: 54px;
    height: 42px;
    border-radius: 12px;
  }

  .sas-card-copy {
    width: 128px;
    height: 12px;
  }

  .sas-card-copy.short {
    width: 92px;
  }

  .sas-layout {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 24px;
    margin-bottom: 64px;
    align-items: start;
  }

  .sas-main,
  .sas-sidebar {
    min-width: 0;
  }

  .sas-sidebar {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .sas-card {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .sas-card-header {
    padding: 20px 24px 16px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .sas-card-body {
    padding: 20px 24px;
  }

  .sas-header-label {
    width: 92px;
    height: 11px;
    border-radius: 999px;
    margin-bottom: 8px;
  }

  .sas-header-title {
    width: 210px;
    height: 24px;
    border-radius: 10px;
  }

  .sas-side-title {
    width: 170px;
    height: 22px;
    border-radius: 10px;
  }

  .sas-header-icon {
    width: 22px;
    height: 22px;
    border-radius: 8px;
  }

  .sas-search {
    position: relative;
    margin-bottom: 12px;
  }

  .sas-search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    width: 16px;
    height: 16px;
    border-radius: 999px;
    background: var(--border-2);
    transform: translateY(-50%);
    z-index: 2;
  }

  .sas-search-input {
    width: 100%;
    height: 46px;
    border-radius: var(--radius);
    background-color: var(--surface-3);
  }

  .sas-hint {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--accent-soft);
    border: 1px solid rgba(26,92,255,0.12);
    border-radius: var(--radius-sm);
    padding: 10px 14px;
    margin-top: 8px;
    margin-bottom: 16px;
  }

  .sas-hint-icon {
    width: 14px;
    height: 14px;
    border-radius: 999px;
  }

  .sas-hint-line {
    width: min(330px, 100%);
    height: 13px;
  }

  .sas-dropdown-preview {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    margin-top: 4px;
    margin-bottom: 16px;
  }

  .sas-dropdown-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
  }

  .sas-dropdown-row:last-child {
    border-bottom: none;
  }

  .sas-inst-icon {
    width: 32px;
    height: 32px;
    border-radius: 10px;
  }

  .sas-inst-copy {
    flex: 1;
    min-width: 0;
  }

  .sas-inst-name {
    width: min(240px, 80%);
    height: 13px;
    margin-bottom: 7px;
  }

  .sas-inst-domain {
    width: 120px;
    height: 11px;
  }

  .sas-check {
    width: 14px;
    height: 14px;
    border-radius: 999px;
  }

  .sas-submit-btn {
    width: 100%;
    height: 40px;
    border-radius: var(--radius);
  }

  .sas-steps {
    display: flex;
    flex-direction: column;
  }

  .sas-step {
    display: flex;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid var(--border);
  }

  .sas-step:first-child {
    padding-top: 0;
  }

  .sas-step:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .sas-step-num {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .sas-step-copy {
    flex: 1;
    min-width: 0;
  }

  .sas-step-title {
    width: 118px;
    height: 13px;
    margin-bottom: 8px;
  }

  .sas-step-sub {
    width: 210px;
    max-width: 100%;
    height: 12px;
  }

  .sas-tip {
    background: linear-gradient(135deg, var(--accent-soft), var(--surface-2));
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 18px 20px;
  }

  .sas-tip-icon {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    margin-bottom: 12px;
  }

  .sas-tip-title {
    width: 160px;
    height: 14px;
    margin-bottom: 10px;
  }

  .sas-tip-line {
    width: 100%;
    height: 12px;
    margin-bottom: 8px;
  }

  .sas-tip-line.short {
    width: 72%;
    margin-bottom: 0;
  }

  @media (max-width: 1100px) {
    .sas-layout {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 768px) {
    .sas-hero {
      grid-template-columns: 1fr;
      gap: 24px;
    }

    .sas-hero-card {
      align-items: flex-start;
      min-width: 0;
      width: 100%;
    }

    .sas-title {
      height: 38px;
    }

    .sas-meta {
      gap: 12px;
    }

    .sas-meta-pill,
    .sas-meta-pill.wide {
      width: 100%;
      max-width: 240px;
    }

    .sas-card-header {
      padding: 18px 20px 14px;
    }

    .sas-card-body {
      padding: 18px 20px;
    }
  }
`;

export default StudentAffiliationSkeleton;