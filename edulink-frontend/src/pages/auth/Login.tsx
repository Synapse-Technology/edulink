import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  FileText,
  TrendingUp,
} from 'lucide-react';

import { useAuthStore } from '../../stores/authStore';
import { useLoginErrorHandler } from '../../hooks/useAuthErrorHandler';
import edulinkLogo from '../../assets/images/edulink-logo-v1-select.svg';
import DemoCredentialsPanel, {
  type DemoCredential,
} from '../../components/auth/DemoCredentialsPanel';
import {
  getDashboardPath,
  portalMatchesUser,
  type Portal,
} from '../../utils/authRouting';

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --brand: #069b8e;
  --brand-hi: #0bbfa3;
  --brand-lo: #057e73;
  --brand-bg: #0a4f4a;
  --brand-tint: rgba(6,155,142,.08);
  --brand-ring: rgba(6,155,142,.22);

  --ink: #111827;
  --ink-2: #1f2937;
  --muted: #6b7280;
  --faint: #9ca3af;
  --placeholder: #c7ced8;
  --bg: #f6faf9;
  --surface: #ffffff;
  --border: #e5e7eb;
  --border-2: #f3f4f6;

  --danger: #dc2626;
  --danger-bg: #fef2f2;
  --danger-bd: #fecaca;
  --success-bg: #f0fdf9;
  --success-bd: #99f6e4;
  --success-tx: #0f766e;

  --r-sm: 6px;
  --r: 10px;
  --r-lg: 14px;
  --r-xl: 20px;
  --r-2xl: 26px;

  --font: 'Plus Jakarta Sans', system-ui, sans-serif;
  --ease: .16s cubic-bezier(.4,0,.2,1);
}

.el-login {
  display: grid;
  grid-template-columns: 440px 1fr;
  min-height: 100vh;
  width: 100vw;
  overflow: hidden;
  font-family: var(--font);
  color: var(--ink);
  background: var(--bg);
}

/* LEFT */
.el-left {
  position: relative;
  overflow: hidden;
  min-height: 100vh;
  background: var(--brand-bg);
}

.el-glow {
  position: absolute;
  width: 580px;
  height: 580px;
  top: -170px;
  right: -210px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(220,255,248,.24), transparent 58%);
  pointer-events: none;
}

.el-glow-2 {
  position: absolute;
  width: 340px;
  height: 340px;
  bottom: -100px;
  left: -80px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(210,255,247,.14), transparent 62%);
  pointer-events: none;
}

.el-grid-tex {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,.028) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.028) 1px, transparent 1px);
  background-size: 38px 38px;
  pointer-events: none;
}

.el-left-inner {
  position: relative;
  z-index: 2;
  min-height: 100vh;
  padding: 38px 42px 40px;
  display: flex;
  flex-direction: column;
}

.el-logo {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  width: fit-content;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.14);
  box-shadow: 0 10px 28px rgba(0,0,0,.22);
}

.el-logo-img {
  height: 38px;
  width: auto;
}

.el-hero {
  margin-top: 28px;
}

.el-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--brand-hi);
  font-size: .72rem;
  font-weight: 800;
  letter-spacing: .11em;
  text-transform: uppercase;
  margin-bottom: 20px;
}

.el-eyebrow-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--brand-hi);
  box-shadow: 0 0 16px rgba(11,191,163,.75);
}

.el-headline {
  max-width: 340px;
  font-size: clamp(1.95rem, 2.6vw, 2.7rem);
  line-height: 1.08;
  letter-spacing: -.7px;
  font-weight: 800;
  color: #fff;
  margin-bottom: 15px;
}

.el-headline span {
  color: var(--brand-hi);
}

.el-sub {
  max-width: 315px;
  color: rgba(255,255,255,.74);
  font-size: .89rem;
  line-height: 1.75;
}

.el-features {
  margin-top: 38px;
  display: flex;
  flex-direction: column;
}

.el-feature {
  display: flex;
  gap: 13px;
  padding: 15px 0;
  border-bottom: 1px solid rgba(255,255,255,.055);
}

.el-feature:last-child {
  border-bottom: 0;
}

.el-feature-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(11,191,163,.11);
  border: 1px solid rgba(11,191,163,.16);
  color: var(--brand-hi);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.el-feature-title {
  color: rgba(255,255,255,.92);
  font-size: .83rem;
  font-weight: 700;
  margin-bottom: 2px;
}

.el-feature-desc {
  color: rgba(255,255,255,.64);
  font-size: .74rem;
  line-height: 1.5;
}

/* RIGHT */
.el-right {
  min-height: 100vh;
  overflow-y: auto;
  background:
    radial-gradient(circle at top right, rgba(6,155,142,.08), transparent 36%),
    var(--bg);
}

.el-right-inner {
  width: 100%;
  max-width: 610px;
  min-height: 100vh;
  margin: 0 auto;
  padding: 32px 48px 42px;
  display: flex;
  flex-direction: column;
}

.el-topbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  color: var(--muted);
  font-size: .82rem;
  margin-bottom: 26px;
}

.el-topbar a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--brand);
  border: 1.5px solid var(--brand-ring);
  background: var(--brand-tint);
  padding: 8px 15px;
  border-radius: var(--r);
  text-decoration: none;
  font-weight: 800;
  transition: background var(--ease), border-color var(--ease);
}

.el-topbar a:hover {
  background: rgba(6,155,142,.14);
  border-color: rgba(6,155,142,.38);
}

.el-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-2xl);
  padding: 34px 32px 28px;
  box-shadow: 0 18px 55px rgba(17,24,39,.045);
}

.el-form-head {
  margin-bottom: 22px;
}

.el-step-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--brand);
  background: var(--brand-tint);
  border: 1px solid rgba(6,155,142,.14);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: .68rem;
  font-weight: 800;
  letter-spacing: .1em;
  text-transform: uppercase;
  margin-bottom: 12px;
}

.el-title {
  font-size: 1.75rem;
  font-weight: 800;
  line-height: 1.12;
  letter-spacing: -.55px;
  color: var(--ink);
  margin-bottom: 6px;
}

.el-helper {
  color: var(--muted);
  font-size: .87rem;
  line-height: 1.6;
}

.el-portal-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 9px;
  margin-bottom: 20px;
}

.el-portal {
  border: 1.5px solid var(--border);
  background: var(--surface);
  color: var(--muted);
  border-radius: var(--r-lg);
  min-height: 74px;
  padding: 10px 8px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font: 800 .72rem var(--font);
  transition:
    border-color var(--ease),
    background var(--ease),
    color var(--ease),
    box-shadow var(--ease),
    transform .1s;
}

.el-portal svg {
  color: var(--faint);
  transition: color var(--ease);
}

.el-portal:hover {
  border-color: rgba(6,155,142,.28);
  background: rgba(6,155,142,.04);
}

.el-portal.active {
  border-color: rgba(6,155,142,.48);
  background: rgba(6,155,142,.08);
  color: var(--brand);
  box-shadow: 0 0 0 4px var(--brand-ring);
}

.el-portal.active svg {
  color: var(--brand);
}

.el-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.el-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.el-label {
  color: var(--ink-2);
  font-size: .73rem;
  font-weight: 800;
  letter-spacing: .05em;
  text-transform: uppercase;
}

.el-wrap {
  position: relative;
}

.el-input {
  width: 100%;
  height: 48px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  border-radius: var(--r);
  padding: 0 14px;
  font: 600 .9rem var(--font);
  color: var(--ink);
  outline: none;
  transition: border-color var(--ease), box-shadow var(--ease), background var(--ease);
}

.el-input.with-left {
  padding-left: 42px;
}

.el-input.with-right {
  padding-right: 42px;
}

.el-input:hover:not(:focus) {
  border-color: #d1d5db;
  background: var(--bg);
}

.el-input:focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 3.5px var(--brand-ring);
  background: var(--surface);
}

.el-input::placeholder {
  color: var(--placeholder);
  font-weight: 500;
}

.el-input-icon,
.el-eye {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  color: var(--faint);
  display: flex;
}

.el-input-icon {
  left: 13px;
  pointer-events: none;
}

.el-eye {
  right: 12px;
  border: 0;
  background: none;
  cursor: pointer;
  padding: 2px;
  border-radius: 5px;
  transition: color var(--ease);
}

.el-eye:hover {
  color: var(--ink);
}

.el-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 2px;
}

.el-check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: .82rem;
  font-weight: 600;
  cursor: pointer;
}

.el-check input {
  width: 15px;
  height: 15px;
  accent-color: var(--brand);
}

.el-link {
  color: var(--brand);
  font-size: .82rem;
  font-weight: 800;
  text-decoration: none;
}

.el-link:hover {
  text-decoration: underline;
}

.el-submit {
  height: 49px;
  margin-top: 5px;
  border: 0;
  border-radius: var(--r);
  background: var(--brand);
  color: #fff;
  font: 800 .92rem var(--font);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  box-shadow: 0 2px 14px rgba(6,155,142,.30);
  transition: background var(--ease), box-shadow var(--ease), transform .1s;
}

.el-submit:hover:not(:disabled) {
  background: var(--brand-lo);
  box-shadow: 0 4px 20px rgba(6,155,142,.40);
}

.el-submit:active:not(:disabled) {
  transform: scale(.985);
}

.el-submit:disabled {
  opacity: .55;
  cursor: not-allowed;
  box-shadow: none;
}

.el-spinner {
  width: 15px;
  height: 15px;
  border: 2.5px solid rgba(255,255,255,.3);
  border-top-color: #fff;
  border-radius: 999px;
  animation: spin .65s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.el-safe {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--faint);
  font-size: .74rem;
  font-weight: 600;
  margin-top: 14px;
}

.el-demo {
  margin-bottom: 18px;
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  background: var(--bg);
  overflow: hidden;
}

.el-demo summary {
  list-style: none;
  cursor: pointer;
  padding: 12px 14px;
  color: var(--ink-2);
  font-size: .82rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.el-demo summary::-webkit-details-marker {
  display: none;
}

.el-demo summary span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.el-demo-body {
  padding: 0 12px 12px;
}

/* TOAST */
.el-toast-wrap {
  position: fixed;
  top: 24px;
  left: 0;
  right: 0;
  z-index: 9999;
  display: flex;
  justify-content: center;
  padding: 0 20px;
  pointer-events: none;
}

.el-toast {
  width: 100%;
  max-width: 440px;
  pointer-events: auto;
  border-radius: var(--r-lg);
  padding: 13px 46px 13px 14px;
  font-size: .84rem;
  font-weight: 700;
  line-height: 1.5;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  position: relative;
  box-shadow: 0 18px 48px rgba(17,24,39,.16);
  animation: toastIn .2s ease forwards;
}

.el-toast.error {
  background: var(--danger-bg);
  border: 1px solid var(--danger-bd);
  color: var(--danger);
}

.el-toast.success {
  background: var(--success-bg);
  border: 1px solid var(--success-bd);
  color: var(--success-tx);
}

.el-toast.closing {
  animation: toastOut .18s ease forwards;
}

.el-toast-close {
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  border: 0;
  background: none;
  cursor: pointer;
  color: inherit;
  opacity: .65;
  font-size: 20px;
  line-height: 1;
}

.el-toast-close:hover {
  opacity: 1;
}

@keyframes toastIn {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: none; }
}

@keyframes toastOut {
  from { opacity: 1; transform: none; }
  to { opacity: 0; transform: translateY(-8px); }
}

@media (max-width: 980px) {
  .el-login {
    grid-template-columns: 1fr;
    width: 100%;
    min-height: 100vh;
    overflow: visible;
  }

  .el-left {
    display: none;
  }

  .el-right {
    min-height: 100vh;
    overflow-y: visible;
  }

  .el-right-inner {
    max-width: 100%;
    padding: 24px 20px 40px;
  }

  .el-card {
    padding: 26px 20px 22px;
    border-radius: var(--r-xl);
  }
}

@media (max-width: 640px) {
  .el-topbar {
    justify-content: center;
    margin-bottom: 18px;
  }

  .el-portal-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .el-options {
    align-items: flex-start;
    flex-direction: column;
  }

  .el-title {
    font-size: 1.5rem;
  }

  .el-input {
    font-size: 16px;
  }
}
`;

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface LoginProps {
  portalIntent?: Portal;
}

const portalCopy: Record<Portal, { label: string; title: string; helper: string }> = {
  student: {
    label: 'Student',
    title: 'Student Login',
    helper: 'Access applications, placements, logbooks, and certificates.',
  },
  employer: {
    label: 'Employer',
    title: 'Employer Login',
    helper: 'Manage opportunities, applications, interns, and supervision.',
  },
  institution: {
    label: 'Institution',
    title: 'Institution Login',
    helper: 'Monitor cohorts, placements, assessors, reports, and verification.',
  },
  admin: {
    label: 'Admin',
    title: 'System Admin',
    helper: 'Use the system admin portal for platform operations.',
  },
};

const portalIcons: Record<Portal, React.ReactNode> = {
  student: <GraduationCap size={18} />,
  employer: <Briefcase size={18} />,
  institution: <Building2 size={18} />,
  admin: <ShieldCheck size={18} />,
};

const demoByPortal: Record<Exclude<Portal, 'admin'>, DemoCredential[]> = {
  student: [
    {
      label: 'Student demo',
      email: 'demo.student@students.jkuat.ac.ke',
      password: 'DemoPass12345!',
      description: 'Browse applications, active internship, logbook, and certificates.',
    },
  ],
  employer: [
    {
      label: 'Employer admin',
      email: 'demo.employer@greenbyte.co.ke',
      password: 'DemoPass12345!',
      description: 'Manage opportunities, applications, interns, and supervisors.',
    },
    {
      label: 'Employer supervisor',
      email: 'demo.supervisor@greenbyte.co.ke',
      password: 'DemoPass12345!',
      description: 'Review active internships, logbooks, milestones, and incidents.',
    },
  ],
  institution: [
    {
      label: 'Institution admin',
      email: 'demo.institution@jkuat.ac.ke',
      password: 'DemoPass12345!',
      description: 'Review students, departments, placements, reports, and oversight tools.',
    },
  ],
};

const loginFeatures = [
  {
    icon: <FileText size={16} />,
    title: 'Resume active workflows',
    desc: 'Pick up applications, logbooks, approvals, and certificates where you left off.',
  },
  {
    icon: <Building2 size={16} />,
    title: 'Role-aware workspaces',
    desc: 'Students, employers, and institutions land in the correct dashboard.',
  },
  {
    icon: <TrendingUp size={16} />,
    title: 'Placement visibility',
    desc: 'Track internships, supervision progress, and verified career records.',
  },
];

const Login: React.FC<LoginProps> = ({ portalIntent = 'student' }) => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [selectedPortal, setSelectedPortal] = useState<Portal>(portalIntent);
  const errorHandler = useLoginErrorHandler({ portal: selectedPortal });

  const [loginForm, setLoginForm] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'error' | 'success' | ''>('');
  const [showToast, setShowToast] = useState(false);
  const [toastClosing, setToastClosing] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const demoCredentials = selectedPortal === 'admin' ? [] : demoByPortal[selectedPortal];

  const useDemoCredential = (credential: DemoCredential) => {
    setLoginForm(prev => ({
      ...prev,
      email: credential.email,
      password: credential.password,
    }));
    setMessage('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    setLoginForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const hideToast = () => {
    setToastClosing(true);

    setTimeout(() => {
      setShowToast(false);
      setToastClosing(false);
    }, 180);
  };

  const showToastMessage = (msg: string, type: 'error' | 'success') => {
    setMessage(msg);
    setMessageType(type);
    setShowToast(true);
    setToastClosing(false);

    setTimeout(() => {
      hideToast();
    }, type === 'success' ? 6000 : 10000);
  };

  const validateLoginForm = () => {
    if (!loginForm.email.trim()) {
      showToastMessage('Please enter your email address', 'error');
      return false;
    }

    if (!loginForm.password) {
      showToastMessage('Please enter your password', 'error');
      return false;
    }

    return true;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!validateLoginForm()) return;

    setIsSubmitting(true);

    try {
      if (selectedPortal === 'admin') {
        navigate('/admin/login');
        return;
      }

      await login({
        email: loginForm.email,
        password: loginForm.password,
      });

      const user = useAuthStore.getState().user;
      const currentPortal = useAuthStore.getState().currentPortal;

      if (user && portalMatchesUser(user, selectedPortal)) {
        navigate(getDashboardPath(user, selectedPortal));
      } else {
        showToastMessage(
          'This account belongs to a different EduLink workspace. Redirecting you to the right dashboard.',
          'error',
        );

        if (user) {
          setTimeout(() => navigate(getDashboardPath(user, currentPortal)), 1200);
          return;
        }

        await useAuthStore.getState().logout();
      }
    } catch (error) {
      const errorMessage = await errorHandler.handleLoginError(error);
      showToastMessage(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitting = isSubmitting || isLoading;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      <div className="el-toast-wrap">
        {showToast && (
          <div
            className={`el-toast ${messageType === 'success' ? 'success' : 'error'} ${
              toastClosing ? 'closing' : ''
            }`}
            role="alert"
            aria-live="assertive"
          >
            {messageType === 'success' ? (
              <CheckCircle size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
            <span>{message}</span>

            <button
              type="button"
              className="el-toast-close"
              onClick={hideToast}
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        )}
      </div>

      <div className="el-login">
        <aside className="el-left" aria-hidden="true">
          <div className="el-glow" />
          <div className="el-glow-2" />
          <div className="el-grid-tex" />

          <div className="el-left-inner">
            <Link to="/" className="el-logo">
              <img src={edulinkLogo} alt="EduLink" className="el-logo-img" />
            </Link>

            <div className="el-hero">
              <div className="el-eyebrow">
                <span className="el-eyebrow-dot" />
                Secure workspace access
              </div>

              <h1 className="el-headline">
                Continue your internship workflow with <span>clarity.</span>
              </h1>

              <p className="el-sub">
                Sign in to manage placements, supervision, digital logbooks, and
                institution-backed career records.
              </p>

              <div className="el-features">
                {loginFeatures.map((feature) => (
                  <div className="el-feature" key={feature.title}>
                    <div className="el-feature-icon">{feature.icon}</div>
                    <div>
                      <div className="el-feature-title">{feature.title}</div>
                      <div className="el-feature-desc">{feature.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </aside>

        <main className="el-right">
          <div className="el-right-inner">
            <div className="el-topbar">
              <span>New to EduLink?</span>
              <Link to="/register">
                Create account <ArrowRight size={13} />
              </Link>
            </div>

            <section className="el-card" aria-label="Login panel">
              <div className="el-form-head">
                <div className="el-step-tag">
                  <Sparkles size={11} />
                  Workspace sign in
                </div>

                <h1 className="el-title">{portalCopy[selectedPortal].title}</h1>
                <p className="el-helper">{portalCopy[selectedPortal].helper}</p>
              </div>

              <div className="el-portal-grid" role="tablist" aria-label="Choose workspace">
                {(Object.keys(portalCopy) as Portal[]).map((portal) => (
                  <button
                    key={portal}
                    type="button"
                    className={`el-portal ${selectedPortal === portal ? 'active' : ''}`}
                    onClick={() => {
                      if (portal === 'admin') {
                        navigate('/admin/login');
                        return;
                      }

                      setSelectedPortal(portal);
                      setMessage('');
                    }}
                    aria-pressed={selectedPortal === portal}
                  >
                    {portalIcons[portal]}
                    <span>{portalCopy[portal].label}</span>
                  </button>
                ))}
              </div>

              {demoCredentials.length > 0 && (
                <details className="el-demo">
                  <summary>
                    <span>
                      <ShieldCheck size={15} />
                      Explore demo accounts
                    </span>
                    <ArrowRight size={14} />
                  </summary>

                  <div className="el-demo-body">
                    <DemoCredentialsPanel
                      credentials={demoCredentials}
                      onUse={useDemoCredential}
                    />
                  </div>
                </details>
              )}

              <form
                onSubmit={handleLoginSubmit}
                className="el-form"
                id="loginForm"
                role="form"
                aria-label="Login form"
                noValidate
              >
                <div className="el-field">
                  <label htmlFor="email" className="el-label">
                    Email address
                  </label>

                  <div className="el-wrap">
                    <span className="el-input-icon" aria-hidden="true">
                      <Mail size={16} />
                    </span>

                    <input
                      className="el-input with-left"
                      type="email"
                      id="email"
                      name="email"
                      placeholder="you@university.ac.ke"
                      value={loginForm.email}
                      onChange={handleInputChange}
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="el-field">
                  <label htmlFor="password" className="el-label">
                    Password
                  </label>

                  <div className="el-wrap">
                    <span className="el-input-icon" aria-hidden="true">
                      <Lock size={15} />
                    </span>

                    <input
                      className="el-input with-left with-right"
                      type={passwordVisible ? 'text' : 'password'}
                      id="password"
                      name="password"
                      placeholder="Enter your password"
                      value={loginForm.password}
                      onChange={handleInputChange}
                      required
                      autoComplete="current-password"
                    />

                    <button
                      type="button"
                      className="el-eye"
                      onClick={() => setPasswordVisible(prev => !prev)}
                      aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                    >
                      {passwordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="el-options">
                  <label className="el-check">
                    <input
                      type="checkbox"
                      name="rememberMe"
                      checked={loginForm.rememberMe}
                      onChange={handleInputChange}
                    />
                    Remember me
                  </label>

                  <Link to="/forgot-password" className="el-link">
                    Forgot password?
                  </Link>
                </div>

                <button type="submit" className="el-submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <span className="el-spinner" />
                      Signing in…
                    </>
                  ) : (
                    <>
                      Sign in to workspace
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              <div className="el-safe">
                <ShieldCheck size={13} />
                Secure role-based access for EduLink workspaces
              </div>

            </section>
          </div>
        </main>
      </div>
    </>
  );
};

export default Login;