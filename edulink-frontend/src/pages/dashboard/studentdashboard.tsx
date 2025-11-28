import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState(user?.firstName || 'Student');

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      setUserName('John Doe');
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Dark mode disabled for consistent white/bright theme
  // const toggleDarkMode = () => {
  //   setIsDarkMode(!isDarkMode);
  //   document.body.classList.toggle('dark-mode');
  // };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center py-16 min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-teal-600 mb-4"></div>
        <div className="text-teal-700 text-lg font-semibold mt-2">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row m-0 p-0 h-screen min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside 
        id="sidebar" 
        className={`hidden md:flex flex-col justify-between z-30 p-0 fixed md:static top-0 left-0 h-full md:h-screen w-[230px] bg-teal-500 text-white transition-transform duration-300 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        style={{ background: '#14b8a6' }}
      >
        <div>
          <div className="text-center py-6 mb-2 border-b border-teal-700">
            <span className="text-white" style={{ fontFamily: "'Pacifico', cursive", fontSize: '1.7rem', fontWeight: 400, letterSpacing: '1px' }}>
              EduLink
            </span>
          </div>
          <nav className="flex flex-col pt-8 px-4 gap-1">
            <Link to="/dashboard/student" className="block px-3 py-2 rounded hover:bg-teal-700 bg-teal-700 flex items-center text-sm">
              <i className="ph ph-gauge mr-3 text-base"></i>Dashboard
            </Link>
            <Link to="/dashboard/student/browse" className="block px-3 py-2 rounded hover:bg-teal-700 flex items-center text-sm">
              <i className="ph ph-magnifying-glass mr-3 text-base"></i>Browse Internships
            </Link>
            <Link to="/dashboard/student/applications" className="block px-3 py-2 rounded hover:bg-teal-700 flex items-center text-sm">
              <i className="ph ph-list-checks mr-3 text-base"></i>Application Tracker
            </Link>
            <Link to="/dashboard/student/internships" className="block px-3 py-2 rounded hover:bg-teal-700 flex items-center text-sm">
              <i className="ph ph-briefcase mr-3 text-base"></i>My Internship
            </Link>
            <Link to="/dashboard/student/reports" className="block px-3 py-2 rounded hover:bg-teal-700 flex items-center text-sm">
              <i className="ph ph-book-open mr-3 text-base"></i>Reports & Logbooks
            </Link>
            <Link to="/dashboard/student/cv" className="block px-3 py-2 rounded hover:bg-teal-700 flex items-center text-sm">
              <i className="ph ph-file-text mr-3 text-base"></i>CV & Toolkit
            </Link>
            <Link to="/dashboard/student/support" className="block px-3 py-2 rounded hover:bg-teal-700 flex items-center text-sm">
              <i className="ph ph-lifebuoy mr-3 text-base"></i>Support
            </Link>
          </nav>
        </div>
        <div className="mt-auto px-4 pb-6 pt-4">
          <button 
            onClick={handleLogout}
            className="block px-3 py-2 rounded hover:bg-teal-700 flex items-center text-sm w-full text-left"
          >
            <i className="ph ph-sign-out mr-3 text-base"></i>Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-2 sm:p-4 md:p-6 min-h-0 h-screen md:ml-0 ml-0 overflow-y-auto" style={{ background: 'linear-gradient(120deg, #f0fdfa 0%, #e0f2fe 100%)' }}>
        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
            onClick={toggleMobileMenu}
          ></div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between h-14 bg-white rounded-full shadow mb-6 px-4 w-full max-w-full mt-6 relative">
          <button 
            id="mobileMenuBtn" 
            className="md:hidden flex items-center justify-center mr-2 bg-teal-600 text-white p-2 rounded-full shadow-lg focus:outline-none"
            onClick={toggleMobileMenu}
            aria-label="Open menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1 flex items-center justify-end">
            <Link to="/dashboard/student/messages" className="flex items-center justify-center mr-4" title="Messages" style={{ background: 'none', border: 'none', padding: 0 }}>
              <i className="bi bi-chat-dots" style={{ fontSize: '1.5rem', color: '#14b8a6', textShadow: '0 1px 2px rgba(20,184,166,0.15)' }}></i>
            </Link>
            <button 
              id="notificationBtn" 
              title="Notifications" 
              style={{ background: 'none', border: 'none', padding: 0, marginRight: '1rem' }}
            >
              <i className="bi bi-bell" style={{ fontSize: '1.5rem', color: '#14b8a6', textShadow: '0 1px 2px rgba(20,184,166,0.15)' }}></i>
            </button>
            <Link to="/dashboard/student/profile" className="flex items-center justify-center ml-1" title="Profile">
              <img id="profilePic" src="https://via.placeholder.com/40" className="profile-pic" alt="Profile" style={{ height: '38px', width: '38px', objectFit: 'cover', borderRadius: '50%', border: '2px solid #14b8a6', boxShadow: '0 1px 4px rgba(20,184,166,0.08)' }} />
            </Link>

          </div>
        </div>

        {/* Welcome Message */}
        <div className="mb-8 text-center" id="welcome-section">
          <h1 className="text-2xl font-bold text-teal-700 mb-2">Welcome back, {userName}!</h1>
          <p className="text-gray-600">Here's what's happening with your internship journey</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10" id="stats-section">
          <div className="bg-white rounded-xl p-4 shadow-lg border border-teal-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Success Rate</p>
                <h3 className="text-lg font-bold text-teal-600">75%</h3>
              </div>
              <i className="bi bi-trophy text-2xl text-yellow-500"></i>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-lg border border-teal-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Avg Response</p>
                <h3 className="text-lg font-bold text-teal-600">3.2 days</h3>
              </div>
              <i className="bi bi-clock text-2xl text-blue-500"></i>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-lg border border-teal-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">This Month</p>
                <h3 className="text-lg font-bold text-teal-600">12</h3>
              </div>
              <i className="bi bi-calendar-check text-2xl text-green-500"></i>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-lg border border-teal-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Total Apps</p>
                <h3 className="text-lg font-bold text-teal-600">45</h3>
              </div>
              <i className="bi bi-file-earmark-text text-2xl text-purple-500"></i>
            </div>
          </div>
        </div>

        {/* Analytics & Insights */}
        <section className="mb-12" style={{ background: 'none', boxShadow: 'none' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center w-full">
              <div className="flex-1 border-t border-gray-200"></div>
              <span className="mx-4 flex items-center gap-2 text-xl font-bold text-teal-700 tracking-tight">
                <i className="bi bi-bar-chart text-teal-600 text-xl"></i> Analytics & Insights
              </span>
              <div className="flex-1 border-t border-gray-200"></div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-lg border border-teal-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Success Rate</p>
                  <h3 className="text-lg font-bold text-teal-600">75%</h3>
                </div>
                <i className="bi bi-trophy text-2xl text-yellow-500"></i>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-lg border border-teal-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Avg Response</p>
                  <h3 className="text-lg font-bold text-teal-600">3.2 days</h3>
                </div>
                <i className="bi bi-clock text-2xl text-blue-500"></i>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-lg border border-teal-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">This Month</p>
                  <h3 className="text-lg font-bold text-teal-600">12</h3>
                </div>
                <i className="bi bi-calendar-check text-2xl text-green-500"></i>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-lg border border-teal-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Total Apps</p>
                  <h3 className="text-lg font-bold text-teal-600">45</h3>
                </div>
                <i className="bi bi-file-earmark-text text-2xl text-purple-500"></i>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default StudentDashboard;