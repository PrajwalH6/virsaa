
import React, { useState } from "react";
import "./Contact.css";

const FORMSPREE_ENDPOINT = "https://formspree.io/f/xrpqlwdl";

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const LocationIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true">
    <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true">
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 2.1 4.2
      2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.5 3a2 2 0 0 1-.6 1.7
      L7.1 10a16 16 0 0 0 6.9 6.9l1.6-1.9a2 2 0 0 1 1.7-.6l3
      .5a2 2 0 0 1 1.7 2Z" />
  </svg>
);

const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m2 6 10 7 10-7" />
  </svg>
);

function Contact() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setStatus("");

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });

      if (response.ok) {
        setStatus("success");
        form.reset();
      } else {
        setStatus("error");
      }
    } catch (error) {
      console.error("Contact form error:", error);
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" className="contact-section">
      <div className="contact-inner">

        <div className="contact-heading">
          <span className="contact-eyebrow">GET IN TOUCH</span>
          <h2>We'd Love to <em>Hear From You</em></h2>
          <div className="contact-heading-line" />
          <p>
            A question, a celebration, or just a little hello?
            We'd love to connect with you.
          </p>
        </div>

        <div className="contact-container">

          {/* Contact Information */}
          <div className="contact-info">
            <div className="contact-info-top">
              <span className="contact-info-eyebrow">
                VISIT & CONNECT
              </span>
              <h3>Come Say Hello.</h3>
              <p className="contact-info-intro">
                Great conversations start here. Reach out
                to us — we're always happy to hear from you.
              </p>
            </div>

            <div className="contact-details">

              <div className="office-detail">
                <div className="office-icon">
                  <LocationIcon />
                </div>
                <div className="office-text">
                  <h4>Our Address</h4>
                  <p>VriSaa Naturals Pvt Ltd</p>
                  <p>C-204, 2nd Floor, Soundarya Kamakshi</p>
                  <p>Magadi Main Road, Kamakshipalya</p>
                  <p>Bengaluru, Karnataka - 560079</p>
                </div>
              </div>

              <div className="office-detail">
                <div className="office-icon">
                  <PhoneIcon />
                </div>
                <div className="office-text">
                  <h4>Give Us a Call</h4>
                  <a href="tel:+918217524813">
                    +91 8217524813
                  </a>
                </div>
              </div>

              <div className="office-detail">
                <div className="office-icon">
                  <MailIcon />
                </div>
                <div className="office-text">
                  <h4>Drop Us an Email</h4>
                  <a href="mailto:info@vrisaanaturals.com">
                    info@vrisaanaturals.com
                  </a>
                </div>
              </div>

            </div>

            <div className="contact-social-area">
              <span>FOLLOW OUR JOURNEY</span>
              <div className="office-socials">
                <a
                  href="https://www.instagram.com/vrisaacafe/?hl=en"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="VriSaa Café Instagram"
                >
                  <InstagramIcon />
                </a>
              </div>
            </div>

            <div className="contact-info-decoration" aria-hidden="true">
              V
            </div>
          </div>

          {/* Contact Form */}
          <div className="contact-form-container">
            <div className="contact-form-heading">
              <span className="contact-form-eyebrow">
                LET'S TALK
              </span>
              <h3>Send Us a Message</h3>
              <p>
                Fill in the details below and we'll get
                back to you as soon as possible.
              </p>
            </div>

            <form
              className="contact-form"
              onSubmit={handleSubmit}
            >
              <div className="contact-field">
                <label htmlFor="contact-name">Your Name *</label>
                <input
                  id="contact-name"
                  type="text"
                  name="name"
                  placeholder="Enter your full name"
                  autoComplete="name"
                  required
                />
              </div>

              <div className="contact-field">
                <label htmlFor="contact-email">Email Address *</label>
                <input
                  id="contact-email"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="contact-field">
                <label htmlFor="contact-phone">Phone Number</label>
                <input
                  id="contact-phone"
                  type="tel"
                  name="phone"
                  placeholder="+91 XXXXX XXXXX"
                  autoComplete="tel"
                />
              </div>

              <div className="contact-field">
                <label htmlFor="contact-message">Your Message *</label>
                <textarea
                  id="contact-message"
                  name="message"
                  placeholder="Tell us what's on your mind..."
                  rows={5}
                  required
                />
              </div>

              <button
                type="submit"
                className="contact-submit"
                disabled={loading}
              >
                <span>
                  {loading ? "Sending Message..." : "Send Message"}
                </span>
                {!loading && <span aria-hidden="true">↗</span>}
              </button>

              {status === "success" && (
                <p className="form-success" role="status">
                  Thank you! Your message has been sent successfully.
                </p>
              )}

              {status === "error" && (
                <p className="form-error" role="alert">
                  Something went wrong. Please try again.
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Contact;
