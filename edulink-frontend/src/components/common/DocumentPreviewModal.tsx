import React, { useState, useEffect } from 'react';
import { Modal, Button, Spinner } from 'react-bootstrap';
import { X, Download, Maximize2, ExternalLink, FileText } from 'lucide-react';
import { fetchDocumentBlob } from '../../utils/documentUtils';
import { useTheme } from '../../contexts/ThemeContext';

interface DocumentPreviewModalProps {
  show: boolean;
  onHide: () => void;
  title: string;
  url: string | null | undefined;
}

const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({ show, onHide, title, url }) => {
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [contentType, setContentType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let currentBlobUrl: string | null = null;

    const loadDocument = async () => {
      if (show && url) {
        setLoading(true);
        setError(null);
        try {
          const { blobUrl: fetchedBlobUrl, contentType: fetchedContentType } = await fetchDocumentBlob(url);
          setBlobUrl(fetchedBlobUrl);
          setContentType(fetchedContentType);
          currentBlobUrl = fetchedBlobUrl;
        } catch (err) {
          setError('Failed to load document preview. You can still try opening it in a new tab.');
        } finally {
          setLoading(false);
        }
      }
    };

    loadDocument();

    return () => {
      if (currentBlobUrl) {
        window.URL.revokeObjectURL(currentBlobUrl);
      }
      setBlobUrl(null);
      setContentType(null);
    };
  }, [show, url]);

  const handleOpenInNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank');
    }
  };

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="d-flex flex-column align-items-center justify-content-center py-5">
          <Spinner animation="border" variant="primary" className="mb-3" />
          <p className="text-muted">Fetching document...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-5 px-4">
          <FileText size={48} className="text-muted mb-3 opacity-25" />
          <p className="mb-4">{error}</p>
          <Button variant="primary" onClick={handleOpenInNewTab}>
            Open in New Tab
          </Button>
        </div>
      );
    }

    if (!blobUrl) return null;

    if (contentType?.startsWith('image/')) {
      return (
        <div className="text-center overflow-auto" style={{ maxHeight: '70vh' }}>
          <img src={blobUrl} alt={title} className="img-fluid rounded shadow-sm" />
        </div>
      );
    }

    if (contentType === 'application/pdf') {
      return (
        <div className="w-100" style={{ height: '70vh' }}>
          <iframe
            src={`${blobUrl}#toolbar=0`}
            title={title}
            width="100%"
            height="100%"
            className="border-0 rounded"
          />
        </div>
      );
    }

    return (
      <div className="text-center py-5">
        <FileText size={48} className="text-muted mb-3" />
        <p className="mb-4">Preview not available for this file type ({contentType})</p>
        <Button variant="primary" onClick={handleOpenInNewTab}>
          Download to View
        </Button>
      </div>
    );
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      centered
      backdrop="static"
      contentClassName={isDarkMode ? 'bg-dark text-white border-secondary' : ''}
      className="document-preview-modal"
    >
      <Modal.Header className={`border-0 pb-0 ${isDarkMode ? 'bg-dark' : ''}`}>
        <div className="d-flex align-items-center justify-content-between w-100">
          <Modal.Title className="h5 fw-bold mb-0 text-truncate pe-4">
            {title}
          </Modal.Title>
          <div className="d-flex gap-2">
            {blobUrl && (
              <Button 
                variant={isDarkMode ? 'outline-light' : 'outline-primary'} 
                size="sm" 
                className="rounded-circle p-2"
                onClick={handleOpenInNewTab}
                title="Open in new tab"
              >
                <ExternalLink size={16} />
              </Button>
            )}
            <Button 
              variant={isDarkMode ? 'outline-light' : 'outline-secondary'} 
              size="sm" 
              className="rounded-circle p-2"
              onClick={onHide}
            >
              <X size={16} />
            </Button>
          </div>
        </div>
      </Modal.Header>
      <Modal.Body className={`p-4 ${isDarkMode ? 'bg-dark' : ''}`}>
        {renderPreview()}
      </Modal.Body>
      <Modal.Footer className={`border-0 pt-0 ${isDarkMode ? 'bg-dark' : ''}`}>
        <p className="small text-muted me-auto mb-0">
          Secure Preview Mode
        </p>
        <Button variant={isDarkMode ? 'secondary' : 'light'} onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
      <style>{`
        .document-preview-modal .modal-lg {
          max-width: 900px;
        }
        @media (max-width: 576px) {
          .document-preview-modal .modal-dialog {
            margin: 0.5rem;
          }
        }
      `}</style>
    </Modal>
  );
};

export default DocumentPreviewModal;
