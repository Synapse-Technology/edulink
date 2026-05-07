import React from 'react';
import { Link } from 'react-router-dom';
import {
  Bookmark,
  BookmarkCheck,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  GraduationCap,
  MapPin,
  Sparkles,
  Wallet,
} from 'lucide-react';
import Button from './Button';

interface CardProps {
  title: string;
  company: string;
  location?: string;
  image?: string;
  description?: string;
  type?: 'internship' | 'job' | 'graduate';
  price?: string;
  duration?: string;
  postedDate?: string;
  tags?: string[];
  onApply?: () => void;
  onBookmark?: () => void;
  isBookmarked?: boolean;
  className?: string;
}

const STYLES = `
  .oc-card {
    --oc-ink: #0d0f12;
    --oc-ink-2: #3a3d44;
    --oc-ink-3: #6b7280;
    --oc-ink-4: #9ca3af;
    --oc-surface: #f9f8f6;
    --oc-surface-2: #f2f0ed;
    --oc-surface-3: #e8e5e0;
    --oc-border: #e4e1dc;
    --oc-border-2: #d1ccc5;
    --oc-accent: #1a5cff;
    --oc-accent-soft: rgba(26,92,255,0.08);
    --oc-success: #12b76a;
    --oc-success-soft: rgba(18,183,106,0.10);
    --oc-warning: #f59e0b;
    --oc-warning-soft: rgba(245,158,11,0.10);
    --oc-purple: #7c3aed;
    --oc-purple-soft: rgba(124,58,237,0.10);
    --oc-radius: 20px;
    --oc-radius-sm: 13px;
    --oc-shadow: 0 4px 16px rgba(0,0,0,0.07),0 1px 4px rgba(0,0,0,0.04);

    position: relative;
    overflow: hidden;
    background: var(--oc-surface-2);
    border: 1px solid var(--oc-border);
    border-radius: var(--oc-radius);
    color: var(--oc-ink);
    transition: transform 0.18s ease, box-shadow 0.2s ease, border-color 0.18s ease;
  }

  .dark-mode .oc-card {
    --oc-ink: #f0ede8;
    --oc-ink-2: #c9c4bc;
    --oc-ink-3: #8a8580;
    --oc-ink-4: #5a5650;
    --oc-surface: #141414;
    --oc-surface-2: #1c1c1c;
    --oc-surface-3: #252525;
    --oc-border: #2a2a2a;
    --oc-border-2: #353535;
    --oc-accent: #4d7fff;
    --oc-accent-soft: rgba(77,127,255,0.10);
    --oc-success-soft: rgba(18,183,106,0.12);
    --oc-warning-soft: rgba(245,158,11,0.12);
    --oc-purple-soft: rgba(124,58,237,0.14);
    --oc-shadow: 0 4px 16px rgba(0,0,0,0.30);
  }

  .oc-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--oc-shadow);
    border-color: var(--oc-border-2);
  }

  .oc-image-wrap {
    position: relative;
    height: 170px;
    overflow: hidden;
    background: linear-gradient(135deg, var(--oc-accent-soft), var(--oc-surface-3));
  }

  .oc-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.35s ease;
  }

  .oc-card:hover .oc-image {
    transform: scale(1.035);
  }

  .oc-image-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.34));
    pointer-events: none;
  }

  .oc-body {
    padding: 20px;
  }

  .oc-top-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 13px;
  }

  .oc-badges {
    display: flex;
    align-items: center;
    gap: 7px;
    flex-wrap: wrap;
  }

  .oc-type-badge,
  .oc-date-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border-radius: 999px;
    padding: 5px 9px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.03em;
    white-space: nowrap;
  }

  .oc-type-internship {
    background: var(--oc-accent-soft);
    color: var(--oc-accent);
  }

  .oc-type-job {
    background: var(--oc-success-soft);
    color: var(--oc-success);
  }

  .oc-type-graduate {
    background: var(--oc-purple-soft);
    color: var(--oc-purple);
  }

  .oc-date-badge {
    background: var(--oc-surface-3);
    color: var(--oc-ink-4);
  }

  .oc-bookmark {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--oc-surface-3);
    border: 1px solid var(--oc-border);
    color: var(--oc-ink-4);
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.15s ease, color 0.15s ease, transform 0.12s ease, border-color 0.15s ease;
  }

  .oc-bookmark:hover,
  .oc-bookmark.active {
    background: var(--oc-accent-soft);
    color: var(--oc-accent);
    border-color: rgba(26,92,255,0.22);
  }

  .oc-bookmark:active {
    transform: scale(0.95);
  }

  .oc-title {
    font-size: 18px;
    font-weight: 800;
    line-height: 1.28;
    color: var(--oc-ink);
    margin: 0 0 8px;
  }

  .oc-title-link {
    color: inherit;
    text-decoration: none;
    transition: color 0.15s ease;
  }

  .oc-title-link:hover {
    color: var(--oc-accent);
  }

  .oc-company {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 13px;
    color: var(--oc-ink-3);
    font-weight: 700;
    margin-bottom: 10px;
  }

  .oc-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 9px 16px;
    margin-bottom: 14px;
  }

  .oc-meta-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--oc-ink-3);
  }

  .oc-description {
    font-size: 13px;
    color: var(--oc-ink-3);
    line-height: 1.62;
    margin: 0 0 16px;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .oc-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin-bottom: 17px;
  }

  .oc-tag {
    display: inline-flex;
    align-items: center;
    border-radius: 9px;
    padding: 5px 8px;
    font-size: 11px;
    font-weight: 700;
    background: var(--oc-surface-3);
    color: var(--oc-ink-3);
    border: 1px solid var(--oc-border);
  }

  .oc-footer {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 14px;
    padding-top: 16px;
    border-top: 1px solid var(--oc-border);
  }

  .oc-reward {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .oc-price {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 18px;
    font-weight: 900;
    color: var(--oc-accent);
    line-height: 1;
  }

  .oc-duration {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    color: var(--oc-ink-4);
  }

  .oc-no-price {
    font-size: 12px;
    color: var(--oc-ink-4);
    font-weight: 700;
  }

  @media (max-width: 520px) {
    .oc-body {
      padding: 18px;
    }

    .oc-footer {
      align-items: stretch;
      flex-direction: column;
    }

    .oc-footer .edui-btn {
      width: 100%;
    }
  }
`;

const slugify = (value: string) => (
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
);

const getTypeConfig = (type: CardProps['type']) => {
  switch (type) {
    case 'job':
      return { label: 'Full-time', className: 'oc-type-job', icon: Briefcase };
    case 'graduate':
      return { label: 'Graduate Program', className: 'oc-type-graduate', icon: GraduationCap };
    case 'internship':
    default:
      return { label: 'Internship', className: 'oc-type-internship', icon: Sparkles };
  }
};

const Card: React.FC<CardProps> = ({
  title,
  company,
  location,
  image,
  description,
  type = 'internship',
  price,
  duration,
  postedDate,
  tags = [],
  onApply,
  onBookmark,
  isBookmarked = false,
  className = '',
}) => {
  const typeConfig = getTypeConfig(type);
  const TypeIcon = typeConfig.icon;
  const opportunityPath = `/opportunities/${slugify(title)}`;

  return (
    <>
      <style>{STYLES}</style>
      <article className={`oc-card${className ? ` ${className}` : ''}`}>
        {image && (
          <div className="oc-image-wrap">
            <img src={image} alt={title} className="oc-image" />
            <div className="oc-image-overlay" />
          </div>
        )}

        <div className="oc-body">
          <div className="oc-top-row">
            <div className="oc-badges">
              <span className={`oc-type-badge ${typeConfig.className}`}>
                <TypeIcon size={12} />
                {typeConfig.label}
              </span>

              {postedDate && (
                <span className="oc-date-badge">
                  <Calendar size={12} />
                  {postedDate}
                </span>
              )}
            </div>

            {onBookmark && (
              <button
                type="button"
                onClick={onBookmark}
                className={`oc-bookmark${isBookmarked ? ' active' : ''}`}
                aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark opportunity'}
                title={isBookmarked ? 'Remove bookmark' : 'Bookmark opportunity'}
              >
                {isBookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
              </button>
            )}
          </div>

          <h3 className="oc-title">
            <Link to={opportunityPath} className="oc-title-link">
              {title}
            </Link>
          </h3>

          <div className="oc-company">
            <Building2 size={14} />
            <span>{company}</span>
          </div>

          {(location || duration) && (
            <div className="oc-meta">
              {location && (
                <span className="oc-meta-item">
                  <MapPin size={14} />
                  {location}
                </span>
              )}
              {duration && (
                <span className="oc-meta-item">
                  <Clock size={14} />
                  {duration}
                </span>
              )}
            </div>
          )}

          {description && (
            <p className="oc-description">{description}</p>
          )}

          {tags.length > 0 && (
            <div className="oc-tags">
              {tags.slice(0, 3).map((tag, index) => (
                <span key={`${tag}-${index}`} className="oc-tag">
                  {tag}
                </span>
              ))}
              {tags.length > 3 && (
                <span className="oc-tag">+{tags.length - 3} more</span>
              )}
            </div>
          )}

          <div className="oc-footer">
            <div className="oc-reward">
              {price ? (
                <span className="oc-price">
                  <Wallet size={16} />
                  {price}
                </span>
              ) : (
                <span className="oc-no-price">Stipend not disclosed</span>
              )}

              {duration && (
                <span className="oc-duration">
                  <Clock size={12} />
                  {duration}
                </span>
              )}
            </div>

            {onApply && (
              <Button
                variant="primary"
                size="sm"
                onClick={onApply}
                rightIcon={<Briefcase size={14} />}
              >
                Apply Now
              </Button>
            )}
          </div>
        </div>
      </article>
    </>
  );
};

export default Card;
