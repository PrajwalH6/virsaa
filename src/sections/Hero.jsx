
import React from "react";
import "./Hero.css";

function Hero() {
  return (
    <section className="hero" id="home">
      <div className="hero-bg-decoration" aria-hidden="true"></div>

      <div className="hero-container">

        <div className="hero-content">

          <span className="hero-eyebrow">
            <span className="eyebrow-dot"></span>
            FRESHNESS, NATURALLY
          </span>

          <h1>
            Good food.
            <br />
            <span>Greener</span> living.
          </h1>

          <p className="hero-description">
            Enjoy wholesome vegetarian goodness with
            fresh ingredients, colourful flavours and
            a café experience made to be enjoyed.
          </p>

          <div className="hero-buttons">
            <a href="#menu" className="hero-btn-primary">
              Explore Our Menu
              <span className="hero-btn-arrow">↗</span>
            </a>

            <a href="#about" className="hero-btn-secondary">
              Discover Vrisaa
              <span className="secondary-arrow">→</span>
            </a>
          </div>

          <div className="hero-note">
            <span className="hero-note-line"></span>
            GOODNESS GROWN NATURALLY
          </div>

        </div>

        <div className="hero-visual">

          <div className="hero-image-decoration" aria-hidden="true">
            <span></span>
          </div>

          <div className="hero-image-wrapper">

            <img
              src="https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=1200&q=85"
              alt="Fresh sliced avocado with vibrant green natural ingredients"
              className="hero-image"
            />

            <div className="hero-image-overlay"></div>

            <div className="hero-image-label">
              <span>FRESH</span>
              <span>•</span>
              <span>AVOCADO</span>
              <span>•</span>
              <span>NATURAL</span>
            </div>

          </div>

          <div className="hero-stamp">
            <span>THE</span>
            <strong>GOOD</strong>
            <span>NESS</span>
            <span>OF NATURE</span>
          </div>

          <div className="hero-floating-note">
            <span className="floating-note-icon">✳</span>
            <div>
              <strong>Fresh by nature</strong>
              <span>Made with goodness</span>
            </div>
          </div>

        </div>

      </div>

      <div className="hero-bottom">
        <span>01 / 04</span>
        <a href="#about">SCROLL TO EXPLORE ↓</a>
        <span>VRISAA CAFÉ</span>
      </div>

    </section>
  );
}

export default Hero;