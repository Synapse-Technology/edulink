import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supportService } from '../services/support/supportService';
import type { TicketCategory, TicketPriority } from '../services/support/supportService';
import { useFeedbackModal } from '../hooks/useFeedbackModal';
import { FeedbackModal } from '../components/common';
import { useAuth } from '../contexts/AuthContext';

const Support: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { feedbackProps, showError, showSuccess } = useFeedbackModal();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    category: 'OTHER' as TicketCategory,
    priority: 'LOW' as TicketPriority
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email
      }));
    }
  }, [user]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  const handleFeedbackChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFeedback(e.target.value);
  };

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const ticket = await supportService.createTicket({
        ...formData,
        attachments
      });
      
      showSuccess(
        'Ticket Created Successfully', 
        `Your ticket has been logged with tracking code: ${ticket.tracking_code}. You can track its status in your history.`
      );
      
      setFormData({ 
        name: user ? `${user.firstName} ${user.lastName}`.trim() : '', 
        email: user ? user.email : '', 
        subject: '', 
        message: '', 
        category: 'OTHER', 
        priority: 'LOW' 
      });
      setAttachments([]);
      
      // Optionally redirect to history
      setTimeout(() => navigate('/support/history'), 3000);
      
    } catch (error: any) {
      console.error('Support submission error:', error);
      showError('Submission Failed', 'Failed to send support request. Please try again.', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) {
        toast.error('Please enter your feedback first.');
        return;
    }
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await supportService.submitFeedback({ message: feedback });
      toast.success('Feedback submitted successfully!');
      setFeedback('');
    } catch (error: any) {
      console.error('Feedback submission error:', error);
      toast.error(error.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <>
      {/* Page Title */}
      <div className="page-title" data-aos="fade">
        <div className="heading">
          <div className="container">
            <div className="row d-flex justify-content-center text-center">
              <div className="col-lg-8">
                <h1>Support Center</h1>
                <p className="mb-0">Your one-stop destination for help, resources, and community connection.</p>
              </div>
            </div>
          </div>
        </div>
        <nav className="breadcrumbs">
          <div className="container">
            <ol>
              <li><a href="/">Home</a></li>
              <li className="current">Support</li>
            </ol>
          </div>
        </nav>
      </div>

      <main className="main">
        {/* FAQs Section */}
        <section id="faqs" className="faq-section section light-background">
          <div className="container">
            <div className="section-title text-center" data-aos="fade-up">
              <h2>Frequently Asked Questions</h2>
              <p>Find quick answers to common questions below.</p>
            </div>
            <div className="row" data-aos="fade-up" data-aos-delay="100">
              <div className="col-lg-12">
                <div className="accordion" id="faqAccordion">
                  {/* For Students */}
                  <h4 className="my-4">For Students</h4>
                  <div className="accordion-item mb-3">
                    <h2 className="accordion-header"><button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq-student-1">How do I build a strong profile to attract employers?</button></h2>
                    <div id="faq-student-1" className="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                      <div className="accordion-body">
                        Ensure your profile is 100% complete. Upload a professional photo, write a clear bio, and detail your skills, education, and any relevant projects. A strong profile is your best tool for getting noticed.
                      </div>
                    </div>
                  </div>
                  <div className="accordion-item mb-3">
                    <h2 className="accordion-header"><button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq-student-2">How do the digital logbooks and certifications work?</button></h2>
                    <div id="faq-student-2" className="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                      <div className="accordion-body">
                        During your internship, you'll fill out your digital logbook. At the end, your supervisor verifies it. Upon successful completion, a digital, verifiable certificate is added to your profile, which you can download or share.
                      </div>
                    </div>
                  </div>

                  {/* For Employers */}
                  <h4 className="my-4">For Employers</h4>
                  <div className="accordion-item mb-3">
                    <h2 className="accordion-header"><button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq-employer-1">What are the requirements for posting an internship?</button></h2>
                    <div id="faq-employer-1" className="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                      <div className="accordion-body">
                        To ensure quality, all companies must be verified. Internship listings must include a clear job description, required skills, duration, and whether it is a paid or unpaid position. We highly encourage paid opportunities.
                      </div>
                    </div>
                  </div>
                  <div className="accordion-item mb-3">
                    <h2 className="accordion-header"><button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq-employer-2">How do I manage applicants on my dashboard?</button></h2>
                    <div id="faq-employer-2" className="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                      <div className="accordion-body">
                        Your employer dashboard allows you to view, sort, and filter all applicants. You can review their profiles, shortlist candidates, and communicate with them directly through the platform to arrange interviews.
                      </div>
                    </div>
                  </div>

                  {/* For Institutions */}
                  <h4 className="my-4">For Institutions</h4>
                  <div className="accordion-item mb-3">
                    <h2 className="accordion-header"><button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq-institution-1">How can we monitor our students' progress?</button></h2>
                    <div id="faq-institution-1" className="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                      <div className="accordion-body">
                        Your institution dashboard provides an overview of student applications, ongoing internships, and completion rates. You can also view feedback from employers to track student performance and gather insights.
                      </div>
                    </div>
                  </div>
                  <div className="accordion-item mb-3">
                    <h2 className="accordion-header"><button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq-institution-2">How does EduLink KE verify employers?</button></h2>
                    <div id="faq-institution-2" className="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                      <div className="accordion-body">
                        We have a multi-step verification process that includes checking company registration details, online presence, and, in some cases, direct communication to ensure that all listings are legitimate and safe for students.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Get More Help Section */}
        <section id="get-more-help" className="section">
          <div className="container">
            <div className="section-title text-center" data-aos="fade-up">
              <h2>Get More Help</h2>
              <p>If you couldn't find your answer, here's how to reach us.</p>
            </div>
            <div className="row gy-4 justify-content-center">
              <div className="col-lg-8" data-aos="fade-up" data-aos-delay="100">
                <nav>
                  <div className="nav nav-tabs forms-tabs" id="nav-tab" role="tablist">
                    <button 
                      className="nav-link active" 
                      id="nav-contact-tab"
                      data-bs-toggle="tab"
                      data-bs-target="#nav-contact"
                      type="button"
                      role="tab"
                    >
                      Contact Support
                    </button>
                    <button 
                      className="nav-link" 
                      id="nav-feedback-tab"
                      data-bs-toggle="tab"
                      data-bs-target="#nav-feedback"
                      type="button"
                      role="tab"
                    >
                      Give Feedback
                    </button>
                    <Link 
                      to="/support/history" 
                      className="nav-link text-primary fw-bold"
                    >
                      <i className="bi bi-clock-history me-1"></i> Ticket History
                    </Link>
                  </div>
                </nav>
                <div className="tab-content bg-white p-4 border border-top-0" id="nav-tabContent" style={{borderRadius: '0 0 12px 12px'}}>
                  <div className="tab-pane fade show active" id="nav-contact" role="tabpanel">
                    <h5 className="mb-3">Send a Support Request</h5>
                    <form onSubmit={handleSupportSubmit} className="php-email-form">
                      <div className="row gy-4">
                        <div className="col-md-6">
                          <label className="form-label small fw-bold">Your Name</label>
                          <input 
                            type="text" 
                            name="name" 
                            className="form-control" 
                            placeholder="John Doe" 
                            value={formData.name}
                            onChange={handleFormChange}
                            required 
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small fw-bold">Email Address</label>
                          <input 
                            type="email" 
                            name="email" 
                            className="form-control" 
                            placeholder="john@example.com" 
                            value={formData.email}
                            onChange={handleFormChange}
                            required 
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small fw-bold">Category</label>
                          <select 
                            name="category" 
                            className="form-select" 
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
                        <div className="col-md-6">
                          <label className="form-label small fw-bold">Priority</label>
                          <select 
                            name="priority" 
                            className="form-select" 
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
                        <div className="col-md-12">
                          <label className="form-label small fw-bold">Subject</label>
                          <input 
                            type="text" 
                            name="subject" 
                            className="form-control" 
                            placeholder="Brief summary of your issue" 
                            value={formData.subject}
                            onChange={handleFormChange}
                            required 
                          />
                        </div>
                        <div className="col-md-12">
                          <label className="form-label small fw-bold">Description</label>
                          <textarea 
                            name="message" 
                            className="form-control" 
                            rows={5} 
                            placeholder="Please provide detailed information about your request..." 
                            value={formData.message}
                            onChange={handleFormChange}
                            required 
                          />
                        </div>
                        <div className="col-md-12">
                          <label className="form-label small fw-bold">Attachments (Optional)</label>
                          <input 
                            type="file" 
                            className="form-control" 
                            multiple 
                            onChange={handleFileChange}
                          />
                          <div className="form-text small">You can upload screenshots or documents (Max 5MB per file)</div>
                        </div>
                        <div className="col-md-12 text-center">
                          <button type="submit" className="btn" disabled={isSubmitting}>
                            {isSubmitting ? 'Sending...' : 'Submit Support Ticket'}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                  <div className="tab-pane fade" id="nav-feedback" role="tabpanel">
                    <h5 className="mb-3">Share Your Thoughts</h5>
                    <form onSubmit={handleFeedbackSubmit}>
                      <textarea 
                        className="form-control mb-3" 
                        rows={5} 
                        placeholder="Help us improve by sharing your feedback..."
                        value={feedback}
                        onChange={handleFeedbackChange}
                      />
                      <div className="text-center">
                        <button type="submit" className="btn btn-primary">Submit Feedback</button>
                      </div>
                    </form>
                  </div>
                  <div className="tab-pane fade" id="nav-community" role="tabpanel">
                    <h5 className="mb-3">Join the Conversation</h5>
                    <div className="list-group">
                      <a href="#" className="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                        General Discussions <i className="bi bi-box-arrow-up-right"></i>
                      </a>
                      <a href="#" className="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                        Career Growth & Mentorship <i className="bi bi-box-arrow-up-right"></i>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <FeedbackModal {...feedbackProps} />

      <style>{`
        /* Page Title */
        .page-title {
          --default-color: var(--contrast-color);
          --background-color: var(--accent-color);
          --heading-color: var(--contrast-color);
          color: var(--default-color);
          background-color: var(--background-color);
          position: relative;
        }

        .page-title .heading {
          position: relative;
          padding: 80px 0;
          border-top: 1px solid rgba(var(--default-color-rgb), 0.1);
        }

        .page-title .heading h1 {
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--heading-color);
        }

        .page-title nav {
          background-color: color-mix(in srgb, var(--accent-color) 90%, black 5%);
          padding: 20px 0;
        }

        .page-title nav ol {
          display: flex;
          flex-wrap: wrap;
          list-style: none;
          margin: 0;
          font-size: 1rem;
          font-weight: 400;
          padding: 0;
        }

        .page-title nav ol li + li {
          padding-left: 10px;
        }

        .page-title nav ol li + li::before {
          content: "/";
          display: inline-block;
          padding-right: 10px;
          color: color-mix(in srgb, var(--contrast-color), transparent 70%);
        }

        .page-title nav ol li.current {
          color: var(--contrast-color);
          font-weight: 400;
        }

        .page-title nav a {
          color: var(--contrast-color);
        }

        .page-title nav a:hover {
          color: var(--accent-color);
        }

        /* FAQ Section */
        .faq-section {
          padding: 60px 0;
        }

        .faq-section h4 {
          font-weight: 600;
          color: var(--accent-color);
          padding-bottom: 8px;
          border-bottom: 2px solid #eef0ef;
        }

        .faq-section .accordion-button {
          font-weight: 600;
          background-color: #f8f9fa;
          color: #495057;
        }

        .faq-section .accordion-button:not(.collapsed) {
          color: #fff;
          background-color: var(--accent-color);
        }

        .faq-section .accordion-button:focus {
          box-shadow: 0 0 0 0.25rem rgba(var(--accent-color-rgb), 0.25);
        }

        .faq-section .accordion-collapse {
          border: none;
        }

        .faq-section .accordion-collapse.collapse {
          transition: height 0.35s ease;
        }

        .faq-section .accordion-collapse.collapsing {
          height: 0;
          overflow: hidden;
          transition: height 0.35s ease;
        }

        .faq-section .accordion-body {
          padding: 1rem 1.25rem;
          color: #495057;
          background-color: #fff;
          border: 1px solid rgba(0,0,0,.125);
          border-top: none;
          opacity: 1;
          transition: opacity 0.35s ease;
          visibility: visible;
        }

        .faq-section .accordion-collapse.collapsing .accordion-body {
          opacity: 1;
          visibility: visible;
        }

        .faq-section .accordion-collapse.collapse.show .accordion-body {
          opacity: 1;
          visibility: visible;
        }

        .faq-section .accordion-collapse.collapse:not(.show) .accordion-body {
          opacity: 1;
          visibility: visible;
        }

        /* Forms Tabs */
        .forms-tabs .nav-link {
          color: #6c757d;
          font-weight: 600;
        }

        .forms-tabs .nav-link.active {
          color: var(--accent-color);
          border-color: var(--accent-color) var(--accent-color) #fff !important;
        }

        /* Form Styling */
        .php-email-form input[type=text],
        .php-email-form input[type=email],
        .php-email-form textarea {
          font-size: 14px;
          padding: 10px 15px;
          box-shadow: none;
          border-radius: 0;
          color: var(--default-color);
          background-color: color-mix(in srgb, var(--background-color), transparent 50%);
          border-color: color-mix(in srgb, var(--default-color), transparent 80%);
        }

        .php-email-form input[type=text]:focus,
        .php-email-form input[type=email]:focus,
        .php-email-form textarea:focus {
          border-color: var(--accent-color);
        }

        .php-email-form button[type=submit] {
          color: var(--contrast-color);
          background: var(--accent-color);
          border: 0;
          padding: 10px 30px 12px 30px;
          transition: 0.4s;
          border-radius: 50px;
        }

        .php-email-form button[type=submit]:hover {
          background: color-mix(in srgb, var(--accent-color), transparent 20%);
        }

        .btn-primary {
          color: #fff;
          background-color: var(--accent-color);
          border-color: var(--accent-color);
        }

        .btn-primary:hover {
          background-color: color-mix(in srgb, var(--accent-color), transparent 10%);
          border-color: color-mix(in srgb, var(--accent-color), transparent 10%);
        }

        .form-control:focus {
          border-color: var(--accent-color);
          box-shadow: 0 0 0 0.25rem rgba(var(--accent-color-rgb), 0.25);
        }
      `}</style>
    </>
  );
};

export default Support;