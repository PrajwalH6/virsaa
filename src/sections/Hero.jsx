
import React from "react";
import "./Hero.css";

function Hero() {
  return (
    <section className="hero" id="home">
      <div className="hero-container">

        {/* Left Content */}
        <div className="hero-content">

          <span className="hero-eyebrow">
            FRESHNESS, NATURALLY
          </span>

          <h1>
            Good food.
            <br />
            <span>Greener</span> living.
          </h1>

          <p className="hero-description">
            Discover the goodness of avocados through
            fresh flavours, wholesome ingredients and
            a café experience made to be enjoyed.
          </p>

          <div className="hero-buttons">
            <a href="#menu" className="hero-btn-primary">
              Explore Our Menu <span>↗</span>
            </a>

            <a href="#about" className="hero-btn-secondary">
              Discover Vrisaa
            </a>
          </div>

          <div className="hero-note">
            <span className="hero-note-line"></span>
            GOODNESS GROWN NATURALLY
          </div>

        </div>

        {/* Right Image */}
        <div className="hero-visual">
          <div className="hero-image-wrapper">
            <img
              src="https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1200&q=85"
              alt="Fresh café breakfast with wholesome ingredients"
              className="hero-image"
            />

            <div className="hero-image-label">
              <span>FRESH</span>
              <span>•</span>
              <span>NATURAL</span>
              <span>•</span>
              <span>GOOD</span>
            </div>
          </div>

          <div className="hero-stamp">
            <span>THE</span>
            <strong>GOOD</strong>
            <span>NESS</span>
            <span>OF NATURE</span>
          </div>
        </div>

      </div>

      <div className="hero-bottom">
        <span>01 / 04</span>
        <span>SCROLL TO EXPLORE ↓</span>
        <span>VRISAA CAFÉ</span>
      </div>
    </section>
  );
}

export default Hero;
