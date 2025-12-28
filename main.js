const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const db = require("./db/database");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.loadFile("index.html");
}

function hashPin(pin) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pin, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPin(pin, stored) {
  const [salt, storedHash] = stored.split(":");
  const hash = crypto.scryptSync(pin, salt, 64).toString("hex");
  return crypto.timingSafeEqual(
    Buffer.from(hash, "hex"),
    Buffer.from(storedHash, "hex")
  );
}

function getSetting(key) {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return row ? row.value : null;
}

function setSetting(key, value) {
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, value);
}

function registerIpcHandlers() {
  // Auth
  ipcMain.handle("auth:hasPin", () => {
    return !!getSetting("admin_pin");
  });

  ipcMain.handle("auth:setPin", (_event, { currentPin, newPin }) => {
    const existing = getSetting("admin_pin");
    if (!newPin || typeof newPin !== "string" || newPin.length < 4) {
      throw new Error("PIN must be at least 4 digits");
    }

    if (existing) {
      if (!currentPin || !verifyPin(currentPin, existing)) {
        throw new Error("Current PIN is incorrect");
      }
    }

    const hash = hashPin(newPin);
    setSetting("admin_pin", hash);
    return true;
  });

  ipcMain.handle("auth:login", (_event, { pin }) => {
    const existing = getSetting("admin_pin");
    if (!existing) {
      throw new Error("PIN is not set");
    }
    if (!pin || typeof pin !== "string") {
      return false;
    }
    return verifyPin(pin, existing);
  });

  // Customers
  ipcMain.handle("customers:list", (_event, { search } = {}) => {
    let sql =
      "SELECT id, name, phone, created_at FROM customers WHERE is_active = 1";
    const params = [];
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      sql += " AND (name LIKE ? OR phone LIKE ?)";
      params.push(term, term);
    }
    sql += " ORDER BY created_at DESC, id DESC";
    return db.prepare(sql).all(...params);
  });

  ipcMain.handle("customers:add", (_event, payload) => {
    if (!payload || typeof payload.name !== "string" || !payload.name.trim()) {
      throw new Error("Customer name is required");
    }
    const name = payload.name.trim();
    const phone = payload.phone ? String(payload.phone).trim() : null;

    const info = db
      .prepare("INSERT INTO customers (name, phone) VALUES (?, ?)")
      .run(name, phone);
    return db
      .prepare("SELECT id, name, phone, created_at FROM customers WHERE id = ?")
      .get(info.lastInsertRowid);
  });

  ipcMain.handle("customers:update", (_event, payload) => {
    if (!payload || !payload.id) {
      throw new Error("Customer id is required");
    }
    const name = payload.name ? payload.name.trim() : "";
    if (!name) {
      throw new Error("Customer name is required");
    }
    const phone = payload.phone ? String(payload.phone).trim() : null;
    db.prepare("UPDATE customers SET name = ?, phone = ? WHERE id = ?").run(
      name,
      phone,
      payload.id
    );
    return db
      .prepare("SELECT id, name, phone, created_at FROM customers WHERE id = ?")
      .get(payload.id);
  });

  ipcMain.handle("customers:delete", (_event, id) => {
    if (!id) {
      throw new Error("Customer id is required");
    }
    db.prepare("UPDATE customers SET is_active = 0 WHERE id = ?").run(id);
    return true;
  });

  ipcMain.handle("customers:visitHistory", (_event, customerId) => {
    if (!customerId) {
      throw new Error("Customer id is required");
    }
    const sql =
      "SELECT b.id, b.bill_date, b.total_amount FROM bills b WHERE b.customer_id = ? ORDER BY b.bill_date DESC, b.id DESC";
    return db.prepare(sql).all(customerId);
  });

  // Services
  ipcMain.handle("services:list", () => {
    return db
      .prepare(
        "SELECT id, name, price, duration_minutes, is_active FROM services ORDER BY name ASC"
      )
      .all();
  });

  ipcMain.handle("services:add", (_event, payload) => {
    const name = payload?.name?.trim();
    const price = Number(payload?.price);
    const duration = Number(payload?.duration_minutes);
    if (!name) {
      throw new Error("Service name is required");
    }
    if (!Number.isFinite(price) || price < 0) {
      throw new Error("Service price is invalid");
    }
    if (!Number.isInteger(duration) || duration <= 0) {
      throw new Error("Service duration is invalid");
    }
    const info = db
      .prepare(
        "INSERT INTO services (name, price, duration_minutes) VALUES (?, ?, ?)"
      )
      .run(name, price, duration);
    return db
      .prepare(
        "SELECT id, name, price, duration_minutes, is_active FROM services WHERE id = ?"
      )
      .get(info.lastInsertRowid);
  });

  ipcMain.handle("services:update", (_event, payload) => {
    if (!payload || !payload.id) {
      throw new Error("Service id is required");
    }
    const name = payload?.name?.trim();
    const price = Number(payload?.price);
    const duration = Number(payload?.duration_minutes);
    if (!name) {
      throw new Error("Service name is required");
    }
    if (!Number.isFinite(price) || price < 0) {
      throw new Error("Service price is invalid");
    }
    if (!Number.isInteger(duration) || duration <= 0) {
      throw new Error("Service duration is invalid");
    }
    db.prepare(
      "UPDATE services SET name = ?, price = ?, duration_minutes = ? WHERE id = ?"
    ).run(name, price, duration, payload.id);
    return db
      .prepare(
        "SELECT id, name, price, duration_minutes, is_active FROM services WHERE id = ?"
      )
      .get(payload.id);
  });

  ipcMain.handle("services:delete", (_event, id) => {
    if (!id) {
      throw new Error("Service id is required");
    }
    db.prepare("UPDATE services SET is_active = 0 WHERE id = ?").run(id);
    return true;
  });

  // Staff
  ipcMain.handle("staff:list", () => {
    return db
      .prepare(
        "SELECT id, name, role, is_active, created_at FROM staff ORDER BY name ASC"
      )
      .all();
  });

  ipcMain.handle("staff:add", (_event, payload) => {
    const name = payload?.name?.trim();
    const role = payload?.role?.trim();
    if (!name) {
      throw new Error("Staff name is required");
    }
    if (!role) {
      throw new Error("Staff role is required");
    }
    const info = db
      .prepare("INSERT INTO staff (name, role) VALUES (?, ?)")
      .run(name, role);
    return db
      .prepare(
        "SELECT id, name, role, is_active, created_at FROM staff WHERE id = ?"
      )
      .get(info.lastInsertRowid);
  });

  ipcMain.handle("staff:update", (_event, payload) => {
    if (!payload || !payload.id) {
      throw new Error("Staff id is required");
    }
    const name = payload?.name?.trim();
    const role = payload?.role?.trim();
    if (!name) {
      throw new Error("Staff name is required");
    }
    if (!role) {
      throw new Error("Staff role is required");
    }
    db.prepare("UPDATE staff SET name = ?, role = ? WHERE id = ?").run(
      name,
      role,
      payload.id
    );
    return db
      .prepare(
        "SELECT id, name, role, is_active, created_at FROM staff WHERE id = ?"
      )
      .get(payload.id);
  });

  ipcMain.handle("staff:delete", (_event, id) => {
    if (!id) {
      throw new Error("Staff id is required");
    }
    db.prepare("UPDATE staff SET is_active = 0 WHERE id = ?").run(id);
    return true;
  });

  // Billing
  ipcMain.handle("billing:createBill", (_event, payload) => {
    const customerId = payload?.customerId || null;
    const customerName = payload?.customerName?.trim();
    const items = Array.isArray(payload?.items) ? payload.items : [];
    if (!customerName) {
      throw new Error("Customer name is required for billing");
    }
    if (!items.length) {
      throw new Error("At least one service is required");
    }

    const billDate = new Date().toISOString();

    const tx = db.transaction(() => {
      // Calculate totals
      let totalAmount = 0;
      const normalizedItems = items.map((item) => {
        const serviceName = item?.serviceName?.trim();
        const unitPrice = Number(item?.unitPrice);
        const duration = Number(item?.duration_minutes);
        const quantity = Number.isInteger(item?.quantity) ? item.quantity : 1;
        const staffId = item?.staffId || null;
        const staffName = item?.staffName?.trim() || null;
        const serviceId = item?.serviceId || null;
        if (!serviceName) {
          throw new Error("Service name is required");
        }
        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
          throw new Error("Invalid service price");
        }
        if (!Number.isInteger(duration) || duration <= 0) {
          throw new Error("Invalid service duration");
        }
        if (!Number.isInteger(quantity) || quantity <= 0) {
          throw new Error("Invalid quantity");
        }
        const lineTotal = unitPrice * quantity;
        totalAmount += lineTotal;
        return {
          serviceId,
          serviceName,
          staffId,
          staffName,
          unitPrice,
          duration,
          quantity,
          lineTotal,
        };
      });

      const billInfo = db
        .prepare(
          "INSERT INTO bills (customer_id, customer_name, bill_date, total_amount) VALUES (?, ?, ?, ?)"
        )
        .run(customerId, customerName, billDate, totalAmount);

      const billId = billInfo.lastInsertRowid;
      const insertItem = db.prepare(
        "INSERT INTO bill_items (bill_id, service_id, service_name, staff_id, staff_name, unit_price, duration_minutes, quantity, line_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      );
      for (const it of normalizedItems) {
        insertItem.run(
          billId,
          it.serviceId,
          it.serviceName,
          it.staffId,
          it.staffName,
          it.unitPrice,
          it.duration,
          it.quantity,
          it.lineTotal
        );
      }

      return {
        id: billId,
        customer_id: customerId,
        customer_name: customerName,
        bill_date: billDate,
        total_amount: totalAmount,
      };
    });

    return tx();
  });

  ipcMain.handle("billing:getBill", (_event, billId) => {
    if (!billId) {
      throw new Error("Bill id is required");
    }
    const bill = db.prepare("SELECT * FROM bills WHERE id = ?").get(billId);
    if (!bill) {
      return null;
    }
    const items = db
      .prepare(
        "SELECT service_name, staff_name, unit_price, duration_minutes, quantity, line_total FROM bill_items WHERE bill_id = ? ORDER BY id ASC"
      )
      .all(billId);
    return { bill, items };
  });

  // Reports
  ipcMain.handle("reports:dailySummary", (_event, { date }) => {
    if (!date) {
      throw new Error("Date is required");
    }
    const totalRevenueRow = db
      .prepare(
        "SELECT IFNULL(SUM(total_amount), 0) AS total FROM bills WHERE DATE(bill_date) = ?"
      )
      .get(date);
    const customersRow = db
      .prepare(
        "SELECT COUNT(DISTINCT customer_id) AS count FROM bills WHERE DATE(bill_date) = ? AND customer_id IS NOT NULL"
      )
      .get(date);
    const services = db
      .prepare(
        "SELECT bi.service_name, COUNT(*) AS usage_count, SUM(bi.line_total) AS revenue " +
          "FROM bill_items bi JOIN bills b ON b.id = bi.bill_id " +
          "WHERE DATE(b.bill_date) = ? " +
          "GROUP BY bi.service_name ORDER BY usage_count DESC, revenue DESC LIMIT 20"
      )
      .all(date);
    const staff = db
      .prepare(
        "SELECT bi.staff_name, COUNT(*) AS service_count " +
          "FROM bill_items bi JOIN bills b ON b.id = bi.bill_id " +
          "WHERE DATE(b.bill_date) = ? AND bi.staff_id IS NOT NULL " +
          "GROUP BY bi.staff_id, bi.staff_name ORDER BY service_count DESC"
      )
      .all(date);

    return {
      date,
      totalRevenue: totalRevenueRow.total,
      customersServed: customersRow.count,
      topServices: services,
      staffServiceCounts: staff,
    };
  });

  // Backup & restore
  ipcMain.handle("backup:create", () => {
    const dbPath = path.join(__dirname, "db", "salon.db");
    const backupsDir = path.join(__dirname, "backups");
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir);
    }
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    const backupName = `salon-backup-${timestamp}.db`;
    const backupPath = path.join(backupsDir, backupName);
    fs.copyFileSync(dbPath, backupPath);
    return { name: backupName };
  });

  ipcMain.handle("backup:list", () => {
    const backupsDir = path.join(__dirname, "backups");
    if (!fs.existsSync(backupsDir)) {
      return [];
    }
    const files = fs
      .readdirSync(backupsDir)
      .filter((f) => f.endsWith(".db"))
      .sort()
      .reverse();
    return files.map((name) => ({ name }));
  });

  ipcMain.handle("backup:restore", (_event, { name }) => {
    if (!name) {
      throw new Error("Backup name is required");
    }
    const dbPath = path.join(__dirname, "db", "salon.db");
    const backupsDir = path.join(__dirname, "backups");
    const backupPath = path.join(backupsDir, name);
    if (!fs.existsSync(backupPath)) {
      throw new Error("Backup file not found");
    }
    fs.copyFileSync(backupPath, dbPath);
    // Restart app to ensure DB is reloaded cleanly
    app.relaunch();
    app.exit(0);
    return true;
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
