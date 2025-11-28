import React, { useState, useEffect } from 'react';

interface Opportunity {
  id: number;
  title: string;
  company: string;
  location: string;
  salary: string;
  description: string;
  type: 'internship' | 'graduate' | 'job';
  category: 'tech' | 'marketing' | 'finance' | 'healthcare' | 'engineering';
  duration: string;
  postedDate: string;
  tags: string[];
  featured: boolean;
  companyLogo: string;
  image: string;
}

interface Employer {
  id: number;
  name: string;
  logo: string;
  description: string;
}

interface Testimonial {
  id: number;
  name: string;
  role: string;
  quote: string;
  avatar: string;
}

const Opportunities: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [filteredOpportunities, setFilteredOpportunities] = useState<Opportunity[]>([]);

  // Mock data
  const mockOpportunities: Opportunity[] = [
    {
      id: 1,
      title: 'Software Development Intern',
      company: 'Synapse Technologies',
      location: 'Nairobi, Kenya',
      salary: 'KES 40,000/mo',
      description: 'Join our dynamic team and gain hands-on experience with modern web technologies.',
      type: 'internship',
      category: 'tech',
      duration: '3 months',
      postedDate: '2 days ago',
      tags: ['Python', 'Django', 'Full-time'],
      featured: true,
      companyLogo: 'assets/img/partner1.png',
      image: 'assets/img/course-1.jpg'
    },
    {
      id: 2,
      title: 'Digital Marketing Assistant',
      company: 'Creative Hub Inc.',
      location: 'Mombasa, Kenya',
      salary: 'KES 35,000/mo',
      description: 'Assist in developing and executing digital marketing strategies for various clients.',
      type: 'job',
      category: 'marketing',
      duration: '6 months',
      postedDate: '1 week ago',
      tags: ['SEO', 'Content', 'Remote'],
      featured: false,
      companyLogo: 'assets/img/partner2.png',
      image: 'assets/img/course-2.jpg'
    },
    {
      id: 3,
      title: 'Finance & Accounting Intern',
      company: 'Kenya Trust Bank',
      location: 'Kisumu, Kenya',
      salary: 'KES 38,000/mo',
      description: 'Gain practical experience in financial analysis and investment research.',
      type: 'internship',
      category: 'finance',
      duration: '4 months',
      postedDate: '5 days ago',
      tags: ['Excel', 'CPA', 'Graduate'],
      featured: false,
      companyLogo: 'assets/img/partner3.png',
      image: 'assets/img/course-3.jpg'
    },
    {
      id: 4,
      title: 'Healthcare Assistant',
      company: 'HealthFirst',
      location: 'Nairobi, Kenya',
      salary: 'KES 30,000/mo',
      description: 'Provide essential healthcare support and patient care services.',
      type: 'job',
      category: 'healthcare',
      duration: 'Full-time',
      postedDate: '1 day ago',
      tags: ['Patient Care', 'Full-time'],
      featured: false,
      companyLogo: 'assets/img/team/team-1.jpg',
      image: 'assets/img/events-item-1.jpg'
    },
    {
      id: 5,
      title: 'Mechanical Engineering Intern',
      company: 'MechWorks',
      location: 'Eldoret, Kenya',
      salary: 'KES 42,000/mo',
      description: 'Work on real engineering projects with experienced professionals.',
      type: 'internship',
      category: 'engineering',
      duration: '6 months',
      postedDate: '3 days ago',
      tags: ['AutoCAD', 'Internship'],
      featured: true,
      companyLogo: 'assets/img/team/team-2.jpg',
      image: 'assets/img/events-item-2.jpg'
    },
    {
      id: 6,
      title: 'Remote Data Analyst',
      company: 'Data Insights',
      location: 'Remote',
      salary: 'KES 50,000/mo',
      description: 'Analyze data and provide insights for business decision making.',
      type: 'job',
      category: 'tech',
      duration: 'Full-time',
      postedDate: '1 week ago',
      tags: ['SQL', 'Python', 'Remote'],
      featured: true,
      companyLogo: 'assets/img/trainers/trainer-1.jpg',
      image: 'assets/img/web.jpg'
    }
  ];

  const employers: Employer[] = [
    { id: 1, name: 'Synapse Technologies', logo: 'assets/img/partner1.png', description: 'Leading tech company' },
    { id: 2, name: 'Creative Hub Inc.', logo: 'assets/img/partner2.png', description: 'Marketing agency' },
    { id: 3, name: 'Kenya Trust Bank', logo: 'assets/img/partner3.png', description: 'Financial services' },
    { id: 4, name: 'HealthFirst', logo: 'assets/img/team/team-1.jpg', description: 'Healthcare provider' },
    { id: 5, name: 'MechWorks', logo: 'assets/img/team/team-2.jpg', description: 'Engineering firm' },
    { id: 6, name: 'Data Insights', logo: 'assets/img/trainers/trainer-1.jpg', description: 'Analytics company' }
  ];

  const testimonials: Testimonial[] = [
    {
      id: 1,
      name: 'Mary W.',
      role: 'Student, JKUAT',
      quote: 'I landed my first internship through EduLink and gained real-world experience. The process was smooth and safe!',
      avatar: 'assets/img/testimonials/testimonials-1.jpg'
    },
    {
      id: 2,
      name: 'James K.',
      role: 'HR, Synapse Technologies',
      quote: 'EduLink helped us find talented interns who matched our needs. The digital tracking tools are a game changer.',
      avatar: 'assets/img/testimonials/testimonials-2.jpg'
    },
    {
      id: 3,
      name: 'Dr. Achieng',
      role: 'Dean, Partner Institution',
      quote: 'Our students now access verified opportunities and get certified for their work. EduLink is bridging the gap!',
      avatar: 'assets/img/testimonials/testimonials-3.jpg'
    }
  ];

  const categories = [
    { id: 'all', name: 'All', icon: 'bi-grid' },
    { id: 'tech', name: 'Tech', icon: 'bi-laptop' },
    { id: 'marketing', name: 'Marketing', icon: 'bi-megaphone' },
    { id: 'finance', name: 'Finance', icon: 'bi-graph-up' },
    { id: 'healthcare', name: 'Healthcare', icon: 'bi-heart-pulse' },
    { id: 'engineering', name: 'Engineering', icon: 'bi-gear' }
  ];

  // Initialize opportunities
  useEffect(() => {
    setOpportunities(mockOpportunities);
    setFilteredOpportunities(mockOpportunities);
  }, []);

  // Filter opportunities
  useEffect(() => {
    let filtered = opportunities;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(opp => opp.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(opp => 
        opp.title.toLowerCase().includes(query) ||
        opp.company.toLowerCase().includes(query) ||
        opp.location.toLowerCase().includes(query) ||
        opp.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredOpportunities(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, searchQuery]);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'tech': return 'bg-blue-100 text-blue-800';
      case 'marketing': return 'bg-yellow-100 text-yellow-800';
      case 'finance': return 'bg-indigo-100 text-indigo-800';
      case 'healthcare': return 'bg-green-100 text-green-800';
      case 'engineering': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };



  return (
    <>

      <main className="main">
        {/* Marketplace Hero */}
        <section className="marketplace-hero text-center" data-aos="fade-in">
          <div className="container">
            <h1 className="display-5 fw-bold mb-3">Find Your Next Opportunity</h1>
            <p className="lead mb-4">Discover verified internships and jobs from top employers and institutions</p>
            <div className="search-bar shadow mx-auto">
              <input 
                type="text" 
                placeholder="Search by role, company, or keyword..." 
                aria-label="Search opportunities"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="button" onClick={() => window.scrollTo({ top: 600, behavior: 'smooth' })}>
                <i className="bi bi-search"></i> Search
              </button>
            </div>
            <div className="marketplace-cta">Tip: Use category filters below to narrow your search</div>
          </div>
        </section>

        {/* Category Filters */}
        <div className="marketplace-categories" data-aos="fade-up">
          {categories.map(category => (
            <button
              key={category.id}
              className={`cat-btn ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.id)}
            >
              <i className={`bi ${category.icon} me-1`}></i>
              {category.name}
            </button>
          ))}
        </div>

        {/* Opportunities Grid */}
        <section className="container opportunities-grid" data-aos="fade-up" data-aos-delay="100">
          {filteredOpportunities.map((opportunity) => (
            <div key={opportunity.id} className="opportunity-card">
              <div className="card-img">
                <img src={opportunity.image} alt={opportunity.title} />
              </div>
              <div className="card-content">
                <div className="d-flex align-items-center mb-2">
                  <div className="company-avatar">
                    <img src={opportunity.companyLogo} alt={opportunity.company} />
                  </div>
                  <span className={`badge ${getCategoryColor(opportunity.category)}`}>
                    {opportunity.category.charAt(0).toUpperCase() + opportunity.category.slice(1)}
                  </span>
                  {opportunity.featured && (
                    <span className="badge featured ms-2">Featured</span>
                  )}
                </div>
                <h3 className="fw-bold mb-1">{opportunity.title}</h3>
                <div className="location">
                  <i className="bi bi-geo-alt me-1"></i> {opportunity.location}
                </div>
                <div className="salary">{opportunity.salary}</div>
                <div className="tags mb-2">
                  {opportunity.tags.map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
                <div className="actions">
                  <button className="btn btn-primary">Apply</button>
                  <button className="btn btn-outline">Details</button>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Featured Employers */}
        <section className="featured-employers" data-aos="fade-up" data-aos-delay="200">
          <div className="container">
            <div className="text-center mb-4">
              <h2 className="fw-bold">Featured Employers</h2>
              <p>Connect with top companies and organizations</p>
            </div>
            <div className="row g-4">
              {employers.map((employer, index) => (
                <div key={employer.id} className="col-6 col-md-4 col-lg-2" data-aos="fade-up" data-aos-delay={index * 100}>
                  <div className="employer-card text-center">
                    <img src={employer.logo} className="employer-logo" alt={employer.name} />
                    <h6 className="mt-2 mb-1">{employer.name}</h6>
                    <small className="text-muted">{employer.description}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Success Stories */}
        <section className="marketplace-impact" data-aos="fade-up" data-aos-delay="300">
          <div className="container">
            <div className="text-center mb-5">
              <h2 className="fw-bold">Success Stories</h2>
              <p>See how EduLink is transforming careers across Kenya</p>
            </div>
            <div className="row g-4">
              {testimonials.map((testimonial, index) => (
                <div key={testimonial.id} className="col-md-6 col-lg-4" data-aos="fade-up" data-aos-delay={index * 100}>
                  <div className="testimonial">
                    <div className="avatar">
                      <img src={testimonial.avatar} alt={testimonial.name} />
                    </div>
                    <div>
                      <div className="quote">"{testimonial.quote}"</div>
                      <div className="name">{testimonial.name}</div>
                      <div className="role">{testimonial.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Employer CTA */}
        <section className="marketplace-cta-section" data-aos="fade-up" data-aos-delay="400">
          <div className="container text-center">
            <h2 className="fw-bold mb-3">Are You Hiring?</h2>
            <p className="lead mb-4">Post your opportunity and connect with top student talent across Kenya</p>
            <button className="btn btn-light btn-lg">Post an Opportunity</button>
          </div>
        </section>
      </main>

      <style>{`
        /* Marketplace Hero */
        .marketplace-hero {
          background: linear-gradient(120deg, var(--accent-color) 0%, #22c55e 100%);
          color: #fff;
          padding: 80px 0 60px 0;
          position: relative;
          overflow: hidden;
        }

        .marketplace-hero .search-bar {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
          padding: 20px 24px;
          max-width: 600px;
          margin: 30px auto 0 auto;
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .marketplace-hero .search-bar input {
          border: none;
          outline: none;
          flex: 1 1 auto;
          font-size: 1.1rem;
          background: transparent;
          color: #222;
        }

        .marketplace-hero .search-bar button {
          background: var(--accent-color);
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 10px 22px;
          font-size: 1.1rem;
          font-weight: 600;
          transition: background 0.2s;
        }

        .marketplace-hero .search-bar button:hover {
          background: #22c55e;
        }

        .marketplace-cta {
          margin-top: 18px;
          font-size: 1.1rem;
          color: #e0f7f7;
        }

        /* Category Filters */
        .marketplace-categories {
          margin: 0 auto 32px auto;
          max-width: 900px;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          justify-content: center;
          padding: 20px 0;
        }

        .marketplace-categories .cat-btn {
          background: #e0f7f7;
          color: var(--accent-color);
          border: none;
          border-radius: 8px;
          padding: 10px 18px;
          font-size: 1rem;
          font-weight: 600;
          transition: background 0.2s, color 0.2s;
          cursor: pointer;
        }

        .marketplace-categories .cat-btn.active,
        .marketplace-categories .cat-btn:hover {
          background: var(--accent-color);
          color: #fff;
        }

        /* Opportunity Cards */
        .opportunities-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 32px;
          margin-top: 24px;
          margin-bottom: 60px;
        }

        .opportunity-card {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
          display: flex;
          flex-direction: column;
          min-height: 420px;
          position: relative;
          border: 1.5px solid #e0f7f7;
        }

        .opportunity-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 8px 32px rgba(0,153,153,0.12);
          border-color: var(--accent-color);
        }

        .opportunity-card .card-img {
          width: 100%;
          height: 180px;
          overflow: hidden;
          background: #e0f7f7;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .opportunity-card .card-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s;
        }

        .opportunity-card:hover .card-img img {
          transform: scale(1.07);
        }

        .opportunity-card .card-content {
          padding: 22px 20px 16px 20px;
          flex: 1 1 auto;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .opportunity-card .company-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          overflow: hidden;
          border: 2px solid #e0f7f7;
          margin-right: 10px;
          background: #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }

        .opportunity-card .company-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .opportunity-card .badge {
          font-size: 0.95em;
          padding: 6px 12px;
          border-radius: 8px;
          margin-right: 8px;
          background: #e0f7f7;
          color: var(--accent-color);
          font-weight: 600;
        }

        .opportunity-card .badge.featured {
          background: #22c55e;
          color: #fff;
        }

        .opportunity-card .location {
          font-size: 1em;
          color: #6c757d;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .opportunity-card .salary {
          font-size: 1.1em;
          color: var(--accent-color);
          font-weight: 600;
          margin-bottom: 8px;
        }

        .opportunity-card .tags {
          margin-top: 8px;
          margin-bottom: 8px;
        }

        .opportunity-card .tag {
          display: inline-block;
          background: #f0fdf4;
          color: #22c55e;
          border-radius: 6px;
          font-size: 0.93em;
          padding: 3px 10px;
          margin-right: 6px;
          margin-bottom: 2px;
        }

        .opportunity-card .actions {
          margin-top: 10px;
          display: flex;
          gap: 10px;
        }

        .opportunity-card .actions .btn {
          font-size: 1em;
          border-radius: 8px;
          font-weight: 600;
          padding: 7px 18px;
          transition: background 0.2s;
        }

        .opportunity-card .actions .btn-primary {
          background: var(--accent-color);
          color: #fff;
          border: none;
        }

        .opportunity-card .actions .btn-primary:hover {
          background: #22c55e;
        }

        .opportunity-card .actions .btn-outline {
          background: #fff;
          color: var(--accent-color);
          border: 1.5px solid var(--accent-color);
        }

        .opportunity-card .actions .btn-outline:hover {
          background: #e0f7f7;
        }

        /* Featured Employers */
        .featured-employers {
          background: #f8fafc;
          padding: 60px 0 50px 0;
          margin: 0 0 40px 0;
        }

        .employer-card {
          padding: 20px;
          border-radius: 12px;
          transition: transform 0.2s;
        }

        .employer-card:hover {
          transform: translateY(-5px);
        }

        .employer-logo {
          width: 80px;
          height: 50px;
          object-fit: contain;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          padding: 8px;
          margin: 0 auto;
          transition: transform 0.2s;
        }

        .employer-logo:hover {
          transform: scale(1.08);
        }

        /* Success Stories */
        .marketplace-impact {
          background: #e0f7f7;
          padding: 60px 0 50px 0;
        }

        .marketplace-impact .testimonial {
          background: #fff;
          border-radius: 14px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
          padding: 28px 24px;
          margin-bottom: 24px;
          display: flex;
          align-items: flex-start;
          gap: 18px;
          position: relative;
        }

        .marketplace-impact .testimonial .avatar {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          overflow: hidden;
          border: 2px solid var(--accent-color);
          flex-shrink: 0;
        }

        .marketplace-impact .testimonial .avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .marketplace-impact .testimonial .quote {
          font-size: 1.08em;
          color: #37423b;
          font-style: italic;
        }

        .marketplace-impact .testimonial .name {
          font-weight: 700;
          color: var(--accent-color);
          margin-top: 6px;
          font-size: 1em;
        }

        .marketplace-impact .testimonial .role {
          font-size: 0.97em;
          color: #6c757d;
        }

        /* CTA Section */
        .marketplace-cta-section {
          background: linear-gradient(120deg, var(--accent-color) 0%, #22c55e 100%);
          color: #fff;
          padding: 60px 0 50px 0;
          text-align: center;
        }

        .marketplace-cta-section .btn {
          background: #fff;
          color: var(--accent-color);
          border-radius: 8px;
          font-weight: 700;
          font-size: 1.1em;
          padding: 12px 32px;
          margin-top: 18px;
          border: none;
          transition: background 0.2s, color 0.2s;
        }

        .marketplace-cta-section .btn:hover {
          background: #22c55e;
          color: #fff;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .marketplace-hero { padding: 50px 0 30px 0; }
          .opportunities-grid { grid-template-columns: 1fr; gap: 18px; }
          .marketplace-impact .testimonial { flex-direction: column; align-items: flex-start; }
          .employer-logo { width: 60px; height: 40px; }
        }
      `}</style>
    </>
  );
};

export default Opportunities;