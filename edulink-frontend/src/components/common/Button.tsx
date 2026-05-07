import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Loader } from 'lucide-react';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient' | 'danger' | 'soft';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  to?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  external?: boolean;
  ariaLabel?: string;
}

const STYLES = `
  .edui-btn {
    --edui-btn-bg: #1a5cff;
    --edui-btn-fg: #ffffff;
    --edui-btn-border: transparent;
    --edui-btn-hover-bg: #124ce0;
    --edui-btn-hover-fg: #ffffff;
    --edui-btn-ring: rgba(26,92,255,0.18);
    --edui-btn-shadow: 0 1px 3px rgba(26,92,255,0.22);

    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 14px;
    border: 1px solid var(--edui-btn-border);
    background: var(--edui-btn-bg);
    color: var(--edui-btn-fg);
    font-family: inherit;
    font-weight: 700;
    line-height: 1;
    text-decoration: none;
    white-space: nowrap;
    cursor: pointer;
    user-select: none;
    box-shadow: var(--edui-btn-shadow);
    transition: transform 0.14s ease, box-shadow 0.16s ease, background 0.16s ease, color 0.16s ease, border-color 0.16s ease, opacity 0.16s ease;
  }

  .edui-btn:hover {
    background: var(--edui-btn-hover-bg);
    color: var(--edui-btn-hover-fg);
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(26,92,255,0.24);
  }

  .edui-btn:active {
    transform: scale(0.98);
  }

  .edui-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 4px var(--edui-btn-ring), var(--edui-btn-shadow);
  }

  .edui-btn:disabled,
  .edui-btn.edui-disabled {
    opacity: 0.48;
    cursor: not-allowed;
    pointer-events: none;
    transform: none;
    box-shadow: none;
  }

  .edui-btn-sm {
    min-height: 34px;
    padding: 8px 13px;
    font-size: 12px;
  }

  .edui-btn-md {
    min-height: 40px;
    padding: 10px 16px;
    font-size: 13px;
  }

  .edui-btn-lg {
    min-height: 48px;
    padding: 13px 22px;
    font-size: 15px;
    border-radius: 16px;
  }

  .edui-btn-full {
    width: 100%;
  }

  .edui-btn-primary {
    --edui-btn-bg: #1a5cff;
    --edui-btn-fg: #ffffff;
    --edui-btn-hover-bg: #124ce0;
    --edui-btn-hover-fg: #ffffff;
    --edui-btn-ring: rgba(26,92,255,0.18);
    --edui-btn-shadow: 0 1px 3px rgba(26,92,255,0.24);
  }

  .edui-btn-secondary {
    --edui-btn-bg: #0d0f12;
    --edui-btn-fg: #ffffff;
    --edui-btn-hover-bg: #2a2d33;
    --edui-btn-hover-fg: #ffffff;
    --edui-btn-ring: rgba(13,15,18,0.14);
    --edui-btn-shadow: 0 1px 3px rgba(13,15,18,0.18);
  }

  .edui-btn-outline {
    --edui-btn-bg: transparent;
    --edui-btn-fg: #1a5cff;
    --edui-btn-border: rgba(26,92,255,0.30);
    --edui-btn-hover-bg: rgba(26,92,255,0.08);
    --edui-btn-hover-fg: #1a5cff;
    --edui-btn-ring: rgba(26,92,255,0.14);
    --edui-btn-shadow: none;
  }

  .edui-btn-ghost {
    --edui-btn-bg: transparent;
    --edui-btn-fg: #3a3d44;
    --edui-btn-border: transparent;
    --edui-btn-hover-bg: rgba(13,15,18,0.06);
    --edui-btn-hover-fg: #0d0f12;
    --edui-btn-ring: rgba(13,15,18,0.10);
    --edui-btn-shadow: none;
  }

  .edui-btn-gradient {
    --edui-btn-bg: linear-gradient(135deg, #1a5cff, #12b76a);
    --edui-btn-fg: #ffffff;
    --edui-btn-hover-bg: linear-gradient(135deg, #124ce0, #0f9f5c);
    --edui-btn-hover-fg: #ffffff;
    --edui-btn-ring: rgba(26,92,255,0.18);
    --edui-btn-shadow: 0 6px 18px rgba(26,92,255,0.18);
  }

  .edui-btn-danger {
    --edui-btn-bg: #ef4444;
    --edui-btn-fg: #ffffff;
    --edui-btn-hover-bg: #dc2626;
    --edui-btn-hover-fg: #ffffff;
    --edui-btn-ring: rgba(239,68,68,0.18);
    --edui-btn-shadow: 0 1px 3px rgba(239,68,68,0.22);
  }

  .edui-btn-soft {
    --edui-btn-bg: rgba(26,92,255,0.08);
    --edui-btn-fg: #1a5cff;
    --edui-btn-border: rgba(26,92,255,0.12);
    --edui-btn-hover-bg: rgba(26,92,255,0.13);
    --edui-btn-hover-fg: #1a5cff;
    --edui-btn-ring: rgba(26,92,255,0.12);
    --edui-btn-shadow: none;
  }

  .dark-mode .edui-btn-secondary {
    --edui-btn-bg: #f0ede8;
    --edui-btn-fg: #141414;
    --edui-btn-hover-bg: #d8d2c8;
    --edui-btn-hover-fg: #141414;
    --edui-btn-ring: rgba(240,237,232,0.16);
  }

  .dark-mode .edui-btn-ghost {
    --edui-btn-bg: transparent;
    --edui-btn-fg: #c9c4bc;
    --edui-btn-hover-bg: rgba(255,255,255,0.08);
    --edui-btn-hover-fg: #f0ede8;
    --edui-btn-ring: rgba(255,255,255,0.10);
  }

  .edui-btn-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .edui-btn-spinner {
    animation: edui-spin 0.85s linear infinite;
  }

  @keyframes edui-spin {
    to { transform: rotate(360deg); }
  }
`;

const getSpinnerSize = (size: ButtonProps['size']) => {
  switch (size) {
    case 'sm':
      return 14;
    case 'lg':
      return 18;
    case 'md':
    default:
      return 16;
  }
};

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  href,
  to,
  onClick,
  type = 'button',
  disabled = false,
  loading = false,
  className = '',
  fullWidth = false,
  leftIcon,
  rightIcon,
  external,
  ariaLabel,
}) => {
  const isDisabled = disabled || loading;
  const isExternal = external ?? Boolean(href);

  const combinedClasses = [
    'edui-btn',
    `edui-btn-${variant}`,
    `edui-btn-${size}`,
    fullWidth ? 'edui-btn-full' : '',
    isDisabled ? 'edui-disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {loading ? (
        <span className="edui-btn-icon" aria-hidden="true">
          <Loader size={getSpinnerSize(size)} className="edui-btn-spinner" />
        </span>
      ) : leftIcon ? (
        <span className="edui-btn-icon" aria-hidden="true">{leftIcon}</span>
      ) : null}

      <span>{children}</span>

      {!loading && rightIcon && (
        <span className="edui-btn-icon" aria-hidden="true">{rightIcon}</span>
      )}
    </>
  );

  if (href) {
    return (
      <>
        <style>{STYLES}</style>
        <a
          href={isDisabled ? undefined : href}
          className={combinedClasses}
          onClick={isDisabled ? undefined : onClick}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          aria-disabled={isDisabled}
          aria-busy={loading}
          aria-label={ariaLabel}
        >
          {content}
        </a>
      </>
    );
  }

  if (to) {
    return (
      <>
        <style>{STYLES}</style>
        <Link
          to={isDisabled ? '#' : to}
          className={combinedClasses}
          onClick={isDisabled ? (event) => event.preventDefault() : onClick}
          aria-disabled={isDisabled}
          aria-busy={loading}
          aria-label={ariaLabel}
        >
          {content}
        </Link>
      </>
    );
  }

  return (
    <>
      <style>{STYLES}</style>
      <button
        type={type}
        className={combinedClasses}
        onClick={onClick}
        disabled={isDisabled}
        aria-busy={loading}
        aria-label={ariaLabel}
      >
        {content}
      </button>
    </>
  );
};

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'outline', 'ghost', 'gradient', 'danger', 'soft']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  href: PropTypes.string,
  to: PropTypes.string,
  onClick: PropTypes.func,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  className: PropTypes.string,
  fullWidth: PropTypes.bool,
  leftIcon: PropTypes.node,
  rightIcon: PropTypes.node,
  external: PropTypes.bool,
  ariaLabel: PropTypes.string,
};

export default Button;
