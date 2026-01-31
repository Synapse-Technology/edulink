import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Button, Alert, Table, ProgressBar, Badge } from 'react-bootstrap';
import { 
    Download, BarChart2, TrendingUp, Users, 
    AlertCircle, FileText, Shield, PieChart, Activity 
} from 'lucide-react';
import { institutionService } from '../../../services/institution/institutionService';
import type { PlacementStats, TimeToPlacementStats } from '../../../services/institution/institutionService';
import ReportsAnalyticsSkeleton from '../../../components/admin/skeletons/ReportsAnalyticsSkeleton';

const ReportsAnalytics: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [placementStats, setPlacementStats] = useState<PlacementStats | null>(null);
    const [timeStats, setTimeStats] = useState<TimeToPlacementStats | null>(null);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [pStats, tStats] = await Promise.all([
                    institutionService.getPlacementSuccessStats(),
                    institutionService.getTimeToPlacementStats()
                ]);
                setPlacementStats(pStats);
                setTimeStats(tStats);
            } catch (err: any) {
                setError(err.message || 'Failed to load analytics data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleExport = async () => {
        setExporting(true);
        try {
            const blob = await institutionService.exportReport();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `institution_analytics_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err: any) {
            setError(err.message || 'Failed to export report');
        } finally {
            setExporting(false);
        }
    };

    if (loading) {
        return <ReportsAnalyticsSkeleton />;
    }

    const summary = placementStats?.summary;
    const funnel = placementStats?.funnel;
    const quality = placementStats?.quality_control;

    return (
        <div className="p-4 bg-light min-vh-100">
            {/* Header section */}
            <div className="d-flex justify-content-between align-items-center mb-5 bg-white p-4 rounded-4 shadow-sm">
                <div>
                    <h2 className="fw-bold text-dark mb-1">Institutional Intelligence</h2>
                    <p className="text-muted mb-0">Deep analytics and audit insights for quality assurance</p>
                </div>
                <div className="d-flex gap-3">
                    <Button 
                        variant="outline-primary" 
                        className="d-flex align-items-center gap-2 rounded-3 px-4"
                        onClick={() => window.print()}
                    >
                        <FileText size={18} />
                        Print Summary
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={handleExport} 
                        disabled={exporting}
                        className="d-flex align-items-center gap-2 rounded-3 px-4 shadow-sm"
                    >
                        {exporting ? 'Exporting...' : (
                            <>
                                <Download size={18} />
                                Export Raw Data
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {error && <Alert variant="danger" className="rounded-3 shadow-sm">{error}</Alert>}

            {/* Top Level Summary Cards */}
            <Row className="mb-4 g-4">
                {[
                    { title: "Placement Rate", value: `${summary?.placement_rate}%`, sub: `of ${summary?.total_students} students`, icon: PieChart, color: "primary" },
                    { title: "Avg. Placement Time", value: `${timeStats?.average_days}d`, sub: `Median: ${timeStats?.median_days}d`, icon: TrendingUp, color: "success" },
                    { title: "Audit Readiness", value: `${quality?.audit_readiness_score}%`, sub: "Quality Score", icon: Shield, color: "info" },
                    { title: "Active Incidents", value: quality?.unresolved_incidents, sub: `of ${quality?.total_incidents} total`, icon: AlertCircle, color: "danger" }
                ].map((stat, idx) => (
                    <Col key={idx} lg={3} md={6}>
                        <Card className="border-0 shadow-sm rounded-4 h-100 overflow-hidden">
                            <Card.Body className="p-4">
                                <div className="d-flex justify-content-between align-items-start mb-3">
                                    <div className={`bg-${stat.color} bg-opacity-10 p-3 rounded-3`}>
                                        <stat.icon className={`text-${stat.color}`} size={24} />
                                    </div>
                                    <Badge bg="light" className="text-muted border">Real-time</Badge>
                                </div>
                                <h2 className="display-6 fw-bold mb-1">{stat.value}</h2>
                                <p className="text-muted small mb-0 fw-medium">{stat.title}</p>
                                <div className="mt-2 text-muted small">{stat.sub}</div>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>

            <Row className="mb-4 g-4">
                {/* Conversion Funnel */}
                <Col lg={4}>
                    <Card className="border-0 shadow-sm rounded-4 h-100">
                        <Card.Body className="p-4">
                            <h5 className="fw-bold mb-4 d-flex align-items-center">
                                <BarChart2 size={20} className="me-2 text-primary" />
                                Conversion Funnel
                            </h5>
                            {funnel && [
                                { label: "Applied", value: funnel.applied, color: "secondary" },
                                { label: "Shortlisted", value: funnel.shortlisted, color: "info" },
                                { label: "Accepted", value: funnel.accepted, color: "primary" },
                                { label: "Active", value: funnel.active, color: "warning" },
                                { label: "Certified", value: funnel.certified, color: "success" }
                            ].map((step, idx) => {
                                const percentage = funnel.applied > 0 ? (step.value / funnel.applied) * 100 : 0;
                                return (
                                    <div key={idx} className="mb-4">
                                        <div className="d-flex justify-content-between mb-1">
                                            <span className="small fw-bold text-muted">{step.label}</span>
                                            <span className="small fw-bold">{step.value}</span>
                                        </div>
                                        <ProgressBar now={percentage} variant={step.color} style={{ height: '8px' }} className="rounded-pill" />
                                    </div>
                                );
                            })}
                        </Card.Body>
                    </Card>
                </Col>

                {/* Department Performance */}
                <Col lg={8}>
                    <Card className="border-0 shadow-sm rounded-4 h-100">
                        <Card.Body className="p-4">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h5 className="fw-bold mb-0 d-flex align-items-center">
                                    <Users size={20} className="me-2 text-primary" />
                                    Department Performance
                                </h5>
                            </div>
                            <div className="table-responsive">
                                <Table hover borderless className="align-middle">
                                    <thead className="bg-light bg-opacity-50">
                                        <tr className="text-muted small text-uppercase fw-bold">
                                            <th className="py-3">Department</th>
                                            <th className="py-3">Placement Rate</th>
                                            <th className="py-3">Active/Total</th>
                                            <th className="py-3">Certified</th>
                                            <th className="py-3 text-end">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {placementStats?.departments.map((dept, idx) => (
                                            <tr key={idx} className="border-bottom border-light">
                                                <td className="py-3 fw-bold">{dept.name}</td>
                                                <td className="py-3">
                                                    <div className="d-flex align-items-center gap-2">
                                                        <div className="flex-grow-1" style={{ minWidth: '80px' }}>
                                                            <ProgressBar now={dept.placement_rate} variant="primary" style={{ height: '4px' }} />
                                                        </div>
                                                        <span className="small fw-bold">{dept.placement_rate}%</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 text-muted">
                                                    <span className="text-dark fw-bold">{dept.placements}</span> / {dept.total_students}
                                                </td>
                                                <td className="py-3">
                                                    <div className={`px-3 py-1 rounded-pill d-inline-block small fw-bold ${dept.certified > 0 ? 'bg-success bg-opacity-10 text-success' : 'bg-light text-muted border'}`}>
                                                        {dept.certified} Certified
                                                    </div>
                                                </td>
                                                <td className="py-3 text-end">
                                                    <Button variant="link" className="text-primary p-0 small fw-bold text-decoration-none">
                                                        View Details
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row className="g-4">
                {/* Audit & Compliance */}
                <Col lg={6}>
                    <Card className="border-0 shadow-sm rounded-4 h-100 bg-white">
                        <Card.Body className="p-4">
                            <h5 className="fw-bold mb-4 d-flex align-items-center">
                                <Activity size={20} className="me-2 text-primary" />
                                Audit & Compliance Tracking
                            </h5>
                            <Row className="g-4">
                                <Col sm={6}>
                                    <div className="p-4 bg-light rounded-4 border-start border-primary border-4">
                                        <div className="text-muted small mb-1 fw-bold">EVIDENCE FREQUENCY</div>
                                        <h3 className="fw-bold mb-0">{quality?.avg_evidence_per_placement}</h3>
                                        <div className="text-muted x-small">Submissions per student</div>
                                    </div>
                                </Col>
                                <Col sm={6}>
                                    <div className="p-4 bg-light rounded-4 border-start border-success border-4">
                                        <div className="text-muted small mb-1 fw-bold">TOTAL LOGBOOKS</div>
                                        <h3 className="fw-bold mb-0">{quality?.evidence_count}</h3>
                                        <div className="text-muted x-small">Verified entries in ledger</div>
                                    </div>
                                </Col>
                            </Row>
                            <div className="mt-4 p-4 rounded-4 border bg-white">
                                <div className="d-flex align-items-center gap-3">
                                    <div className="bg-warning bg-opacity-10 p-3 rounded-circle">
                                        <Shield className="text-warning" size={24} />
                                    </div>
                                    <div>
                                        <h6 className="fw-bold mb-1">Quality Control Recommendation</h6>
                                        <p className="text-muted small mb-0">
                                            {quality?.unresolved_incidents && quality.unresolved_incidents > 0 
                                                ? `You have ${quality.unresolved_incidents} unresolved incidents. Review them to maintain audit score.`
                                                : "All quality controls are within optimal range for this semester."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Engagement Trends */}
                <Col lg={6}>
                    <Card className="border-0 shadow-sm rounded-4 h-100">
                        <Card.Body className="p-4">
                            <h5 className="fw-bold mb-4 d-flex align-items-center">
                                <TrendingUp size={20} className="me-2 text-primary" />
                                Engagement Velocity
                            </h5>
                            <div className="d-flex align-items-center justify-content-center flex-column py-5 bg-light rounded-4">
                                <Activity size={48} className="text-primary opacity-25 mb-3" />
                                <h6 className="text-muted fw-bold">Monthly Growth Rate: {summary?.total_trend}%</h6>
                                <p className="text-muted small">Engagement velocity is trending {summary?.total_trend && summary.total_trend > 0 ? "upward" : "downward"} compared to last month</p>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default ReportsAnalytics;
