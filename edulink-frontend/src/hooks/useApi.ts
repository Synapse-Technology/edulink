import { useState, useCallback, useEffect, useRef } from 'react';
import { apiClient, ApiError } from '../services';

interface UseApiOptions {
  skip?: boolean;
  dependencies?: any[];
  onSuccess?: (data: any) => void;
  onError?: (error: ApiError) => void;
  retryOnFailure?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  refetch: () => void;
}

export function useApi<T>(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  url: string,
  options: UseApiOptions = {}
): UseApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { 
    skip = false, 
    dependencies = [],
    onSuccess, 
    onError, 
    retryOnFailure = true,
    retryAttempts = 3,
    retryDelay = 1000 
  } = options;

  const fetchData = useCallback(async () => {
    if (skip) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    let attempt = 0;
    
    const makeRequest = async (): Promise<void> => {
      try {
        const config = {
          signal: abortControllerRef.current?.signal,
          retryOnFailure,
        };

        let response;
        switch (method) {
          case 'get':
            response = await apiClient.get<T>(url, config);
            break;
          case 'post':
            response = await apiClient.post<T>(url, undefined, config);
            break;
          case 'put':
            response = await apiClient.put<T>(url, undefined, config);
            break;
          case 'patch':
            response = await apiClient.patch<T>(url, undefined, config);
            break;
          case 'delete':
            response = await apiClient.delete<T>(url, config);
            break;
          default:
            throw new Error(`Unsupported HTTP method: ${method}`);
        }

        setData(response);
        onSuccess?.(response);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err);
          onError?.(err);
          
          if (retryOnFailure && attempt < retryAttempts) {
            attempt++;
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
            return makeRequest();
          }
        } else if (err instanceof Error && err.name === 'AbortError') {
          // Request was cancelled, don't update state
          return;
        } else {
          const apiError = new ApiError('An unexpected error occurred');
          setError(apiError);
          onError?.(apiError);
        }
      } finally {
        setLoading(false);
      }
    };

    await makeRequest();
  }, [method, url, skip, onSuccess, onError, retryOnFailure, retryAttempts, retryDelay]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData, ...dependencies]);

  return { data, loading, error, refetch };
}

// Specialized hooks for common HTTP methods
export function useGet<T>(url: string, options?: UseApiOptions) {
  return useApi<T>('get', url, options);
}

export function usePost<T>(url: string, options?: UseApiOptions) {
  return useApi<T>('post', url, options);
}

export function usePut<T>(url: string, options?: UseApiOptions) {
  return useApi<T>('put', url, options);
}

export function usePatch<T>(url: string, options?: UseApiOptions) {
  return useApi<T>('patch', url, options);
}

export function useDelete<T>(url: string, options?: UseApiOptions) {
  return useApi<T>('delete', url, options);
}

// Hook for file uploads
export function useFileUpload<T>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [progress, setProgress] = useState(0);

  const uploadFile = useCallback(async (
    url: string,
    file: File,
    data?: any,
    onProgress?: (progress: number) => void
  ): Promise<T> => {
    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      // Create a custom axios instance for upload with progress tracking
      const formData = new FormData();
      formData.append('file', file);
      
      if (data) {
        Object.entries(data).forEach(([key, value]) => {
          formData.append(key, value as string);
        });
      }

      const response = await apiClient.upload<T>(url, file, data);
      
      setProgress(100);
      onProgress?.(100);
      
      return response;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err);
        throw err;
      } else {
        const apiError = new ApiError('File upload failed');
        setError(apiError);
        throw apiError;
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return { uploadFile, loading, error, progress };
}

// Hook for paginated data
export function usePaginatedApi<T>(
  method: 'get' | 'post',
  url: string,
  pageSize: number = 10,
  options: UseApiOptions = {}
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchPage = useCallback(async (pageNum: number) => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        page: pageNum,
        page_size: pageSize,
      };

      let response;
      if (method === 'get') {
        response = await apiClient.get(url, { params });
      } else {
        response = await apiClient.post(url, params);
      }

      const { results, total: totalCount, has_next } = response as any;
      
      if (pageNum === 1) {
        setData(results);
      } else {
        setData(prev => [...prev, ...results]);
      }
      
      setTotal(totalCount);
      setHasMore(has_next);
      setPage(pageNum);

      options.onSuccess?.(response);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err);
        options.onError?.(err);
      } else {
        const apiError = new ApiError('Failed to fetch data');
        setError(apiError);
        options.onError?.(apiError);
      }
    } finally {
      setLoading(false);
    }
  }, [url, pageSize, options]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      fetchPage(page + 1);
    }
  }, [hasMore, loading, page, fetchPage]);

  const refetch = useCallback(() => {
    setPage(1);
    fetchPage(1);
  }, [fetchPage]);

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  return {
    data,
    loading,
    error,
    page,
    hasMore,
    total,
    loadMore,
    refetch,
  };
}

// Hook for real-time data with polling
export function usePollingApi<T>(
  method: 'get' | 'post',
  url: string,
  interval: number = 30000, // 30 seconds
  options: UseApiOptions = {}
) {
  const { data, loading, error, refetch } = useApi<T>(method, url, {
    ...options,
    skip: true, // Don't fetch on mount, we'll handle polling manually
  });

  const intervalRef = useRef<number | null>(null);

  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Fetch immediately
    refetch();

    // Set up interval
    intervalRef.current = setInterval(() => {
      refetch();
    }, interval);
  }, [refetch, interval]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    startPolling();

    return () => {
      stopPolling();
    };
  }, [startPolling, stopPolling]);

  return {
    data,
    loading,
    error,
    startPolling,
    stopPolling,
  };
}