import React, { useState } from 'react';
import { Card, Button, Form, ProgressBar, Alert } from 'react-bootstrap';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  PlusCircle, 
  CheckCircle, 
  ArrowRight,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface ActiveInternshipWidgetProps {
  internship: any;
  isDarkMode: boolean;
  onQuickLogSubmit?: (entry: string) => Promise<void>;
}

const ActiveInternshipWidget: React.FC<ActiveInternshipWidgetProps> = ({ 
  internship, 
  isDarkMode,
  onQuickLogSubmit 
}) => {
  const [logEntry, setLogEntry] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  if (!internship || internship.status !== 'ACTIVE') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logEntry.trim()) return;

    setIsSubmitting(true);
    try {
      if (onQuickLogSubmit) {
        await onQuickLogSubmit(logEntry);
        setLogEntry('');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to submit quick log', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate progress
  const startDate = new Date(internship.start_date);
  const endDate = new Date(internship.end_date);
  const today = new Date();
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const elapsedDays = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));
  const daysLeft = Math.max(0, totalDays - elapsedDays);

  return (
    <Card className={`border-0 shadow-sm mb-4 ${isDarkMode ? 'bg-dark bg-opacity-50 border-secondary' : 'bg-white'}`}>
      <Card.Header className="bg-transparent border-0 pt-4 px-3 px-md-4 d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2">
          <div className="bg-success bg-opacity-10 p-2 rounded text-success">
            <CheckCircle size={20} />
          </div>
          <h5 className={`mb-0 fw-bold ${isDarkMode ? 'text-white' : ''}`}>Current Internship</h5>
        </div>
        <Link 
          to="/dashboard/student/internship" 
          className="text-decoration-none small fw-semibold d-flex align-items-center gap-1"
        >
          <span className="d-none d-sm-inline">View Full Details</span> <ChevronRight size={14} />
        </Link>
      </Card.Header>
      
      <Card.Body className="p-3 p-md-4">
        <div className="row g-4">
          {/* Internship Overview */}
          <div className="col-lg-6">
            <div className="d-flex align-items-start mb-3">
              <div className="flex-grow-1">
                <h4 className={`mb-1 fw-bold ${isDarkMode ? 'text-white' : ''}`}>{internship.title}</h4>
                <p className="text-success fw-semibold mb-2">{internship.employer_name}</p>
                <div className={`d-flex flex-wrap gap-2 gap-md-3 small ${isDarkMode ? 'text-info opacity-75' : 'text-muted'}`}>
                  <span className="d-flex align-items-center gap-1">
                    <MapPin size={14} /> {internship.location || 'Remote'}
                  </span>
                  <span className="d-flex align-items-center gap-1">
                    <Calendar size={14} /> <span className="d-none d-sm-inline">Ends</span> {new Date(internship.end_date).toLocaleDateString()}
                  </span>
                  <span className="d-flex align-items-center gap-1">
                    <User size={14} /> {internship.supervisor_name || 'Mentor Pending'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2 small">
                <span className={isDarkMode ? 'text-info opacity-75' : 'text-muted'}>
                  Progress: {progressPercent}%
                </span>
                <span className="fw-bold text-success">{daysLeft} days left</span>
              </div>
              <ProgressBar 
                variant="success" 
                now={progressPercent} 
                style={{ height: '8px' }} 
                className={isDarkMode ? 'bg-secondary bg-opacity-25' : 'bg-light'}
              />
            </div>

            <div className="d-flex flex-wrap gap-2">
              <Button 
                variant="outline-success" 
                size="sm" 
                as={Link as any} 
                to="/dashboard/student/logbook"
                className="d-flex align-items-center gap-2 px-3 flex-grow-1 flex-md-grow-0"
              >
                <BookOpen size={16} /> <span className="d-md-inline">Logbook</span>
              </Button>
              <Button 
                variant="outline-primary" 
                size="sm" 
                as={Link as any} 
                to="/dashboard/student/artifacts"
                className="d-flex align-items-center gap-2 px-3 flex-grow-1 flex-md-grow-0"
              >
                <PlusCircle size={16} /> <span className="d-md-inline">Artifacts</span>
              </Button>
            </div>
          </div>

          {/* Quick Log Entry */}
          <div className="col-lg-6 border-start-lg ps-lg-4 border-top border-top-lg-0 pt-4 pt-lg-0">
            <h6 className={`fw-bold mb-3 d-flex align-items-center gap-2 ${isDarkMode ? 'text-white' : ''}`}>
              <Clock size={18} className="text-primary" /> 
              Quick Log: Today's Work
            </h6>
            
            {showSuccess ? (
              <Alert variant="success" className="py-2 px-3 mb-0 d-flex align-items-center gap-2">
                <CheckCircle size={16} /> Entry recorded successfully!
              </Alert>
            ) : (
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="What did you work on today?"
                    value={logEntry}
                    onChange={(e) => setLogEntry(e.target.value)}
                    className={isDarkMode ? 'bg-dark border-secondary text-white' : 'bg-light'}
                    style={{ fontSize: '1rem' }}
                  />
                </Form.Group>
                <div className="d-flex justify-content-end">
                  <Button 
                    variant="primary" 
                    type="submit" 
                    disabled={isSubmitting || !logEntry.trim()}
                    className="d-flex align-items-center gap-2 px-4 w-100 w-md-auto justify-content-center"
                  >
                    {isSubmitting ? (
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    ) : (
                      <>Submit Log <ArrowRight size={16} /></>
                    )}
                  </Button>
                </div>
              </Form>
            )}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default ActiveInternshipWidget;
