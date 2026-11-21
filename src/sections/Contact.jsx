
import React, { useState } from "react";
import "./Contact.css";

const FORMSPREE_ENDPOINT = "https://formspree.io/f/xrpqlwdl";

function Contact() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus("");

    const formData = new FormData(e.target);

    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      });

      if (response.ok) {
        setStatus("success");
        e.target.reset();
      } else {
        setStatus("error");
      }
    } catch (error) {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" className="contact-section">

      <div className="contact-heading">
        <p>GET IN TOUCH</p>
        <h2>We'd Love to Hear From You</h2>
        <span>
          Have a question or planning a visit? Let's connect.
        </span>
      </div>

      <div className="contact-container">

        {/* OFFICE INFORMATION */}
        <div className="contact-info">

          <h3>Our Office</h3>

          <div className="office-detail">
            <span className="office-icon">📍</span>
            <div className="office-text">
              <p>VriSaa Naturals Pvt Ltd</p>
              <p>C-204, 2nd Floor, Soundarya Kamakshi</p>
              <p>Magadi Main Road, Kamakshipalya</p>
              <p>Bengaluru, Karnataka-560079</p>
            </div>
          </div>

          <div className="office-detail">
            <span className="office-icon">☎</span>
            <a href="tel:+918217524813">
              +91 8217524813
            </a>
          </div>

          <div className="office-detail">
            <span className="office-icon">✉</span>
            <a href="mailto:info@vrisaanaturals.com">
              info@vrisaanaturals.com
            </a>
          </div>

          {/* SOCIAL MEDIA ICONS */}
          <div className="office-socials">

            <a
              href="https://twitter.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter"
            >
              𝕏
            </a>

            <a
              href="https://facebook.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
            >
              f
            </a>

            
            <a
            href="https://www.instagram.com/vrisaacafe/?hl=en"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="VriSaa Café Instagram"
            >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="23"
                height="23"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
            >
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
            </svg>
            </a>


            <a
              href="https://linkedin.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
            >
              in
            </a>

          </div>

        </div>

        {/* EXISTING CONTACT FORM */}
        <div className="contact-form-container">

          <h3>Send Us a Message</h3>

          <form
            className="contact-form"
            onSubmit={handleSubmit}
          >

            <input
              type="text"
              name="name"
              placeholder="Your Name"
              required
            />

            <input
              type="email"
              name="email"
              placeholder="Your Email"
              required
            />

            <input
              type="tel"
              name="phone"
              placeholder="Your Phone Number"
            />

            <textarea
              name="message"
              placeholder="Write your message..."
              rows="5"
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? "SENDING..." : "SEND MESSAGE"}
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

    </section>
  );
}

export default Contact;
