import "./App.css";

const navItems = [
  { label: "Home", href: "#home" },
  { label: "Products", href: "#products" },
  { label: "Categories", href: "#categories" },
  { label: "Deals", href: "#about" },
  { label: "Contact", href: "#contact" },
];

const featurePills = [
  { title: "Free Shipping", text: "On orders over $49" },
  { title: "30-Day Returns", text: "Easy and fast exchange" },
  { title: "Secure Pay", text: "Protected checkout" },
  { title: "24/7 Support", text: "Always here to help" },
];

const products = [
  {
    name: "Urban Everyday Tote",
    category: "Accessories",
    price: 49,
    oldPrice: 64,
    badge: "Best Seller",
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Smart Wireless Headset",
    category: "Electronics",
    price: 89,
    oldPrice: 119,
    badge: "New",
    image:
      "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Classic Sneaker Pro",
    category: "Footwear",
    price: 76,
    oldPrice: 99,
    badge: "Trending",
    image:
      "https://images.unsplash.com/photo-1543508282-6319a3e2621f?auto=format&fit=crop&w=900&q=80",
  },
];

const highlights = [
  { title: "Fast Delivery", text: "Same-day dispatch for selected items.", icon: "?" },
  { title: "Curated Drops", text: "Fresh finds from top brands and designers.", icon: "?" },
  { title: "Satisfaction First", text: "Loved by customers across 40+ countries.", icon: "?" },
];

const categories = [
  { name: "Fashion", icon: "??", count: "320 items" },
  { name: "Electronics", icon: "??", count: "180 items" },
  { name: "Home Decor", icon: "??", count: "140 items" },
  { name: "Beauty", icon: "??", count: "96 items" },
];

const testimonials = [
  {
    name: "Emma W.",
    text: "The quality is excellent and delivery was super fast. My order arrived in two days.",
    rating: "?????",
  },
  {
    name: "Daniel K.",
    text: "I love the curated selection. Everything looks premium and the checkout process is smooth.",
    rating: "?????",
  },
  {
    name: "Sarah P.",
    text: "Best online shopping experience I?ve had. Their support team was responsive and helpful.",
    rating: "?????",
  },
];

function App() {
  return (
    <div className="page-shell">
      <header className="navbar">
        <div className="logo">
          Shop<span>Zone</span>
        </div>

        <nav className="nav-links" aria-label="Main navigation">
          {navItems.map((item) => (
            <a key={item.label} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <button type="button" className="cart-button">
          ?? Cart <span>3</span>
        </button>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-content">
            <p className="hero-small-text">WELCOME TO SHOPZONE</p>
            <h1>
              Discover Your
              <br />
              <span>Perfect Products</span>
            </h1>
            <p className="hero-description">
              Explore the latest fashion, electronics and accessories at amazing prices,
              with premium quality and style that fits your everyday life.
            </p>

            <div className="hero-actions">
              <a href="#products" className="shop-button">
                Shop Now <span>?</span>
              </a>
              <a href="#about" className="secondary-button">
                Learn More
              </a>
            </div>

            <div className="hero-stats" aria-label="Store stats">
              <div>
                <strong>12k+</strong>
                <span>Happy buyers</span>
              </div>
              <div>
                <strong>4.9/5</strong>
                <span>Customer rating</span>
              </div>
            </div>
          </div>

          <div className="hero-visual" aria-label="Shopping showcase image">
            <div className="image-card main-card">
              <img
                src="https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=900"
                alt="Woman shopping online"
              />
            </div>
            <div className="floating-box floating-box-top">
              <span>Trending</span>
              <strong>Summer Edit</strong>
            </div>
            <div className="floating-box floating-box-bottom">
              <span>Up to</span>
              <strong>40% OFF</strong>
            </div>
          </div>
        </section>

        <section className="feature-strip" aria-label="Store benefits">
          {featurePills.map((feature) => (
            <article key={feature.title} className="feature-pill">
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </section>

        <section className="products" id="products">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Popular picks</p>
              <h2>Featured products</h2>
            </div>
            <a href="#products" className="view-all">
              View all
            </a>
          </div>

          <div className="product-grid">
            {products.map((product) => (
              <article key={product.name} className="product-card">
                <div className="product-image-wrap">
                  <span className="product-badge">{product.badge}</span>
                  <img src={product.image} alt={product.name} />
                </div>
                <div className="product-info">
                  <p className="product-category">{product.category}</p>
                  <h3>{product.name}</h3>
                  <div className="product-meta">
                    <div className="price-wrap">
                      <strong>${product.price}</strong>
                      <span>${product.oldPrice}</span>
                    </div>
                    <button type="button" className="add-button">
                      Add to cart
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="categories" id="categories">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Browse by style</p>
              <h2>Shop categories</h2>
            </div>
          </div>

          <div className="category-grid">
            {categories.map((category) => (
              <article key={category.name} className="category-card">
                <div className="category-icon">{category.icon}</div>
                <h3>{category.name}</h3>
                <p>{category.count}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="promo-banner" id="deals">
          <div className="promo-text">
            <p className="eyebrow">Smart shopping</p>
            <h2>Fresh arrivals for every lifestyle</h2>
            <p>
              Upgrade your everyday essentials with exciting new releases and premium picks
              selected just for you.
            </p>
          </div>
          <div className="promo-cta">
            <div className="mini-stat">
              <strong>220+</strong>
              <span>New items this week</span>
            </div>
            <div className="mini-stat">
              <strong>1.2k</strong>
              <span>Orders shipped</span>
            </div>
          </div>
        </section>

        <section className="highlights" id="about">
          <div className="section-heading section-heading-compact">
            <div>
              <p className="eyebrow">Why choose us</p>
              <h2>Built for seamless shopping</h2>
            </div>
          </div>

          <div className="highlight-grid">
            {highlights.map((item) => (
              <article key={item.title} className="highlight-card">
                <div className="highlight-icon">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="testimonials">
          <div className="section-heading section-heading-compact">
            <div>
              <p className="eyebrow">Customer love</p>
              <h2>What shoppers say</h2>
            </div>
          </div>

          <div className="testimonial-grid">
            {testimonials.map((item) => (
              <article key={item.name} className="testimonial-card">
                <div className="stars">{item.rating}</div>
                <p>{item.text}</p>
                <div className="testimonial-author">
                  <strong>{item.name}</strong>
                  <span>Verified Buyer</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="newsletter" id="contact">
          <div className="newsletter-copy">
            <p className="eyebrow">Stay in the loop</p>
            <h2>Get exclusive deals and fresh drops.</h2>
          </div>
          <form className="newsletter-form">
            <input type="email" placeholder="Enter your email" aria-label="Email address" />
            <button type="submit">Subscribe</button>
          </form>
        </section>
      </main>

      <footer className="site-footer">
        <div>
          <div className="logo footer-logo">
            Shop<span>Zone</span>
          </div>
          <p>Shop smarter with premium picks and everyday essentials.</p>
        </div>
        <div className="footer-links">
          <a href="#home">Home</a>
          <a href="#products">Products</a>
          <a href="#categories">Categories</a>
          <a href="#contact">Contact</a>
        </div>
      </footer>
    </div>
  );
}

export default App;