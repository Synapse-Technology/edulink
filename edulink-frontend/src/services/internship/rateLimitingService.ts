/**
 * Rate Limiting Service
 * Detects, parses, and manages application rate limit states
 */

export interface RateLimitInfo {
  isRateLimited: boolean;
  currentLimit: number;
  trustLevel: number;
  nextApplicationDate: Date;
  daysUntilReset: number;
  throttleMessage: string;
}

/**
 * Detects if an error is a rate limiting error
 * Rate limit errors are 409 Conflicts with "application limit" in the message
 */
export function isRateLimitError(error: any): boolean {
  if (!error) return false;

  // Check if it's a ConflictError (409)
  const statusCode = error.status || error?.response?.status;
  if (statusCode !== 409) return false;

  // Check if message mentions application limit
  const message = error.message || error?.userMessage || error?.response?.data?.user_message || '';
  const isDeveloperMessage = error?.developerMessage || error?.response?.data?.developer_message || '';
  
  return (
    message.toLowerCase().includes('application') && 
    message.toLowerCase().includes('limit')
  ) || isDeveloperMessage.toLowerCase().includes('applications this month');
}

/**
 * Extract rate limit information from error
 * Parses the error message to determine:
 * - Current limit (3 or 5 based on trust level)
 * - Trust level (0 or 1)
 * - Next application date (end of current month)
 */
export function parseRateLimitError(error: any): RateLimitInfo | null {
  if (!isRateLimitError(error)) {
    return null;
  }

  // Get the user message
  const userMessage = error.message || 
                      error?.userMessage || 
                      error?.response?.data?.user_message ||
                      'Rate limit reached';

  // Parse limit from message: "You've reached your monthly application limit (3)"
  const limitMatch = userMessage.match(/limit \((\d+)\)/);
  const currentLimit = limitMatch ? parseInt(limitMatch[1], 10) : 3;

  // Parse trust level from message: "Current tier: Level 0"
  const trustMatch = userMessage.match(/Level (\d+)/);
  const trustLevel = trustMatch ? parseInt(trustMatch[1], 10) : 0;

  // Calculate next application date (end of current month)
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const daysUntilReset = Math.ceil(
    (nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    isRateLimited: true,
    currentLimit,
    trustLevel,
    nextApplicationDate: nextMonth,
    daysUntilReset,
    throttleMessage: `You've reached your monthly application limit (${currentLimit}). ` +
                     `Try again on ${nextMonth.toLocaleDateString()} or improve your trust tier.`,
  };
}

/**
 * Format countdown message from rate limit info
 * Returns human-readable countdown: "Can apply again in X days, Y hours"
 */
export function formatCountdownMessage(rateLimitInfo: RateLimitInfo): string {
  const now = new Date();
  const resetDate = rateLimitInfo.nextApplicationDate;
  const diffMs = resetDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return 'Application limit should have reset. Please refresh.';
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  const parts = [];
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);

  if (parts.length === 0) {
    return 'Less than a minute';
  }

  return `Can apply again in ${parts.join(', ')}`;
}

/**
 * Get tier upgrade message suggesting how to increase limit
 * Trust Level 0 → 3 apps/month
 * Trust Level 1 → 5 apps/month
 * Trust Level 2+ → Unlimited
 */
export function getTierUpgradeMessage(currentTrustLevel: number): string {
  switch (currentTrustLevel) {
    case 0:
      return 'Complete your profile and get verified to increase to 5 applications per month (Trust Level 1).';
    case 1:
      return 'Continue building your profile history. Level 2 offers unlimited applications.';
    default:
      return '';
  }
}
