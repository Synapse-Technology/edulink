import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  MessageCircle,
  RotateCcw,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';
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
      'EduLink KE helps students, institutions, employers, and supervisors manage internship and attachment workflows in one place. It supports verified opportunities, applications, digital logbooks, supervision, incidents, reports, and completion records.',
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
      'Students can build a profile, claim institution affiliation, browse verified opportunities, apply, track application status, submit logbook evidence, report incidents, and receive verified completion records after approval.',
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
      'Employers can request onboarding, publish internship opportunities, review applicants, manage interns, assign supervisors, review logbooks, resolve incidents, and build a verified junior talent pipeline.',
    links: [
      { label: 'Employer Portal', href: '/employer/login' },
      { label: 'Employer Onboarding', href: '/employer/onboarding' },
    ],
  },
  {
    id: 'institutions',
    title: 'Institution Flow',
    keywords: ['institution', 'university', 'college', 'department', 'cohort', 'verify student', 'attachment'],
    response:
      'Institutions can verify students, manage departments and cohorts, monitor placements, assign assessors, review logbooks, track incidents, and generate placement reports. This helps reduce spreadsheet-driven attachment supervision.',
    links: [
      { label: 'Institution Portal', href: '/institution/login' },
      { label: 'Request Access', href: '/institution/request' },
    ],
  },
  {
    id: 'trust',
    title: 'Trust And Verification',
    keywords: ['trust', 'verification', 'verified', 'credibility', 'certificate', 'ledger', 'audit'],
    response:
      'EduLink uses trust signals such as verified student affiliation, verified employer and institution profiles, reviewed logbook evidence, incident records, audit logs, and digital completion artifacts. The goal is to make internship records more credible than self-claimed experience.',
    links: [{ label: 'Trust Policy', href: '/trust-policy' }],
  },
  {
    id: 'success-stories',
    title: 'Success Stories',
    keywords: ['success stories', 'story', 'career growth', 'placement', 'graduate'],
    response:
      'Success stories show verified student internship and attachment outcomes. They highlight how students move from placement to supervised work, feedback, and credible experience.',
    links: [{ label: 'Success Stories', href: '/success-stories' }],
  },
  {
    id: 'support',
    title: 'Support',
    keywords: ['support', 'help', 'ticket', 'contact', 'issue', 'problem'],
    response:
      'For account, placement, or technical issues, submit a support ticket so the EduLink team can follow up properly. Edi can explain workflows, but formal issues should go through the support center.',
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
      'Demo access is available from the student, employer, and institution login pages. Use the demo panel there to fill safe test accounts without exposing operational details inside chat.',
    links: [
      { label: 'Student Demo', href: '/login' },
      { label: 'Employer Demo', href: '/employer/login' },
      { label: 'Institution Demo', href: '/institution/login' },
    ],
  },
  {
    id: 'audience',
    title: 'Who EduLink Serves',
    keywords: ['government', 'startup', 'employers', 'who is it for', 'users', 'stakeholders'],
    response:
      'EduLink serves students seeking career transition, institutions managing attachment quality, employers seeking verified junior talent, supervisors reviewing progress, and ecosystem partners that need clearer placement data.',
  },
];

const starterPrompts = [
  'What does EduLink do?',
  'How does the student flow work?',
  'How does EduLink help employers?',
  'What makes records verified?',
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
    prompts: ['How does the logbook work?', 'How do completion records become trusted?'],
  },
];

const normalize = (value: string) =>
  value.toLowerCase().replace(/\s+/g, ' ').trim();

const isBlocked = (query: string) => {
  const normalized = normalize(query);
  return blockedKeywords.some(keyword => normalized.includes(keyword));
};

const scoreEntry = (query: string, entry: KnowledgeEntry) => {
  const normalized = normalize(query);

  return entry.keywords.reduce((score, keyword) => {
    const normalizedKeyword = normalize(keyword);

    if (normalized.includes(normalizedKeyword)) {
      return score + normalizedKeyword.length + 8;
    }

    return (
      score +
      normalizedKeyword
        .split(' ')
        .filter(part => part.length > 2 && normalized.includes(part)).length
    );
  }, 0);
};

const getEdiResponse = (query: string): KnowledgeEntry => {
  if (isBlocked(query)) {
    return {
      id: 'security-refusal',
      title: 'Security Boundary',
      keywords: [],
      response:
        'I cannot share passwords, secrets, backend internals, exploit guidance, production configuration, or source-code details. I can safely explain EduLink workflows, public features, demo navigation, and support options.',
      links: [{ label: 'Support Center', href: '/support' }],
    };
  }

  const [bestEntry, bestScore] = knowledgeBase.reduce<[KnowledgeEntry, number]>(
    ([currentEntry, currentScore], entry) => {
      const score = scoreEntry(query, entry);
      return score > currentScore ? [entry, score] : [currentEntry, currentScore];
    },
    [knowledgeBase[0], 0],
  );

  if (bestScore < 2) {
    return {
      id: 'fallback',
      title: 'EduLink Scope',
      keywords: [],
      response:
        'I may not have enough context for that. I can help with EduLink workflows, internships, attachments, verified talent, students, institutions, employers, supervisors, success stories, support, and demo navigation.',
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
      ? ` I can explain EduLink from your ${role.replace('_', ' ')} view.`
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

    return getGreeting({
      firstName,
      role,
      isAuthenticated,
    });
  }, [admin?.firstName, admin?.role, isAuthenticated, user?.firstName, user?.role]);

  const activePrompts = getPromptsForPath(location.pathname);

  const [messages, setMessages] = useState<EdiMessage[]>([
    {
      id: 1,
      sender: 'edi',
      text: initialMessage,
    },
  ]);

  const hiddenOnRoute =
    location.pathname.startsWith('/verify/') ||
    location.pathname.startsWith('/admin/login') ||
    location.pathname.startsWith('/dashboard/admin');

  useEffect(() => {
    setMessages(prev => {
      if (prev.length !== 1 || prev[0].sender !== 'edi') return prev;
      return [{ ...prev[0], text: initialMessage }];
    });
  }, [initialMessage]);

  useEffect(() => {
    if (hiddenOnRoute) return;
    if (window.sessionStorage.getItem('edi_intro_nudged') === 'true') return;

    const timer = window.setTimeout(() => {
      window.sessionStorage.setItem('edi_intro_nudged', 'true');
      setHasUnreadIntro(true);
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [hiddenOnRoute]);

  useEffect(() => {
    if (!isOpen) return;

    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }, [isOpen, isTyping, messages]);

  useEffect(() => {
    if (isOpen) setHasUnreadIntro(false);
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        window.clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  if (hiddenOnRoute) return null;

  const resetConversation = () => {
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);

    setMessages([
      {
        id: Date.now(),
        sender: 'edi',
        text: initialMessage,
      },
    ]);

    setActiveLinks([]);
    setInput('');
    setIsTyping(false);
  };

  const sendMessage = (text: string) => {
    const trimmed = text.trim();

    if (!trimmed || isTyping) return;

    const answer = getEdiResponse(trimmed);

    setMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        sender: 'user',
        text: trimmed,
      },
    ]);

    setActiveLinks([]);
    setIsTyping(true);
    setInput('');

    const responseDelay = Math.min(
      1200,
      Math.max(520, answer.response.length * 6),
    );

    typingTimerRef.current = window.setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'edi',
          text: answer.response,
        },
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
          className="edi-chatbot-panel"
          aria-label="Edi EduLink assistant"
        >
          <header className="edi-chatbot-header">
            <div className="edi-avatar">
              <Bot size={20} />
            </div>

            <div className="edi-heading">
              <div className="edi-title">
                Edi
                <span className="edi-live-dot" aria-hidden="true" />
              </div>
              <div className="edi-subtitle">EduLink guidance assistant</div>
            </div>

            <button
              type="button"
              className="edi-icon-button edi-reset"
              onClick={resetConversation}
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
            <span>
              Edi gives product guidance only and cannot access private account data.
            </span>
          </div>

          <div className="edi-messages" role="log" aria-live="polite">
            {messages.map(message => (
              <div
                key={message.id}
                className={`edi-message ${
                  message.sender === 'edi'
                    ? 'edi-message-bot'
                    : 'edi-message-user'
                }`}
              >
                {message.text}
              </div>
            ))}

            {isTyping && (
              <div
                className="edi-message edi-message-bot edi-typing"
                aria-label="Edi is typing"
              >
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
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          <div className="edi-prompts">
            {activePrompts.map(prompt => (
              <button
                key={prompt}
                type="button"
                onClick={() => sendMessage(prompt)}
                disabled={isTyping}
              >
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

            <button
              type="submit"
              aria-label="Send message"
              disabled={isTyping || !input.trim()}
            >
              <Send size={16} />
            </button>
          </form>
        </aside>
      )}

      <button
        type="button"
        className="edi-launcher"
        onClick={() => setIsOpen(prev => !prev)}
        aria-label={isOpen ? 'Close Edi assistant' : 'Open Edi assistant'}
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={23} />}
        <span>Edi</span>
        {!isOpen && hasUnreadIntro && (
          <span className="edi-unread-dot" aria-hidden="true" />
        )}
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
          background: #069b8e;
          color: #fff;
          min-width: 82px;
          height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 800;
          box-shadow: 0 14px 34px rgba(6, 155, 142, 0.25);
          transition: transform 0.18s ease, background 0.18s ease;
        }

        .edi-launcher:hover {
          transform: translateY(-2px);
          background: #057e73;
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
          border-radius: 18px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: ediFloatIn 0.22s ease-out;
          box-shadow: 0 24px 70px rgba(17, 24, 39, 0.2);
        }

        .edi-chatbot-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
          background: #071a18;
          color: #fff;
        }

        .edi-avatar {
          width: 38px;
          height: 38px;
          border-radius: 13px;
          background: rgba(11, 191, 163, 0.14);
          color: #0bbfa3;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .edi-heading {
          min-width: 0;
          flex: 1;
        }

        .edi-title {
          font-size: 15px;
          font-weight: 900;
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
          color: rgba(255, 255, 255, 0.66);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .edi-icon-button {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          cursor: pointer;
        }

        .edi-icon-button:hover {
          background: rgba(255, 255, 255, 0.14);
        }

        .edi-safety-note {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 10px 14px;
          background: #f0fdf9;
          color: #047857;
          font-size: 12px;
          line-height: 1.45;
          border-bottom: 1px solid #d1fae5;
        }

        .edi-safety-note svg {
          flex-shrink: 0;
          margin-top: 1px;
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
          line-height: 1.5;
          white-space: pre-wrap;
        }

        .edi-message-bot {
          align-self: flex-start;
          background: #f1f5f9;
          color: #1f2937;
          border-bottom-left-radius: 4px;
        }

        .edi-message-user {
          align-self: flex-end;
          background: #069b8e;
          color: #fff;
          border-bottom-right-radius: 4px;
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
          background: #069b8e;
          animation: ediTyping 1s infinite;
        }

        .edi-typing span:nth-child(2) {
          animation-delay: 0.15s;
        }

        .edi-typing span:nth-child(3) {
          animation-delay: 0.3s;
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
          color: #069b8e;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 800;
          text-decoration: none;
        }

        .edi-links a:hover,
        .edi-prompts button:hover:not(:disabled) {
          border-color: rgba(6, 155, 142, 0.4);
          background: rgba(6, 155, 142, 0.06);
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
          cursor: pointer;
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
          border-color: #069b8e;
          box-shadow: 0 0 0 3px rgba(6, 155, 142, 0.14);
        }

        .edi-input-row button {
          width: 40px;
          height: 40px;
          border-radius: 999px;
          border: 0;
          background: #069b8e;
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          cursor: pointer;
        }

        .edi-input-row button:hover:not(:disabled) {
          background: #057e73;
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
            min-width: 48px;
            width: 48px;
            height: 48px;
          }

          .edi-launcher span:not(.edi-unread-dot) {
            display: none;
          }

          .edi-chatbot-panel {
            right: 14px;
            bottom: 74px;
            width: calc(100vw - 28px);
            max-height: calc(100vh - 96px);
          }
        }
      `}</style>
    </>
  );
};

export default EdiChatbot;