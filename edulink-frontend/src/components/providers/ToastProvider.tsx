/**
 * Toast Provider Component
 * Provides react-hot-toast at the root of the app with premium, modern styling
 * Designed to match the Edulink professional and innovative brand identity.
 */

import { Toaster } from 'react-hot-toast';

export const ToastProvider = ({ children }: { children: React.ReactNode }) => (
  <>
    {children}
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={16}
      toastOptions={{
        // Global styles for all toasts
        className: 'premium-toast',
        style: {
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(12px)',
          color: '#1e293b', // slate-800
          padding: '12px 20px',
          borderRadius: '1.25rem', // Extra rounded for modern look
          fontSize: '0.875rem',
          fontWeight: '600',
          letterSpacing: '-0.01em',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          maxWidth: '420px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        
        // Success Toast Customization (Edulink Primary)
        success: {
          duration: 3500,
          style: {
            background: 'rgba(255, 255, 255, 0.98)',
            border: '1.5px solid #1ab8aa', // Full Edulink Primary border
          },
          iconTheme: {
            primary: '#1ab8aa',
            secondary: '#ffffff',
          },
        },
        
        // Error Toast Customization (Modern Red)
        error: {
          duration: 5500,
          style: {
            background: 'rgba(255, 255, 255, 0.98)',
            border: '1.5px solid #ef4444', // Full red border
          },
          iconTheme: {
            primary: '#ef4444',
            secondary: '#ffffff',
          },
        },
        
        // Loading Toast Customization (Edulink Secondary)
        loading: {
          style: {
            background: 'rgba(255, 255, 255, 0.98)',
            border: '1.5px solid #5fcf80', // Full Edulink Secondary border
          },
          iconTheme: {
            primary: '#5fcf80',
            secondary: '#ffffff',
          },
        },
      }}
    />
    
    <style>{`
      /* Custom animations and micro-interactions for Toasts */
      .premium-toast {
        animation: toast-slide-in 0.45s cubic-bezier(0.16, 1, 0.3, 1);
      }
      
      @keyframes toast-slide-in {
        from {
          transform: translateX(100%) scale(0.9);
          opacity: 0;
        }
        to {
          transform: translateX(0) scale(1);
          opacity: 1;
        }
      }

      /* Hover effect for better interactivity */
      .premium-toast:hover {
        transform: scale(1.02);
        box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.08);
      }
    `}</style>
  </>
);
