import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { LogIn, UserPlus, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LoginRequiredModalProps {
  show: boolean;
  onHide: () => void;
}

const LoginRequiredModal: React.FC<LoginRequiredModalProps> = ({ show, onHide }) => {
  const navigate = useNavigate();

  return (
    <Modal show={show} onHide={onHide} centered className="login-required-modal">
      <Modal.Body className="text-center p-5">
        <div className="mb-4 d-inline-flex p-3 rounded-circle bg-primary bg-opacity-10 text-primary">
          <Lock size={48} />
        </div>
        <h3 className="fw-bold mb-2">Login Required</h3>
        <p className="text-muted mb-4 px-4">
          To apply for this opportunity, you need to be logged in as a student. 
          Join Edulink today to connect with top employers!
        </p>
        
        <div className="d-grid gap-3 col-10 mx-auto">
          <Button 
            variant="primary" 
            size="lg" 
            className="d-flex align-items-center justify-content-center gap-2"
            onClick={() => navigate('/login')}
          >
            <LogIn size={20} />
            Log In
          </Button>
          <Button 
            variant="outline-primary" 
            size="lg" 
            className="d-flex align-items-center justify-content-center gap-2"
            onClick={() => navigate('/register')}
          >
            <UserPlus size={20} />
            Create Account
          </Button>
        </div>
        
        <button 
          className="btn btn-link text-muted mt-3 text-decoration-none"
          onClick={onHide}
        >
          Maybe later
        </button>
      </Modal.Body>
    </Modal>
  );
};

export default LoginRequiredModal;
