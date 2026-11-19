
import React from "react";
import "./About.css";

function About() {
  return (
    <section id="about" className="about-section">
      <div className="about-content">
        <p className="about-subtitle">OUR STORY</p>

        <h2>
          More Than Just
          <span> A Café</span>
        </h2>

        <p className="about-description">
          Welcome to VRISAA CAFÉ, where fresh ingredients,
          delicious flavours, and beautiful moments come
          together.

          We believe in serving good food, creating warm
          experiences, and making every visit special.
        </p>

        <p className="about-tagline">
          Freshness in Every Bite. Happiness in Every Sip.
        </p>

        <a href="#menu" className="about-button">
          EXPLORE OUR MENU
        </a>
      </div>

      <div className="about-image">
        <img
          src="https://images.unsplash.com/photo-1551218808-94e220e084d2?w=900"
          alt="Fresh café food"
        />
      </div>
    </section>
  );
}

export default About;
