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
  const customerGender = document.getElementById("customer-gender");
  const customerDob = document.getElementById("customer-dob");
  const customerBirthdayReminder = document.getElementById(
    "customer-birthday-reminder"
  );
  const customerAnniversary = document.getElementById("customer-anniversary");
  const customerAnniversaryReminder = document.getElementById(
    "customer-anniversary-reminder"
  );
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

  // Appointments
  const appointmentForm = document.getElementById("appointment-form");
  const appointmentStart = document.getElementById("appointment-start");
  const appointmentCustomer = document.getElementById("appointment-customer");
  const appointmentCustomerSuggestions = document.getElementById(
    "appointment-customer-suggestions"
  );
  const appointmentServiceSelect = document.getElementById(
    "appointment-service"
  );
  const appointmentStaffSelect = document.getElementById("appointment-staff");
  const appointmentWalkin = document.getElementById("appointment-walkin");
  const appointmentError = document.getElementById("appointment-error");
  const appointmentDate = document.getElementById("appointment-date");
  const appointmentsBody = document.getElementById("appointments-body");
  let selectedAppointmentCustomerId = null;

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
        const loyaltyTd = document.createElement("td");
        loyaltyTd.textContent = c.loyalty_points ?? 0;
        const createdTd = document.createElement("td");
        createdTd.textContent = c.created_at || "";
        const actionsTd = document.createElement("td");
        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", () => {
          editingCustomerId = c.id;
          customerName.value = c.name;
          customerPhone.value = c.phone || "";
          customerGender.value = c.gender || "";
          customerDob.value = c.date_of_birth || "";
          customerBirthdayReminder.checked = !!c.birthday_reminder_enabled;
          customerAnniversary.value = c.anniversary_date || "";
          customerAnniversaryReminder.checked =
            !!c.anniversary_reminder_enabled;
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
        tr.appendChild(loyaltyTd);
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
    const gender = customerGender.value || null;
    const date_of_birth = customerDob.value || null;
    const birthday_reminder_enabled = customerBirthdayReminder.checked;
    const anniversary_date = customerAnniversary.value || null;
    const anniversary_reminder_enabled = customerAnniversaryReminder.checked;
    try {
      if (editingCustomerId) {
        await window.api.customers.update({
          id: editingCustomerId,
          name,
          phone,
          gender,
          date_of_birth,
          birthday_reminder_enabled,
          anniversary_date,
          anniversary_reminder_enabled,
        });
      } else {
        await window.api.customers.add({
          name,
          phone,
          gender,
          date_of_birth,
          birthday_reminder_enabled,
          anniversary_date,
          anniversary_reminder_enabled,
        });
      }
      editingCustomerId = null;
      customerName.value = "";
      customerPhone.value = "";
      customerGender.value = "";
      customerDob.value = "";
      customerBirthdayReminder.checked = false;
      customerAnniversary.value = "";
      customerAnniversaryReminder.checked = false;
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
    customerGender.value = "";
    customerDob.value = "";
    customerBirthdayReminder.checked = false;
    customerAnniversary.value = "";
    customerAnniversaryReminder.checked = false;
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
      const activeServices = services.filter((s) => s.is_active);
      servicesBody.innerHTML = "";
      billingServiceSelect.innerHTML = "";
      activeServices.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = String(s.id);
        opt.textContent = `${s.name} (${s.price.toFixed(2)})`;
        opt.dataset.price = String(s.price);
        opt.dataset.duration = String(s.duration_minutes);
        billingServiceSelect.appendChild(opt);
      });

      activeServices.forEach((s) => {
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
      const activeStaff = staff.filter((s) => s.is_active);
      staffBody.innerHTML = "";
      billingStaffSelect.innerHTML = "";
      activeStaff.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = String(s.id);
        opt.textContent = `${s.name} (${s.role})`;
        billingStaffSelect.appendChild(opt);
      });

      activeStaff.forEach((s) => {
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
    // Also keep appointment selectors in sync
    if (billingServiceSelect && appointmentServiceSelect) {
      appointmentServiceSelect.innerHTML = billingServiceSelect.innerHTML;
    }
    if (billingStaffSelect && appointmentStaffSelect) {
      appointmentStaffSelect.innerHTML = billingStaffSelect.innerHTML;
    }
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

  // Appointments
  function setAppointmentError(message) {
    appointmentError.textContent = message || "";
    appointmentError.style.display = message ? "block" : "none";
  }

  function clearAppointmentCustomerSelection() {
    selectedAppointmentCustomerId = null;
  }

  function hideAppointmentCustomerSuggestions() {
    appointmentCustomerSuggestions.style.display = "none";
    appointmentCustomerSuggestions.innerHTML = "";
  }

  function renderAppointmentCustomerSuggestions(customers) {
    if (!customers.length) {
      hideAppointmentCustomerSuggestions();
      return;
    }
    appointmentCustomerSuggestions.innerHTML = "";
    customers.slice(0, 8).forEach((c) => {
      const div = document.createElement("div");
      div.className = "suggestion-item";
      const phoneText = c.phone ? ` (${c.phone})` : "";
      div.textContent = `${c.name}${phoneText}`;
      div.addEventListener("click", () => {
        appointmentCustomer.value = `${c.name}${phoneText}`;
        selectedAppointmentCustomerId = c.id;
        hideAppointmentCustomerSuggestions();
      });
      appointmentCustomerSuggestions.appendChild(div);
    });
    appointmentCustomerSuggestions.style.display = "block";
  }

  appointmentCustomer.addEventListener("input", async () => {
    setAppointmentError("");
    clearAppointmentCustomerSelection();
    const term = appointmentCustomer.value.trim();
    if (!term) {
      hideAppointmentCustomerSuggestions();
      return;
    }
    try {
      const customers = await window.api.customers.list({ search: term });
      renderAppointmentCustomerSuggestions(customers);
    } catch (error) {
      console.error(error);
      hideAppointmentCustomerSuggestions();
    }
  });

  async function loadAppointmentsForDate(dateStr) {
    if (!dateStr) return;
    try {
      setAppointmentError("");
      const appts = await window.api.appointments.listByRange(
        dateStr,
        dateStr,
        null
      );
      appointmentsBody.innerHTML = "";
      appts.forEach((a) => {
        const tr = document.createElement("tr");
        const timeTd = document.createElement("td");
        const start = new Date(a.start_time);
        timeTd.textContent = start.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        const customerTd = document.createElement("td");
        customerTd.textContent = a.customer_name;
        const serviceTd = document.createElement("td");
        serviceTd.textContent = ""; // simplified; could join services if needed
        const staffTd = document.createElement("td");
        staffTd.textContent = "";
        const statusTd = document.createElement("td");
        statusTd.textContent = a.status;

        tr.appendChild(timeTd);
        tr.appendChild(customerTd);
        tr.appendChild(serviceTd);
        tr.appendChild(staffTd);
        tr.appendChild(statusTd);
        appointmentsBody.appendChild(tr);
      });
    } catch (error) {
      setAppointmentError("Failed to load appointments");
      console.error(error);
    }
  }

  appointmentDate.addEventListener("change", () => {
    loadAppointmentsForDate(appointmentDate.value);
  });

  appointmentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setAppointmentError("");
    const startValue = appointmentStart.value;
    const customerName = appointmentCustomer.value.trim();
    const serviceOption = appointmentServiceSelect.selectedOptions[0];
    const staffOption = appointmentStaffSelect.selectedOptions[0] || null;
    if (!startValue) {
      setAppointmentError("Start date/time is required");
      return;
    }
    if (!customerName) {
      setAppointmentError("Customer is required");
      return;
    }
    if (!serviceOption) {
      setAppointmentError("Service is required");
      return;
    }
    try {
      const serviceId = Number(serviceOption.value);
      const serviceName = serviceOption.textContent || "Service";
      const duration = Number(serviceOption.dataset.duration || "0");
      const price = Number(serviceOption.dataset.price || "0");
      const staffId = staffOption ? Number(staffOption.value) : null;
      const staffName = staffOption ? staffOption.textContent : null;

      await window.api.appointments.create({
        customerId: selectedAppointmentCustomerId,
        customerName,
        isWalkIn: appointmentWalkin.checked,
        startTime: new Date(startValue).toISOString(),
        items: [
          {
            serviceId,
            serviceName,
            duration_minutes: duration,
            staffId,
            staffName,
            price,
          },
        ],
      });

      appointmentCustomer.value = "";
      clearAppointmentCustomerSelection();
      hideAppointmentCustomerSuggestions();
      appointmentWalkin.checked = false;

      const selectedDate = appointmentDate.value || startValue.slice(0, 10);
      if (!appointmentDate.value) {
        appointmentDate.value = selectedDate;
      }
      loadAppointmentsForDate(selectedDate);
    } catch (error) {
      setAppointmentError("Failed to book appointment");
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
  if (appointmentDate) {
    appointmentDate.value = today;
    loadAppointmentsForDate(today);
  }
  initLockScreen();
});
