import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Layout from './Layout';
import StudentLayout from '../dashboard/StudentLayout';
import EmployerLayout from '../admin/employer/EmployerLayout';
import InstitutionLayout from '../admin/institution/InstitutionLayout';

interface HybridLayoutProps {
  children: React.ReactNode;
}

const HybridLayout: React.FC<HybridLayoutProps> = ({ children }) => {
  const { user } = useAuth();

  if (!user) {
    return <Layout>{children}</Layout>;
  }

  // Determine role-based layout
  switch (user.role) {
    case 'student':
      return <StudentLayout>{children}</StudentLayout>;
    case 'employer':
    case 'employer_admin':
      return <EmployerLayout>{children}</EmployerLayout>;
    case 'institution':
    case 'institution_admin':
    case 'supervisor':
      return (
        <InstitutionLayout>
          {children}
        </InstitutionLayout>
      );
    default:
      // Fallback to Public Layout if role is unknown or not handled
      return <Layout>{children}</Layout>;
  }
};

export default HybridLayout;
