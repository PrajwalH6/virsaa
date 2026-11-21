
import React from "react";
import "./Hero.css";

function Hero() {
  return (
    <section className="hero" id="home">
      <div
        className="hero-bg-decoration"
        aria-hidden="true"
      ></div>

      <div className="hero-container">
        <div className="hero-content">
          <span className="hero-eyebrow">
            <span className="eyebrow-dot"></span>
            FRESHNESS, NATURALLY
          </span>

          <h1>
            Good food.
            <br />
            <span>Greener living.</span>
          </h1>

          <p className="hero-description">
            Discover fresh, wholesome food made with nature's
            goodness. A little more freshness, a little more
            happiness in every bite.
          </p>

          <div className="hero-actions">
            <a href="#menu" className="btn btn-primary">
              Explore Our Menu
            </a>

            <a href="#about" className="btn btn-secondary">
              Our Story
            </a>
          </div>

          <div className="hero-note">
            <span className="hero-note-line"></span>
            Fresh ingredients. Thoughtfully prepared.
          </div>
        </div>
      </div>

      <div className="hero-bottom">
        <div className="hero-scroll">
          <span className="scroll-line"></span>
          SCROLL TO EXPLORE
        </div>

        <span className="hero-bottom-label">
          FRESHNESS IN EVERY MOMENT
        </span>
      </div>
    </section>
  );
}

export default Hero;
