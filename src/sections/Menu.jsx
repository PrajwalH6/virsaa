
import React from "react";
import "./Menu.css";

function Menu() {
  const menuItems = [
    {
      name: "Avocado Toast",
      description: "Fresh avocado, toasted sourdough and herbs.",
      price: "₹249",
      category: "HEALTHY BITES",
    },
    {
      name: "Classic Pancakes",
      description: "Fluffy pancakes served with maple syrup.",
      price: "₹199",
      category: "BREAKFAST",
    },
    {
      name: "Garden Fresh Salad",
      description: "Fresh greens, seasonal vegetables and dressing.",
      price: "₹229",
      category: "HEALTHY BITES",
    },
    {
      name: "Cappuccino",
      description: "Rich espresso topped with creamy milk foam.",
      price: "₹149",
      category: "BEVERAGES",
    },
    {
      name: "Chocolate Waffle",
      description: "Golden waffle with chocolate drizzle.",
      price: "₹219",
      category: "DESSERTS",
    },
    {
      name: "Iced Latte",
      description: "Chilled espresso blended with fresh milk.",
      price: "₹169",
      category: "BEVERAGES",
    },
  ];

  return (
    <section id="menu" className="menu-section">
      <div className="menu-heading">
        <p className="menu-subtitle">FRESH & DELICIOUS</p>
        <h2>Our Menu</h2>
        <p>
          Good food, fresh ingredients and flavours
          that make every moment special.
        </p>
      </div>

      <div className="menu-grid">
        {menuItems.map((item, index) => (
          <div className="menu-card" key={index}>
            <span className="menu-category">
              {item.category}
            </span>

            <h3>{item.name}</h3>

            <p>{item.description}</p>

            <div className="menu-card-bottom">
              <span className="menu-price">{item.price}</span>
              <span className="menu-arrow">→</span>
            </div>
          </div>
        ))}
      </div>

      <p className="menu-note">
        Made with love. Served fresh.
      </p>
    </section>
  );
}

export default Menu;
