import React from 'react';
import { SupervisorLayout } from '../../../../components/admin/employer';
import { SupervisorWorkspacePage } from '../../../../components/employer/supervisor/workspace';
import SupervisorCheckIns from '../../shared/supervisor/SupervisorCheckIns';

const EmployerSupervisorCheckIns: React.FC = () => (
  <SupervisorLayout>
    <SupervisorWorkspacePage>
      <SupervisorCheckIns />
    </SupervisorWorkspacePage>
  </SupervisorLayout>
);

export default EmployerSupervisorCheckIns;
