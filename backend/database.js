const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const dataDirectory = path.join(__dirname, 'data');
fs.mkdirSync(dataDirectory, { recursive: true });

const databasePath = process.env.DATABASE_PATH || path.join(dataDirectory, 'shopzone.sqlite');
const db = new DatabaseSync(databasePath);

function runTransaction(operation) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = operation();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL CHECK (price >= 0),
    old_price REAL NOT NULL CHECK (old_price >= 0),
    badge TEXT NOT NULL DEFAULT '',
    image TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    rating REAL NOT NULL DEFAULT 0,
    reviews INTEGER NOT NULL DEFAULT 0,
    featured INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    payment_provider TEXT NOT NULL CHECK (payment_provider IN ('stripe', 'paypal')),
    payment_reference TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    total REAL NOT NULL CHECK (total >= 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    unit_price REAL NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0)
  );

  CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);
  CREATE INDEX IF NOT EXISTS orders_created_idx ON orders(created_at);
  CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id);
`);

const initialProducts = [
  {
    id: 'urban-everyday-tote',
    name: 'Urban Everyday Tote',
    category: 'Accessories',
    price: 49,
    oldPrice: 64,
    badge: 'Best Seller',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
    description: 'A structured everyday tote designed for work, travel, and daily essentials.',
    rating: 4.9,
    reviews: 124,
    featured: 1,
  },
  {
    id: 'smart-wireless-headset',
    name: 'Smart Wireless Headset',
    category: 'Electronics',
    price: 89,
    oldPrice: 119,
    badge: 'New',
    image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80',
    description: 'Noise-canceling wireless audio with deep bass and all-day comfort.',
    rating: 4.8,
    reviews: 89,
    featured: 1,
  },
  {
    id: 'classic-sneaker-pro',
    name: 'Classic Sneaker Pro',
    category: 'Footwear',
    price: 76,
    oldPrice: 99,
    badge: 'Trending',
    image: 'https://images.unsplash.com/photo-1543508282-6319a3e2621f?auto=format&fit=crop&w=900&q=80',
    description: 'Modern streetwear sneakers built for comfort and everyday movement.',
    rating: 4.7,
    reviews: 214,
    featured: 1,
  },
  {
    id: 'city-light-watch',
    name: 'City Light Watch',
    category: 'Accessories',
    price: 120,
    oldPrice: 160,
    badge: 'Limited',
    image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=900&q=80',
    description: 'Minimalist stainless-steel watch with a polished finish and premium feel.',
    rating: 4.9,
    reviews: 76,
    featured: 0,
  },
  {
    id: 'aura-lamp',
    name: 'Aura Ambient Lamp',
    category: 'Home Decor',
    price: 64,
    oldPrice: 82,
    badge: 'Hot Pick',
    image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
    description: 'Warm lighting for cozy evenings and modern living spaces.',
    rating: 4.8,
    reviews: 58,
    featured: 0,
  },
  {
    id: 'glow-serum',
    name: 'Glow Serum',
    category: 'Beauty',
    price: 36,
    oldPrice: 48,
    badge: 'Editor’s Pick',
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80',
    description: 'Hydrating skincare formula for a brighter and smoother complexion.',
    rating: 4.9,
    reviews: 143,
    featured: 0,
  },
  {
    id: 'pulse-bottle',
    name: 'Pulse Smart Bottle',
    category: 'Electronics',
    price: 55,
    oldPrice: 72,
    badge: 'Popular',
    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=80',
    description: 'Hydration tracking bottle for active lifestyles and daily reminders.',
    rating: 4.7,
    reviews: 97,
    featured: 0,
  },
  {
    id: 'luna-silk-dress',
    name: 'Luna Silk Dress',
    category: 'Fashion',
    price: 132,
    oldPrice: 175,
    badge: 'New Arrival',
    image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80',
    description: 'Flowing silhouette with premium material designed for effortless style.',
    rating: 4.9,
    reviews: 61,
    featured: 0,
  },
];

const countProducts = db.prepare('SELECT COUNT(*) AS count FROM products').get().count;
if (countProducts === 0) {
  const insertProduct = db.prepare(`
    INSERT INTO products (id, name, category, price, old_price, badge, image, description, rating, reviews, featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  runTransaction(() => {
    for (const product of initialProducts) {
      insertProduct.run(
        product.id,
        product.name,
        product.category,
        product.price,
        product.oldPrice,
        product.badge,
        product.image,
        product.description,
        product.rating,
        product.reviews,
        product.featured,
      );
    }
  });
}

function toProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: row.price,
    oldPrice: row.old_price,
    badge: row.badge,
    image: row.image,
    description: row.description,
    rating: row.rating,
    reviews: row.reviews,
    featured: Boolean(row.featured),
  };
}

module.exports = { db, runTransaction, toProduct };
