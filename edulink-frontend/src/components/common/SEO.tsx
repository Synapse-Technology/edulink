import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogType?: string;
}

const SEO: React.FC<SEOProps> = ({ 
  title, 
  description, 
  keywords, 
  ogTitle, 
  ogDescription,
  ogType = 'website'
}) => {
  useEffect(() => {
    const baseTitle = 'EduLink KE';
    const fullTitle = title ? `${title} | ${baseTitle}` : `${baseTitle} | Verified Internships & Graduate Jobs in Kenya`;
    
    // Update title
    document.title = fullTitle;

    // Helper to update meta tags
    const updateMetaTag = (name: string, content: string, attr: 'name' | 'property' = 'name') => {
      if (!content) return;
      let element = document.querySelector(`meta[${attr}="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Update basic meta
    if (description) updateMetaTag('description', description);
    if (keywords) updateMetaTag('keywords', keywords);

    // Update Open Graph
    updateMetaTag('og:title', ogTitle || fullTitle, 'property');
    updateMetaTag('og:description', ogDescription || description || '', 'property');
    updateMetaTag('og:type', ogType, 'property');
    
    // Update Twitter
    updateMetaTag('twitter:title', ogTitle || fullTitle);
    updateMetaTag('twitter:description', ogDescription || description || '');

  }, [title, description, keywords, ogTitle, ogDescription, ogType]);

  return null;
};

export default SEO;
