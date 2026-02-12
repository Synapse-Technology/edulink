import React from 'react';

const WhyUs: React.FC = () => {
  return (
    <div className="why-us-page">
      {/* Page Title */}
      <div className="page-title" data-aos="fade">
        <div className="heading">
          <div className="container">
            <div className="row d-flex justify-content-center text-center">
              <div className="col-lg-8">
                <h1>Why Choose EduLink KE</h1>
                <p className="mb-0">We are committed to bridging the gap between education and employment in Kenya by creating a dynamic ecosystem that benefits students, institutions, and employers alike.</p>
              </div>
            </div>
          </div>
        </div>
        <nav className="breadcrumbs">
          <div className="container">
            <ol>
              <li><a href="/">Home</a></li>
              <li className="current">Why Us</li>
            </ol>
          </div>
        </nav>
      </div>

      <main className="main">
        {/* Benefits Section */}
        <section id="benefits" className="benefits section">
          <div className="container">
            <div className="row gy-4">
              <div className="col-lg-4" data-aos="fade-up" data-aos-delay="100">
                <div className="card h-100">
                  <div className="card-body">
                    <i className="bi bi-mortarboard-fill icon"></i>
                    <h3 className="card-title">For Students</h3>
                    <ul>
                      <li>Access exclusive, high-quality internships.</li>
                      <li>Receive personalized career coaching and mentorship.</li>
                      <li>Build a standout CV with skill-building workshops.</li>
                      <li>Earn verifiable digital certifications.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="col-lg-4" data-aos="fade-up" data-aos-delay="200">
                <div className="card h-100">
                  <div className="card-body">
                    <i className="bi bi-bank icon"></i>
                    <h3 className="card-title">For Institutions</h3>
                    <ul>
                      <li>Bridge the gap between academia and industry needs.</li>
                      <li>Gain real-time analytics on student performance.</li>
                      <li>Refine curricula to enhance graduate employability.</li>
                      <li>Reduce administrative overhead with our platform.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="col-lg-4" data-aos="fade-up" data-aos-delay="300">
                <div className="card h-100">
                  <div className="card-body">
                    <i className="bi bi-briefcase-fill icon"></i>
                    <h3 className="card-title">For Employers</h3>
                    <ul>
                      <li>Tap into a pipeline of Kenya's brightest talent.</li>
                      <li>Connect with pre-vetted, job-ready students.</li>
                      <li>Enhance your employer brand and visibility.</li>
                      <li>Simplify and streamline your recruitment process.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="features-section">
          <div className="container">
            <div className="row gy-4 align-items-center feature-item">
              <div className="col-md-5" data-aos="fade-right">
                <img src="/images/course-1.jpg" className="img-fluid" alt="" />
              </div>
              <div className="col-md-7" data-aos="fade-left">
                <h3>The EduLink Advantage: A Curated Talent Pipeline</h3>
                <p>Employers gain direct access to a curated pool of students who are not only academically proficient but also professionally trained, vetted, and ready to make an impact from day one.</p>
                <ul>
                  <li><i className="bi bi-patch-check-fill"></i><span>Pre-screened and qualified candidates.</span></li>
                  <li><i className="bi bi-patch-check-fill"></i><span>Reduced hiring time and costs.</span></li>
                  <li><i className="bi bi-patch-check-fill"></i><span>Access to motivated, high-potential talent.</span></li>
                </ul>
              </div>
            </div>

            <div className="row gy-4 align-items-center feature-item">
              <div className="col-md-5 order-1 order-md-2" data-aos="fade-left">
                <img src="/images/course-2.jpg" className="img-fluid" alt="" />
              </div>
              <div className="col-md-7 order-2 order-md-1" data-aos="fade-right">
                <h3>360° Career Readiness and Development</h3>
                <p>
                  Beyond job placements, we focus on holistic development. Our programs build confidence, professionalism, and critical 21st-century skills through targeted mentorship and hands-on training workshops.
                </p>
                <ul>
                  <li><i className="bi bi-people-fill"></i><span>Soft skills training (communication, teamwork).</span></li>
                  <li><i className="bi bi-tools"></i><span>Technical workshops relevant to industry needs.</span></li>
                  <li><i className="bi bi-award-fill"></i><span>Mentorship from seasoned industry professionals.</span></li>
                </ul>
              </div>
            </div>

            <div className="row gy-4 align-items-center feature-item">
              <div className="col-md-5" data-aos="fade-right">
                <img src="/images/course-3.jpg" className="img-fluid" alt="" />
              </div>
              <div className="col-md-7" data-aos="fade-left">
                <h3>Actionable Performance Insights for Institutions</h3>
                <p>We provide universities with powerful, data-driven dashboards to track student progress and gather feedback, closing the crucial loop between academic theory and real-world industry practice.</p>
                <ul>
                  <li><i className="bi bi-graph-up-arrow"></i><span>Track student engagement and success rates.</span></li>
                  <li><i className="bi bi-file-earmark-text-fill"></i><span>Generate reports on graduate employability.</span></li>
                  <li><i className="bi bi-lightbulb-fill"></i><span>Inform curriculum development with industry data.</span></li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>

      <style>{`
        .why-us-page .benefits .card .icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #f0fdf4;
          color: var(--accent-color);
          font-size: 28px;
          margin-bottom: 15px;
          transition: 0.3s;
        }
        .why-us-page .benefits .card {
          border: 1px solid #e2e8f0;
          transition: transform 0.3s, box-shadow 0.3s;
        }
        .why-us-page .benefits .card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.08);
        }
        .why-us-page .benefits .card-body ul {
          list-style: none;
          padding: 0;
        }
        .why-us-page .benefits .card-body ul li {
          padding-left: 28px;
          position: relative;
          margin-bottom: 12px;
        }
        .why-us-page .benefits .card-body ul li:before {
          content: "✓";
          position: absolute;
          left: 0;
          top: 1px;
          color: var(--accent-color);
          font-weight: bold;
        }
        .features-section {
          padding: 60px 0;
        }
        .features-section .feature-item {
          padding: 40px 0;
        }
        .features-section .feature-item img {
          border-radius: 10px;
          box-shadow: 0 5px 25px rgba(0,0,0,0.1);
        }
        .features-section .feature-item h3 {
          font-size: 24px;
          font-weight: 700;
          color: var(--default-color);
          margin-bottom: 15px;
        }
        .features-section .feature-item p {
          color: #6c757d;
        }
        .features-section .feature-item ul {
          list-style: none;
          padding: 0;
          margin-top: 15px;
        }
        .features-section .feature-item ul li {
          padding-left: 28px;
          position: relative;
          margin-bottom: 10px;
        }
        .features-section .feature-item ul i {
          position: absolute;
          left: 0;
          top: 2px;
          font-size: 20px;
          color: var(--accent-color);
        }
      `}</style>
    </div>
  );
};

export default WhyUs;