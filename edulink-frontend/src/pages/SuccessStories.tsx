/**
 * Success Stories Page
 * Public-facing page showcasing student internship success stories
 * Editorial design — Playfair Display + DM Sans, dark forest green brand palette
 */
import React, { useState, useEffect } from 'react';
import { SEO } from '../components/common';
import {
  internshipService,
  type SuccessStory,
} from '../services/internship/internshipService';

/* ─── Inline styles as a typed map ──────────────────────────────────────── */
const S: Record<string, React.CSSProperties> = {
  /* Google Fonts injection — add to your index.html instead if preferred */
  root: {
    fontFamily: "'DM Sans', sans-serif",
    color: 'var(--color-text-primary)',
  },

  /* ── Hero ── */
  hero: {
    background: '#1a3c2e',
    padding: '64px 48px 56px',
    position: 'relative',
    overflow: 'hidden',
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: '0.18em',
    color: '#7ec99a',
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
    background: '#7ec99a',
  },
  heroH1: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 42,
    fontWeight: 600,
    color: '#f0f5f2',
    lineHeight: 1.15,
    margin: '0 0 16px',
    letterSpacing: 0,
  },
  heroSub: {
    fontSize: 15,
    color: 'rgba(240,245,242,0.6)',
    fontWeight: 300,
    lineHeight: 1.65,
    maxWidth: 440,
    margin: 0,
  },
  heroBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    border: '1px solid rgba(126,201,154,0.25)',
    borderRadius: 2,
    padding: '8px 14px',
    marginTop: 28,
    fontSize: 12,
    color: '#7ec99a',
    fontWeight: 400,
    letterSpacing: '0.04em',
  },
  heroBgIcon: {
    position: 'absolute',
    right: 48,
    top: '50%',
    transform: 'translateY(-50%)',
    opacity: 0.07,
    pointerEvents: 'none',
  },

  /* ── Stats ── */
  statsSection: {
    background: '#ffffff',
    borderBottom: '0.5px solid rgba(0,0,0,0.08)',
  },
  statsInner: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
  },
  stat: {
    padding: '32px 40px',
    borderRight: '0.5px solid rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  statLast: {
    padding: '32px 40px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  statIcon: {
    width: 24,
    height: 24,
    marginBottom: 12,
    color: '#2d6a4f',
  },
  statNumber: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 36,
    fontWeight: 600,
    color: '#1a3c2e',
    lineHeight: 1,
    letterSpacing: 0,
  },
  statLabel: {
    fontSize: 12,
    color: 'var(--color-text-secondary, #6b7280)',
    fontWeight: 400,
    letterSpacing: '0.02em',
    marginTop: 4,
  },

  /* ── Filters ── */
  filtersSection: {
    padding: '24px 48px',
    borderBottom: '0.5px solid rgba(0,0,0,0.08)',
    background: '#ffffff',
  },
  filterGroup: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 11,
    color: 'var(--color-text-secondary, #6b7280)',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    fontWeight: 500,
    marginRight: 8,
  },

  /* ── Grid section ── */
  gridSection: {
    padding: '48px',
    background: '#f7f8f6',
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
    color: 'var(--color-text-secondary, #6b7280)',
    fontWeight: 500,
  },
  gridCount: {
    fontSize: 12,
    color: 'var(--color-text-secondary, #6b7280)',
    fontWeight: 300,
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 1,
    background: 'rgba(0,0,0,0.08)',
    border: '0.5px solid rgba(0,0,0,0.08)',
  },

  /* ── Story card ── */
  card: {
    background: '#ffffff',
    padding: 28,
    display: 'flex',
    flexDirection: 'column',
    transition: 'background 0.15s ease',
    cursor: 'default',
  },
  cardAvatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: '#e8f0eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 500,
    color: '#2d6a4f',
    marginBottom: 12,
    flexShrink: 0,
  },
  cardTag: {
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#2d6a4f',
    fontWeight: 500,
    marginBottom: 10,
  },
  cardName: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 17,
    fontWeight: 600,
    color: 'var(--color-text-primary, #111)',
    marginBottom: 3,
    lineHeight: 1.3,
  },
  cardRole: {
    fontSize: 12,
    color: 'var(--color-text-secondary, #6b7280)',
    marginBottom: 16,
    fontWeight: 300,
  },
  cardQuote: {
    fontSize: 13,
    lineHeight: 1.75,
    color: 'var(--color-text-secondary, #6b7280)',
    borderLeft: '2px solid #e8f0eb',
    paddingLeft: 14,
    margin: '0 0 20px',
    fontWeight: 300,
    fontStyle: 'italic',
    flex: 1,
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTop: '0.5px solid rgba(0,0,0,0.08)',
    marginTop: 'auto',
  },
  cardCompany: {
    fontSize: 11,
    color: 'var(--color-text-secondary, #6b7280)',
    fontWeight: 400,
    letterSpacing: '0.02em',
  },
  cardDate: {
    fontSize: 10,
    color: 'var(--color-text-secondary, #6b7280)',
    fontWeight: 300,
    opacity: 0.6,
  },

  /* ── Skeleton loading ── */
  skeletonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 1,
    background: 'rgba(0,0,0,0.08)',
    border: '0.5px solid rgba(0,0,0,0.08)',
  },
  skeletonCard: {
    background: '#ffffff',
    padding: 28,
    height: 220,
  },
  skeletonLine: {
    background: '#f0f0f0',
    borderRadius: 2,
    marginBottom: 10,
  },

  /* ── Empty state ── */
  emptyWrap: {
    background: '#ffffff',
    gridColumn: '1 / -1',
    padding: '80px 40px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  emptyH4: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 22,
    fontWeight: 600,
    margin: '16px 0 8px',
    color: 'var(--color-text-primary, #111)',
  },
  emptyP: {
    fontSize: 13,
    color: 'var(--color-text-secondary, #6b7280)',
    fontWeight: 300,
    maxWidth: 380,
    lineHeight: 1.7,
    margin: 0,
  },

  /* ── CTA ── */
  cta: {
    background: '#1a3c2e',
    padding: '64px 48px',
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
    color: '#7ec99a',
    fontWeight: 500,
    marginBottom: 12,
  },
  ctaH2: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 30,
    fontWeight: 600,
    color: '#f0f5f2',
    margin: '0 0 10px',
    lineHeight: 1.2,
    letterSpacing: 0,
  },
  ctaP: {
    fontSize: 13,
    color: 'rgba(240,245,242,0.55)',
    margin: 0,
    fontWeight: 300,
    lineHeight: 1.65,
    maxWidth: 400,
  },
  ctaActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    flexShrink: 0,
  },
  btnPrimary: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    fontWeight: 500,
    padding: '12px 32px',
    background: '#f0f5f2',
    color: '#1a3c2e',
    border: 'none',
    borderRadius: 2,
    cursor: 'pointer',
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    display: 'inline-block',
    textAlign: 'center',
  },
  btnGhost: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    fontWeight: 400,
    padding: '12px 32px',
    background: 'transparent',
    color: 'rgba(240,245,242,0.7)',
    border: '0.5px solid rgba(240,245,242,0.2)',
    borderRadius: 2,
    cursor: 'pointer',
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    display: 'inline-block',
    textAlign: 'center',
  },
};

/* ─── Filter button ──────────────────────────────────────────────────────── */
const FilterBtn: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    className="success-stories-filter-btn"
    onClick={onClick}
    style={{
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 13,
      fontWeight: active ? 500 : 400,
      padding: '7px 18px',
      borderRadius: 2,
      border: active ? '0.5px solid #1a3c2e' : '0.5px solid rgba(0,0,0,0.15)',
      background: active ? '#1a3c2e' : 'transparent',
      color: active ? '#f0f5f2' : 'var(--color-text-secondary, #6b7280)',
      cursor: 'pointer',
      letterSpacing: '0.01em',
      transition: 'all 0.15s ease',
    }}
  >
    {children}
  </button>
);

/* ─── Skeleton card ──────────────────────────────────────────────────────── */
const SkeletonCard: React.FC = () => (
  <div style={S.skeletonCard}>
    <div
      style={{
        ...S.skeletonLine,
        width: 36,
        height: 36,
        borderRadius: '50%',
        marginBottom: 14,
      }}
    />
    <div style={{ ...S.skeletonLine, width: '30%', height: 10 }} />
    <div
      style={{ ...S.skeletonLine, width: '60%', height: 16, marginTop: 4 }}
    />
    <div style={{ ...S.skeletonLine, width: '45%', height: 11 }} />
    <div
      style={{ ...S.skeletonLine, width: '100%', height: 11, marginTop: 12 }}
    />
    <div style={{ ...S.skeletonLine, width: '90%', height: 11 }} />
    <div style={{ ...S.skeletonLine, width: '75%', height: 11 }} />
  </div>
);

/* ─── Story card ─────────────────────────────────────────────────────────── */
const StoryCard: React.FC<{ story: SuccessStory }> = ({ story }) => {
  const [hovered, setHovered] = React.useState(false);

  /* Derive initials from student name if available */
  const initials = story.student_name
    ? story.student_name
        .split(' ')
        .slice(0, 2)
        .map((w: string) => w[0])
        .join('')
        .toUpperCase()
    : '??';

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
        background: hovered ? '#f7f8f6' : '#ffffff',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar */}
      <div style={S.cardAvatar}>{initials}</div>

      <div style={S.cardTag}>Verified success story</div>

      {/* Name & role */}
      <div style={S.cardName}>{story.student_name ?? 'Anonymous'}</div>
      <div style={S.cardRole}>
        {story.employer_name
          ? `Internship with ${story.employer_name}`
          : 'Internship graduate'}
      </div>

      {/* Testimonial quote */}
      {(story.student_testimonial || story.employer_feedback) && (
        <p style={S.cardQuote}>
          {story.student_testimonial || story.employer_feedback}
        </p>
      )}

      {/* Footer: company + date */}
      <div style={S.cardFooter}>
        <span style={S.cardCompany}>
          {story.employer_name ?? 'EduLink partner'}
        </span>
        <span style={S.cardDate}>{displayDate}</span>
      </div>
    </div>
  );
};

/* ─── Empty state ────────────────────────────────────────────────────────── */
const EmptyState: React.FC<{ message?: string }> = ({ message }) => (
  <div style={S.emptyWrap}>
    {/* Decorative icon — award outline */}
    <svg
      width="52"
      height="52"
      viewBox="0 0 52 52"
      fill="none"
      stroke="#2d6a4f"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ opacity: 0.25 }}
    >
      <circle cx="26" cy="20" r="13" />
      <path d="M18 32l-4 16 12-6 12 6-4-16" />
      <path d="M22 20l2.5 2.5L30 16" />
    </svg>

    <h4 style={S.emptyH4}>No success stories yet</h4>
    <p style={S.emptyP}>
      {message ??
        'Check back soon for inspiring accounts from EduLink-connected students.'}
    </p>
  </div>
);

/* ─── Stat icon helpers ──────────────────────────────────────────────────── */
const UsersIcon = () => (
  <svg
    style={S.statIcon}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
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
    strokeWidth="1.2"
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
    strokeWidth="1.2"
    strokeLinecap="round"
  >
    <rect x="2" y="8" width="20" height="13" rx="1.5" />
    <path d="M8 8V6a4 4 0 018 0v2" />
  </svg>
);

const CheckIcon = () => (
  <svg
    width="11"
    height="11"
    viewBox="0 0 11 11"
    fill="none"
    style={{ flexShrink: 0 }}
  >
    <circle cx="5.5" cy="5.5" r="4.5" stroke="#7ec99a" strokeWidth="0.8" />
    <path
      d="M3.5 5.5l1.4 1.4L7.5 4"
      stroke="#7ec99a"
      strokeWidth="0.8"
      strokeLinecap="round"
    />
  </svg>
);

/* ─── Page component ─────────────────────────────────────────────────────── */
const SuccessStories: React.FC = () => {
  const [stories, setStories] = useState<SuccessStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'recent' | 'featured'>('recent');

  useEffect(() => {
    let isMounted = true;
    const fetchStories = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const data = await internshipService.getSuccessStories();
        const published = data.filter(
          (story: SuccessStory) => story.is_published
        );
        const sorted = published.sort(
          (a: SuccessStory, b: SuccessStory) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        if (isMounted) setStories(sorted);
      } catch (error) {
        console.error('Failed to load success stories:', error);
        if (isMounted) {
          setStories([]);
          setLoadError(
            'Success stories are temporarily unavailable. Please check back soon.'
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

  const getFilteredStories = () => {
    switch (filter) {
      case 'recent':
        return stories.slice(0, 9);
      case 'featured':
        return stories.slice(0, 6);
      default:
        return stories;
    }
  };

  const filteredStories = getFilteredStories();
  const employerCount = new Set(
    stories.map(story => story.employer_name).filter(Boolean)
  ).size;

  return (
    <>
      {/* Google Fonts */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=DM+Sans:wght@300;400;500&display=swap"
      />

      <SEO
        title="Success Stories - EduLink KE"
        description="Discover inspiring student success stories from verified internships. Real students, real companies, real career growth."
        keywords="success stories, student internships, career growth, employee testimonials, internship experiences"
      />

      <div style={S.root}>
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="success-stories-hero" style={S.hero}>
          {/* Background decorative icon */}
          <svg
            className="success-stories-hero-icon"
            style={S.heroBgIcon}
            width="240"
            height="240"
            viewBox="0 0 240 240"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="120"
              cy="120"
              r="100"
              stroke="white"
              strokeWidth="0.8"
            />
            <circle
              cx="120"
              cy="80"
              r="22"
              stroke="white"
              strokeWidth="0.8"
              fill="none"
            />
            <path
              d="M84 148 L100 120 L120 132 L140 120 L156 148"
              stroke="white"
              strokeWidth="0.8"
              fill="none"
            />
            <path
              d="M96 180 L96 148 L144 148 L144 180"
              stroke="white"
              strokeWidth="0.8"
              fill="none"
            />
          </svg>

          <div style={S.heroEyebrow}>
            <span style={S.heroEyebrowLine} />
            EduLink KE
          </div>

          <h1 className="success-stories-hero-title" style={S.heroH1}>
            Student Success
            <br />
            Stories
          </h1>

          <p className="success-stories-hero-sub" style={S.heroSub}>
            Real students. Real companies. Real career growth — powered by
            verified internships and professional development across Kenya.
          </p>

          <div className="success-stories-hero-badge" style={S.heroBadge}>
            <CheckIcon />
            Verified internship placements only
          </div>
        </section>

        {/* ── Stats ────────────────────────────────────────────────────── */}
        <section className="success-stories-stats-section" style={S.statsSection}>
          <div className="success-stories-stats" style={S.statsInner}>
            <div className="success-stories-stat" style={S.stat}>
              <UsersIcon />
              <div style={S.statNumber}>
                {loading ? '—' : `${stories.length}+`}
              </div>
              <div style={S.statLabel}>Student success stories</div>
            </div>

            <div className="success-stories-stat" style={S.stat}>
              <TrendIcon />
              <div style={S.statNumber}>
                {loading ? '—' : `${stories.length}`}
              </div>
              <div style={S.statLabel}>Verified placements</div>
            </div>

            <div className="success-stories-stat" style={S.statLast}>
              <BriefcaseIcon />
              <div style={S.statNumber}>
                {loading ? '—' : `${employerCount}`}
              </div>
              <div style={S.statLabel}>Employer hosts represented</div>
            </div>
          </div>
        </section>

        {/* ── Filters ──────────────────────────────────────────────────── */}
        <section className="success-stories-filters-section" style={S.filtersSection}>
          <div className="success-stories-filter-group" style={S.filterGroup}>
            <span className="success-stories-filter-label" style={S.filterLabel}>View</span>
            <FilterBtn
              active={filter === 'recent'}
              onClick={() => setFilter('recent')}
            >
              Most recent
            </FilterBtn>
            <FilterBtn
              active={filter === 'featured'}
              onClick={() => setFilter('featured')}
            >
              Featured
            </FilterBtn>
            <FilterBtn
              active={filter === 'all'}
              onClick={() => setFilter('all')}
            >
              All stories
            </FilterBtn>
          </div>
        </section>

        {/* ── Stories grid ─────────────────────────────────────────────── */}
        <section className="success-stories-grid-section" style={S.gridSection}>
          <div className="success-stories-grid-header" style={S.gridHeader}>
            <span style={S.gridTitle}>Internship experiences</span>
            {!loading && (
              <span style={S.gridCount}>
                {filteredStories.length}{' '}
                {filteredStories.length === 1 ? 'story' : 'stories'}
              </span>
            )}
          </div>

          {loading ? (
            /* Skeleton loader */
            <div className="success-stories-cards-grid" style={S.skeletonGrid}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : filteredStories.length > 0 ? (
            /* Populated grid */
            <div className="success-stories-cards-grid" style={S.cardsGrid}>
              {filteredStories.map(story => (
                <StoryCard key={story.id} story={story} />
              ))}
            </div>
          ) : (
            /* Empty / error state */
            <div className="success-stories-cards-grid" style={S.skeletonGrid}>
              <EmptyState message={loadError ?? undefined} />
            </div>
          )}
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <section className="success-stories-cta" style={S.cta}>
          <div className="success-stories-cta-copy">
            <div style={S.ctaEyebrow}>Begin your journey</div>
            <h2 style={S.ctaH2}>
              Ready to write your
              <br />
              own success story?
            </h2>
            <p style={S.ctaP}>
              Join thousands of verified students accessing trusted internship
              opportunities across Kenya and beyond.
            </p>
          </div>

          <div className="success-stories-cta-actions" style={S.ctaActions}>
            <a className="success-stories-cta-button" href="/opportunities" style={S.btnPrimary}>
              Browse opportunities
            </a>
            <a className="success-stories-cta-button" href="/register" style={S.btnGhost}>
              Create free account
            </a>
          </div>
        </section>
      </div>

      <style>{`
        @media (max-width: 991.98px) {
          .success-stories-hero {
            padding: 56px 28px 48px !important;
          }

          .success-stories-hero-title {
            font-size: 36px !important;
          }

          .success-stories-stats,
          .success-stories-cards-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .success-stories-stat {
            padding: 28px !important;
          }

          .success-stories-grid-section {
            padding: 36px 28px !important;
          }
        }

        @media (max-width: 575.98px) {
          .success-stories-hero {
            padding: 40px 20px 36px !important;
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
            line-height: 1.12 !important;
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
            border-bottom: 0.5px solid rgba(0,0,0,0.08) !important;
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
            background: transparent !important;
            border: 0 !important;
          }

          .success-stories-cards-grid > * {
            border: 0.5px solid rgba(0,0,0,0.08) !important;
          }

          .success-stories-cta {
            align-items: stretch !important;
            flex-direction: column !important;
            padding: 40px 20px !important;
            gap: 24px !important;
          }

          .success-stories-cta-copy {
            width: 100% !important;
          }

          .success-stories-cta-actions {
            width: 100% !important;
          }

          .success-stories-cta-button {
            width: 100% !important;
            white-space: normal !important;
          }
        }
      `}</style>
    </>
  );
};

export default SuccessStories;
