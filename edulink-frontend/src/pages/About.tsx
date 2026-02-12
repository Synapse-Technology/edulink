import React from 'react';

const About: React.FC = () => {
  return (
    <>
      {/* Page Title */}
      <div className="page-title" data-aos="fade">
        <div className="heading">
          <div className="container">
            <div className="row d-flex justify-content-center text-center">
              <div className="col-lg-8">
                <h1>About Us</h1>
                <p className="mb-0">Learn more about our journey, mission, and the values that drive us to empower Kenyan youth.</p>
              </div>
            </div>
          </div>
        </div>
        <nav className="breadcrumbs">
          <div className="container">
            <ol>
              <li><a href="/">Home</a></li>
              <li className="current">About Us</li>
            </ol>
          </div>
        </nav>
      </div>

      <main className="main">
        {/* Background Section */}
        <section id="background" className="about section">
          <div className="container">
            <div className="row gy-4">
              <div className="col-lg-6" data-aos="fade-up" data-aos-delay="100">
                <img src="/images/team/edulink_team.jpg" className="img-fluid rounded-lg shadow-lg" alt="Team discussing plans" />
              </div>
              <div className="col-lg-6 content" data-aos="fade-up" data-aos-delay="200">
                <h3>Our Background</h3>
                <p className="fst-italic">
                  EduLink KE was initiated by Synapse JKUAT with support from Jhub Africa. Our team, comprised of seven Computer Technology students from JKUAT, is passionate about using technology to solve real-world problems.
                </p>
                <p>
                  Recognizing the challenges students face in securing internships, we aimed to create a platform that connects them with opportunities and provides tools for institutions and employers to support talent development.
                </p>
                <p>Today, Edulink KE stands as a testament to our commitment to transforming the educational landscape in Kenya. We are dedicated to creating a seamless experience for students, institutions, and employers.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Mission & Vision Section */}
        <section id="mission-vision" className="section light-background">
          <div className="container">
            <div className="row gy-4">
              <div className="col-lg-6" data-aos="fade-up" data-aos-delay="100">
                <div className="p-5" style={{backgroundColor: '#f0fdf4', borderLeft: '5px solid #28a745', borderRadius: '8px'}}>
                  <h3>Our Mission</h3>
                  <p>To empower Kenyan students by providing seamless access to internships, job placements, and mentorship, while offering institutions and employers a reliable system to track and support talent development.</p>
                </div>
              </div>
              <div className="col-lg-6" data-aos="fade-up" data-aos-delay="200">
                <div className="p-5" style={{backgroundColor: '#f0fdf4', borderLeft: '5px solid #28a745', borderRadius: '8px'}}>
                  <h3>Our Vision</h3>
                  <p>A Kenya where every student can easily transition from learning to working, guided by transparent systems and real-time progress tracking.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Core Values Section */}
        <section id="core-values" className="values section">
          <div className="container">
            <div className="section-title text-center" data-aos="fade-up">
              <h2>Our Core Values</h2>
              <p>The principles that guide our work and culture.</p>
            </div>
            <div className="row gy-4 mt-4">
              <div className="col-lg-4 col-md-6" data-aos="fade-up" data-aos-delay="100">
                <div className="icon-box">
                  <i className="bi bi-shield-check"></i>
                  <div><h4>Integrity</h4> <p>Upholding the highest standards of honesty and transparency.</p></div>
                </div>
              </div>
              <div className="col-lg-4 col-md-6" data-aos="fade-up" data-aos-delay="200">
                <div className="icon-box">
                  <i className="bi bi-lightbulb"></i>
                  <div><h4>Empowerment</h4> <p>Equipping students with tools and opportunities to succeed.</p></div>
                </div>
              </div>
              <div className="col-lg-4 col-md-6" data-aos="fade-up" data-aos-delay="300">
                <div className="icon-box">
                  <i className="bi bi-people"></i>
                  <div><h4>Collaboration</h4> <p>Working with partners to create a supportive ecosystem for youth.</p></div>
                </div>
              </div>
              <div className="col-lg-4 col-md-6" data-aos="fade-up" data-aos-delay="400">
                <div className="icon-box">
                  <i className="bi bi-cpu"></i>
                  <div><h4>Innovation</h4> <p>Leveraging technology to continuously improve our platform.</p></div>
                </div>
              </div>
              <div className="col-lg-4 col-md-6" data-aos="fade-up" data-aos-delay="500">
                <div className="icon-box">
                  <i className="bi bi-arrows-fullscreen"></i>
                  <div><h4>Inclusivity</h4> <p>Ensuring equal access to opportunities for all Kenyan students.</p></div>
                </div>
              </div>
              <div className="col-lg-4 col-md-6" data-aos="fade-up" data-aos-delay="600">
                <div className="icon-box">
                  <i className="bi bi-graph-up-arrow"></i>
                  <div><h4>Impact</h4> <p>Making a positive difference in the lives of students and the community.</p></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Partners Section */}
        <section id="partners" className="clients section light-background">
          <div className="container">
            <div className="section-title text-center" data-aos="fade-up">
              <h2>Our Partners</h2>
              <p>We are proud to collaborate with leading organizations to foster talent.</p>
            </div>
            <div className="row gy-4 justify-content-center" data-aos="fade-up" data-aos-delay="100">
              <div className="col-lg-3 col-md-4 col-6 d-flex flex-column align-items-center">
                <div className="client-logo mb-3">
                  <img src="/images/partners/jkuat.png" alt="JKUAT" style={{height: '120px', width: '120px', objectFit: 'contain', borderRadius: '15px', background: '#fff', padding: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.07)'}} />
                </div>
                <div className="text-center">
                  <h6 className="text-muted fw-bold mt-2">JKUAT</h6>
                </div>
              </div>
              <div className="col-lg-3 col-md-4 col-6 d-flex flex-column align-items-center">
                <div className="client-logo mb-3">
                  <img src="/images/partners/jhub.png" alt="Jhub Africa" style={{height: '120px', width: '120px', objectFit: 'contain', borderRadius: '15px', background: '#fff', padding: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.07)'}} />
                </div>
                <div className="text-center">
                  <h6 className="text-muted fw-bold mt-2">Jhub Africa</h6>
                </div>
              </div>
              <div className="col-lg-3 col-md-4 col-6 d-flex flex-column align-items-center">
                <div className="client-logo mb-3">
                  <img src="/images/partners/synapse.png" alt="Synapse Technology" style={{height: '120px', width: '120px', objectFit: 'contain', borderRadius: '15px', background: '#fff', padding: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.07)'}} />
                </div>
                <div className="text-center">
                  <h6 className="text-muted fw-bold mt-2">Synapse Technology</h6>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Meet the Team Section */}
        <section id="meet-the-team" className="section light-background" style={{position: 'relative', zIndex: 1}}>
          <div className="container">
            <div className="section-title text-center" data-aos="fade-up">
              <h2>Meet the Team</h2>
              <p>The passionate individuals behind EduLink KE</p>
            </div>
            <div className="row gy-4 justify-content-center">
              {/* Dr. Lawrence Nderu */}
              <div className="col-lg-3 col-md-4 col-sm-6 d-flex align-items-stretch">
                <div className="card shadow-sm border-0 text-center p-3">
                  <img src="/images/team/Lawrence.jpeg" className="img-fluid rounded-circle mb-3" alt="Dr. Lawrence Nderu" style={{width: '120px', height: '120px', objectFit: 'cover', margin: 'auto'}} />
                  <h5 className="mb-1">Dr. Lawrence Nderu</h5>
                  <span className="text-success fw-bold">Project Inspector</span>
                  <p className="mt-2 small">Mentor and supervisor, guiding the team to success.</p>
                  <div className="d-flex justify-content-center gap-2 mt-2">
                    <a href="https://www.linkedin.com/in/dr-lawrence-nderu/" className="text-dark" title="LinkedIn"><i className="bi bi-linkedin" style={{fontSize: '1.3rem'}}></i></a>
                    <a href="#" className="text-dark" title="GitHub"><i className="bi bi-github" style={{fontSize: '1.3rem'}}></i></a>
                  </div>
                </div>
              </div>
              {/* Bouric Okwaro */}
              <div className="col-lg-3 col-md-4 col-sm-6 d-flex align-items-stretch">
                <div className="card shadow-sm border-0 text-center p-3">
                  <img src="/images/team/bouric.jpeg" className="img-fluid rounded-circle mb-3" alt="Bouric Okwaro" style={{width: '120px', height: '120px', objectFit: 'cover', objectPosition: 'center top', margin: 'auto'}} />
                  <h5 className="mb-1">Bouric Okwaro</h5>
                  <span className="text-primary">Team Lead & Full Stack Developer</span>
                  <p className="mt-2 small">Leads the team and architects both frontend and backend solutions.</p>
                  <div className="d-flex justify-content-center gap-2 mt-2">
                    <a href="https://linkedin.com/in/bouric-enos" className="text-dark" title="LinkedIn"><i className="bi bi-linkedin" style={{fontSize: '1.3rem'}}></i></a>
                    <a href="https://github.com/Bouric0076" className="text-dark" title="GitHub"><i className="bi bi-github" style={{fontSize: '1.3rem'}}></i></a>
                  </div>
                </div>
              </div>
              {/* Gabriella Muthoni */}
              <div className="col-lg-3 col-md-4 col-sm-6 d-flex align-items-stretch">
                <div className="card shadow-sm border-0 text-center p-3">
                  <img src="/images/team/gabby.jpg" className="img-fluid rounded-circle mb-3" alt="Gabriella Muthoni" style={{width: '120px', height: '120px', objectFit: 'cover', margin: 'auto'}} />
                  <h5 className="mb-1">Gabriella Muthoni</h5>
                  <span className="text-primary">UI & UX Designer</span>
                  <p className="mt-2 small">Designs intuitive and engaging user experiences for EduLink KE.</p>
                  <div className="d-flex justify-content-center gap-2 mt-2">
                    <a href="https://www.linkedin.com/in/gabriella-muthoni-bb7816300?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app" className="text-dark" title="LinkedIn"><i className="bi bi-linkedin" style={{fontSize: '1.3rem'}}></i></a>
                    <a href="https://github.com/Gabbyclaire" className="text-dark" title="GitHub"><i className="bi bi-github" style={{fontSize: '1.3rem'}}></i></a>
                  </div>
                </div>
              </div>
              {/* Caroline Obuyah */}
              <div className="col-lg-3 col-md-4 col-sm-6 d-flex align-items-stretch">
                <div className="card shadow-sm border-0 text-center p-3">
                  <img src="/images/team/caroline.jpg" className="img-fluid rounded-circle mb-3" alt="Caroline Obuyah" style={{width: '120px', height: '120px', objectFit: 'cover', margin: 'auto'}} />
                  <h5 className="mb-1">Caroline Obuyah</h5>
                  <span className="text-primary">Backend Developer</span>
                  <p className="mt-2 small">Builds robust server-side logic and APIs for seamless operations.</p>
                  <div className="d-flex justify-content-center gap-2 mt-2">
                    <a href="https://www.linkedin.com/in/caroline-obuya-5669312aa?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app" className="text-dark" title="LinkedIn"><i className="bi bi-linkedin" style={{fontSize: '1.3rem'}}></i></a>
                    <a href="https://github.com/Obuya-ai" className="text-dark" title="GitHub"><i className="bi bi-github" style={{fontSize: '1.3rem'}}></i></a>
                  </div>
                </div>
              </div>
              {/* Duncan Mathai */}
              <div className="col-lg-3 col-md-4 col-sm-6 d-flex align-items-stretch">
                <div className="card shadow-sm border-0 text-center p-3">
                  <img src="/images/team/duncan.jpg" className="img-fluid rounded-circle mb-3" alt="Duncan Mathai" style={{width: '120px', height: '120px', objectFit: 'cover', margin: 'auto'}} />
                  <h5 className="mb-1">Duncan Mathai</h5>
                  <span className="text-primary">Auth & Security Engineer</span>
                  <p className="mt-2 small">Ensures platform security and manages authentication systems.</p>
                  <div className="d-flex justify-content-center gap-2 mt-2">
                    <a href="https://www.linkedin.com/in/duncan-mathai-01208b369?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app" className="text-dark" title="LinkedIn"><i className="bi bi-linkedin" style={{fontSize: '1.3rem'}}></i></a>
                    <a href="https://github.com/DuncanMathai" className="text-dark" title="GitHub"><i className="bi bi-github" style={{fontSize: '1.3rem'}}></i></a>
                  </div>
                </div>
              </div>
              {/* Jessy Cheruiyot */}
              <div className="col-lg-3 col-md-4 col-sm-6 d-flex align-items-stretch">
                <div className="card shadow-sm border-0 text-center p-3">
                  <img src="/images/team/jessy.jpg" className="img-fluid rounded-circle mb-3" alt="Jessy Cheruiyot" style={{width: '120px', height: '120px', objectFit: 'cover', margin: 'auto'}} />
                  <h5 className="mb-1">Jessy Cheruiyot</h5>
                  <span className="text-primary">Mobile Developer</span>
                  <p className="mt-2 small">Develops and optimizes the EduLink KE mobile experience.</p>
                  <div className="d-flex justify-content-center gap-2 mt-2">
                    <a href="https://www.linkedin.com/in/jessy-cheruiyot-3a04a4357?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app" className="text-dark" title="LinkedIn"><i className="bi bi-linkedin" style={{fontSize: '1.3rem'}}></i></a>
                    <a href="https://github.com/Jessy12681" className="text-dark" title="GitHub"><i className="bi bi-github" style={{fontSize: '1.3rem'}}></i></a>
                  </div>
                </div>
              </div>
              {/* Mark Matheka */}
              <div className="col-lg-3 col-md-4 col-sm-6 d-flex align-items-stretch">
                <div className="card shadow-sm border-0 text-center p-3">
                  <img src="/images/team/mark.jpg" className="img-fluid rounded-circle mb-3" alt="Mark Matheka" style={{width: '120px', height: '120px', objectFit: 'cover', margin: 'auto'}} />
                  <h5 className="mb-1">Mark Matheka</h5>
                  <span className="text-primary">Data Engineer</span>
                  <p className="mt-2 small">Manages data pipelines and analytics for actionable insights.</p>
                  <div className="d-flex justify-content-center gap-2 mt-2">
                    <a href="https://www.linkedin.com/in/mark-matheka-299830368?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app" className="text-dark" title="LinkedIn"><i className="bi bi-linkedin" style={{fontSize: '1.3rem'}}></i></a>
                    <a href="https://github.com/MarkMatheka" className="text-dark" title="GitHub"><i className="bi bi-github" style={{fontSize: '1.3rem'}}></i></a>
                  </div>
                </div>
              </div>
              {/* Brian Kiragu */}
              <div className="col-lg-3 col-md-4 col-sm-6 d-flex align-items-stretch">
                <div className="card shadow-sm border-0 text-center p-3">
                  <img src="/images/team/brian.jpg" className="img-fluid rounded-circle mb-3" alt="Brian Kiragu" style={{width: '120px', height: '120px', objectFit: 'cover', margin: 'auto'}} />
                  <h5 className="mb-1">Brian Kiragu</h5>
                  <span className="text-primary">Frontend Developer</span>
                  <p className="mt-2 small">Implements engaging and responsive user interfaces.</p>
                  <div className="d-flex justify-content-center gap-2 mt-2">
                    <a href="https://www.linkedin.com/in/brian-kiragu-616a56262?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app" className="text-dark" title="LinkedIn"><i className="bi bi-linkedin" style={{fontSize: '1.3rem'}}></i></a>
                    <a href="https://github.com/Chomba212" className="text-dark" title="GitHub"><i className="bi bi-github" style={{fontSize: '1.3rem'}}></i></a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <style>{`
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

        .page-title .heading p {
          font-size: 1.125rem;
          color: color-mix(in srgb, var(--default-color), transparent 30%);
          margin-bottom: 0;
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

        /* About Section */
        .about .content h3 {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--heading-color);
          margin-bottom: 1.5rem;
        }

        .about .content p {
          margin-bottom: 1.5rem;
          color: var(--default-color);
        }

        .about .content .fst-italic {
          font-style: italic;
          color: color-mix(in srgb, var(--default-color), transparent 20%);
        }

        /* Mission Vision Section */
        #mission-vision h3 {
          color: var(--heading-color);
          font-weight: 700;
          margin-bottom: 1rem;
        }

        /* Core Values Section */
        .values .icon-box {
          display: flex;
          align-items: flex-start;
          padding: 20px;
          border: 1px solid #eef0ef;
          border-radius: 12px;
          transition: all 0.3s;
          background: #ffffff;
          height: 100%;
        }

        .values .icon-box:hover {
          border-color: var(--accent-color);
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }

        .values .icon-box i {
          font-size: 32px;
          margin-right: 20px;
          line-height: 1;
          color: var(--accent-color);
        }

        .values .icon-box h4 {
          font-weight: 700;
          margin: 0 0 10px 0;
          font-size: 18px;
          color: var(--heading-color);
        }

        .values .icon-box p {
          margin: 0;
          color: var(--default-color);
        }

        /* Partners Section */
        .clients .client-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 120px;
          width: 120px;
          border-radius: 15px;
          background: #fff;
          padding: 10px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.07);
          transition: all 0.3s;
        }

        .clients .client-logo:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }

        .clients .client-logo img {
          max-height: 100px;
          max-width: 100px;
          object-fit: contain;
        }

        /* Meet the Team Section */
        #meet-the-team .card {
          background: #fff;
          border-radius: 18px;
          box-shadow: 0 2px 12px 0 rgba(26,184,170,0.08);
          transition: transform 0.18s, box-shadow 0.18s, border 0.18s;
          border: 2px solid transparent;
          height: 100%;
        }

        #meet-the-team .card:hover {
          transform: translateY(-8px) scale(1.03);
          box-shadow: 0 8px 32px 0 rgba(26,184,170,0.18);
          border: 2px solid #1ab8aa;
        }

        #meet-the-team .card img {
          border: 4px solid #e6f9f7;
          box-shadow: 0 2px 8px 0 rgba(26,184,170,0.10);
        }

        #meet-the-team .card h5 {
          color: var(--heading-color);
          font-weight: 700;
          margin-bottom: 0.25rem;
        }

        #meet-the-team .card span {
          font-size: 0.98rem;
          font-weight: 600;
          color: var(--accent-color);
        }

        #meet-the-team .card p {
          color: var(--default-color);
          min-height: 40px;
        }

        #meet-the-team .d-flex.gap-2 a {
          color: var(--accent-color);
          background: #e6f9f7;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s, color 0.2s, box-shadow 0.2s;
          box-shadow: 0 1px 4px 0 rgba(26,184,170,0.08);
          text-decoration: none;
        }

        #meet-the-team .d-flex.gap-2 a:hover {
          background: var(--accent-color);
          color: #fff;
          box-shadow: 0 2px 12px 0 rgba(26,184,170,0.18);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .page-title .heading h1 {
            font-size: 2rem;
          }
          
          .values .icon-box {
            flex-direction: column;
            text-align: center;
          }
          
          .values .icon-box i {
            margin-right: 0;
            margin-bottom: 15px;
          }
        }

        @media (max-width: 576px) {
          .page-title .heading {
            padding: 60px 0;
          }
          
          .page-title .heading h1 {
            font-size: 1.75rem;
          }
          
          #meet-the-team .col-lg-3 {
            flex: 0 0 100%;
            max-width: 100%;
          }
        }
      `}</style>
    </>
  );
};

export default About;