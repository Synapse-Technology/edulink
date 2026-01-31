import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Row, Col, Nav, Spinner, Badge } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { Save, Globe, Building2, Mail, Phone, GraduationCap, Shield, CheckCircle, XCircle, X, PenTool, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { institutionService, type InstitutionProfile } from '../../../services/institution/institutionService';
import AcademicStructure from '../../../components/admin/institution/AcademicStructure';
import InstitutionSettingsSkeleton from '../../../components/admin/skeletons/InstitutionSettingsSkeleton';

const InstitutionSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [profile, setProfile] = useState<InstitutionProfile | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Partial<InstitutionProfile>>();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const data = await institutionService.getProfile();
      setProfile(data);
      setLogoPreview(data.logo || null);
      reset(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setLogoFile(file);
          setLogoPreview(URL.createObjectURL(file));
      }
  };

  const onSubmit = async (data: Partial<InstitutionProfile>) => {
    setIsSaving(true);
    
    try {
      let payload: Partial<InstitutionProfile> | FormData;

      if (logoFile) {
        const formData = new FormData();
        if (data.website_url) formData.append('website_url', data.website_url);
        if (data.contact_email) formData.append('contact_email', data.contact_email);
        if (data.contact_phone) formData.append('contact_phone', data.contact_phone);
        if (data.address) formData.append('address', data.address);
        if (data.description) formData.append('description', data.description);
        formData.append('logo', logoFile);
        payload = formData;
      } else {
        payload = {
            website_url: data.website_url,
            contact_email: data.contact_email,
            contact_phone: data.contact_phone,
            address: data.address,
            description: data.description
        };
      }
      
      const updatedProfile = await institutionService.updateProfile(payload);
      setProfile(updatedProfile);
      setLogoPreview(updatedProfile.logo || null);
      setLogoFile(null);
      reset(updatedProfile);
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && !profile) {
    return <InstitutionSettingsSkeleton />;
  }

  return (
    <div className="institution-settings">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">Settings</h4>
          <p className="text-muted mb-0">Manage your institution profile and account settings.</p>
        </div>
      </div>

      <Row>
        <Col md={3}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body className="p-0">
              <Nav className="flex-column nav-pills p-2" activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'profile')}>
                <Nav.Link eventKey="profile" className="d-flex align-items-center gap-2 mb-1">
                  <Building2 size={18} />
                  Institution Profile
                </Nav.Link>
                <Nav.Link eventKey="academic" className="d-flex align-items-center gap-2 mb-1">
                  <GraduationCap size={18} />
                  Academic Structure
                </Nav.Link>
              </Nav>
            </Card.Body>
          </Card>
        </Col>

        <Col md={9}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              {activeTab === 'academic' && <AcademicStructure />}
              {activeTab === 'profile' && profile && (
                <>
                  {isEditing ? (
                    <Form onSubmit={handleSubmit(onSubmit)}>
                      <div className="d-flex justify-content-between align-items-center mb-4">
                        <h5 className="mb-0">Edit Profile</h5>
                      </div>

                      <div className="mb-4 d-flex align-items-center gap-3">
                        <div className="position-relative">
                            {logoPreview ? (
                                <img 
                                    src={logoPreview} 
                                    alt="Logo Preview" 
                                    className="rounded-circle object-fit-cover border"
                                    style={{ width: '100px', height: '100px' }}
                                />
                            ) : (
                                <div 
                                    className="rounded-circle bg-light d-flex flex-column align-items-center justify-content-center text-muted border" 
                                    style={{ width: '100px', height: '100px' }}
                                >
                                     <ImageIcon size={24} className="mb-1" />
                                     <small style={{fontSize: '10px'}}>Not Customized</small>
                                </div>
                            )}
                        </div>
                        <div>
                            <Form.Label>Institution Logo</Form.Label>
                            <Form.Control 
                                type="file" 
                                accept="image/*"
                                onChange={handleLogoChange}
                                size="sm"
                            />
                            <Form.Text className="text-muted small">
                                Recommended size: 200x200px. Max size: 2MB.
                            </Form.Text>
                        </div>
                      </div>

                      <Row className="mb-3">
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Institution Name</Form.Label>
                            <Form.Control 
                                type="text" 
                                value={profile.name} 
                                disabled 
                                className="bg-light"
                            />
                            <Form.Text className="text-muted">
                                Institution name cannot be changed directly.
                            </Form.Text>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Website URL</Form.Label>
                            <div className="input-group">
                              <span className="input-group-text bg-light"><Globe size={16} /></span>
                              <Form.Control 
                                type="text" 
                                {...register('website_url')}
                                placeholder="https://example.edu"
                              />
                            </div>
                          </Form.Group>
                        </Col>
                      </Row>

                      <Row className="mb-3">
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Contact Email</Form.Label>
                            <div className="input-group">
                              <span className="input-group-text bg-light"><Mail size={16} /></span>
                              <Form.Control 
                                type="email" 
                                {...register('contact_email', { 
                                    required: 'Contact email is required',
                                    pattern: {
                                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                        message: "Invalid email address"
                                    }
                                })}
                                className={errors.contact_email ? 'is-invalid' : ''}
                                placeholder="contact@example.edu"
                              />
                              {errors.contact_email && <div className="invalid-feedback">{errors.contact_email.message}</div>}
                            </div>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Contact Phone</Form.Label>
                            <div className="input-group">
                              <span className="input-group-text bg-light"><Phone size={16} /></span>
                              <Form.Control 
                                type="text" 
                                {...register('contact_phone')}
                                placeholder="e.g. +1 (555) 123-4567"
                              />
                            </div>
                          </Form.Group>
                        </Col>
                      </Row>

                      <Form.Group className="mb-4">
                        <Form.Label>Address</Form.Label>
                        <Form.Control 
                            as="textarea" 
                            rows={3} 
                            {...register('address')}
                            placeholder="Enter physical address..."
                        />
                      </Form.Group>

                       <Form.Group className="mb-4">
                        <Form.Label>Description</Form.Label>
                        <Form.Control 
                            as="textarea" 
                            rows={4} 
                            {...register('description')}
                            placeholder="Tell us about your institution..."
                        />
                      </Form.Group>

                      <div className="d-flex justify-content-end gap-2">
                        <Button 
                            variant="outline-secondary" 
                            onClick={() => {
                                reset(profile);
                                setIsEditing(false);
                            }}
                            disabled={isSaving}
                        >
                            <X size={18} className="me-2" /> Cancel
                        </Button>
                        <Button 
                            variant="primary" 
                            type="submit" 
                            className="d-flex align-items-center gap-2"
                            disabled={isSaving}
                        >
                          {isSaving ? <Spinner animation="border" size="sm" /> : <Save size={18} />}
                          Save Changes
                        </Button>
                      </div>
                    </Form>
                  ) : (
                    <div className="read-only-view">
                        <div className="d-flex justify-content-between align-items-start mb-4">
                            <div className="d-flex align-items-center gap-3">
                                {profile.logo ? (
                                    <img 
                                        src={profile.logo} 
                                        alt="Institution Logo" 
                                        className="rounded-circle object-fit-cover border"
                                        style={{ width: '80px', height: '80px' }}
                                    />
                                ) : (
                                    <div 
                                        className="rounded-circle bg-light d-flex flex-column align-items-center justify-content-center text-muted border p-1 text-center" 
                                        style={{ width: '80px', height: '80px' }}
                                    >
                                         <ImageIcon size={20} className="mb-1" />
                                         <small style={{fontSize: '8px', lineHeight: '1.2'}}>Not Customized</small>
                                    </div>
                                )}
                                <div>
                                    <h5 className="mb-1">Institution Profile</h5>
                                    <p className="text-muted small mb-0">Manage public information</p>
                                </div>
                            </div>
                            <Button variant="primary" size="sm" onClick={() => setIsEditing(true)}>
                                <PenTool size={16} className="me-2" /> Edit Profile
                            </Button>
                        </div>
                        
                        <div className="bg-light p-3 rounded mb-4">
                            <h6 className="mb-3 text-muted text-uppercase small fw-bold">Institution Details</h6>
                            <Row className="g-3">
                                <Col md={6}>
                                    <div className="d-flex align-items-center gap-2 mb-2">
                                        <span className="text-muted small" style={{minWidth: '80px'}}>Status:</span>
                                        {profile.is_active ? (
                                            <Badge bg="success" className="d-flex align-items-center gap-1">
                                                <CheckCircle size={10} /> Active
                                            </Badge>
                                        ) : (
                                            <Badge bg="warning" text="dark" className="d-flex align-items-center gap-1">
                                                <XCircle size={10} /> Inactive
                                            </Badge>
                                        )}
                                        {profile.is_verified && (
                                            <Badge bg="info" className="d-flex align-items-center gap-1">
                                                <Shield size={10} /> Verified
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="d-flex align-items-center gap-2">
                                        <span className="text-muted small" style={{minWidth: '80px'}}>Trust Level:</span>
                                        <strong>{profile.trust_level || 0}</strong>
                                    </div>
                                </Col>
                                <Col md={6}>
                                     <div className="d-flex align-items-center gap-2 mb-1">
                                        <span className="text-muted small">Primary Domain</span>
                                    </div>
                                    <div className="fw-medium">{profile.domain || 'Not set'}</div>
                                </Col>
                            </Row>
                        </div>

                        <Row className="g-4">
                             <Col md={6}>
                                <h6 className="text-muted text-uppercase small fw-bold mb-3">Basic Information</h6>
                                <div className="mb-3">
                                    <label className="small text-muted d-block">Institution Name</label>
                                    <span className="fw-medium">{profile.name}</span>
                                </div>
                                <div className="mb-3">
                                    <label className="small text-muted d-block">Description</label>
                                    <p className="text-muted small mb-0">{profile.description || 'No description provided.'}</p>
                                </div>
                             </Col>
                             <Col md={6}>
                                <h6 className="text-muted text-uppercase small fw-bold mb-3">Contact Information</h6>
                                <div className="mb-3">
                                    <div className="d-flex align-items-center mb-1">
                                        <Mail size={16} className="text-muted me-2" />
                                        <label className="small text-muted">Email</label>
                                    </div>
                                    <span className="fw-medium ms-4">{profile.contact_email || 'N/A'}</span>
                                </div>
                                <div className="mb-3">
                                    <div className="d-flex align-items-center mb-1">
                                        <Phone size={16} className="text-muted me-2" />
                                        <label className="small text-muted">Phone</label>
                                    </div>
                                    <span className="fw-medium ms-4">{profile.contact_phone || 'N/A'}</span>
                                </div>
                                <div className="mb-3">
                                    <div className="d-flex align-items-center mb-1">
                                        <Globe size={16} className="text-muted me-2" />
                                        <label className="small text-muted">Website</label>
                                    </div>
                                    {profile.website_url ? (
                                        <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="ms-4 text-decoration-none">
                                            {profile.website_url}
                                        </a>
                                    ) : (
                                        <span className="fw-medium ms-4">N/A</span>
                                    )}
                                </div>
                                <div className="mb-3">
                                    <div className="d-flex align-items-center mb-1">
                                        <Building2 size={16} className="text-muted me-2" />
                                        <label className="small text-muted">Address</label>
                                    </div>
                                    <p className="ms-4 mb-0 text-muted small">{profile.address || 'N/A'}</p>
                                </div>
                             </Col>
                        </Row>
                    </div>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default InstitutionSettings;
