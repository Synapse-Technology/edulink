import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children?: React.ReactNode;
  className?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, className = '' }) => {
  useEffect(() => {
    // Force light mode for public layout
    document.body.classList.remove('dark-mode');
    
    // Scroll top button functionality
    const scrollTop = document.getElementById('scroll-top');
    const preloader = document.getElementById('preloader');

    const toggleScrollTop = () => {
      if (scrollTop) {
        if (window.scrollY > 100) {
          scrollTop.classList.add('show');
        } else {
          scrollTop.classList.remove('show');
        }
      }
    };

    const handleScrollTopClick = (e: Event) => {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    };

    const hidePreloader = () => {
      if (preloader) {
        setTimeout(() => {
          preloader.style.display = 'none';
        }, 500);
      }
    };

    // Initialize functionality
    if (scrollTop) {
      window.addEventListener('load', toggleScrollTop);
      window.addEventListener('scroll', toggleScrollTop);
      scrollTop.addEventListener('click', handleScrollTopClick);
    }

    if (preloader) {
      window.addEventListener('load', hidePreloader);
      
      // Fallback: hide preloader after 3 seconds max
      setTimeout(() => {
        if (preloader.style.display !== 'none') {
          preloader.style.display = 'none';
        }
      }, 3000);
    }

    // Check if page is already loaded
    if (document.readyState === 'complete') {
      hidePreloader();
      toggleScrollTop();
    }

    // Cleanup function
    return () => {
      if (scrollTop) {
        window.removeEventListener('load', toggleScrollTop);
        window.removeEventListener('scroll', toggleScrollTop);
        scrollTop.removeEventListener('click', handleScrollTopClick);
      }
      if (preloader) {
        window.removeEventListener('load', hidePreloader);
      }
    };
  }, []);

  return (
    <div className={`index-page ${className}`}>
      <Header />
      <main className="main">
        {children || <Outlet />}
      </main>
      <Footer />
      
      {/* Scroll Top Button */}
      <a href="#" id="scroll-top" className="scroll-top d-flex align-items-center justify-content-center">
        <i className="bi bi-arrow-up-short"></i>
      </a>

      {/* Preloader */}
      <div id="preloader"></div>

      <style>{`
        .index-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .main {
          flex: 1;
        }

        /* Scroll Top Button Styles */
        .scroll-top {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 40px;
          height: 40px;
          background: rgb(9, 173, 179);
          color: #fff;
          border-radius: 4px;
          text-decoration: none;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s;
          z-index: 999;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .scroll-top.show {
          opacity: 1;
          visibility: visible;
        }

        .scroll-top:hover {
          background: rgb(7, 150, 155);
          color: #fff;
        }

        .scroll-top i {
          font-size: 24px;
        }

        /* Preloader Styles */
        #preloader {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: #fff;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        #preloader:before {
          content: "";
          width: 40px;
          height: 40px;
          border: 4px solid #eef0ef;
          border-top-color: rgb(9, 173, 179);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Section Background Classes */
        .dark-background {
          background: linear-gradient(135deg, #112019 0%, #1a2e25 100%);
          color: #fff;
        }

        .light-background {
          background: #f8f9fa;
        }

        /* Utility Classes */
        .section {
          padding: 80px 0;
          overflow: hidden;
        }

        .section-title {
          text-align: center;
          padding-bottom: 60px;
        }

        .section-title h2 {
          font-size: 32px;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 20px;
          padding-bottom: 20px;
          position: relative;
          color: #5f687b;
        }

        .section-title h2::before {
          content: "";
          position: absolute;
          display: block;
          width: 120px;
          height: 1px;
          background: #ddd;
          bottom: 1px;
          left: calc(50% - 60px);
        }

        .section-title h2::after {
          content: "";
          position: absolute;
          display: block;
          width: 40px;
          height: 3px;
          background: rgb(9, 173, 179);
          bottom: 0;
          left: calc(50% - 20px);
        }

        .section-title p {
          margin-bottom: 0;
        }

        .sticky-top {
          position: sticky;
          top: 0;
          z-index: 1020;
        }

        /* Container Fluid */
        .container-fluid {
          width: 100%;
          padding-right: 15px;
          padding-left: 15px;
          margin-right: auto;
          margin-left: auto;
        }

        /* Enhanced Responsive Design */
        @media (max-width: 768px) {
          .section {
            padding: 60px 0;
          }
          
          .section-title {
            padding-bottom: 40px;
          }
          
          .section-title h2 {
            font-size: 28px;
          }
        }

        @media (max-width: 576px) {
          .section {
            padding: 40px 0;
          }
          
          .section-title {
            padding-bottom: 30px;
          }
          
          .section-title h2 {
            font-size: 24px;
          }
        }
      `}</style>
    </div>
  );
};

export default Layout;
