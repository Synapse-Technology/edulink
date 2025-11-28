import React from 'react';
import { Link } from 'react-router-dom';
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
  const getTypeBadgeColor = () => {
    switch (type) {
      case 'internship':
        return 'bg-blue-100 text-blue-800';
      case 'job':
        return 'bg-green-100 text-green-800';
      case 'graduate':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'internship':
        return 'Internship';
      case 'job':
        return 'Full-time';
      case 'graduate':
        return 'Graduate Program';
      default:
        return 'Opportunity';
    }
  };

  return (
    <div className={`opportunity-card border border-gray-200 bg-white rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-edulink-primary ${className}`}>
      {image && (
        <div className="card-img">
          <img 
            src={image} 
            alt={title}
            className="w-full h-48 object-cover"
          />
        </div>
      )}
      
      <div className="card-content p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor()}`}>
                {getTypeLabel()}
              </span>
              {postedDate && (
                <span className="text-xs text-gray-500">
                  {postedDate}
                </span>
              )}
            </div>
            
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              <Link 
                to={`/opportunities/${title.toLowerCase().replace(/\s+/g, '-')}`}
                className="text-gray-900 hover:text-edulink-primary transition-colors"
              >
                {title}
              </Link>
            </h3>
            
            <p className="text-sm text-gray-600 mb-2">{company}</p>
            
            {location && (
              <div className="flex items-center text-sm text-gray-500 mb-2">
                <i className="bi bi-geo-alt mr-1"></i>
                <span>{location}</span>
              </div>
            )}
          </div>
          
          {onBookmark && (
            <button
              onClick={onBookmark}
              className={`p-2 rounded-full transition-colors ${
                isBookmarked 
                  ? 'text-edulink-primary bg-edulink-primary/10' 
                  : 'text-gray-400 hover:text-edulink-primary hover:bg-edulink-primary/10'
              }`}
            >
              <i className={`bi ${isBookmarked ? 'bi-bookmark-fill' : 'bi-bookmark'}`}></i>
            </button>
          )}
        </div>

        {description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-3">
            {description}
          </p>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {tags.slice(0, 3).map((tag, index) => (
              <span 
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700"
              >
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                +{tags.length - 3} more
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            {price && (
              <span className="text-lg font-bold text-edulink-primary">
                {price}
              </span>
            )}
            {duration && (
              <span className="text-sm text-gray-500">
                {duration}
              </span>
            )}
          </div>
          
          {onApply && (
            <Button 
              variant="primary" 
              size="sm"
              onClick={onApply}
            >
              Apply Now
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Card;