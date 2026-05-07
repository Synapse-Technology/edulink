import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';

interface ErrorCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  link: string;
  linkText: string;
  delay?: number;
}

const STYLES = `
  .erc-card {
    --erc-ink: #0d0f12;
    --erc-ink-2: #3a3d44;
    --erc-ink-3: #6b7280;
    --erc-ink-4: #9ca3af;
    --erc-surface: #f9f8f6;
    --erc-surface-2: #f2f0ed;
    --erc-surface-3: #e8e5e0;
    --erc-border: #e4e1dc;
    --erc-border-2: #d1ccc5;
    --erc-accent: #1a5cff;
    --erc-accent-soft: rgba(26,92,255,0.08);
    --erc-radius: 20px;
    --erc-radius-sm: 14px;
    --erc-shadow: 0 4px 16px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04);

    height: 100%;
    min-height: 280px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 22px;
    padding: 24px;
    background: var(--erc-surface-2);
    border: 1px solid var(--erc-border);
    border-radius: var(--erc-radius);
    color: var(--erc-ink);
    overflow: hidden;
    position: relative;
    transition: transform 0.18s ease, box-shadow 0.2s ease, border-color 0.18s ease;
  }

  .dark-mode .erc-card {
    --erc-ink: #f0ede8;
    --erc-ink-2: #c9c4bc;
    --erc-ink-3: #8a8580;
    --erc-ink-4: #5a5650;
    --erc-surface: #141414;
    --erc-surface-2: #1c1c1c;
    --erc-surface-3: #252525;
    --erc-border: #2a2a2a;
    --erc-border-2: #353535;
    --erc-accent: #4d7fff;
    --erc-accent-soft: rgba(77,127,255,0.10);
    --erc-shadow: 0 4px 16px rgba(0,0,0,0.30);
  }

  .erc-card::before {
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: 4px;
    background: linear-gradient(90deg, var(--erc-accent), transparent);
    opacity: 0.85;
  }

  .erc-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--erc-shadow);
    border-color: var(--erc-border-2);
  }

  .erc-main {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
  }

  .erc-icon {
    width: 58px;
    height: 58px;
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--erc-accent-soft);
    color: var(--erc-accent);
    border: 1px solid rgba(26,92,255,0.14);
  }

  .dark-mode .erc-icon {
    border-color: rgba(77,127,255,0.18);
  }

  .erc-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.11em;
    text-transform: uppercase;
    color: var(--erc-accent);
    margin-bottom: -4px;
  }

  .erc-title {
    margin: 0;
    color: var(--erc-ink);
    font-size: 18px;
    font-weight: 850;
    line-height: 1.25;
  }

  .erc-description {
    margin: 0;
    color: var(--erc-ink-3);
    font-size: 13px;
    line-height: 1.65;
  }

  .erc-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    width: fit-content;
    min-height: 38px;
    padding: 9px 14px;
    border-radius: 13px;
    background: var(--erc-accent);
    color: #fff;
    font-size: 13px;
    font-weight: 750;
    text-decoration: none;
    box-shadow: 0 1px 3px rgba(26,92,255,0.22);
    transition: transform 0.14s ease, box-shadow 0.16s ease;
  }

  .erc-link:hover {
    color: #fff;
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(26,92,255,0.28);
  }

  .erc-link:active {
    transform: scale(0.98);
  }

  @media (max-width: 520px) {
    .erc-card {
      min-height: 240px;
      padding: 22px;
    }

    .erc-link {
      width: 100%;
    }
  }
`;

const ErrorCard: React.FC<ErrorCardProps> = ({
  icon,
  title,
  description,
  link,
  linkText,
  delay = 0,
}) => {
  return (
    <>
      <style>{STYLES}</style>
      <article
        className="erc-card"
        data-aos="fade-up"
        data-aos-delay={delay}
      >
        <div className="erc-main">
          <div className="erc-icon" aria-hidden="true">
            {icon}
          </div>

          <div className="erc-eyebrow">
            <Sparkles size={11} />
            Recovery route
          </div>

          <h3 className="erc-title">{title}</h3>
          <p className="erc-description">{description}</p>
        </div>

        <Link to={link} className="erc-link">
          {linkText}
          <ArrowRight size={15} />
        </Link>
      </article>
    </>
  );
};

export default ErrorCard;
