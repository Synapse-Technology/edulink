import { ApiError } from '../services';
import type { ParsedErrorResponse } from '../services/errorHandling';
import { parseErrorResponse } from '../services/errorHandling';

type LoginPortal = 'student' | 'employer' | 'institution' | 'admin';

interface LoginErrorMessageOptions {
  portal?: LoginPortal;
}

const portalLabel: Record<LoginPortal, string> = {
  student: 'student',
  employer: 'employer',
  institution: 'institution',
  admin: 'admin',
};

/**
 * Get parsed error response with portal-specific messaging
 * Ensures consistent error messages across all login portals (student/employer/institution/admin)
 */
export const getLoginErrorResponse = (
  error: unknown,
  options: LoginErrorMessageOptions = {}
): ParsedErrorResponse => {
  // Parse the error using the new system
  const parsed = parseErrorResponse(error);
  
  // Override user message with portal-specific message
  if (error instanceof ApiError) {
    const portalSpecificMessage = getLoginErrorMessage(error, options);
    return {
      ...parsed,
      userMessage: portalSpecificMessage,
    };
  }
  
  return parsed;
};

/**
 * Get user-friendly error message for login specific to portal
 * Preserves backward compatibility with existing Login/Register components
 */
export const getLoginErrorMessage = (
  error: unknown,
  options: LoginErrorMessageOptions = {}
): string => {
  const portal = options.portal ?? 'student';

  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        return 'Please review your login details and try again.';
      case 401:
        return portal === 'admin'
          ? 'Invalid admin email or password. Please try again.'
          : 'Incorrect email or password. Please try again.';
      case 403:
        return `Your account cannot access the ${portalLabel[portal]} portal.`;
      case 404:
        return portal === 'student'
          ? 'We could not find an account with those details.'
          : `No ${portalLabel[portal]} account was found with those details.`;
      case 429:
        return 'Too many login attempts. Please wait a moment before trying again.';
      case 500:
        return 'We are having trouble signing you in right now. Please try again shortly.';
      case 502:
      case 503:
      case 504:
        return portal === 'admin'
          ? 'The admin service is temporarily unavailable. Please try again in a few moments.'
          : 'The service is temporarily unavailable. Please try again in a few moments.';
      default:
        return error.message || 'Unable to sign in right now. Please try again.';
    }
  }

  if (error instanceof Error && error.message) {
    const lower = error.message.toLowerCase();

    if (lower.includes('network error') || lower.includes('failed to fetch')) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }

    if (error.message === 'Login failed') {
      return portal === 'admin'
        ? 'Invalid admin email or password. Please try again.'
        : 'Incorrect email or password. Please try again.';
    }

    return error.message;
  }

  return 'Unable to sign in right now. Please try again.';
};
