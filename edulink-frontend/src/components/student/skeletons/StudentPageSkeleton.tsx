import React from 'react';

interface StudentPageSkeletonProps {
  isDarkMode?: boolean;
}

const StudentPageSkeleton: React.FC<StudentPageSkeletonProps> = ({
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
        </div>

        <aside className="sps-mini-card">
          <span className="sps-skeleton sps-mini-label" />
          <span className="sps-skeleton sps-mini-number" />
          <span className="sps-skeleton sps-mini-copy" />
        </aside>
      </header>

      <section className="sps-content-card">
        <div className="sps-card-header">
          <div>
            <span className="sps-skeleton sps-card-label" />
            <span className="sps-skeleton sps-card-title" />
          </div>
          <span className="sps-skeleton sps-card-action" />
        </div>

        <div className="sps-empty-body">
          <span className="sps-skeleton sps-empty-icon" />
          <span className="sps-skeleton sps-empty-title" />
          <span className="sps-skeleton sps-empty-pill" />

          <div className="sps-empty-copy">
            <span className="sps-skeleton sps-empty-line" />
            <span className="sps-skeleton sps-empty-line short" />
          </div>

          <span className="sps-skeleton sps-empty-button" />
        </div>
      </section>
    </div>
  );
};

const STYLES = `
  .sp-skeleton-page {
    --surface: #f9f8f6;
    --surface-2: #f2f0ed;
    --surface-3: #e8e5e0;
    --border: #e4e1dc;
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
    width: 210px;
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
    width: min(260px, 70%);
    opacity: 0.72;
    margin-bottom: 18px;
  }

  .sps-sub {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .sps-sub-line {
    width: min(480px, 100%);
    height: 14px;
  }

  .sps-sub-line.short {
    width: min(340px, 82%);
  }

  .sps-mini-card {
    min-width: 190px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 24px 28px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  .sps-mini-label {
    width: 100px;
    height: 11px;
    border-radius: 999px;
  }

  .sps-mini-number {
    width: 72px;
    height: 42px;
    border-radius: 12px;
  }

  .sps-mini-copy {
    width: 130px;
    height: 26px;
  }

  .sps-content-card {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    margin-bottom: 64px;
  }

  .sps-card-header {
    padding: 20px 24px 16px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .sps-card-label {
    width: 112px;
    height: 11px;
    border-radius: 999px;
    margin-bottom: 8px;
  }

  .sps-card-title {
    width: 240px;
    max-width: 100%;
    height: 24px;
    border-radius: 10px;
  }

  .sps-card-action {
    width: 118px;
    height: 34px;
    border-radius: var(--radius);
  }

  .sps-empty-body {
    min-height: 340px;
    padding: 56px 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .sps-empty-icon {
    width: 72px;
    height: 72px;
    border-radius: 22px;
    margin-bottom: 18px;
  }

  .sps-empty-title {
    width: min(320px, 80%);
    height: 30px;
    border-radius: 12px;
    margin-bottom: 12px;
  }

  .sps-empty-pill {
    width: 112px;
    height: 24px;
    border-radius: 999px;
    margin-bottom: 22px;
  }

  .sps-empty-copy {
    width: min(520px, 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 9px;
    margin-bottom: 26px;
  }

  .sps-empty-line {
    width: 100%;
    height: 14px;
  }

  .sps-empty-line.short {
    width: 68%;
  }

  .sps-empty-button {
    width: 170px;
    height: 42px;
    border-radius: var(--radius);
  }

  @media (max-width: 768px) {
    .sps-hero {
      grid-template-columns: 1fr;
    }

    .sps-mini-card {
      align-items: flex-start;
      min-width: 0;
    }

    .sps-card-header {
      align-items: flex-start;
      flex-direction: column;
    }

    .sps-card-action {
      width: 100%;
    }

    .sps-title {
      height: 38px;
    }
  }
`;

export default StudentPageSkeleton;