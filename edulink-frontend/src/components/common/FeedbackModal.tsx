import React, { useState } from 'react';
import { Modal, Button, Collapse } from 'react-bootstrap';
import { AlertTriangle, CheckCircle, Info, XCircle, ChevronDown, ChevronUp, Copy } from 'lucide-react';

export type FeedbackVariant = 'success' | 'error' | 'warning' | 'info';

interface FeedbackModalProps {
  show: boolean;
  onHide: () => void;
  title: string;
  message: React.ReactNode;
  variant?: FeedbackVariant;
  details?: string; // For technical error details
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({
  show,
  onHide,
  title,
  message,
  variant = 'error',
  details,
  primaryActionLabel = 'Close',
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          headerClass: 'bg-success bg-opacity-10 border-bottom-0',
          iconColor: 'text-success',
          Icon: CheckCircle,
          btnVariant: 'success'
        };
      case 'warning':
        return {
          headerClass: 'bg-warning bg-opacity-10 border-bottom-0',
          iconColor: 'text-warning',
          Icon: AlertTriangle,
          btnVariant: 'warning'
        };
      case 'info':
        return {
          headerClass: 'bg-info bg-opacity-10 border-bottom-0',
          iconColor: 'text-info',
          Icon: Info,
          btnVariant: 'info'
        };
      case 'error':
      default:
        return {
          headerClass: 'bg-danger bg-opacity-10 border-bottom-0',
          iconColor: 'text-danger',
          Icon: XCircle,
          btnVariant: 'danger'
        };
    }
  };

  const { headerClass, iconColor, Icon, btnVariant } = getVariantStyles();

  const handleCopyDetails = () => {
    if (details) {
      navigator.clipboard.writeText(details);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrimaryClick = () => {
    if (onPrimaryAction) {
      onPrimaryAction();
    } else {
      onHide();
    }
  };

  return (
    <Modal 
      show={show} 
      onHide={onHide} 
      centered 
      backdrop={variant === 'error' ? 'static' : true}
      className="feedback-modal"
    >
      <Modal.Header closeButton className={headerClass}>
        <div className="d-flex align-items-center w-100">
          <Icon size={24} className={`${iconColor} me-2`} />
          <h5 className={`modal-title fw-bold ${iconColor} mb-0`}>{title}</h5>
        </div>
      </Modal.Header>
      <Modal.Body className="pt-4 pb-4">
        <div className="text-center mb-3">
          <div className={`rounded-circle p-3 d-inline-flex mb-3 ${headerClass}`}>
            <Icon size={48} className={iconColor} />
          </div>
        </div>
        
        <div className="text-center mb-4">
          <p className="lead fs-6 text-secondary mb-0">{message}</p>
        </div>

        {details && (
          <div className="mt-4">
            <div 
              className="d-flex align-items-center justify-content-center cursor-pointer text-muted small user-select-none"
              onClick={() => setShowDetails(!showDetails)}
              style={{ cursor: 'pointer' }}
            >
              <span className="me-1">Technical Details</span>
              {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
            
            <Collapse in={showDetails}>
              <div className="mt-2">
                <div className="position-relative">
                  <div className="bg-light p-3 rounded border font-monospace small text-break text-start" style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '0.8rem' }}>
                    {details}
                  </div>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="position-absolute top-0 end-0 p-2 text-muted"
                    onClick={handleCopyDetails}
                    title="Copy to clipboard"
                  >
                    {copied ? <CheckCircle size={14} className="text-success" /> : <Copy size={14} />}
                  </Button>
                </div>
                <div className="text-muted small mt-1 text-center fst-italic">
                  Please share this with support if the issue persists.
                </div>
              </div>
            </Collapse>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer className="border-top-0 justify-content-center pb-4 gap-2">
        {secondaryActionLabel && (
          <Button 
            variant="light" 
            onClick={onSecondaryAction || onHide}
            className="px-4 rounded-pill fw-bold border"
          >
            {secondaryActionLabel}
          </Button>
        )}
        <Button 
          variant={btnVariant} 
          onClick={handlePrimaryClick}
          className="px-5 rounded-pill fw-bold"
        >
          {primaryActionLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default FeedbackModal;
