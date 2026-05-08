import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Row, Col } from 'react-bootstrap';
import { PieChart as PieChartIcon, Activity, Users } from 'lucide-react';
import type { PlacementStats } from '../../../services/institution/institutionService';

interface DashboardChartsProps {
  stats: PlacementStats | null;
}

const COLORS = ['#111827', '#475569', '#94a3b8', '#cbd5e1', '#e2e8f0', '#f1f5f9'];
const PARTICIPATION_COLORS = ['#111827', '#e2e8f0'];

const DashboardCharts: React.FC<DashboardChartsProps> = ({ stats }) => {
  if (!stats) return null;

  const hasData = stats.summary.total_placements > 0;

  const pieData = [
    { name: 'Applied', value: stats.funnel.applied },
    { name: 'Shortlisted', value: stats.funnel.shortlisted },
    { name: 'Accepted', value: stats.funnel.accepted },
    { name: 'Active', value: stats.funnel.active },
    { name: 'Completed', value: stats.funnel.completed },
    { name: 'Certified', value: stats.funnel.certified },
  ].filter(item => item.value > 0);

  const activeCount = stats.funnel.active || 0;
  const totalStudents = stats.summary.total_students || 0;
  const inactiveCount = Math.max(0, totalStudents - activeCount);

  const participationData = [
    { name: 'Active', value: activeCount },
    { name: 'Inactive', value: inactiveCount },
  ];

  const sourceData = [
    { name: 'EduLink Managed', value: stats.source_breakdown?.managed_edulink || 0 },
    { name: 'Employer Sourced', value: stats.source_breakdown?.employer_sourced || 0 },
    { name: 'External Declared', value: stats.source_breakdown?.external_declared || 0 },
  ].filter(item => item.value > 0);

  const activePercentage = Math.round((activeCount / (totalStudents || 1)) * 100);

  const tooltipStyle = {
    borderRadius: 14,
    border: '1px solid #e7eaf0',
    boxShadow: '0 16px 36px rgba(15, 23, 42, 0.10)',
    fontSize: '0.82rem',
  };

  if (!hasData) {
    return (
      <div className="analytics-empty-state">
        <Activity size={46} className="text-muted mb-3" />
        <h5 className="fw-semibold mb-2">No placement analytics yet</h5>
        <p className="text-muted mb-0">
          Analytics will appear once students start moving through internships.
        </p>
      </div>
    );
  }

  const ChartCard = ({
    title,
    subtitle,
    icon: Icon,
    children,
  }: {
    title: string;
    subtitle: string;
    icon: any;
    children: React.ReactNode;
  }) => (
    <div className="institution-chart-card h-100">
      <div className="institution-chart-header">
        <div className="institution-chart-icon">
          <Icon size={18} />
        </div>

        <div>
          <h6 className="institution-chart-title">{title}</h6>
          <p className="institution-chart-subtitle">{subtitle}</p>
        </div>
      </div>

      {children}
    </div>
  );

  return (
    <>
      <style>{`
        .institution-chart-card {
          background: #ffffff;
          border: 1px solid #e7eaf0;
          border-radius: 24px;
          padding: 24px;
        }

        .institution-chart-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }

        .institution-chart-icon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          background: #f6f7f9;
          border: 1px solid #edf0f4;
          color: #111827;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .institution-chart-title {
          color: #111827;
          font-weight: 740;
          letter-spacing: -0.03em;
          margin-bottom: 2px;
        }

        .institution-chart-subtitle {
          color: #64748b;
          font-size: 0.84rem;
          margin-bottom: 0;
        }

        .analytics-empty-state {
          background: #ffffff;
          border: 1px dashed #dbe2ea;
          border-radius: 22px;
          padding: 52px 24px;
          text-align: center;
        }
      `}</style>

      <Row className="g-4">
        <Col lg={6}>
          <ChartCard
            title="Student Participation"
            subtitle="Active students compared to total verified students"
            icon={Users}
          >
            <div style={{ width: '100%', height: 290, minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={participationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={64}
                    outerRadius={92}
                    dataKey="value"
                    stroke="none"
                  >
                    {participationData.map((_, index) => (
                      <Cell
                        key={index}
                        fill={PARTICIPATION_COLORS[index % PARTICIPATION_COLORS.length]}
                      />
                    ))}
                  </Pie>

                  <Tooltip contentStyle={tooltipStyle} />

                  <Legend
                    verticalAlign="bottom"
                    height={34}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '0.82rem', color: '#64748b' }}
                  />

                  <text x="50%" y="44%" textAnchor="middle" dominantBaseline="middle">
                    <tspan x="50%" dy="0" fontSize="26" fontWeight="760" fill="#111827">
                      {activePercentage}%
                    </tspan>
                    <tspan x="50%" dy="22" fontSize="12" fill="#64748b">
                      Active
                    </tspan>
                  </text>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </Col>

        <Col lg={6}>
          <ChartCard
            title="Placement Status"
            subtitle="Application and placement progression breakdown"
            icon={PieChartIcon}
          >
            <div style={{ width: '100%', height: 290, minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={64}
                    outerRadius={88}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>

                  <Tooltip contentStyle={tooltipStyle} />

                  <Legend
                    verticalAlign="bottom"
                    height={34}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '0.82rem', color: '#64748b' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </Col>

        {sourceData.length > 0 && (
          <Col lg={12}>
            <ChartCard
              title="Placement Source Mix"
              subtitle="How institution placements are being sourced"
              icon={Activity}
            >
              <div style={{ width: '100%', height: 260, minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={84}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {sourceData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>

                    <Tooltip contentStyle={tooltipStyle} />

                    <Legend
                      verticalAlign="bottom"
                      height={34}
                      iconType="circle"
                      wrapperStyle={{ fontSize: '0.82rem', color: '#64748b' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </Col>
        )}
      </Row>
    </>
  );
};

export default DashboardCharts;