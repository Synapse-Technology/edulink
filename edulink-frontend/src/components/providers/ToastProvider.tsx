/**
 * Toast Provider Component
 * Provides react-hot-toast at the root of the app
 * Usage: Wrap your app root with <ToastProvider>{children}</ToastProvider>
 */

import { Toaster } from 'react-hot-toast';

export const ToastProvider = ({ children }: { children: React.ReactNode }) => (
  <>
    {children}
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      toastOptions={{
        className: 'font-medium',
        style: {
          background: '#fff',
          color: '#000',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          borderRadius: '0.5rem',
          padding: '16px',
        },
        success: {
          style: {
            background: '#ecfdf5',
            color: '#065f46',
          },
          duration: 3000,
        },
        error: {
          style: {
            background: '#fef2f2',
            color: '#7f1d1d',
          },
          duration: 5000,
        },
      }}
    />
  </>
);
