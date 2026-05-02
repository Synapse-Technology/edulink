const TECHNICAL_PATTERNS = [
  /\btraceback\b/i,
  /\bstack\b/i,
  /\boperationalerror\b/i,
  /\bdatabaseerror\b/i,
  /\bintegrityerror\b/i,
  /\bprogrammingerror\b/i,
  /\btypeerror\b/i,
  /\bvalueerror\b/i,
  /\breferenceerror\b/i,
  /\bsyntaxerror\b/i,
  /\bhttperror\b/i,
  /\baxioserror\b/i,
  /\berrno\b/i,
  /\btemporary failure in name resolution\b/i,
  /\bpsycopg\b/i,
  /\bdjango\b/i,
  /\bsql\b/i,
  /\bselect\b/i,
  /\binsert\b/i,
  /\bupdate\b/i,
  /\bdelete\b/i,
  /\bconstraint\b/i,
  /\bexception\b/i,
  /\bundefined is not\b/i,
  /\bcannot read properties\b/i,
  /\bat .+\(.+:\d+:\d+\)/i,
  /\/home\/|\/usr\/|\.py\b|\.tsx?\b|\.jsx?\b/i,
];

const STATUS_FALLBACKS: Record<number, string> = {
  400: 'Please check your input and try again.',
  401: 'Please log in again to continue.',
  403: 'You do not have permission to perform this action.',
  404: 'We could not find that record. Please refresh and try again.',
  408: 'The request took too long. Please try again.',
  409: 'This information changed while you were working. Please refresh and try again.',
  422: 'Please check your input and try again.',
  429: 'Too many requests. Please wait a moment before trying again.',
  500: 'We could not complete that request right now. Please try again later.',
  502: 'A required service is temporarily unavailable. Please try again shortly.',
  503: 'The service is temporarily unavailable. Please try again shortly.',
  504: 'The request timed out. Please try again shortly.',
};

const CODE_FALLBACKS: Record<string, string> = {
  DATABASE_UNAVAILABLE: STATUS_FALLBACKS[503],
  INTERNAL_ERROR: STATUS_FALLBACKS[500],
  TRANSIENT_ERROR: STATUS_FALLBACKS[503],
  INTEGRATION_ERROR: STATUS_FALLBACKS[502],
  NETWORK_ERROR: 'Network connection failed. Please check your internet and try again.',
  RATE_LIMIT_EXCEEDED: STATUS_FALLBACKS[429],
};

export const containsTechnicalDetails = (message?: unknown): boolean => {
  if (typeof message !== 'string') return false;
  return TECHNICAL_PATTERNS.some(pattern => pattern.test(message));
};

export const getUserFacingErrorMessage = (
  message?: unknown,
  status?: number,
  errorCode?: string
): string => {
  const raw = typeof message === 'string' ? message.trim() : '';
  const codeMessage = errorCode ? CODE_FALLBACKS[errorCode] : undefined;
  const statusMessage = status ? STATUS_FALLBACKS[status] : undefined;

  if (!raw) {
    return codeMessage || statusMessage || 'Something went wrong. Please try again.';
  }

  if (containsTechnicalDetails(raw) || (status && status >= 500)) {
    return codeMessage || statusMessage || 'Something went wrong. Please try again.';
  }

  return raw;
};

export const getUserFacingFieldName = (field: string): string =>
  field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
