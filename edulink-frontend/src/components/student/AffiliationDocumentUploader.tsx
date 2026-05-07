import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  File,
  Image as ImageIcon,
  Loader,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { studentService, type Affiliation } from '../../services/student/studentService';
import { showToast } from '../../utils/toast';

interface AffiliationDocumentUploaderProps {
  studentId: string;
  affiliationId: string;
  onSuccess: (updatedAffiliation: Affiliation) => void;
  isDarkMode: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

const AffiliationDocumentUploader: React.FC<AffiliationDocumentUploaderProps> = ({
  studentId,
  affiliationId,
  onSuccess,
  isDarkMode,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return { valid: false, error: 'Invalid file type. Allowed types: PDF, JPG, PNG.' };
    }

    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'File is too large. Maximum size: 10MB.' };
    }

    const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return { valid: false, error: `Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` };
    }

    return { valid: true };
  };

  const handleFileSelect = (file: File) => {
    setError(null);
    const validation = validateFile(file);

    if (!validation.valid) {
      const message = validation.error || 'Invalid file.';
      setError(message);
      showToast.error(message);
      return;
    }

    setSelectedFile(file);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file.');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(0);

      const progressInterval = setInterval(() => {
        setUploadProgress((current) => (current < 90 ? current + 10 : current));
      }, 200);

      const updatedAffiliation = await studentService.uploadAffiliationDocument(
        studentId,
        affiliationId,
        selectedFile
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      showToast.success('Verification document uploaded successfully.');
      onSuccess(updatedAffiliation);

      setSelectedFile(null);
      setUploadProgress(0);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      const message = err?.message || 'Upload failed. Please try again.';
      setError(message);
      showToast.error(message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setError(null);
    setUploadProgress(0);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = () => {
    if (!selectedFile) return <Upload size={22} />;

    if (selectedFile.type === 'application/pdf') {
      return <File size={22} />;
    }

    if (selectedFile.type.startsWith('image/')) {
      return <ImageIcon size={22} />;
    }

    return <File size={22} />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const index = Math.floor(Math.log(bytes) / Math.log(k));

    return `${Math.round((bytes / Math.pow(k, index)) * 100) / 100} ${sizes[index]}`;
  };

  return (
    <section className={`adu-card${isDarkMode ? ' dark-mode' : ''}`}>
      <style>{STYLES}</style>

      <div className="adu-card-header">
        <div>
          <div className="adu-card-label">Verification document</div>
          <h3 className="adu-card-title">Upload student proof</h3>
        </div>

        <div className="adu-header-icon">
          <ShieldCheck size={17} />
        </div>
      </div>

      <div className="adu-card-body">
        <p className="adu-intro">
          Upload an official document that helps your institution confirm your student status.
          Use a student ID, admission letter, or enrollment certificate.
        </p>

        {error && (
          <div className="adu-error" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {!selectedFile ? (
          <>
            <button
              type="button"
              className={`adu-dropzone${isDragging ? ' dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="adu-upload-icon">
                <Upload size={24} />
              </div>

              <div className="adu-drop-title">Drop your document here</div>
              <div className="adu-drop-sub">or click to browse PDF, JPG, or PNG up to 10MB</div>

              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_FILE_TYPES.join(',')}
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
              />
            </button>

            <button
              type="button"
              className="adu-btn adu-btn-outline adu-btn-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={15} />
              Choose file
            </button>
          </>
        ) : (
          <>
            <div className="adu-selected-file">
              <div className="adu-file-icon">
                {getFileIcon()}
              </div>

              <div className="adu-file-body">
                <div className="adu-file-name">{selectedFile.name}</div>
                <div className="adu-file-meta">
                  {formatFileSize(selectedFile.size)} · Ready to submit
                </div>
              </div>

              {!isUploading && (
                <button
                  type="button"
                  className="adu-icon-btn danger"
                  onClick={handleCancel}
                  disabled={isUploading}
                  aria-label="Remove selected file"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {isUploading && uploadProgress > 0 && (
              <div className="adu-progress-wrap">
                <div className="adu-progress-top">
                  <span>Uploading document</span>
                  <strong>{uploadProgress}%</strong>
                </div>
                <div className="adu-progress-track">
                  <div className="adu-progress-fill" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            <div className="adu-actions">
              <button
                type="button"
                className="adu-btn adu-btn-primary"
                onClick={handleUpload}
                disabled={isUploading || !selectedFile}
              >
                {isUploading ? (
                  <>
                    <Loader size={15} className="adu-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <CheckCircle size={15} />
                    Submit document
                  </>
                )}
              </button>

              <button
                type="button"
                className="adu-btn adu-btn-ghost"
                onClick={handleCancel}
                disabled={isUploading}
              >
                Cancel
              </button>
            </div>
          </>
        )}

        <div className="adu-info">
          <div className="adu-info-icon">
            <File size={14} />
          </div>
          <p>
            Accepted formats: PDF, JPG, JPEG, and PNG. Keep the document clear,
            readable, and officially issued where possible.
          </p>
        </div>
      </div>
    </section>
  );
};

const STYLES = `
  .adu-card {
    --ink: #0d0f12;
    --ink-2: #3a3d44;
    --ink-3: #6b7280;
    --ink-4: #9ca3af;
    --surface: #f9f8f6;
    --surface-2: #f2f0ed;
    --surface-3: #e8e5e0;
    --border: #e4e1dc;
    --border-2: #d1ccc5;
    --accent: #1a5cff;
    --accent-2: #e8eeff;
    --accent-soft: rgba(26,92,255,0.08);
    --success: #12b76a;
    --success-soft: rgba(18,183,106,0.10);
    --danger: #ef4444;
    --danger-soft: rgba(239,68,68,0.10);
    --radius-sm: 8px;
    --radius: 14px;
    --radius-lg: 20px;
    --shadow: 0 4px 16px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04);
    --font-display: 'Instrument Serif', Georgia, serif;
    --font-body: 'DM Sans', -apple-system, sans-serif;

    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    font-family: var(--font-body);
    color: var(--ink);
    transition: box-shadow 0.2s;
  }

  .adu-card.dark-mode {
    --ink: #f0ede8;
    --ink-2: #c9c4bc;
    --ink-3: #8a8580;
    --ink-4: #5a5650;
    --surface: #141414;
    --surface-2: #1c1c1c;
    --surface-3: #252525;
    --border: #2a2a2a;
    --border-2: #353535;
    --accent: #4d7fff;
    --accent-2: #1a2340;
    --accent-soft: rgba(77,127,255,0.10);
    --success-soft: rgba(18,183,106,0.12);
    --danger-soft: rgba(239,68,68,0.12);
    --shadow: 0 4px 16px rgba(0,0,0,0.30);
  }

  .adu-card:hover {
    box-shadow: var(--shadow);
  }

  .adu-card-header {
    padding: 20px 24px 16px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .adu-card-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-4);
    margin-bottom: 2px;
  }

  .adu-card-title {
    font-family: var(--font-display);
    font-size: 1.15rem;
    font-weight: 400;
    color: var(--ink);
    margin: 0;
    line-height: 1.2;
  }

  .adu-header-icon {
    width: 36px;
    height: 36px;
    border-radius: 11px;
    background: var(--accent-soft);
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .adu-card-body {
    padding: 20px 24px;
  }

  .adu-intro {
    margin: 0 0 16px;
    color: var(--ink-3);
    font-size: 13px;
    line-height: 1.6;
  }

  .adu-error {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 14px;
    margin-bottom: 16px;
    border-radius: var(--radius);
    background: var(--danger-soft);
    border: 1px solid rgba(239,68,68,0.18);
    color: var(--ink-2);
    font-size: 13px;
    line-height: 1.5;
  }

  .adu-error svg {
    color: var(--danger);
    flex-shrink: 0;
    margin-top: 1px;
  }

  .adu-dropzone {
    width: 100%;
    border: 1px dashed var(--border-2);
    border-radius: var(--radius-lg);
    background: var(--surface);
    padding: 34px 20px;
    text-align: center;
    color: var(--ink);
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, box-shadow 0.15s, transform 0.12s;
  }

  .adu-dropzone:hover,
  .adu-dropzone.dragging {
    background: var(--surface-3);
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
    transform: translateY(-1px);
  }

  .adu-upload-icon {
    width: 52px;
    height: 52px;
    border-radius: 16px;
    background: var(--accent-soft);
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 14px;
  }

  .adu-drop-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--ink);
    margin-bottom: 4px;
  }

  .adu-drop-sub {
    color: var(--ink-3);
    font-size: 12px;
    line-height: 1.5;
  }

  .adu-selected-file {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    margin-bottom: 16px;
  }

  .adu-file-icon {
    width: 42px;
    height: 42px;
    border-radius: 13px;
    background: var(--accent-soft);
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .adu-file-body {
    min-width: 0;
  }

  .adu-file-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-bottom: 2px;
  }

  .adu-file-meta {
    font-size: 12px;
    color: var(--ink-3);
  }

  .adu-progress-wrap {
    margin-bottom: 16px;
  }

  .adu-progress-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: var(--ink-3);
    font-size: 12px;
    margin-bottom: 8px;
  }

  .adu-progress-top strong {
    color: var(--ink);
    font-weight: 600;
  }

  .adu-progress-track {
    width: 100%;
    height: 7px;
    border-radius: 999px;
    background: var(--surface-3);
    overflow: hidden;
  }

  .adu-progress-fill {
    height: 100%;
    border-radius: inherit;
    background: var(--accent);
    transition: width 0.2s ease;
  }

  .adu-info {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 12px 14px;
    margin-top: 16px;
  }

  .adu-info-icon {
    width: 28px;
    height: 28px;
    border-radius: 9px;
    background: var(--surface-3);
    color: var(--ink-4);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .adu-info p {
    margin: 0;
    color: var(--ink-3);
    font-size: 12px;
    line-height: 1.5;
  }

  .adu-actions {
    display: flex;
    gap: 10px;
  }

  .adu-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 500;
    border-radius: var(--radius);
    padding: 10px 18px;
    border: none;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.12s, box-shadow 0.15s, background 0.15s;
    white-space: nowrap;
  }

  .adu-btn:active {
    transform: scale(0.97);
  }

  .adu-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none;
    pointer-events: none;
  }

  .adu-btn-primary {
    flex: 1;
    background: var(--accent);
    color: #fff;
    box-shadow: 0 1px 3px rgba(26,92,255,0.25);
  }

  .adu-btn-primary:hover {
    box-shadow: 0 4px 16px rgba(26,92,255,0.35);
    transform: translateY(-1px);
  }

  .adu-btn-ghost {
    background: var(--surface-3);
    color: var(--ink-2);
  }

  .adu-btn-ghost:hover {
    background: var(--border);
    color: var(--ink);
  }

  .adu-btn-outline {
    margin-top: 12px;
    background: transparent;
    color: var(--accent);
    border: 1px solid rgba(26,92,255,0.28);
  }

  .adu-btn-outline:hover {
    background: var(--accent-soft);
  }

  .adu-btn-full {
    width: 100%;
  }

  .adu-icon-btn {
    width: 34px;
    height: 34px;
    border-radius: 11px;
    border: 1px solid var(--border);
    background: var(--surface-3);
    color: var(--ink-3);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .adu-icon-btn:hover {
    background: var(--border);
    color: var(--ink);
  }

  .adu-icon-btn.danger {
    color: var(--danger);
  }

  .adu-spin {
    animation: adu-spin 0.8s linear infinite;
  }

  @keyframes adu-spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 640px) {
    .adu-card-header,
    .adu-card-body {
      padding-left: 18px;
      padding-right: 18px;
    }

    .adu-selected-file {
      grid-template-columns: auto minmax(0, 1fr);
    }

    .adu-icon-btn {
      grid-column: 1 / -1;
      width: 100%;
    }

    .adu-actions {
      flex-direction: column;
    }

    .adu-btn {
      width: 100%;
    }
  }
`;

export default AffiliationDocumentUploader;