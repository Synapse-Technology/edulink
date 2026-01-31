import React from 'react';

interface AdminDashboardProps {
  className?: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ className = '' }) => {
  return (
    <div className={`admin-dashboard ${className}`}>
      <div className="admin-dashboard-content">
        <div className="admin-dashboard-placeholder">
          <div className="admin-dashboard-icon">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="admin-dashboard-title">Admin Dashboard</h3>
          <p className="admin-dashboard-description">
            Full administrative dashboard with comprehensive analytics, user management, and system controls.
          </p>
          <div className="admin-dashboard-features">
            <div className="admin-dashboard-feature">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Real-time analytics</span>
            </div>
            <div className="admin-dashboard-feature">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <span>User management</span>
            </div>
            <div className="admin-dashboard-feature">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>System settings</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .admin-dashboard {
          background: white;
          border-radius: 0.75rem;
          padding: 2rem;
          border: 1px solid #e5e7eb;
        }

        .admin-dashboard-content {
          text-align: center;
        }

        .admin-dashboard-placeholder {
          max-width: 32rem;
          margin: 0 auto;
        }

        .admin-dashboard-icon {
          color: #d1d5db;
          margin-bottom: 1.5rem;
          display: flex;
          justify-content: center;
        }

        .admin-dashboard-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
          margin-bottom: 0.5rem;
        }

        .admin-dashboard-description {
          color: #6b7280;
          margin-bottom: 2rem;
          line-height: 1.6;
        }

        .admin-dashboard-features {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
          margin-top: 2rem;
        }

        .admin-dashboard-feature {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #374151;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .admin-dashboard-feature svg {
          color: #059669;
          flex-shrink: 0;
        }

        @media (min-width: 640px) {
          .admin-dashboard {
            padding: 3rem;
          }

          .admin-dashboard-features {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (min-width: 768px) {
          .admin-dashboard-placeholder {
            max-width: 36rem;
          }

          .admin-dashboard-title {
            font-size: 1.875rem;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;