import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Link, NavLink, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import './Storefront.css';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/products', label: 'Products' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
  { to: '/account', label: 'Account' },
];

const featurePills = [
  { title: 'Free Shipping', text: 'On orders over $49' },
  { title: '30-Day Returns', text: 'Easy and fast exchange' },
  { title: 'Secure Pay', text: 'Protected checkout' },
  { title: '24/7 Support', text: 'Always here to help' },
];

const categories = [
  { name: 'Fashion', icon: '👗', count: '320 items' },
  { name: 'Electronics', icon: '🎧', count: '180 items' },
  { name: 'Home Decor', icon: '🏠', count: '140 items' },
  { name: 'Beauty', icon: '💄', count: '96 items' },
];

const testimonials = [
  { name: 'Emma W.', rating: '★★★★★', text: 'The quality is excellent and delivery was super fast. My order arrived in two days.' },
  { name: 'Daniel K.', rating: '★★★★★', text: 'I love the curated selection. Everything looks premium and the checkout process is smooth.' },
  { name: 'Sarah P.', rating: '★★★★★', text: 'Best online shopping experience I’ve had. Their support team was responsive and helpful.' },
];

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);

function StorefrontApp() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState(() => {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const cached = JSON.parse(localStorage.getItem('shopzone-cart') || '[]');
      return Array.isArray(cached) ? cached : [];
    } catch {
      return [];
    }
  });
  const [notice, setNotice] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('shopzone-cart', JSON.stringify(cart));
    }
  }, [cart]);

  useEffect(() => {
    fetch('/api/products')
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load products.');
        return response.json();
      })
      .then((data) => setProducts(data.products))
      .catch((error) => console.error('Failed to fetch products:', error));
  }, []);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((response) => {
        if (!response.ok) throw new Error('Unable to check account session.');
        return response.json();
      })
      .then((data) => setUser(data.user))
      .catch((error) => console.error('Failed to check session:', error));
  }, []);

  const addToCart = (product) => {
    setCart((currentCart) => {
      const existing = currentCart.find((item) => item.id === product.id);

      if (existing) {
        return currentCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [
        ...currentCart,
        {
          id: product.id,
          name: product.name,
          image: product.image,
          price: product.price,
          quantity: 1,
        },
      ];
    });

    setNotice(`${product.name} added to cart`);
    if (typeof window !== 'undefined') {
      window.clearTimeout(window.shopzoneNoticeTimer);
      window.shopzoneNoticeTimer = window.setTimeout(() => setNotice(''), 2000);
    }
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <BrowserRouter>
      <div className="storefront-shell">
        <header className="navbar">
          <Link to="/" className="logo">Shop<span>Zone</span></Link>

          <nav className="nav-links" aria-label="Main navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <Link to="/cart" className="cart-button">
            🛒 Cart <span>{cartCount}</span>
          </Link>
          {user?.role === 'admin' ? <Link to="/admin" className="nav-link">Admin</Link> : null}
        </header>

        <main>
          <Routes>
            <Route path="/" element={<HomePage products={products} addToCart={addToCart} />} />
            <Route path="/products" element={<ProductsPage products={products} addToCart={addToCart} />} />
            <Route path="/product/:id" element={<ProductDetailPage products={products} addToCart={addToCart} />} />
            <Route path="/cart" element={<CartPage cart={cart} setCart={setCart} subtotal={subtotal} />} />
            <Route path="/checkout" element={<CheckoutPage cart={cart} subtotal={subtotal} />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/account" element={<AccountPage user={user} setUser={setUser} />} />
            <Route path="/login" element={<AuthPage mode="login" setUser={setUser} />} />
            <Route path="/register" element={<AuthPage mode="register" setUser={setUser} />} />
            <Route path="/admin" element={<AdminPage user={user} />} />
            <Route path="/payment-result" element={<PaymentResultPage setCart={setCart} />} />
          </Routes>
        </main>

        <footer className="site-footer">
          <div>
            <div className="logo footer-logo">Shop<span>Zone</span></div>
            <p>Shop smarter with premium picks and everyday essentials.</p>
          </div>

          <div className="footer-links">
            <Link to="/">Home</Link>
            <Link to="/products">Products</Link>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
          </div>
        </footer>

        {notice ? <div className="toast">{notice}</div> : null}
      </div>
    </BrowserRouter>
  );
}

function HomePage({ products, addToCart }) {
  const featured = (products || []).filter((product) => product.featured).slice(0, 3);

  return (
    <>
      <section className="hero" id="home">
        <div className="hero-content">
          <p className="eyebrow hero-eyebrow">WELCOME TO SHOPZONE</p>
          <h1>
            Discover Your
            <br />
            <span>Perfect Products</span>
          </h1>
          <p className="hero-description">
            Explore the latest fashion, electronics and accessories at amazing prices with premium
            quality and style that fits your everyday life.
          </p>

          <div className="hero-actions">
            <Link to="/products" className="shop-button">Shop Now <span>→</span></Link>
            <Link to="/about" className="secondary-button">Learn More</Link>
          </div>

          <div className="hero-stats">
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

        <div className="hero-visual">
          <div className="image-card main-card">
            <img src="https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=900" alt="Woman shopping online" />
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

      <section className="products">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Popular picks</p>
            <h2>Featured products</h2>
          </div>
          <Link to="/products" className="view-all">View all</Link>
        </div>

        <div className="product-grid">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} addToCart={addToCart} />
          ))}
        </div>
      </section>

      <section className="categories">
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
            Upgrade your everyday essentials with exciting new releases and premium picks selected just for you.
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
          {featurePills.map((item, index) => (
            <article key={item.title} className="highlight-card">
              <div className="highlight-icon">{['⚡', '✨', '✅', '💬'][index]}</div>
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
    </>
  );
}

function ProductsPage({ products, addToCart }) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('featured');

  const categoryList = useMemo(
    () => ['All', ...new Set((products || []).map((product) => product.category))],
    [products],
  );

  const visibleProducts = useMemo(() => {
    const matching = products.filter((product) => {
      const query = search.trim().toLowerCase();
      const matchesQuery = !query || `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(query);
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      const matchesMin = minPrice === '' || product.price >= Number(minPrice);
      const matchesMax = maxPrice === '' || product.price <= Number(maxPrice);
      return matchesQuery && matchesCategory && matchesMin && matchesMax;
    });
    return matching.sort((left, right) => {
      if (sortBy === 'price-low') return left.price - right.price;
      if (sortBy === 'price-high') return right.price - left.price;
      if (sortBy === 'name') return left.name.localeCompare(right.name);
      if (sortBy === 'rating') return right.rating - left.rating;
      return Number(right.featured) - Number(left.featured);
    });
  }, [products, selectedCategory, search, minPrice, maxPrice, sortBy]);

  return (
    <section className="catalog-page">
      <div className="page-intro">
        <p className="eyebrow">Curated collection</p>
        <h1>Shop our products</h1>
      </div>

      <div className="catalog-filters">
        <label className="catalog-search">
          <span>Search products</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, category, or details"
          />
        </label>
        <label>
          <span>Min price</span>
          <input type="number" min="0" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} />
        </label>
        <label>
          <span>Max price</span>
          <input type="number" min="0" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} />
        </label>
        <label>
          <span>Sort by</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="featured">Featured</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
            <option value="rating">Top rated</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>

      <div className="catalog-toolbar">
        {categoryList.map((category) => (
          <button
            key={category}
            type="button"
            className={selectedCategory === category ? 'category-tab active' : 'category-tab'}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="product-grid product-grid-large">
        {visibleProducts.length
          ? visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} addToCart={addToCart} />
            ))
          : <p className="catalog-empty">No products match those filters. Try changing your search.</p>}
      </div>
    </section>
  );
}

function ProductCard({ product, addToCart }) {
  return (
    <article className="product-card">
      <div className="product-image-wrap">
        <span className="product-badge">{product.badge}</span>
        <Link to={`/product/${product.id}`}>
          <img src={product.image} alt={product.name} />
        </Link>
      </div>

      <div className="product-info">
        <p className="product-category">{product.category}</p>
        <Link to={`/product/${product.id}`} className="product-title-link">
          <h3>{product.name}</h3>
        </Link>

        <div className="product-meta">
          <div className="price-wrap">
            <strong>{formatCurrency(product.price)}</strong>
            <span>{formatCurrency(product.oldPrice)}</span>
          </div>
          <button type="button" className="add-button" onClick={() => addToCart(product)}>
            Add to cart
          </button>
        </div>
      </div>
    </article>
  );
}

function ProductDetailPage({ products, addToCart }) {
  const { id } = useParams();
  const product = (products || []).find((item) => item.id === id);

  if (!product) {
    return (
      <section className="empty-state">
        <p>Product not found.</p>
        <Link to="/products">Back to products</Link>
      </section>
    );
  }

  return (
    <section className="product-detail">
      <div className="detail-image-wrap">
        <img src={product.image} alt={product.name} />
      </div>

      <div className="detail-content">
        <p className="eyebrow">{product.category}</p>
        <h1>{product.name}</h1>
        <div className="detail-rating">
          <span>⭐ {product.rating}</span>
          <span>{product.reviews} reviews</span>
        </div>

        <div className="detail-price-row">
          <strong>{formatCurrency(product.price)}</strong>
          <span>{formatCurrency(product.oldPrice)}</span>
        </div>

        <p className="detail-description">{product.description}</p>

        <div className="detail-actions">
          <button type="button" className="shop-button detail-button" onClick={() => addToCart(product)}>
            Add to cart
          </button>
          <Link to="/products" className="secondary-button detail-link">Continue shopping</Link>
        </div>
      </div>
    </section>
  );
}

function CartPage({ cart, setCart, subtotal }) {
  const updateQuantity = (id, delta) => {
    setCart((current) =>
      current
        .map((item) => (item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item))
        .filter((item) => item.quantity > 0),
    );
  };

  if (!cart.length) {
    return (
      <section className="empty-state">
        <h1>Your cart is empty</h1>
        <Link to="/products">Browse products</Link>
      </section>
    );
  }

  return (
    <section className="cart-page">
      <div className="page-intro">
        <p className="eyebrow">Your basket</p>
        <h1>Shopping cart</h1>
      </div>

      <div className="cart-layout">
        <div className="cart-items">
          {cart.map((item) => (
            <div key={item.id} className="cart-item">
              <img src={item.image} alt={item.name} />

              <div className="cart-item-main">
                <h3>{item.name}</h3>
                <p>{formatCurrency(item.price)} each</p>
              </div>

              <div className="quantity-control">
                <button type="button" onClick={() => updateQuantity(item.id, -1)}>-</button>
                <span>{item.quantity}</span>
                <button type="button" onClick={() => updateQuantity(item.id, 1)}>+</button>
              </div>

              <strong>{formatCurrency(item.price * item.quantity)}</strong>
            </div>
          ))}
        </div>

        <aside className="summary-box">
          <h3>Order summary</h3>
          <div className="summary-row">
            <span>Subtotal</span>
            <strong>{formatCurrency(subtotal)}</strong>
          </div>
          <div className="summary-row">
            <span>Shipping</span>
            <strong>Free</strong>
          </div>
          <div className="summary-row total-row">
            <span>Total</span>
            <strong>{formatCurrency(subtotal)}</strong>
          </div>
          <Link to="/checkout" className="shop-button checkout-button">Proceed to checkout</Link>
        </aside>
      </div>
    </section>
  );
}

function CheckoutPage({ cart, subtotal }) {
  const [form, setForm] = useState({ name: '', email: '', address: '', city: '', postalCode: '' });
  const [statusMessage, setStatusMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const provider = event.nativeEvent.submitter?.value;
    if (provider !== 'stripe' && provider !== 'paypal') {
      setStatusMessage('Choose Stripe or PayPal to continue.');
      return;
    }
    setSubmitting(true);
    setStatusMessage('');
    try {
      const response = await fetch(`/api/payments/${provider}/create`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((item) => ({ id: item.id, quantity: item.quantity })),
          customer: form,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setStatusMessage(result.message || 'Checkout could not be started.');
        return;
      }
      if (!result.redirectUrl) {
        setStatusMessage('The payment provider did not return a checkout link.');
        return;
      }
      window.location.assign(result.redirectUrl);
    } catch (error) {
      console.error('Unable to start payment checkout:', error);
      setStatusMessage('Could not connect to checkout. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!cart.length) {
    return (
      <section className="empty-state">
        <h1>Your cart is empty</h1>
        <Link to="/products">Shop now</Link>
      </section>
    );
  }

  return (
    <section className="checkout-page">
      <div className="page-intro">
        <p className="eyebrow">Secure checkout</p>
        <h1>Complete your order</h1>
      </div>

      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={handleSubmit}>
          <label>
            Full name
            <input name="name" value={form.name} onChange={handleChange} placeholder="John Doe" required />
          </label>

          <label>
            Email
            <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="john@example.com" required />
          </label>

          <label>
            Street address
            <input name="address" value={form.address} onChange={handleChange} placeholder="123 Market Street" required />
          </label>

          <div className="input-row">
            <label>
              City
              <input name="city" value={form.city} onChange={handleChange} placeholder="New York" required />
            </label>
            <label>
              Postal code
              <input name="postalCode" value={form.postalCode} onChange={handleChange} placeholder="10001" required />
            </label>
          </div>

          <div className="payment-actions">
            <button type="submit" name="provider" value="stripe" className="shop-button checkout-submit" disabled={submitting}>
              {submitting ? 'Connecting…' : 'Pay with Stripe'}
            </button>
            <button type="submit" name="provider" value="paypal" className="secondary-button" disabled={submitting}>
              {submitting ? 'Connecting…' : 'Pay with PayPal'}
            </button>
          </div>
          {statusMessage ? <p className="checkout-status">{statusMessage}</p> : null}
        </form>

        <aside className="summary-box">
          <h3>Order summary</h3>
          {cart.map((item) => (
            <div key={item.id} className="summary-item">
              <span>
                {item.name} x {item.quantity}
              </span>
              <strong>{formatCurrency(item.price * item.quantity)}</strong>
            </div>
          ))}

          <div className="summary-row total-row">
            <span>Total</span>
            <strong>{formatCurrency(subtotal)}</strong>
          </div>
        </aside>
      </div>
    </section>
  );
}

function PaymentResultPage({ setCart }) {
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState('Confirming your payment…');
  const [confirmed, setConfirmed] = useState(false);
  const provider = searchParams.get('provider');
  const orderId = searchParams.get('orderId');
  const sessionId = searchParams.get('session_id');
  const paypalOrderId = searchParams.get('token');
  const invalidRequest = !orderId || (provider !== 'stripe' && provider !== 'paypal');

  useEffect(() => {
    let cancelled = false;
    if (invalidRequest) return () => { cancelled = true; };
    const request = provider === 'stripe'
      ? {
          url: '/api/payments/stripe/confirm',
          body: { orderId, sessionId },
        }
      : {
          url: '/api/payments/paypal/capture',
          body: { orderId, paypalOrderId },
        };

    fetch(request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.body),
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Payment confirmation failed.');
        if (!cancelled) {
          setCart([]);
          setConfirmed(true);
          setMessage(`Payment complete. Your order reference is ${result.orderId}.`);
        }
      })
      .catch((error) => {
        if (!cancelled) setMessage(error.message || 'We could not confirm the payment. Please check your orders.');
      });

    return () => { cancelled = true; };
  }, [provider, orderId, sessionId, paypalOrderId, invalidRequest, setCart]);

  return (
    <section className="empty-state payment-result">
      <h1>{confirmed ? 'Thank you for your order!' : 'Payment status'}</h1>
      <p>{invalidRequest ? 'The payment return link is incomplete. Check your account orders or contact support.' : message}</p>
      <Link to={confirmed ? '/products' : '/account'}>{confirmed ? 'Continue shopping' : 'View account'}</Link>
    </section>
  );
}

function AuthPage({ mode, setUser }) {
  const navigate = useNavigate();
  const isRegister = mode === 'register';
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const response = await fetch(`/api/auth/${isRegister ? 'register' : 'login'}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to sign in.');
      setUser(result.user);
      navigate(result.user.role === 'admin' ? '/admin' : '/account');
    } catch (requestError) {
      setError(requestError.message || 'Unable to connect to the account service.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="account-page">
      <div className="page-intro">
        <p className="eyebrow">{isRegister ? 'Create your account' : 'Welcome back'}</p>
        <h1>{isRegister ? 'Join ShopZone' : 'Sign in'}</h1>
      </div>
      <form className="checkout-form account-form" onSubmit={handleSubmit}>
        {isRegister ? (
          <label>
            Full name
            <input
              name="name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              autoComplete="name"
              required
            />
          </label>
        ) : null}
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            autoComplete="email"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            minLength={isRegister ? 8 : undefined}
            required
          />
        </label>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <button type="submit" className="shop-button checkout-submit" disabled={submitting}>
          {submitting ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
        </button>
        <p className="account-switch">
          {isRegister ? 'Already have an account?' : 'New to ShopZone?'}{' '}
          <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create an account'}</Link>
        </p>
      </form>
    </section>
  );
}

function AccountPage({ user, setUser }) {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    fetch('/api/orders/mine', { credentials: 'include' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Unable to load orders.');
        setOrders(result.orders);
      })
      .catch((requestError) => setError(requestError.message));
  }, [user]);

  const signOut = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      if (!response.ok) throw new Error('Sign out failed. Please try again.');
      setUser(null);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  if (!user) {
    return (
      <section className="account-page">
        <div className="page-intro">
          <p className="eyebrow">Your ShopZone account</p>
          <h1>Sign in to see your orders</h1>
        </div>
        <div className="account-actions">
          <Link to="/login" className="shop-button">Sign in</Link>
          <Link to="/register" className="secondary-button">Create account</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="account-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Your account</p>
          <h1>Hello, {user.name}</h1>
        </div>
        <button type="button" className="secondary-button" onClick={signOut}>Sign out</button>
      </div>
      {user.role === 'admin' ? <Link className="account-admin-link" to="/admin">Open admin dashboard →</Link> : null}
      <h2 className="account-section-title">Your orders</h2>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {orders.length ? (
        <div className="account-orders">
          {orders.map((order) => (
            <article key={order.id} className="account-order">
              <div><strong>{order.id}</strong><span>{new Date(order.createdAt).toLocaleString()}</span></div>
              <span className={`order-status status-${order.status}`}>{order.status}</span>
              <span>{order.paymentProvider}</span>
              <strong>{formatCurrency(order.total)}</strong>
            </article>
          ))}
        </div>
      ) : <p className="catalog-empty">Your orders will appear here after checkout.</p>}
    </section>
  );
}

const emptyProductForm = {
  name: '',
  category: '',
  price: '',
  oldPrice: '',
  badge: '',
  image: '',
  description: '',
  featured: false,
};

function AdminPage({ user }) {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderStats, setOrderStats] = useState({ orderCount: 0, paidRevenue: 0 });
  const [form, setForm] = useState(emptyProductForm);
  const [editingId, setEditingId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    const [productsResponse, ordersResponse] = await Promise.all([
      fetch('/api/admin/products', { credentials: 'include' }),
      fetch('/api/admin/orders', { credentials: 'include' }),
    ]);
    const productsData = await productsResponse.json();
    const ordersData = await ordersResponse.json();
    if (!productsResponse.ok || !ordersResponse.ok) {
      throw new Error(productsData.message || ordersData.message || 'Unable to load the admin dashboard.');
    }
    setProducts(productsData.products);
    setOrders(ordersData.orders);
    setOrderStats(ordersData.stats);
  };

  useEffect(() => {
    if (user?.role !== 'admin') return;
    // Dashboard state is populated from these authenticated API requests.
    // oxlint-disable-next-line react/set-state-in-effect
    loadDashboard().catch((requestError) => setError(requestError.message));
  }, [user]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    const endpoint = editingId ? `/api/admin/products/${editingId}` : '/api/admin/products';
    try {
      const response = await fetch(endpoint, {
        method: editingId ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, price: Number(form.price), oldPrice: Number(form.oldPrice) }),
      });
      const result = response.status === 204 ? {} : await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to save this product.');
      setForm(emptyProductForm);
      setEditingId('');
      setMessage(editingId ? 'Product updated.' : 'Product added.');
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.message || 'Unable to save this product.');
    }
  };

  const editProduct = (product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      category: product.category,
      price: String(product.price),
      oldPrice: String(product.oldPrice),
      badge: product.badge,
      image: product.image,
      description: product.description,
      featured: product.featured,
    });
    setMessage('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteProduct = async (product) => {
    if (!window.confirm(`Delete ${product.name}?`)) return;
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Unable to delete this product.');
      }
      setMessage('Product deleted.');
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  if (!user) {
    return <section className="empty-state"><h1>Sign in to continue</h1><Link to="/login">Go to sign in</Link></section>;
  }
  if (user.role !== 'admin') {
    return <section className="empty-state"><h1>Administrator access required</h1><Link to="/">Return to the store</Link></section>;
  }

  return (
    <section className="admin-page">
      <div className="page-intro">
        <p className="eyebrow">ShopZone management</p>
        <h1>Admin dashboard</h1>
      </div>
      <div className="admin-stats">
        <article className="info-card"><span>Products</span><strong>{products.length}</strong></article>
        <article className="info-card"><span>Orders</span><strong>{orderStats.orderCount}</strong></article>
        <article className="info-card"><span>Paid revenue</span><strong>{formatCurrency(orderStats.paidRevenue)}</strong></article>
      </div>
      <h2 className="account-section-title">{editingId ? 'Edit product' : 'Add a product'}</h2>
      <form className="checkout-form admin-product-form" onSubmit={handleSubmit}>
        <label>Product name<input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required maxLength={120} /></label>
        <label>Category<input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} required maxLength={60} /></label>
        <div className="input-row">
          <label>Price (USD)<input type="number" min="0.01" step="0.01" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} required /></label>
          <label>Previous price (USD)<input type="number" min="0" step="0.01" value={form.oldPrice} onChange={(event) => setForm((current) => ({ ...current, oldPrice: event.target.value }))} required /></label>
        </div>
        <label>Badge<input value={form.badge} onChange={(event) => setForm((current) => ({ ...current, badge: event.target.value }))} maxLength={60} /></label>
        <label>Image URL<input type="url" value={form.image} onChange={(event) => setForm((current) => ({ ...current, image: event.target.value }))} required /></label>
        <label>Description<textarea rows="3" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} maxLength={2000} /></label>
        <label className="checkbox-label"><input type="checkbox" checked={form.featured} onChange={(event) => setForm((current) => ({ ...current, featured: event.target.checked }))} /> Feature on homepage</label>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        {message ? <p className="checkout-status" role="status">{message}</p> : null}
        <div className="admin-actions">
          <button type="submit" className="shop-button checkout-submit">{editingId ? 'Save changes' : 'Add product'}</button>
          {editingId ? <button type="button" className="secondary-button" onClick={() => { setEditingId(''); setForm(emptyProductForm); }}>Cancel edit</button> : null}
        </div>
      </form>

      <h2 className="account-section-title">Products</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Actions</th></tr></thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td><td>{product.category}</td><td>{formatCurrency(product.price)}</td>
                <td><div className="admin-actions"><button type="button" className="category-tab" onClick={() => editProduct(product)}>Edit</button><button type="button" className="category-tab danger-button" onClick={() => deleteProduct(product)}>Delete</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="account-section-title">Recent orders</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Order</th><th>Customer</th><th>Payment</th><th>Status</th><th>Total</th></tr></thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.id}</td><td>{order.customerName}<br /><small>{order.email}</small></td>
                <td>{order.paymentProvider}</td><td>{order.status}</td><td>{formatCurrency(order.total)}</td>
              </tr>
            ))}
            {!orders.length ? <tr><td colSpan="5">No orders yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AboutPage() {
  return (
    <section className="info-page">
      <div className="page-intro">
        <p className="eyebrow">About us</p>
        <h1>Designed around everyday living</h1>
      </div>

      <div className="info-grid">
        <article className="info-card">
          <h3>Our mission</h3>
          <p>We curate premium essentials that blend convenience, style, and quality for modern life.</p>
        </article>
        <article className="info-card">
          <h3>Why shoppers trust us</h3>
          <p>Thoughtful product selection, transparent pricing, and customer-first support from order to delivery.</p>
        </article>
        <article className="info-card">
          <h3>Fast shipping</h3>
          <p>Quick dispatch, reliable packaging, and friendly service across every order we fulfill.</p>
        </article>
      </div>
    </section>
  );
}

function ContactPage() {
  return (
    <section className="info-page">
      <div className="page-intro">
        <p className="eyebrow">Contact</p>
        <h1>We’d love to hear from you</h1>
      </div>

      <div className="contact-grid">
        <article className="info-card">
          <h3>Email</h3>
          <p>hello@shopzone.com</p>
        </article>
        <article className="info-card">
          <h3>Phone</h3>
          <p>+1 (800) 555-0147</p>
        </article>
        <article className="info-card">
          <h3>Address</h3>
          <p>245 Market Street, New York, NY</p>
        </article>
      </div>
    </section>
  );
}

export default StorefrontApp;
