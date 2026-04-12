/**
 * Success Stories Page
 * Public-facing page showcasing student internship success stories
 * Shows testimonials, journey details, and employer feedback
 */

import React, { useState, useEffect, useRef } from 'react';
import { Award, Users, TrendingUp, Sparkles, ArrowRight, MessageSquareQuote } from 'lucide-react';
import { SEO } from '../components/common';
import { internshipService, type SuccessStory } from '../services/internship/internshipService';
import { showToast } from '../utils/toast';
import SuccessStoryCard from '../components/internship/SuccessStoryCard';
import { usePublicStats } from '../hooks/usePublicStats';
import { Link } from 'react-router-dom';

const SuccessStories: React.FC = () => {
  const [stories, setStories] = useState<SuccessStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'recent' | 'featured'>('featured');
  const stats = usePublicStats();
  const hasFetched = useRef(false);

  useEffect(() => {
    const fetchStories = async () => {
      if (hasFetched.current) return;
      hasFetched.current = true;

      try {
        setLoading(true);
        const data = await internshipService.getSuccessStories();
        // Filter only published stories
        const published = data.filter((story: SuccessStory) => story.is_published);
        // Sort by creation date (newest first)
        const sorted = published.sort((a: SuccessStory, b: SuccessStory) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setStories(sorted);
      } catch (error) {
        console.error('Failed to load success stories:', error);
        showToast.error('Failed to load success stories');
      } finally {
        setLoading(false);
      }
    };

    fetchStories();
  }, []);

  const getFilteredStories = () => {
    switch (filter) {
      case 'recent':
        return stories.slice(0, 9);
      case 'featured':
        // For now, featured is just the first 6 stories
        return stories.slice(0, 6);
      default:
        return stories;
    }
  };

  const filteredStories = getFilteredStories();

  return (
    <div className="success-stories-page">
      <SEO
        title="Success Stories - EduLink KE"
        description="Discover inspiring student success stories from verified internships. Real students, real companies, real career growth."
        keywords="success stories, student internships, career growth, employee testimonials, internship experiences"
      />

      {/* Modern Hero Section */}
      <section className="section dark-background py-5 py-lg-10 position-relative overflow-hidden">
        <div className="container position-relative z-1">
          <div className="row justify-content-center text-center">
            <div className="col-lg-10 col-xl-8" data-aos="fade-up">
              <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-primary bg-opacity-10 border border-primary border-opacity-20 text-primary small fw-bold mb-4">
                <Sparkles size={16} />
                <span className="text-uppercase tracking-wider">Inspiring Careers</span>
              </div>
              <h1 className="display-4 fw-bold text-white mb-4 leading-tight">
                Real Stories. <span className="text-primary">Real Growth.</span>
              </h1>
              <p className="lead text-white text-opacity-75 mb-5">
                Discover how thousands of students are bridging the gap between campus and career through EduLink's verified internship ecosystem.
              </p>
              <div className="d-flex flex-wrap gap-3 justify-content-center">
                <Link to="/register" className="btn btn-primary rounded-pill px-5 py-3 fw-bold d-flex align-items-center gap-2">
                  Start Your Journey <ArrowRight size={20} />
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        {/* Background elements */}
        <div className="position-absolute top-0 start-0 w-100 h-100 bg-gradient-to-br from-primary opacity-10 pointer-events-none"></div>
      </section>

      {/* Dynamic Stats Section */}
      <section className="py-0 position-relative z-2">
        <div className="container mt-n5">
          <div className="row g-4 justify-content-center">
            <div className="col-lg-4" data-aos="fade-up" data-aos-delay="100">
              <div className="bg-white rounded-4 p-4 shadow-lg border-0 h-100 d-flex align-items-center gap-4 transition-transform hover-lift">
                <div className="flex-shrink-0 w-16 h-16 rounded-3 bg-success bg-opacity-10 flex items-center justify-center text-success">
                  <Users size={32} />
                </div>
                <div>
                  <div className="h2 fw-black text-dark mb-0">{stats.placements}+</div>
                  <div className="text-muted fw-medium small">Students Placed</div>
                </div>
              </div>
            </div>
            
            <div className="col-lg-4" data-aos="fade-up" data-aos-delay="200">
              <div className="bg-white rounded-4 p-4 shadow-lg border-0 h-100 d-flex align-items-center gap-4 transition-transform hover-lift">
                <div className="flex-shrink-0 w-16 h-16 rounded-3 bg-info bg-opacity-10 flex items-center justify-center text-info">
                  <TrendingUp size={32} />
                </div>
                <div>
                  <div className="h2 fw-black text-dark mb-0">{stats.completionRate}%</div>
                  <div className="text-muted fw-medium small">Completion Rate</div>
                </div>
              </div>
            </div>
            
            <div className="col-lg-4" data-aos="fade-up" data-aos-delay="300">
              <div className="bg-white rounded-4 p-4 shadow-lg border-0 h-100 d-flex align-items-center gap-4 transition-transform hover-lift">
                <div className="flex-shrink-0 w-16 h-16 rounded-3 bg-warning bg-opacity-10 flex items-center justify-center text-warning">
                  <Award size={32} />
                </div>
                <div>
                  <div className="h2 fw-black text-dark mb-0">{stories.length}+</div>
                  <div className="text-muted fw-medium small">Verified Stories</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="section light-background">
        <div className="container">
          {/* Filter Bar */}
          <div className="row align-items-end mb-5 gy-4">
            <div className="col-lg-7" data-aos="fade-right">
              <div className="section-title text-start pb-0 mb-0">
                <h2 className="mb-2">Success Spotlight</h2>
                <p className="text-muted mb-0">Filtering through our most impactful career launches</p>
              </div>
            </div>
            
            <div className="col-lg-5" data-aos="fade-left">
              <div className="d-flex justify-content-lg-end">
                <div className="bg-white p-1 rounded-3 shadow-sm border d-flex gap-1">
                  <button
                    onClick={() => setFilter('featured')}
                    className={`btn btn-sm px-4 py-2 rounded-2 fw-bold transition-all ${filter === 'featured' ? 'btn-primary shadow-sm' : 'btn-link text-muted text-decoration-none'}`}
                  >
                    Featured
                  </button>
                  <button
                    onClick={() => setFilter('recent')}
                    className={`btn btn-sm px-4 py-2 rounded-2 fw-bold transition-all ${filter === 'recent' ? 'btn-primary shadow-sm' : 'btn-link text-muted text-decoration-none'}`}
                  >
                    Recent
                  </button>
                  <button
                    onClick={() => setFilter('all')}
                    className={`btn btn-sm px-4 py-2 rounded-2 fw-bold transition-all ${filter === 'all' ? 'btn-primary shadow-sm' : 'btn-link text-muted text-decoration-none'}`}
                  >
                    All Stories
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stories Grid */}
          {loading ? (
            <div className="row g-4">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div key={idx} className="col-lg-4 col-md-6">
                  <div className="bg-white rounded-4 h-96 animate-pulse border"></div>
                </div>
              ))}
            </div>
          ) : filteredStories.length > 0 ? (
            <div className="row g-4">
              {filteredStories.map((story) => (
                <div key={story.id} className="col-lg-4 col-md-6" data-aos="fade-up">
                  <SuccessStoryCard story={story} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-5 bg-white rounded-4 border-2 border-dashed" data-aos="zoom-in">
              <div className="w-20 h-20 bg-light rounded-circle d-flex align-items-center justify-content-center mx-auto mb-4 text-muted">
                <MessageSquareQuote size={40} />
              </div>
              <h3 className="h4 fw-bold text-dark mb-2">No stories found</h3>
              <p className="text-muted max-w-md mx-auto px-3">
                We're currently gathering more success stories from our latest cohort of interns. Check back soon!
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Powerful CTA Section */}
      <section className="section py-5 py-lg-10 position-relative overflow-hidden" style={{background: 'var(--accent-color)'}}>
        <div className="container position-relative z-1 text-center">
          <div className="row justify-content-center">
            <div className="col-lg-8" data-aos="fade-up">
              <h2 className="display-5 fw-black text-white mb-4">
                Be the next name on this page.
              </h2>
              <p className="lead text-white text-opacity-90 mb-5">
                Join {stats.students}+ students already using EduLink to secure verified internships and build professional credibility.
              </p>
              <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center">
                <Link to="/opportunities" className="btn btn-light btn-lg rounded-pill px-5 py-3 fw-black text-primary shadow-lg border-0">
                  Find Your Internship
                </Link>
                <Link to="/register" className="btn btn-outline-light btn-lg rounded-pill px-5 py-3 fw-bold">
                  Join the Platform
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        {/* Background elements */}
        <div className="position-absolute top-0 start-0 w-100 h-100 opacity-10 pointer-events-none">
          <div className="position-absolute top-0 end-0 mt-n5 me-n5 w-96 h-96 bg-white rounded-circle blur-3xl"></div>
          <div className="position-absolute bottom-0 start-0 mb-n5 ms-n5 w-96 h-96 bg-black rounded-circle blur-3xl"></div>
        </div>
      </section>
      
      <style>{`
        .success-stories-page {
          overflow-x: hidden;
        }
        
        .mt-n5 {
          margin-top: -3rem !important;
        }
        
        .fw-black {
          font-weight: 900 !important;
        }
        
        .leading-tight {
          line-height: 1.2 !important;
        }
        
        .rounded-4 {
          border-radius: 1.5rem !important;
        }
        
        .h-96 {
          height: 24rem !important;
        }
        
        .w-16 {
          width: 4rem !important;
        }
        
        .h-16 {
          height: 4rem !important;
        }
        
        .w-20 {
          width: 5rem !important;
        }
        
        .h-20 {
          height: 5rem !important;
        }
        
        .w-96 {
          width: 24rem !important;
        }
        
        .h-96 {
          height: 24rem !important;
        }
        
        .blur-3xl {
          filter: blur(64px) !important;
        }
        
        .hover-lift {
          transition: transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out;
        }
        
        .hover-lift:hover {
          transform: translateY(-5px);
          box-shadow: 0 1rem 3rem rgba(0,0,0,.175) !important;
        }
        
        @media (max-width: 991.98px) {
          .display-4 {
            font-size: 2.5rem;
          }
          .display-5 {
            font-size: 2rem;
          }
        }
      `}</style>
    </div>
  );
};

export default SuccessStories;
