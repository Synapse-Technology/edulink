/**
 * Success Story Card Component
 * Displays a single student success story with testimonial, employer feedback, and journey details
 */

import React from 'react';
import { Award, Building2, Calendar, CheckCircle } from 'lucide-react';
import type { SuccessStory } from '../../services/internship/internshipService';

interface SuccessStoryCardProps {
  story: SuccessStory;
  isDarkMode?: boolean;
}

const SuccessStoryCard: React.FC<SuccessStoryCardProps> = ({ story, isDarkMode = false }) => {
  const getGradientStyle = () => {
    const gradients = [
      'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
      'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
      'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
      'linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)',
    ];
    return gradients[Math.floor(Math.random() * gradients.length)];
  };

  return (
    <div className={`card h-100 shadow-sm border-0 overflow-hidden transition-transform hover-lift ${isDarkMode ? 'bg-dark border-secondary' : 'bg-white'}`}>
      {/* Colored Header with Gradient */}
      <div className="text-white p-4 position-relative overflow-hidden" style={{background: getGradientStyle()}}>
        <div className="position-absolute top-0 end-0 opacity-10" style={{fontSize: '100px', lineHeight: 1}}>
          <i className="bi bi-quote"></i>
        </div>
        
        {/* Star Rating */}
        <div className="d-flex align-items-center gap-2 mb-3 position-relative" style={{zIndex: 1}}>
          {[...Array(5)].map((_, i) => (
            <i key={i} className="bi bi-star-fill" style={{fontSize: '14px'}}></i>
          ))}
        </div>

        {/* Testimonial */}
        <p className="lead fst-italic mb-0 position-relative" style={{zIndex: 1, fontSize: '16px', lineHeight: '1.4'}}>
          "{story.student_testimonial}"
        </p>
      </div>

      {/* Main Content */}
      <div className="card-body p-4">
        {/* Student Info */}
        <div className="mb-4">
          <h6 className={`fw-bold mb-1 ${isDarkMode ? 'text-white' : 'text-dark'}`}>
            {story.student_name}
          </h6>
          <p className={`small ${isDarkMode ? 'text-light opacity-75' : 'text-muted'}`}>
            Student Success
          </p>
        </div>

        {/* Employer Feedback (if available) */}
        {story.employer_feedback && (
          <div className={`p-3 rounded-3 mb-4 border ${isDarkMode ? 'bg-info bg-opacity-10 border-info-subtle' : 'bg-info-subtle border-0'}`}>
            <div className="d-flex gap-2 align-items-start">
              <Building2 size={16} className="text-info flex-shrink-0 mt-1" />
              <div className="small">
                <strong className={isDarkMode ? 'text-info' : 'text-info-emphasis'}>
                  Employer Insight:
                </strong>
                <p className={`mb-0 mt-1 ${isDarkMode ? 'text-light opacity-75' : 'text-muted'}`}>
                  {story.employer_feedback}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Employer Company */}
        <div className={`p-3 rounded-3 mb-4 ${isDarkMode ? 'bg-secundary-subtle border border-secondary-subtle' : 'bg-light border-0'}`}>
          <div className="d-flex align-items-center gap-2">
            <Building2 size={18} className="text-primary flex-shrink-0" />
            <div>
              <h6 className={`mb-0 ${isDarkMode ? 'text-white' : 'text-dark'}`}>
                {story.employer_name}
              </h6>
              <p className={`small mb-0 ${isDarkMode ? 'text-light opacity-75' : 'text-muted'}`}>
                Internship Host
              </p>
            </div>
          </div>
        </div>

        {/* Learning Outcome Badge */}
        <div className="d-flex align-items-center gap-2 mb-3 p-2 rounded-2 bg-success bg-opacity-10">
          <CheckCircle size={18} className="text-success flex-shrink-0" />
          <span className="small text-success fw-bold">Successfully Completed & Certified</span>
        </div>
      </div>

      {/* Footer with Date and Icon */}
      <div className={`px-4 py-3 d-flex justify-content-between align-items-center border-top ${isDarkMode ? 'bg-dark border-secondary' : 'bg-light border-0'}`}>
        <div className="d-flex align-items-center gap-2">
          <Calendar size={14} className={isDarkMode ? 'text-light opacity-50' : 'text-muted'} />
          <small className={isDarkMode ? 'text-light opacity-75' : 'text-muted'}>
            {new Date(story.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </small>
        </div>
        <Award size={16} className="text-warning" />
      </div>

      <style>{`
        .hover-lift {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .hover-lift:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15) !important;
        }

        .transition-transform {
          transition: all 0.3s ease;
        }

        .bg-info-subtle {
          background-color: #e1f5ff;
        }

        .text-info-emphasis {
          color: #01579b;
        }

        .bg-secundary-subtle {
          background-color: #e0e0e0;
        }

        .border-secondary-subtle {
          border-color: #bdbdbd !important;
        }

        @media (max-width: 768px) {
          .card {
            margin-bottom: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default SuccessStoryCard;
