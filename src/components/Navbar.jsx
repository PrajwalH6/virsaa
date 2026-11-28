
import React, { useEffect, useRef, useState } from "react";
import "./Navbar.css";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const toggle = useRef(null);
  const navigation = useRef(null);
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 701px)");
    const handleResize = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    desktop.addEventListener("change", handleResize);
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      desktop.removeEventListener("change", handleResize);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    navigation.current.querySelector("a")?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        toggle.current?.focus();
      }
      if (event.key !== "Tab") return;

      const controls = [...navigation.current.querySelectorAll("a"), toggle.current];
      const index = controls.indexOf(document.activeElement);
      const next = (index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
      event.preventDefault();
      controls[next]?.focus();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
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
          ref={navigation}
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

            <a href="#contact" onClick={closeMenu} className="menu-item">
              <span className="menu-number">04</span>
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
          ref={toggle}
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
