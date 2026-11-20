
import React, { useState } from "react";
import "./Contact.css";

// Replace this with your actual Formspree endpoint
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

        <div className="contact-info">

          <h3>Visit VRISAA CAFÉ</h3>

          <div className="contact-item">
            <h4>OUR LOCATION</h4>
            <p>Add your café address here</p>
          </div>

          <div className="contact-item">
            <h4>PHONE NUMBER</h4>
            <p>Add your café phone number</p>
          </div>

          <div className="contact-item">
            <h4>EMAIL ADDRESS</h4>
            <p>Add your café email address</p>
          </div>

          <div className="contact-item">
            <h4>OPENING HOURS</h4>
            <p>Monday – Sunday</p>
            <p>Update your café timings here</p>
          </div>

        </div>

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
