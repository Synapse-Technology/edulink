import React, { useState, useEffect } from 'react';

interface Resource {
  id: number;
  title: string;
  category: 'article' | 'guide' | 'tool' | 'template' | 'video';
  description: string;
  content: string;
  tags: string[];
  readTime: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  author: string;
  date: string;
  featured?: boolean;
}

const Search: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Resource[]>([]);
  const [highlightedText, setHighlightedText] = useState<string[]>([]);

  // Mock educational resources data
  const resourcesData: Resource[] = [
    {
      id: 1,
      title: 'Complete Guide to Resume Writing for Students',
      category: 'guide',
      description: 'Learn how to craft a compelling resume that stands out to employers and showcases your skills effectively.',
      content: 'A comprehensive guide covering resume structure, formatting, content optimization, and industry-specific tips for students and recent graduates.',
      tags: ['Resume', 'Career', 'Students', 'Writing'],
      readTime: '15 min',
      difficulty: 'beginner',
      author: 'Career Expert Team',
      date: '2 days ago',
      featured: true
    },
    {
      id: 2,
      title: 'Interview Preparation Checklist',
      category: 'template',
      description: 'A comprehensive checklist to help you prepare for job interviews and make a great impression.',
      content: 'Step-by-step checklist covering research, practice questions, outfit planning, and follow-up strategies for successful interviews.',
      tags: ['Interview', 'Preparation', 'Checklist', 'Career'],
      readTime: '10 min',
      difficulty: 'beginner',
      author: 'HR Professionals',
      date: '1 week ago'
    },
    {
      id: 3,
      title: 'Networking Strategies for Career Growth',
      category: 'article',
      description: 'Discover effective networking techniques to build professional relationships and advance your career.',
      content: 'Learn how to build meaningful professional connections, leverage social media, attend networking events, and maintain relationships.',
      tags: ['Networking', 'Career', 'Professional', 'Growth'],
      readTime: '12 min',
      difficulty: 'intermediate',
      author: 'Industry Expert',
      date: '3 days ago'
    },
    {
      id: 4,
      title: 'Salary Negotiation Tactics',
      category: 'video',
      description: 'Master the art of salary negotiation with proven strategies and techniques.',
      content: 'Video tutorial covering research, timing, communication strategies, and common pitfalls to avoid during salary negotiations.',
      tags: ['Salary', 'Negotiation', 'Career', 'Finance'],
      readTime: '20 min',
      difficulty: 'advanced',
      author: 'Career Coach',
      date: '1 day ago'
    },
    {
      id: 5,
      title: 'LinkedIn Profile Optimization Tool',
      category: 'tool',
      description: 'Interactive tool to optimize your LinkedIn profile for maximum visibility and networking opportunities.',
      content: 'Step-by-step tool that analyzes your LinkedIn profile and provides personalized recommendations for improvement.',
      tags: ['LinkedIn', 'Social Media', 'Profile', 'Optimization'],
      readTime: '8 min',
      difficulty: 'beginner',
      author: 'Digital Marketing Team',
      date: '5 days ago'
    },
    {
      id: 6,
      title: 'Career Planning Workbook',
      category: 'template',
      description: 'A structured workbook to help you plan your career path and set achievable goals.',
      content: 'Comprehensive workbook with exercises for self-assessment, goal setting, skill gap analysis, and action planning.',
      tags: ['Career Planning', 'Goals', 'Self-Assessment', 'Development'],
      readTime: '25 min',
      difficulty: 'intermediate',
      author: 'Career Development Expert',
      date: '1 week ago',
      featured: true
    }
  ];

  // Search functionality
  const performSearch = () => {
    setIsSearching(true);
    
    // Simulate API call delay
    setTimeout(() => {
      let results = [...resourcesData];
      
      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        results = results.filter(result => 
          result.title.toLowerCase().includes(query) ||
          result.description.toLowerCase().includes(query) ||
          result.content.toLowerCase().includes(query) ||
          result.tags.some(tag => tag.toLowerCase().includes(query))
        );
      }
      
      // Filter by category
      if (selectedCategory !== 'all') {
        results = results.filter(result => result.category === selectedCategory);
      }
      
      // Filter by difficulty
      if (selectedDifficulty !== 'all') {
        results = results.filter(result => result.difficulty === selectedDifficulty);
      }
      
      // Sort results
      if (sortBy === 'date') {
        results.sort((a, b) => {
          const dateA = a.date.includes('day') ? parseInt(a.date) : parseInt(a.date) * 7;
          const dateB = b.date.includes('day') ? parseInt(b.date) : parseInt(b.date) * 7;
          return dateA - dateB;
        });
      } else if (sortBy === 'readTime') {
        results.sort((a, b) => parseInt(a.readTime) - parseInt(b.readTime));
      } else if (sortBy === 'difficulty') {
        const difficultyOrder = { beginner: 1, intermediate: 2, advanced: 3 };
        results.sort((a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]);
      }
      
      setSearchResults(results);
      setIsSearching(false);
      
      // Set highlighted text for content highlighting
      if (searchQuery.trim()) {
        setHighlightedText(searchQuery.toLowerCase().split(' ').filter(word => word.length > 2));
      } else {
        setHighlightedText([]);
      }
    }, 800);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch();
  };

  // Auto-search when filters change
  useEffect(() => {
    if (searchQuery || selectedCategory !== 'all' || selectedDifficulty !== 'all') {
      performSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedDifficulty, sortBy]);

  // Highlight text function
  const highlightText = (text: string) => {
    if (!highlightedText.length) return text;
    
    let highlightedTextContent = text;
    highlightedText.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedTextContent = highlightedTextContent.replace(regex, '<mark class="search-highlight">$1</mark>');
    });
    
    return highlightedTextContent;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'article': return 'bg-blue-100 text-blue-800';
      case 'guide': return 'bg-green-100 text-green-800';
      case 'tool': return 'bg-purple-100 text-purple-800';
      case 'template': return 'bg-orange-100 text-orange-800';
      case 'video': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'article': return 'bi-file-text';
      case 'guide': return 'bi-book';
      case 'tool': return 'bi-tools';
      case 'template': return 'bi-layout-text-window';
      case 'video': return 'bi-play-circle';
      default: return 'bi-file-text';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-success';
      case 'intermediate': return 'text-warning';
      case 'advanced': return 'text-danger';
      default: return 'text-muted';
    }
  };

  return (
    <>
      {/* Page Title */}
      <div className="page-title" data-aos="fade">
        <div className="heading">
          <div className="container">
            <div className="row d-flex justify-content-center text-center">
              <div className="col-lg-8">
                <h1>Career Resources Hub</h1>
                <p className="mb-0">Access comprehensive guides, tools, and templates to advance your career</p>
              </div>
            </div>
          </div>
        </div>
        <nav className="breadcrumbs">
          <div className="container">
            <ol>
              <li><a href="/">Home</a></li>
              <li className="current">Search</li>
            </ol>
          </div>
        </nav>
      </div>

      <main className="main">
        {/* Enhanced Search Section */}
        <section className="search-section section">
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-lg-10">
                {/* Advanced Search Form */}
                <div className="search-box" data-aos="fade-up" data-aos-delay="100">
                  <form onSubmit={handleSearch} className="mb-4">
                    <div className="row g-3">
                      {/* Main Search Input */}
                      <div className="col-lg-6">
                        <div className="input-group">
                          <span className="input-group-text">
                            <i className="bi bi-search"></i>
                          </span>
                          <input
                            type="text"
                            className="form-control form-control-lg"
                            placeholder="Search career guides, tools, templates, and resources..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </div>
                      </div>
                      
                      {/* Category Filter */}
                      <div className="col-lg-2">
                        <select
                          className="form-select form-select-lg"
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                          <option value="all">All Categories</option>
                          <option value="article">Articles</option>
                          <option value="guide">Guides</option>
                          <option value="tool">Tools</option>
                          <option value="template">Templates</option>
                          <option value="video">Videos</option>
                        </select>
                      </div>
                      
                      {/* Difficulty Filter */}
                      <div className="col-lg-2">
                        <select
                          className="form-select form-select-lg"
                          value={selectedDifficulty}
                          onChange={(e) => setSelectedDifficulty(e.target.value)}
                        >
                          <option value="all">All Levels</option>
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                        </select>
                      </div>
                      
                      {/* Search Button */}
                      <div className="col-lg-2">
                        <button
                          type="submit"
                          className="btn btn-primary btn-lg w-100"
                          disabled={isSearching}
                        >
                          {isSearching ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              Searching...
                            </>
                          ) : (
                            'Search'
                          )}
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Quick Search Tags */}
                  <div className="quick-search-tags" data-aos="fade-up" data-aos-delay="200">
                    <p className="text-muted mb-2">Popular topics:</p>
                    <div className="d-flex flex-wrap gap-2">
                      {['Resume Writing', 'Interview Tips', 'Networking', 'Career Planning', 'Salary Negotiation'].map(tag => (
                        <button
                          key={tag}
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => {
                            setSearchQuery(tag);
                            setTimeout(() => performSearch(), 100);
                          }}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="search-results" data-aos="fade-up" data-aos-delay="300">
                    {/* Results Header */}
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <h5 className="mb-0">
                        Found <span className="text-primary">{searchResults.length}</span> resources
                      </h5>
                      <div className="d-flex align-items-center gap-3">
                        <span className="text-muted">Sort by:</span>
                        <select
                          className="form-select form-select-sm"
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          style={{ width: 'auto' }}
                        >
                          <option value="relevance">Relevance</option>
                          <option value="date">Date Added</option>
                          <option value="readTime">Read Time</option>
                          <option value="difficulty">Difficulty</option>
                        </select>
                      </div>
                    </div>

                    {/* Results Grid */}
                    <div className="row g-4">
                      {searchResults.map((result, index) => (
                        <div key={result.id} className="col-lg-6 col-xl-4" data-aos="fade-up" data-aos-delay={index * 100}>
                          <div className="card resource-card h-100 shadow-sm">
                            <div className="card-body d-flex flex-column">
                              {/* Card Header */}
                              <div className="d-flex justify-content-between align-items-start mb-3">
                                <span className={`badge ${getCategoryColor(result.category)}`}>
                                  <i className={`bi ${getCategoryIcon(result.category)} me-1`}></i>
                                  {result.category.charAt(0).toUpperCase() + result.category.slice(1)}
                                </span>
                                {result.featured && (
                                  <span className="badge bg-warning text-dark">
                                    <i className="bi bi-star-fill me-1"></i>
                                    Featured
                                  </span>
                                )}
                              </div>

                              {/* Title and Author */}
                              <div className="mb-3">
                                <h5 className="card-title mb-2">
                                  <span dangerouslySetInnerHTML={{ __html: highlightText(result.title) }} />
                                </h5>
                                <h6 className="card-subtitle text-muted mb-1">
                                  by {result.author}
                                </h6>
                                <div className="d-flex align-items-center gap-3 text-muted small">
                                  <span>
                                    <i className="bi bi-clock me-1"></i>
                                    {result.readTime}
                                  </span>
                                  <span className={getDifficultyColor(result.difficulty)}>
                                    <i className="bi bi-bar-chart me-1"></i>
                                    {result.difficulty.charAt(0).toUpperCase() + result.difficulty.slice(1)}
                                  </span>
                                  <span>
                                    <i className="bi bi-calendar me-1"></i>
                                    {result.date}
                                  </span>
                                </div>
                              </div>

                              {/* Description */}
                              <p className="card-text flex-grow-1">
                                <span dangerouslySetInnerHTML={{ __html: highlightText(result.description) }} />
                              </p>

                              {/* Tags */}
                              <div className="mb-3">
                                <div className="d-flex flex-wrap gap-1">
                                  {result.tags.slice(0, 3).map(tag => (
                                    <small key={tag} className="badge bg-light text-dark">
                                      <span dangerouslySetInnerHTML={{ __html: highlightText(tag) }} />
                                    </small>
                                  ))}
                                  {result.tags.length > 3 && (
                                    <small className="text-muted">+{result.tags.length - 3} more</small>
                                  )}
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="d-grid gap-2">
                                <button className="btn btn-primary btn-sm">
                                  <i className="bi bi-book me-1"></i>
                                  Read Resource
                                </button>
                                <button className="btn btn-outline-secondary btn-sm">
                                  <i className="bi bi-bookmark me-1"></i>
                                  Save for Later
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Load More Button */}
                    <div className="text-center mt-5">
                      <button className="btn btn-outline-primary">
                        Load More Opportunities
                      </button>
                    </div>
                  </div>
                )}

                {/* No Results */}
                {searchResults.length === 0 && !isSearching && (searchQuery || selectedCategory !== 'all' || selectedDifficulty !== 'all') && (
                  <div className="text-center py-5" data-aos="fade-up" data-aos-delay="300">
                    <div className="mb-4">
                      <i className="bi bi-search" style={{ fontSize: '4rem', color: '#dee2e6' }}></i>
                    </div>
                    <h5 className="text-muted mb-2">No resources found</h5>
                    <p className="text-muted mb-4">Try adjusting your search criteria or browse all resources.</p>
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('all');
                        setSelectedDifficulty('all');
                        setSearchResults([]);
                      }}
                    >
                      Clear Filters
                    </button>
                  </div>
                )}

                {/* Initial State */}
                {searchResults.length === 0 && !isSearching && !searchQuery && selectedCategory === 'all' && selectedDifficulty === 'all' && (
                  <div className="text-center py-5" data-aos="fade-up" data-aos-delay="300">
                    <div className="mb-4">
                      <i className="bi bi-search" style={{ fontSize: '4rem', color: '#dee2e6' }}></i>
                    </div>
                    <h5 className="text-muted mb-2">Start exploring career resources</h5>
                    <p className="text-muted">Use the search bar above to find career guides, tools, templates, and educational resources.</p>
                    <div className="mt-4">
                      <p className="text-muted mb-2">Or try one of these popular topics:</p>
                      <div className="d-flex flex-wrap justify-content-center gap-2">
                        {['Resume Writing', 'Interview Tips', 'Networking', 'Career Planning', 'Salary Negotiation'].map(tag => (
                          <button
                            key={tag}
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => {
                              setSearchQuery(tag);
                              setTimeout(() => performSearch(), 100);
                            }}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <style>{`
        /* Search Section */
        .search-section {
          padding: 60px 0;
          background: #f8f9fa;
          min-height: 70vh;
        }

        .search-box {
          background: #fff;
          border-radius: 18px;
          box-shadow: 0 2px 16px rgba(0,0,0,0.07);
          padding: 2.5rem 2rem;
          margin-bottom: 2rem;
        }

        .input-group-text {
          background: transparent;
          border: 1px solid #dee2e6;
          border-right: none;
          color: #6c757d;
        }

        .form-control, .form-select {
          border: 1px solid #dee2e6;
          transition: all 0.3s ease;
        }

        .form-control:focus, .form-select:focus {
          border-color: var(--accent-color);
          box-shadow: 0 0 0 0.25rem rgba(var(--accent-color-rgb), 0.25);
        }

        .form-control-lg, .form-select-lg {
          font-size: 1.1rem;
          padding: 0.75rem 1rem;
        }

        /* Quick Search Tags */
        .quick-search-tags {
          margin-top: 1.5rem;
        }

        .quick-search-tags .btn-outline-secondary {
          border-color: #dee2e6;
          color: #6c757d;
          transition: all 0.3s ease;
        }

        .quick-search-tags .btn-outline-secondary:hover {
          background-color: var(--accent-color);
          border-color: var(--accent-color);
          color: #fff;
        }

        /* Search Results */
        .search-results {
          margin-top: 2rem;
        }

        .resource-card {
          border: 1px solid #e9ecef;
          border-radius: 12px;
          transition: all 0.3s ease;
          height: 100%;
        }

        .resource-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.1) !important;
        }

        .badge {
          font-size: 0.75rem;
          padding: 0.375rem 0.75rem;
          border-radius: 50rem;
        }

        /* Search Highlight */
        .search-highlight {
          background: #ffe066;
          color: #222;
          border-radius: 3px;
          padding: 0 2px;
          transition: background 0.3s;
        }

        /* Page Title */
        .page-title {
          --default-color: var(--contrast-color);
          --background-color: var(--accent-color);
          --heading-color: var(--contrast-color);
          color: var(--default-color);
          background-color: var(--background-color);
          position: relative;
        }

        .page-title .heading {
          position: relative;
          padding: 80px 0;
          border-top: 1px solid rgba(var(--default-color-rgb), 0.1);
        }

        .page-title .heading h1 {
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--heading-color);
        }

        .page-title nav {
          background-color: color-mix(in srgb, var(--accent-color) 90%, black 5%);
          padding: 20px 0;
        }

        .page-title nav ol {
          display: flex;
          flex-wrap: wrap;
          list-style: none;
          margin: 0;
          font-size: 1rem;
          font-weight: 400;
          padding: 0;
        }

        .page-title nav ol li + li {
          padding-left: 10px;
        }

        .page-title nav ol li + li::before {
          content: "/";
          display: inline-block;
          padding-right: 10px;
          color: color-mix(in srgb, var(--contrast-color), transparent 70%);
        }

        .page-title nav ol li.current {
          color: var(--contrast-color);
          font-weight: 400;
        }

        .page-title nav a {
          color: var(--contrast-color);
        }

        .page-title nav a:hover {
          color: var(--accent-color);
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .search-box {
            padding: 1.5rem 1rem;
          }
          
          .quick-search-tags .d-flex {
            justify-content: center;
          }
        }
      `}</style>
    </>
  );
};

export default Search;