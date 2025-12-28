window.addEventListener("DOMContentLoaded", () => {
  const lockScreen = document.getElementById("lock-screen");
  const lockForm = document.getElementById("lock-form");
  const lockTitle = document.getElementById("lock-title");
  const lockPin = document.getElementById("lock-pin");
  const lockNewPinRow = document.getElementById("lock-new-pin-row");
  const lockNewPin = document.getElementById("lock-new-pin");
  const lockError = document.getElementById("lock-error");
  const appShell = document.getElementById("app-shell");

  const tabButtons = Array.from(document.querySelectorAll(".tab-button"));
  const tabPanels = Array.from(document.querySelectorAll(".tab-panel"));

  // Customers
  const customerForm = document.getElementById("customer-form");
  const customerName = document.getElementById("customer-name");
  const customerPhone = document.getElementById("customer-phone");
  const customerClear = document.getElementById("customer-clear");
  const customerError = document.getElementById("customer-error");
  const customerSearch = document.getElementById("customer-search");
  const customersBody = document.getElementById("customers-body");
  let editingCustomerId = null;

  // Services
  const serviceForm = document.getElementById("service-form");
  const serviceName = document.getElementById("service-name");
  const servicePrice = document.getElementById("service-price");
  const serviceDuration = document.getElementById("service-duration");
  const serviceClear = document.getElementById("service-clear");
  const serviceError = document.getElementById("service-error");
  const servicesBody = document.getElementById("services-body");
  let editingServiceId = null;

  // Staff
  const staffForm = document.getElementById("staff-form");
  const staffName = document.getElementById("staff-name");
  const staffRole = document.getElementById("staff-role");
  const staffClear = document.getElementById("staff-clear");
  const staffError = document.getElementById("staff-error");
  const staffBody = document.getElementById("staff-body");
  let editingStaffId = null;

  // Billing
  const billingCustomer = document.getElementById("billing-customer");
  const billingServiceSelect = document.getElementById("billing-service");
  const billingStaffSelect = document.getElementById("billing-staff");
  const billingQty = document.getElementById("billing-qty");
  const billingAddItem = document.getElementById("billing-add-item");
  const billingItemsBody = document.getElementById("billing-items-body");
  const billingTotal = document.getElementById("billing-total");
  const billingSave = document.getElementById("billing-save");
  const billingError = document.getElementById("billing-error");
  const billingCustomerSuggestions = document.getElementById(
    "billing-customer-suggestions"
  );
  let billingItems = [];
  let selectedBillingCustomerId = null;

  // Reports
  const reportDate = document.getElementById("report-date");
  const reportLoad = document.getElementById("report-load");
  const reportError = document.getElementById("report-error");
  const reportOutput = document.getElementById("report-output");

  // Backup
  const backupCreate = document.getElementById("backup-create");
  const backupError = document.getElementById("backup-error");
  const backupBody = document.getElementById("backup-body");

  function setLockError(message) {
    lockError.textContent = message || "";
    lockError.style.display = message ? "block" : "none";
  }

  function selectTab(name) {
    tabButtons.forEach((btn) => {
      const active = btn.dataset.tab === name;
      btn.disabled = active;
    });
    tabPanels.forEach((panel) => {
      panel.style.display = panel.id === `tab-${name}` ? "block" : "none";
    });
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      selectTab(btn.dataset.tab);
    });
  });

  async function initLockScreen() {
    try {
      const hasPin = await window.api.auth.hasPin();
      if (hasPin) {
        lockTitle.textContent = "Enter Admin PIN";
        lockNewPinRow.style.display = "none";
      } else {
        lockTitle.textContent = "Set Admin PIN";
        lockNewPinRow.style.display = "block";
      }
    } catch (error) {
      setLockError("Failed to initialize lock screen");
      console.error(error);
    }
  }

  lockForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setLockError("");
    try {
      const hasPin = await window.api.auth.hasPin();
      if (hasPin) {
        const ok = await window.api.auth.login({ pin: lockPin.value });
        if (!ok) {
          setLockError("Invalid PIN");
          return;
        }
      } else {
        const newPinValue = lockNewPin.value.trim();
        if (!newPinValue) {
          setLockError("PIN is required");
          return;
        }
        await window.api.auth.setPin({ currentPin: null, newPin: newPinValue });
      }
      lockScreen.style.display = "none";
      appShell.style.display = "block";
      selectTab("customers");
      await Promise.all([
        refreshCustomers(),
        refreshServices(),
        refreshStaff(),
        loadBackups(),
      ]);
      updateBillingSelectors();
    } catch (error) {
      setLockError(error.message || "Authentication failed");
      console.error(error);
    }
  });

  // Customers
  function setCustomerError(message) {
    customerError.textContent = message || "";
    customerError.style.display = message ? "block" : "none";
  }

  async function refreshCustomers() {
    try {
      setCustomerError("");
      const search = customerSearch.value.trim();
      const customers = await window.api.customers.list({ search });
      customersBody.innerHTML = "";
      customers.forEach((c) => {
        const tr = document.createElement("tr");
        const nameTd = document.createElement("td");
        nameTd.textContent = c.name;
        const phoneTd = document.createElement("td");
        phoneTd.textContent = c.phone || "";
        const createdTd = document.createElement("td");
        createdTd.textContent = c.created_at || "";
        const actionsTd = document.createElement("td");
        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", () => {
          editingCustomerId = c.id;
          customerName.value = c.name;
          customerPhone.value = c.phone || "";
        });
        const delBtn = document.createElement("button");
        delBtn.textContent = "Delete";
        delBtn.addEventListener("click", async () => {
          if (!window.confirm("Delete this customer?")) return;
          try {
            await window.api.customers.remove(c.id);
            await refreshCustomers();
          } catch (error) {
            setCustomerError("Failed to delete customer");
            console.error(error);
          }
        });
        actionsTd.appendChild(editBtn);
        actionsTd.appendChild(delBtn);

        tr.appendChild(nameTd);
        tr.appendChild(phoneTd);
        tr.appendChild(createdTd);
        tr.appendChild(actionsTd);
        customersBody.appendChild(tr);
      });
    } catch (error) {
      setCustomerError("Failed to load customers");
      console.error(error);
    }
  }

  customerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setCustomerError("");
    const name = customerName.value.trim();
    const phone = customerPhone.value.trim();
    if (!name) {
      setCustomerError("Customer name is required");
      return;
    }
    try {
      if (editingCustomerId) {
        await window.api.customers.update({
          id: editingCustomerId,
          name,
          phone,
        });
      } else {
        await window.api.customers.add({ name, phone });
      }
      editingCustomerId = null;
      customerName.value = "";
      customerPhone.value = "";
      await refreshCustomers();
      updateBillingSelectors();
    } catch (error) {
      setCustomerError("Failed to save customer");
      console.error(error);
    }
  });

  customerClear.addEventListener("click", () => {
    editingCustomerId = null;
    customerName.value = "";
    customerPhone.value = "";
    setCustomerError("");
  });

  customerSearch.addEventListener("input", () => {
    refreshCustomers();
  });

  // Services
  function setServiceError(message) {
    serviceError.textContent = message || "";
    serviceError.style.display = message ? "block" : "none";
  }

  async function refreshServices() {
    try {
      setServiceError("");
      const services = await window.api.services.list();
      servicesBody.innerHTML = "";
      billingServiceSelect.innerHTML = "";
      const activeServices = services.filter((s) => s.is_active);
      activeServices.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = String(s.id);
        opt.textContent = `${s.name} (${s.price.toFixed(2)})`;
        opt.dataset.price = String(s.price);
        opt.dataset.duration = String(s.duration_minutes);
        billingServiceSelect.appendChild(opt);
      });

      services.forEach((s) => {
        const tr = document.createElement("tr");
        const nameTd = document.createElement("td");
        nameTd.textContent = s.name;
        const priceTd = document.createElement("td");
        priceTd.textContent = s.price.toFixed(2);
        const durTd = document.createElement("td");
        durTd.textContent = `${s.duration_minutes} min`;
        const activeTd = document.createElement("td");
        activeTd.textContent = s.is_active ? "Yes" : "No";
        const actionsTd = document.createElement("td");
        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", () => {
          editingServiceId = s.id;
          serviceName.value = s.name;
          servicePrice.value = String(s.price);
          serviceDuration.value = String(s.duration_minutes);
        });
        const delBtn = document.createElement("button");
        delBtn.textContent = "Delete";
        delBtn.addEventListener("click", async () => {
          if (!window.confirm("Delete this service?")) return;
          try {
            await window.api.services.remove(s.id);
            await refreshServices();
          } catch (error) {
            setServiceError("Failed to delete service");
            console.error(error);
          }
        });
        actionsTd.appendChild(editBtn);
        actionsTd.appendChild(delBtn);

        tr.appendChild(nameTd);
        tr.appendChild(priceTd);
        tr.appendChild(durTd);
        tr.appendChild(activeTd);
        tr.appendChild(actionsTd);
        servicesBody.appendChild(tr);
      });

      updateBillingSelectors();
    } catch (error) {
      setServiceError("Failed to load services");
      console.error(error);
    }
  }

  serviceForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setServiceError("");
    const name = serviceName.value.trim();
    const price = Number(servicePrice.value);
    const duration = Number(serviceDuration.value);
    if (!name) {
      setServiceError("Service name is required");
      return;
    }
    try {
      if (editingServiceId) {
        await window.api.services.update({
          id: editingServiceId,
          name,
          price,
          duration_minutes: duration,
        });
      } else {
        await window.api.services.add({
          name,
          price,
          duration_minutes: duration,
        });
      }
      editingServiceId = null;
      serviceName.value = "";
      servicePrice.value = "";
      serviceDuration.value = "";
      await refreshServices();
    } catch (error) {
      setServiceError("Failed to save service");
      console.error(error);
    }
  });

  serviceClear.addEventListener("click", () => {
    editingServiceId = null;
    serviceName.value = "";
    servicePrice.value = "";
    serviceDuration.value = "";
    setServiceError("");
  });

  // Staff
  function setStaffError(message) {
    staffError.textContent = message || "";
    staffError.style.display = message ? "block" : "none";
  }

  async function refreshStaff() {
    try {
      setStaffError("");
      const staff = await window.api.staff.list();
      staffBody.innerHTML = "";
      billingStaffSelect.innerHTML = "";
      const activeStaff = staff.filter((s) => s.is_active);
      activeStaff.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = String(s.id);
        opt.textContent = `${s.name} (${s.role})`;
        billingStaffSelect.appendChild(opt);
      });

      staff.forEach((s) => {
        const tr = document.createElement("tr");
        const nameTd = document.createElement("td");
        nameTd.textContent = s.name;
        const roleTd = document.createElement("td");
        roleTd.textContent = s.role;
        const activeTd = document.createElement("td");
        activeTd.textContent = s.is_active ? "Yes" : "No";
        const actionsTd = document.createElement("td");
        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", () => {
          editingStaffId = s.id;
          staffName.value = s.name;
          staffRole.value = s.role;
        });
        const delBtn = document.createElement("button");
        delBtn.textContent = "Delete";
        delBtn.addEventListener("click", async () => {
          if (!window.confirm("Delete this staff member?")) return;
          try {
            await window.api.staff.remove(s.id);
            await refreshStaff();
          } catch (error) {
            setStaffError("Failed to delete staff");
            console.error(error);
          }
        });
        actionsTd.appendChild(editBtn);
        actionsTd.appendChild(delBtn);

        tr.appendChild(nameTd);
        tr.appendChild(roleTd);
        tr.appendChild(activeTd);
        tr.appendChild(actionsTd);
        staffBody.appendChild(tr);
      });
    } catch (error) {
      setStaffError("Failed to load staff");
      console.error(error);
    }
  }

  staffForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStaffError("");
    const name = staffName.value.trim();
    const role = staffRole.value.trim();
    if (!name) {
      setStaffError("Staff name is required");
      return;
    }
    if (!role) {
      setStaffError("Staff role is required");
      return;
    }
    try {
      if (editingStaffId) {
        await window.api.staff.update({ id: editingStaffId, name, role });
      } else {
        await window.api.staff.add({ name, role });
      }
      editingStaffId = null;
      staffName.value = "";
      staffRole.value = "";
      await refreshStaff();
    } catch (error) {
      setStaffError("Failed to save staff");
      console.error(error);
    }
  });

  staffClear.addEventListener("click", () => {
    editingStaffId = null;
    staffName.value = "";
    staffRole.value = "";
    setStaffError("");
  });

  // Billing
  function setBillingError(message) {
    billingError.textContent = message || "";
    billingError.style.display = message ? "block" : "none";
  }

  function clearBillingCustomerSelection() {
    selectedBillingCustomerId = null;
  }

  function hideBillingCustomerSuggestions() {
    billingCustomerSuggestions.style.display = "none";
    billingCustomerSuggestions.innerHTML = "";
  }

  function renderBillingCustomerSuggestions(customers) {
    if (!customers.length) {
      hideBillingCustomerSuggestions();
      return;
    }
    billingCustomerSuggestions.innerHTML = "";
    customers.slice(0, 8).forEach((c) => {
      const div = document.createElement("div");
      div.className = "suggestion-item";
      const phoneText = c.phone ? ` (${c.phone})` : "";
      div.textContent = `${c.name}${phoneText}`;
      div.addEventListener("click", () => {
        billingCustomer.value = `${c.name}${phoneText}`;
        selectedBillingCustomerId = c.id;
        hideBillingCustomerSuggestions();
      });
      billingCustomerSuggestions.appendChild(div);
    });
    billingCustomerSuggestions.style.display = "block";
  }

  billingCustomer.addEventListener("input", async () => {
    setBillingError("");
    clearBillingCustomerSelection();
    const term = billingCustomer.value.trim();
    if (!term) {
      hideBillingCustomerSuggestions();
      return;
    }
    try {
      const customers = await window.api.customers.list({ search: term });
      renderBillingCustomerSuggestions(customers);
    } catch (error) {
      console.error(error);
      hideBillingCustomerSuggestions();
    }
  });

  function renderBillingItems() {
    billingItemsBody.innerHTML = "";
    let total = 0;
    billingItems.forEach((item, index) => {
      const tr = document.createElement("tr");
      const serviceTd = document.createElement("td");
      serviceTd.textContent = item.serviceName;
      const staffTd = document.createElement("td");
      staffTd.textContent = item.staffName || "";
      const priceTd = document.createElement("td");
      priceTd.textContent = item.unitPrice.toFixed(2);
      const qtyTd = document.createElement("td");
      qtyTd.textContent = String(item.quantity);
      const totalTd = document.createElement("td");
      totalTd.textContent = item.lineTotal.toFixed(2);
      const actionsTd = document.createElement("td");
      const removeBtn = document.createElement("button");
      removeBtn.textContent = "X";
      removeBtn.addEventListener("click", () => {
        billingItems.splice(index, 1);
        renderBillingItems();
      });
      actionsTd.appendChild(removeBtn);

      tr.appendChild(serviceTd);
      tr.appendChild(staffTd);
      tr.appendChild(priceTd);
      tr.appendChild(qtyTd);
      tr.appendChild(totalTd);
      tr.appendChild(actionsTd);
      billingItemsBody.appendChild(tr);
      total += item.lineTotal;
    });
    billingTotal.textContent = total.toFixed(2);
  }

  function updateBillingSelectors() {
    // services and staff are updated in their respective refresh functions
  }

  billingAddItem.addEventListener("click", () => {
    setBillingError("");
    const serviceOption = billingServiceSelect.selectedOptions[0];
    if (!serviceOption) {
      setBillingError("Select a service");
      return;
    }
    const staffOption = billingStaffSelect.selectedOptions[0] || null;
    const qty = Number(billingQty.value) || 1;
    const price = Number(serviceOption.dataset.price || "0");
    const duration = Number(serviceOption.dataset.duration || "0");
    const serviceName = serviceOption.textContent || "Service";
    const serviceId = Number(serviceOption.value);
    const staffId = staffOption ? Number(staffOption.value) : null;
    const staffName = staffOption ? staffOption.textContent : null;
    const lineTotal = price * qty;
    billingItems.push({
      serviceId,
      serviceName,
      staffId,
      staffName,
      unitPrice: price,
      duration_minutes: duration,
      quantity: qty,
      lineTotal,
    });
    renderBillingItems();
  });

  billingSave.addEventListener("click", async () => {
    setBillingError("");
    const customerName = billingCustomer.value.trim();
    if (!customerName) {
      setBillingError("Customer is required");
      return;
    }
    if (!billingItems.length) {
      setBillingError("Add at least one service");
      return;
    }
    try {
      await window.api.billing.createBill({
        customerId: selectedBillingCustomerId,
        customerName,
        items: billingItems,
      });
      billingItems = [];
      renderBillingItems();
      billingCustomer.value = "";
      clearBillingCustomerSelection();
      hideBillingCustomerSuggestions();
      billingQty.value = "1";
      window.alert("Bill saved");
    } catch (error) {
      setBillingError("Failed to save bill");
      console.error(error);
    }
  });

  // Reports
  function setReportError(message) {
    reportError.textContent = message || "";
    reportError.style.display = message ? "block" : "none";
  }

  reportLoad.addEventListener("click", async () => {
    setReportError("");
    reportOutput.innerHTML = "";
    const date = reportDate.value;
    if (!date) {
      setReportError("Select a date");
      return;
    }
    try {
      const summary = await window.api.reports.dailySummary(date);
      const parts = [];
      parts.push(`Total revenue: ${summary.totalRevenue.toFixed(2)}`);
      parts.push(`Customers served: ${summary.customersServed}`);
      parts.push("\nMost used services:");
      summary.topServices.forEach((s) => {
        parts.push(
          `- ${s.service_name}: ${
            s.usage_count
          } times, revenue ${s.revenue.toFixed(2)}`
        );
      });
      parts.push("\nService count per staff:");
      summary.staffServiceCounts.forEach((s) => {
        parts.push(`- ${s.staff_name}: ${s.service_count} services`);
      });
      reportOutput.textContent = parts.join("\n");
    } catch (error) {
      setReportError("Failed to load report");
      console.error(error);
    }
  });

  // Backup
  function setBackupError(message) {
    backupError.textContent = message || "";
    backupError.style.display = message ? "block" : "none";
  }

  async function loadBackups() {
    try {
      setBackupError("");
      const backups = await window.api.backup.list();
      backupBody.innerHTML = "";
      backups.forEach((b) => {
        const tr = document.createElement("tr");
        const nameTd = document.createElement("td");
        nameTd.textContent = b.name;
        const actionsTd = document.createElement("td");
        const restoreBtn = document.createElement("button");
        restoreBtn.textContent = "Restore";
        restoreBtn.addEventListener("click", async () => {
          if (!window.confirm("Restore this backup and restart app?")) return;
          try {
            await window.api.backup.restore(b.name);
          } catch (error) {
            setBackupError("Failed to restore backup");
            console.error(error);
          }
        });
        actionsTd.appendChild(restoreBtn);
        tr.appendChild(nameTd);
        tr.appendChild(actionsTd);
        backupBody.appendChild(tr);
      });
    } catch (error) {
      setBackupError("Failed to load backups");
      console.error(error);
    }
  }

  backupCreate.addEventListener("click", async () => {
    try {
      setBackupError("");
      await window.api.backup.create();
      await loadBackups();
      window.alert("Backup created");
    } catch (error) {
      setBackupError("Failed to create backup");
      console.error(error);
    }
  });

  // Initialize
  const today = new Date().toISOString().slice(0, 10);
  reportDate.value = today;
  initLockScreen();
});
