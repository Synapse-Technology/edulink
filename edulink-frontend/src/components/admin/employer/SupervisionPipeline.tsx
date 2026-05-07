import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Intern {
  id: string;
  student_info?: {
    name: string;
    email: string;
  };
  title: string;
  status: string;
  employer_supervisor_id?: string | null;
  employer_supervisor_name?: string | null;
}

interface SupervisionPipelineProps {
  interns: Intern[];
  supervisors: any[];
  onAssignSupervisor: (
    internId: string,
    supervisorId: string
  ) => Promise<void>;
}

const SupervisionPipeline: React.FC<SupervisionPipelineProps> = ({
  interns,
  supervisors,
  onAssignSupervisor,
}) => {
  const needsMentor = interns.filter(
    (intern) =>
      (intern.status === 'ACCEPTED' || intern.status === 'ACTIVE') &&
      !intern.employer_supervisor_id
  );

  return (
    <section className="sp-card">
      <style>{STYLES}</style>

      <div className="sp-header">
        <div>
          <div className="sp-kicker">
            <ShieldCheck size={13} />
            Supervision operations
          </div>

          <h2 className="sp-title">Mentor assignment pipeline</h2>

          <p className="sp-subtitle">
            Active interns without assigned mentors create operational risk and
            weaken internship accountability.
          </p>
        </div>

        <div className="sp-counter">
          <span className="sp-counter-number">
            {needsMentor.length}
          </span>

          <span className="sp-counter-label">
            Awaiting mentors
          </span>
        </div>
      </div>

      {needsMentor.length === 0 ? (
        <div className="sp-empty">
          <div className="sp-empty-icon">
            <CheckCircle2 size={26} />
          </div>

          <div>
            <h3>All interns supervised</h3>
            <p>
              Every active or accepted intern currently has an assigned
              employer supervisor.
            </p>
          </div>
        </div>
      ) : (
        <div className="sp-list">
          {needsMentor.map((intern) => (
            <article className="sp-item" key={intern.id}>
              <div className="sp-user">
                <div className="sp-avatar">
                  {intern.student_info?.name?.charAt(0) || 'S'}
                </div>

                <div className="sp-user-body">
                  <h3>
                    {intern.student_info?.name || 'Unknown student'}
                  </h3>

                  <p>
                    {intern.student_info?.email || 'No email available'}
                  </p>

                  <div className="sp-role">
                    {intern.title}
                  </div>
                </div>
              </div>

              <div className="sp-status">
                <div className="sp-status-dot" />

                <div>
                  <div className="sp-status-title">
                    Mentor required
                  </div>

                  <div className="sp-status-copy">
                    Internship supervision has not been assigned.
                  </div>
                </div>
              </div>

              <div className="sp-actions">
                <details className="sp-dropdown">
                  <summary className="sp-assign-btn">
                    <UserPlus size={15} />
                    Assign mentor
                  </summary>

                  <div className="sp-dropdown-menu">
                    <div className="sp-dropdown-header">
                      Available supervisors
                    </div>

                    {supervisors.length === 0 ? (
                      <div className="sp-no-supervisors">
                        No supervisors found
                      </div>
                    ) : (
                      supervisors.map((supervisor) => (
                        <button
                          key={supervisor.id}
                          type="button"
                          className="sp-supervisor-option"
                          onClick={() =>
                            onAssignSupervisor(
                              intern.id,
                              supervisor.id
                            )
                          }
                        >
                          <div className="sp-supervisor-avatar">
                            {supervisor.user?.first_name?.charAt(0) || 'S'}
                          </div>

                          <div className="sp-supervisor-meta">
                            <div className="sp-supervisor-name">
                              {supervisor.user?.first_name}{' '}
                              {supervisor.user?.last_name}
                            </div>

                            <div className="sp-supervisor-role">
                              Employer supervisor
                            </div>
                          </div>

                          <ArrowRight size={14} />
                        </button>
                      ))
                    )}

                    <Link
                      to="/employer/dashboard/supervisors"
                      className="sp-invite-link"
                    >
                      <Users size={15} />
                      Invite supervisor
                    </Link>
                  </div>
                </details>

                <Link
                  to={`/employer/dashboard/applications/${intern.id}`}
                  className="sp-view-btn"
                >
                  <ExternalLink size={15} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

const STYLES = `
  .sp-card {
    border: 1px solid var(--el-border);
    border-radius: 24px;
    background:
      radial-gradient(circle at top right, var(--el-accent-soft), transparent 34%),
      var(--el-surface);
    overflow: hidden;
  }

  .sp-header {
    padding: 22px;
    border-bottom: 1px solid var(--el-border);
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
  }

  .sp-kicker {
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--el-accent);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .sp-title {
    color: var(--el-ink);
    font-size: 1.08rem;
    font-weight: 820;
    margin: 0 0 6px;
    letter-spacing: -0.03em;
  }

  .sp-subtitle {
    color: var(--el-muted);
    font-size: 13px;
    line-height: 1.6;
    margin: 0;
    max-width: 620px;
  }

  .sp-counter {
    min-width: 120px;
    border-radius: 20px;
    border: 1px solid var(--el-border);
    background: var(--el-surface-2);
    padding: 16px;
    text-align: center;
  }

  .sp-counter-number {
    display: block;
    color: var(--el-ink);
    font-size: 2rem;
    font-weight: 850;
    line-height: 1;
    letter-spacing: -0.05em;
  }

  .sp-counter-label {
    color: var(--el-muted);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .sp-list {
    display: flex;
    flex-direction: column;
  }

  .sp-item {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 260px auto;
    gap: 20px;
    padding: 20px 22px;
    border-top: 1px solid var(--el-border);
    align-items: center;
  }

  .sp-item:first-child {
    border-top: none;
  }

  .sp-user {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
  }

  .sp-avatar {
    width: 48px;
    height: 48px;
    border-radius: 16px;
    background: var(--el-accent-soft);
    color: var(--el-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 850;
    flex-shrink: 0;
  }

  .sp-user-body {
    min-width: 0;
  }

  .sp-user-body h3 {
    margin: 0 0 3px;
    font-size: 14px;
    font-weight: 780;
    color: var(--el-ink);
  }

  .sp-user-body p {
    margin: 0 0 8px;
    font-size: 12px;
    color: var(--el-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sp-role {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 5px 10px;
    background: var(--el-surface-2);
    border: 1px solid var(--el-border);
    color: var(--el-ink);
    font-size: 11px;
    font-weight: 700;
  }

  .sp-status {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }

  .sp-status-dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: #f59e0b;
    margin-top: 4px;
    flex-shrink: 0;
  }

  .sp-status-title {
    color: var(--el-ink);
    font-size: 13px;
    font-weight: 760;
    margin-bottom: 3px;
  }

  .sp-status-copy {
    color: var(--el-muted);
    font-size: 12px;
    line-height: 1.5;
  }

  .sp-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .sp-dropdown {
    position: relative;
  }

  .sp-dropdown summary {
    list-style: none;
  }

  .sp-dropdown summary::-webkit-details-marker {
    display: none;
  }

  .sp-assign-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border-radius: 14px;
    border: 1px solid var(--el-border);
    background: var(--el-surface-2);
    color: var(--el-ink);
    padding: 10px 14px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 760;
    transition: background 0.15s ease, border-color 0.15s ease;
  }

  .sp-assign-btn:hover {
    background: var(--el-surface);
    border-color: var(--el-accent);
  }

  .sp-dropdown-menu {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    width: 280px;
    border-radius: 18px;
    border: 1px solid var(--el-border);
    background: var(--el-surface);
    box-shadow: 0 18px 42px rgba(16,19,22,0.12);
    padding: 10px;
    z-index: 50;
  }

  .sp-dropdown-header {
    color: var(--el-muted);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 6px 8px 10px;
  }

  .sp-supervisor-option {
    width: 100%;
    border: none;
    background: transparent;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 10px;
    border-radius: 14px;
    padding: 10px;
    text-align: left;
    cursor: pointer;
    color: var(--el-ink);
  }

  .sp-supervisor-option:hover {
    background: var(--el-surface-2);
  }

  .sp-supervisor-avatar {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    background: var(--el-accent-soft);
    color: var(--el-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
  }

  .sp-supervisor-name {
    font-size: 13px;
    font-weight: 760;
  }

  .sp-supervisor-role {
    font-size: 11px;
    color: var(--el-muted);
  }

  .sp-invite-link {
    margin-top: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-top: 1px solid var(--el-border);
    padding: 12px 10px 4px;
    color: var(--el-accent);
    text-decoration: none;
    font-size: 12px;
    font-weight: 800;
  }

  .sp-view-btn {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    border: 1px solid var(--el-border);
    background: var(--el-surface-2);
    color: var(--el-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
  }

  .sp-view-btn:hover {
    background: var(--el-accent-soft);
    color: var(--el-accent);
  }

  .sp-empty {
    padding: 46px 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .sp-empty-icon {
    width: 64px;
    height: 64px;
    border-radius: 22px;
    background: rgba(18,183,106,0.12);
    color: #12b76a;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 18px;
  }

  .sp-empty h3 {
    margin: 0 0 8px;
    font-size: 1rem;
    font-weight: 780;
    color: var(--el-ink);
  }

  .sp-empty p {
    max-width: 420px;
    color: var(--el-muted);
    font-size: 13px;
    line-height: 1.6;
    margin: 0;
  }

  .sp-no-supervisors {
    padding: 12px;
    color: var(--el-muted);
    font-size: 12px;
  }

  @media (max-width: 980px) {
    .sp-item {
      grid-template-columns: 1fr;
    }

    .sp-actions {
      justify-content: space-between;
    }

    .sp-dropdown-menu {
      right: auto;
      left: 0;
    }
  }

  @media (max-width: 640px) {
    .sp-header,
    .sp-item {
      padding-left: 18px;
      padding-right: 18px;
    }

    .sp-header {
      flex-direction: column;
    }

    .sp-counter {
      width: 100%;
    }

    .sp-dropdown-menu {
      width: min(280px, calc(100vw - 56px));
    }
  }
`;

export default SupervisionPipeline;