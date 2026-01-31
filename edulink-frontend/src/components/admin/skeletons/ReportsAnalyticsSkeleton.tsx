import React from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import './skeleton.css';

const ReportsAnalyticsSkeleton: React.FC = () => {
    return (
        <div className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="skeleton skeleton-title w-25"></div>
                <div className="skeleton skeleton-button" style={{width: '180px'}}></div>
            </div>

            <Row className="mb-4">
                {[1, 2, 3].map(i => (
                    <Col md={4} key={i}>
                        <Card className="h-100 shadow-sm border-0">
                            <Card.Body>
                                <div className="d-flex align-items-center mb-3">
                                    <div className="skeleton skeleton-icon rounded-circle me-3"></div>
                                    <div className="skeleton skeleton-text w-50"></div>
                                </div>
                                <div className="skeleton skeleton-title w-75 mb-2" style={{height: '48px'}}></div>
                                <div className="skeleton skeleton-text w-50"></div>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>
            
            <Row>
                <Col md={8}>
                    <Card className="shadow-sm border-0 mb-4">
                            <Card.Header className="bg-transparent border-0 pt-4 px-4">
                            <div className="skeleton skeleton-title w-50"></div>
                            </Card.Header>
                            <Card.Body>
                            <div className="skeleton w-100" style={{height: '300px'}}></div>
                            </Card.Body>
                    </Card>
                </Col>
                    <Col md={4}>
                    <Card className="shadow-sm border-0 mb-4">
                            <Card.Header className="bg-transparent border-0 pt-4 px-4">
                            <div className="skeleton skeleton-title w-50"></div>
                            </Card.Header>
                            <Card.Body>
                            <div className="d-flex justify-content-center py-4">
                                <div className="skeleton rounded-circle" style={{width: '200px', height: '200px'}}></div>
                            </div>
                            </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default ReportsAnalyticsSkeleton;
