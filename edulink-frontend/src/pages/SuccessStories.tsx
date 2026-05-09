/**
 * Success Stories Page
 * Public-facing page showcasing verified student internship and attachment outcomes.
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/common';
import {
  internshipService,
  type SuccessStory,
} from '../services/internship/internshipService';

const S: Record<string, React.CSSProperties> = {
  root: {
    fontFamily: "'DM Sans', system-ui, sans-serif",
    color: 'var(--color-text-primary, #111827)',
  },

  hero: {
    background: '#071a18',
    padding: '64px 48px 56px',
    position: 'relative',
    overflow: 'hidden',
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.16em',
    color: '#0bbfa3',
    textTransform: 'uppercase',
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  heroEyebrowLine: {
    display: 'block',
    width: 24,
    height: 1,
    background: '#0bbfa3',
  },
  heroH1: {
    fontSize: 46,
    fontWeight: 850,
    color: '#ffffff',
    lineHeight: 1.04,
    margin: '0 0 16px',
    letterSpacing: '-0.06em',
  },
  heroSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.62)',
    lineHeight: 1.75,
    maxWidth: 520,
    margin: 0,
  },
  heroBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    border: '1px solid rgba(11,191,163,0.24)',
    borderRadius: 999,
    padding: '8px 14px',
    marginTop: 28,
    fontSize: 12,
    color: '#0bbfa3',
    fontWeight: 700,
    letterSpacing: '0.03em',
    background: 'rgba(11,191,163,0.08)',
  },
  heroBgIcon: {
    position: 'absolute',
    right: 48,
    top: '50%',
    transform: 'translateY(-50%)',
    opacity: 0.07,
    pointerEvents: 'none',
  },

  statsSection: {
    background: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
  },
  statsInner: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    alignItems: 'stretch',
  },
  stat: {
    padding: '28px 34px',
    borderRight: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  statLast: {
    padding: '28px 34px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  statIcon: {
    width: 24,
    height: 24,
    marginBottom: 12,
    color: '#069b8e',
  },
  statNumber: {
    fontSize: 36,
    fontWeight: 850,
    color: '#071a18',
    lineHeight: 1,
    letterSpacing: '-0.04em',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: 600,
    letterSpacing: '0.02em',
    marginTop: 4,
  },

  filtersSection: {
    padding: '24px 48px',
    borderBottom: '1px solid #e5e7eb',
    background: '#ffffff',
  },
  filterGroup: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 11,
    color: '#6b7280',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    fontWeight: 800,
    marginRight: 8,
  },

  gridSection: {
    padding: '40px 48px 48px',
    background: '#f6faf9',
  },
  gridHeader: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  gridTitle: {
    fontSize: 11,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: '#6b7280',
    fontWeight: 800,
  },
  gridCount: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: 600,
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 16,
    alignItems: 'stretch',
  },

  card: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 20,
    padding: 22,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 100,
    transition: 'transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease',
    cursor: 'default',
  },
  cardAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    background: 'rgba(6,155,142,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 850,
    color: '#069b8e',
    marginBottom: 14,
    flexShrink: 0,
  },
  cardTag: {
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#069b8e',
    fontWeight: 850,
    marginBottom: 10,
  },
  cardName: {
    fontSize: 17,
    fontWeight: 850,
    color: '#111827',
    marginBottom: 4,
    lineHeight: 1.3,
  },
  cardRole: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 16,
    fontWeight: 600,
  },
  cardQuote: {
    fontSize: 13,
    lineHeight: 1.75,
    color: '#6b7280',
    borderLeft: '3px solid rgba(6,155,142,0.18)',
    paddingLeft: 14,
    margin: '0 0 14px',
    fontStyle: 'italic',
    flex: 1,
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTop: '1px solid #eef2f7',
    marginTop: 'auto',
    gap: 12,
  },
  cardCompany: {
    fontSize: 11,
    color: '#475569',
    fontWeight: 750,
  },
  cardDate: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: 600,
  },

  skeletonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 16,
  },
  skeletonCard: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 20,
    padding: 24,
    height: 240,
  },
  skeletonLine: {
    background: '#eef2f7',
    borderRadius: 6,
    marginBottom: 10,
  },

  emptyWrap: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 20,
    gridColumn: '1 / -1',
    padding: '80px 40px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  emptyH4: {
    fontSize: 22,
    fontWeight: 850,
    margin: '16px 0 8px',
    color: '#111827',
  },
  emptyP: {
    fontSize: 13,
    color: '#6b7280',
    maxWidth: 380,
    lineHeight: 1.7,
    margin: 0,
  },

  cta: {
    background: '#071a18',
    padding: '52px 48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 40,
    flexWrap: 'wrap',
  },
  ctaEyebrow: {
    fontSize: 10,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: '#0bbfa3',
    fontWeight: 850,
    marginBottom: 12,
  },
  ctaH2: {
    fontSize: 32,
    fontWeight: 850,
    color: '#ffffff',
    margin: '0 0 10px',
    lineHeight: 1.08,
    letterSpacing: '-0.05em',
  },
  ctaP: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.58)',
    margin: 0,
    lineHeight: 1.7,
    maxWidth: 460,
  },
  ctaActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    flexShrink: 0,
    alignSelf: 'center',
  },
  btnPrimary: {
    fontSize: 13,
    fontWeight: 850,
    padding: '12px 32px',
    background: '#ffffff',
    color: '#071a18',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    display: 'inline-flex',
    justifyContent: 'center',
    textAlign: 'center',
  },
  btnGhost: {
    fontSize: 13,
    fontWeight: 750,
    padding: '12px 32px',
    background: 'transparent',
    color: 'rgba(255,255,255,0.76)',
    border: '1px solid rgba(255,255,255,0.16)',
    borderRadius: 10,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    display: 'inline-flex',
    justifyContent: 'center',
    textAlign: 'center',
  },
};

const FilterBtn: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    className="success-stories-filter-btn"
    onClick={onClick}
    type="button"
    style={{
      fontSize: 13,
      fontWeight: active ? 850 : 700,
      padding: '8px 18px',
      borderRadius: 999,
      border: active ? '1px solid #069b8e' : '1px solid #e5e7eb',
      background: active ? '#069b8e' : '#ffffff',
      color: active ? '#ffffff' : '#64748b',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    }}
  >
    {children}
  </button>
);

const SkeletonCard: React.FC = () => (
  <div style={S.skeletonCard}>
    <div
      style={{
        ...S.skeletonLine,
        width: 42,
        height: 42,
        borderRadius: 14,
        marginBottom: 14,
      }}
    />
    <div style={{ ...S.skeletonLine, width: '45%', height: 10 }} />
    <div style={{ ...S.skeletonLine, width: '65%', height: 16, marginTop: 4 }} />
    <div style={{ ...S.skeletonLine, width: '50%', height: 11 }} />
    <div style={{ ...S.skeletonLine, width: '100%', height: 11, marginTop: 16 }} />
    <div style={{ ...S.skeletonLine, width: '90%', height: 11 }} />
    <div style={{ ...S.skeletonLine, width: '75%', height: 11 }} />
  </div>
);

const StoryCard: React.FC<{ story: SuccessStory }> = ({ story }) => {
  const [hovered, setHovered] = React.useState(false);

  const initials = story.student_name
    ? story.student_name
        .split(' ')
        .slice(0, 2)
        .map((word: string) => word[0])
        .join('')
        .toUpperCase()
    : 'ST';

  const displayDate = story.created_at
    ? new Date(story.created_at).toLocaleDateString('en-GB', {
        month: 'short',
        year: 'numeric',
      })
    : '';

  return (
    <div
      style={{
        ...S.card,
        transform: hovered ? 'translateY(-4px)' : 'none',
        borderColor: hovered ? 'rgba(6,155,142,0.24)' : '#e5e7eb',
        boxShadow: hovered ? '0 18px 44px rgba(17,24,39,.08)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={S.cardAvatar}>{initials}</div>

      <div style={S.cardTag}>Verified internship experience</div>

      <div style={S.cardName}>{story.student_name ?? 'Anonymous Student'}</div>

      <div style={S.cardRole}>
        {story.employer_name
          ? `Experience with ${story.employer_name}`
          : 'Verified student placement'}
      </div>

      {(story.student_testimonial || story.employer_feedback) && (
        <p style={S.cardQuote}>
          {story.student_testimonial || story.employer_feedback}
        </p>
      )}

      <div style={S.cardFooter}>
        <span style={S.cardCompany}>
          {story.employer_name ?? 'EduLink partner'}
        </span>
        <span style={S.cardDate}>{displayDate}</span>
      </div>
    </div>
  );
};

const EmptyState: React.FC<{ message?: string }> = ({ message }) => (
  <div style={S.emptyWrap}>
    <svg
      width="52"
      height="52"
      viewBox="0 0 52 52"
      fill="none"
      stroke="#069b8e"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ opacity: 0.45 }}
    >
      <circle cx="26" cy="20" r="13" />
      <path d="M18 32l-4 16 12-6 12 6-4-16" />
      <path d="M22 20l2.5 2.5L30 16" />
    </svg>

    <h4 style={S.emptyH4}>No success stories yet</h4>

    <p style={S.emptyP}>
      {message ??
        'Check back soon for verified internship and attachment outcomes from EduLink-connected students.'}
    </p>
  </div>
);

const UsersIcon = () => (
  <svg
    style={S.statIcon}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
  >
    <circle cx="9" cy="7" r="3" />
    <circle cx="17" cy="7" r="3" />
    <path d="M1 21c0-4 3.1-7 8-7h6c4.9 0 8 3 8 7" />
  </svg>
);

const TrendIcon = () => (
  <svg
    style={S.statIcon}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
  >
    <polyline points="3,17 9,11 13,15 21,6" />
    <polyline points="16,6 21,6 21,11" />
  </svg>
);

const BriefcaseIcon = () => (
  <svg
    style={S.statIcon}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
  >
    <rect x="2" y="8" width="20" height="13" rx="1.5" />
    <path d="M8 8V6a4 4 0 018 0v2" />
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="6" cy="6" r="5" stroke="#0bbfa3" strokeWidth="1" />
    <path
      d="M3.7 6.1l1.45 1.45L8.4 4.4"
      stroke="#0bbfa3"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SuccessStories: React.FC = () => {
  const [stories, setStories] = useState<SuccessStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'recent'>('recent');

  useEffect(() => {
    let isMounted = true;

    const fetchStories = async () => {
      try {
        setLoading(true);
        setLoadError(null);

        const data = await internshipService.getSuccessStories();

        const published = data.filter((story: SuccessStory) => story.is_published);

        const sorted = published.sort(
          (a: SuccessStory, b: SuccessStory) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );

        if (isMounted) setStories(sorted);
      } catch (error) {
        console.error('Failed to load success stories:', error);

        if (isMounted) {
          setStories([]);
          setLoadError(
            'Success stories are temporarily unavailable. Please check back soon.',
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStories();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredStories =
    filter === 'recent' ? stories.slice(0, 9) : stories;

  const employerCount = new Set(
    stories.map((story) => story.employer_name).filter(Boolean),
  ).size;

  return (
    <>
      <SEO
        title="Success Stories - EduLink KE"
        description="Discover verified student internship and attachment success stories from EduLink KE."
        keywords="success stories, student internships, attachments, career transition, internship experiences"
      />

      <div style={S.root}>
        <section className="success-stories-hero" style={S.hero}>
          <svg
            className="success-stories-hero-icon"
            style={S.heroBgIcon}
            width="240"
            height="240"
            viewBox="0 0 240 240"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="120" cy="120" r="100" stroke="white" strokeWidth="0.8" />
            <circle cx="120" cy="80" r="22" stroke="white" strokeWidth="0.8" />
            <path
              d="M84 148 L100 120 L120 132 L140 120 L156 148"
              stroke="white"
              strokeWidth="0.8"
            />
            <path
              d="M96 180 L96 148 L144 148 L144 180"
              stroke="white"
              strokeWidth="0.8"
            />
          </svg>

          <div style={S.heroEyebrow}>
            <span style={S.heroEyebrowLine} />
            Verified career transition outcomes
          </div>

          <h1 className="success-stories-hero-title" style={S.heroH1}>
            Internship &
            <br />
            Attachment Success Stories
          </h1>

          <p className="success-stories-hero-sub" style={S.heroSub}>
            Discover how students used verified internship and attachment
            opportunities through EduLink KE to gain practical experience,
            mentorship, and career growth.
          </p>

          <div className="success-stories-hero-badge" style={S.heroBadge}>
            <CheckIcon />
            Verified placements and internship experiences
          </div>
        </section>

        <section className="success-stories-stats-section" style={S.statsSection}>
          <div className="success-stories-stats" style={S.statsInner}>
            <div className="success-stories-stat" style={S.stat}>
              <UsersIcon />
              <div style={S.statNumber}>{loading ? '—' : `${stories.length}`}</div>
              <div style={S.statLabel}>Published student experiences</div>
            </div>

            <div className="success-stories-stat" style={S.stat}>
              <TrendIcon />
              <div style={S.statNumber}>{loading ? '—' : `${stories.length}`}</div>
              <div style={S.statLabel}>Internship outcomes documented</div>
            </div>

            <div className="success-stories-stat" style={S.statLast}>
              <BriefcaseIcon />
              <div style={S.statNumber}>{loading ? '—' : `${employerCount}`}</div>
              <div style={S.statLabel}>Organizations represented</div>
            </div>
          </div>
        </section>

        <section
          className="success-stories-filters-section"
          style={S.filtersSection}
        >
          <div className="success-stories-filter-group" style={S.filterGroup}>
            <span
              className="success-stories-filter-label"
              style={S.filterLabel}
            >
              View
            </span>

            <FilterBtn
              active={filter === 'recent'}
              onClick={() => setFilter('recent')}
            >
              Most recent
            </FilterBtn>

            <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')}>
              All stories
            </FilterBtn>
          </div>
        </section>

        <section className="success-stories-grid-section" style={S.gridSection}>
          <div className="success-stories-grid-header" style={S.gridHeader}>
            <span style={S.gridTitle}>Verified internship experiences</span>

            {!loading && (
              <span style={S.gridCount}>
                {filteredStories.length}{' '}
                {filteredStories.length === 1 ? 'story' : 'stories'}
              </span>
            )}
          </div>

          {loading ? (
            <div className="success-stories-cards-grid" style={S.skeletonGrid}>
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <SkeletonCard key={item} />
              ))}
            </div>
          ) : filteredStories.length > 0 ? (
            <div className="success-stories-cards-grid" style={S.cardsGrid}>
              {filteredStories.map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </div>
          ) : (
            <div className="success-stories-cards-grid" style={S.skeletonGrid}>
              <EmptyState message={loadError ?? undefined} />
            </div>
          )}
        </section>

        <section className="success-stories-cta" style={S.cta}>
          <div className="success-stories-cta-copy">
            <div style={S.ctaEyebrow}>Begin your journey</div>

            <h2 style={S.ctaH2}>
              Start building
              <br />
              verified experience.
            </h2>

            <p style={S.ctaP}>
              Explore internship and attachment opportunities, connect with
              verified organizations, and begin building credible professional
              experience through EduLink KE.
            </p>
          </div>

          <div className="success-stories-cta-actions" style={S.ctaActions}>
            <Link
              className="success-stories-cta-button"
              to="/opportunities"
              style={S.btnPrimary}
            >
              Browse opportunities
            </Link>

            <Link
              className="success-stories-cta-button"
              to="/register"
              style={S.btnGhost}
            >
              Create account
            </Link>
          </div>
        </section>
      </div>

      <style>{`
        @media (max-width: 991.98px) {
          .success-stories-hero {
            padding: 56px 28px 48px !important;
          }

          .success-stories-hero-title {
            font-size: 38px !important;
          }

          .success-stories-stats,
          .success-stories-cards-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .success-stories-stat {
              padding: 24px 28px !important;
          }

          .success-stories-grid-section {
            padding: 36px 28px !important;
          }
        }

        @media (max-width: 575.98px) {
          .success-stories-hero {
            padding: 44px 20px 38px !important;
          }

          .success-stories-hero-icon {
            width: 160px !important;
            height: 160px !important;
            right: -36px !important;
            top: 32px !important;
            transform: none !important;
          }

          .success-stories-hero-title {
            font-size: 32px !important;
            line-height: 1.08 !important;
          }

          .success-stories-hero-sub {
            font-size: 14px !important;
            max-width: none !important;
          }

          .success-stories-hero-badge {
            width: 100% !important;
            justify-content: center !important;
            padding: 10px 12px !important;
            text-align: center !important;
          }

          .success-stories-stats,
          .success-stories-cards-grid {
            grid-template-columns: 1fr !important;
          }

          .success-stories-stat {
            border-right: 0 !important;
            border-bottom: 1px solid #e5e7eb !important;
            padding: 24px 20px !important;
          }

          .success-stories-filters-section {
            padding: 18px 20px !important;
          }

          .success-stories-filter-group {
            align-items: stretch !important;
            flex-direction: column !important;
            gap: 8px !important;
          }

          .success-stories-filter-label {
            margin-right: 0 !important;
          }

          .success-stories-filter-btn {
            width: 100% !important;
            min-height: 40px !important;
          }

          .success-stories-grid-section {
            padding: 28px 20px !important;
          }

          .success-stories-grid-header {
            align-items: flex-start !important;
            flex-direction: column !important;
            gap: 6px !important;
            margin-bottom: 18px !important;
          }

          .success-stories-cards-grid {
            gap: 12px !important;
          }

          .success-stories-cta {
            align-items: stretch !important;
            flex-direction: column !important;
            padding: 40px 20px !important;
            gap: 24px !important;
          }

          .success-stories-cta-copy,
          .success-stories-cta-actions,
          .success-stories-cta-button {
            width: 100% !important;
          }

          .success-stories-cta-button {
            white-space: normal !important;
          }
        }
      `}</style>
    </>
  );
};

export default SuccessStories;