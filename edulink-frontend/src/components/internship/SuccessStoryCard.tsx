/**
 * Success Story Card Component
 * Displays a single student success story with testimonial, employer feedback, and journey details
 */

import React from 'react';
import { Building2, Calendar, CheckCircle, Quote, Star, ArrowUpRight } from 'lucide-react';
import type { SuccessStory } from '../../services/internship/internshipService';

interface SuccessStoryCardProps {
  story: SuccessStory;
  isDarkMode?: boolean;
}

const SuccessStoryCard: React.FC<SuccessStoryCardProps> = ({ story, isDarkMode = false }) => {
  return (
    <div className={`group relative flex flex-col h-100 rounded-2xl overflow-hidden transition-all duration-500 hover:translate-y-[-10px] ${
      isDarkMode 
        ? 'bg-slate-900 border border-slate-800 shadow-lg' 
        : 'bg-white border border-slate-100 shadow-md'
    }`}>
      {/* Brand Accent Bar */}
      <div className="h-1.5 w-full bg-edulink-primary"></div>

      {/* Main Content Container */}
      <div className="p-6 flex-grow flex flex-col">
        {/* Header Section: Student Profile & Badge */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg overflow-hidden ${
              isDarkMode ? 'bg-slate-800 text-edulink-primary' : 'bg-slate-50 text-edulink-primary'
            }`}>
              {story.student_name.charAt(0)}
            </div>
            <div>
              <h4 className={`font-bold text-base mb-0.5 tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {story.student_name}
              </h4>
              <div className="flex items-center gap-1.5">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={10} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verified Alumnus</span>
              </div>
            </div>
          </div>
          
          <div className={`p-2 rounded-lg transition-colors duration-300 ${
            isDarkMode ? 'bg-slate-800 text-slate-400 group-hover:bg-edulink-primary group-hover:text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-edulink-primary group-hover:text-white'
          }`}>
            <ArrowUpRight size={16} />
          </div>
        </div>

        {/* Testimonial Section with Background Quote */}
        <div className="relative mb-6">
          <Quote 
            size={40} 
            className={`absolute -top-2 -left-2 opacity-[0.05] ${isDarkMode ? 'text-white' : 'text-slate-900'}`} 
            fill="currentColor" 
          />
          <blockquote className={`relative z-10 text-base leading-relaxed font-medium italic ${
            isDarkMode ? 'text-slate-300' : 'text-slate-600'
          }`}>
            "{story.student_testimonial}"
          </blockquote>
        </div>

        {/* Employer Highlight Section */}
        <div className={`mt-auto p-4 rounded-xl border transition-all duration-300 ${
          isDarkMode 
            ? 'bg-slate-800/40 border-slate-700' 
            : 'bg-slate-50 border-slate-100 group-hover:bg-white group-hover:shadow-sm'
        }`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-white shadow-sm'}`}>
              <Building2 size={16} className="text-edulink-primary" />
            </div>
            <div>
              <p className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Hired By</p>
              <h5 className={`font-bold text-sm mb-0 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                {story.employer_name}
              </h5>
            </div>
          </div>

          {story.employer_feedback && (
            <div className="relative pl-3 border-l-2 border-edulink-primary/30">
              <p className={`text-[11px] leading-relaxed italic ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                "{story.employer_feedback}"
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer: Date & Official Verification Badge */}
      <div className={`px-6 py-4 flex items-center justify-between border-t ${
        isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50/30 border-slate-50'
      }`}>
        <div className="flex items-center gap-2 text-slate-400">
          <Calendar size={12} className="opacity-60" />
          <span className="text-[10px] font-semibold tracking-tight">
            {new Date(story.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        </div>
        
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          <CheckCircle size={10} className="fill-emerald-500 text-white" />
          <span className="text-[9px] font-black uppercase tracking-wider">Certified</span>
        </div>
      </div>
    </div>
  );
};

export default SuccessStoryCard;
