import React, { useState } from 'react';
import {
  ArrowRight,
  Building2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  ShieldCheck,
} from 'lucide-react';

import { contactService } from '../services/contact/contactService';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { showToast } from '../utils/toast';

const Contact: React.FC = () => {
  useErrorHandler({
    onValidationError: () =>
      showToast.error('Please check your form entries.'),

    onAuthError: () =>
      showToast.error('Session expired. Please refresh and try again.'),

    onUnexpected: (error) =>
      showToast.error(error.message || 'Failed to send message.'),
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      await contactService.submitContactForm({
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
      });

      setMessage(
        'Your message has been sent successfully. We will respond as soon as possible.',
      );

      showToast.success('Message sent successfully.');

      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
      });
    } catch (error) {
      console.error(error);
      showToast.error('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);

      setTimeout(() => {
        setMessage('');
      }, 5000);
    }
  };

  return (
    <>
      <main className="contact-page">
        <section className="contact-hero">
          <div className="contact-container">
            <div className="contact-hero-grid">
              <div>
                <div className="contact-badge">
                  <MessageSquare size={15} />
                  EduLink Contact Center
                </div>

                <h1>
                  Reach the EduLink KE team.
                </h1>

                <p>
                  Contact us about internships, institution onboarding,
                  employer workflows, support requests, partnerships, or
                  platform feedback.
                </p>

                <div className="contact-meta-grid">
                  <div className="contact-meta-card">
                    <ShieldCheck size={18} />
                    <div>
                      <strong>Operational support</strong>
                      <span>
                        Placement, verification, and workflow assistance.
                      </span>
                    </div>
                  </div>

                  <div className="contact-meta-card">
                    <Building2 size={18} />
                    <div>
                      <strong>Institution ready</strong>
                      <span>
                        Support for universities, departments, and employers.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="contact-info-panel">
                <div className="contact-info-card">
                  <MapPin size={18} />

                  <div>
                    <h3>Location</h3>
                    <p>JKUAT Main Campus, Juja, Kenya</p>
                  </div>
                </div>

                <div className="contact-info-card">
                  <Mail size={18} />

                  <div>
                    <h3>Email</h3>
                    <p>info@sinapstechnology.tech</p>
                  </div>
                </div>

                <div className="contact-info-card">
                  <Phone size={18} />

                  <div>
                    <h3>Support line</h3>
                    <p>Use the support center for ticket-based assistance.</p>
                  </div>
                </div>

                <div className="contact-map">
                  <iframe
                    title="JKUAT Location"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.9443834945417!2d37.01026481475404!3d-1.196570999130081!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x182f462198528753%3A0x86113f898de544d1!2sJomo%20Kenyatta%20University%20of%20Agriculture%20and%20Technology!5e0!3m2!1sen!2ske!4v1624536284693!5m2!1sen!2ske"
                    loading="lazy"
                    allowFullScreen
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="contact-form-section">
          <div className="contact-container">
            <div className="contact-form-layout">
              <aside className="contact-form-side">
                <span>Communication</span>

                <h2>Send a message</h2>

                <p>
                  For account or technical issues, use the support center.
                  For partnerships, onboarding, collaboration, or platform
                  inquiries, use the form here.
                </p>

                <div className="contact-side-points">
                  <div>
                    <ArrowRight size={16} />
                    <span>
                      Include enough context for faster responses.
                    </span>
                  </div>

                  <div>
                    <ArrowRight size={16} />
                    <span>
                      One issue or inquiry per message is recommended.
                    </span>
                  </div>

                  <div>
                    <ArrowRight size={16} />
                    <span>
                      Institution and employer inquiries are prioritized.
                    </span>
                  </div>
                </div>
              </aside>

              <div className="contact-form-panel">
                <form onSubmit={handleSubmit}>
                  <div className="contact-form-grid">
                    <div className="contact-field">
                      <label>Your Name</label>

                      <input
                        type="text"
                        name="name"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="contact-field">
                      <label>Email Address</label>

                      <input
                        type="email"
                        name="email"
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="contact-field full">
                      <label>Subject</label>

                      <input
                        type="text"
                        name="subject"
                        placeholder="Partnership inquiry, onboarding request, collaboration..."
                        value={formData.subject}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="contact-field full">
                      <label>Message</label>

                      <textarea
                        name="message"
                        rows={7}
                        placeholder={`Describe:
- your inquiry
- organization or institution if applicable
- what you would like help with
- relevant context`}
                        value={formData.message}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  {message && (
                    <div className="contact-success-message">
                      {message}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="contact-submit-btn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? 'Sending message...'
                      : 'Send message'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      <style>{`
        .contact-page {
          background: #ffffff;
          color: #111827;
        }

        .contact-container {
          width: 100%;
          max-width: 1140px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .contact-hero {
          padding: 76px 0 60px;
          background:
            radial-gradient(circle at top right, rgba(6,155,142,.12), transparent 34%),
            linear-gradient(180deg, #ffffff 0%, #f6faf9 100%);
        }

        .contact-hero-grid {
          display: grid;
          grid-template-columns: 1fr minmax(320px,.72fr);
          gap: 40px;
          align-items: start;
        }

        .contact-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 12px;
          border-radius: 999px;
          background: rgba(6,155,142,.08);
          border: 1px solid rgba(6,155,142,.14);
          color: #069b8e;
          font-size: .74rem;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: .1em;
          margin-bottom: 18px;
        }

        .contact-hero h1 {
          font-size: clamp(2.4rem,5vw,4.5rem);
          line-height: .98;
          letter-spacing: -.08em;
          font-weight: 900;
          color: #071a18;
          margin: 0 0 18px;
        }

        .contact-hero p {
          color: #5f6b7a;
          line-height: 1.8;
          font-size: 1rem;
          max-width: 620px;
          margin: 0;
        }

        .contact-meta-grid {
          display: grid;
          gap: 14px;
          margin-top: 30px;
        }

        .contact-meta-card {
          display: flex;
          gap: 14px;
          padding: 18px;
          border-radius: 18px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
        }

        .contact-meta-card svg {
          color: #069b8e;
          flex-shrink: 0;
        }

        .contact-meta-card strong {
          display: block;
          font-size: .92rem;
          margin-bottom: 4px;
        }

        .contact-meta-card span {
          color: #6b7280;
          font-size: .86rem;
          line-height: 1.6;
        }

        .contact-info-panel {
          background:
            linear-gradient(180deg, rgba(255,255,255,.98), rgba(246,250,249,.98)),
            #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 26px;
          padding: 22px;
          color: #111827;
          box-shadow: 0 18px 44px rgba(17,24,39,.08);
        }

        .contact-info-card {
          display: flex;
          gap: 14px;
          margin-bottom: 20px;
        }

        .contact-info-card svg {
          color: #0bbfa3;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .contact-info-card h3 {
          color: #111827;
          font-size: .9rem;
          font-weight: 850;
          margin: 0 0 4px;
        }

        .contact-info-card p {
          color: #4b5563;
          line-height: 1.6;
          font-size: .84rem;
          margin: 0;
        }

        .contact-info-panel .contact-info-card {
          border-bottom: 1px solid #edf2f7;
          padding-bottom: 16px;
        }

        .contact-info-panel .contact-info-card:last-of-type {
          border-bottom: 0;
          margin-bottom: 0;
          padding-bottom: 0;
        }

        .contact-map {
          margin-top: 20px;
          overflow: hidden;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.08);
        }

        .contact-map iframe {
          width: 100%;
          height: 320px;
          border: 0;
          display: block;
        }

        .contact-form-section {
          padding: 64px 0;
        }

        .contact-form-layout {
          display: grid;
          grid-template-columns: .78fr 1.22fr;
          gap: 36px;
        }

        .contact-form-side span {
          display: inline-block;
          color: #069b8e;
          font-size: .74rem;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: .1em;
          margin-bottom: 12px;
        }

        .contact-form-side h2 {
          font-size: clamp(1.8rem,3vw,2.5rem);
          line-height: 1.08;
          letter-spacing: -.06em;
          font-weight: 900;
          margin: 0 0 14px;
        }

        .contact-form-side p {
          color: #6b7280;
          line-height: 1.75;
        }

        .contact-side-points {
          margin-top: 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .contact-side-points div {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          color: #5f6b7a;
          font-size: .9rem;
          line-height: 1.6;
        }

        .contact-side-points svg {
          color: #069b8e;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .contact-form-panel {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 24px;
          padding: 22px;
          box-shadow: 0 18px 44px rgba(17,24,39,.06);
        }

        .contact-form-grid {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 16px;
        }

        .contact-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .contact-field.full {
          grid-column: 1 / -1;
        }

        .contact-field label {
          color: #111827;
          font-size: .74rem;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: .05em;
        }

        .contact-field input,
        .contact-field textarea {
          width: 100%;
          border: 1.5px solid #e5e7eb;
          border-radius: 12px;
          background: #ffffff;
          color: #111827;
          padding: 12px 13px;
          outline: none;
          font: 600 .9rem system-ui,sans-serif;
          transition: border-color .16s ease, box-shadow .16s ease;
        }

        .contact-field input {
          height: 46px;
        }

        .contact-field textarea {
          resize: vertical;
          min-height: 170px;
          line-height: 1.6;
        }

        .contact-field input:focus,
        .contact-field textarea:focus {
          border-color: #069b8e;
          box-shadow: 0 0 0 3.5px rgba(6,155,142,.16);
        }

        .contact-success-message {
          margin-top: 18px;
          border-radius: 12px;
          background: rgba(5,150,82,.1);
          color: #047857;
          padding: 14px;
          font-size: .88rem;
          font-weight: 700;
        }

        .contact-submit-btn {
          margin-top: 18px;
          width: 100%;
          height: 48px;
          border: 0;
          border-radius: 12px;
          background: #069b8e;
          color: #ffffff;
          font-weight: 900;
          cursor: pointer;
        }

        .contact-submit-btn:hover:not(:disabled) {
          background: #057e73;
        }

        .contact-submit-btn:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        @media (max-width: 980px) {
          .contact-hero-grid,
          .contact-form-layout {
            grid-template-columns: 1fr;
          }

          .contact-form-section {
            padding: 56px 0;
          }
        }

        @media (max-width: 640px) {
          .contact-hero {
            padding: 56px 0 40px;
          }

          .contact-form-section {
            padding: 48px 0;
          }

          .contact-form-grid {
            grid-template-columns: 1fr;
          }

          .contact-form-panel {
            padding: 18px;
          }
        }
      `}</style>
    </>
  );
};

export default Contact;