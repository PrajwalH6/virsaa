
import React from "react";
import "./Footer.css";

function Footer() {
  return (
    <footer className="footer">

      <div className="footer-container">

        <div className="footer-brand">
          <h2>VRISAA <span>CAFÉ</span></h2>

          <p>
            Avocado at heart. Good food all around.
          </p>

          <p className="footer-description">
            Fresh ingredients, beautiful flavours and
            memorable moments. Visit us and experience
            the warmth of VRISAA CAFÉ.
          </p>
        </div>

        <div className="footer-links">
          <h3>QUICK LINKS</h3>

          <a href="#home">Home</a>
          <a href="#about">About Us</a>
          <a href="#menu">Our Menu</a>
          <a href="#specials">Specials</a>
          <a href="#gallery">Gallery</a>
          <a href="#contact">Contact</a>
        </div>

        <div className="footer-contact">
          <h3>GET IN TOUCH</h3>

          <p>📍 Add your café address</p>
          <p>📞 Add your phone number</p>
          <p>✉️ Add your email address</p>
        </div>

        <div className="footer-social">
          <h3>FOLLOW US</h3>

          <a href="https://www.instagram.com/" target="_blank" rel="noreferrer">
            Instagram
          </a>

          <a href="https://www.facebook.com/" target="_blank" rel="noreferrer">
            Facebook
          </a>

          <a href="https://www.pinterest.com/" target="_blank" rel="noreferrer">
            Pinterest
          </a>
        </div>

      </div>

      <div className="footer-bottom">
        <p>
          © {new Date().getFullYear()} VRISAA CAFÉ.
          All Rights Reserved.
        </p>

        <a href="#home" className="back-to-top">
          BACK TO TOP ↑
        </a>
      </div>

    </footer>
  );
}

export default Footer;
