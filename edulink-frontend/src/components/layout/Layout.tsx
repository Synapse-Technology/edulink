import React from 'react';
import { Outlet } from 'react-router-dom';

import Header from './Header';
import Footer from './Footer';
import ScrollTopButton from '../common/ScrollTopButton';
import PagePreloader from '../common/PagePreloader';

interface LayoutProps {
  children?: React.ReactNode;
  className?: string;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`public-layout ${className}`}>
      <PagePreloader />

      <Header />

      <main className="layout-main">
        {children || <Outlet />}
      </main>

      <Footer />

      <ScrollTopButton />

      <style>{`
        .public-layout {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #ffffff;
        }

        .layout-main {
          flex: 1;
          width: 100%;
        }
      `}</style>
    </div>
  );
};

export default Layout;