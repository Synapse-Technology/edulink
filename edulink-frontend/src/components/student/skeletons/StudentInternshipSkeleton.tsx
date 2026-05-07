import React from 'react';

interface StudentInternshipSkeletonProps {
  isDarkMode?: boolean;
}

const StudentInternshipSkeleton: React.FC<StudentInternshipSkeletonProps> = ({
  isDarkMode = false,
}) => {
  return (
    <div className={`si-skeleton-page${isDarkMode ? ' dark-mode' : ''}`}>
      <style>{STYLES}</style>

      <header className="sis-hero">
        <div>
          <span className="sis-skeleton sis-eyebrow" />
          <span className="sis-skeleton sis-title" />
          <span className="sis-skeleton sis-title soft" />

          <div className="sis-sub">
            <span className="sis-skeleton sis-sub-line" />
            <span className="sis-skeleton sis-sub-line short" />
          </div>

          <div className="sis-meta">
            <span className="sis-skeleton sis-meta-item" />
            <span className="sis-skeleton sis-meta-item" />
            <span className="sis-skeleton sis-meta-item wide" />
          </div>
        </div>

        <aside className="sis-status-card">
          <span className="sis-skeleton sis-status-dot" />
          <span className="sis-skeleton sis-status-label-sm" />
          <span className="sis-skeleton sis-status-title" />
          <span className="sis-skeleton sis-status-copy" />
          <span className="sis-skeleton sis-status-btn" />
          <span className="sis-skeleton sis-danger-btn" />
        </aside>
      </header>

      <section className="sis-stats-strip">
        {[1, 2, 3].map((item) => (
          <div className="sis-stat" key={item}>
            <span className="sis-skeleton sis-stat-icon" />
            <div>
              <span className="sis-skeleton sis-stat-num" />
              <span className="sis-skeleton sis-stat-label" />
            </div>
          </div>
        ))}
      </section>

      <div className="sis-layout">
        <main className="sis-main">
          <section className="sis-card">
            <div className="sis-card-header">
              <div>
                <span className="sis-skeleton sis-card-label" />
                <span className="sis-skeleton sis-card-title" />
              </div>
              <span className="sis-skeleton sis-badge" />
            </div>

            <div className="sis-card-body">
              {[1, 2, 3].map((item) => (
                <div className="sis-row" key={item}>
                  <span className="sis-skeleton sis-row-icon" />
                  <div className="sis-row-body">
                    <span className="sis-skeleton sis-row-title" />
                    <span className="sis-skeleton sis-row-sub" />
                  </div>
                  <span className="sis-skeleton sis-row-action" />
                </div>
              ))}
            </div>
          </section>

          <section className="sis-card">
            <div className="sis-card-header">
              <div>
                <span className="sis-skeleton sis-card-label" />
                <span className="sis-skeleton sis-card-title wide" />
              </div>
              <span className="sis-skeleton sis-small-btn" />
            </div>

            <div className="sis-card-body">
              {[1, 2, 3].map((item) => (
                <div className="sis-artifact-row" key={item}>
                  <span className="sis-skeleton sis-artifact-icon" />
                  <div className="sis-row-body">
                    <span className="sis-skeleton sis-row-title" />
                    <span className="sis-skeleton sis-artifact-sub" />
                  </div>
                  <span className="sis-skeleton sis-generate-btn" />
                </div>
              ))}
            </div>
          </section>
        </main>

        <aside className="sis-sidebar">
          <section className="sis-danger-panel">
            <span className="sis-skeleton sis-danger-icon" />
            <span className="sis-skeleton sis-panel-title" />
            <span className="sis-skeleton sis-panel-line" />
            <span className="sis-skeleton sis-panel-line short" />
            <span className="sis-skeleton sis-danger-full-btn" />
          </section>

          <section className="sis-tip">
            <span className="sis-skeleton sis-tip-icon" />
            <span className="sis-skeleton sis-tip-title" />
            <span className="sis-skeleton sis-tip-line" />
            <span className="sis-skeleton sis-tip-line short" />
          </section>
        </aside>
      </div>
    </div>
  );
};

const STYLES = `
  .si-skeleton-page {
    --surface: #f9f8f6;
    --surface-2: #f2f0ed;
    --surface-3: #e8e5e0;
    --border: #e4e1dc;
    --border-2: #d1ccc5;
    --accent-2: #e8eeff;
    --danger-soft: rgba(239,68,68,0.10);
    --radius: 14px;
    --radius-lg: 20px;
    --sk-base: #e8e5e0;
    --sk-mid: #f7f5f1;
    background: var(--surface);
    min-height: 100vh;
  }

  .si-skeleton-page.dark-mode {
    --surface: #141414;
    --surface-2: #1c1c1c;
    --surface-3: #252525;
    --border: #2a2a2a;
    --border-2: #353535;
    --accent-2: #1a2340;
    --danger-soft: rgba(239,68,68,0.12);
    --sk-base: #252525;
    --sk-mid: #343434;
  }

  .sis-skeleton {
    display: block;
    border-radius: 8px;
    background: linear-gradient(90deg, var(--sk-base) 25%, var(--sk-mid) 50%, var(--sk-base) 75%);
    background-size: 220% 100%;
    animation: sis-loading 1.45s infinite ease;
  }

  @keyframes sis-loading {
    0% { background-position: 220% 0; }
    100% { background-position: -220% 0; }
  }

  .sis-hero {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 32px;
    align-items: end;
    padding: 48px 0 32px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 40px;
  }

  .sis-eyebrow { width: 230px; height: 12px; border-radius: 999px; margin-bottom: 12px; }
  .sis-title { width: min(460px, 100%); height: 44px; border-radius: 12px; margin-bottom: 8px; }
  .sis-title.soft { width: min(260px, 70%); opacity: .72; margin-bottom: 18px; }

  .sis-sub { display: flex; flex-direction: column; gap: 9px; margin-bottom: 20px; }
  .sis-sub-line { width: min(520px, 100%); height: 14px; }
  .sis-sub-line.short { width: min(390px, 84%); }

  .sis-meta { display: flex; flex-wrap: wrap; gap: 20px; }
  .sis-meta-item { width: 150px; height: 16px; border-radius: 999px; }
  .sis-meta-item.wide { width: 188px; }

  .sis-status-card {
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

  .sis-status-dot { width: 10px; height: 10px; border-radius: 50%; }
  .sis-status-label-sm { width: 128px; height: 11px; border-radius: 999px; }
  .sis-status-title { width: 92px; height: 27px; border-radius: 10px; }
  .sis-status-copy { width: 148px; height: 28px; }
  .sis-status-btn,
  .sis-danger-btn {
    width: 100%;
    height: 34px;
    border-radius: var(--radius);
  }

  .sis-stats-strip {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 32px;
  }

  .sis-stat {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px 20px;
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .sis-stat-icon { width: 40px; height: 40px; border-radius: 12px; }
  .sis-stat-num { width: 70px; height: 32px; border-radius: 10px; margin-bottom: 8px; }
  .sis-stat-label { width: 150px; height: 12px; }

  .sis-layout {
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 24px;
    margin-bottom: 64px;
    align-items: start;
  }

  .sis-main,
  .sis-sidebar {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .sis-card {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .sis-card-header {
    padding: 20px 24px 16px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .sis-card-body { padding: 20px 24px; }

  .sis-card-label { width: 86px; height: 11px; border-radius: 999px; margin-bottom: 8px; }
  .sis-card-title { width: 210px; height: 24px; border-radius: 10px; }
  .sis-card-title.wide { width: 280px; max-width: 100%; }
  .sis-badge { width: 86px; height: 22px; border-radius: 8px; }
  .sis-small-btn { width: 106px; height: 32px; border-radius: var(--radius); }

  .sis-row,
  .sis-artifact-row {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 0;
    border-bottom: 1px solid var(--border);
  }

  .sis-artifact-row { padding: 16px 0; }
  .sis-row:first-child,
  .sis-artifact-row:first-child { padding-top: 0; }
  .sis-row:last-child,
  .sis-artifact-row:last-child { border-bottom: none; padding-bottom: 0; }

  .sis-row-icon { width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; }
  .sis-artifact-icon { width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0; }
  .sis-row-body { flex: 1; min-width: 0; }
  .sis-row-title { width: 190px; max-width: 100%; height: 14px; margin-bottom: 8px; }
  .sis-row-sub { width: 310px; max-width: 100%; height: 12px; }
  .sis-artifact-sub { width: 420px; max-width: 100%; height: 12px; }
  .sis-row-action { width: 78px; height: 32px; border-radius: var(--radius); }
  .sis-generate-btn { width: 96px; height: 32px; border-radius: var(--radius); }

  .sis-danger-panel {
    background: var(--danger-soft);
    border: 1px solid rgba(239,68,68,0.18);
    border-radius: var(--radius-lg);
    padding: 20px;
  }

  .sis-tip {
    background: linear-gradient(135deg, var(--accent-2), var(--surface-2));
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 18px 20px;
  }

  .sis-danger-icon,
  .sis-tip-icon {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    margin-bottom: 12px;
  }

  .sis-panel-title,
  .sis-tip-title {
    width: 180px;
    height: 14px;
    margin-bottom: 10px;
  }

  .sis-panel-line,
  .sis-tip-line {
    width: 100%;
    height: 12px;
    margin-bottom: 8px;
  }

  .sis-panel-line.short,
  .sis-tip-line.short {
    width: 74%;
  }

  .sis-danger-full-btn {
    width: 100%;
    height: 38px;
    border-radius: var(--radius);
    margin-top: 8px;
  }

  @media (max-width: 1100px) {
    .sis-layout { grid-template-columns: 1fr; }
    .sis-stats-strip { grid-template-columns: 1fr 1fr; }
  }

  @media (max-width: 768px) {
    .sis-hero { grid-template-columns: 1fr; }
    .sis-status-card { align-items: flex-start; min-width: 0; }
    .sis-stats-strip { grid-template-columns: 1fr; }
    .sis-row,
    .sis-artifact-row { align-items: flex-start; }
  }
`;

export default StudentInternshipSkeleton;