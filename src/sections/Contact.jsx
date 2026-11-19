
import React from "react";
import "./Contact.css";

function Contact() {
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
            onSubmit={(e) => {
              e.preventDefault();
              alert("Thank you for contacting VRISAA CAFÉ!");
            }}
          >

            <input
              type="text"
              placeholder="Your Name"
              required
            />

            <input
              type="email"
              placeholder="Your Email"
              required
            />

            <input
              type="tel"
              placeholder="Your Phone Number"
            />

            <textarea
              placeholder="Write your message..."
              rows="5"
              required
            />

            <button type="submit">
              SEND MESSAGE
            </button>

          </form>

        </div>

      </div>

    </section>
  );
}

export default Contact;
