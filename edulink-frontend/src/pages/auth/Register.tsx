import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle,
  XCircle,
  Search,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  GraduationCap,
  Briefcase,
  Lock,
  Mail,
  X,
  Sparkles,
  Building2,
  FileText,
  TrendingUp,
} from 'lucide-react';

import { authService } from '../../services/auth/authService';
import { institutionService } from '../../services/institution/institutionService';
import { apiClient } from '../../services/api/client';
import { ApiError } from '../../services/errors';
import { useRegisterErrorHandler } from '../../hooks/useAuthErrorHandler';
import edulinkLogo from '../../assets/images/edulink-logo-v1-select.svg';

type RegistrationStep = 0 | 1 | 2;

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
  gender: string;
  registrationNumber: string;
  role: 'student' | 'employer' | 'institution';
}

interface InstitutionOption {
  id: string | number;
  name: string;
}

interface ToastState {
  msg: string;
  type: 'error' | 'success';
}

interface PasswordRuleProps {
  pass: boolean;
  label: string;
}

/* ─────────────────────────────────────────────────────────────
   DESIGN SYSTEM
   
   Research basis:
   ─ Studied Handshake, Forage, RippleMatch, and similar
     edtech/career platforms to define the genre conventions
   ─ Pattern: dark branded left panel + white functional right
   ─ Brand anchor: teal #069b8e throughout, never competing colors
   ─ Typography: Plus Jakarta Sans — warm, professional, widely
     used in the edtech category (Forage, Coursera-adjacent)
   ─ Left panel background: #07dec8 (deep teal-black, not pure
     black — keeps the teal brand alive in shadows)
   ─ Single radial glow, top-right — one light source only
   ─ Feature list > product preview card: cleaner hierarchy,
     each item anchored by a teal icon tile
   ─ Right panel: white surface card, teal only on focus/CTA
─────────────────────────────────────────────────────────────── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  /* ── Brand ── */
  --brand:        #069b8e;
  --brand-hi:     #0bbfa3;
  --brand-lo:     #057e73;
  --brand-bg:     #0a4f4a;
  --brand-panel:  #08d7c2;
  --brand-tint:   rgba(6,155,142,.08);
  --brand-ring:   rgba(6,155,142,.22);

  /* ── Neutrals ── */
  --ink:          #111827;
  --ink-2:        #1f2937;
  --muted:        #6b7280;
  --faint:        #9ca3af;
  --placeholder:  #d1d5db;
  --bg:           #f6faf9;
  --surface:      #ffffff;
  --border:       #e5e7eb;
  --border-2:     #f3f4f6;

  /* ── Semantic ── */
  --danger:       #dc2626;
  --danger-bg:    #fef2f2;
  --danger-bd:    #fecaca;
  --success-bg:   #f0fdf9;
  --success-bd:   #99f6e4;
  --success-tx:   #0f766e;

  /* ── Radii ── */
  --r-sm:   6px;
  --r:      10px;
  --r-lg:   14px;
  --r-xl:   20px;
  --r-2xl:  26px;

  --font: 'Plus Jakarta Sans', system-ui, sans-serif;
  --ease: .16s cubic-bezier(.4,0,.2,1);
}

/* ══════════════════════════════════════
   ROOT
══════════════════════════════════════ */
.rg {
  display: grid;
  grid-template-columns: 440px 1fr;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  font-family: var(--font);
  color: var(--ink);
  background: var(--bg);
}

/* ══════════════════════════════════════
   LEFT — BRAND PANEL
   Deep teal-black background.
   Accent = teal only. No competing hues.
══════════════════════════════════════ */
.rg-left {
  background: var(--brand-bg);
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

/* Single radial glow — one light source */
.rg-glow {
  position: absolute;
  width: 580px;
  height: 580px;
  top: -160px;
  right: -200px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(220,255,248,.24) 0%, transparent 58%);
  pointer-events: none;
}
/* Bottom-left ambient */
.rg-glow-2 {
  position: absolute;
  width: 320px;
  height: 320px;
  bottom: -80px;
  left: -60px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(210,255,247,.14) 0%, transparent 60%);
  pointer-events: none;
}

/* Subtle grid texture */
.rg-grid-tex {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,.028) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.028) 1px, transparent 1px);
  background-size: 38px 38px;
  pointer-events: none;
}

/* All left content sits above overlays */
.rg-left-inner {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 26px 42px 34px;
}

/* Logo */
.rg-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  width: fit-content;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.14);
  box-shadow: 0 10px 28px rgba(0,0,0,.22);
  text-decoration: none;
  flex-shrink: 0;
}
.rg-logo-img {
  height: 38px;
  width: auto;
}

/* ── Hero ── */
.rg-hero { margin-top: 24px; flex-shrink: 0; }

.rg-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: .71rem;
  font-weight: 700;
  letter-spacing: .11em;
  text-transform: uppercase;
  color: var(--brand-hi);
  margin-bottom: 20px;
}
.rg-eyebrow-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--brand-hi);
  animation: blink 2.5s ease-in-out infinite;
}
@keyframes blink {
  0%,100% { opacity:1; transform:scale(1); }
  50%      { opacity:.4; transform:scale(.65); }
}

.rg-headline {
  font-size: clamp(1.85rem, 2.5vw, 2.65rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -.5px;
  color: #fff;
  margin-bottom: 15px;
}
.rg-headline span { color: var(--brand-hi); }

.rg-sub {
  font-size: .875rem;
  font-weight: 400;
  color: rgba(255,255,255,.74);
  line-height: 1.75;
  max-width: 305px;
}

/* ── Feature rows ── */
.rg-features {
  margin-top: 38px;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.rg-feat {
  display: flex;
  align-items: flex-start;
  gap: 13px;
  padding: 15px 0;
  border-bottom: 1px solid rgba(255,255,255,.055);
}
.rg-feat:last-child { border-bottom: 0; }
.rg-feat-icon {
  width: 36px; height: 36px;
  border-radius: 10px;
  background: rgba(11,191,163,.11);
  border: 1px solid rgba(11,191,163,.16);
  color: var(--brand-hi);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}
.rg-feat-title {
  font-size: .83rem;
  font-weight: 700;
  color: rgba(255,255,255,.92);
  margin-bottom: 2px;
  letter-spacing: -.1px;
}
.rg-feat-desc {
  font-size: .74rem;
  color: rgba(255,255,255,.64);
  line-height: 1.5;
}

/* ── Footer ── */
.rg-left-foot {
  margin-top: auto;
  padding-top: 26px;
  border-top: 1px solid rgba(255,255,255,.055);
}
.rg-trust {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}
.rg-trust-label {
  font-size: .69rem;
  color: rgba(255,255,255,.6);
  font-weight: 500;
}
.rg-trust-pill {
  font-size: .68rem;
  font-weight: 700;
  letter-spacing: .03em;
  color: rgba(255,255,255,.9);
  background: rgba(255,255,255,.15);
  border: 1px solid rgba(255,255,255,.24);
  border-radius: 5px;
  padding: 3px 8px;
}

/* ══════════════════════════════════════
   RIGHT — FORM PANEL
══════════════════════════════════════ */
.rg-right {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  height: 100vh;
  background: var(--bg);
}

.rg-right-inner {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px 48px 28px;
  max-width: 580px;
  width: 100%;
  margin: 0 auto;
  min-height: 100%;
}

/* Top bar */
.rg-topbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  font-size: .82rem;
  color: var(--muted);
  flex-shrink: 0;
}
.rg-signin-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--brand);
  border: 1.5px solid var(--brand-ring);
  background: var(--brand-tint);
  padding: 8px 15px;
  border-radius: var(--r);
  text-decoration: none;
  font-weight: 700;
  font-size: .82rem;
  transition: background var(--ease), border-color var(--ease);
}
.rg-signin-btn:hover {
  background: rgba(6,155,142,.14);
  border-color: rgba(6,155,142,.38);
}

/* ── Stepper ── */
.rg-stepper {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  flex-shrink: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  padding: 12px 18px;
}
.rg-step {
  display: flex; align-items: center;
  gap: 9px; flex-shrink: 0;
}
.rg-step-num {
  width: 28px; height: 28px;
  border-radius: 50%;
  border: 1.5px solid var(--border);
  background: var(--bg);
  display: flex; align-items: center; justify-content: center;
  font-size: .75rem; font-weight: 700;
  color: var(--faint);
  flex-shrink: 0;
  transition: all var(--ease);
}
.rg-step-lbl {
  font-size: .79rem; font-weight: 600;
  color: var(--faint);
  transition: color var(--ease);
  white-space: nowrap;
}
.rg-step-line {
  flex: 1; height: 2px;
  background: var(--border-2);
  margin: 0 8px;
  border-radius: 99px;
  min-width: 16px;
  transition: background var(--ease);
}
.rg-step.active .rg-step-num {
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
  box-shadow: 0 0 0 4px var(--brand-ring);
}
.rg-step.active .rg-step-lbl { color: var(--ink); }
.rg-step.done .rg-step-num {
  background: rgba(6,155,142,.1);
  border-color: var(--brand);
  color: var(--brand);
}
.rg-step.done .rg-step-lbl { color: var(--brand); }
.rg-step.done + .rg-step-line { background: var(--brand); }

/* ── Form card ── */
.rg-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-2xl);
  padding: 26px 26px 22px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Form head */
.rg-form-head { margin-bottom: 24px; }
.rg-step-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: .68rem;
  font-weight: 700;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--brand);
  background: var(--brand-tint);
  border: 1px solid rgba(6,155,142,.14);
  border-radius: 99px;
  padding: 4px 10px;
  margin-bottom: 12px;
}
.rg-form-title {
  font-size: 1.65rem; font-weight: 800;
  letter-spacing: -.5px; line-height: 1.14;
  color: var(--ink); margin-bottom: 5px;
}
.rg-form-sub {
  color: var(--muted); font-size: .86rem;
  font-weight: 400; line-height: 1.55;
}

/* ── Toast ── */
.rg-toast {
  display: flex; gap: 10px; align-items: flex-start;
  padding: 12px 14px; border-radius: var(--r);
  margin-bottom: 18px; font-size: .84rem; font-weight: 500;
  animation: toastIn .18s ease; flex-shrink: 0;
}
@keyframes toastIn {
  from { opacity: 0; transform: translateY(-5px); }
  to   { opacity: 1; transform: none; }
}
.rg-toast.err { background: var(--danger-bg); border: 1px solid var(--danger-bd); color: var(--danger); }
.rg-toast.ok  { background: var(--success-bg); border: 1px solid var(--success-bd); color: var(--success-tx); }
.rg-toast-x {
  margin-left: auto; background: none; border: 0;
  font-size: 16px; cursor: pointer; color: inherit; opacity: .7; line-height: 1;
}

/* ── Fields ── */
.rg-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 22px; }
.rg-grid1 { grid-template-columns: 1fr; }
.rg-span2 { grid-column: 1 / -1; }
.rg-field { display: flex; flex-direction: column; gap: 6px; }
.rg-label {
  font-size: .73rem; font-weight: 700;
  letter-spacing: .05em; text-transform: uppercase;
  color: var(--ink-2);
}

.rg-wrap { position: relative; }
.rg-input {
  width: 100%; height: 46px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  border-radius: var(--r);
  padding: 0 14px;
  font: 500 .9rem var(--font);
  color: var(--ink);
  outline: none; appearance: none;
  transition: border-color var(--ease), box-shadow var(--ease), background var(--ease);
}
.rg-input.il { padding-left: 42px; }
.rg-input.ir { padding-right: 42px; }
.rg-input:hover:not(:focus) { border-color: #d1d5db; background: var(--bg); }
.rg-input:focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 3.5px var(--brand-ring);
  background: var(--surface);
}
.rg-input::placeholder { color: var(--placeholder); font-weight: 400; }

.rg-il, .rg-ir {
  position: absolute; top: 50%; transform: translateY(-50%);
  color: var(--faint); display: flex; pointer-events: none;
}
.rg-il { left: 13px; }
.rg-ir {
  right: 12px; pointer-events: auto;
  background: none; border: 0; cursor: pointer;
  border-radius: 4px; padding: 2px;
  transition: color var(--ease);
}
.rg-ir:hover { color: var(--ink); }

/* Password rules */
.rg-rules {
  grid-column: 1 / -1;
  display: flex; gap: 14px; flex-wrap: wrap;
  padding: 11px 14px;
  background: var(--bg);
  border: 1px solid var(--border-2);
  border-radius: var(--r);
  margin-top: -3px;
}
.rg-rule {
  display: flex; align-items: center; gap: 5px;
  font-size: .76rem; font-weight: 600;
  color: var(--faint); transition: color var(--ease);
}
.rg-rule.pass { color: var(--brand); }

/* Institution */
.rg-inst-rel { position: relative; }
.rg-dropdown {
  position: absolute;
  top: calc(100% + 5px); left: 0; right: 0;
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: var(--r-lg);
  box-shadow: 0 12px 32px rgba(0,0,0,.1);
  max-height: 210px; overflow-y: auto; z-index: 60;
}
.rg-dd-btn {
  width: 100%; padding: 11px 14px;
  text-align: left; border: 0;
  border-bottom: 1px solid var(--border-2);
  background: none; cursor: pointer;
  font: 500 .86rem var(--font); color: var(--ink);
  transition: background var(--ease);
}
.rg-dd-btn:last-child { border-bottom: 0; }
.rg-dd-btn:hover { background: var(--bg); }

.rg-inst-linked, .rg-inst-skip-state {
  display: flex; align-items: center;
  justify-content: space-between; gap: 12px;
  border: 1.5px solid rgba(6,155,142,.25);
  background: rgba(6,155,142,.05);
  border-radius: var(--r); padding: 13px 15px;
}
.rg-inst-info { display: flex; align-items: center; gap: 11px; }
.rg-inst-icon {
  width: 38px; height: 38px; border-radius: 10px;
  background: rgba(6,155,142,.1); color: var(--brand);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.rg-inst-name { font-weight: 700; font-size: .87rem; color: var(--ink); }
.rg-inst-meta { font-size: .72rem; color: var(--brand); font-weight: 600; margin-top: 1px; }
.rg-change-btn {
  border: 0; background: none;
  color: var(--brand); font-weight: 700; font-size: .8rem;
  cursor: pointer; flex-shrink: 0;
}
.rg-change-btn:hover { color: var(--brand-lo); }
.rg-skip-note { font-size: .84rem; color: var(--muted); font-weight: 500; }
.rg-no-result { font-size: .78rem; color: var(--faint); margin-top: 7px; }
.rg-cant-find {
  border: 0; background: none;
  color: var(--brand); font-weight: 600; font-size: .78rem;
  cursor: pointer; margin-top: 10px; padding: 0;
  display: inline-flex; align-items: center; gap: 4px;
}
.rg-cant-find:hover { color: var(--brand-lo); }

/* Nav buttons */
.rg-nav { display: flex; gap: 10px; margin-top: auto; padding-top: 24px; flex-shrink: 0; }

.rg-back {
  display: flex; align-items: center; gap: 7px;
  background: var(--bg); border: 1.5px solid var(--border);
  border-radius: var(--r); padding: 0 18px; height: 48px;
  font: 600 .87rem var(--font); color: var(--muted);
  cursor: pointer;
  transition: border-color var(--ease), color var(--ease), background var(--ease);
  flex-shrink: 0;
}
.rg-back:hover:not(:disabled) { border-color: #d1d5db; color: var(--ink); background: var(--surface); }
.rg-back:disabled { opacity: .45; cursor: not-allowed; }

.rg-next {
  flex: 1; display: flex; align-items: center;
  justify-content: center; gap: 8px;
  background: var(--brand); border: 0;
  border-radius: var(--r); height: 48px;
  font: 700 .9rem var(--font); color: #fff;
  cursor: pointer; letter-spacing: .01em;
  transition: background var(--ease), box-shadow var(--ease), transform .1s;
  box-shadow: 0 2px 14px rgba(6,155,142,.3);
}
.rg-next:hover:not(:disabled) {
  background: var(--brand-lo);
  box-shadow: 0 4px 20px rgba(6,155,142,.4);
}
.rg-next:active:not(:disabled) { transform: scale(.985); }
.rg-next:disabled { opacity: .55; cursor: not-allowed; box-shadow: none; }

.rg-spinner {
  width: 15px; height: 15px;
  border: 2.5px solid rgba(255,255,255,.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin .65s linear infinite; flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

.rg-safe {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  color: var(--faint); font-size: .74rem; font-weight: 500;
  margin-top: 14px; flex-shrink: 0;
}
/* Success */
.rg-success {
  text-align: center; padding: 48px 16px;
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
}
.rg-success-ring {
  width: 80px; height: 80px; border-radius: 50%;
  background: rgba(6,155,142,.08);
  border: 1.5px solid rgba(6,155,142,.18);
  color: var(--brand);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 24px;
}
.rg-success-title {
  font-size: 1.85rem; font-weight: 800;
  letter-spacing: -.5px; margin-bottom: 10px; color: var(--ink);
}
.rg-success-desc {
  color: var(--muted); line-height: 1.7;
  max-width: 360px; margin: 0 auto 26px; font-size: .9rem;
}
.rg-success-email { color: var(--brand); font-weight: 700; }
.rg-resend {
  border: 1.5px solid var(--border); background: var(--surface);
  border-radius: var(--r); padding: 11px 22px;
  font: 600 .86rem var(--font); cursor: pointer; color: var(--ink-2);
  transition: border-color var(--ease), background var(--ease);
}
.rg-resend:hover { border-color: #d1d5db; background: var(--bg); }
.rg-resend:disabled { opacity: .5; cursor: not-allowed; }

/* Modal */
.rg-overlay {
  position: fixed; inset: 0;
  background: rgba(2,31,28,.55);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  padding: 20px; z-index: 200;
}
.rg-modal {
  width: 100%; max-width: 420px;
  background: var(--surface);
  border-radius: var(--r-xl); padding: 28px;
  border: 1px solid var(--border);
  box-shadow: 0 24px 64px rgba(0,0,0,.15);
}
.rg-modal-top {
  display: flex; align-items: flex-start;
  justify-content: space-between; margin-bottom: 8px;
}
.rg-modal-title { font-size: 1.1rem; font-weight: 800; letter-spacing: -.3px; color: var(--ink); }
.rg-modal-close {
  border: 0; background: none; cursor: pointer;
  color: var(--faint); display: flex; padding: 2px;
  border-radius: 5px; transition: color var(--ease);
}
.rg-modal-close:hover { color: var(--ink); }
.rg-modal-desc { color: var(--muted); font-size: .85rem; line-height: 1.65; margin-bottom: 16px; }
.rg-modal-input {
  width: 100%; height: 44px;
  border: 1.5px solid var(--border); border-radius: var(--r);
  padding: 0 13px; font: 500 .88rem var(--font); color: var(--ink);
  margin-bottom: 12px; outline: none;
  transition: border-color var(--ease), box-shadow var(--ease);
}
.rg-modal-input:focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 3.5px var(--brand-ring);
}
.rg-modal-input.has-err { border-color: var(--danger); }
.rg-modal-err { color: var(--danger); font-size: .78rem; margin: -6px 0 10px; }
.rg-modal-actions { display: flex; justify-content: flex-end; gap: 8px; }
.rg-modal-skip {
  border: 1.5px solid var(--border); background: var(--bg);
  border-radius: var(--r-sm); padding: 9px 15px;
  font: 600 .84rem var(--font); cursor: pointer; color: var(--muted);
  transition: border-color var(--ease);
}
.rg-modal-skip:hover { border-color: #d1d5db; }
.rg-modal-skip:disabled { opacity: .5; cursor: not-allowed; }
.rg-modal-submit {
  border: 0; background: var(--brand); color: #fff;
  border-radius: var(--r-sm); padding: 9px 18px;
  font: 700 .84rem var(--font); cursor: pointer;
  transition: background var(--ease);
  box-shadow: 0 2px 8px rgba(6,155,142,.25);
}
.rg-modal-submit:hover:not(:disabled) { background: var(--brand-lo); }
.rg-modal-submit:disabled { opacity: .5; cursor: not-allowed; }
.rg-modal-ok { text-align: center; padding: 10px 0 4px; }
.rg-modal-ok-icon {
  width: 52px; height: 52px; border-radius: 50%;
  background: rgba(6,155,142,.1); color: var(--brand);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 14px;
}
.rg-modal-ok-title { font-size: 1.05rem; font-weight: 800; margin-bottom: 5px; color: var(--ink); }
.rg-modal-ok-sub { color: var(--muted); font-size: .85rem; }

/* Responsive */
@media (max-width: 920px) {
  .rg { grid-template-columns: 1fr; height: auto; min-height: 100vh; overflow: visible; width: 100%; }
  .rg-left { display: none; }
  .rg-right { overflow-y: visible; height: auto; }
  .rg-right-inner { padding: 20px 16px 30px; max-width: 100%; min-height: 100vh; }
  .rg-grid  { grid-template-columns: 1fr; }
  .rg-span2 { grid-column: 1; }
  .rg-rules { grid-column: 1; }
  .rg-card  { padding: 22px 16px 20px; border-radius: var(--r-xl); }
}
`;

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────── */
const STEPS = ['Account', 'Personal', 'Academic'];
const STEP_TAGS = ['Step 1 of 3', 'Step 2 of 3', 'Step 3 of 3'];

const FEATURES = [
  {
    icon: <Briefcase size={16} />,
    title: 'Verified employer listings',
    desc: 'Every opportunity is screened and approved before going live.',
  },
  {
    icon: <FileText size={16} />,
    title: 'Digital logbooks',
    desc: 'Log, track, and submit your internship records digitally.',
  },
  {
    icon: <Building2 size={16} />,
    title: 'Institution-backed placements',
    desc: 'Your university is part of the verification loop.',
  },
  {
    icon: <TrendingUp size={16} />,
    title: 'Career progression tracking',
    desc: 'Build a verifiable record employers can trust.',
  },
];

/* ─────────────────────────────────────────────────────────────
   PwRule
───────────────────────────────────────────────────────────── */
function PwRule({ pass, label }: PasswordRuleProps) {
  return (
    <span className={`rg-rule${pass ? ' pass' : ''}`}
      aria-label={`${label}: ${pass ? 'requirement met' : 'not yet met'}`}>
      {pass ? <CheckCircle size={12} /> : <XCircle size={12} />}
      {label}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
const Register = () => {
  const errorHandler = useRegisterErrorHandler();

  const [currentStep, setCurrentStep] = useState<RegistrationStep>(0);
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    gender: '',
    registrationNumber: '',
    role: 'student',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [isResending, setIsResending] = useState(false);

  const [selectedInstitution, setSelectedInstitution] = useState<InstitutionOption | null>(null);
  const [availableInstitutions, setAvailableInstitutions] = useState<InstitutionOption[]>([]);
  const [isSearchingInstitutions, setIsSearchingInstitutions] = useState(false);
  const [institutionQuery, setInstitutionQuery] = useState('');
  const [institutionSkipped, setInstitutionSkipped] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [modalInstName, setModalInstName] = useState('');
  const [isSubmittingInterest, setIsSubmittingInterest] = useState(false);
  const [interestStatus, setInterestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const modalInputRef = useRef<HTMLInputElement | null>(null);

  const pw = formData.password;
  const passwordRules = {
    min:    pw.length >= 8,
    upper:  /[A-Z]/.test(pw),
    number: /\d/.test(pw),
  };

  useEffect(() => {
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, []);

  const showToast = (msg: string, type: 'error' | 'success' = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), type === 'success' ? 5000 : 9000);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleInstitutionSearch = (query: string) => {
    setInstitutionQuery(query);
    setInstitutionSkipped(false);
    if (selectedInstitution && query !== selectedInstitution.name) setSelectedInstitution(null);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (query.length < 2) { setAvailableInstitutions([]); return; }
    searchTimerRef.current = setTimeout(async () => {
      setIsSearchingInstitutions(true);
      try {
        const results = await institutionService.getPublicList(query);
        setAvailableInstitutions(results || []);
      } catch { setAvailableInstitutions([]); }
      finally { setIsSearchingInstitutions(false); }
    }, 450);
  };

  const selectInstitution = (inst: InstitutionOption) => {
    setSelectedInstitution(inst);
    setInstitutionQuery(inst.name);
    setAvailableInstitutions([]);
    setInstitutionSkipped(false);
  };

  const resetInstitution = () => {
    setSelectedInstitution(null);
    setInstitutionQuery('');
    setAvailableInstitutions([]);
    setInstitutionSkipped(false);
  };

  const openModal = () => {
    setModalInstName(institutionQuery.trim());
    setInterestStatus('idle');
    setShowModal(true);
    setTimeout(() => modalInputRef.current?.focus(), 80);
  };
  const closeModal = () => { setShowModal(false); setModalInstName(''); setInterestStatus('idle'); };
  const handleSkipInstitution = () => { setInstitutionSkipped(true); openModal(); };

  const handleInterestSubmit = async () => {
    if (!modalInstName.trim()) { closeModal(); return; }
    setIsSubmittingInterest(true);
    setInterestStatus('idle');
    try {
      await institutionService.recordInterest({
        raw_name:     modalInstName.trim(),
        user_email:   formData.email.trim(),
        email_domain: formData.email.split('@')[1] || '',
      });
      setInterestStatus('success');
      setTimeout(closeModal, 2200);
    } catch { setInterestStatus('error'); }
    finally { setIsSubmittingInterest(false); }
  };

  const validateStep = (step: RegistrationStep) => {
    if (step === 0) {
      if (!formData.email.trim())  { showToast('Email is required'); return false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { showToast('Enter a valid email address'); return false; }
      if (!formData.password)      { showToast('Password is required'); return false; }
      if (!passwordRules.min)      { showToast('Password must be at least 8 characters'); return false; }
      if (!passwordRules.upper)    { showToast('Password must contain at least one uppercase letter'); return false; }
      if (!passwordRules.number)   { showToast('Password must contain at least one number'); return false; }
      if (formData.password !== formData.confirmPassword) { showToast('Passwords do not match'); return false; }
    }
    if (step === 1) {
      if (!formData.firstName.trim()) { showToast('First name is required'); return false; }
      if (!formData.lastName.trim())  { showToast('Last name is required'); return false; }
      if (!formData.phone.trim())     { showToast('Phone number is required'); return false; }
      if (!/^(\+254|0)[17]\d{8}$/.test(formData.phone.replace(/\s/g, ''))) {
        showToast('Enter a valid Kenyan phone number (07XX or +2547XX)'); return false;
      }
      if (!formData.gender) { showToast('Please select your gender'); return false; }
    }
    if (step === 2) {
      if (!formData.registrationNumber.trim()) { showToast('Registration number is required'); return false; }
      if (!/^[A-Z0-9/ -]{3,50}$/i.test(formData.registrationNumber)) {
        showToast('Registration number must be 3–50 alphanumeric characters'); return false;
      }
      if (!selectedInstitution && !institutionSkipped) {
        showToast('Select your institution or continue without linking it'); return false;
      }
    }
    return true;
  };

  const nextStep = () => { if (validateStep(currentStep)) setCurrentStep(s => (s + 1) as RegistrationStep); };
  const prevStep = () => setCurrentStep(s => (s - 1) as RegistrationStep);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    for (const step of [0, 1, 2]) {
      if (!validateStep(step as RegistrationStep)) { setCurrentStep(step as RegistrationStep); return; }
    }
    setIsSubmitting(true);
    try {
      const payload = {
        email:               formData.email.trim(),
        password:            formData.password,
        password_confirm:    formData.confirmPassword,
        first_name:          formData.firstName.trim(),
        last_name:           formData.lastName.trim(),
        phone_number:        formData.phone.trim(),
        gender:              formData.gender,
        role:                'student',
        registration_number: formData.registrationNumber.trim(),
        institution_id:      selectedInstitution ? selectedInstitution.id : null,
      };
      await apiClient.post('/api/auth/users/register/', payload);
      setRegistrationComplete(true);
      setRegisteredEmail(formData.email.trim());
    } catch (error) {
      await errorHandler.handleError(error);
      const fieldErrors = errorHandler.getAllFieldErrors();
      if (fieldErrors.length > 0) {
        showToast(fieldErrors.map((f) => `${f.field}: ${f.errors.join(', ')}`).join('; '));
      } else {
        showToast(error instanceof ApiError ? error.message : 'Registration failed. Please try again.');
      }
    } finally { setIsSubmitting(false); }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await authService.resendVerificationEmail(registeredEmail);
      showToast('Verification email resent.', 'success');
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Failed to resend. Try again.');
    } finally { setIsResending(false); }
  };

  /* ═══════════════════ RENDER ═══════════════════ */
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="rg">

        {/* ═══════════════ LEFT PANEL ═══════════════ */}
        <aside className="rg-left" aria-hidden="true">
          <div className="rg-glow" />
          <div className="rg-glow-2" />
          <div className="rg-grid-tex" />

          <div className="rg-left-inner">

            <Link to="/" className="rg-logo">
              <img src={edulinkLogo} alt="EduLink" className="rg-logo-img" />
            </Link>

            <div className="rg-hero">
              <div className="rg-eyebrow">
                <div className="rg-eyebrow-dot" />
                Kenya's #1 internship platform
              </div>

              <h1 className="rg-headline">
                Launch your career<br />
                with <span>confidence.</span>
              </h1>

              <p className="rg-sub">
                Verified placements, digital logbooks, and institution-backed
                opportunities — built for Kenyan students.
              </p>

              <div className="rg-features">
                {FEATURES.map((f, i) => (
                  <div className="rg-feat" key={i}>
                    <div className="rg-feat-icon">{f.icon}</div>
                    <div>
                      <div className="rg-feat-title">{f.title}</div>
                      <div className="rg-feat-desc">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rg-left-foot">
              <div className="rg-trust">
                <span className="rg-trust-label">Trusted by students from</span>
                {['JKUAT', 'KU', 'UoN', 'MMUST', 'Strathmore', 'KCA'].map(n => (
                  <span key={n} className="rg-trust-pill">{n}</span>
                ))}
              </div>
            </div>

          </div>
        </aside>

        {/* ═══════════════ RIGHT PANEL ═══════════════ */}
        <main className="rg-right">
          <div className="rg-right-inner">

            <div className="rg-topbar">
              <span>Already have an account?</span>
              <Link to="/login" className="rg-signin-btn">
                Sign in <ArrowRight size={13} />
              </Link>
            </div>

            {!registrationComplete && (
              <nav className="rg-stepper" aria-label="Registration steps">
                {STEPS.map((label, i) => (
                  <React.Fragment key={label}>
                    <div
                      className={`rg-step${currentStep === i ? ' active' : ''}${i < currentStep ? ' done' : ''}`}
                      aria-current={currentStep === i ? 'step' : undefined}
                    >
                      <div className="rg-step-num" aria-hidden="true">
                        {i < currentStep ? <CheckCircle size={13} /> : i + 1}
                      </div>
                      <span className="rg-step-lbl">{label}</span>
                    </div>
                    {i < STEPS.length - 1 && <div className="rg-step-line" aria-hidden="true" />}
                  </React.Fragment>
                ))}
              </nav>
            )}

            <div className="rg-card">

              {/* SUCCESS STATE */}
              {registrationComplete ? (
                <div className="rg-success">
                  <div className="rg-success-ring">
                    <CheckCircle size={30} />
                  </div>
                  <h2 className="rg-success-title">Check your inbox</h2>
                  <p className="rg-success-desc">
                    We sent a verification link to{' '}
                    <span className="rg-success-email">{registeredEmail}</span>.
                    Click it to activate your account.
                  </p>
                  <button className="rg-resend" onClick={handleResend} disabled={isResending}>
                    {isResending ? 'Resending…' : 'Resend email'}
                  </button>
                </div>

              ) : (
                <>
                  {/* Form header */}
                  <div className="rg-form-head">
                    <div className="rg-step-tag">
                      <Sparkles size={10} />
                      {STEP_TAGS[currentStep]}
                    </div>
                    <h2 className="rg-form-title">
                      {currentStep === 0 && 'Create your account'}
                      {currentStep === 1 && 'Personal details'}
                      {currentStep === 2 && 'Academic details'}
                    </h2>
                    <p className="rg-form-sub">
                      {currentStep === 0 && 'Set up your credentials to get started.'}
                      {currentStep === 1 && 'Help us personalise your experience.'}
                      {currentStep === 2 && 'Link your student record to your institution.'}
                    </p>
                  </div>

                  {/* Toast */}
                  {toast && (
                    <div className={`rg-toast ${toast.type}`} role="alert" aria-live="assertive">
                      {toast.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle size={15} />}
                      <span>{toast.msg}</span>
                      <button className="rg-toast-x" onClick={() => setToast(null)} aria-label="Dismiss">×</button>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} noValidate>

                    {/* STEP 0 — ACCOUNT */}
                    {currentStep === 0 && (
                      <div className="rg-grid">
                        <div className="rg-field rg-span2">
                          <label className="rg-label" htmlFor="email">Email address</label>
                          <div className="rg-wrap">
                            <span className="rg-il" aria-hidden="true"><Mail size={16} /></span>
                            <input className="rg-input il" id="email" name="email" type="email"
                              placeholder="you@university.ac.ke"
                              value={formData.email} onChange={handleInputChange}
                              autoComplete="email" required />
                          </div>
                        </div>

                        <div className="rg-field">
                          <label className="rg-label" htmlFor="password">Password</label>
                          <div className="rg-wrap">
                            <span className="rg-il" aria-hidden="true"><Lock size={15} /></span>
                            <input className="rg-input il ir" id="password" name="password"
                              type={passwordVisible ? 'text' : 'password'}
                              placeholder="Min. 8 characters"
                              value={formData.password} onChange={handleInputChange}
                              autoComplete="new-password" required />
                            <button type="button" className="rg-ir"
                              onClick={() => setPasswordVisible(v => !v)}
                              aria-label={passwordVisible ? 'Hide password' : 'Show password'}>
                              {passwordVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                        </div>

                        <div className="rg-field">
                          <label className="rg-label" htmlFor="confirmPassword">Confirm password</label>
                          <div className="rg-wrap">
                            <span className="rg-il" aria-hidden="true"><Lock size={15} /></span>
                            <input className="rg-input il ir" id="confirmPassword" name="confirmPassword"
                              type={confirmVisible ? 'text' : 'password'}
                              placeholder="Repeat password"
                              value={formData.confirmPassword} onChange={handleInputChange}
                              autoComplete="new-password" required />
                            <button type="button" className="rg-ir"
                              onClick={() => setConfirmVisible(v => !v)}
                              aria-label={confirmVisible ? 'Hide' : 'Show'}>
                              {confirmVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                        </div>

                        <div className="rg-rules" role="status" aria-live="polite">
                          <PwRule pass={passwordRules.min}    label="8+ characters" />
                          <PwRule pass={passwordRules.upper}  label="One uppercase" />
                          <PwRule pass={passwordRules.number} label="One number" />
                        </div>
                      </div>
                    )}

                    {/* STEP 1 — PERSONAL */}
                    {currentStep === 1 && (
                      <div className="rg-grid">
                        <div className="rg-field">
                          <label className="rg-label" htmlFor="firstName">First name</label>
                          <input className="rg-input" id="firstName" name="firstName" type="text"
                            placeholder="e.g. Amara"
                            value={formData.firstName} onChange={handleInputChange}
                            autoComplete="given-name" required />
                        </div>
                        <div className="rg-field">
                          <label className="rg-label" htmlFor="lastName">Last name</label>
                          <input className="rg-input" id="lastName" name="lastName" type="text"
                            placeholder="e.g. Odhiambo"
                            value={formData.lastName} onChange={handleInputChange}
                            autoComplete="family-name" required />
                        </div>
                        <div className="rg-field">
                          <label className="rg-label" htmlFor="phone">Phone number</label>
                          <input className="rg-input" id="phone" name="phone" type="tel"
                            placeholder="07XX XXX XXX"
                            value={formData.phone} onChange={handleInputChange}
                            autoComplete="tel" required />
                        </div>
                        <div className="rg-field">
                          <label className="rg-label" htmlFor="gender">Gender</label>
                          <select className="rg-input" id="gender" name="gender"
                            value={formData.gender} onChange={handleInputChange} required>
                            <option value="" disabled>Select gender</option>
                            <option value="M">Male</option>
                            <option value="F">Female</option>
                            <option value="O">Other</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* STEP 2 — ACADEMIC */}
                    {currentStep === 2 && (
                      <div className="rg-grid rg-grid1">
                        <div className="rg-field">
                          <label className="rg-label" htmlFor="registrationNumber">Registration number</label>
                          <input className="rg-input" id="registrationNumber" name="registrationNumber" type="text"
                            placeholder="e.g. SCT-214-0012/2022"
                            value={formData.registrationNumber} onChange={handleInputChange} required />
                        </div>

                        <div className="rg-field">
                          <label className="rg-label" htmlFor="instSearch">Institution</label>

                          {selectedInstitution ? (
                            <div className="rg-inst-linked">
                              <div className="rg-inst-info">
                                <div className="rg-inst-icon"><GraduationCap size={17} /></div>
                                <div>
                                  <div className="rg-inst-name">{selectedInstitution.name}</div>
                                  <div className="rg-inst-meta">✓ Linked successfully</div>
                                </div>
                              </div>
                              <button type="button" className="rg-change-btn" onClick={resetInstitution}>Change</button>
                            </div>

                          ) : institutionSkipped ? (
                            <div className="rg-inst-skip-state">
                              <span className="rg-skip-note">You can verify your institution later.</span>
                              <button type="button" className="rg-change-btn" onClick={resetInstitution}>Search again</button>
                            </div>

                          ) : (
                            <div className="rg-inst-rel">
                              <div className="rg-wrap">
                                <span className="rg-il" aria-hidden="true"><Search size={15} /></span>
                                <input className="rg-input il" id="instSearch" type="text"
                                  placeholder="Search your university or college"
                                  value={institutionQuery}
                                  onChange={e => handleInstitutionSearch(e.target.value)}
                                  autoComplete="off"
                                  aria-autocomplete="list"
                                  aria-expanded={availableInstitutions.length > 0}
                                  aria-controls="inst-listbox" />
                              </div>

                              {availableInstitutions.length > 0 && !isSearchingInstitutions && (
                                <div className="rg-dropdown" id="inst-listbox" role="listbox">
                                  {availableInstitutions.map(inst => (
                                    <button key={inst.id} type="button" className="rg-dd-btn"
                                      role="option" aria-selected="false"
                                      onClick={() => selectInstitution(inst)}>
                                      {inst.name}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {institutionQuery.length >= 2 && availableInstitutions.length === 0 && !isSearchingInstitutions && (
                                <p className="rg-no-result">No results for "{institutionQuery}"</p>
                              )}

                              <button type="button" className="rg-cant-find" onClick={handleSkipInstitution}>
                                Can't find my institution →
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Navigation */}
                    <div className="rg-nav">
                      {currentStep > 0 && (
                        <button type="button" className="rg-back" onClick={prevStep} disabled={isSubmitting}>
                          <ArrowLeft size={14} /> Back
                        </button>
                      )}
                      {currentStep < 2 ? (
                        <button type="button" className="rg-next" onClick={nextStep}>
                          Continue <ArrowRight size={15} />
                        </button>
                      ) : (
                        <button type="submit" className="rg-next" disabled={isSubmitting}>
                          {isSubmitting
                            ? <><div className="rg-spinner" /> Creating account…</>
                            : <>Create account <ArrowRight size={15} /></>}
                        </button>
                      )}
                    </div>

                  </form>

                </>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="rg-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-heading"
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="rg-modal">
            {interestStatus === 'success' ? (
              <div className="rg-modal-ok">
                <div className="rg-modal-ok-icon"><CheckCircle size={24} /></div>
                <p className="rg-modal-ok-title">Got it — thank you!</p>
                <p className="rg-modal-ok-sub">We'll prioritise adding your institution soon.</p>
              </div>
            ) : (
              <>
                <div className="rg-modal-top">
                  <h3 className="rg-modal-title" id="modal-heading">Suggest your institution</h3>
                  <button type="button" className="rg-modal-close" onClick={closeModal} aria-label="Close dialog">
                    <X size={17} />
                  </button>
                </div>
                <p className="rg-modal-desc">
                  Tell us your institution's name and we'll prioritise adding it.
                  You can still complete registration now.
                </p>
                <input ref={modalInputRef}
                  className={`rg-modal-input${interestStatus === 'error' ? ' has-err' : ''}`}
                  type="text" placeholder="Institution name"
                  value={modalInstName}
                  onChange={e => { setModalInstName(e.target.value); if (interestStatus === 'error') setInterestStatus('idle'); }}
                  disabled={isSubmittingInterest}
                  aria-label="Institution name" />
                {interestStatus === 'error' && (
                  <p className="rg-modal-err">Something went wrong — please try again.</p>
                )}
                <div className="rg-modal-actions">
                  <button type="button" className="rg-modal-skip" onClick={closeModal} disabled={isSubmittingInterest}>Skip</button>
                  <button type="button" className="rg-modal-submit"
                    onClick={handleInterestSubmit}
                    disabled={isSubmittingInterest || !modalInstName.trim()}>
                    {isSubmittingInterest ? 'Submitting…' : 'Submit'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Register;