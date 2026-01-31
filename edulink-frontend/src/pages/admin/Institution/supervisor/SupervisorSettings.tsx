import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { Settings, User, Lock, Save, Send } from 'lucide-react';
import { useAuthStore } from '../../../../stores/authStore';
import { authService } from '../../../../services/auth/authService';
import { institutionService } from '../../../../services/institution/institutionService';

const SupervisorSettings: React.FC = () => {
  const { user } = useAuthStore();
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
  });
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'danger', text: string } | null>(null);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'danger', text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setProfileForm({
        first_name: user.firstName || '',
        last_name: user.lastName || '',
        email: user.email || '',
      });
    }
  }, [user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const payload: { first_name?: string; last_name?: string; email?: string } = {};
    if (profileForm.first_name !== (user.firstName || '')) {
      payload.first_name = profileForm.first_name;
    }
    if (profileForm.last_name !== (user.lastName || '')) {
      payload.last_name = profileForm.last_name;
    }
    if (profileForm.email !== (user.email || '')) {
      payload.email = profileForm.email;
    }

    if (Object.keys(payload).length === 0) {
      setProfileMessage({ type: 'danger', text: 'No changes to submit' });
      return;
    }

    try {
      setProfileSubmitting(true);
      setProfileMessage(null);
      await institutionService.requestSupervisorProfileUpdate(payload);
      setProfileMessage({
        type: 'success',
        text: 'Profile update request submitted for admin review',
      });
    } catch (err: any) {
      setProfileMessage({
        type: 'danger',
        text: err.message || 'Failed to submit profile update request',
      });
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'danger', text: 'New passwords do not match' });
      return;
    }

    try {
      setLoading(true);
      await authService.changePassword({
        new_password: passwordData.newPassword,
        re_new_password: passwordData.confirmPassword,
        current_password: passwordData.currentPassword
      });
      setMessage({ type: 'success', text: 'Password updated successfully' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setMessage({ type: 'danger', text: err.message || 'Failed to update password' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="supervisor-settings">
       {/* Header Section */}
       <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center mb-4">
          <div className="mb-4 mb-lg-0">
            <div className="d-flex align-items-center gap-3 mb-3">
              <div className="bg-secondary bg-opacity-10 p-3 rounded-3">
                <Settings size={28} className="text-secondary" />
              </div>
              <div>
                <h1 className="h2 fw-bold mb-1">Account Settings</h1>
                <p className="text-muted mb-0">
                  Manage your profile information and security preferences
                </p>
              </div>
            </div>
          </div>
       </div>

      <Row className="g-4">
        <Col md={6}>
          <Card className="border-0 shadow-sm h-100 overflow-hidden">
            <Card.Header className="bg-white py-3 px-4 border-bottom d-flex align-items-center gap-2">
              <User size={18} className="text-muted" />
              <h5 className="mb-0 fw-bold">Profile Information</h5>
            </Card.Header>
            <Card.Body className="p-4">
              {profileMessage && (
                <Alert
                  variant={profileMessage.type}
                  onClose={() => setProfileMessage(null)}
                  dismissible
                  className="mb-4"
                >
                  {profileMessage.text}
                </Alert>
              )}
              <div className="text-center mb-4">
                 <div className="avatar bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center fw-bold shadow-sm mb-3" style={{width: 80, height: 80, fontSize: '2rem'}}>
                   {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                 </div>
                 <h5 className="fw-bold text-dark">{user?.firstName} {user?.lastName}</h5>
                 <p className="text-muted small">{user?.email}</p>
              </div>

              <Form onSubmit={handleProfileSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label className="small text-uppercase fw-bold text-muted">Full Name</Form.Label>
                  <Row className="g-2">
                    <Col>
                      <Form.Control
                        type="text"
                        value={profileForm.first_name}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, first_name: e.target.value })
                        }
                        placeholder="First name"
                      />
                    </Col>
                    <Col>
                      <Form.Control
                        type="text"
                        value={profileForm.last_name}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, last_name: e.target.value })
                        }
                        placeholder="Last name"
                      />
                    </Col>
                  </Row>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label className="small text-uppercase fw-bold text-muted">Email Address</Form.Label>
                  <Form.Control 
                    type="email" 
                    value={profileForm.email}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, email: e.target.value })
                    }
                    placeholder="you@example.edu"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label className="small text-uppercase fw-bold text-muted">Role</Form.Label>
                  <div className="d-flex">
                     <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill border border-primary-subtle">
                        Institution Supervisor
                     </span>
                  </div>
                </Form.Group>
                <div className="d-flex justify-content-end mt-3">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={profileSubmitting}
                    className="d-inline-flex align-items-center gap-2 px-4"
                  >
                    {profileSubmitting ? (
                      <>
                        <Spinner size="sm" animation="border" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        Submit Update Request
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="border-0 shadow-sm h-100 overflow-hidden">
            <Card.Header className="bg-white py-3 px-4 border-bottom d-flex align-items-center gap-2">
              <Lock size={18} className="text-muted" />
              <h5 className="mb-0 fw-bold">Security</h5>
            </Card.Header>
            <Card.Body className="p-4">
              {message && (
                <Alert variant={message.type} onClose={() => setMessage(null)} dismissible className="mb-4">
                  {message.text}
                </Alert>
              )}
              <Form onSubmit={handlePasswordChange}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-medium">Current Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    required
                    placeholder="Enter current password"
                  />
                </Form.Group>
                <hr className="my-4 opacity-10" />
                <Form.Group className="mb-3">
                  <Form.Label className="fw-medium">New Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    required
                    minLength={8}
                    placeholder="Enter new password (min. 8 chars)"
                  />
                </Form.Group>
                <Form.Group className="mb-4">
                  <Form.Label className="fw-medium">Confirm New Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    required
                    minLength={8}
                    placeholder="Confirm new password"
                  />
                </Form.Group>
                <div className="d-flex justify-content-end">
                  <Button type="submit" variant="primary" disabled={loading} className="d-inline-flex align-items-center gap-2 px-4">
                    {loading ? 'Updating...' : <><Save size={18} /> Update Password</>}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SupervisorSettings;
