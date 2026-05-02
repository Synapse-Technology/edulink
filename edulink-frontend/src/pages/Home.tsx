import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/common';
import {
  internshipService,
  type SuccessStory,
} from '../services/internship/internshipService';

const Home: React.FC = () => {
  const [successStories, setSuccessStories] = useState<SuccessStory[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(true);

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

  useEffect(() => {
    let isMounted = true;

    const fetchSuccessStories = async () => {
      try {
        setStoriesLoading(true);
        const data = await internshipService.getSuccessStories();
        const published = data
          .filter(story => story.is_published)
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
          .slice(0, 3);

        if (isMounted) {
          setSuccessStories(published);
        }
      } catch (error) {
        console.error('Failed to load home success stories:', error);
        if (isMounted) {
          setSuccessStories([]);
        }
      } finally {
        if (isMounted) {
          setStoriesLoading(false);
        }
      }
    };

    fetchSuccessStories();

    return () => {
      isMounted = false;
    };
  }, []);

  const getInitials = (name?: string) =>
    (name || 'Student')
      .split(' ')
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase();

  return (
    <div className="home-page">
      <SEO 
        title="Home"
        description="EduLink KE helps Kenyan institutions run trusted attachment and internship programs with verified employers, supervised logbooks, evidence, and outcome reporting."
        keywords="industrial attachment Kenya, verified internships Kenya, student placement system, institution attachment portal"
      />
      {/* Hero Section */}
      <section id="hero" className="hero section dark-background">
        <img 
          src="/images/hero.jpg" 
          alt="Hero Background" 
          data-aos="fade-in"
        />
        
        <div className="container">
          <h2 data-aos="fade-up" data-aos-delay="100">Trusted Attachments,<br />Verified Outcomes</h2>
          <p data-aos="fade-up" data-aos-delay="200">
            Helping Kenyan institutions, students, and employers run attachment and internship programs with verified identity, supervision, logbooks, and completion evidence.
          </p>
          <div className="d-flex flex-wrap gap-3" data-aos="fade-up" data-aos-delay="300">
            <Link to="/institutions/request" className="btn-get-started">Start Institution Pilot</Link>
            <Link to="/employer/onboarding" className="btn-get-started btn-secondary-action">Join as Employer</Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about section">
        <div className="container">
          <div className="row gy-4">
            <div className="col-lg-6 order-1 order-lg-2" data-aos="fade-up" data-aos-delay="100">
              <img src="/images/about.jpg" className="img-fluid" alt="" />
            </div>

            <div className="col-lg-6 order-2 order-lg-1 content" data-aos="fade-up" data-aos-delay="200">
              <h3>A Trusted Operating System For Work-Based Learning</h3>
              <p className="fst-italic">
                EduLink KE is built around the real attachment cycle: institution verification, employer trust, student applications, supervision, evidence, and final outcomes.
              </p>
              <ul>
                <li>
                  <i className="bi bi-check-circle"></i> 
                  <span>Verify students by institution, department, and cohort before placement.</span>
                </li>
                <li>
                  <i className="bi bi-check-circle"></i> 
                  <span>Give employers structured applications, supervision tools, and trusted candidate records.</span>
                </li>
                <li>
                  <i className="bi bi-check-circle"></i> 
                  <span>Track logbooks, artifacts, feedback, completion, and verifiable certificates.</span>
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
                <span data-purecounter-start="0" data-purecounter-end="300" data-purecounter-duration="1" className="purecounter">0</span>
                <p>Pilot Students Target</p>
              </div>
            </div>

            <div className="col-lg-3 col-md-6">
              <div className="stats-item text-center w-100 h-100">
                <span data-purecounter-start="0" data-purecounter-end="30" data-purecounter-duration="1" className="purecounter">0</span>
                <p>Verified Opportunities Target</p>
              </div>
            </div>

            <div className="col-lg-3 col-md-6">
              <div className="stats-item text-center w-100 h-100">
                <span data-purecounter-start="0" data-purecounter-end="3" data-purecounter-duration="1" className="purecounter">0</span>
                <p>Institution Partners Target</p>
              </div>
            </div>

            <div className="col-lg-3 col-md-6">
              <div className="stats-item text-center w-100 h-100">
                <span data-purecounter-start="0" data-purecounter-end="20" data-purecounter-duration="1" className="purecounter">0</span>
                <p>Employer Partners Target</p>
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
                  Kenya's attachment market is fragmented across portals, WhatsApp, employer websites, and paper processes. EduLink KE gives pilot institutions one trusted workflow from student verification to completion reporting.
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
                    <h4>Run The Full Cycle</h4>
                    <p>Applications, supervision, logbooks, incidents, evidence, completion, and certificates.</p>
                  </div>
                </div>

                <div className="col-xl-4" data-aos="fade-up" data-aos-delay="300">
                  <div className="icon-box d-flex flex-column justify-content-center align-items-center">
                    <i className="bi bi-gem"></i>
                    <h4>Trust Before Scale</h4>
                    <p>Institution affiliation and employer verification reduce fake listings and weak records.</p>
                  </div>
                </div>

                <div className="col-xl-4" data-aos="fade-up" data-aos-delay="400">
                  <div className="icon-box d-flex flex-column justify-content-center align-items-center">
                    <i className="bi bi-inboxes"></i>
                    <h4>Outcome Reporting</h4>
                    <p>Placement rates, department performance, supervisor load, and audit-ready evidence.</p>
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
            <p>A focused workflow for beta institutions, employers, and student cohorts.</p>
          </div>
          <div className="row gy-4 mt-4">
            <div className="col-md-6 col-lg-3 d-flex align-items-stretch" data-aos="fade-up" data-aos-delay="100">
              <div className="icon-box-step text-center">
                <div className="icon"><i className="bi bi-person-plus"></i></div>
                <h4>1. Verify Cohort</h4>
                <p>Institution admins define departments, cohorts, and eligible students.</p>
              </div>
            </div>
            <div className="col-md-6 col-lg-3 d-flex align-items-stretch" data-aos="fade-up" data-aos-delay="200">
              <div className="icon-box-step text-center">
                <div className="icon"><i className="bi bi-compass"></i></div>
                <h4>2. Approve Employers</h4>
                <p>Employers join through onboarding and publish trusted opportunities.</p>
              </div>
            </div>
            <div className="col-md-6 col-lg-3 d-flex align-items-stretch" data-aos="fade-up" data-aos-delay="300">
              <div className="icon-box-step text-center">
                <div className="icon"><i className="bi bi-clipboard-check"></i></div>
                <h4>3. Place & Supervise</h4>
                <p>Students apply, get reviewed, start placements, and submit logbooks.</p>
              </div>
            </div>
            <div className="col-md-6 col-lg-3 d-flex align-items-stretch" data-aos="fade-up" data-aos-delay="400">
              <div className="icon-box-step text-center">
                <div className="icon"><i className="bi bi-patch-check-fill"></i></div>
                <h4>4. Report Outcomes</h4>
                <p>Institutions certify completions and review placement performance.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The EduLink Trust Journey Section */}
      <section id="trust-journey" className="section trust-journey">
        <div className="container" data-aos="fade-up">
          <div className="section-title text-center mb-5">
            <h2>The EduLink Trust Journey</h2>
            <p>Visible trust signals across students, institutions, employers, and completion evidence.</p>
          </div>
          
          <div className="row gy-4">
            <div className="col-lg-3 col-md-6" data-aos="zoom-in" data-aos-delay="100">
              <div className="trust-card text-center p-4 h-100">
                <div className="trust-icon mb-3">
                  <i className="bi bi-file-earmark-check fs-1 text-primary"></i>
                </div>
                <h4>Document Verified</h4>
                <p className="small text-muted">Upload your CV and ID documents for initial platform verification.</p>
              </div>
            </div>
            
            <div className="col-lg-3 col-md-6" data-aos="zoom-in" data-aos-delay="200">
              <div className="trust-card text-center p-4 h-100">
                <div className="trust-icon mb-3">
                  <i className="bi bi-bank fs-1 text-primary"></i>
                </div>
                <h4>Institution Verified</h4>
                <p className="small text-muted">Claim your institution and get verified by your campus admin.</p>
              </div>
            </div>
            
            <div className="col-lg-3 col-md-6" data-aos="zoom-in" data-aos-delay="300">
              <div className="trust-card text-center p-4 h-100">
                <div className="trust-icon mb-3">
                  <i className="bi bi-briefcase fs-1 text-primary"></i>
                </div>
                <h4>Internship Completed</h4>
                <p className="small text-muted">Successfully complete your first verified internship on the platform.</p>
              </div>
            </div>
            
            <div className="col-lg-3 col-md-6" data-aos="zoom-in" data-aos-delay="400">
              <div className="trust-card text-center p-4 h-100">
                <div className="trust-icon mb-3">
                  <i className="bi bi-patch-check fs-1 text-primary"></i>
                </div>
                <h4>Certified Student</h4>
                <p className="small text-muted">Earn your official completion certificate and top-tier talent status.</p>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-5">
            <Link to="/institutions/request" className="btn btn-primary rounded-pill px-5 py-3 fw-bold shadow-sm">Request Institution Pilot</Link>
          </div>
        </div>
      </section>

      {/* Success Stories Preview Section */}
      <section id="success-stories" className="section light-background">
        <div className="container" data-aos="fade-up">
          <div className="home-section-heading">
            <div>
              <span className="home-section-eyebrow">Verified outcomes</span>
              <h2>Student Success Stories</h2>
              <p>
                Real student placement outcomes from published EduLink success records.
              </p>
            </div>
            <Link to="/success-stories" className="btn btn-outline-primary">
              View All Stories
            </Link>
            <Link to="/trust-policy" className="btn btn-outline-dark">
              Trust Policy
            </Link>
          </div>

          <div className="home-outcomes-grid">
            {storiesLoading ? (
              [1, 2, 3].map(item => (
                <div className="home-outcome-card skeleton" key={item}>
                  <div className="home-outcome-header">
                    <div className="home-outcome-avatar" />
                    <div className="w-100">
                      <div className="skeleton-line short" />
                      <div className="skeleton-line" />
                    </div>
                  </div>
                  <div className="skeleton-line wide" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line medium" />
                </div>
              ))
            ) : successStories.length > 0 ? (
              successStories.map((story, index) => (
                <article
                  className="home-outcome-card"
                  key={story.id}
                  data-aos="zoom-in"
                  data-aos-delay={(index + 1) * 100}
                >
                  <div className="home-outcome-header">
                    <div className="home-outcome-avatar" aria-hidden="true">
                      {getInitials(story.student_name)}
                    </div>
                    <div className="min-width-0">
                      <h3>{story.student_name || 'Student'}</h3>
                      <p>
                        {story.employer_name
                          ? `Intern at ${story.employer_name}`
                          : 'Verified internship graduate'}
                      </p>
                    </div>
                  </div>
                  <blockquote>
                    "{story.student_testimonial || story.employer_feedback}"
                  </blockquote>
                  <div className="home-outcome-footer">
                    <span>
                      <i className="bi bi-patch-check-fill"></i>
                      Verified success story
                    </span>
                    {story.created_at && (
                      <time dateTime={story.created_at}>
                        {new Date(story.created_at).toLocaleDateString('en-GB', {
                          month: 'short',
                          year: 'numeric',
                        })}
                      </time>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <div className="home-outcome-empty">
                <h3>Published success stories will appear here soon.</h3>
                <p>
                  Explore current opportunities while institutions and employers
                  publish verified student outcomes.
                </p>
                <Link to="/opportunities" className="btn btn-primary">
                  Find Opportunities
                </Link>
              </div>
            )}
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

        .hero .btn-secondary-action {
          background: rgba(255, 255, 255, 0.12);
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

        /* Trust Journey Section */
        .trust-journey {
          background: #f0fdfa; /* Soft teal background */
          padding: 80px 0;
          position: relative;
        }

        .trust-journey::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 100px;
          background: linear-gradient(to bottom, #ffffff, rgba(240, 253, 250, 0));
          pointer-events: none;
        }

        .trust-card {
          background: #fff;
          border-radius: 20px;
          border: 1px solid #f0f0f0;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(0,0,0,0.02);
        }

        .trust-card:hover {
          transform: translateY(-10px);
          box-shadow: 0 15px 35px rgba(9, 173, 179, 0.1);
          border-color: rgb(9, 173, 179);
        }

        .trust-icon i {
          display: inline-block;
          padding: 15px;
          background: rgba(9, 173, 179, 0.05);
          border-radius: 15px;
          line-height: 1;
        }

        .trust-card h4 {
          font-weight: 700;
          color: #37423b;
          margin-bottom: 15px;
          font-size: 1.15rem;
        }

        /* Success Stories Section */
        #success-stories {
          background: #f8fafc;
          padding: 64px 0;
        }

        .home-section-heading {
          align-items: flex-end;
          display: flex;
          gap: 24px;
          justify-content: space-between;
          margin-bottom: 24px;
        }

        .home-section-heading h2 {
          color: #0f172a;
          font-size: 2rem;
          font-weight: 800;
          margin: 0 0 8px;
        }

        .home-section-heading p {
          color: #64748b;
          line-height: 1.7;
          margin: 0;
          max-width: 680px;
        }

        .home-section-eyebrow {
          color: var(--accent-color);
          display: block;
          font-size: 0.78rem;
          font-weight: 800;
          margin-bottom: 8px;
          text-transform: uppercase;
        }

        .home-section-heading .btn {
          border-radius: 7px;
          flex: 0 0 auto;
          font-weight: 700;
        }

        .home-outcomes-grid {
          display: grid;
          gap: 14px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .home-outcome-card,
        .home-outcome-empty {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
        }

        .home-outcome-card {
          display: flex;
          flex-direction: column;
          min-height: 245px;
        }

        .home-outcome-header {
          align-items: center;
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
          min-width: 0;
        }

        .home-outcome-avatar {
          align-items: center;
          background: #e6f7f7;
          border: 1px solid rgba(0,153,153,0.2);
          border-radius: 50%;
          color: var(--accent-color);
          display: flex;
          flex: 0 0 auto;
          font-size: 0.78rem;
          font-weight: 800;
          height: 44px;
          justify-content: center;
          width: 44px;
        }

        .min-width-0 {
          min-width: 0;
        }

        .home-outcome-header h3 {
          color: #0f172a;
          font-size: 1rem;
          font-weight: 800;
          margin: 0 0 3px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .home-outcome-header p {
          color: #64748b;
          font-size: 0.84rem;
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .home-outcome-card blockquote {
          border-left: 3px solid #e6f7f7;
          color: #475569;
          flex: 1;
          font-size: 0.95rem;
          line-height: 1.72;
          margin: 0;
          padding-left: 14px;
        }

        .home-outcome-footer {
          align-items: center;
          border-top: 1px solid #edf2f7;
          color: #64748b;
          display: flex;
          flex-wrap: wrap;
          font-size: 0.78rem;
          gap: 10px;
          justify-content: space-between;
          margin-top: 18px;
          padding-top: 14px;
        }

        .home-outcome-footer span {
          align-items: center;
          color: #15803d;
          display: inline-flex;
          font-weight: 700;
          gap: 6px;
        }

        .home-outcome-empty {
          grid-column: 1 / -1;
          text-align: center;
        }

        .home-outcome-empty h3 {
          color: #0f172a;
          font-size: 1.15rem;
          font-weight: 800;
          margin: 0 0 8px;
        }

        .home-outcome-empty p {
          color: #64748b;
          margin: 0 auto 16px;
          max-width: 620px;
        }

        .home-outcome-card.skeleton .home-outcome-avatar,
        .skeleton-line {
          background: #edf2f7;
          border-color: transparent;
        }

        .skeleton-line {
          border-radius: 4px;
          height: 12px;
          margin-bottom: 10px;
          width: 70%;
        }

        .skeleton-line.short {
          width: 42%;
        }

        .skeleton-line.wide {
          margin-top: 10px;
          width: 100%;
        }

        .skeleton-line.medium {
          width: 58%;
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

          .home-section-heading {
            align-items: flex-start;
            flex-direction: column;
            gap: 14px;
          }

          .home-section-heading .btn {
            width: 100%;
          }

          .home-outcomes-grid {
            grid-template-columns: 1fr;
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

          #success-stories {
            padding: 44px 0;
          }

          .home-section-heading h2 {
            font-size: 1.55rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Home;
