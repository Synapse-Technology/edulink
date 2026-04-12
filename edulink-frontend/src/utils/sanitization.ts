import DOMPurify from 'dompurify';

/**
 * Sanitization utilities for preventing XSS attacks
 *
 * Usage:
 * - sanitizeHtml(userContent) → safe for dangerouslySetInnerHTML
 * - sanitizeText(userInput) → safe for text nodes
 * - sanitizeUrl(userUrl) → safe for href/src attributes
 */

/**
 * Sanitize HTML content (removes all scripts and dangerous attributes)
 * Use for user-generated HTML that needs to be displayed
 *
 * @param html Raw HTML string from user
 * @returns Safe HTML string
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'u', 'br', 'p', 'ul', 'ol', 'li', 'a',
      'blockquote', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'img', 'table', 'th', 'tr', 'td'
    ],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'src', 'alt', 'class'],
    KEEP_CONTENT: true,
  });
}

/**
 * Sanitize plain text (removes all HTML tags)
 * Use for user input in text fields
 *
 * @param text Raw text from user
 * @returns Plain text without HTML
 */
export function sanitizeText(text: string): string {
  if (!text) return '';

  // Remove all HTML tags
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Sanitize URL for href/src attributes
 * Prevents javascript: and data: URLs
 *
 * @param url URL from user
 * @returns Safe URL string
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';

  // Reject javascript: protocol
  if (url.startsWith('javascript:') || url.startsWith('data:') || url.startsWith('vbscript:')) {
    return '';
  }

  // For relative URLs, return as-is
  if (url.startsWith('/') || url.startsWith('.')) {
    return url;
  }

  // For external URLs, validate with URL constructor
  try {
    const urlObj = new URL(url);
    // Only allow http and https
    if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
      return url;
    }
    return '';
  } catch {
    // If URL parsing fails, reject it
    return '';
  }
}

/**
 * Sanitize error messages for display
 * Removes any HTML that might contain scripts
 *
 * @param message Error message from server/API
 * @returns Safe error message
 */
export function sanitizeErrorMessage(message: string): string {
  if (!message) return 'An error occurred';

  if (typeof message !== 'string') {
    message = String(message);
  }

  // Remove all HTML and keep just text
  return DOMPurify.sanitize(message, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}

/**
 * Sanitize user object for display
 * Recursively sanitizes string values in object
 *
 * @param obj Object with potentially unsafe strings
 * @returns Object with sanitized strings
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized: Record<string, any> = { ...obj };

  Object.entries(sanitized).forEach(([key, value]) => {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value);
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    }
  });

  return sanitized as T;
}
