import { useEffect } from 'react';
import { apiClient } from '../../services/api/client';

/**
 * KeepAlive component pings the backend health check endpoint every 5 minutes
 * to prevent Render free tier services from spinning down due to inactivity.
 */
const KeepAlive = () => {
  useEffect(() => {
    // Only run in production or if explicitly enabled
    if (!import.meta.env.PROD && !import.meta.env.VITE_ENABLE_KEEP_ALIVE) {
      return;
    }

    const pingBackend = async () => {
      try {
        // Use apiClient with skipAuth to avoid authentication interceptor issues
        // The health endpoint is at the root level /health/
        await apiClient.get('/health/', { 
          skipAuth: true 
        } as any);
        console.log('KeepAlive: Ping successful');
      } catch (error) {
        console.error('KeepAlive: Failed to ping backend:', error);
      }
    };

    // Initial ping
    pingBackend();

    // Set interval to ping every 5 minutes (300,000 ms)
    const intervalId = setInterval(pingBackend, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  // This component doesn't render anything
  return null;
};

export default KeepAlive;
