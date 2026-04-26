import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, MessageCircle, RotateCcw, Send, ShieldCheck, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

type EdiMessage = {
  id: number;
  sender: 'edi' | 'user';
  text: string;
};

type KnowledgeEntry = {
  id: string;
  title: string;
  keywords: string[];
  response: string;
  links?: Array<{ label: string; href: string }>;
};

const blockedKeywords = [
  'password',
  'secret',
  'token',
  'database url',
  'env',
  'api key',
  'exploit',
  'hack',
  'bypass',
  'admin password',
  'source code',
  'sql injection',
  'production credentials',
];

const knowledgeBase: KnowledgeEntry[] = [
  {
    id: 'overview',
    title: 'What EduLink Does',
    keywords: ['what is edulink', 'overview', 'about', 'purpose', 'platform', 'mission'],
    response:
      'EduLink streamlines the internship and attachment process by connecting verified students, institutions, employers, and supervisors in one workflow. It helps students find trusted placements, institutions monitor academic progress, employers access verified talent, and all parties keep evidence through logbooks, reviews, reports, and certificates.',
    links: [
      { label: 'About EduLink', href: '/about' },
      { label: 'Why EduLink', href: '/why-us' },
    ],
  },
  {
    id: 'students',
    title: 'Student Flow',
    keywords: ['student', 'students', 'apply', 'application', 'internship search', 'logbook', 'certificate', 'cv'],
    response:
      'Students use EduLink to build a profile, claim institution affiliation, browse verified opportunities, apply, track application status, submit weekly logbook evidence, report incidents, receive feedback, and earn verified completion artifacts when an internship is completed and certified.',
    links: [
      { label: 'Browse Opportunities', href: '/opportunities' },
      { label: 'Student Login', href: '/login' },
    ],
  },
  {
    id: 'employers',
    title: 'Employer Flow',
    keywords: ['employer', 'company', 'startup', 'talent pool', 'hire', 'candidate', 'supervisor'],
    response:
      'Employers use EduLink to request onboarding, publish internship opportunities, review applicants, manage interns, assign supervisors, review evidence, resolve incidents, and build a verified talent pipeline from institutions. This helps startups, companies, and public-sector partners reduce manual screening and find internship-ready students.',
    links: [
      { label: 'Employer Portal', href: '/employer/login' },
      { label: 'Register Organization', href: '/employer/onboarding' },
    ],
  },
  {
    id: 'institutions',
    title: 'Institution Flow',
    keywords: ['institution', 'university', 'college', 'department', 'cohort', 'verify student', 'attachment'],
    response:
      'Institutions use EduLink to verify student affiliation, maintain departments and cohorts, monitor internship applications, oversee active placements, review logbooks and incidents, and generate placement reports. The goal is to make attachment supervision traceable instead of spreadsheet-driven.',
    links: [
      { label: 'Institution Portal', href: '/institution/login' },
      { label: 'Request Institution Access', href: '/institution/request' },
    ],
  },
  {
    id: 'trust',
    title: 'Trust And Verification',
    keywords: ['trust', 'verification', 'verified', 'credibility', 'certificate', 'on chain', 'ledger', 'audit'],
    response:
      'EduLink is built around trust signals: verified student affiliation, verified employer and institution profiles, reviewed logbook evidence, incident records, audit logs, and digital completion artifacts. These records help employers and institutions make decisions from verified activity instead of self-claimed experience alone.',
    links: [{ label: 'Verify Artifact', href: '/verify/demo' }],
  },
  {
    id: 'success-stories',
    title: 'Success Stories',
    keywords: ['success stories', 'story', 'career growth', 'placement', 'graduate'],
    response:
      'Success stories show outcomes from completed internships. They are intended to demonstrate career transition: a student starts with a verified placement, completes supervised work, receives feedback, and can present credible evidence of readiness to future employers.',
    links: [{ label: 'Success Stories', href: '/success-stories' }],
  },
  {
    id: 'support',
    title: 'Support',
    keywords: ['support', 'help', 'ticket', 'contact', 'issue', 'problem'],
    response:
      'For account, placement, or technical issues, users can submit a support request and track ticket progress. Edi can explain EduLink flows, but formal support requests should go through the support center so the team can follow up properly.',
    links: [
      { label: 'Support Center', href: '/support' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    id: 'demo',
    title: 'Demo Walkthrough',
    keywords: ['demo', 'walkthrough', 'test account', 'login credential', 'credentials', 'presentation'],
    response:
      'For a live walkthrough, use the Demo access panel on each login page. It can fill the relevant student, employer, institution, or admin account without Edi exposing sensitive operational details inside chat.',
    links: [
      { label: 'Student Demo', href: '/login' },
      { label: 'Employer Demo', href: '/employer/login' },
      { label: 'Institution Demo', href: '/institution/login' },
      { label: 'Admin Demo', href: '/admin/login' },
    ],
  },
  {
    id: 'audience',
    title: 'Who EduLink Serves',
    keywords: ['government', 'startup', 'employers', 'who is it for', 'users', 'stakeholders'],
    response:
      'EduLink serves students seeking career transition, institutions managing attachment quality, employers and startups seeking verified junior talent, supervisors reviewing progress, and government or ecosystem partners that need clearer placement data and employability signals.',
  },
];

const starterPrompts = [
  'What does EduLink do?',
  'How does the student flow work?',
  'How does EduLink help employers?',
  'What makes the talent pool verified?',
];

const routePrompts: Array<{ test: (path: string) => boolean; prompts: string[] }> = [
  {
    test: path => path.startsWith('/opportunities'),
    prompts: ['How do applications work?', 'What makes employers verified?', 'How does matching help students?'],
  },
  {
    test: path => path.startsWith('/success-stories'),
    prompts: ['What are success stories?', 'How does EduLink support career transition?'],
  },
  {
    test: path => path.startsWith('/support'),
    prompts: ['How do support tickets work?', 'What issues should I report?'],
  },
  {
    test: path => path.startsWith('/employer'),
    prompts: ['How does EduLink help employers?', 'What is the verified talent pool?'],
  },
  {
    test: path => path.startsWith('/institution'),
    prompts: ['How do institutions monitor attachments?', 'How does student verification work?'],
  },
  {
    test: path => path.startsWith('/dashboard/student'),
    prompts: ['How does the logbook work?', 'How do certificates become trusted?'],
  },
];

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();

const isBlocked = (query: string) => {
  const normalized = normalize(query);
  return blockedKeywords.some(keyword => normalized.includes(keyword));
};

const scoreEntry = (query: string, entry: KnowledgeEntry) => {
  const normalized = normalize(query);
  return entry.keywords.reduce((score, keyword) => {
    const normalizedKeyword = normalize(keyword);
    if (normalized.includes(normalizedKeyword)) return score + normalizedKeyword.length + 8;
    return normalizedKeyword
      .split(' ')
      .filter(part => part.length > 2 && normalized.includes(part)).length + score;
  }, 0);
};

const getEdiResponse = (query: string): KnowledgeEntry => {
  if (isBlocked(query)) {
    return {
      id: 'security-refusal',
      title: 'Security Boundary',
      keywords: [],
      response:
        'I cannot share passwords, secrets, backend internals, exploit guidance, or production configuration. I can explain EduLink workflows, public features, demo navigation, and the value proposition safely.',
      links: [{ label: 'Support Center', href: '/support' }],
    };
  }

  const [bestEntry, bestScore] = knowledgeBase.reduce<[KnowledgeEntry, number]>(
    ([currentEntry, currentScore], entry) => {
      const score = scoreEntry(query, entry);
      return score > currentScore ? [entry, score] : [currentEntry, currentScore];
    },
    [knowledgeBase[0], 0]
  );

  if (bestScore < 2) {
    return {
      id: 'fallback',
      title: 'EduLink Scope',
      keywords: [],
      response:
        'I am focused on EduLink. Ask me about internships, attachment workflows, verified talent, students, institutions, employers, supervisors, success stories, support, or the demo walkthrough.',
      links: [
        { label: 'Opportunities', href: '/opportunities' },
        { label: 'Support', href: '/support' },
      ],
    };
  }

  return bestEntry;
};

const getGreeting = ({
  firstName,
  role,
  isAuthenticated,
}: {
  firstName?: string;
  role?: string;
  isAuthenticated: boolean;
}) => {
  const greeting = firstName ? `Hi ${firstName}, I am Edi.` : 'Hi, I am Edi.';
  const roleHint =
    isAuthenticated && role
      ? ` I can help you understand EduLink from your ${role.replace('_', ' ')} view.`
      : ' I can explain how EduLink works for students, institutions, employers, and demo visitors.';
  return `${greeting}${roleHint}`;
};

const getPromptsForPath = (path: string) => {
  const routeMatch = routePrompts.find(entry => entry.test(path));
  return routeMatch ? routeMatch.prompts : starterPrompts;
};

const EdiChatbot: React.FC = () => {
  const location = useLocation();
  const { user, admin, isAuthenticated } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasUnreadIntro, setHasUnreadIntro] = useState(false);
  const [activeLinks, setActiveLinks] = useState<KnowledgeEntry['links']>([]);
  const typingTimerRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const initialMessage = useMemo(() => {
    const firstName = user?.firstName || admin?.firstName;
    const role = user?.role || admin?.role;
    return getGreeting({ firstName, role, isAuthenticated });
  }, [admin?.firstName, admin?.role, isAuthenticated, user?.firstName, user?.role]);
  const activePrompts = getPromptsForPath(location.pathname);

  const [messages, setMessages] = useState<EdiMessage[]>([
    {
      id: 1,
      sender: 'edi',
      text: initialMessage,
    },
  ]);

  const hiddenOnRoute = location.pathname.startsWith('/verify/');

  useEffect(() => {
    setMessages(prev => {
      if (prev.length !== 1 || prev[0].sender !== 'edi') return prev;
      return [{ ...prev[0], text: initialMessage }];
    });
  }, [initialMessage]);

  useEffect(() => {
    if (hiddenOnRoute) return;
    if (window.sessionStorage.getItem('edi_auto_opened') === 'true') return;

    const timer = window.setTimeout(() => {
      window.sessionStorage.setItem('edi_auto_opened', 'true');
      setIsOpen(true);
      setHasUnreadIntro(false);
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [hiddenOnRoute]);

  useEffect(() => {
    if (!isOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [isOpen, isTyping, messages]);

  useEffect(() => {
    if (isOpen) setHasUnreadIntro(false);
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    };
  }, []);

  if (hiddenOnRoute) return null;

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const answer = getEdiResponse(trimmed);
    setMessages(prev => [
      ...prev,
      { id: Date.now(), sender: 'user', text: trimmed },
    ]);
    setActiveLinks([]);
    setIsTyping(true);
    setInput('');

    const responseDelay = Math.min(1400, Math.max(650, answer.response.length * 8));
    typingTimerRef.current = window.setTimeout(() => {
      setMessages(prev => [
        ...prev,
        { id: Date.now() + 1, sender: 'edi', text: answer.response },
      ]);
      setActiveLinks(answer.links ?? []);
      setIsTyping(false);
      if (!isOpen) setHasUnreadIntro(true);
    }, responseDelay);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {isOpen && (
        <aside
          className="edi-chatbot-panel shadow-lg"
          aria-label="Edi EduLink assistant"
        >
          <header className="edi-chatbot-header">
            <div className="edi-avatar">
              <Bot size={20} />
            </div>
            <div>
              <div className="edi-title">
                Edi <span className="edi-live-dot" aria-hidden="true" />
              </div>
              <div className="edi-subtitle">Live EduLink assistant</div>
            </div>
            <button
              type="button"
              className="edi-icon-button ms-auto"
              onClick={() => {
                if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
                setMessages([{ id: Date.now(), sender: 'edi', text: initialMessage }]);
                setActiveLinks([]);
                setInput('');
                setIsTyping(false);
              }}
              aria-label="Reset Edi conversation"
              title="Reset conversation"
            >
              <RotateCcw size={16} />
            </button>
            <button
              type="button"
              className="edi-icon-button"
              onClick={() => setIsOpen(false)}
              aria-label="Close Edi assistant"
            >
              <X size={18} />
            </button>
          </header>

          <div className="edi-safety-note">
            <ShieldCheck size={15} />
            <span>Answers are limited to EduLink product and demo guidance.</span>
          </div>

          <div className="edi-messages" role="log" aria-live="polite">
            {messages.map(message => (
              <div
                key={message.id}
                className={`edi-message ${message.sender === 'edi' ? 'edi-message-bot' : 'edi-message-user'}`}
              >
                {message.text}
              </div>
            ))}
            {isTyping && (
              <div className="edi-message edi-message-bot edi-typing" aria-label="Edi is typing">
                <span />
                <span />
                <span />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {activeLinks && activeLinks.length > 0 && (
            <div className="edi-links">
              {activeLinks.map(link => (
                <Link key={link.href} to={link.href} onClick={() => setIsOpen(false)}>
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          <div className="edi-prompts">
            {activePrompts.map(prompt => (
              <button key={prompt} type="button" onClick={() => sendMessage(prompt)} disabled={isTyping}>
                {prompt}
              </button>
            ))}
          </div>

          <form className="edi-input-row" onSubmit={handleSubmit}>
            <input
              value={input}
              onChange={event => setInput(event.target.value)}
              placeholder={isTyping ? 'Edi is typing...' : 'Ask about EduLink...'}
              aria-label="Ask Edi about EduLink"
              disabled={isTyping}
            />
            <button type="submit" aria-label="Send message" disabled={isTyping || !input.trim()}>
              <Send size={16} />
            </button>
          </form>
        </aside>
      )}

      <button
        type="button"
        className="edi-launcher shadow"
        onClick={() => setIsOpen(prev => !prev)}
        aria-label={isOpen ? 'Close Edi assistant' : 'Open Edi assistant'}
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={23} />}
        <span>Edi</span>
        {!isOpen && hasUnreadIntro && <span className="edi-unread-dot" aria-hidden="true" />}
      </button>

      <style>{`
        @keyframes ediPulse {
          0% { transform: scale(1); opacity: 1; }
          70% { transform: scale(1.9); opacity: 0; }
          100% { transform: scale(1.9); opacity: 0; }
        }

        @keyframes ediFloatIn {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes ediTyping {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
          40% { transform: translateY(-4px); opacity: 1; }
        }

        .edi-launcher {
          position: fixed;
          right: 22px;
          bottom: 22px;
          z-index: 1050;
          border: 0;
          border-radius: 999px;
          background: #0f766e;
          color: #fff;
          min-width: 84px;
          height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 700;
          letter-spacing: 0;
          transition: transform 0.18s ease, background 0.18s ease;
        }

        .edi-launcher:hover {
          transform: translateY(-2px);
          background: #0d5f58;
        }

        .edi-unread-dot {
          position: absolute;
          right: 6px;
          top: 5px;
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: #fbbf24;
          border: 2px solid #fff;
        }

        .edi-chatbot-panel {
          position: fixed;
          right: 22px;
          bottom: 84px;
          z-index: 1050;
          width: min(390px, calc(100vw - 28px));
          max-height: min(680px, calc(100vh - 112px));
          background: #ffffff;
          border: 1px solid #dbe5e3;
          border-radius: 14px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: ediFloatIn 0.22s ease-out;
        }

        .edi-chatbot-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
          background: #0f2f2c;
          color: #fff;
        }

        .edi-avatar {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          background: rgba(20, 184, 166, 0.2);
          color: #99f6e4;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .edi-title {
          font-size: 15px;
          font-weight: 800;
          line-height: 1.1;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .edi-live-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #34d399;
          position: relative;
          display: inline-block;
        }

        .edi-live-dot::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: #34d399;
          animation: ediPulse 1.6s ease-out infinite;
        }

        .edi-subtitle {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.72);
        }

        .edi-icon-button {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .edi-safety-note {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: #ecfdf5;
          color: #047857;
          font-size: 12px;
          border-bottom: 1px solid #d1fae5;
        }

        .edi-messages {
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          overflow-y: auto;
          min-height: 220px;
        }

        .edi-message {
          max-width: 86%;
          border-radius: 14px;
          padding: 10px 12px;
          font-size: 13px;
          line-height: 1.48;
          white-space: pre-wrap;
        }

        .edi-message-bot {
          align-self: flex-start;
          background: #f1f5f9;
          color: #1f2937;
          border-bottom-left-radius: 4px;
        }

        .edi-typing {
          display: inline-flex;
          gap: 5px;
          align-items: center;
          min-width: 58px;
        }

        .edi-typing span {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: #0f766e;
          animation: ediTyping 1s infinite;
        }

        .edi-typing span:nth-child(2) {
          animation-delay: 0.15s;
        }

        .edi-typing span:nth-child(3) {
          animation-delay: 0.3s;
        }

        .edi-message-user {
          align-self: flex-end;
          background: #0f766e;
          color: #fff;
          border-bottom-right-radius: 4px;
        }

        .edi-links {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 0 14px 10px;
        }

        .edi-links a,
        .edi-prompts button {
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #0f766e;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
        }

        .edi-prompts {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 0 14px 12px;
        }

        .edi-prompts button {
          white-space: nowrap;
          flex: 0 0 auto;
        }

        .edi-prompts button:disabled {
          opacity: 0.55;
          cursor: wait;
        }

        .edi-input-row {
          display: flex;
          gap: 8px;
          padding: 12px;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .edi-input-row input {
          min-width: 0;
          flex: 1;
          border: 1px solid #cbd5e1;
          border-radius: 999px;
          padding: 10px 13px;
          font-size: 13px;
          outline: none;
        }

        .edi-input-row input:focus {
          border-color: #0f766e;
          box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.14);
        }

        .edi-input-row button {
          width: 40px;
          height: 40px;
          border-radius: 999px;
          border: 0;
          background: #0f766e;
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .edi-input-row button:disabled,
        .edi-input-row input:disabled {
          opacity: 0.62;
          cursor: wait;
        }

        @media (max-width: 576px) {
          .edi-launcher {
            right: 14px;
            bottom: 14px;
          }

          .edi-chatbot-panel {
            right: 14px;
            bottom: 74px;
          }
        }
      `}</style>
    </>
  );
};

export default EdiChatbot;
