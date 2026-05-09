import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Headphones,
  History,
  LifeBuoy,
  MessageSquare,
  Paperclip,
  ShieldCheck,
  TicketCheck,
  UserCircle,
} from 'lucide-react';

import { supportService } from '../services/support/supportService';
import type {
  TicketCategory,
  TicketPriority,
} from '../services/support/supportService';
import { useFeedbackModal } from '../hooks/useFeedbackModal';
import { FeedbackModal } from '../components/common';
import { useAuth } from '../contexts/AuthContext';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { showToast } from '../utils/toast';

type SupportMode = 'ticket' | 'feedback';

const faqGroups = [
  {
    label: 'Students',
    items: [
      {
        question: 'How do I build a strong profile to attract employers?',
        answer:
          'Complete your profile, add a clear bio, include your skills, education, projects, and upload relevant documents where required. A complete profile improves your credibility when applying.',
      },
      {
        question: 'How do digital logbooks and certifications work?',
        answer:
          'During your internship or attachment, you submit logbook entries digitally. Your supervisor or assessor reviews the entries. Once the workflow is completed and approved, your completion record can be certified.',
      },
    ],
  },
  {
    label: 'Employers',
    items: [
      {
        question: 'What are the requirements for posting an internship?',
        answer:
          'Employer accounts must be verified before opportunities go live. Listings should include role description, required skills, duration, location, and whether the position is paid or unpaid.',
      },
      {
        question: 'How do employers manage applicants?',
        answer:
          'Employer dashboards allow teams to review applicants, manage opportunities, supervise interns, validate tasks, and track internship progress.',
      },
    ],
  },
  {
    label: 'Institutions',
    items: [
      {
        question: "How can institutions monitor students' progress?",
        answer:
          'Institution dashboards provide visibility into applications, placements, logbooks, assessor reviews, completion records, reports, and student verification workflows.',
      },
      {
        question: 'How does EduLink KE verify employers?',
        answer:
          'EduLink uses profile checks, company information, review workflows, and platform-level moderation to reduce fraudulent or low-quality opportunities.',
      },
    ],
  },
];

const quickIssues = [
  {
    icon: <AlertCircle size={20} />,
    title: 'Technical issue',
    description: 'Login errors, broken pages, failed uploads, or dashboard bugs.',
    category: 'TECHNICAL' as TicketCategory,
    priority: 'MEDIUM' as TicketPriority,
  },
  {
    icon: <TicketCheck size={20} />,
    title: 'Placement support',
    description: 'Applications, internships, attachments, logbooks, and certificates.',
    category: 'INTERNSHIP' as TicketCategory,
    priority: 'MEDIUM' as TicketPriority,
  },
  {
    icon: <UserCircle size={20} />,
    title: 'Account help',
    description: 'Profile access, verification, affiliation, password, or role issues.',
    category: 'ACCOUNT' as TicketCategory,
    priority: 'LOW' as TicketPriority,
  },
  {
    icon: <ShieldCheck size={20} />,
    title: 'Affiliation query',
    description: 'Institution linking, student verification, or organization access.',
    category: 'AFFILIATION' as TicketCategory,
    priority: 'MEDIUM' as TicketPriority,
  },
];

const Support: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { feedbackProps, showSuccess } = useFeedbackModal();

  const { handleError: handleSupportError } = useErrorHandler({
    onValidationError: () => showToast.error('Please check your form entries.'),
    onAuthError: () => showToast.error('Session expired. Please log in again.'),
    onUnexpected: (error) =>
      showToast.error(error.message || 'Failed to create support ticket.'),
  });

  const { handleError: handleFeedbackError } = useErrorHandler({
    onValidationError: () => showToast.error('Please enter your feedback.'),
    onUnexpected: (error) =>
      showToast.error(error.message || 'Failed to submit feedback.'),
  });

  const [mode, setMode] = useState<SupportMode>('ticket');
  const [openFaq, setOpenFaq] = useState<string | null>('Students-0');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    category: 'OTHER' as TicketCategory,
    priority: 'LOW' as TicketPriority,
  });

  const [attachments, setAttachments] = useState<File[]>([]);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
      }));
    }
  }, [user]);

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  const applyIssuePreset = (
    category: TicketCategory,
    priority: TicketPriority,
    title: string,
  ) => {
    setMode('ticket');

    setFormData((prev) => ({
      ...prev,
      category,
      priority,
      subject: prev.subject || title,
    }));

    document.getElementById('support-form')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      const ticket = await supportService.createTicket({
        ...formData,
        attachments,
      });

      showSuccess(
        'Ticket Created Successfully',
        `Your ticket has been logged with tracking code: ${ticket.tracking_code}. You can track its status in your history.`,
      );

      setFormData({
        name: user ? `${user.firstName} ${user.lastName}`.trim() : '',
        email: user ? user.email : '',
        subject: '',
        message: '',
        category: 'OTHER',
        priority: 'LOW',
      });

      setAttachments([]);

      setTimeout(() => navigate('/support/history'), 3000);
    } catch (error) {
      await handleSupportError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!feedback.trim()) {
      showToast.error('Please enter your feedback first.');
      return;
    }

    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await supportService.submitFeedback({ message: feedback });
      showToast.success('Feedback submitted successfully.');
      setFeedback('');
    } catch (error) {
      await handleFeedbackError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <main className="support-page">
        <section className="support-hero">
          <div className="support-container">
            <div className="support-hero-grid">
              <div>
                <div className="support-badge">
                  <LifeBuoy size={15} />
                  EduLink Support Center
                </div>

                <h1>Get help with your EduLink workflow.</h1>

                <p>
                  Create a support ticket, track an existing request, or send
                  product feedback. Support is organized around real EduLink
                  workflows: accounts, placements, affiliation, logbooks,
                  verification, and dashboard access.
                </p>

                <div className="support-actions">
                  <a href="#support-form" className="support-primary-btn">
                    Create support ticket
                    <ArrowRight size={16} />
                  </a>

                  <Link to="/support/history" className="support-secondary-btn">
                    <History size={16} />
                    Track ticket history
                  </Link>
                </div>
              </div>

              <div className="support-status-card">
                <div className="support-status-top">
                  <div>
                    <span>Support workflow</span>
                    <strong>Ticket-based resolution</strong>
                  </div>
                  <TicketCheck size={24} />
                </div>

                <div className="support-status-list">
                  <div>
                    <CheckCircle2 size={16} />
                    <span>Submit issue details</span>
                  </div>
                  <div>
                    <Clock size={16} />
                    <span>Receive tracking code</span>
                  </div>
                  <div>
                    <FileText size={16} />
                    <span>Track status from history</span>
                  </div>
                </div>

                <p>
                  For urgent workflow blockers, choose a higher priority and
                  include screenshots where possible.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="support-quick section">
          <div className="support-container">
            <div className="support-section-head">
              <span>Common support areas</span>
              <h2>What do you need help with?</h2>
              <p>
                Choose a common issue to pre-fill the ticket category and help
                us route your request faster.
              </p>
            </div>

            <div className="support-issue-grid">
              {quickIssues.map((issue) => (
                <button
                  type="button"
                  className="support-issue-card"
                  key={issue.title}
                  onClick={() =>
                    applyIssuePreset(issue.category, issue.priority, issue.title)
                  }
                >
                  <div className="support-issue-icon">{issue.icon}</div>
                  <h3>{issue.title}</h3>
                  <p>{issue.description}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="support-faq section soft-bg">
          <div className="support-container">
            <div className="support-section-head">
              <span>Self-help</span>
              <h2>Frequently asked questions</h2>
              <p>
                Quick answers for students, employers, and institutions using
                EduLink KE.
              </p>
            </div>

            <div className="support-faq-grid">
              {faqGroups.map((group) => (
                <div className="support-faq-group" key={group.label}>
                  <h3>{group.label}</h3>

                  {group.items.map((item, index) => {
                    const key = `${group.label}-${index}`;
                    const isOpen = openFaq === key;

                    return (
                      <div className="support-faq-item" key={item.question}>
                        <button
                          type="button"
                          onClick={() => setOpenFaq(isOpen ? null : key)}
                          className={isOpen ? 'open' : ''}
                        >
                          {item.question}
                          <span>{isOpen ? '−' : '+'}</span>
                        </button>

                        {isOpen && <p>{item.answer}</p>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="support-form" className="support-contact section">
          <div className="support-container">
            <div className="support-form-layout">
              <aside className="support-form-side">
                <span>Need more help?</span>
                <h2>Create a support request</h2>
                <p>
                  Submit one clear ticket per issue. Include the affected page,
                  action, account, and any screenshots that can help reproduce
                  the problem.
                </p>

                <div className="support-help-list">
                  <div>
                    <Headphones size={17} />
                    <span>Ticket history is available after submission.</span>
                  </div>
                  <div>
                    <Paperclip size={17} />
                    <span>Attach screenshots or documents when relevant.</span>
                  </div>
                  <div>
                    <MessageSquare size={17} />
                    <span>Use feedback for product suggestions, not urgent issues.</span>
                  </div>
                </div>
              </aside>

              <div className="support-panel">
                <div className="support-mode-switch">
                  <button
                    type="button"
                    className={mode === 'ticket' ? 'active' : ''}
                    onClick={() => setMode('ticket')}
                  >
                    Contact Support
                  </button>

                  <button
                    type="button"
                    className={mode === 'feedback' ? 'active' : ''}
                    onClick={() => setMode('feedback')}
                  >
                    Give Feedback
                  </button>

                  <Link to="/support/history">
                    <History size={14} />
                    Ticket History
                  </Link>
                </div>

                {mode === 'ticket' ? (
                  <form onSubmit={handleSupportSubmit} className="support-form">
                    <div className="support-form-grid">
                      <div className="support-field">
                        <label>Your Name</label>
                        <input
                          type="text"
                          name="name"
                          placeholder="John Doe"
                          value={formData.name}
                          onChange={handleFormChange}
                          required
                        />
                      </div>

                      <div className="support-field">
                        <label>Email Address</label>
                        <input
                          type="email"
                          name="email"
                          placeholder="john@example.com"
                          value={formData.email}
                          onChange={handleFormChange}
                          required
                        />
                      </div>

                      <div className="support-field">
                        <label>Category</label>
                        <select
                          name="category"
                          value={formData.category}
                          onChange={handleFormChange}
                          required
                        >
                          <option value="TECHNICAL">Technical Issue</option>
                          <option value="AFFILIATION">Affiliation Query</option>
                          <option value="INTERNSHIP">Internship Assistance</option>
                          <option value="ACCOUNT">Account Management</option>
                          <option value="OTHER">General Inquiry</option>
                        </select>
                      </div>

                      <div className="support-field">
                        <label>Priority</label>
                        <select
                          name="priority"
                          value={formData.priority}
                          onChange={handleFormChange}
                          required
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="URGENT">Urgent</option>
                        </select>
                      </div>

                      <div className="support-field full">
                        <label>Subject</label>
                        <input
                          type="text"
                          name="subject"
                          placeholder="Brief summary of your issue"
                          value={formData.subject}
                          onChange={handleFormChange}
                          required
                        />
                      </div>

                      <div className="support-field full">
                        <label>Description</label>
                        <textarea
                          name="message"
                          rows={6}
                          placeholder={`Describe:
- what happened
- what page or action caused it
- affected account, application, logbook, or dashboard
- what you expected to happen`}
                          value={formData.message}
                          onChange={handleFormChange}
                          required
                        />
                      </div>

                      <div className="support-field full">
                        <label>Attachments Optional</label>
                        <input type="file" multiple onChange={handleFileChange} />
                        <small>
                          Upload screenshots or supporting documents. Max size
                          depends on platform settings.
                        </small>

                        {attachments.length > 0 && (
                          <div className="support-files">
                            {attachments.map((file) => (
                              <span key={`${file.name}-${file.size}`}>
                                {file.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="support-submit"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Submitting ticket…' : 'Submit support ticket'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleFeedbackSubmit} className="support-form">
                    <div className="support-field full">
                      <label>Your feedback</label>
                      <textarea
                        rows={7}
                        placeholder="Share product feedback, usability issues, or suggestions for improving EduLink KE."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                      />
                    </div>

                    <button
                      type="submit"
                      className="support-submit"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Submitting feedback…' : 'Submit feedback'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <FeedbackModal {...feedbackProps} />

      <style>{`
        .support-page {
          background: #ffffff;
          color: #111827;
        }

        .support-container {
          width: 100%;
          max-width: 1140px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .section {
          padding: 78px 0;
        }

        .soft-bg {
          background: #f6faf9;
        }

        .support-hero {
          padding: 88px 0 70px;
          background:
            radial-gradient(circle at top right, rgba(6,155,142,.12), transparent 34%),
            linear-gradient(180deg, #ffffff 0%, #f6faf9 100%);
        }

        .support-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(320px, .72fr);
          gap: 48px;
          align-items: center;
        }

        .support-badge,
        .support-section-head span,
        .support-form-side > span {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #069b8e;
          font-size: .74rem;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: .1em;
        }

        .support-badge {
          padding: 7px 12px;
          border-radius: 999px;
          background: rgba(6,155,142,.08);
          border: 1px solid rgba(6,155,142,.14);
          margin-bottom: 18px;
        }

        .support-hero h1 {
          max-width: 760px;
          font-size: clamp(2.35rem, 5vw, 4.4rem);
          line-height: .98;
          letter-spacing: -.08em;
          font-weight: 900;
          margin: 0 0 20px;
          color: #071a18;
        }

        .support-hero p {
          max-width: 650px;
          color: #5f6b7a;
          line-height: 1.8;
          font-size: 1.02rem;
          margin: 0;
        }

        .support-actions {
          margin-top: 30px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .support-primary-btn,
        .support-secondary-btn {
          min-height: 46px;
          padding: 0 18px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 850;
          text-decoration: none;
        }

        .support-primary-btn {
          background: #069b8e;
          color: #ffffff;
        }

        .support-primary-btn:hover {
          background: #057e73;
          color: #ffffff;
        }

        .support-secondary-btn {
          background: #ffffff;
          color: #111827;
          border: 1px solid #e5e7eb;
        }

        .support-secondary-btn:hover {
          border-color: rgba(6,155,142,.28);
          color: #069b8e;
        }

        .support-status-card {
          background: #071a18;
          color: #ffffff;
          border-radius: 26px;
          padding: 28px;
          box-shadow: 0 22px 60px rgba(17,24,39,.12);
        }

        .support-status-top {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 24px;
        }

        .support-status-top span {
          display: block;
          color: rgba(255,255,255,.46);
          font-size: .75rem;
          text-transform: uppercase;
          letter-spacing: .09em;
          font-weight: 850;
          margin-bottom: 6px;
        }

        .support-status-top strong {
          font-size: 1.12rem;
          font-weight: 900;
        }

        .support-status-top svg {
          color: #0bbfa3;
        }

        .support-status-list {
          display: flex;
          flex-direction: column;
          gap: 13px;
          margin-bottom: 22px;
        }

        .support-status-list div {
          display: flex;
          align-items: center;
          gap: 10px;
          color: rgba(255,255,255,.74);
          font-size: .9rem;
        }

        .support-status-list svg {
          color: #0bbfa3;
        }

        .support-status-card p {
          color: rgba(255,255,255,.48);
          font-size: .84rem;
          line-height: 1.7;
        }

        .support-section-head {
          max-width: 680px;
          margin-bottom: 34px;
        }

        .support-section-head h2,
        .support-form-side h2 {
          color: #111827;
          font-size: clamp(1.8rem, 3vw, 2.55rem);
          line-height: 1.08;
          letter-spacing: -.06em;
          font-weight: 900;
          margin: 12px 0 0;
        }

        .support-section-head p,
        .support-form-side p {
          color: #6b7280;
          line-height: 1.75;
          margin: 12px 0 0;
        }

        .support-issue-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
        }

        .support-issue-card {
          text-align: left;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          border-radius: 22px;
          padding: 22px;
          cursor: pointer;
          transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease;
        }

        .support-issue-card:hover {
          transform: translateY(-4px);
          border-color: rgba(6,155,142,.25);
          box-shadow: 0 18px 44px rgba(17,24,39,.07);
        }

        .support-issue-icon {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: rgba(6,155,142,.08);
          color: #069b8e;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .support-issue-card h3 {
          color: #111827;
          font-size: .98rem;
          font-weight: 850;
          margin: 0 0 8px;
        }

        .support-issue-card p {
          color: #6b7280;
          line-height: 1.6;
          font-size: .86rem;
          margin: 0;
        }

        .support-faq-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .support-faq-group {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 22px;
          padding: 20px;
        }

        .support-faq-group h3 {
          color: #069b8e;
          font-size: .82rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .08em;
          margin: 0 0 14px;
        }

        .support-faq-item {
          border-top: 1px solid #eef2f7;
        }

        .support-faq-item:first-of-type {
          border-top: 0;
        }

        .support-faq-item button {
          width: 100%;
          border: 0;
          background: transparent;
          color: #111827;
          padding: 14px 0;
          display: flex;
          justify-content: space-between;
          gap: 14px;
          text-align: left;
          font-weight: 800;
          font-size: .9rem;
          cursor: pointer;
        }

        .support-faq-item button span {
          color: #069b8e;
          font-size: 1.1rem;
        }

        .support-faq-item p {
          color: #6b7280;
          line-height: 1.65;
          font-size: .86rem;
          margin: 0 0 14px;
        }

        .support-form-layout {
          display: grid;
          grid-template-columns: .78fr 1.22fr;
          gap: 42px;
          align-items: start;
        }

        .support-form-side {
          position: sticky;
          top: 92px;
        }

        .support-help-list {
          margin-top: 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .support-help-list div {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          color: #5f6b7a;
          font-size: .9rem;
          line-height: 1.55;
        }

        .support-help-list svg {
          color: #069b8e;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .support-panel {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 24px;
          padding: 22px;
          box-shadow: 0 18px 44px rgba(17,24,39,.06);
        }

        .support-mode-switch {
          display: flex;
          gap: 8px;
          background: #f6faf9;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 7px;
          margin-bottom: 22px;
        }

        .support-mode-switch button,
        .support-mode-switch a {
          min-height: 40px;
          border: 0;
          background: transparent;
          color: #64748b;
          border-radius: 11px;
          padding: 0 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          font-size: .84rem;
          font-weight: 850;
          text-decoration: none;
          cursor: pointer;
          flex: 1;
        }

        .support-mode-switch button.active {
          background: #ffffff;
          color: #069b8e;
          box-shadow: 0 4px 16px rgba(17,24,39,.08);
        }

        .support-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .support-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .support-field.full {
          grid-column: 1 / -1;
        }

        .support-field label {
          color: #111827;
          font-size: .75rem;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: .05em;
        }

        .support-field input,
        .support-field select,
        .support-field textarea {
          width: 100%;
          border: 1.5px solid #e5e7eb;
          border-radius: 12px;
          background: #ffffff;
          color: #111827;
          padding: 12px 13px;
          outline: none;
          font: 600 .9rem system-ui, sans-serif;
          transition: border-color .16s ease, box-shadow .16s ease;
        }

        .support-field input,
        .support-field select {
          height: 46px;
        }

        .support-field textarea {
          resize: vertical;
          min-height: 150px;
          line-height: 1.6;
        }

        .support-field input:focus,
        .support-field select:focus,
        .support-field textarea:focus {
          border-color: #069b8e;
          box-shadow: 0 0 0 3.5px rgba(6,155,142,.16);
        }

        .support-field small {
          color: #6b7280;
          font-size: .78rem;
          line-height: 1.5;
        }

        .support-files {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 4px;
        }

        .support-files span {
          background: #f6faf9;
          color: #475569;
          border: 1px solid #e5e7eb;
          border-radius: 999px;
          padding: 5px 9px;
          font-size: .74rem;
          font-weight: 700;
        }

        .support-submit {
          margin-top: 18px;
          width: 100%;
          height: 48px;
          border: 0;
          border-radius: 12px;
          background: #069b8e;
          color: #ffffff;
          font-weight: 900;
          cursor: pointer;
          transition: background .16s ease, transform .12s ease;
        }

        .support-submit:hover:not(:disabled) {
          background: #057e73;
          transform: translateY(-1px);
        }

        .support-submit:disabled {
          opacity: .58;
          cursor: not-allowed;
        }

        @media (max-width: 1040px) {
          .support-hero-grid,
          .support-form-layout {
            grid-template-columns: 1fr;
          }

          .support-form-side {
            position: static;
          }

          .support-issue-grid,
          .support-faq-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .support-hero {
            padding: 64px 0 48px;
          }

          .section {
            padding: 58px 0;
          }

          .support-issue-grid,
          .support-faq-grid,
          .support-form-grid {
            grid-template-columns: 1fr;
          }

          .support-mode-switch {
            flex-direction: column;
          }

          .support-panel {
            padding: 18px;
          }
        }
      `}</style>
    </>
  );
};

export default Support;