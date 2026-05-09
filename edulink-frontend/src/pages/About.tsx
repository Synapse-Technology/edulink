import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  Github,
  GraduationCap,
  Linkedin,
  ShieldCheck,
} from 'lucide-react';

const partners = [
  { name: 'JKUAT', logo: '/images/partners/jkuat.png' },
  { name: 'JHUB Africa', logo: '/images/partners/jhub.png' },
  { name: 'Sinaps Technology', logo: '/images/partners/synapse.png' },
];

const values = [
  {
    icon: <ShieldCheck size={22} />,
    title: 'Trust',
    description:
      'We design verification, approvals, and records around evidence, not assumptions.',
  },
  {
    icon: <Building2 size={22} />,
    title: 'Institutional collaboration',
    description:
      'EduLink works best when schools, employers, and students share one clear workflow.',
  },
  {
    icon: <CheckCircle2 size={22} />,
    title: 'Practical impact',
    description:
      'We focus on tools that reduce paperwork, improve visibility, and help students transition into work.',
  },
];

const audiences = [
  {
    icon: <GraduationCap size={24} />,
    title: 'Students',
    description:
      'Find verified opportunities, manage applications, submit logbooks, and build credible career records.',
  },
  {
    icon: <Building2 size={24} />,
    title: 'Institutions',
    description:
      'Track placements, verify students, assign assessors, review reports, and certify completion.',
  },
  {
    icon: <Briefcase size={24} />,
    title: 'Employers',
    description:
      'Post opportunities, review candidates, supervise interns, approve tasks, and validate experience.',
  },
];

const team = [
  {
    name: 'Dr. Lawrence Nderu',
    role: 'Project Inspector',
    image: '/images/team/Lawrence.jpeg',
    description: 'Mentor and supervisor guiding the team toward practical impact.',
    linkedin: 'https://www.linkedin.com/in/dr-lawrence-nderu/',
    github: '#',
    group: 'Advisor',
  },
  {
    name: 'Bouric Okwaro',
    role: 'Team Lead & Full Stack Developer',
    image: '/images/team/bouric.jpeg',
    description: 'Leads product direction and architects frontend and backend systems.',
    linkedin: 'https://linkedin.com/in/bouric-enos',
    github: 'https://github.com/Bouric0076',
    group: 'Lead',
  },
  {
    name: 'Gabriella Muthoni',
    role: 'UI & UX Designer',
    image: '/images/team/gabby.jpg',
    description: 'Designs accessible, intuitive, and user-centered product experiences.',
    linkedin:
      'https://www.linkedin.com/in/gabriella-muthoni-bb7816300?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app',
    github: 'https://github.com/Gabbyclaire',
    group: 'Core Team',
  },
  {
    name: 'Caroline Obuyah',
    role: 'Backend Developer',
    image: '/images/team/caroline.jpg',
    description: 'Builds server-side logic, APIs, and platform workflows.',
    linkedin:
      'https://www.linkedin.com/in/caroline-obuya-5669312aa?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app',
    github: 'https://github.com/Obuya-ai',
    group: 'Core Team',
  },
  {
    name: 'Duncan Mathai',
    role: 'Auth & Security Engineer',
    image: '/images/team/duncan.jpg',
    description: 'Works on authentication, access control, and platform security.',
    linkedin:
      'https://www.linkedin.com/in/duncan-mathai-01208b369?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app',
    github: 'https://github.com/DuncanMathai',
    group: 'Core Team',
  },
  {
    name: 'Jessy Cheruiyot',
    role: 'Mobile Developer',
    image: '/images/team/jessy.jpg',
    description: 'Develops and improves the EduLink mobile experience.',
    linkedin:
      'https://www.linkedin.com/in/jessy-cheruiyot-3a04a4357?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app',
    github: 'https://github.com/Jessy12681',
    group: 'Core Team',
  },
  {
    name: 'Mark Matheka',
    role: 'Data Engineer',
    image: '/images/team/mark.jpg',
    description: 'Supports analytics, reporting, and data workflows.',
    linkedin:
      'https://www.linkedin.com/in/mark-matheka-299830368?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app',
    github: 'https://github.com/MarkMatheka',
    group: 'Core Team',
  },
  {
    name: 'Brian Kiragu',
    role: 'Frontend Developer',
    image: '/images/team/brian.jpg',
    description: 'Implements responsive interfaces and frontend product flows.',
    linkedin:
      'https://www.linkedin.com/in/brian-kiragu-616a56262?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app',
    github: 'https://github.com/Chomba212',
    group: 'Core Team',
  },
];

const About: React.FC = () => {
  return (
    <>
      <main className="about-page">
        <section className="about-hero">
          <div className="about-container">
            <div className="about-hero-grid">
              <div>
                <div className="about-badge">
                  <ShieldCheck size={15} />
                  Student-built · institution-ready
                </div>

                <h1>
                  Building verified career transition infrastructure for Kenyan
                  students.
                </h1>

                <p>
                  EduLink KE helps students move from campus to credible work
                  experience while giving institutions and employers the tools to
                  manage placements, logbooks, supervision, reporting, and
                  certification.
                </p>

                <div className="about-actions">
                  <Link to="/opportunities" className="about-primary-btn">
                    Explore opportunities
                    <ArrowRight size={16} />
                  </Link>

                  <Link to="/admin" className="about-secondary-btn">
                    View admin workflows
                  </Link>
                </div>
              </div>

              <div className="about-hero-card">
                <img
                  src="/images/team/edulink_team.jpg"
                  alt="EduLink team discussing plans"
                />

                <div className="about-hero-card-body">
                  <h3>Born from real placement problems</h3>
                  <p>
                    Built by JKUAT Computer Technology students with support
                    from JHUB Africa, EduLink focuses on the practical gap
                    between learning, attachment, internship, and verified career
                    records.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="about-stats">
          <div className="about-container">
            <div className="about-stat-grid">
              <div>
                <strong>Students</strong>
                <span>Applications, logbooks, proof of experience</span>
              </div>
              <div>
                <strong>Institutions</strong>
                <span>Verification, assessors, reports, certification</span>
              </div>
              <div>
                <strong>Employers</strong>
                <span>Listings, supervision, task validation</span>
              </div>
              <div>
                <strong>Evidence</strong>
                <span>Records that can be reviewed and trusted</span>
              </div>
            </div>
          </div>
        </section>

        <section className="about-story section">
          <div className="about-container">
            <div className="about-two-col">
              <div>
                <span className="about-section-kicker">Why EduLink exists</span>
                <h2>Internship and attachment workflows are still too fragmented.</h2>
              </div>

              <div className="about-copy">
                <p>
                  Many students still depend on scattered messages, manual
                  paperwork, unclear verification, and weak visibility between
                  school, employer, and student. That creates fraud risk,
                  tracking gaps, and poor institutional insight.
                </p>

                <p>
                  EduLink KE was created to make the transition from school to
                  work more structured. The platform brings students,
                  institutions, and employers into one workflow where
                  opportunities, logbooks, approvals, and completion records can
                  be managed with clarity.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="about-values section soft-bg">
          <div className="about-container">
            <div className="about-section-head">
              <span className="about-section-kicker">Principles</span>
              <h2>What guides the platform</h2>
              <p>
                We do not need many corporate values. We need a few principles
                that directly affect how the product works.
              </p>
            </div>

            <div className="about-card-grid three">
              {values.map((item) => (
                <div className="about-value-card" key={item.title}>
                  <div className="about-icon">{item.icon}</div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="about-audience section">
          <div className="about-container">
            <div className="about-section-head">
              <span className="about-section-kicker">Who we build for</span>
              <h2>One ecosystem, different workflows</h2>
              <p>
                EduLink is not just a student opportunity board. It is a shared
                workflow layer for career transition.
              </p>
            </div>

            <div className="about-card-grid three">
              {audiences.map((item) => (
                <div className="about-audience-card" key={item.title}>
                  <div className="about-icon">{item.icon}</div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="about-partners section soft-bg">
          <div className="about-container">
            <div className="about-section-head">
              <span className="about-section-kicker">Support & ecosystem</span>
              <h2>Built with academic and innovation ecosystem support</h2>
              <p>
                EduLink KE is shaped by student innovation, academic mentorship,
                and the need for better placement infrastructure.
              </p>
            </div>

            <div className="partner-grid">
              {partners.map((partner) => (
                <div className="partner-card" key={partner.name}>
                  <img src={partner.logo} alt={partner.name} />
                  <span>{partner.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="about-team section">
          <div className="about-container">
            <div className="about-section-head">
              <span className="about-section-kicker">Team</span>
              <h2>The people building EduLink KE</h2>
              <p>
                A student-led technical team building a practical platform for
                students, institutions, and employers.
              </p>
            </div>

            <div className="team-grid">
              {team.map((member) => (
                <article className="team-card" key={member.name}>
                  <div className="team-image-wrap">
                    <img src={member.image} alt={member.name} />
                    <span>{member.group}</span>
                  </div>

                  <h3>{member.name}</h3>
                  <p className="team-role">{member.role}</p>
                  <p className="team-description">{member.description}</p>

                  <div className="team-links">
                    {member.linkedin && (
                      <a
                        href={member.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${member.name} LinkedIn`}
                      >
                        <Linkedin size={16} />
                      </a>
                    )}

                    {member.github && member.github !== '#' && (
                      <a
                        href={member.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${member.name} GitHub`}
                      >
                        <Github size={16} />
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="about-cta">
          <div className="about-container">
            <div className="about-cta-inner">
              <div>
                <span className="about-section-kicker">Pilot with us</span>
                <h2>Help shape verified career transition workflows.</h2>
                <p>
                  We are looking for students, employers, and institutions that
                  can give real workflow feedback as EduLink KE moves toward
                  broader adoption.
                </p>
              </div>

              <Link
                to="https://sinapstechnology.tech/edulink-beta"
                className="about-primary-btn"
                target="_blank"
                rel="noopener noreferrer"
              >
                Join EduLink Beta
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <style>{`
        .about-page {
          background: #ffffff;
          color: #111827;
        }

        .about-container {
          width: 100%;
          max-width: 1140px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .section {
          padding: 82px 0;
        }

        .soft-bg {
          background: #f6faf9;
        }

        .about-hero {
          padding: 88px 0 70px;
          background:
            radial-gradient(circle at top right, rgba(6,155,142,.12), transparent 34%),
            linear-gradient(180deg, #ffffff 0%, #f6faf9 100%);
        }

        .about-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(340px, .9fr);
          gap: 52px;
          align-items: center;
        }

        .about-badge,
        .about-section-kicker {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #069b8e;
          font-size: .74rem;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: .1em;
        }

        .about-badge {
          padding: 7px 12px;
          border-radius: 999px;
          background: rgba(6,155,142,.08);
          border: 1px solid rgba(6,155,142,.14);
          margin-bottom: 18px;
        }

        .about-hero h1 {
          max-width: 760px;
          font-size: clamp(2.4rem, 5vw, 4.6rem);
          line-height: .98;
          letter-spacing: -.08em;
          font-weight: 900;
          margin: 0 0 20px;
          color: #071a18;
        }

        .about-hero p {
          max-width: 650px;
          color: #5f6b7a;
          line-height: 1.8;
          font-size: 1.02rem;
          margin: 0;
        }

        .about-actions {
          margin-top: 30px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .about-primary-btn,
        .about-secondary-btn {
          min-height: 46px;
          padding: 0 18px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 850;
          text-decoration: none;
          transition: transform .14s ease, background .16s ease, border-color .16s ease;
        }

        .about-primary-btn {
          background: #069b8e;
          color: #ffffff;
        }

        .about-primary-btn:hover {
          background: #057e73;
          color: #ffffff;
          transform: translateY(-1px);
        }

        .about-secondary-btn {
          background: #ffffff;
          color: #111827;
          border: 1px solid #e5e7eb;
        }

        .about-secondary-btn:hover {
          border-color: rgba(6,155,142,.28);
          color: #069b8e;
        }

        .about-hero-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 26px;
          overflow: hidden;
          box-shadow: 0 22px 60px rgba(17,24,39,.08);
        }

        .about-hero-card img {
          width: 100%;
          height: 290px;
          object-fit: cover;
          display: block;
        }

        .about-hero-card-body {
          padding: 24px;
        }

        .about-hero-card-body h3 {
          font-size: 1.15rem;
          font-weight: 850;
          color: #111827;
          margin: 0 0 8px;
        }

        .about-hero-card-body p {
          font-size: .9rem;
          line-height: 1.7;
        }

        .about-stats {
          padding: 22px 0;
          background: #071a18;
        }

        .about-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1px;
          background: rgba(255,255,255,.08);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 20px;
          overflow: hidden;
        }

        .about-stat-grid div {
          background: #071a18;
          padding: 20px;
        }

        .about-stat-grid strong {
          display: block;
          color: #ffffff;
          font-size: .95rem;
          font-weight: 850;
          margin-bottom: 6px;
        }

        .about-stat-grid span {
          color: rgba(255,255,255,.48);
          font-size: .82rem;
          line-height: 1.5;
        }

        .about-two-col {
          display: grid;
          grid-template-columns: .9fr 1.1fr;
          gap: 56px;
          align-items: start;
        }

        .about-two-col h2,
        .about-section-head h2,
        .about-cta h2 {
          color: #111827;
          font-size: clamp(1.8rem, 3vw, 2.6rem);
          line-height: 1.08;
          letter-spacing: -.06em;
          font-weight: 900;
          margin: 12px 0 0;
        }

        .about-copy p {
          color: #5f6b7a;
          line-height: 1.85;
          margin: 0 0 18px;
        }

        .about-section-head {
          max-width: 680px;
          margin-bottom: 34px;
        }

        .about-section-head p {
          color: #6b7280;
          line-height: 1.75;
          margin: 12px 0 0;
        }

        .about-card-grid {
          display: grid;
          gap: 18px;
        }

        .about-card-grid.three {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .about-value-card,
        .about-audience-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 22px;
          padding: 24px;
          transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease;
        }

        .about-value-card:hover,
        .about-audience-card:hover {
          transform: translateY(-4px);
          border-color: rgba(6,155,142,.24);
          box-shadow: 0 18px 44px rgba(17,24,39,.07);
        }

        .about-icon {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          background: rgba(6,155,142,.08);
          color: #069b8e;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
        }

        .about-value-card h3,
        .about-audience-card h3 {
          font-size: 1rem;
          font-weight: 850;
          color: #111827;
          margin: 0 0 8px;
        }

        .about-value-card p,
        .about-audience-card p {
          color: #6b7280;
          line-height: 1.7;
          font-size: .9rem;
          margin: 0;
        }

        .partner-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .partner-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 22px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .partner-card img {
          width: 74px;
          height: 74px;
          object-fit: contain;
          border-radius: 16px;
          background: #ffffff;
          border: 1px solid #eef2f7;
          padding: 8px;
        }

        .partner-card span {
          color: #111827;
          font-weight: 850;
        }

        .team-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 18px;
        }

        .team-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 24px;
          padding: 18px;
          transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease;
        }

        .team-card:hover {
          transform: translateY(-5px);
          border-color: rgba(6,155,142,.24);
          box-shadow: 0 18px 44px rgba(17,24,39,.08);
        }

        .team-image-wrap {
          position: relative;
          margin-bottom: 16px;
        }

        .team-image-wrap img {
          width: 100%;
          aspect-ratio: 1 / 1;
          object-fit: cover;
          border-radius: 20px;
          display: block;
        }

        .team-image-wrap span {
          position: absolute;
          left: 10px;
          bottom: 10px;
          background: rgba(7,26,24,.86);
          color: #ffffff;
          border-radius: 999px;
          padding: 5px 9px;
          font-size: .68rem;
          font-weight: 850;
        }

        .team-card h3 {
          color: #111827;
          font-size: 1rem;
          font-weight: 850;
          margin: 0 0 4px;
        }

        .team-role {
          color: #069b8e;
          font-size: .8rem;
          font-weight: 850;
          margin: 0 0 10px;
        }

        .team-description {
          color: #6b7280;
          line-height: 1.6;
          font-size: .82rem;
          margin: 0 0 14px;
        }

        .team-links {
          display: flex;
          gap: 8px;
        }

        .team-links a {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: #f6faf9;
          color: #069b8e;
          border: 1px solid rgba(6,155,142,.12);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
        }

        .team-links a:hover {
          background: #069b8e;
          color: #ffffff;
        }

        .about-cta {
          padding: 70px 0;
          background: #071a18;
        }

        .about-cta-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 30px;
          background:
            radial-gradient(circle at top right, rgba(11,191,163,.16), transparent 30%),
            rgba(255,255,255,.045);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 28px;
          padding: 36px;
        }

        .about-cta .about-section-kicker {
          color: #0bbfa3;
        }

        .about-cta h2 {
          color: #ffffff;
        }

        .about-cta p {
          max-width: 620px;
          color: rgba(255,255,255,.56);
          line-height: 1.75;
          margin: 12px 0 0;
        }

        @media (max-width: 980px) {
          .about-hero-grid,
          .about-two-col {
            grid-template-columns: 1fr;
          }

          .about-card-grid.three,
          .partner-grid,
          .team-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .about-stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .about-cta-inner {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        @media (max-width: 640px) {
          .about-hero {
            padding: 64px 0 48px;
          }

          .section {
            padding: 58px 0;
          }

          .about-card-grid.three,
          .partner-grid,
          .team-grid,
          .about-stat-grid {
            grid-template-columns: 1fr;
          }

          .about-hero-card img {
            height: 220px;
          }

          .about-cta-inner {
            padding: 24px;
          }
        }
      `}</style>
    </>
  );
};

export default About;