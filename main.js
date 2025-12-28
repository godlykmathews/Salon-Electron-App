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

function parseNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
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
      "SELECT id, name, phone, gender, date_of_birth, loyalty_points, birthday_reminder_enabled, anniversary_date, anniversary_reminder_enabled, created_at FROM customers WHERE is_active = 1";
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
    const gender = payload.gender ? String(payload.gender).trim() : null;
    const dateOfBirth = payload.date_of_birth
      ? String(payload.date_of_birth).trim()
      : null;
    const preferredStaffId = payload.preferred_staff_id || null;
    const preferredServiceId = payload.preferred_service_id || null;
    const birthdayReminder = payload.birthday_reminder_enabled ? 1 : 0;
    const anniversaryDate = payload.anniversary_date
      ? String(payload.anniversary_date).trim()
      : null;
    const anniversaryReminder = payload.anniversary_reminder_enabled ? 1 : 0;

    const info = db
      .prepare(
        "INSERT INTO customers (name, phone, gender, date_of_birth, preferred_staff_id, preferred_service_id, birthday_reminder_enabled, anniversary_date, anniversary_reminder_enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        name,
        phone,
        gender,
        dateOfBirth,
        preferredStaffId,
        preferredServiceId,
        birthdayReminder,
        anniversaryDate,
        anniversaryReminder
      );
    return db
      .prepare(
        "SELECT id, name, phone, gender, date_of_birth, loyalty_points, birthday_reminder_enabled, anniversary_date, anniversary_reminder_enabled, created_at FROM customers WHERE id = ?"
      )
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
    const gender = payload.gender ? String(payload.gender).trim() : null;
    const dateOfBirth = payload.date_of_birth
      ? String(payload.date_of_birth).trim()
      : null;
    const preferredStaffId = payload.preferred_staff_id || null;
    const preferredServiceId = payload.preferred_service_id || null;
    const birthdayReminder = payload.birthday_reminder_enabled ? 1 : 0;
    const anniversaryDate = payload.anniversary_date
      ? String(payload.anniversary_date).trim()
      : null;
    const anniversaryReminder = payload.anniversary_reminder_enabled ? 1 : 0;
    db.prepare(
      "UPDATE customers SET name = ?, phone = ?, gender = ?, date_of_birth = ?, preferred_staff_id = ?, preferred_service_id = ?, birthday_reminder_enabled = ?, anniversary_date = ?, anniversary_reminder_enabled = ? WHERE id = ?"
    ).run(
      name,
      phone,
      gender,
      dateOfBirth,
      preferredStaffId,
      preferredServiceId,
      birthdayReminder,
      anniversaryDate,
      anniversaryReminder,
      payload.id
    );
    return db
      .prepare(
        "SELECT id, name, phone, gender, date_of_birth, loyalty_points, birthday_reminder_enabled, anniversary_date, anniversary_reminder_enabled, created_at FROM customers WHERE id = ?"
      )
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
        "SELECT id, name, price, duration_minutes, is_active FROM services WHERE is_active = 1 ORDER BY name ASC"
      )
      .all();
  });

  ipcMain.handle("services:add", (_event, payload) => {
    const name = payload?.name?.trim();
    const price = Number(payload?.price);
    const rawDuration = payload?.duration_minutes;
    const duration =
      rawDuration === undefined || rawDuration === null || rawDuration === ""
        ? 0
        : Number(rawDuration);
    if (!name) {
      throw new Error("Service name is required");
    }
    if (!Number.isFinite(price) || price < 0) {
      throw new Error("Service price is invalid");
    }
    // Duration is optional; treat missing/blank as 0 minutes
    if (!Number.isFinite(duration) || duration < 0) {
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
    const rawDuration = payload?.duration_minutes;
    const duration =
      rawDuration === undefined || rawDuration === null || rawDuration === ""
        ? 0
        : Number(rawDuration);
    if (!name) {
      throw new Error("Service name is required");
    }
    if (!Number.isFinite(price) || price < 0) {
      throw new Error("Service price is invalid");
    }
    if (!Number.isFinite(duration) || duration < 0) {
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
        "SELECT id, name, role, is_active, created_at FROM staff WHERE is_active = 1 ORDER BY name ASC"
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

  // Appointments
  ipcMain.handle("appointments:create", (_event, payload) => {
    const customerId = payload?.customerId || null;
    const customerName = payload?.customerName?.trim();
    const isWalkIn = payload?.isWalkIn ? 1 : 0;
    const startTime = payload?.startTime;
    const items = Array.isArray(payload?.items) ? payload.items : [];

    if (!customerName) {
      throw new Error("Customer name is required for appointment");
    }
    if (!startTime) {
      throw new Error("Start time is required");
    }
    if (!items.length) {
      throw new Error("At least one service is required");
    }

    const tx = db.transaction(() => {
      let totalMinutes = 0;
      const normalizedItems = items.map((item) => {
        const serviceName = item?.serviceName?.trim();
        const rawDuration = item?.duration_minutes;
        const duration =
          rawDuration === undefined ||
          rawDuration === null ||
          rawDuration === ""
            ? 0
            : Number(rawDuration);
        const staffId = item?.staffId || null;
        const staffName = item?.staffName?.trim() || null;
        const serviceId = item?.serviceId || null;
        const price = parseNumber(item?.price, 0);
        if (!serviceName) {
          throw new Error("Service name is required");
        }
        if (!Number.isFinite(duration) || duration < 0) {
          throw new Error("Invalid service duration");
        }
        totalMinutes += duration;
        return {
          serviceId,
          serviceName,
          staffId,
          staffName,
          duration,
          price,
        };
      });

      const start = new Date(startTime);
      if (Number.isNaN(start.getTime())) {
        throw new Error("Invalid appointment start time");
      }
      const end = new Date(start.getTime() + totalMinutes * 60000);
      const startIso = start.toISOString();
      const endIso = end.toISOString();

      const info = db
        .prepare(
          "INSERT INTO appointments (customer_id, customer_name, is_walk_in, start_time, end_time, status, notes) VALUES (?, ?, ?, ?, ?, 'Booked', ?)"
        )
        .run(customerId, customerName, isWalkIn, startIso, endIso, null);

      const appointmentId = info.lastInsertRowid;
      const insertItem = db.prepare(
        "INSERT INTO appointment_services (appointment_id, service_id, service_name, duration_minutes, staff_id, staff_name, price) VALUES (?, ?, ?, ?, ?, ?, ?)"
      );
      for (const it of normalizedItems) {
        insertItem.run(
          appointmentId,
          it.serviceId,
          it.serviceName,
          it.duration,
          it.staffId,
          it.staffName,
          it.price
        );
      }

      return {
        id: appointmentId,
        customer_id: customerId,
        customer_name: customerName,
        is_walk_in: isWalkIn,
        start_time: startIso,
        end_time: endIso,
        status: "Booked",
      };
    });

    return tx();
  });

  ipcMain.handle(
    "appointments:listByRange",
    (_event, { from, to, staffId }) => {
      if (!from || !to) {
        throw new Error("From and to dates are required");
      }
      let sql =
        "SELECT * FROM appointments WHERE DATE(start_time) BETWEEN ? AND ?";
      const params = [from, to];
      if (staffId) {
        // Filter appointments where any service is assigned to given staff
        sql +=
          " AND id IN (SELECT DISTINCT appointment_id FROM appointment_services WHERE staff_id = ?)";
        params.push(staffId);
      }
      sql += " ORDER BY start_time ASC";
      return db.prepare(sql).all(...params);
    }
  );

  ipcMain.handle("appointments:updateStatus", (_event, { id, status }) => {
    if (!id) {
      throw new Error("Appointment id is required");
    }
    const allowed = ["Booked", "In-Progress", "Completed", "Cancelled"];
    if (!allowed.includes(status)) {
      throw new Error("Invalid status");
    }
    db.prepare("UPDATE appointments SET status = ? WHERE id = ?").run(
      status,
      id
    );
    return db.prepare("SELECT * FROM appointments WHERE id = ?").get(id);
  });

  // Billing
  ipcMain.handle("billing:createBill", (_event, payload) => {
    const customerId = payload?.customerId || null;
    const customerName = payload?.customerName?.trim();
    const items = Array.isArray(payload?.items) ? payload.items : [];
    const gstRate = parseNumber(
      payload?.gstRate,
      parseNumber(getSetting("gst_rate"), 0)
    );
    const manualDiscount = parseNumber(payload?.discountAmount, 0);
    const payments = Array.isArray(payload?.payments) ? payload.payments : [];
    const loyaltyRedeemPoints = parseNumber(payload?.loyaltyRedeemPoints, 0);
    if (!customerName) {
      throw new Error("Customer name is required for billing");
    }
    if (!items.length) {
      throw new Error("At least one service is required");
    }

    const billDate = new Date().toISOString();

    const tx = db.transaction(() => {
      // Calculate totals
      let subtotal = 0;
      const normalizedItems = items.map((item) => {
        const serviceName = item?.serviceName?.trim();
        const unitPrice = Number(item?.unitPrice);
        const durationRaw = item?.duration_minutes;
        const duration =
          durationRaw === undefined ||
          durationRaw === null ||
          durationRaw === ""
            ? 0
            : Number(durationRaw);
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
        // Duration is optional for billing; allow 0 or positive minutes
        if (
          !Number.isFinite(duration) ||
          duration < 0 ||
          !Number.isInteger(duration)
        ) {
          throw new Error("Invalid service duration");
        }
        if (!Number.isInteger(quantity) || quantity <= 0) {
          throw new Error("Invalid quantity");
        }
        const lineTotal = unitPrice * quantity;
        subtotal += lineTotal;
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

      const discountAmount = manualDiscount > 0 ? manualDiscount : 0;
      const taxableAmount = Math.max(subtotal - discountAmount, 0);
      const gstAmount = (taxableAmount * gstRate) / 100;
      const totalAmount = taxableAmount + gstAmount;

      // Loyalty calculations (simple rule: 1 point per 100 currency units)
      const loyaltyRate = parseNumber(getSetting("loyalty_rate"), 0); // points per currency unit
      let loyaltyPointsEarned = 0;
      if (loyaltyRate > 0 && customerId) {
        loyaltyPointsEarned = Math.floor(totalAmount * loyaltyRate);
      }

      const customerRow =
        customerId &&
        db
          .prepare("SELECT id, loyalty_points FROM customers WHERE id = ?")
          .get(customerId);

      const availablePoints = customerRow?.loyalty_points || 0;
      const pointsToRedeem = Math.min(
        loyaltyRedeemPoints > 0 ? loyaltyRedeemPoints : 0,
        availablePoints
      );
      const loyaltyRedeemValue = pointsToRedeem; // 1 point == 1 currency unit
      const netAmount = Math.max(totalAmount - loyaltyRedeemValue, 0);

      const billInfo = db
        .prepare(
          "INSERT INTO bills (customer_id, customer_name, bill_date, subtotal, discount_amount, gst_rate, gst_amount, total_amount, net_amount, status, loyalty_points_earned, loyalty_points_redeemed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'FINAL', ?, ?)"
        )
        .run(
          customerId,
          customerName,
          billDate,
          subtotal,
          discountAmount,
          gstRate,
          gstAmount,
          totalAmount,
          netAmount,
          loyaltyPointsEarned,
          pointsToRedeem
        );

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

      // Record payments: support split payments; default to single cash payment
      const effectivePayments =
        payments.length > 0
          ? payments
          : [
              {
                mode: "Cash",
                amount: netAmount,
                reference: null,
              },
            ];

      const insertPayment = db.prepare(
        "INSERT INTO bill_payments (bill_id, mode, amount, reference) VALUES (?, ?, ?, ?)"
      );
      let paidTotal = 0;
      for (const p of effectivePayments) {
        const mode = String(p.mode || "Cash");
        const amount = parseNumber(p.amount, 0);
        if (!amount || amount < 0) continue;
        insertPayment.run(billId, mode, amount, p.reference || null);
        paidTotal += amount;
      }

      if (Math.round(paidTotal * 100) < Math.round(netAmount * 100)) {
        throw new Error("Total payment is less than bill amount");
      }

      // Loyalty balance updates
      if (customerId && (loyaltyPointsEarned > 0 || pointsToRedeem > 0)) {
        const newBalance =
          (customerRow?.loyalty_points || 0) +
          loyaltyPointsEarned -
          pointsToRedeem;
        db.prepare("UPDATE customers SET loyalty_points = ? WHERE id = ?").run(
          newBalance,
          customerId
        );

        if (loyaltyPointsEarned > 0) {
          db.prepare(
            "INSERT INTO loyalty_transactions (customer_id, bill_id, type, points) VALUES (?, ?, 'EARN', ?)"
          ).run(customerId, billId, loyaltyPointsEarned);
        }
        if (pointsToRedeem > 0) {
          db.prepare(
            "INSERT INTO loyalty_transactions (customer_id, bill_id, type, points) VALUES (?, ?, 'REDEEM', ?)"
          ).run(customerId, billId, pointsToRedeem);
        }
      }

      // Usage-based stock deduction for services that consume products
      const getServiceProducts = db.prepare(
        "SELECT product_id, quantity FROM service_products WHERE service_id = ?"
      );
      const updateProductQty = db.prepare(
        "UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?"
      );
      const insertStockMovement = db.prepare(
        "INSERT INTO stock_movements (product_id, movement_date, quantity, type, reason, related_service_id, related_bill_item_id) VALUES (?, ?, ?, 'OUT', 'SERVICE_USAGE', ?, ?)"
      );

      for (const billItem of normalizedItems) {
        if (!billItem.serviceId) continue;
        const serviceProducts = getServiceProducts.all(billItem.serviceId);
        for (const sp of serviceProducts) {
          const usedQty = (sp.quantity || 0) * billItem.quantity;
          if (!usedQty) continue;
          updateProductQty.run(usedQty, sp.product_id);
          insertStockMovement.run(
            sp.product_id,
            billDate,
            usedQty,
            billItem.serviceId,
            null
          );
        }
      }

      return {
        id: billId,
        customer_id: customerId,
        customer_name: customerName,
        bill_date: billDate,
        total_amount: totalAmount,
        net_amount: netAmount,
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

  ipcMain.handle("reports:dailyCashClosing", (_event, { date }) => {
    if (!date) {
      throw new Error("Date is required");
    }

    const incomeByMode = db
      .prepare(
        "SELECT bp.mode, IFNULL(SUM(bp.amount), 0) AS total " +
          "FROM bill_payments bp JOIN bills b ON b.id = bp.bill_id " +
          "WHERE DATE(b.bill_date) = ? " +
          "GROUP BY bp.mode"
      )
      .all(date);

    const totalIncomeRow = db
      .prepare(
        "SELECT IFNULL(SUM(net_amount), 0) AS total FROM bills WHERE DATE(bill_date) = ?"
      )
      .get(date);

    const expensesRow = db
      .prepare(
        "SELECT IFNULL(SUM(amount), 0) AS total FROM expenses WHERE date = ?"
      )
      .get(date);

    return {
      date,
      incomeByMode,
      totalIncome: totalIncomeRow.total,
      totalExpenses: expensesRow.total,
      netCash: totalIncomeRow.total - expensesRow.total,
    };
  });

  // Expenses
  ipcMain.handle("expenses:add", (_event, payload) => {
    const date = payload?.date?.trim();
    const category = payload?.category?.trim();
    const amount = parseNumber(payload?.amount, NaN);
    const description = payload?.description?.trim() || null;
    if (!date) {
      throw new Error("Expense date is required");
    }
    if (!category) {
      throw new Error("Expense category is required");
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Expense amount is invalid");
    }
    const info = db
      .prepare(
        "INSERT INTO expenses (date, category, description, amount) VALUES (?, ?, ?, ?)"
      )
      .run(date, category, description, amount);
    return db
      .prepare("SELECT * FROM expenses WHERE id = ?")
      .get(info.lastInsertRowid);
  });

  ipcMain.handle("expenses:listByRange", (_event, { from, to }) => {
    if (!from || !to) {
      throw new Error("From and to dates are required");
    }
    const rows = db
      .prepare(
        "SELECT * FROM expenses WHERE date BETWEEN ? AND ? ORDER BY date ASC, id ASC"
      )
      .all(from, to);
    const totalRow = db
      .prepare(
        "SELECT IFNULL(SUM(amount), 0) AS total FROM expenses WHERE date BETWEEN ? AND ?"
      )
      .get(from, to);
    return {
      from,
      to,
      items: rows,
      total: totalRow.total,
    };
  });

  // Inventory / products / stock
  ipcMain.handle("inventory:products:list", () => {
    return db
      .prepare("SELECT * FROM products WHERE is_active = 1 ORDER BY name ASC")
      .all();
  });

  ipcMain.handle("inventory:products:add", (_event, payload) => {
    const name = payload?.name?.trim();
    if (!name) {
      throw new Error("Product name is required");
    }
    const category = payload?.category?.trim() || null;
    const supplierId = payload?.supplierId || null;
    const sku = payload?.sku?.trim() || null;
    const unit = payload?.unit?.trim() || null;
    const costPrice = parseNumber(payload?.costPrice, null);
    const salePrice = parseNumber(payload?.salePrice, null);
    const minStock = parseNumber(payload?.minStock, 0);
    const expiryDate = payload?.expiryDate?.trim() || null;

    const info = db
      .prepare(
        "INSERT INTO products (name, category, supplier_id, sku, unit, cost_price, sale_price, min_stock, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        name,
        category,
        supplierId,
        sku,
        unit,
        costPrice,
        salePrice,
        minStock,
        expiryDate
      );
    return db
      .prepare("SELECT * FROM products WHERE id = ?")
      .get(info.lastInsertRowid);
  });

  ipcMain.handle("inventory:products:update", (_event, payload) => {
    if (!payload || !payload.id) {
      throw new Error("Product id is required");
    }
    const name = payload?.name?.trim();
    if (!name) {
      throw new Error("Product name is required");
    }
    const category = payload?.category?.trim() || null;
    const supplierId = payload?.supplierId || null;
    const sku = payload?.sku?.trim() || null;
    const unit = payload?.unit?.trim() || null;
    const costPrice = parseNumber(payload?.costPrice, null);
    const salePrice = parseNumber(payload?.salePrice, null);
    const minStock = parseNumber(payload?.minStock, 0);
    const expiryDate = payload?.expiryDate?.trim() || null;

    db.prepare(
      "UPDATE products SET name = ?, category = ?, supplier_id = ?, sku = ?, unit = ?, cost_price = ?, sale_price = ?, min_stock = ?, expiry_date = ? WHERE id = ?"
    ).run(
      name,
      category,
      supplierId,
      sku,
      unit,
      costPrice,
      salePrice,
      minStock,
      expiryDate,
      payload.id
    );
    return db.prepare("SELECT * FROM products WHERE id = ?").get(payload.id);
  });

  ipcMain.handle("inventory:products:deactivate", (_event, id) => {
    if (!id) {
      throw new Error("Product id is required");
    }
    db.prepare("UPDATE products SET is_active = 0 WHERE id = ?").run(id);
    return true;
  });

  ipcMain.handle("inventory:stockMove", (_event, payload) => {
    const productId = payload?.productId;
    const quantity = parseNumber(payload?.quantity, NaN);
    const type = payload?.type === "OUT" ? "OUT" : "IN";
    const reason = payload?.reason?.trim() || null;
    if (!productId) {
      throw new Error("Product id is required");
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error("Quantity must be positive");
    }

    const movementDate = new Date().toISOString();
    const signedQty = type === "OUT" ? -quantity : quantity;

    const tx = db.transaction(() => {
      db.prepare(
        "UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?"
      ).run(signedQty, productId);

      db.prepare(
        "INSERT INTO stock_movements (product_id, movement_date, quantity, type, reason, related_service_id, related_bill_item_id) VALUES (?, ?, ?, ?, ?, NULL, NULL)"
      ).run(productId, movementDate, quantity, type, reason);
    });

    tx();
    return true;
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
