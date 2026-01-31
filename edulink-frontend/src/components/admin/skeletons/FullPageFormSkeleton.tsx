import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import './skeleton.css';

const FullPageFormSkeleton: React.FC = () => {
  return (
    <Container className="d-flex justify-content-center align-items-center bg-light" style={{ minHeight: '100vh' }}>
      <Row className="justify-content-center w-100">
        <Col md={8} lg={6} xl={5}>
          <div className="text-center mb-4">
            <div className="skeleton skeleton-title mx-auto mb-2" style={{ width: '150px' }}></div>
            <div className="skeleton skeleton-text mx-auto" style={{ width: '200px' }}></div>
          </div>
          
          <Card className="shadow border-0 rounded-3">
            <Card.Header className="bg-white border-bottom-0 pt-4 pb-0 px-4 text-center">
              <div className="skeleton rounded-circle mx-auto mb-3" style={{ width: '64px', height: '64px' }}></div>
              <div className="skeleton skeleton-title mx-auto mb-2" style={{ width: '180px' }}></div>
              <div className="skeleton skeleton-text mx-auto mb-3" style={{ width: '220px' }}></div>
            </Card.Header>
            
            <Card.Body className="p-4">
              <Row className="g-3 mb-3">
                <Col sm={6}>
                  <div className="skeleton skeleton-text mb-1" style={{ width: '80px' }}></div>
                  <div className="skeleton skeleton-input"></div>
                </Col>
                <Col sm={6}>
                  <div className="skeleton skeleton-text mb-1" style={{ width: '80px' }}></div>
                  <div className="skeleton skeleton-input"></div>
                </Col>
              </Row>
              
              <div className="mb-3">
                <div className="skeleton skeleton-text mb-1" style={{ width: '100px' }}></div>
                <div className="skeleton skeleton-input"></div>
              </div>
              
              <div className="mb-4">
                <div className="skeleton skeleton-text mb-1" style={{ width: '120px' }}></div>
                <div className="skeleton skeleton-input"></div>
              </div>
              
              <div className="skeleton skeleton-button w-100" style={{ height: '48px' }}></div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default FullPageFormSkeleton;
