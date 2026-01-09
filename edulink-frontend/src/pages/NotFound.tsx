import React from 'react';
import ErrorHero from '../components/common/ErrorHero';
import ErrorCard from '../components/common/ErrorCard';
import { Layout } from '../components';
import { Link } from 'react-router-dom';
import '../styles/error-page.css';

const NotFound: React.FC = () => {
  const navigationOptions = [
    {
      icon: <i className="bi bi-search"></i>,
      title: "Browse Opportunities",
      description: "Find internships, scholarships, and educational programs that match your interests and goals.",
      link: "/opportunities",
      linkText: "Explore Opportunities",
      delay: 200
    },
    {
      icon: <i className="bi bi-book"></i>,
      title: "Learning Resources",
      description: "Access comprehensive guides, tutorials, and educational materials to support your journey.",
      link: "/resources",
      linkText: "View Resources",
      delay: 300
    },
    {
      icon: <i className="bi bi-people"></i>,
      title: "Join Community",
      description: "Connect with like-minded students, mentors, and professionals in our vibrant community.",
      link: "/community",
      linkText: "Join Community",
      delay: 400
    }
  ];

  return (
    <Layout>
      {/* Hero Section - Professional with a touch of personality */}
      <ErrorHero
        errorCode="404"
        title="Lost and Found Department"
        description="This page seems to have taken an unexpected vacation. While it's out there living its best life, we've got plenty of other pages working hard to help you find educational opportunities. Think of this as a happy accident that just expanded your options."
      />

      {/* Navigation Options Section */}
      <section className="error-navigation section light-background">
        <div className="container">
          <div className="row justify-content-center mb-5">
            <div className="col-lg-8 text-center" data-aos="fade-up">
              <div className="section-title mb-4">
                <h2>Let's turn this around</h2>
                <p>
                  Sometimes the best discoveries happen when you're looking for something else entirely. While this particular page might be playing hide and seek, we've curated some excellent starting points for your educational journey. Consider this your serendipitous moment.
                </p>
              </div>
            </div>
          </div>
          
          <div className="row g-4 justify-content-center">
            {navigationOptions.map((option, index) => (
              <div key={index} className="col-md-6 col-lg-4">
                <ErrorCard {...option} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default NotFound;