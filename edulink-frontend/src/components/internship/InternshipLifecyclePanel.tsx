import React from 'react';
import { AlertTriangle, Award, CheckCircle, Circle, ClipboardCheck, Clock, ShieldCheck } from 'lucide-react';
import type { InternshipApplication } from '../../services/internship/internshipService';

interface InternshipLifecyclePanelProps {
  application: InternshipApplication;
  roleView?: 'student' | 'employer' | 'institution' | 'supervisor';
  compact?: boolean;
  dark?: boolean;
}

const lifecycleSteps = [
  { status: 'APPLIED', label: 'Applied', owner: 'Student' },
  { status: 'SHORTLISTED', label: 'Shortlisted', owner: 'Employer/Institution' },
  { status: 'ACCEPTED', label: 'Accepted', owner: 'Employer/Institution' },
  { status: 'ACTIVE', label: 'Started', owner: 'Placement owner' },
  { status: 'COMPLETED', label: 'Completed', owner: 'Employer/Supervisor' },
  { status: 'CERTIFIED', label: 'Certified', owner: 'Institution' },
];

const terminalStatuses = ['REJECTED', 'WITHDRAWN', 'TERMINATED'];

const getStepState = (status: string, stepStatus: string) => {
  const currentIndex = lifecycleSteps.findIndex(step => step.status === status);
  const stepIndex = lifecycleSteps.findIndex(step => step.status === stepStatus);

  if (status === stepStatus) return 'current';
  if (currentIndex > stepIndex) return 'done';
  return 'pending';
};

const getRoleHint = (roleView?: InternshipLifecyclePanelProps['roleView']) => {
  switch (roleView) {
    case 'student':
      return 'You can track progress here. Completion and certification are confirmed by supervisors, employers, and your institution.';
    case 'employer':
      return 'Complete the internship only after reviewed evidence, final feedback, and incident clearance.';
    case 'institution':
      return 'Certification is the institution-controlled final validation after work completion.';
    case 'supervisor':
      return 'Supervisor reviews and final feedback unlock completion readiness.';
    default:
      return 'Lifecycle status is shared across all EduLink roles for traceability.';
  }
};

const InternshipLifecyclePanel: React.FC<InternshipLifecyclePanelProps> = ({
  application,
  roleView,
  compact = false,
  dark = false,
}) => {
  const readiness = application.completion_readiness;
  const isTerminal = terminalStatuses.includes(application.status);

  return (
    <section className={`card border-0 shadow-sm ${dark ? 'bg-secondary text-white' : 'bg-white'}`}>
      <div className={`card-body ${compact ? 'p-3' : 'p-4'}`}>
        <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
          <div>
            <h5 className={`fw-bold mb-1 ${dark ? 'text-white' : 'text-dark'}`}>
              Internship Lifecycle
            </h5>
            <p className={`small mb-0 ${dark ? 'text-light opacity-75' : 'text-muted'}`}>
              {getRoleHint(roleView)}
            </p>
          </div>
          <div className={`badge rounded-pill d-inline-flex align-items-center gap-2 px-3 py-2 ${application.status === 'CERTIFIED' ? 'bg-success' : isTerminal ? 'bg-secondary' : 'bg-primary'}`}>
            {application.status === 'CERTIFIED' ? <Award size={14} /> : <Clock size={14} />}
            {application.status}
          </div>
        </div>

        <div className="d-flex lifecycle-strip mb-3">
          {lifecycleSteps.map((step, index) => {
            const state = isTerminal ? (index === 0 ? 'done' : 'pending') : getStepState(application.status, step.status);
            const isDone = state === 'done';
            const isCurrent = state === 'current';

            return (
              <div key={step.status} className="lifecycle-step">
                {index > 0 && (
                  <div className={`lifecycle-line ${isDone || isCurrent ? 'active' : ''}`} />
                )}
                <div className={`lifecycle-node ${state}`}>
                  {isDone || isCurrent ? <CheckCircle size={15} /> : <Circle size={12} />}
                </div>
                <div className={`lifecycle-label ${dark ? 'text-light' : 'text-dark'}`}>
                  {step.label}
                </div>
                <div className={dark ? 'text-light opacity-50' : 'text-muted'}>
                  {step.owner}
                </div>
              </div>
            );
          })}
        </div>

        {readiness && !isTerminal && (
          <div className={`rounded-3 border ${dark ? 'border-secondary bg-dark bg-opacity-50' : 'bg-light'} p-3`}>
            <div className="d-flex align-items-start gap-2 mb-3">
              <div className={`rounded-circle d-inline-flex align-items-center justify-content-center flex-shrink-0 ${readiness.missing.length === 0 ? 'bg-success text-white' : 'bg-warning text-dark'}`} style={{ width: 32, height: 32 }}>
                {readiness.missing.length === 0 ? <ShieldCheck size={17} /> : <AlertTriangle size={17} />}
              </div>
              <div>
                <div className="fw-bold small">{readiness.next_action}</div>
                <div className={dark ? 'small text-light opacity-75' : 'small text-muted'}>
                  Owner: {readiness.next_owner}. {readiness.summary}
                </div>
              </div>
            </div>

            <div className="d-grid gap-2">
              {readiness.checks.map(check => (
                <div key={check.key} className="d-flex align-items-center justify-content-between gap-2">
                  <div className="d-flex align-items-center gap-2">
                    {check.passed ? (
                      <CheckCircle size={16} className="text-success flex-shrink-0" />
                    ) : (
                      <ClipboardCheck size={16} className="text-warning flex-shrink-0" />
                    )}
                    <span className="small">{check.label}</span>
                  </div>
                  {typeof check.count === 'number' && (
                    <span className={`badge ${check.passed ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning-emphasis'}`}>
                      {check.count}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .lifecycle-strip {
          gap: 4px;
          overflow-x: auto;
          padding: 4px 0 8px;
        }

        .lifecycle-step {
          position: relative;
          min-width: 104px;
          flex: 1 0 104px;
          text-align: center;
          font-size: 11px;
        }

        .lifecycle-node {
          width: 30px;
          height: 30px;
          border-radius: 999px;
          margin: 0 auto 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #e2e8f0;
          color: #64748b;
          position: relative;
          z-index: 1;
          border: 3px solid ${dark ? '#334155' : '#fff'};
        }

        .lifecycle-node.done {
          background: #16a34a;
          color: #fff;
        }

        .lifecycle-node.current {
          background: #0d6efd;
          color: #fff;
        }

        .lifecycle-line {
          position: absolute;
          top: 15px;
          right: 50%;
          width: 100%;
          height: 2px;
          background: #cbd5e1;
          z-index: 0;
        }

        .lifecycle-line.active {
          background: #16a34a;
        }

        .lifecycle-label {
          font-weight: 700;
          line-height: 1.2;
        }
      `}</style>
    </section>
  );
};

export default InternshipLifecyclePanel;
