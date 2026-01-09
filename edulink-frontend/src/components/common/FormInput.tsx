import React, { forwardRef, useState } from 'react';
import PropTypes from 'prop-types';

export interface FormInputProps {
  type?: 'text' | 'email' | 'password' | 'tel' | 'number';
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  error?: string;
  label?: string;
  id?: string;
  showPasswordToggle?: boolean;
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ 
    type = 'text',
    name,
    value,
    onChange,
    placeholder,
    required = false,
    disabled = false,
    className = '',
    error,
    label,
    id,
    showPasswordToggle = false,
  }, ref) => {
    const inputId = id || `input-${name}`;
    const [showPassword, setShowPassword] = useState(false);
    
    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };
    
    const inputType = type === 'password' && showPassword ? 'text' : type;
    
    return (
      <div className={`form-input-group ${className}`}>
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            type={inputType}
            name={name}
            id={inputId}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            className={`
              w-full px-4 py-3 rounded-lg bg-white/90 text-gray-900 placeholder-gray-600 
              border-0 focus:ring-2 focus:ring-edulink-primary focus:outline-none 
              transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? 'ring-2 ring-red-500' : ''}
              ${showPasswordToggle && type === 'password' ? 'pr-12' : ''}
            `}
          />
          {showPasswordToggle && type === 'password' && (
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 001.243-1.243m-1.243-1.243a3 3 0 00-1.243-1.243m-1.243 1.243a3 3 0 001.243 1.243m-5.858-.908a9.97 9.97 0 01-1.563 3.029M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          )}
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';

FormInput.propTypes = {
  type: PropTypes.oneOf(['text', 'email', 'password', 'tel', 'number']),
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  error: PropTypes.string,
  label: PropTypes.string,
  id: PropTypes.string,
  showPasswordToggle: PropTypes.bool,
};

export default FormInput;