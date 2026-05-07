import React from 'react';
import { AlertTriangle, Compass, ShieldAlert, Sparkles } from 'lucide-react';

interface ErrorHeroProps {
  errorCode: string;
  title: string;
  description: string;
}

const STYLES = `
  .erh-hero {
    --erh-ink: #0d0f12;
    --erh-ink-2: #3a3d44;
    --erh-ink-3: #6b7280;
    --erh-ink-4: #9ca3af;
    --erh-surface: #f9f8f6;
    --erh-surface-2: #f2f0ed;
    --erh-surface-3: #e8e5e0;
    --erh-border: #e4e1dc;
    --erh-accent: #1a5cff;
    --erh-accent-soft: rgba(26,92,255,0.08);
    --erh-danger: #ef4444;
    --erh-danger-soft: rgba(239,68,68,0.10);
    --erh-warning: #f59e0b;
    --erh-warning-soft: rgba(245,158,11,0.12);
    --erh-radius: 28px;
    --erh-shadow: 0 24px 80px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.06);

    position: relative;
    min-height: 70vh;
    display: flex;
    align-items: center;
    overflow: hidden;
    padding: 80px 20px;
    background:
      radial-gradient(circle at 15% 18%, var(--erh-danger-soft), transparent 28%),
      radial-gradient(circle at 82% 22%, var(--erh-accent-soft), transparent 30%),
      linear-gradient(135deg, var(--erh-surface), var(--erh-surface-2));
    color: var(--erh-ink);
  }

  .dark-mode .erh-hero {
    --erh-ink: #f0ede8;
    --erh-ink-2: #c9c4bc;
    --erh-ink-3: #8a8580;
    --erh-ink-4: #5a5650;
    --erh-surface: #141414;
    --erh-surface-2: #1c1c1c;
    --erh-surface-3: #252525;
    --erh-border: #2a2a2a;
    --erh-accent: #4d7fff;
    --erh-accent-soft: rgba(77,127,255,0.10);
    --erh-danger-soft: rgba(239,68,68,0.12);
    --erh-warning-soft: rgba(245,158,11,0.13);
    --erh-shadow: 0 24px 80px rgba(0,0,0,0.42), 0 8px 24px rgba(0,0,0,0.28);
  }

  .erh-hero::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(var(--erh-border) 1px, transparent 1px),
      linear-gradient(90deg, var(--erh-border) 1px, transparent 1px);
    background-size: 56px 56px;
    opacity: 0.28;
    mask-image: radial-gradient(circle at center, black, transparent 72%);
    pointer-events: none;
  }

  .erh-orb {
    position: absolute;
    border-radius: 999px;
    filter: blur(2px);
    opacity: 0.5;
    animation: erh-float 16s ease-in-out infinite;
    pointer-events: none;
  }

  .erh-orb.one {
    width: 220px;
    height: 220px;
    left: -70px;
    bottom: 10%;
    background: var(--erh-accent-soft);
  }

  .erh-orb.two {
    width: 180px;
    height: 180px;
    right: -60px;
    top: 18%;
    background: var(--erh-danger-soft);
    animation-delay: -5s;
  }

  @keyframes erh-float {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-22px) rotate(8deg); }
  }

  .erh-container {
    position: relative;
    z-index: 2;
    width: min(980px, 100%);
    margin: 0 auto;
  }

  .erh-card {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 220px;
    gap: 36px;
    align-items: center;
    background: color-mix(in srgb, var(--erh-surface-2), transparent 8%);
    border: 1px solid var(--erh-border);
    border-radius: var(--erh-radius);
    padding: clamp(28px, 5vw, 52px);
    box-shadow: var(--erh-shadow);
    backdrop-filter: blur(14px);
    animation: erh-in 0.36s ease both;
  }

  @keyframes erh-in {
    from { opacity: 0; transform: translateY(16px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .erh-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border-radius: 999px;
    padding: 8px 12px;
    background: var(--erh-danger-soft);
    color: var(--erh-danger);
    border: 1px solid rgba(239,68,68,0.18);
    font-size: 11px;
    font-weight: 850;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    margin-bottom: 18px;
  }

  .erh-code {
    margin: 0 0 12px;
    font-size: clamp(5rem, 15vw, 11rem);
    font-weight: 900;
    line-height: 0.86;
    letter-spacing: -0.08em;
    color: var(--erh-ink);
  }

  .erh-code span {
    background: linear-gradient(135deg, var(--erh-ink), var(--erh-accent));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  .erh-title {
    margin: 0 0 14px;
    color: var(--erh-ink);
    font-size: clamp(1.8rem, 4vw, 3rem);
    font-weight: 850;
    line-height: 1.08;
    letter-spacing: -0.04em;
  }

  .erh-description {
    margin: 0;
    max-width: 640px;
    color: var(--erh-ink-3);
    font-size: clamp(1rem, 2vw, 1.16rem);
    line-height: 1.75;
  }

  .erh-visual {
    position: relative;
    min-height: 250px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .erh-compass {
    position: relative;
    width: 190px;
    height: 190px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background:
      radial-gradient(circle, var(--erh-surface) 0 36%, transparent 37%),
      conic-gradient(from 160deg, var(--erh-accent-soft), var(--erh-danger-soft), var(--erh-warning-soft), var(--erh-accent-soft));
    border: 1px solid var(--erh-border);
    box-shadow: inset 0 0 0 14px color-mix(in srgb, var(--erh-surface-2), transparent 25%);
  }

  .erh-compass::before,
  .erh-compass::after {
    content: '';
    position: absolute;
    border-radius: 999px;
    border: 1px solid var(--erh-border);
  }

  .erh-compass::before {
    inset: 22px;
  }

  .erh-compass::after {
    inset: -18px;
    opacity: 0.55;
  }

  .erh-compass-icon {
    position: relative;
    z-index: 2;
    width: 74px;
    height: 74px;
    border-radius: 24px;
    background: var(--erh-accent);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 16px 38px rgba(26,92,255,0.24);
    animation: erh-tilt 4.8s ease-in-out infinite;
  }

  @keyframes erh-tilt {
    0%, 100% { transform: rotate(-4deg); }
    50% { transform: rotate(6deg); }
  }

  .erh-chip {
    position: absolute;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 999px;
    padding: 8px 11px;
    background: var(--erh-surface);
    border: 1px solid var(--erh-border);
    color: var(--erh-ink-3);
    font-size: 11px;
    font-weight: 800;
    box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  }

  .erh-chip.top {
    top: 12px;
    right: 8px;
  }

  .erh-chip.bottom {
    bottom: 16px;
    left: 6px;
  }

  @media (max-width: 860px) {
    .erh-card {
      grid-template-columns: 1fr;
    }

    .erh-visual {
      min-height: 180px;
      order: -1;
    }

    .erh-compass {
      width: 150px;
      height: 150px;
    }

    .erh-compass-icon {
      width: 62px;
      height: 62px;
      border-radius: 20px;
    }
  }

  @media (max-width: 540px) {
    .erh-hero {
      min-height: 64vh;
      padding: 48px 14px;
    }

    .erh-card {
      border-radius: 22px;
    }

    .erh-chip {
      display: none;
    }
  }
`;

const ErrorHero: React.FC<ErrorHeroProps> = ({
  errorCode,
  title,
  description,
}) => {
  return (
    <>
      <style>{STYLES}</style>
      <section className="erh-hero page-title">
        <div className="erh-orb one" />
        <div className="erh-orb two" />

        <div className="erh-container" data-aos="fade-up">
          <div className="erh-card">
            <div>
              <div className="erh-eyebrow" data-aos="fade-up" data-aos-delay="100">
                <AlertTriangle size={13} />
                {errorCode} error
              </div>

              <h1 className="erh-code" data-aos="fade-up" data-aos-delay="200">
                <span>{errorCode}</span>
              </h1>

              <h2 className="erh-title" data-aos="fade-up" data-aos-delay="300">
                {title}
              </h2>

              <p className="erh-description" data-aos="fade-up" data-aos-delay="400">
                {description}
              </p>
            </div>

            <div className="erh-visual" aria-hidden="true">
              <div className="erh-chip top">
                <Sparkles size={12} />
                Recovery route
              </div>
              <div className="erh-compass">
                <div className="erh-compass-icon">
                  <Compass size={34} />
                </div>
              </div>
              <div className="erh-chip bottom">
                <ShieldAlert size={12} />
                Safe fallback
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default ErrorHero;
