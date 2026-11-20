
import React from "react";
import "./Menu.css";

function Menu() {
  const menuItems = [
    {
      name: "Avocado Toast",
      description: "Fresh avocado, toasted sourdough and herbs.",
      price: "₹249",
      category: "HEALTHY BITES",
      image:
        "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=85",
    },
    {
      name: "Classic Pancakes",
      description: "Fluffy pancakes served with maple syrup.",
      price: "₹199",
      category: "BREAKFAST",
      image:
        "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=800&q=85",
    },
    {
      name: "Garden Fresh Salad",
      description: "Fresh greens, seasonal vegetables and dressing.",
      price: "₹229",
      category: "HEALTHY BITES",
      image:
        "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=85",
    },
    {
      name: "Cappuccino",
      description: "Rich espresso topped with creamy milk foam.",
      price: "₹149",
      category: "BEVERAGES",
      image:
        "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=85",
    },
    {
      name: "Chocolate Waffle",
      description: "Golden waffle with chocolate drizzle.",
      price: "₹219",
      category: "DESSERTS",
      image:
        "https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=800&q=85",
    },
    {
      name: "Iced Latte",
      description: "Chilled espresso blended with fresh milk.",
      price: "₹169",
      category: "BEVERAGES",
      image:
        "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=800&q=85",
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

            <div className="menu-image-wrapper">
              <img
                src={item.image}
                alt={`${item.name} - vegetarian cafe food`}
                className="menu-image"
                loading="lazy"
              />

              <span className="menu-category">
                {item.category}
              </span>
            </div>

            <div className="menu-card-content">

              <h3>{item.name}</h3>

              <p>{item.description}</p>

              <div className="menu-card-bottom">
                <span className="menu-price">
                  {item.price}
                </span>

                <span className="menu-arrow">→</span>
              </div>

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
