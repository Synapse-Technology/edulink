/**
 * Client-side input validation
 * 
 * Validates user inputs before sending to API to:
 * - Improve UX (fail fast with clear messages)
 * - Reduce server load (don't send invalid data)
 * - Prevent common errors (empty emails, invalid dates, etc.)
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Email validation regex (basic)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// URL validation regex
const URL_REGEX = /^https?:\/\/.+/i;

// Phone validation (basic - allows various formats)
const PHONE_REGEX = /^[\d\s\-\+\(\)]+$/;

/**
 * Validate email address
 */
export function validateEmail(email: string): ValidationResult {
  const errors: ValidationError[] = [];

  if (!email) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!EMAIL_REGEX.test(email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  } else if (email.length > 254) {
    errors.push({ field: 'email', message: 'Email is too long (max 254 characters)' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string, minLength: number = 8): ValidationResult {
  const errors: ValidationError[] = [];

  if (!password) {
    errors.push({ field: 'password', message: 'Password is required' });
  } else if (password.length < minLength) {
    errors.push({ field: 'password', message: `Password must be at least ${minLength} characters` });
  } else if (!/[A-Z]/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain at least one uppercase letter' });
  } else if (!/[a-z]/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain at least one lowercase letter' });
  } else if (!/\d/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain at least one number' });
  } else if (!/[!@#$%^&*]/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain at least one special character (!@#$%^&*)' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate phone number
 */
export function validatePhone(phone: string): ValidationResult {
  const errors: ValidationError[] = [];

  if (!phone) {
    errors.push({ field: 'phone', message: 'Phone number is required' });
  } else if (!PHONE_REGEX.test(phone)) {
    errors.push({ field: 'phone', message: 'Invalid phone number format' });
  } else if (phone.replace(/\D/g, '').length < 10) {
    errors.push({ field: 'phone', message: 'Phone number must contain at least 10 digits' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate URL
 */
export function validateUrl(url: string, optional: boolean = false): ValidationResult {
  const errors: ValidationError[] = [];

  if (!url) {
    if (!optional) {
      errors.push({ field: 'url', message: 'URL is required' });
    }
  } else if (!URL_REGEX.test(url)) {
    errors.push({ field: 'url', message: 'Invalid URL format (must start with http:// or https://)' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate file size
 */
export function validateFileSize(file: File, maxSizeMB: number): ValidationResult {
  const errors: ValidationError[] = [];
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (!file) {
    errors.push({ field: 'file', message: 'File is required' });
  } else if (file.size > maxSizeBytes) {
    errors.push({
      field: 'file',
      message: `File size exceeds maximum (${maxSizeMB}MB). Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate file type
 */
export function validateFileType(file: File, allowedTypes: string[]): ValidationResult {
  const errors: ValidationError[] = [];

  if (!file) {
    errors.push({ field: 'file', message: 'File is required' });
  } else if (!allowedTypes.includes(file.type)) {
    errors.push({
      field: 'file',
      message: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate date is in the future
 */
export function validateFutureDate(dateString: string, fieldName: string = 'date'): ValidationResult {
  const errors: ValidationError[] = [];

  try {
    const date = new Date(dateString);
    const now = new Date();

    if (date <= now) {
      errors.push({ field: fieldName, message: `${fieldName} must be in the future` });
    }
  } catch (e) {
    errors.push({ field: fieldName, message: `Invalid date format` });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate date is in the past
 */
export function validatePastDate(dateString: string, fieldName: string = 'date'): ValidationResult {
  const errors: ValidationError[] = [];

  try {
    const date = new Date(dateString);
    const now = new Date();

    if (date >= now) {
      errors.push({ field: fieldName, message: `${fieldName} must be in the past` });
    }
  } catch (e) {
    errors.push({ field: fieldName, message: `Invalid date format` });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate required field is not empty
 */
export function validateRequired(value: any, fieldName: string = 'field'): ValidationResult {
  const errors: ValidationError[] = [];

  if (!value || (typeof value === 'string' && value.trim() === '')) {
    errors.push({ field: fieldName, message: `${fieldName} is required` });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate minimum length
 */
export function validateMinLength(value: string, minLength: number, fieldName: string = 'field'): ValidationResult {
  const errors: ValidationError[] = [];

  if (value && value.length < minLength) {
    errors.push({
      field: fieldName,
      message: `${fieldName} must be at least ${minLength} characters`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate maximum length
 */
export function validateMaxLength(value: string, maxLength: number, fieldName: string = 'field'): ValidationResult {
  const errors: ValidationError[] = [];

  if (value && value.length > maxLength) {
    errors.push({
      field: fieldName,
      message: `${fieldName} must not exceed ${maxLength} characters`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Combine multiple validation results
 */
export function combineValidationResults(...results: ValidationResult[]): ValidationResult {
  const allErrors = results.flatMap(r => r.errors);
  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
  };
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  errors.forEach(error => {
    if (!formatted[error.field]) {
      formatted[error.field] = [];
    }
    formatted[error.field].push(error.message);
  });

  return formatted;
}
