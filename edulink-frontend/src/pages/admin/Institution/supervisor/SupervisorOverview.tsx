import React from 'react';
  import { Users, FileText, Clock, ChevronRight, AlertTriangle } from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import type { SupervisorDashboardContext } from './SupervisorDashboard';
import styled, { keyframes } from 'styled-components';

/* ─── Animations ──────────────────────────────────────────────────── */
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const stagger = (i: number) => `animation-delay: ${i * 60}ms;`;

/* ─── Layout ──────────────────────────────────────────────────────── */
const Page = styled.div`
  animation: ${fadeUp} 0.3s ease both;
`;

const WelcomeRow = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.75rem;
  flex-wrap: wrap;
`;

const WelcomeText = styled.div`
  h2 {
    font-size: 20px;
    font-weight: 700;
    color: var(--navy);
    margin: 0 0 4px;
    letter-spacing: -0.025em;
  }
  p {
    font-size: 13.5px;
    color: var(--steel);
    margin: 0;
  }
`;

const DatePill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 13px;
  background: var(--accent-dim);
  color: var(--accent);
  border: 1px solid rgba(47,111,237,0.15);
  border-radius: 20px;
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
`;

/* ─── Stat cards ──────────────────────────────────────────────────── */
const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 1.5rem;

  @media (max-width: 900px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 480px) { grid-template-columns: 1fr; }
`;

const StatCard = styled.div<{ $i: number }>`
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  animation: ${fadeUp} 0.35s ease both;
  ${p => stagger(p.$i)}
`;

const StatBody = styled.div`
  padding: 1.1rem 1.25rem 1rem;
`;

const StatIconRow = styled.div<{ $bg: string }>`
  width: 38px;
  height: 38px;
  border-radius: 9px;
  background: ${p => p.$bg};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.85rem;
`;

const StatValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: var(--navy);
  letter-spacing: -0.03em;
  line-height: 1;
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: 11.5px;
  font-weight: 600;
  color: var(--steel);
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const StatBar = styled.div<{ $color: string }>`
  height: 3px;
  background: ${p => p.$color};
  opacity: 0.55;
`;

/* ─── Bottom grid ─────────────────────────────────────────────────── */
const BottomGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 14px;

  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

/* ─── Card shell ──────────────────────────────────────────────────── */
const Card = styled.div`
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const CardHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;

  h5 { font-size: 14px; font-weight: 600; color: var(--navy); margin: 0; }
`;

const ViewAllBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: none;
  border: none;
  color: var(--accent);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  transition: gap 0.14s;
  &:hover { gap: 6px; }
`;

/* ─── Table ───────────────────────────────────────────────────────── */
const TableWrap = styled.div`overflow-x: auto; flex: 1;`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
`;

const Thead = styled.thead`
  background: var(--fog);
  th {
    padding: 9px 16px;
    font-size: 11px;
    font-weight: 600;
    color: var(--steel);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }
  th:first-child { padding-left: 1.5rem; }
  th:last-child  { padding-right: 1.5rem; }
`;

const Tbody = styled.tbody`
  tr {
    border-bottom: 1px solid var(--border);
    transition: background 0.12s;
    &:last-child { border-bottom: none; }
    &:hover { background: var(--fog); }
  }
  td {
    padding: 12px 16px;
    vertical-align: middle;
  }
  td:first-child { padding-left: 1.5rem; }
  td:last-child  { padding-right: 1.5rem; }
`;

const StudentCell = styled.div`
  strong { display: block; font-size: 13px; font-weight: 600; color: var(--navy); margin-bottom: 2px; }
  span   { font-size: 12px; color: var(--steel); }
`;

const DateText = styled.div`
  font-size: 12.5px;
  color: var(--steel);
`;

const PendingPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  background: #FFFBEB;
  color: #92400E;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  &::before {
    content: '';
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #D97706;
    flex-shrink: 0;
  }
`;

const TypePill = styled.span`
  display: inline-flex;
  padding: 3px 9px;
  background: var(--fog);
  color: var(--slate);
  border: 1px solid var(--border);
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
`;

/* ─── Empty state ─────────────────────────────────────────────────── */
const Empty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3.5rem 1rem;
  text-align: center;

  div.icon {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--fog);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1rem;
  }
  h5 { font-size: 14px; font-weight: 600; color: var(--navy); margin: 0 0 5px; }
  p  { font-size: 12.5px; color: var(--steel); margin: 0; }
`;

/* ─── Profile card ────────────────────────────────────────────────── */
const ProfileBody = styled.div`
  padding: 1.25rem 1.5rem;
  flex: 1;
`;

const Avatar = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 12px;
  background: var(--accent);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  font-weight: 700;
  flex-shrink: 0;
  letter-spacing: -0.02em;
`;

const AvatarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 1.1rem;

  h6 { font-size: 14px; font-weight: 600; color: var(--navy); margin: 0 0 2px; }
  p  { font-size: 12px; color: var(--steel); margin: 0; }
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid var(--border);
  margin: 0 0 1rem;
`;

const ProfileFields = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ProfileField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const FieldLabel = styled.div`
  font-size: 10.5px;
  font-weight: 600;
  color: var(--steel);
  text-transform: uppercase;
  letter-spacing: 0.07em;
`;

const FieldValue = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: var(--navy);
`;

const InstitutionValue = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: var(--navy);
  padding: 7px 10px;
  background: var(--fog);
  border-left: 3px solid var(--accent);
  border-radius: 0 6px 6px 0;
`;

const RolePill = styled.span`
  display: inline-flex;
  padding: 3px 10px;
  background: var(--accent-dim);
  color: var(--accent);
  border: 1px solid rgba(47,111,237,0.15);
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 600;
`;

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

/* ─── Stat config ─────────────────────────────────────────────────── */
const STATS = (
  assignedStudentsCount: number,
  pendingLogbooksCount: number,
  incidentsCount: number,
  hoursLoggedCount: number
) => [
  {
    label: 'Assigned Students',
    value: assignedStudentsCount,
    Icon: Users,
    iconColor: '#2F6FED',
    iconBg: '#EFF6FF',
    bar: '#2F6FED',
  },
  {
    label: 'Pending Logbooks',
    value: pendingLogbooksCount,
    Icon: FileText,
    iconColor: '#D97706',
    iconBg: '#FFFBEB',
    bar: '#D97706',
  },
  {
    label: 'Incidents',
    value: incidentsCount,
    Icon: AlertTriangle,
    iconColor: '#DC2626',
    iconBg: '#FEF2F2',
    bar: '#DC2626',
  },
  {
    label: 'Hours Logged',
    value: hoursLoggedCount,
    Icon: Clock,
    iconColor: '#0891B2',
    iconBg: '#ECFEFF',
    bar: '#0891B2',
  },
];

/* ─── Component ───────────────────────────────────────────────────── */
const SupervisorOverview: React.FC = () => {
  const {
    user,
    profile,
    assignedStudentsCount,
    pendingLogbooksCount,
    hoursLoggedCount,
    recentEvidence,
    incidents,
  } = useOutletContext<SupervisorDashboardContext>();

  const navigate = useNavigate();
  const stats = STATS(assignedStudentsCount, pendingLogbooksCount, incidents.length, hoursLoggedCount);

  return (
    <Page>
      <WelcomeRow>
        <WelcomeText>
          <h2>Welcome back, {user?.firstName}!</h2>
          <p>Here's what's happening with your assigned students.</p>
        </WelcomeText>
        <DatePill>
          <Clock size={13} />
          {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </DatePill>
      </WelcomeRow>

      <StatsGrid>
        {stats.map((s, i) => (
          <StatCard key={s.label} $i={i}>
            <StatBody>
              <StatIconRow $bg={s.iconBg}>
                <s.Icon size={18} color={s.iconColor} />
              </StatIconRow>
              <StatValue>{s.value}</StatValue>
              <StatLabel>{s.label}</StatLabel>
            </StatBody>
            <StatBar $color={s.bar} />
          </StatCard>
        ))}
      </StatsGrid>

      <BottomGrid>
        {/* Recent logbooks */}
        <Card>
          <CardHead>
            <h5>Recent logbook submissions</h5>
            {recentEvidence.length > 0 && (
              <ViewAllBtn onClick={() => navigate('/institution/supervisor-dashboard/logbooks')}>
                View all <ChevronRight size={13} />
              </ViewAllBtn>
            )}
          </CardHead>

          {recentEvidence.length > 0 ? (
            <TableWrap>
              <Table>
                <Thead>
                  <tr>
                    <th>Student / Title</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Type</th>
                  </tr>
                </Thead>
                <Tbody>
                  {recentEvidence.slice(0, 5).map(ev => (
                    <tr key={ev.id}>
                      <td>
                        <StudentCell>
                          <strong>{ev.student_info?.name || 'Student'}</strong>
                          <span>{ev.title}</span>
                        </StudentCell>
                      </td>
                      <td>
                        <DateText>{new Date(ev.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</DateText>
                      </td>
                      <td><PendingPill>Pending review</PendingPill></td>
                      <td><TypePill>{ev.evidence_type}</TypePill></td>
                    </tr>
                  ))}
                </Tbody>
              </Table>
            </TableWrap>
          ) : (
            <Empty>
              <div className="icon">
                <FileText size={24} color="var(--steel)" />
              </div>
              <h5>No pending submissions</h5>
              <p>When students submit logbooks, they'll appear here.</p>
            </Empty>
          )}
        </Card>

        {/* Profile card */}
        <Card>
          <CardHead>
            <h5>My profile</h5>
          </CardHead>

          {profile ? (
            <ProfileBody>
              <AvatarRow>
                <Avatar>
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </Avatar>
                <div>
                  <h6>{user?.firstName} {user?.lastName}</h6>
                  <p>{user?.email}</p>
                </div>
              </AvatarRow>

              <Divider />

              <ProfileFields>
                <ProfileField>
                  <FieldLabel>Institution</FieldLabel>
                  <InstitutionValue>{profile.institution_name}</InstitutionValue>
                </ProfileField>

                <ProfileField>
                  <FieldLabel>Department</FieldLabel>
                  <FieldValue>{profile.department || 'N/A'}</FieldValue>
                </ProfileField>

                <TwoCol>
                  <ProfileField>
                    <FieldLabel>Cohort</FieldLabel>
                    <FieldValue>{profile.cohort || 'All Cohorts'}</FieldValue>
                  </ProfileField>
                  <ProfileField>
                    <FieldLabel>Role</FieldLabel>
                    <RolePill>{profile.role || 'Supervisor'}</RolePill>
                  </ProfileField>
                </TwoCol>
              </ProfileFields>
            </ProfileBody>
          ) : (
            <Empty>
              <div className="icon">
                <Users size={22} color="var(--steel)" />
              </div>
              <h5>Profile unavailable</h5>
              <p>Profile information could not be loaded.</p>
            </Empty>
          )}
        </Card>
      </BottomGrid>
    </Page>
  );
};

export default SupervisorOverview;