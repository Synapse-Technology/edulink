import { apiClient } from '../services/api/client';
import { toast } from 'react-hot-toast';

/**
 * Normalizes a document URL for API client usage without assuming a
 * specific storage backend path (e.g. /media/).
 */
export const normalizeDocumentUrl = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;

  // For relative paths, preserve backend-provided location and only normalize slash prefix.
  return url.startsWith('/') ? url : `/${url}`;
};

/**
 * Fetches a document from the backend as a blob and returns its object URL and type.
 * 
 * @param url The relative or absolute URL of the document
 */
export const fetchDocumentBlob = async (url: string): Promise<{ blobUrl: string; contentType: string }> => {
  if (!url) throw new Error('URL is required');

  const normalizedUrl = normalizeDocumentUrl(url);

  try {
    const response = await apiClient.getClient().get(normalizedUrl, {
      responseType: 'blob',
    });

    const contentType = response.headers['content-type'] || 'application/pdf';
    const blob = new Blob([response.data], { type: contentType });
    const blobUrl = window.URL.createObjectURL(blob);
    
    return { blobUrl, contentType };
  } catch (error: any) {
    // Create enhanced error with status code for better error handling
    const status = error?.response?.status || error?.status;
    const enhancedError = new Error('Failed to fetch document');
    (enhancedError as any).status = status;
    (enhancedError as any).originalError = error;
    
    console.error('Failed to fetch document blob:', error);
    throw enhancedError;
  }
};

/**
 * Fetches a document from the backend as a blob and opens it in a new tab.
 * This prevents exposing the direct backend URL to the user.
 * 
 * @param url The relative or absolute URL of the document
 */
export const fetchAndOpenDocument = async (url: string) => {
  if (!url) return;

  const normalizedUrl = normalizeDocumentUrl(url);
  const toastId = toast.loading('Opening document...');

  try {
    // If it's already a blob URL, just open it
    if (normalizedUrl.startsWith('blob:')) {
      window.open(normalizedUrl, '_blank');
      toast.dismiss(toastId);
      return;
    }

    // Use normalized URL for fetching
    const response = await apiClient.getClient().get(normalizedUrl, {
      responseType: 'blob',
    });

    // Create a Blob from the response data
    const blob = new Blob([response.data], { 
      type: response.headers['content-type'] || 'application/pdf' 
    });
    
    // Create a URL for the Blob
    const blobUrl = window.URL.createObjectURL(blob);
    
    // Open in new tab
    const newWindow = window.open(blobUrl, '_blank');
    
    if (!newWindow) {
      toast.error('Pop-up blocked. Please allow pop-ups for this site.', { id: toastId });
      return;
    }

    toast.success('Document opened', { id: toastId });

    // Optional: Revoke URL after some time to free memory
    // window.URL.revokeObjectURL(blobUrl); // Doing this immediately might break the new tab loading
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000); // Revoke after 1 minute

  } catch (error: any) {
    console.error('Failed to open document:', error);
    
    let errorMessage = 'Failed to open document. Please try again.';
    
    // Parse Blob error if it's actually JSON
    if (error.response && error.response.data instanceof Blob && error.response.data.type === 'application/json') {
      try {
        const text = await error.response.data.text();
        const errorData = JSON.parse(text);
        if (errorData.detail) errorMessage = errorData.detail;
        else if (errorData.message) errorMessage = errorData.message;
      } catch (e) { /* ignore */ }
    } else if (error.response) {
       // Handle standard HTTP errors
       if (error.response.status === 404) errorMessage = 'Document not found.';
       if (error.response.status === 403) errorMessage = 'Access denied.';
    }

    toast.error(errorMessage, { id: toastId });
  }
};
