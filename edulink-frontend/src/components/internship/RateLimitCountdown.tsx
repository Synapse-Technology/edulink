/**
 * Rate Limit Countdown Component
 * Shows a live countdown timer until the next application window opens
 */

import React, { useState, useEffect } from 'react';
import { Clock, TrendingUp } from 'lucide-react';
import type { RateLimitInfo } from '../../services/internship/rateLimitingService';
import { getTierUpgradeMessage } from '../../services/internship/rateLimitingService';

interface RateLimitCountdownProps {
  rateLimitInfo: RateLimitInfo;
  trustLevel: number;
}

const RateLimitCountdown: React.FC<RateLimitCountdownProps> = ({ rateLimitInfo, trustLevel }) => {
  const [countdown, setCountdown] = useState<string>('');
  const [timelineInfo, setTimelineInfo] = useState<{
    daysLeft: number;
    hoursLeft: number;
    minutesLeft: number;
  } | null>(null);

  // Update countdown every second
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const resetDate = rateLimitInfo.nextApplicationDate;
      const diffMs = Math.max(0, resetDate.getTime() - now.getTime());

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      setTimelineInfo({ daysLeft: days, hoursLeft: hours, minutesLeft: minutes });

      if (diffMs <= 0) {
        setCountdown('Ready to apply!');
      } else {
        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0 || (days === 0 && hours === 0)) parts.push(`${minutes}m`);
        if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
        
        setCountdown(parts.join(' '));
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [rateLimitInfo.nextApplicationDate]);

  const upgradeMessage = getTierUpgradeMessage(trustLevel);

  return (
    <div className="card bg-warning-subtle border-warning mb-3">
      <div className="card-body p-3">
        {/* Header */}
        <div className="d-flex align-items-start gap-2 mb-3">
          <Clock size={20} className="text-warning mt-1 flex-shrink-0" />
          <div className="flex-grow-1">
            <h6 className="mb-1 text-warning-emphasis">Monthly Application Limit Reached</h6>
            <p className="small text-muted mb-0">
              You can apply to <strong>{rateLimitInfo.currentLimit} internships per month</strong> at your current trust level.
            </p>
          </div>
        </div>

        {/* Countdown */}
        <div className="row g-2 mb-3">
          <div className="col-auto">
            <div className="card bg-white border-0 text-center p-2" style={{ minWidth: '80px' }}>
              <div className="fs-5 fw-bold text-primary">{countdown}</div>
              <div className="small text-muted">until reset</div>
            </div>
          </div>
          <div className="col">
            <div className="small text-muted">
              <p className="mb-1">
                <strong>Reset Date:</strong> {rateLimitInfo.nextApplicationDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
              <p className="mb-0">
                <strong>Applications Used:</strong> {rateLimitInfo.currentLimit} / {rateLimitInfo.currentLimit}
              </p>
            </div>
          </div>
        </div>

        {/* Tier Upgrade Tip */}
        {upgradeMessage && (
          <div className="alert alert-info d-flex align-items-start gap-2 mb-0 p-2 small">
            <TrendingUp size={16} className="mt-1 flex-shrink-0" />
            <span>
              <strong>Tip:</strong> {upgradeMessage}
            </span>
          </div>
        )}

        {/* Timeline Visual */}
        {timelineInfo && (
          <div className="mt-3 pt-3 border-top">
            <div className="d-flex justify-content-between small text-muted">
              <span>
                <strong>Days:</strong> {timelineInfo.daysLeft}
              </span>
              <span>
                <strong>Hours:</strong> {timelineInfo.hoursLeft}
              </span>
              <span>
                <strong>Minutes:</strong> {timelineInfo.minutesLeft}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RateLimitCountdown;
