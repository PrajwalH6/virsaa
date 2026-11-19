
import React from "react";
import "./Specials.css";

function Specials() {
  const specials = [
    {
      name: "Avocado Delight",
      description: "Creamy avocado on freshly toasted sourdough.",
      price: "₹249",
      image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800",
    },
    {
      name: "Berry Pancakes",
      description: "Fluffy pancakes topped with fresh seasonal berries.",
      price: "₹229",
      image: "https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=800",
    },
    {
      name: "Fresh Garden Bowl",
      description: "A wholesome bowl packed with fresh ingredients.",
      price: "₹269",
      image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800",
    },
  ];

  return (
    <section id="specials" className="specials-section">
      <div className="specials-heading">
        <p>HANDPICKED FOR YOU</p>
        <h2>Our Specialties</h2>
        <span>Little moments. Extraordinary flavours.</span>
      </div>

      <div className="specials-grid">
        {specials.map((item, index) => (
          <div className="special-card" key={index}>
            <div className="special-image">
              <img src={item.image} alt={item.name} />
            </div>

            <div className="special-info">
              <h3>{item.name}</h3>
              <p>{item.description}</p>

              <div className="special-bottom">
                <span>{item.price}</span>
                <a href="#contact">ENQUIRE NOW →</a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Specials;
