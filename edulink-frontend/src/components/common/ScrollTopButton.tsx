import React, { useEffect, useState } from 'react';

const ScrollTopButton: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 240);
    };

    window.addEventListener('scroll', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <>
      <button
        type="button"
        className={`scroll-top-btn ${visible ? 'show' : ''}`}
        onClick={scrollToTop}
        aria-label="Scroll to top"
      >
        <i className="bi bi-arrow-up-short"></i>
      </button>

      <style>{`
        .scroll-top-btn {
          position: fixed;
          right: 20px;
          bottom: 20px;
          width: 44px;
          height: 44px;
          border: 0;
          border-radius: 12px;
          background: #069b8e;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          visibility: hidden;
          transform: translateY(8px);
          transition:
            opacity .18s ease,
            visibility .18s ease,
            transform .18s ease,
            background .18s ease;
          z-index: 1020;
          box-shadow: 0 10px 25px rgba(6,155,142,.24);
        }

        .scroll-top-btn.show {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }

        .scroll-top-btn:hover {
          background: #057e73;
        }

        .scroll-top-btn i {
          font-size: 24px;
          line-height: 1;
        }
      `}</style>
    </>
  );
};

export default ScrollTopButton;