import React from 'react';
import { Container, Row, Col, Card, Placeholder } from 'react-bootstrap';

const SupervisorDashboardSkeleton: React.FC = () => {
  return (
    <Container fluid className="py-4">
      {/* Header Skeleton */}
      <div className="mb-4">
        <Placeholder as="h2" animation="glow">
          <Placeholder xs={4} />
        </Placeholder>
        <Placeholder as="p" animation="glow">
          <Placeholder xs={6} />
        </Placeholder>
      </div>

      {/* Stats Cards Skeleton */}
      <Row className="g-4 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <Col md={3} key={i}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body>
                <div className="d-flex align-items-center mb-3">
                  <Placeholder as="div" animation="glow" className="p-3 rounded" style={{ width: 40, height: 40 }}>
                     <Placeholder xs={12} className="h-100" />
                  </Placeholder>
                </div>
                <Placeholder as="h3" animation="glow" className="mb-1">
                  <Placeholder xs={3} />
                </Placeholder>
                <Placeholder as="p" animation="glow" className="mb-0">
                  <Placeholder xs={6} />
                </Placeholder>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Content Skeleton */}
      <Row className="g-4">
        <Col lg={8}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white py-3 border-bottom">
              <Placeholder as="h5" animation="glow" className="mb-0">
                <Placeholder xs={5} />
              </Placeholder>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="p-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="d-flex align-items-center mb-3">
                    <div className="w-100">
                      <Placeholder as="p" animation="glow" className="mb-1">
                        <Placeholder xs={8} />
                      </Placeholder>
                      <Placeholder as="span" animation="glow">
                        <Placeholder xs={4} />
                      </Placeholder>
                    </div>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4}>
          <Card className="border-0 shadow-sm h-100">
             <Card.Header className="bg-white py-3 border-bottom">
                <Placeholder as="h5" animation="glow" className="mb-0">
                   <Placeholder xs={4} />
                </Placeholder>
             </Card.Header>
             <Card.Body>
                {[1, 2, 3, 4].map((i) => (
                   <div key={i} className="mb-3">
                      <Placeholder as="label" animation="glow" className="d-block mb-1">
                         <Placeholder xs={3} />
                      </Placeholder>
                      <Placeholder as="div" animation="glow">
                         <Placeholder xs={8} />
                      </Placeholder>
                   </div>
                ))}
             </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default SupervisorDashboardSkeleton;
