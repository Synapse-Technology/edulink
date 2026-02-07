import React, { useState } from 'react';
import { contactService } from '../services/contact/contactService';
import toast from 'react-hot-toast';

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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
        message: formData.message
      });
      
      setMessage('Your message has been sent. Thank you!');
      toast.success('Message sent successfully!');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error: any) {
      console.error('Contact form error:', error);
      setMessage('There was an error sending your message. Please try again.');
      toast.error(error.message || 'Failed to send message.');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setMessage(''), 5000);
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
                <h1>Contact Us</h1>
                <p className="mb-0">Have questions or feedback? We'd love to hear from you. Reach out, and we'll get back to you as soon as possible.</p>
              </div>
            </div>
          </div>
        </div>
        <nav className="breadcrumbs">
          <div className="container">
            <ol>
              <li><a href="/">Home</a></li>
              <li className="current">Contact</li>
            </ol>
          </div>
        </nav>
      </div>

      <main className="main">
        {/* Contact Section */}
        <section id="contact" className="contact section">
          
          <div className="mb-5" data-aos="fade-up" data-aos-delay="200">
            <iframe 
              style={{border: 0, width: '100%', height: '300px'}} 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.9443834945417!2d37.01026481475404!3d-1.196570999130081!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x182f462198528753%3A0x86113f898de544d1!2sJomo%20Kenyatta%20University%20of%20Agriculture%20and%20Technology!5e0!3m2!1sen!2ske!4v1624536284693!5m2!1sen!2ske" 
              frameBorder="0" 
              allowFullScreen={true}
              title="JKUAT Location"
            />
          </div>

          <div className="container" data-aos="fade-up" data-aos-delay="100">
            <div className="row gy-4">
              
              <div className="col-lg-4">
                <div className="info-item d-flex" data-aos="fade-up" data-aos-delay="300">
                  <i className="bi bi-geo-alt flex-shrink-0"></i>
                  <div>
                    <h3>Address</h3>
                    <p>JKUAT Main Campus, Juja, Kenya</p>
                  </div>
                </div>

                <div className="info-item d-flex" data-aos="fade-up" data-aos-delay="400">
                  <i className="bi bi-telephone flex-shrink-0"></i>
                  <div>
                    <h3>Call Us</h3>
                    <p>+254 712 345 678</p>
                  </div>
                </div>

                <div className="info-item d-flex" data-aos="fade-up" data-aos-delay="500">
                  <i className="bi bi-envelope flex-shrink-0"></i>
                  <div>
                    <h3>Email Us</h3>
                    <p>info@edulink.co.ke</p>
                  </div>
                </div>
              </div>

              <div className="col-lg-8">
                <form onSubmit={handleSubmit} className="php-email-form" data-aos="fade-up" data-aos-delay="200">
                  <div className="row gy-4">
                    <div className="col-md-6">
                      <input 
                        type="text" 
                        name="name" 
                        className="form-control" 
                        placeholder="Your Name" 
                        value={formData.name}
                        onChange={handleInputChange}
                        required 
                      />
                    </div>
                    
                    <div className="col-md-6">
                      <input 
                        type="email" 
                        className="form-control" 
                        name="email" 
                        placeholder="Your Email" 
                        value={formData.email}
                        onChange={handleInputChange}
                        required 
                      />
                    </div>
                    
                    <div className="col-md-12">
                      <input 
                        type="text" 
                        className="form-control" 
                        name="subject" 
                        placeholder="Subject" 
                        value={formData.subject}
                        onChange={handleInputChange}
                        required 
                      />
                    </div>
                    
                    <div className="col-md-12">
                      <textarea 
                        className="form-control" 
                        name="message" 
                        rows={6} 
                        placeholder="Message" 
                        value={formData.message}
                        onChange={handleInputChange}
                        required 
                      />
                    </div>
                    
                    <div className="col-md-12 text-center">
                      {message && (
                        <div className={message.includes('error') ? 'error-message' : 'sent-message'}>
                          {message}
                        </div>
                      )}
                      
                      <button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Sending Message...' : 'Send Message'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

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

        /* Contact Section */
        .contact {
          padding-top: 8px;
          padding-bottom: 40px;
        }

        .contact .info-item + .info-item {
          margin-top: 40px;
        }

        .contact .info-item i {
          color: var(--contrast-color);
          background: var(--accent-color);
          font-size: 20px;
          width: 48px;
          height: 48px;
          display: flex;
          justify-content: center;
          align-items: center;
          border-radius: 50px;
          transition: all 0.3s ease-in-out;
          margin-right: 15px;
        }

        .contact .info-item h3 {
          padding: 0;
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 5px;
        }

        .contact .info-item p {
          padding: 0;
          margin-bottom: 0;
          font-size: 14px;
        }

        .contact .php-email-form {
          height: 100%;
        }

        .contact .php-email-form input[type=text],
        .contact .php-email-form input[type=email],
        .contact .php-email-form textarea {
          font-size: 14px;
          padding: 10px 15px;
          box-shadow: none;
          border-radius: 0;
          color: var(--default-color);
          background-color: color-mix(in srgb, var(--background-color), transparent 50%);
          border-color: color-mix(in srgb, var(--default-color), transparent 80%);
        }

        .contact .php-email-form input[type=text]:focus,
        .contact .php-email-form input[type=email]:focus,
        .contact .php-email-form textarea:focus {
          border-color: var(--accent-color);
        }

        .contact .php-email-form input[type=text]::placeholder,
        .contact .php-email-form input[type=email]::placeholder,
        .contact .php-email-form textarea::placeholder {
          color: color-mix(in srgb, var(--default-color), transparent 70%);
        }

        .contact .php-email-form button[type=submit] {
          color: var(--contrast-color);
          background: var(--accent-color);
          border: 0;
          padding: 10px 30px 12px 30px;
          transition: 0.4s;
          border-radius: 50px;
        }

        .contact .php-email-form button[type=submit]:hover {
          background: color-mix(in srgb, var(--accent-color), transparent 20%);
        }

        .contact .php-email-form button[type=submit]:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .contact .error-message {
          display: block;
          color: #ffffff;
          background: #ed3c0d;
          text-align: center;
          padding: 15px;
          margin-bottom: 24px;
          font-weight: 600;
        }

        .contact .sent-message {
          display: block;
          color: #ffffff;
          background: #059652;
          text-align: center;
          padding: 15px;
          margin-bottom: 24px;
          font-weight: 600;
        }
      `}</style>
    </>
  );
};

export default Contact;