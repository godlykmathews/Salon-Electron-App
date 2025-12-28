const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "salon.db"));

// Core tables ---------------------------------------------------------------

db.prepare(
  `CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    gender TEXT,
    date_of_birth TEXT,
    preferred_staff_id INTEGER,
    preferred_service_id INTEGER,
    loyalty_points INTEGER NOT NULL DEFAULT 0,
    birthday_reminder_enabled INTEGER NOT NULL DEFAULT 0,
    anniversary_date TEXT,
    anniversary_reminder_enabled INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
).run();

// Lightweight migrations for older DBs that may lack newer columns
const customerMigrations = [
  "ALTER TABLE customers ADD COLUMN gender TEXT",
  "ALTER TABLE customers ADD COLUMN date_of_birth TEXT",
  "ALTER TABLE customers ADD COLUMN preferred_staff_id INTEGER",
  "ALTER TABLE customers ADD COLUMN preferred_service_id INTEGER",
  "ALTER TABLE customers ADD COLUMN loyalty_points INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE customers ADD COLUMN birthday_reminder_enabled INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE customers ADD COLUMN anniversary_date TEXT",
  "ALTER TABLE customers ADD COLUMN anniversary_reminder_enabled INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE customers ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1",
];

for (const sql of customerMigrations) {
  try {
    db.prepare(sql).run();
  } catch (error) {
    // Ignore if column already exists
  }
}

db.prepare(
  `CREATE TABLE IF NOT EXISTS customer_preferred_services (
    customer_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    PRIMARY KEY (customer_id, service_id)
  )`
).run();

db.prepare(
  `CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    price REAL NOT NULL,
    price_male REAL,
    price_female REAL,
    price_child REAL,
    duration_minutes INTEGER NOT NULL,
    is_package INTEGER NOT NULL DEFAULT 0,
    discount_type TEXT,
    discount_value REAL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
).run();

const serviceMigrations = [
  "ALTER TABLE services ADD COLUMN category TEXT",
  "ALTER TABLE services ADD COLUMN price_male REAL",
  "ALTER TABLE services ADD COLUMN price_female REAL",
  "ALTER TABLE services ADD COLUMN price_child REAL",
  "ALTER TABLE services ADD COLUMN is_package INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE services ADD COLUMN discount_type TEXT",
  "ALTER TABLE services ADD COLUMN discount_value REAL DEFAULT 0",
  "ALTER TABLE services ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1",
];

for (const sql of serviceMigrations) {
  try {
    db.prepare(sql).run();
  } catch (error) {
    // Ignore if column already exists
  }
}

db.prepare(
  `CREATE TABLE IF NOT EXISTS service_packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    package_service_id INTEGER NOT NULL,
    component_service_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1
  )`
).run();

db.prepare(
  `CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    commission_type TEXT,
    commission_value REAL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
).run();

const staffMigrations = [
  "ALTER TABLE staff ADD COLUMN commission_type TEXT",
  "ALTER TABLE staff ADD COLUMN commission_value REAL DEFAULT 0",
  "ALTER TABLE staff ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1",
];

for (const sql of staffMigrations) {
  try {
    db.prepare(sql).run();
  } catch (error) {
    // Ignore if column already exists
  }
}

db.prepare(
  `CREATE TABLE IF NOT EXISTS staff_shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL
  )`
).run();

db.prepare(
  `CREATE TABLE IF NOT EXISTS staff_services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL
  )`
).run();

db.prepare(
  `CREATE TABLE IF NOT EXISTS staff_attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL,
    check_in TEXT,
    check_out TEXT,
    UNIQUE (staff_id, date)
  )`
).run();

// Appointments --------------------------------------------------------------

db.prepare(
  `CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    customer_name TEXT NOT NULL,
    is_walk_in INTEGER NOT NULL DEFAULT 0,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Booked',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
).run();

db.prepare(
  `CREATE TABLE IF NOT EXISTS appointment_services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_id INTEGER NOT NULL,
    service_id INTEGER,
    service_name TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    staff_id INTEGER,
    staff_name TEXT,
    price REAL NOT NULL DEFAULT 0
  )`
).run();

// Billing & payments --------------------------------------------------------

db.prepare(
  `CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    customer_name TEXT NOT NULL,
    bill_date DATETIME NOT NULL,
    subtotal REAL,
    discount_amount REAL,
    gst_rate REAL,
    gst_amount REAL,
    total_amount REAL NOT NULL,
    net_amount REAL,
    status TEXT NOT NULL DEFAULT 'FINAL',
    appointment_id INTEGER,
    related_bill_id INTEGER,
    loyalty_points_earned INTEGER NOT NULL DEFAULT 0,
    loyalty_points_redeemed INTEGER NOT NULL DEFAULT 0,
    membership_discount REAL NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
).run();

const billMigrations = [
  "ALTER TABLE bills ADD COLUMN subtotal REAL",
  "ALTER TABLE bills ADD COLUMN discount_amount REAL",
  "ALTER TABLE bills ADD COLUMN gst_rate REAL",
  "ALTER TABLE bills ADD COLUMN gst_amount REAL",
  "ALTER TABLE bills ADD COLUMN net_amount REAL",
  "ALTER TABLE bills ADD COLUMN status TEXT NOT NULL DEFAULT 'FINAL'",
  "ALTER TABLE bills ADD COLUMN appointment_id INTEGER",
  "ALTER TABLE bills ADD COLUMN related_bill_id INTEGER",
  "ALTER TABLE bills ADD COLUMN loyalty_points_earned INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE bills ADD COLUMN loyalty_points_redeemed INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE bills ADD COLUMN membership_discount REAL NOT NULL DEFAULT 0",
];

for (const sql of billMigrations) {
  try {
    db.prepare(sql).run();
  } catch (error) {
    // Ignore if column already exists
  }
}

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
  `CREATE TABLE IF NOT EXISTS bill_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER NOT NULL,
    mode TEXT NOT NULL,
    amount REAL NOT NULL,
    reference TEXT
  )`
).run();

// Inventory & stock ---------------------------------------------------------

db.prepare(
  `CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
).run();

db.prepare(
  `CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    supplier_id INTEGER,
    sku TEXT,
    unit TEXT,
    cost_price REAL,
    sale_price REAL,
    stock_quantity REAL NOT NULL DEFAULT 0,
    min_stock REAL NOT NULL DEFAULT 0,
    expiry_date TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
).run();

const productMigrations = [
  "ALTER TABLE products ADD COLUMN category TEXT",
  "ALTER TABLE products ADD COLUMN supplier_id INTEGER",
  "ALTER TABLE products ADD COLUMN sku TEXT",
  "ALTER TABLE products ADD COLUMN unit TEXT",
  "ALTER TABLE products ADD COLUMN cost_price REAL",
  "ALTER TABLE products ADD COLUMN sale_price REAL",
  "ALTER TABLE products ADD COLUMN stock_quantity REAL NOT NULL DEFAULT 0",
  "ALTER TABLE products ADD COLUMN min_stock REAL NOT NULL DEFAULT 0",
  "ALTER TABLE products ADD COLUMN expiry_date TEXT",
  "ALTER TABLE products ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1",
];

for (const sql of productMigrations) {
  try {
    db.prepare(sql).run();
  } catch (error) {
    // Ignore if column already exists
  }
}

db.prepare(
  `CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    movement_date TEXT NOT NULL,
    quantity REAL NOT NULL,
    type TEXT NOT NULL,
    reason TEXT,
    related_service_id INTEGER,
    related_bill_item_id INTEGER
  )`
).run();

db.prepare(
  `CREATE TABLE IF NOT EXISTS service_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity REAL NOT NULL DEFAULT 0
  )`
).run();

// Expenses -----------------------------------------------------------------

db.prepare(
  `CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    amount REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
).run();

// Loyalty & membership ------------------------------------------------------

db.prepare(
  `CREATE TABLE IF NOT EXISTS membership_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    level TEXT,
    discount_type TEXT,
    discount_value REAL DEFAULT 0,
    reward_rate REAL DEFAULT 0,
    prepaid_enabled INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
).run();

db.prepare(
  `CREATE TABLE IF NOT EXISTS customer_memberships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    membership_plan_id INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    prepaid_balance REAL NOT NULL DEFAULT 0
  )`
).run();

db.prepare(
  `CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    bill_id INTEGER,
    type TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
).run();

// Users, roles, settings, activity logs ------------------------------------

db.prepare(
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
).run();

db.prepare(
  `CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
).run();

db.prepare(
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`
).run();

module.exports = db;
