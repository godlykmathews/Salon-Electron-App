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
