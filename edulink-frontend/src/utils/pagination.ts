/**
 * Pagination configuration
 * 
 * Standardized pagination settings to prevent loading
 * thousands of records simultaneously
 */

export const PAGINATION_CONFIG = {
  // Default page sizes for different resources
  INTERNSHIP_APPLICATIONS: 20,
  OPPORTUNITIES: 25,
  STUDENTS: 30,
  ARTIFACTS: 15,
  EVIDENCE: 20,
  NOTIFICATIONS: 10,
  
  // Max page size to prevent abuse
  MAX_PAGE_SIZE: 100,
  
  // Minimum page size (to avoid 0 items)
  MIN_PAGE_SIZE: 1,
};

/**
 * Build pagination query params
 */
export function getPaginationParams(page: number = 1, pageSize?: number): Record<string, number> {
  const limit = pageSize || PAGINATION_CONFIG.INTERNSHIP_APPLICATIONS;
  const offset = (page - 1) * limit;

  return {
    limit,
    offset,
  };
}

/**
 * Build pagination params with cursor (for alternative pagination style)
 */
export function getPaginationParamsByCursor(cursor?: string, limit: number = PAGINATION_CONFIG.INTERNSHIP_APPLICATIONS): Record<string, string | number> {
  return {
    limit,
    ...(cursor && { cursor }),
  };
}

/**
 * Parse pagination metadata from response headers
 */
export interface PaginationMeta {
  limit: number;
  offset: number;
  count: number;
  next?: string;
  previous?: string;
}

export function parsePaginationMeta(response: any): PaginationMeta | null {
  if (response?.headers?.['x-pagination-limit']) {
    return {
      limit: parseInt(response.headers['x-pagination-limit'], 10),
      offset: parseInt(response.headers['x-pagination-offset'], 10),
      count: parseInt(response.headers['x-pagination-count'], 10),
      next: response.headers['x-pagination-next'],
      previous: response.headers['x-pagination-previous'],
    };
  }

  // Fallback: check if response data has pagination info
  if (response?.data?.pagination) {
    return response.data.pagination;
  }

  return null;
}
