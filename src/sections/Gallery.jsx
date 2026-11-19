
import React from "react";
import "./Gallery.css";

function Gallery() {
  const images = [
    {
      image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=900",
      title: "Our Café",
    },
    {
      image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900",
      title: "Coffee Moments",
    },
    {
      image: "https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=900",
      title: "Fresh Food",
    },
    {
      image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900",
      title: "Warm Ambience",
    },
    {
      image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=900",
      title: "Coffee Love",
    },
    {
      image: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=900",
      title: "Fresh Ingredients",
    },
  ];

  return (
    <section id="gallery" className="gallery-section">
      <div className="gallery-heading">
        <p>OUR LITTLE WORLD</p>
        <h2>Moments at VRISAA</h2>
        <span>Good food. Beautiful spaces. Happy moments.</span>
      </div>

      <div className="gallery-grid">
        {images.map((item, index) => (
          <div className="gallery-item" key={index}>
            <img src={item.image} alt={item.title} />

            <div className="gallery-overlay">
              <h3>{item.title}</h3>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Gallery;
