const { contextBridge, ipcRenderer } = require("electron");

const api = {
  auth: {
    hasPin() {
      return ipcRenderer.invoke("auth:hasPin");
    },
    setPin({ currentPin, newPin }) {
      return ipcRenderer.invoke("auth:setPin", { currentPin, newPin });
    },
    login({ pin }) {
      return ipcRenderer.invoke("auth:login", { pin });
    },
  },
  customers: {
    list({ search } = {}) {
      return ipcRenderer.invoke("customers:list", { search });
    },
    add(data) {
      return ipcRenderer.invoke("customers:add", data);
    },
    update(data) {
      return ipcRenderer.invoke("customers:update", data);
    },
    remove(id) {
      return ipcRenderer.invoke("customers:delete", id);
    },
    visitHistory(customerId) {
      return ipcRenderer.invoke("customers:visitHistory", customerId);
    },
  },
  services: {
    list() {
      return ipcRenderer.invoke("services:list");
    },
    add(data) {
      return ipcRenderer.invoke("services:add", data);
    },
    update(data) {
      return ipcRenderer.invoke("services:update", data);
    },
    remove(id) {
      return ipcRenderer.invoke("services:delete", id);
    },
  },
  staff: {
    list() {
      return ipcRenderer.invoke("staff:list");
    },
    add(data) {
      return ipcRenderer.invoke("staff:add", data);
    },
    update(data) {
      return ipcRenderer.invoke("staff:update", data);
    },
    remove(id) {
      return ipcRenderer.invoke("staff:delete", id);
    },
  },
  appointments: {
    create(data) {
      return ipcRenderer.invoke("appointments:create", data);
    },
    listByRange(from, to, staffId) {
      return ipcRenderer.invoke("appointments:listByRange", {
        from,
        to,
        staffId,
      });
    },
    updateStatus(data) {
      return ipcRenderer.invoke("appointments:updateStatus", data);
    },
  },
  billing: {
    createBill(data) {
      return ipcRenderer.invoke("billing:createBill", data);
    },
    getBill(billId) {
      return ipcRenderer.invoke("billing:getBill", billId);
    },
  },
  reports: {
    dailySummary(date) {
      return ipcRenderer.invoke("reports:dailySummary", { date });
    },
    dailyCashClosing(date) {
      return ipcRenderer.invoke("reports:dailyCashClosing", { date });
    },
  },
  expenses: {
    add(data) {
      return ipcRenderer.invoke("expenses:add", data);
    },
    listByRange(from, to) {
      return ipcRenderer.invoke("expenses:listByRange", { from, to });
    },
  },
  inventory: {
    listProducts() {
      return ipcRenderer.invoke("inventory:products:list");
    },
    addProduct(data) {
      return ipcRenderer.invoke("inventory:products:add", data);
    },
    updateProduct(data) {
      return ipcRenderer.invoke("inventory:products:update", data);
    },
    deactivateProduct(id) {
      return ipcRenderer.invoke("inventory:products:deactivate", id);
    },
    stockMove(data) {
      return ipcRenderer.invoke("inventory:stockMove", data);
    },
  },
  backup: {
    create() {
      return ipcRenderer.invoke("backup:create");
    },
    list() {
      return ipcRenderer.invoke("backup:list");
    },
    restore(name) {
      return ipcRenderer.invoke("backup:restore", { name });
    },
  },
};

contextBridge.exposeInMainWorld("api", api);
