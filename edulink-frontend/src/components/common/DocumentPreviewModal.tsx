import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Loader,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { fetchDocumentBlob, fetchAndOpenDocument } from '../../utils/documentUtils';
import { useTheme } from '../../contexts/ThemeContext';

interface DocumentPreviewModalProps {
  show: boolean;
  onHide: () => void;
  title: string;
  url: string | null | undefined;
}

const STYLES = `
  .dpm-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1080;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(0,0,0,0.56);
    backdrop-filter: blur(7px);
    animation: dpm-backdrop-in 0.18s ease both;
  }

  @keyframes dpm-backdrop-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .dpm-modal {
    --dpm-ink: #0d0f12;
    --dpm-ink-2: #3a3d44;
    --dpm-ink-3: #6b7280;
    --dpm-ink-4: #9ca3af;
    --dpm-surface: #f9f8f6;
    --dpm-surface-2: #f2f0ed;
    --dpm-surface-3: #e8e5e0;
    --dpm-border: #e4e1dc;
    --dpm-border-2: #d1ccc5;
    --dpm-accent: #1a5cff;
    --dpm-accent-soft: rgba(26,92,255,0.08);
    --dpm-success: #12b76a;
    --dpm-success-soft: rgba(18,183,106,0.10);
    --dpm-danger: #ef4444;
    --dpm-danger-soft: rgba(239,68,68,0.10);
    --dpm-warning: #f59e0b;
    --dpm-warning-soft: rgba(245,158,11,0.10);
    --dpm-radius: 22px;
    --dpm-radius-sm: 14px;
    --dpm-shadow: 0 24px 80px rgba(0,0,0,0.28), 0 8px 24px rgba(0,0,0,0.12);

    width: min(1040px, 100%);
    max-height: min(88vh, 860px);
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    overflow: hidden;
    background: var(--dpm-surface);
    border: 1px solid rgba(255,255,255,0.16);
    border-radius: var(--dpm-radius);
    color: var(--dpm-ink);
    box-shadow: var(--dpm-shadow);
    animation: dpm-modal-in 0.22s ease both;
  }

  .dpm-modal.dark-mode {
    --dpm-ink: #f0ede8;
    --dpm-ink-2: #c9c4bc;
    --dpm-ink-3: #8a8580;
    --dpm-ink-4: #5a5650;
    --dpm-surface: #141414;
    --dpm-surface-2: #1c1c1c;
    --dpm-surface-3: #252525;
    --dpm-border: #2a2a2a;
    --dpm-border-2: #353535;
    --dpm-accent: #4d7fff;
    --dpm-accent-soft: rgba(77,127,255,0.10);
    --dpm-success-soft: rgba(18,183,106,0.12);
    --dpm-danger-soft: rgba(239,68,68,0.12);
    --dpm-warning-soft: rgba(245,158,11,0.12);
  }

  @keyframes dpm-modal-in {
    from { opacity: 0; transform: scale(0.97) translateY(12px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  .dpm-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 18px 20px;
    background: var(--dpm-surface-2);
    border-bottom: 1px solid var(--dpm-border);
  }

  .dpm-title-wrap {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .dpm-file-icon {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    background: var(--dpm-accent-soft);
    color: var(--dpm-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .dpm-eyebrow {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.11em;
    text-transform: uppercase;
    color: var(--dpm-accent);
    margin-bottom: 4px;
  }

  .dpm-title {
    margin: 0;
    color: var(--dpm-ink);
    font-size: 16px;
    font-weight: 800;
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dpm-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .dpm-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-height: 36px;
    padding: 8px 12px;
    border-radius: 12px;
    border: 1px solid var(--dpm-border);
    background: var(--dpm-surface-3);
    color: var(--dpm-ink-2);
    font-size: 12px;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease, transform 0.12s ease, border-color 0.15s ease;
  }

  .dpm-btn:hover {
    color: var(--dpm-ink);
    background: var(--dpm-border);
    transform: translateY(-1px);
  }

  .dpm-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    pointer-events: none;
  }

  .dpm-btn-icon {
    width: 36px;
    padding: 0;
  }

  .dpm-btn-primary {
    background: var(--dpm-accent);
    color: #fff;
    border-color: var(--dpm-accent);
  }

  .dpm-btn-primary:hover {
    color: #fff;
    background: var(--dpm-accent);
  }

  .dpm-stage {
    min-height: 0;
    overflow: hidden;
    background:
      radial-gradient(circle at top left, var(--dpm-accent-soft), transparent 36%),
      var(--dpm-surface);
    padding: 18px;
  }

  .dpm-preview-frame {
    height: 100%;
    min-height: 520px;
    overflow: hidden;
    background: var(--dpm-surface-2);
    border: 1px solid var(--dpm-border);
    border-radius: 18px;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.12);
  }

  .dpm-preview-scroll {
    height: 100%;
    max-height: calc(88vh - 168px);
    overflow: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 22px;
  }

  .dpm-image {
    max-width: 100%;
    max-height: 100%;
    border-radius: 14px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.14);
    background: #fff;
  }

  .dpm-pdf {
    width: 100%;
    height: 100%;
    min-height: 520px;
    border: 0;
    border-radius: 18px;
    background: var(--dpm-surface-2);
  }

  .dpm-state {
    min-height: 520px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 36px;
    text-align: center;
  }

  .dpm-state-inner {
    max-width: 420px;
  }

  .dpm-state-icon {
    width: 62px;
    height: 62px;
    border-radius: 20px;
    margin: 0 auto 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--dpm-accent-soft);
    color: var(--dpm-accent);
  }

  .dpm-state-icon.error {
    background: var(--dpm-danger-soft);
    color: var(--dpm-danger);
  }

  .dpm-state-title {
    margin: 0 0 8px;
    color: var(--dpm-ink);
    font-size: 18px;
    font-weight: 800;
  }

  .dpm-state-text {
    margin: 0 0 18px;
    color: var(--dpm-ink-3);
    font-size: 13px;
    line-height: 1.6;
  }

  .dpm-spinner {
    animation: dpm-spin 0.8s linear infinite;
  }

  @keyframes dpm-spin {
    to { transform: rotate(360deg); }
  }

  .dpm-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 13px 20px;
    background: var(--dpm-surface-2);
    border-top: 1px solid var(--dpm-border);
  }

  .dpm-secure-note {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: var(--dpm-ink-3);
    font-size: 12px;
    font-weight: 700;
  }

  .dpm-type-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 999px;
    padding: 6px 10px;
    background: var(--dpm-success-soft);
    color: var(--dpm-success);
    font-size: 11px;
    font-weight: 800;
  }

  @media (max-width: 720px) {
    .dpm-backdrop {
      padding: 10px;
      align-items: stretch;
    }

    .dpm-modal {
      max-height: none;
      height: 100%;
      border-radius: 18px;
    }

    .dpm-header {
      align-items: flex-start;
      flex-direction: column;
    }

    .dpm-actions {
      width: 100%;
      justify-content: space-between;
    }

    .dpm-actions .dpm-btn:not(.dpm-btn-icon) {
      flex: 1;
    }

    .dpm-stage {
      padding: 12px;
    }

    .dpm-preview-frame,
    .dpm-pdf,
    .dpm-state {
      min-height: 420px;
    }

    .dpm-footer {
      align-items: flex-start;
      flex-direction: column;
    }
  }
`;

const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({ show, onHide, title, url }) => {
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [contentType, setContentType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);

  const loadDocument = async () => {
    if (!show || !url) return;

    setLoading(true);
    setError(null);
    setIsNotFound(false);

    try {
      const { blobUrl: fetchedBlobUrl, contentType: fetchedContentType } = await fetchDocumentBlob(url);
      setBlobUrl((previous) => {
        if (previous) window.URL.revokeObjectURL(previous);
        return fetchedBlobUrl;
      });
      setContentType(fetchedContentType);
    } catch (err: any) {
      const status = err?.status || err?.response?.status || err?.originalError?.response?.status;

      if (status === 404) {
        setError('Document not found. This file may not have been uploaded yet or has been removed.');
        setIsNotFound(true);
      } else if (status === 403) {
        setError('You do not have permission to view this document.');
        setIsNotFound(true);
      } else if (status >= 500) {
        setError('Server error occurred while loading the document. Please try again later.');
      } else if (status >= 400) {
        setError('Could not load document. Please check if the file is still available.');
      } else {
        setError('Failed to load document preview. You can still try opening it in a new tab.');
      }

      setBlobUrl(null);
      setContentType(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!show) return undefined;
    loadDocument();

    return () => {
      setBlobUrl((previous) => {
        if (previous) window.URL.revokeObjectURL(previous);
        return null;
      });
      setContentType(null);
      setError(null);
      setIsNotFound(false);
      setLoading(false);
    };
  }, [show, url]);

  useEffect(() => {
    if (!show) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onHide();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [show, onHide]);

  const handleOpenInNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
    } else if (url && !isNotFound) {
      fetchAndOpenDocument(url);
    }
  };

  const getDocumentKind = () => {
    if (contentType?.startsWith('image/')) return 'Image preview';
    if (contentType === 'application/pdf') return 'PDF preview';
    if (contentType) return 'Document preview';
    return 'Secure preview';
  };

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="dpm-state">
          <div className="dpm-state-inner">
            <div className="dpm-state-icon">
              <Loader size={28} className="dpm-spinner" />
            </div>
            <h3 className="dpm-state-title">Fetching document</h3>
            <p className="dpm-state-text">
              Preparing a secure preview of this file. Large documents may take a moment to render.
            </p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="dpm-state">
          <div className="dpm-state-inner">
            <div className="dpm-state-icon error">
              <AlertCircle size={28} />
            </div>
            <h3 className="dpm-state-title">Preview unavailable</h3>
            <p className="dpm-state-text">{error}</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {!isNotFound && (
                <button className="dpm-btn dpm-btn-primary" onClick={handleOpenInNewTab}>
                  <ExternalLink size={15} />
                  Open in new tab
                </button>
              )}
              <button className="dpm-btn" onClick={loadDocument} disabled={!url || loading}>
                <RefreshCw size={15} />
                Retry
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (!blobUrl) {
      return (
        <div className="dpm-state">
          <div className="dpm-state-inner">
            <div className="dpm-state-icon">
              <FileText size={28} />
            </div>
            <h3 className="dpm-state-title">No document selected</h3>
            <p className="dpm-state-text">There is no file available for preview.</p>
          </div>
        </div>
      );
    }

    if (contentType?.startsWith('image/')) {
      return (
        <div className="dpm-preview-scroll">
          <img src={blobUrl} alt={title} className="dpm-image" />
        </div>
      );
    }

    if (contentType === 'application/pdf') {
      return (
        <iframe
          src={`${blobUrl}#toolbar=0`}
          title={title}
          className="dpm-pdf"
        />
      );
    }

    return (
      <div className="dpm-state">
        <div className="dpm-state-inner">
          <div className="dpm-state-icon">
            <FileText size={28} />
          </div>
          <h3 className="dpm-state-title">Preview not supported</h3>
          <p className="dpm-state-text">
            Preview is not available for this file type{contentType ? ` (${contentType})` : ''}. Open it in a new tab to view or download it.
          </p>
          <button className="dpm-btn dpm-btn-primary" onClick={handleOpenInNewTab}>
            <ExternalLink size={15} />
            Open file
          </button>
        </div>
      </div>
    );
  };

  if (!show) return null;

  return (
    <>
      <style>{STYLES}</style>
      <div className="dpm-backdrop" role="dialog" aria-modal="true" aria-labelledby="document-preview-title">
        <div className={`dpm-modal${isDarkMode ? ' dark-mode' : ''}`}>
          <header className="dpm-header">
            <div className="dpm-title-wrap">
              <div className="dpm-file-icon">
                {contentType?.startsWith('image/') ? <ImageIcon size={21} /> : <FileText size={21} />}
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="dpm-eyebrow">
                  <ShieldCheck size={11} />
                  Secure document preview
                </div>
                <h2 id="document-preview-title" className="dpm-title">{title}</h2>
              </div>
            </div>

            <div className="dpm-actions">
              <button
                className="dpm-btn"
                onClick={handleOpenInNewTab}
                disabled={!blobUrl && (!url || isNotFound)}
                title="Open in new tab"
              >
                <ExternalLink size={15} />
                Open
              </button>
              <button
                className="dpm-btn"
                onClick={handleOpenInNewTab}
                disabled={!blobUrl && (!url || isNotFound)}
                title="Download or view file"
              >
                <Download size={15} />
                Download
              </button>
              <button className="dpm-btn dpm-btn-icon" onClick={onHide} aria-label="Close preview">
                <X size={16} />
              </button>
            </div>
          </header>

          <main className="dpm-stage">
            <div className="dpm-preview-frame">
              {renderPreview()}
            </div>
          </main>

          <footer className="dpm-footer">
            <span className="dpm-secure-note">
              <ShieldCheck size={14} />
              Preview generated from a protected document URL
            </span>
            <span className="dpm-type-pill">
              {contentType?.startsWith('image/') ? <ImageIcon size={13} /> : <FileText size={13} />}
              {getDocumentKind()}
            </span>
          </footer>
        </div>
      </div>
    </>
  );
};

export default DocumentPreviewModal;
