
import { cafeDirections } from "../lib/cafeLocation";
import React from "react";
import "./Footer.css";

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">

        {/* Branding */}
        <div className="footer-brand">
          <span className="footer-brand-eyebrow">
            GOOD FOOD. GOOD MOMENTS.
          </span>

          <h2>
            VRISAA <span>CAFÉ</span>
          </h2>

          <p className="footer-tagline">
            Avocado at heart. Good food all around.
          </p>

          <p className="footer-description">
            Fresh ingredients, beautiful flavours, and
            memorable moments. A warm place to gather,
            connect, and make every visit special.
          </p>
        </div>

        {/* Quick Links */}
        <nav className="footer-links" aria-label="Footer navigation">
          <h3>EXPLORE</h3>
          <a href="#home">Home</a>
          <a href="#about">About Us</a>
          <a href="#menu">Our Menu</a>
          <a href="#specials">Specials</a>
          <a href="#gallery">Gallery</a>
          <a href="#contact">Contact Us</a>
        </nav>

        {/* Contact */}
        <div className="footer-contact">
          <h3>GET IN TOUCH</h3>

          <div className="footer-contact-item">
            <span aria-hidden="true">⌖</span>
            <p>
              VriSaa Naturals Pvt Ltd<br />
              C-204, 2nd Floor, Soundarya Kamakshi<br />
              Magadi Main Road, Kamakshipalya<br />
              Bengaluru, Karnataka - 560079
              <br />
              <a className="footer-directions" href={cafeDirections}>Get directions on Google Maps</a>
            </p>
          </div>

          <div className="footer-contact-item">
            <span aria-hidden="true">☎</span>
            <a href="tel:+918217524813">
              +91 8217524813
            </a>
          </div>

          <div className="footer-contact-item">
            <span aria-hidden="true">✉</span>
            <a href="mailto:info@vrisaanaturals.com">
              info@vrisaanaturals.com
            </a>
          </div>
        </div>

        {/* Social */}
        <div className="footer-social">
          <h3>FOLLOW OUR JOURNEY</h3>

          <p>
            A little glimpse of the food, the atmosphere,
            and everything we love.
          </p>

          <div className="footer-social-icons">
            <a
              href="https://www.instagram.com/vrisaacafe/?hl=en"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="VriSaa Café on Instagram"
            >
              <InstagramIcon />
            </a>
          </div>

          <a
            className="footer-instagram-link"
            href="https://www.instagram.com/vrisaacafe/?hl=en"
            target="_blank"
            rel="noopener noreferrer"
          >
            @vrisaacafe ↗
          </a>
        </div>

      </div>

      <div className="footer-bottom">
        <p>
          © {new Date().getFullYear()} VRISAA CAFÉ.
          All Rights Reserved.
        </p>

        <p className="footer-bottom-message">
          Made with care, served with love.
        </p>

        <a href="#home" className="back-to-top">
          BACK TO TOP ↑
        </a>
      </div>
    </footer>
  );
}

export default Footer;
