import { apiClient } from '../services/api/client';
import { toast } from 'react-hot-toast';

/**
 * Fetches a document from the backend as a blob and opens it in a new tab.
 * This prevents exposing the direct backend URL to the user.
 * 
 * @param url The relative or absolute URL of the document
 */
export const fetchAndOpenDocument = async (url: string) => {
  if (!url) return;

  const toastId = toast.loading('Opening document...');

  try {
    // If it's already a blob URL, just open it
    if (url.startsWith('blob:')) {
      window.open(url, '_blank');
      toast.dismiss(toastId);
      return;
    }

    // Clean up the URL to ensure it's relative to API base if needed
    // If it's a full URL, we need to extract the path relative to the API base URL
    // to ensure the apiClient uses the correct base and headers.
    // However, apiClient handles full URLs by checking if they start with http.
    // But for our "hide URL" purpose, we want to fetch it via our proxy/client.
    
    // Actually, apiClient.get() expects a path or full URL. 
    // If we pass a full URL that is on a different domain/port, axios handles it.
    
    const response = await apiClient.getClient().get(url, {
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
