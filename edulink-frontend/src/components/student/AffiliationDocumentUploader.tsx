import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle, AlertCircle, File, Image as ImageIcon } from 'lucide-react';
import { studentService, type Affiliation } from '../../services/student/studentService';
import { showToast } from '../../utils/toast';

interface AffiliationDocumentUploaderProps {
  studentId: string;
  affiliationId: string;
  onSuccess: (updatedAffiliation: Affiliation) => void;
  isDarkMode: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
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
    // Check file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type. Allowed types: PDF, JPG, PNG`,
      };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File is too large. Maximum size: 10MB`,
      };
    }

    // Check extension as additional validation
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return {
        valid: false,
        error: `Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
      };
    }

    return { valid: true };
  };

  const handleFileSelect = (file: File) => {
    setError(null);
    const validation = validateFile(file);

    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      showToast.error(validation.error || 'Invalid file');
      return;
    }

    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(0);

      // Simulate progress (actual progress tracking would need backend support)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => (prev < 90 ? prev + 10 : prev));
      }, 200);

      const updatedAffiliation = await studentService.uploadAffiliationDocument(
        studentId,
        affiliationId,
        selectedFile
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      showToast.success('Document uploaded successfully!');
      onSuccess(updatedAffiliation);

      // Reset state
      setSelectedFile(null);
      setUploadProgress(0);
    } catch (err: any) {
      setError(err?.message || 'Upload failed. Please try again.');
      showToast.error(err?.message || 'Upload failed');
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
    if (!selectedFile) return null;
    if (selectedFile.type === 'application/pdf') {
      return <File size={32} className="text-danger" />;
    }
    if (selectedFile.type.startsWith('image/')) {
      return <ImageIcon size={32} className="text-info" />;
    }
    return <File size={32} className="text-secondary" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div
      className={`card border-0 ${isDarkMode ? 'bg-dark border-secondary' : 'bg-light'}`}
      style={{
        borderTop: '3px solid #0d6efd',
      }}
    >
      <div className="card-body p-4">
        <h5 className={`card-title mb-3 ${isDarkMode ? 'text-white' : ''}`}>
          📄 Upload Verification Document
        </h5>
        <p className={`card-text small mb-4 ${isDarkMode ? 'text-light opacity-75' : 'text-muted'}`}>
          Help the institution verify your student status. Upload an official document such as an admission letter,
          student ID, or enrollment certificate.
        </p>

        {error && (
          <div className="alert alert-danger d-flex align-items-start mb-4">
            <AlertCircle size={18} className="me-3 flex-shrink-0 mt-1" />
            <div>
              <small>{error}</small>
            </div>
          </div>
        )}

        {!selectedFile ? (
          <>
            {/* Drag & Drop Area */}
            <div
              className={`border-2 border-dashed rounded-3 p-5 text-center cursor-pointer transition-all ${
                isDragging
                  ? isDarkMode
                    ? 'bg-primary bg-opacity-10 border-primary'
                    : 'bg-primary bg-opacity-5 border-primary'
                  : isDarkMode
                    ? 'border-secondary'
                    : 'border-secondary'
              }`}
              style={{ cursor: 'pointer' }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={48} className={`mx-auto mb-3 ${isDarkMode ? 'text-info' : 'text-primary'}`} />
              <h6 className={isDarkMode ? 'text-white' : ''}>Drag and drop your file here</h6>
              <small className={isDarkMode ? 'text-light opacity-75' : 'text-muted'}>
                or click to browse (PDF, JPG, PNG - Max 10MB)
              </small>

              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_FILE_TYPES.join(',')}
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
              />
            </div>

            <div className="mt-3">
              <button
                className="btn btn-outline-primary w-100"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={18} className="me-2" />
                Choose File
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Selected File Preview */}
            <div className={`card mb-3 ${isDarkMode ? 'bg-secondary bg-opacity-25 border-secondary' : 'bg-light'}`}>
              <div className="card-body d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  {getFileIcon()}
                  <div className="ms-3">
                    <div className={`fw-bold ${isDarkMode ? 'text-white' : ''}`}>{selectedFile.name}</div>
                    <small className={isDarkMode ? 'text-light opacity-75' : 'text-muted'}>
                      {formatFileSize(selectedFile.size)}
                    </small>
                  </div>
                </div>
                {!isUploading && (
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={handleCancel}
                    disabled={isUploading}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Upload Progress */}
            {isUploading && uploadProgress > 0 && (
              <div className="mb-3">
                <div className="progress">
                  <div
                    className="progress-bar progress-bar-animated"
                    role="progressbar"
                    style={{ width: `${uploadProgress}%` }}
                    aria-valuenow={uploadProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    {uploadProgress}%
                  </div>
                </div>
                <small className={isDarkMode ? 'text-light opacity-75' : 'text-muted'} style={{ marginTop: '0.5rem', display: 'block' }}>
                  Uploading...
                </small>
              </div>
            )}

            {/* Upload Button */}
            <div className="d-flex gap-2">
              <button
                className="btn btn-success flex-grow-1"
                onClick={handleUpload}
                disabled={isUploading || !selectedFile}
              >
                {isUploading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" /> Uploading...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} className="me-2" />
                    Submit Document
                  </>
                )}
              </button>
              <button
                className="btn btn-outline-secondary"
                onClick={handleCancel}
                disabled={isUploading}
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {/* File Type Info */}
        <div className={`mt-4 p-3 rounded ${isDarkMode ? 'bg-secondary bg-opacity-25' : 'bg-light'}`}>
          <small className={isDarkMode ? 'text-light opacity-75' : 'text-muted'}>
            <strong>Accepted file types:</strong> PDF documents, JPG/JPEG images, PNG images (Max 10MB). 
            Upload official documents like ID, admission letter, or student certificate.
          </small>
        </div>
      </div>
    </div>
  );
};

export default AffiliationDocumentUploader;
