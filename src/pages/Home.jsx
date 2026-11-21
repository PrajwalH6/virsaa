
import React from "react";
import "../styles/global.css";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

import Hero from "../sections/Hero";
import About from "../components/About";
import Menu from "../sections/Menu";
import Specials from "../sections/Specials";
import Gallery from "../sections/Gallery";
import Booking from "../sections/Booking";
import TrackBooking from "../sections/TrackBooking";
import Contact from "../sections/Contact";

import Admin from "../sections/Admin";
import AdminSetup from "../sections/AdminSetup";

function Home() {
  const path =
    window.location.pathname.replace(/\/$/, "") || "/";

  if (path === "/admin/setup") {
    return <AdminSetup />;
  }

  if (path === "/admin") {
    return <Admin />;
  }

  return (
    <main>
      <Navbar />
      <Hero />
      <About />
      <Menu />
      <Specials />
      <Gallery />
      <Booking />
      <TrackBooking />
      <Contact />
      <Footer />
    </main>
  );
}

export default Home;
