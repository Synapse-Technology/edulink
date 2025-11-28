import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  useEffect(() => {
    function animateCounter(element: HTMLElement, start: number, end: number, duration: number) {
      let startTimestamp: number | null = null;
      const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
        const current = Math.floor(progress * (end - start) + start);
        element.textContent = current.toString();
        if (progress < 1) {
          window.requestAnimationFrame(step);
        }
      };
      window.requestAnimationFrame(step);
    }

    function initCounters() {
      const counters = document.querySelectorAll('.purecounter');
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const counter = entry.target as HTMLElement;
            const start = parseInt(counter.getAttribute('data-purecounter-start') || '0') || 0;
            const end = parseInt(counter.getAttribute('data-purecounter-end') || '0') || 0;
            const duration = parseInt(counter.getAttribute('data-purecounter-duration') || '1') || 1;
            
            animateCounter(counter, start, end, duration);
            observer.unobserve(counter);
          }
        });
      });
      
      counters.forEach(counter => {
        observer.observe(counter);
      });
    }

    // Initialize counters
    initCounters();
  }, []);

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section id="hero" className="hero section dark-background">
        <img 
          src="/src/assets/images/hero.jpg" 
          alt="Hero Background" 
          data-aos="fade-in"
        />
        
        <div className="container">
          <h2 data-aos="fade-up" data-aos-delay="100">Verified Internships,<br />Brighter Futures</h2>
          <p data-aos="fade-up" data-aos-delay="200">
            Connecting Kenyan students to trusted internship and graduate job opportunities with smart tools and verified employers.
          </p>
          <Link to="/opportunities" className="btn-get-started" data-aos="fade-up" data-aos-delay="300">Find Opportunities</Link>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about section">
        <div className="container">
          <div className="row gy-4">
            <div className="col-lg-6 order-1 order-lg-2" data-aos="fade-up" data-aos-delay="100">
              <img src="/src/assets/images/about.jpg" className="img-fluid" alt="" />
            </div>

            <div className="col-lg-6 order-2 order-lg-1 content" data-aos="fade-up" data-aos-delay="200">
              <h3>Empowering Youth Through Verified Work Experience</h3>
              <p className="fst-italic">
                EduLink KE is committed to bridging the gap between education and employment for Kenyan youth by making the internship journey safer, smarter, and more successful.
              </p>
              <ul>
                <li>
                  <i className="bi bi-check-circle"></i> 
                  <span>Access only verified internship and graduate job listings.</span>
                </li>
                <li>
                  <i className="bi bi-check-circle"></i> 
                  <span>Track your applications, feedback, and performance with digital tools.</span>
                </li>
                <li>
                  <i className="bi bi-check-circle"></i> 
                  <span>Receive digital certificates and build a professional profile trusted by employers and institutions.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Counts Section */}
      <section id="counts" className="section counts light-background">
        <div className="container" data-aos="fade-up" data-aos-delay="100">
          <div className="row gy-4">
            <div className="col-lg-3 col-md-6">
              <div className="stats-item text-center w-100 h-100">
                <span data-purecounter-start="0" data-purecounter-end="1500" data-purecounter-duration="1" className="purecounter">0</span>
                <p>Students</p>
              </div>
            </div>

            <div className="col-lg-3 col-md-6">
              <div className="stats-item text-center w-100 h-100">
                <span data-purecounter-start="0" data-purecounter-end="75" data-purecounter-duration="1" className="purecounter">0</span>
                <p>Opportunities</p>
              </div>
            </div>

            <div className="col-lg-3 col-md-6">
              <div className="stats-item text-center w-100 h-100">
                <span data-purecounter-start="0" data-purecounter-end="30" data-purecounter-duration="1" className="purecounter">0</span>
                <p>Partner Institutions</p>
              </div>
            </div>

            <div className="col-lg-3 col-md-6">
              <div className="stats-item text-center w-100 h-100">
                <span data-purecounter-start="0" data-purecounter-end="45" data-purecounter-duration="1" className="purecounter">0</span>
                <p>Verified Employers</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Us Section */}
      <section id="why-us" className="section why-us">
        <div className="container">
          <div className="row gy-4">
            <div className="col-lg-4" data-aos="fade-up" data-aos-delay="100">
              <div className="why-box">
                <h3>Why Choose EduLink KE?</h3>
                <p>
                  Fake internships and lack of placement tracking leave students vulnerable and institutions underprepared. EduLink KE offers a trusted digital bridge between learning and employment.
                </p>
                <div className="text-center">
                  <Link to="/why-us" className="more-btn">
                    <span>Learn More</span> <i className="bi bi-chevron-right"></i>
                  </Link>
                </div>
              </div>
            </div>

            <div className="col-lg-8 d-flex align-items-stretch">
              <div className="row gy-4" data-aos="fade-up" data-aos-delay="200">
                <div className="col-xl-4">
                  <div className="icon-box d-flex flex-column justify-content-center align-items-center">
                    <i className="bi bi-clipboard-data"></i>
                    <h4>Track & Certify Experience</h4>
                    <p>Digital logbooks, supervisor ratings, and downloadable internship certificates.</p>
                  </div>
                </div>

                <div className="col-xl-4" data-aos="fade-up" data-aos-delay="300">
                  <div className="icon-box d-flex flex-column justify-content-center align-items-center">
                    <i className="bi bi-gem"></i>
                    <h4>Verified, Trusted Listings</h4>
                    <p>Every opportunity is screened and approved to eliminate scams and fraud.</p>
                  </div>
                </div>

                <div className="col-xl-4" data-aos="fade-up" data-aos-delay="400">
                  <div className="icon-box d-flex flex-column justify-content-center align-items-center">
                    <i className="bi bi-inboxes"></i>
                    <h4>Smart Matching with AI</h4>
                    <p>Receive personalized internship recommendations based on your profile and skills.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="section how-it-works light-background">
        <div className="container" data-aos="fade-up">
          <div className="section-title text-center">
            <h2>How It Works</h2>
            <p>A simple, streamlined path to your next opportunity.</p>
          </div>
          <div className="row gy-4 mt-4">
            <div className="col-md-6 col-lg-3 d-flex align-items-stretch" data-aos="fade-up" data-aos-delay="100">
              <div className="icon-box-step text-center">
                <div className="icon"><i className="bi bi-person-plus"></i></div>
                <h4>1. Create Profile</h4>
                <p>Sign up and build a professional profile to showcase your skills.</p>
              </div>
            </div>
            <div className="col-md-6 col-lg-3 d-flex align-items-stretch" data-aos="fade-up" data-aos-delay="200">
              <div className="icon-box-step text-center">
                <div className="icon"><i className="bi bi-compass"></i></div>
                <h4>2. Discover Opportunities</h4>
                <p>Explore verified internships and graduate jobs tailored to you.</p>
              </div>
            </div>
            <div className="col-md-6 col-lg-3 d-flex align-items-stretch" data-aos="fade-up" data-aos-delay="300">
              <div className="icon-box-step text-center">
                <div className="icon"><i className="bi bi-clipboard-check"></i></div>
                <h4>3. Apply & Track</h4>
                <p>Apply with one click and monitor your application status in real-time.</p>
              </div>
            </div>
            <div className="col-md-6 col-lg-3 d-flex align-items-stretch" data-aos="fade-up" data-aos-delay="400">
              <div className="icon-box-step text-center">
                <div className="icon"><i className="bi bi-patch-check-fill"></i></div>
                <h4>4. Get Certified</h4>
                <p>Receive digital certificates upon completion to validate your experience.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Opportunities Section */}
      <section id="featured-opportunities" className="section featured-opportunities">
        <div className="container" data-aos="fade-up">
          <div className="section-title text-center">
            <h2>Featured Opportunities</h2>
            <p>Get a glimpse of the internships available right now.</p>
          </div>
          <div className="row gy-4 mt-4">
            {/* Opportunity Card 1 */}
            <div className="col-md-6 col-lg-4" data-aos="fade-up" data-aos-delay="100">
              <div className="opportunity-card">
                <div className="card-img">
                  <img src="/assets/img/course-1.jpg" alt="Software Development" className="img-fluid w-100" />
                </div>
                <div className="card-content">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="badge bg-success">Tech</span>
                    <p className="price fw-bold mb-0">KES 40,000/mo</p>
                  </div>
                  <h3><Link to="#">Software Development Intern</Link></h3>
                  <p className="company">Synapse Technologies</p>
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="location d-flex align-items-center">
                      <i className="bi bi-geo-alt"></i>
                      <span>Nairobi, Kenya</span>
                    </div>
                    <Link to="#" className="btn btn-sm btn-primary">View Details</Link>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Opportunity Card 2 */}
            <div className="col-md-6 col-lg-4" data-aos="fade-up" data-aos-delay="200">
              <div className="opportunity-card">
                <div className="card-img">
                  <img src="/assets/img/course-2.jpg" alt="Marketing" className="img-fluid w-100" />
                </div>
                <div className="card-content">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="badge bg-info text-dark">Marketing</span>
                    <p className="price fw-bold mb-0">KES 35,000/mo</p>
                  </div>
                  <h3><Link to="#">Digital Marketing Assistant</Link></h3>
                  <p className="company">Creative Hub Inc.</p>
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="location d-flex align-items-center">
                      <i className="bi bi-geo-alt"></i>
                      <span>Mombasa, Kenya</span>
                    </div>
                    <Link to="#" className="btn btn-sm btn-primary">View Details</Link>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Opportunity Card 3 */}
            <div className="col-md-6 col-lg-4" data-aos="fade-up" data-aos-delay="300">
              <div className="opportunity-card">
                <div className="card-img">
                  <img src="/assets/img/course-3.jpg" alt="Finance" className="img-fluid w-100" />
                </div>
                <div className="card-content">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="badge bg-warning text-dark">Finance</span>
                    <p className="price fw-bold mb-0">KES 38,000/mo</p>
                  </div>
                  <h3><Link to="#">Finance & Accounting Intern</Link></h3>
                  <p className="company">Kenya Trust Bank</p>
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="location d-flex align-items-center">
                      <i className="bi bi-geo-alt"></i>
                      <span>Kisumu, Kenya</span>
                    </div>
                    <Link to="#" className="btn btn-sm btn-primary">View Details</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .home-page {
          font-family: 'Open Sans', sans-serif;
        }

        /* Hero Section */
        .hero {
          width: 100%;
          min-height: 80vh;
          position: relative;
          padding: 80px 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--default-color);
        }

        .hero img {
          position: absolute;
          inset: 0;
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          z-index: 1;
        }

        .hero:before {
          content: "";
          background: rgba(6, 6, 6, 0.7); /* Dark overlay with 70% opacity */
          position: absolute;
          inset: 0;
          z-index: 2;
        }

        .hero .container {
          position: relative;
          z-index: 3;
          text-align: left; /* Ensure left alignment like original */
          padding: 0 12px; /* Match original container padding */
        }

        .hero h2 {
          margin: 0;
          font-size: 48px;
          font-weight: 700;
          color: #ffffff; /* White text for better contrast */
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5); /* Text shadow for readability */
          line-height: 1.2;
        }

        .hero p {
          color: rgba(255, 255, 255, 0.9); /* Light text with high contrast */
          margin: 10px 0 0 0; /* Original spacing from HTML */
          font-size: 24px;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5); /* Text shadow for readability */
          line-height: 1.5;
        }

        .hero .btn-get-started {
          font-weight: 500;
          font-size: 15px;
          letter-spacing: 1px;
          display: inline-block;
          padding: 8px 35px 10px 35px;
          border-radius: 50px;
          transition: 0.4s;
          margin-top: 30px;
          border: 2px solid #ffffff; /* White border for contrast */
          color: #ffffff; /* White text */
          background: transparent; /* Transparent background */
          text-decoration: none;
          position: relative;
          z-index: 3;
          text-align: left; /* Ensure button text is left aligned */
          margin-left: 0; /* Remove any auto centering */
        }

        .hero .btn-get-started:hover {
          background: var(--accent-color); /* Accent color on hover */
          border: 2px solid var(--accent-color); /* Accent border on hover */
          color: #ffffff; /* White text on hover */
        }

        .dark-background {
          --background-color: #060606;
          --default-color: #ffffff;
          --heading-color: #ffffff;
          --surface-color: #252525;
          --contrast-color: #ffffff;
        }

        /* About Section */
        .about {
          padding: 80px 0;
        }

        .about h3 {
          font-size: 2rem;
          font-weight: 700;
          color: #37423b;
          margin-bottom: 1rem;
        }

        .about .fst-italic {
          font-style: italic;
          color: #6c757d;
          margin-bottom: 1.5rem;
        }

        .about ul {
          list-style: none;
          padding: 0;
        }

        .about ul li {
          padding: 0.5rem 0;
          display: flex;
          align-items: flex-start;
        }

        .about ul li i {
          color: rgb(9, 173, 179);
          margin-right: 0.5rem;
          font-size: 1.2rem;
        }

        /* Counts Section */
        .counts {
          padding: 25px 0;
        }

        .light-background {
          background: #f8f9fa;
        }

        .stats-item {
          padding: 30px;
        }

        .stats-item span {
          font-size: 48px;
          font-weight: 700;
          color: rgb(9, 173, 179);
          display: block;
        }

        .stats-item p {
          font-size: 15px;
          color: color-mix(in srgb, var(--default-color), transparent 40%);
          margin: 0;
          font-family: var(--heading-font);
          font-weight: 600;
        }

        /* Why Us Section */
        .why-us {
          padding: 80px 0;
        }

        .why-box {
          color: #ffffff;
          background: rgb(9, 173, 179);
          padding: 30px;
          height: 100%;
        }

        .why-box h3 {
          color: #ffffff;
          font-weight: 700;
          font-size: 34px;
          margin-bottom: 30px;
        }

        .why-box p {
          color: #ffffff;
          margin-bottom: 30px;
        }

        .more-btn {
          display: inline-block;
          background: rgba(255, 255, 255, 0.15);
          padding: 8px 40px 10px 40px;
          color: #ffffff;
          transition: all ease-in-out 0.4s;
          border-radius: 50px;
          text-decoration: none;
          font-weight: 600;
        }

        .more-btn:hover {
          background: rgba(255, 255, 255, 0.25);
          color: #ffffff;
        }

        .more-btn i {
          font-size: 14px;
          margin-left: 5px;
        }

        .icon-box {
          padding: 2rem 1rem;
          text-align: center;
          border: 1px solid #eef0ef;
          border-radius: 8px;
          transition: all 0.3s;
          height: 100%;
        }

        .icon-box:hover {
          transform: translateY(-5px);
          border-color: rgb(9, 173, 179);
        }

        .icon-box i {
          font-size: 2rem;
          color: rgb(9, 173, 179);
          margin-bottom: 1rem;
        }

        .icon-box h4 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #37423b;
          margin-bottom: 1rem;
        }

        .icon-box p {
          color: #6c757d;
          margin: 0;
        }

        /* How It Works Section */
        .how-it-works .icon-box-step {
          padding: 30px;
          border: 1px solid #eef0ef;
          border-radius: 12px;
          transition: all 0.3s;
          background: #ffffff;
          height: 100%;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        }

        .how-it-works .icon-box-step .icon {
          margin: 0 auto 30px auto;
          width: 64px;
          height: 64px;
          background: rgb(9, 173, 179);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: 0.3s;
          color: #fff;
          font-size: 1.5rem;
        }

        .how-it-works .icon-box-step h4 {
          font-weight: 700;
          margin-bottom: 15px;
          font-size: 1.25rem;
          color: #37423b;
        }

        .how-it-works .icon-box-step:hover {
          transform: translateY(-10px);
          border-color: rgb(9, 173, 179);
        }

        /* Featured Opportunities */
        .featured-opportunities .opportunity-card {
          border: 1px solid #eef0ef;
          background: #fff;
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.3s;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
          height: 100%;
        }

        .featured-opportunities .opportunity-card:hover {
          transform: translateY(-10px);
          border-color: rgb(9, 173, 179);
        }

        .featured-opportunities .opportunity-card .card-img img {
          height: 220px;
          object-fit: cover;
          width: 100%;
        }

        .featured-opportunities .opportunity-card .card-content {
          padding: 20px;
        }

        .featured-opportunities .opportunity-card h3 {
          font-weight: 700;
          font-size: 1.25rem;
          margin-bottom: 0.5rem;
        }

        .featured-opportunities .opportunity-card h3 a {
          color: #37423b;
          transition: 0.3s;
          text-decoration: none;
        }

        .featured-opportunities .opportunity-card h3 a:hover {
          color: rgb(9, 173, 179);
        }

        .featured-opportunities .opportunity-card .company {
          font-size: 0.875rem;
          color: #6c757d;
          margin-bottom: 15px;
        }

        .featured-opportunities .opportunity-card .location span {
          font-size: 0.875rem;
          color: #6c757d;
          margin-left: 5px;
        }

        .featured-opportunities .opportunity-card .badge {
          font-size: 0.75rem;
          padding: 6px 10px;
        }

        .featured-opportunities .opportunity-card .price {
          font-size: 1.125rem;
          color: rgb(9, 173, 179);
          font-weight: 700;
          margin: 0;
        }

        /* Enhanced Responsive Design */
        @media (max-width: 768px) {
          .hero h2 {
            font-size: 32px;
          }
          
          .hero p {
            font-size: 18px;
          }
          
          .hero {
            min-height: 60vh;
            padding: 60px 0;
          }
        }

        @media (max-width: 576px) {
          .hero h2 {
            font-size: 28px;
          }
          
          .hero p {
            font-size: 16px;
          }
          
          .hero .btn-get-started {
            font-size: 14px;
            padding: 6px 25px 8px 25px;
          }
        }
      `}</style>
    </div>
  );
};

export default Home;