import React from 'react';
import './SupervisorWorkspace.css';

export const SupervisorWorkspacePage: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className = '', children }) => (
  <div className={`sv-page ${className}`.trim()}>{children}</div>
);

export const SupervisorWorkspaceTable: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className = '', children }) => (
  <div className={`sv-table-wrap ${className}`.trim()}>{children}</div>
);

export const SupervisorWorkspaceEmpty: React.FC<{
  icon?: React.ReactNode;
  title: string;
  message?: string;
}> = ({ icon, title, message }) => (
  <div className="sv-empty">
    {icon && <div className="sv-empty-icon">{icon}</div>}
    <h5>{title}</h5>
    {message && <p>{message}</p>}
  </div>
);
