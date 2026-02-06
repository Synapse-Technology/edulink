import React from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';
import { Card, Row, Col } from 'react-bootstrap';
import { PieChart as PieChartIcon, Activity, Users } from 'lucide-react';
import type { PlacementStats } from '../../../services/institution/institutionService';

interface DashboardChartsProps {
  stats: PlacementStats | null;
}

// Custom Palette - Shades of Blue/Purple/Teal
const COLORS = ['#4318FF', '#6AD2FF', '#EFF4FB', '#33C3F0', '#9D7BD8', '#F2F4F7'];

const DashboardCharts: React.FC<DashboardChartsProps> = ({ stats }) => {
  if (!stats) return null;

  const hasData = stats.summary.total_placements > 0;

  // Transform funnel object into array for Recharts
  const pieData = [
    { name: 'Applied', value: stats.funnel.applied },
    { name: 'Shortlisted', value: stats.funnel.shortlisted },
    { name: 'Accepted', value: stats.funnel.accepted },
    { name: 'Active', value: stats.funnel.active },
    { name: 'Completed', value: stats.funnel.completed },
    { name: 'Certified', value: stats.funnel.certified },
  ].filter(item => item.value > 0);

  // Active vs Inactive Students Data
  const activeCount = stats.funnel.active || 0;
  const totalStudents = stats.summary.total_students;
  const inactiveCount = Math.max(0, totalStudents - activeCount);

  const participationData = [
    { name: 'Active', value: activeCount },
    { name: 'Inactive', value: inactiveCount }
  ];

  // Participation Colors: Active (Solid Blue), Inactive (Light Gray)
  const PARTICIPATION_COLORS = ['#4318FF', '#EFF4FB'];

  if (!hasData) {
     return (
        <Card className="border-0 shadow-sm mb-4 text-center py-5">
            <Card.Body>
                <div className="text-muted mb-3 d-flex justify-content-center">
                    <Activity size={48} strokeWidth={1.5} className="text-muted opacity-50" />
                </div>
                <h5 className="text-muted">No Placement Data Available</h5>
                <p className="text-muted small mb-0">
                    Analytics will appear here once students start participating in internships.
                </p>
            </Card.Body>
        </Card>
     );
  }

  return (
    <Row className="g-4 mb-4">
      {/* Participation Chart (Active vs Inactive) */}
      <Col lg={6}>
        <Card className="border-0 shadow-sm h-100 rounded-4">
          <Card.Body className="p-4">
            <h5 className="card-title mb-4 d-flex align-items-center fw-bold text-dark">
                <Users size={20} className="me-2 text-primary"/>
                Student Participation
            </h5>
            <div style={{ width: '100%', height: 300, minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={participationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={0}
                    dataKey="value"
                    stroke="none"
                  >
                    {participationData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PARTICIPATION_COLORS[index % PARTICIPATION_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                     contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                     itemStyle={{ color: '#2B3674', fontWeight: 600 }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                  />
                  {/* Center Text */}
                  <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle">
                    <tspan x="50%" dy="0" fontSize="24" fontWeight="bold" fill="#2B3674">
                        {Math.round((activeCount / (totalStudents || 1)) * 100)}%
                    </tspan>
                    <tspan x="50%" dy="20" fontSize="12" fill="#A3AED0">
                        Active
                    </tspan>
                  </text>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card.Body>
        </Card>
      </Col>

      {/* Status Breakdown Chart */}
      <Col lg={6}>
        <Card className="border-0 shadow-sm h-100 rounded-4">
          <Card.Body className="p-4">
            <h5 className="card-title mb-4 d-flex align-items-center fw-bold text-dark">
                <PieChartIcon size={20} className="me-2 text-info"/>
                Placement Status
            </h5>
            <div style={{ width: '100%', height: 300, minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                     contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default DashboardCharts;
