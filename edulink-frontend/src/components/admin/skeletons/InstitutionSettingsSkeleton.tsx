import React from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import './skeleton.css';

const InstitutionSettingsSkeleton: React.FC = () => {
  return (
    <div className="institution-settings-skeleton">
      {/* Header Skeleton */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <div className="skeleton skeleton-title mb-2" style={{ width: '150px' }}></div>
          <div className="skeleton skeleton-text" style={{ width: '300px' }}></div>
        </div>
      </div>

      <Row>
        {/* Sidebar/Tabs Skeleton */}
        <Col md={3}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body className="p-0">
              <div className="p-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="skeleton skeleton-tab mb-1" style={{ height: '40px', width: '100%' }}></div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Content/Form Skeleton */}
        <Col md={9}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              <div className="skeleton skeleton-title mb-4" style={{ width: '200px' }}></div>
              
              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <div className="skeleton skeleton-text mb-2" style={{ width: '100px' }}></div>
                  <div className="skeleton skeleton-input" style={{ height: '40px' }}></div>
                </div>
                <div className="col-md-6">
                  <div className="skeleton skeleton-text mb-2" style={{ width: '100px' }}></div>
                  <div className="skeleton skeleton-input" style={{ height: '40px' }}></div>
                </div>
                <div className="col-12">
                  <div className="skeleton skeleton-text mb-2" style={{ width: '100px' }}></div>
                  <div className="skeleton skeleton-input" style={{ height: '40px' }}></div>
                </div>
                <div className="col-12">
                  <div className="skeleton skeleton-text mb-2" style={{ width: '100px' }}></div>
                  <div className="skeleton skeleton-input" style={{ height: '100px' }}></div>
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2">
                <div className="skeleton skeleton-button" style={{ width: '100px', height: '40px' }}></div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default InstitutionSettingsSkeleton;
