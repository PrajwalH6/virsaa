
import React from "react";
import "../styles/global.css";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

import Hero from "../sections/Hero";
import About from "../components/About";
import Menu from "../sections/Menu";
import Specials from "../sections/Specials";
import Gallery from "../sections/Gallery";
import Contact from "../sections/Contact";

function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <About />
      <Menu />
      <Specials />
      <Gallery />
      <Contact />
      <Footer />
    </main>
  );
}

export default Home;
