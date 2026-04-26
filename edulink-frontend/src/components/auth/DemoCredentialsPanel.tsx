import React from 'react';
import { Copy, KeyRound, LogIn } from 'lucide-react';

export interface DemoCredential {
  label: string;
  email: string;
  password: string;
  description: string;
}

interface DemoCredentialsPanelProps {
  credentials: DemoCredential[];
  onUse: (credential: DemoCredential) => void;
  compact?: boolean;
  dark?: boolean;
}

const showDemoCredentials =
  import.meta.env.VITE_SHOW_DEMO_CREDENTIALS === 'true' ||
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

const copyCredential = async (credential: DemoCredential) => {
  const text = `${credential.email}\n${credential.password}`;
  await navigator.clipboard?.writeText(text);
};

const DemoCredentialsPanel: React.FC<DemoCredentialsPanelProps> = ({
  credentials,
  onUse,
  compact = false,
  dark = false,
}) => {
  if (!showDemoCredentials) return null;

  return (
    <section
      className={`rounded-3 border ${compact ? 'p-2' : 'p-3'} mb-3`}
      style={{
        background: dark ? 'rgba(255,255,255,0.1)' : '#f8fafc',
        borderColor: dark ? 'rgba(255,255,255,0.18)' : '#dbe5f0',
        color: dark ? '#fff' : '#1f2937',
      }}
      aria-label="Demo access credentials"
    >
      <div className="d-flex align-items-start gap-2 mb-2">
        <div
          className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
          style={{
            width: compact ? 28 : 32,
            height: compact ? 28 : 32,
            background: dark ? 'rgba(20,184,166,0.24)' : '#e0f2fe',
            color: dark ? '#99f6e4' : '#0369a1',
          }}
        >
          <KeyRound size={compact ? 15 : 17} />
        </div>
        <div>
          <div className="fw-bold small">Demo access</div>
          <p
            className="mb-0"
            style={{
              fontSize: compact ? 12 : 13,
              color: dark ? 'rgba(255,255,255,0.78)' : '#64748b',
              lineHeight: 1.45,
            }}
          >
            Use a prepared walkthrough account with realistic internship data.
          </p>
        </div>
      </div>

      <div className="d-grid gap-2">
        {credentials.map(credential => (
          <div
            key={credential.email}
            className="rounded-2 border p-2"
            style={{
              background: dark ? 'rgba(0,0,0,0.16)' : '#fff',
              borderColor: dark ? 'rgba(255,255,255,0.14)' : '#e5e7eb',
            }}
          >
            <div className="d-flex justify-content-between gap-2 align-items-start">
              <div className="min-w-0">
                <div className="fw-semibold" style={{ fontSize: 13 }}>
                  {credential.label}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: dark ? 'rgba(255,255,255,0.72)' : '#64748b',
                  }}
                >
                  {credential.description}
                </div>
              </div>
              <button
                type="button"
                className={`btn btn-sm ${dark ? 'btn-outline-light' : 'btn-outline-secondary'}`}
                onClick={() => copyCredential(credential)}
                aria-label={`Copy ${credential.label} credentials`}
                title="Copy email and password"
              >
                <Copy size={14} />
              </button>
            </div>
            <div
              className="font-monospace mt-2"
              style={{
                fontSize: 12,
                color: dark ? '#d1fae5' : '#334155',
                overflowWrap: 'anywhere',
              }}
            >
              {credential.email}
              <br />
              {credential.password}
            </div>
            <button
              type="button"
              className={`btn btn-sm w-100 mt-2 d-inline-flex align-items-center justify-content-center gap-2 ${
                dark ? 'btn-light' : 'btn-primary'
              }`}
              onClick={() => onUse(credential)}
            >
              <LogIn size={14} />
              Use this account
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default DemoCredentialsPanel;
