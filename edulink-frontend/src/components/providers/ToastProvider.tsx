/**
 * Toast Provider Component
 * Provides react-hot-toast at the root of the app with professional styling
 * Usage: Wrap your app root with <ToastProvider>{children}</ToastProvider>
 */

import { Toaster } from 'react-hot-toast';

export const ToastProvider = ({ children }: { children: React.ReactNode }) => (
  <>
    {children}
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={12}
      toastOptions={{
        className:
          'flex items-center gap-3 px-4 py-3 font-medium text-sm backdrop-blur-sm',
        style: {
          background: 'rgba(255, 255, 255, 0.95)',
          color: '#1f2937',
          boxShadow:
            '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          borderRadius: '0.5rem',
          border: '1px solid rgba(229, 231, 235, 0.8)',
        },
        success: {
          style: {
            background: 'rgba(240, 253, 250, 0.95)',
            color: '#047857',
            borderLeft: '4px solid #10b981',
          },
          duration: 3000,
        },
        error: {
          style: {
            background: 'rgba(254, 242, 242, 0.95)',
            color: '#7f1d1d',
            borderLeft: '4px solid #ef4444',
          },
          duration: 5000,
        },
        loading: {
          style: {
            background: 'rgba(239, 246, 255, 0.95)',
            color: '#1e40af',
            borderLeft: '4px solid #3b82f6',
          },
        },
      }}
    />
  </>
);
