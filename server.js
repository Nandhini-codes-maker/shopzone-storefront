const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const environmentPath = path.join(__dirname, '.env');
if (fs.existsSync(environmentPath) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(environmentPath);
}

const express = require('express');
const cors = require('cors');
const { db, runTransaction, toProduct } = require('./database');

const app = express();
const PORT = Number(process.env.PORT || 4000);
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const COOKIE_NAME = 'shopzone_session';

app.use(cors({
  origin: (process.env.CLIENT_ORIGINS || 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((origin) => origin.trim()),
  credentials: true,
}));
app.use(express.json({ limit: '32kb' }));

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, expectedHex] = storedHash.split(':');
  if (!salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, 'hex');
  const actual = crypto.scryptSync(password, salt, expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(SESSION_DURATION_MS / 1000)}${secure}`,
  );
}

function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`);
}

function currentUser(req) {
  const cookieHeader = req.headers.cookie || '';
  const sessionCookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));

  if (!sessionCookie) return null;
  const token = sessionCookie.slice(COOKIE_NAME.length + 1);
  const session = db.prepare(`
    SELECT users.id, users.name, users.email, users.role
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `).get(hashToken(token), Date.now());
  return session || null;
}

function requireUser(req, res, next) {
  req.user = currentUser(req);
  if (!req.user) return res.status(401).json({ message: 'Please sign in to continue.' });
  next();
}

function requireAdmin(req, res, next) {
  req.user = currentUser(req);
  if (!req.user) return res.status(401).json({ message: 'Please sign in to continue.' });
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Administrator access is required.' });
  next();
}

function createSession(userId, res) {
  const token = crypto.randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run(hashToken(token), userId, Date.now() + SESSION_DURATION_MS);
  setSessionCookie(res, token);
}

function bootstrapAdmin() {
  const email = normalizeEmail(process.env.ADMIN_EMAIL);
  const password = process.env.ADMIN_PASSWORD;
  if (!email && !password) return;
  if (!email || !password || password.length < 12) {
    throw new Error('Set both ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) to configure the admin account.');
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  const passwordHash = hashPassword(password);
  if (existing) {
    db.prepare("UPDATE users SET role = 'admin', password_hash = ? WHERE id = ?").run(passwordHash, existing.id);
  } else {
    db.prepare("INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, 'admin')")
      .run(crypto.randomUUID(), 'ShopZone Admin', email, passwordHash);
  }
}

bootstrapAdmin();
db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());

function validateProduct(body) {
  const product = {
    name: typeof body.name === 'string' ? body.name.trim() : '',
    category: typeof body.category === 'string' ? body.category.trim() : '',
    price: Number(body.price),
    oldPrice: Number(body.oldPrice),
    badge: typeof body.badge === 'string' ? body.badge.trim() : '',
    image: typeof body.image === 'string' ? body.image.trim() : '',
    description: typeof body.description === 'string' ? body.description.trim() : '',
    featured: Boolean(body.featured),
  };
  if (!product.name || product.name.length > 120) return { error: 'Product name is required (max 120 characters).' };
  if (!product.category || product.category.length > 60) return { error: 'A product category is required (max 60 characters).' };
  if (!Number.isFinite(product.price) || product.price <= 0 || product.price > 1000000) return { error: 'Enter a valid product price.' };
  if (!Number.isFinite(product.oldPrice) || product.oldPrice < product.price || product.oldPrice > 1000000) {
    return { error: 'The old price must be greater than or equal to the current price.' };
  }
  if (
    Math.abs(product.price * 100 - Math.round(product.price * 100)) > 0.000001
    || Math.abs(product.oldPrice * 100 - Math.round(product.oldPrice * 100)) > 0.000001
  ) {
    return { error: 'Product prices can have no more than two decimal places.' };
  }
  if (!/^https?:\/\//i.test(product.image)) return { error: 'Product image must be an http or https URL.' };
  if (product.description.length > 2000) return { error: 'Product description is too long.' };
  return { product };
}

function createOrder(customer, user, provider, products) {
  const orderId = `SZ-${crypto.randomUUID()}`;
  const totalCents = products.reduce(
    (sum, item) => sum + Math.round(item.product.price * 100) * item.quantity,
    0,
  );
  const total = totalCents / 100;
  const addOrder = db.prepare(`
    INSERT INTO orders
      (id, user_id, email, customer_name, address, city, postal_code, payment_provider, status, total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `);
  const addItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity)
    VALUES (?, ?, ?, ?, ?)
  `);
  runTransaction(() => {
    addOrder.run(
      orderId,
      user ? user.id : null,
      customer.email,
      customer.name,
      customer.address,
      customer.city,
      customer.postalCode,
      provider,
      total,
    );
    for (const item of products) {
      addItem.run(orderId, item.product.id, item.product.name, item.product.price, item.quantity);
    }
  });
  return { orderId, total };
}

function loadOrderProducts(items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    return { error: 'Your cart is empty or contains too many different products.' };
  }
  const seen = new Set();
  const products = [];
  for (const item of items) {
    const id = typeof item.id === 'string' ? item.id : '';
    const quantity = Number(item.quantity);
    if (!id || seen.has(id) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return { error: 'The cart contains an invalid product or quantity.' };
    }
    seen.add(id);
    const product = toProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(id));
    if (!product) return { error: 'A product in your cart is no longer available.' };
    products.push({ product, quantity });
  }
  return { products };
}

function validateCustomer(body) {
  if (!body || typeof body !== 'object') return { error: 'Complete customer details are required.' };
  const customer = {
    name: typeof body.name === 'string' ? body.name.trim() : '',
    email: normalizeEmail(body.email),
    address: typeof body.address === 'string' ? body.address.trim() : '',
    city: typeof body.city === 'string' ? body.city.trim() : '',
    postalCode: typeof body.postalCode === 'string' ? body.postalCode.trim() : '',
  };
  if (!customer.name || customer.name.length > 120) return { error: 'Enter a valid full name.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email) || customer.email.length > 254) return { error: 'Enter a valid email address.' };
  if (!customer.address || customer.address.length > 250) return { error: 'Enter a valid street address.' };
  if (!customer.city || customer.city.length > 100) return { error: 'Enter a valid city.' };
  if (!customer.postalCode || customer.postalCode.length > 30) return { error: 'Enter a valid postal code.' };
  return { customer };
}

function getFrontendUrl() {
  return (process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
}

async function stripeRequest(path, parameters) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: parameters ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      ...(parameters ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: parameters ? parameters.toString() : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message || 'Stripe could not process the request.');
  return result;
}

async function paypalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('PayPal is not configured on the server.');
  const baseUrl = process.env.PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error_description || 'PayPal authentication failed.');
  return { baseUrl, accessToken: result.access_token };
}

async function paypalRequest(baseUrl, accessToken, path, body, requestId) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(requestId ? { 'PayPal-Request-Id': requestId } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'PayPal could not process the request.');
  return result;
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ShopZone API is running' });
});

app.get('/api/products', (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY created_at, name').all().map(toProduct);
  res.json({ products });
});

app.get('/api/products/:id', (req, res) => {
  const product = toProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id));
  if (!product) return res.status(404).json({ message: 'Product not found.' });
  return res.json({ product });
});

app.post('/api/auth/register', (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;
  if (!name || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Enter a valid name and email address.' });
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return res.status(400).json({ message: 'Password must be between 8 and 128 characters.' });
  }
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
    return res.status(409).json({ message: 'An account with that email already exists.' });
  }
  const user = { id: crypto.randomUUID(), name, email, role: 'customer' };
  db.prepare('INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)')
    .run(user.id, user.name, user.email, hashPassword(password));
  createSession(user.id, res);
  return res.status(201).json({ user });
});

app.post('/api/auth/login', (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || typeof password !== 'string' || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ message: 'Email or password is incorrect.' });
  }
  createSession(user.id, res);
  return res.json({ user: publicUser(user) });
});

app.get('/api/auth/me', (req, res) => {
  const user = currentUser(req);
  return res.json({ user: user ? publicUser(user) : null });
});

app.post('/api/auth/logout', (req, res) => {
  const cookieHeader = req.headers.cookie || '';
  const sessionCookie = cookieHeader.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  if (sessionCookie) {
    const token = sessionCookie.slice(COOKIE_NAME.length + 1);
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
  }
  clearSessionCookie(res);
  return res.json({ message: 'Signed out.' });
});

app.get('/api/orders/mine', requireUser, (req, res) => {
  const orders = db.prepare(`
    SELECT id, payment_provider AS paymentProvider, status, total, created_at AS createdAt
    FROM orders
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(req.user.id);
  return res.json({ orders });
});

app.post('/api/payments/:provider/create', async (req, res) => {
  const provider = req.params.provider;
  if (provider !== 'stripe' && provider !== 'paypal') {
    return res.status(400).json({ message: 'Choose Stripe or PayPal to continue.' });
  }
  const validatedCustomer = validateCustomer(req.body?.customer);
  if (validatedCustomer.error) return res.status(400).json({ message: validatedCustomer.error });
  const loaded = loadOrderProducts(req.body?.items);
  if (loaded.error) return res.status(400).json({ message: loaded.error });
  if (provider === 'stripe' && !process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({ message: 'Stripe is not configured. Add STRIPE_SECRET_KEY to the backend environment.' });
  }
  if (provider === 'paypal' && (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET)) {
    return res.status(503).json({ message: 'PayPal is not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to the backend environment.' });
  }
  const user = currentUser(req);
  const order = createOrder(validatedCustomer.customer, user, provider, loaded.products);

  try {
    if (provider === 'stripe') {
      const parameters = new URLSearchParams();
      parameters.set('mode', 'payment');
      parameters.set('customer_email', validatedCustomer.customer.email);
      parameters.set('success_url', `${getFrontendUrl()}/payment-result?provider=stripe&orderId=${encodeURIComponent(order.orderId)}&session_id={CHECKOUT_SESSION_ID}`);
      parameters.set('cancel_url', `${getFrontendUrl()}/checkout?payment=cancelled`);
      parameters.set('client_reference_id', order.orderId);
      parameters.set('metadata[orderId]', order.orderId);
      loaded.products.forEach(({ product, quantity }, index) => {
        parameters.set(`line_items[${index}][quantity]`, String(quantity));
        parameters.set(`line_items[${index}][price_data][currency]`, 'usd');
        parameters.set(`line_items[${index}][price_data][unit_amount]`, String(Math.round(product.price * 100)));
        parameters.set(`line_items[${index}][price_data][product_data][name]`, product.name);
      });
      const session = await stripeRequest('checkout/sessions', parameters);
      db.prepare('UPDATE orders SET payment_reference = ? WHERE id = ?').run(session.id, order.orderId);
      return res.status(201).json({ redirectUrl: session.url });
    }

    const { baseUrl, accessToken } = await paypalAccessToken();
    const paypalOrder = await paypalRequest(baseUrl, accessToken, '/v2/checkout/orders', {
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: order.orderId,
        custom_id: order.orderId,
        description: `ShopZone order ${order.orderId}`,
        amount: {
          currency_code: 'USD',
          value: order.total.toFixed(2),
          breakdown: {
            item_total: { currency_code: 'USD', value: order.total.toFixed(2) },
          },
        },
        items: loaded.products.map(({ product, quantity }) => ({
          name: product.name.slice(0, 127),
          quantity: String(quantity),
          unit_amount: { currency_code: 'USD', value: product.price.toFixed(2) },
        })),
      }],
      application_context: {
        brand_name: 'ShopZone',
        user_action: 'PAY_NOW',
        return_url: `${getFrontendUrl()}/payment-result?provider=paypal&orderId=${encodeURIComponent(order.orderId)}`,
        cancel_url: `${getFrontendUrl()}/checkout?payment=cancelled`,
      },
    }, order.orderId.slice(0, 38));
    const approval = paypalOrder.links?.find((link) => link.rel === 'approve');
    if (!approval) throw new Error('PayPal did not return an approval link.');
    db.prepare('UPDATE orders SET payment_reference = ? WHERE id = ?').run(paypalOrder.id, order.orderId);
    return res.status(201).json({ redirectUrl: approval.href });
  } catch (error) {
    db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(order.orderId);
    console.error(`${provider} checkout creation failed:`, error.message);
    return res.status(502).json({ message: `${provider === 'stripe' ? 'Stripe' : 'PayPal'} checkout could not be started. Check the provider credentials and try again.` });
  }
});

app.post('/api/payments/stripe/confirm', async (req, res) => {
  const orderId = typeof req.body?.orderId === 'string' ? req.body.orderId : '';
  const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId : '';
  if (!orderId || !sessionId || !process.env.STRIPE_SECRET_KEY) {
    return res.status(400).json({ message: 'The Stripe payment reference is invalid.' });
  }
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND payment_provider = ?').get(orderId, 'stripe');
  if (!order || order.payment_reference !== sessionId) {
    return res.status(404).json({ message: 'Order not found for this Stripe payment.' });
  }
  try {
    const session = await stripeRequest(`checkout/sessions/${encodeURIComponent(sessionId)}`);
    if (
      session.metadata?.orderId !== orderId
      || session.payment_status !== 'paid'
      || session.currency !== 'usd'
      || session.amount_total !== Math.round(order.total * 100)
    ) {
      return res.status(409).json({ message: 'Stripe has not confirmed this payment yet.' });
    }
    db.prepare("UPDATE orders SET status = 'paid' WHERE id = ?").run(orderId);
    return res.json({ orderId, status: 'paid' });
  } catch (error) {
    console.error('Stripe payment confirmation failed:', error.message);
    return res.status(502).json({ message: 'Unable to verify the Stripe payment right now.' });
  }
});

app.post('/api/payments/paypal/capture', async (req, res) => {
  const orderId = typeof req.body?.orderId === 'string' ? req.body.orderId : '';
  const paypalOrderId = typeof req.body?.paypalOrderId === 'string' ? req.body.paypalOrderId : '';
  if (!orderId || !paypalOrderId) return res.status(400).json({ message: 'The PayPal payment reference is invalid.' });
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND payment_provider = ?').get(orderId, 'paypal');
  if (!order || order.payment_reference !== paypalOrderId) {
    return res.status(404).json({ message: 'Order not found for this PayPal payment.' });
  }
  if (order.status === 'paid') return res.json({ orderId, status: 'paid' });
  try {
    const { baseUrl, accessToken } = await paypalAccessToken();
    let payment = await paypalRequest(
      baseUrl,
      accessToken,
      `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`,
    );
    const purchaseUnit = payment.purchase_units?.[0];
    if (purchaseUnit?.custom_id !== orderId || purchaseUnit?.amount?.currency_code !== 'USD'
      || Number(purchaseUnit.amount.value).toFixed(2) !== Number(order.total).toFixed(2)) {
      return res.status(409).json({ message: 'The PayPal order does not match this ShopZone order.' });
    }
    if (payment.status === 'APPROVED') {
      payment = await paypalRequest(
        baseUrl,
        accessToken,
        `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
        {},
        `${orderId.slice(0, 34)}-capture`,
      );
    }
    const capture = payment.purchase_units?.[0]?.payments?.captures?.[0];
    if (
      payment.status !== 'COMPLETED'
      || payment.purchase_units?.[0]?.custom_id !== orderId
      || capture?.status !== 'COMPLETED'
      || capture.amount?.currency_code !== 'USD'
      || Number(capture.amount.value).toFixed(2) !== Number(order.total).toFixed(2)
    ) {
      return res.status(409).json({ message: 'PayPal has not completed this payment.' });
    }
    db.prepare("UPDATE orders SET status = 'paid' WHERE id = ?").run(orderId);
    return res.json({ orderId, status: 'paid' });
  } catch (error) {
    console.error('PayPal payment capture failed:', error.message);
    return res.status(502).json({ message: 'Unable to capture the PayPal payment right now.' });
  }
});

app.get('/api/admin/products', requireAdmin, (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY name').all().map(toProduct);
  return res.json({ products });
});

app.post('/api/admin/products', requireAdmin, (req, res) => {
  const validated = validateProduct(req.body || {});
  if (validated.error) return res.status(400).json({ message: validated.error });
  const id = `product-${crypto.randomUUID()}`;
  const product = validated.product;
  db.prepare(`
    INSERT INTO products (id, name, category, price, old_price, badge, image, description, featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, product.name, product.category, product.price, product.oldPrice, product.badge, product.image, product.description, Number(product.featured));
  return res.status(201).json({ product: toProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(id)) });
});

app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
  const validated = validateProduct(req.body || {});
  if (validated.error) return res.status(400).json({ message: validated.error });
  const product = validated.product;
  const result = db.prepare(`
    UPDATE products
    SET name = ?, category = ?, price = ?, old_price = ?, badge = ?, image = ?, description = ?, featured = ?
    WHERE id = ?
  `).run(product.name, product.category, product.price, product.oldPrice, product.badge, product.image, product.description, Number(product.featured), req.params.id);
  if (!result.changes) return res.status(404).json({ message: 'Product not found.' });
  return res.json({ product: toProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)) });
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ message: 'Product not found.' });
  return res.status(204).end();
});

app.get('/api/admin/orders', requireAdmin, (req, res) => {
  const orders = db.prepare(`
    SELECT id, email, customer_name AS customerName, payment_provider AS paymentProvider,
           status, total, created_at AS createdAt
    FROM orders
    ORDER BY created_at DESC
    LIMIT 200
  `).all();
  const stats = db.prepare(`
    SELECT COUNT(*) AS orderCount,
           COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0) AS paidRevenue
    FROM orders
  `).get();
  return res.json({ orders, stats });
});

app.use((error, req, res, next) => {
  console.error('Unhandled API error:', error);
  if (res.headersSent) return next(error);
  return res.status(500).json({ message: 'An unexpected server error occurred.' });
});

app.listen(PORT, () => {
  console.log(`ShopZone backend running on http://localhost:${PORT}`);
});
