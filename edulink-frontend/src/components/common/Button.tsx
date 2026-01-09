import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient';
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
}

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
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-edulink-primary text-white hover:bg-edulink-primary/90 focus:ring-edulink-primary',
    secondary: 'bg-edulink-secondary text-white hover:bg-edulink-secondary/90 focus:ring-edulink-secondary',
    outline: 'border-2 border-edulink-primary text-edulink-primary hover:bg-edulink-primary hover:text-white focus:ring-edulink-primary',
    ghost: 'text-edulink-primary hover:bg-edulink-primary/10 focus:ring-edulink-primary',
    gradient: 'bg-gradient-to-r from-[rgb(10,187,163)] to-[rgb(7,168,141)] text-white hover:from-[rgb(26,194,171)] hover:to-[rgb(7,168,141)] focus:ring-edulink-primary shadow-[0_2px_8px_rgba(56,142,60,0.10)] hover:shadow-[0_4px_16px_rgba(56,142,60,0.18)]',
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const fullWidthClass = fullWidth ? 'w-full' : '';
  
  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidthClass} ${className}`;

  const content = (
    <>
      {loading && (
        <span className="mr-2">●</span>
      )}
      {!loading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="ml-2">{rightIcon}</span>}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className={combinedClasses}
        onClick={onClick}
        target="_blank"
        rel="noopener noreferrer"
      >
        {content}
      </a>
    );
  }

  if (to) {
    return (
      <Link
        to={to}
        className={combinedClasses}
        onClick={onClick}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={combinedClasses}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {content}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'outline', 'ghost', 'gradient']),
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
};

export default Button;