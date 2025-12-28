const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "salon.db"));

// Core tables
db.prepare(
  `CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
).run();

// Lightweight migration for older DBs that may lack newer columns
try {
  db.prepare(
    "ALTER TABLE customers ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1"
  ).run();
} catch (error) {
  // Ignore if column already exists
}

db.prepare(
  `CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    duration_minutes INTEGER NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
).run();

db.prepare(
  `CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
).run();

db.prepare(
  `CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    customer_name TEXT NOT NULL,
    bill_date DATETIME NOT NULL,
    total_amount REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
).run();

db.prepare(
  `CREATE TABLE IF NOT EXISTS bill_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER NOT NULL,
    service_id INTEGER,
    service_name TEXT NOT NULL,
    staff_id INTEGER,
    staff_name TEXT,
    unit_price REAL NOT NULL,
    duration_minutes INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    line_total REAL NOT NULL
  )`
).run();

db.prepare(
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`
).run();

module.exports = db;
