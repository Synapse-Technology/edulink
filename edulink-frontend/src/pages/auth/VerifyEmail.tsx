import React, { useEffect, useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';

type VerifyStatus = 'verifying' | 'success' | 'error';

const VerifyEmail: React.FC = () => {
  const { token } = useParams();
  const [status, setStatus] = useState<VerifyStatus>('verifying');
  const [message, setMessage] = useState('Verifying your email address...');
  const verifyCalledToken = useRef<string | null>(null);

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Missing verification token.');
        return;
      }
      
      // Clean the token (remove trailing slash if present)
      const cleanToken = token.trim().replace(/\/$/, '');
      
      // Prevent double-execution for the same token
      if (verifyCalledToken.current === cleanToken) {
        return;
      }
      verifyCalledToken.current = cleanToken;

      try {
        const response = await fetch('/api/notifications/email-verification/verify/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: cleanToken }),
        });

        if (!response.ok) {
          let errorMessage = 'Verification link is invalid or has expired.';
          try {
            const data = await response.json();
            if (typeof data.error === 'string' && data.error) {
              errorMessage = data.error;
            }
          } catch (parseError) {
            console.error('Failed to parse verification error response', parseError);
          }
          setStatus('error');
          setMessage(errorMessage);
          return;
        }

        setStatus('success');
        setMessage('Your email has been verified successfully. You can now sign in.');
      } catch {
        setStatus('error');
        setMessage('Unable to verify your email at the moment. Please try again later.');
      }
    };

    verify();
  }, [token]);

  const isLoading = status === 'verifying';
  const isSuccess = status === 'success';

  return (
    <div
      className="min-h-screen flex registration-container"
      style={{
        background: 'url(/src/assets/images/background_2.jpeg) no-repeat center center/cover',
        minHeight: '100vh',
        width: '100%',
        overflowX: 'hidden',
        padding: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(20, 40, 30, 0.55)',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      <main
        className="registration-wrapper"
        style={{
          display: 'flex',
          width: '100%',
          maxWidth: '520px',
          minHeight: '360px',
          backgroundColor: 'rgba(10, 25, 15, 0.7)',
          borderRadius: '20px',
          boxShadow: '0 10px 35px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          backdropFilter: 'blur(18px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div
          className="form-side"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '30px',
          }}
        >
          <div
            className="form-box"
            style={{
              width: '100%',
              maxWidth: '420px',
              color: '#fff',
              textAlign: 'center',
            }}
          >
            <h2
              style={{
                color: '#ffffff',
                marginBottom: '10px',
                fontSize: '26px',
                letterSpacing: '0.5px',
              }}
            >
              Email Verification
            </h2>
            <p
              style={{
                color: '#f1f1f1',
                marginBottom: '24px',
                fontSize: '15px',
              }}
            >
              {message}
            </p>

            {isLoading && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    border: '3px solid rgba(17, 204, 173, 0.2)',
                    borderTop: '3px solid rgb(17, 204, 173)',
                    borderRadius: '50%',
                    marginBottom: '4px',
                    filter: 'drop-shadow(0 4px 8px rgba(17, 204, 173, 0.2))',
                  }}
                />
              </div>
            )}

            {!isLoading && (
              <div
                style={{
                  marginTop: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  alignItems: 'center',
                }}
              >
                {isSuccess ? (
                  <Link
                    to="/login"
                    style={{
                      padding: '10px 22px',
                      borderRadius: '10px',
                      background:
                        'linear-gradient(90deg,rgb(10, 187, 163) 0%,rgb(7, 168, 141) 100%)',
                      color: '#fff',
                      border: 'none',
                      fontSize: '15px',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    Go to sign in
                  </Link>
                ) : (
                  <Link
                    to="/register"
                    style={{
                      padding: '10px 22px',
                      borderRadius: '10px',
                      border: '1px solid #c8e6c9',
                      backgroundColor: 'transparent',
                      color: '#c8e6c9',
                      fontSize: '15px',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    Back to registration
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default VerifyEmail;
