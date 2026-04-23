/**
 * Success Stories Page
 * Public-facing page showcasing student internship success stories
 * Shows testimonials, journey details, and employer feedback
 */

import React, { useState, useEffect } from 'react';
import { Award, Zap, Users, TrendingUp } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { SEO } from '../components/common';
import { internshipService, type SuccessStory } from '../services/internship/internshipService';
import { showToast } from '../utils/toast';
import SuccessStoryCard from '../components/internship/SuccessStoryCard';

const SuccessStories: React.FC = () => {
  const [stories, setStories] = useState<SuccessStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'recent' | 'featured'>('recent');

  useEffect(() => {
    const fetchStories = async () => {
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
    <Layout>
      <SEO
        title="Success Stories - EduLink KE"
        description="Discover inspiring student success stories from verified internships. Real students, real companies, real career growth."
        keywords="success stories, student internships, career growth, employee testimonials, internship experiences"
      />

      {/* Hero Section */}
      <section className="py-5" style={{background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)'}}>
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-8">
              <h1 className="display-4 fw-bold mb-3 text-white">Success Stories</h1>
              <p className="lead mb-0 text-white fw-500">
                Real students. Real companies. Real career growth.
              </p>
              <p className="text-white-80 mt-2">
                Discover how EduLink-connected students launched their careers with verified internships and professional development.
              </p>
            </div>
            <div className="col-lg-4 text-center">
              <div className="display-1 text-white-50">
                <Award size={120} strokeWidth={1.5} className="text-white opacity-25" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-5 bg-light">
        <div className="container">
          <div className="row g-4 text-center">
            <div className="col-md-4">
              <div className="d-flex flex-column align-items-center p-4 bg-white rounded-3 shadow-sm h-100">
                <div className="display-6 text-success fw-bold mb-2">
                  {stories.length}+
                </div>
                <p className="text-muted mb-0 h-100 d-flex align-items-center">
                  <Users size={40} className="text-success me-2" />
                  <span>Student Success Stories</span>
                </p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="d-flex flex-column align-items-center p-4 bg-white rounded-3 shadow-sm h-100">
                <div className="display-6 text-info fw-bold mb-2">95%</div>
                <p className="text-muted mb-0 h-100 d-flex align-items-center">
                  <TrendingUp size={40} className="text-info me-2" />
                  <span>Internship Completion Rate</span>
                </p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="d-flex flex-column align-items-center p-4 bg-white rounded-3 shadow-sm h-100">
                <div className="display-6 text-warning fw-bold mb-2">500+</div>
                <p className="text-muted mb-0 h-100 d-flex align-items-center">
                  <Zap size={40} className="text-warning me-2" />
                  <span>Students Placed</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filter Tabs */}
      <section className="py-4 border-bottom">
        <div className="container">
          <div className="d-flex gap-3 justify-content-center flex-wrap">
            <button
              className={`btn ${filter === 'recent' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setFilter('recent')}
            >
              Most Recent
            </button>
            <button
              className={`btn ${filter === 'featured' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setFilter('featured')}
            >
              Featured Stories
            </button>
            <button
              className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setFilter('all')}
            >
              View All
            </button>
          </div>
        </div>
      </section>

      {/* Success Stories Grid */}
      <section className="py-5">
        <div className="container">
          {loading ? (
            <div className="row g-4">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div key={idx} className="col-lg-4 col-md-6">
                  <div className="card placeholder-wave" aria-hidden="true">
                    <div className="card-body">
                      <p className="card-text placeholder col-7"></p>
                      <p className="card-text placeholder"></p>
                      <p className="card-text placeholder col-4"></p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredStories.length > 0 ? (
            <div className="row g-4">
              {filteredStories.map((story) => (
                <div key={story.id} className="col-lg-4 col-md-6">
                  <SuccessStoryCard story={story} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-5">
              <Award size={64} className="text-muted mb-3" />
              <h4 className="text-muted">No Success Stories Yet</h4>
              <p className="text-muted mb-0">
                Check back soon for inspiring stories from EduLink-connected students!
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-5 bg-primary text-white">
        <div className="container text-center">
          <h2 className="mb-3 fw-bold">Ready to Start Your Success Story?</h2>
          <p className="lead mb-4">
            Join thousands of verified students accessing trusted internship opportunities.
          </p>
          <div className="d-flex gap-3 justify-content-center flex-wrap">
            <a href="/opportunities" className="btn btn-light btn-lg">
              Browse Opportunities
            </a>
            <a href="/register" className="btn btn-outline-light btn-lg">
              Get Started
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default SuccessStories;
