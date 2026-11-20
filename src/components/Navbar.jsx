
import React, { useEffect, useState } from "react";
import "./Navbar.css";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  // Handle navbar scroll and Escape key
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    window.addEventListener("keydown", handleKeyDown);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Prevent background scrolling when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header className={`navbar ${scrolled ? "scrolled" : ""}`}>
      <div className="navbar-container">

        {/* Logo */}
        <a href="#home" className="navbar-logo" onClick={closeMenu}>
          <span className="logo-name">VRISAA</span>
          <span className="logo-subtitle">CAFÉ & NATURALS</span>
        </a>

        {/* Navigation */}
        <nav
          id="main-navigation"
          className={`nav-links ${menuOpen ? "active" : ""}`}
          aria-label="Main navigation"
          aria-hidden={!menuOpen && window.innerWidth <= 700}
        >

          {/* Mobile heading */}
          <div className="menu-heading">
            <span className="menu-eyebrow">EXPLORE VRISAA</span>
            <span className="menu-heading-line"></span>
            <span className="menu-caption">
              A LITTLE MORE NATURAL
            </span>
          </div>

          {/* Navigation links */}
          <div className="menu-items">

            <a href="#home" onClick={closeMenu} className="menu-item">
              <span className="menu-number">01</span>
              <span className="menu-item-name">Home</span>
              <span className="menu-arrow">↗</span>
            </a>

            <a href="#about" onClick={closeMenu} className="menu-item">
              <span className="menu-number">02</span>
              <span className="menu-item-name">Our Story</span>
              <span className="menu-arrow">↗</span>
            </a>

            <a href="#menu" onClick={closeMenu} className="menu-item">
              <span className="menu-number">03</span>
              <span className="menu-item-name">Our Menu</span>
              <span className="menu-arrow">↗</span>
            </a>

            <a href="#experience" onClick={closeMenu} className="menu-item">
              <span className="menu-number">04</span>
              <span className="menu-item-name">Experience</span>
              <span className="menu-arrow">↗</span>
            </a>

            <a href="#contact" onClick={closeMenu} className="menu-item">
              <span className="menu-number">05</span>
              <span className="menu-item-name">Contact</span>
              <span className="menu-arrow">↗</span>
            </a>

          </div>

          {/* Mobile footer */}
          <div className="menu-footer">
            <span>GOOD FOOD. GOOD MOOD. NATURALLY.</span>
            <span>VRISAA © 2026</span>
          </div>

        </nav>

        {/* Desktop Visit Button */}
        <a href="#contact" className="nav-visit" onClick={closeMenu}>
          <span>Visit Us</span>
          <span className="visit-arrow">↗</span>
        </a>

        {/* Mobile Hamburger */}
        <button
          type="button"
          className={`menu-toggle ${menuOpen ? "open" : ""}`}
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          aria-controls="main-navigation"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

      </div>
    </header>
  );
}

export default Navbar;
