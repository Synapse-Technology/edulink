import React from 'react';
import { SupervisorLayout } from '../../../../components/admin/employer';
import { SupervisorWorkspacePage } from '../../../../components/employer/supervisor/workspace';
import SupervisorAssignments from '../../shared/supervisor/SupervisorAssignments';

const EmployerSupervisorAssignments: React.FC = () => (
  <SupervisorLayout>
    <SupervisorWorkspacePage>
      <SupervisorAssignments />
    </SupervisorWorkspacePage>
  </SupervisorLayout>
);

export default EmployerSupervisorAssignments;
