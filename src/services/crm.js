import { api } from "./api.js";

/** Thin wrappers over the CRM endpoints. */

export const brand = {
  current: () => api.get("/crm/brands/current").then((r) => r.data.data),
  list: (all) => api.get("/crm/brands", { params: all ? { all: "true" } : {} }).then((r) => r.data.data),
  update: (body) => api.patch("/crm/brands/current", body).then((r) => r.data.data),
};

export const tickets = {
  stats: () => api.get("/crm/tickets/stats").then((r) => r.data.data),
  list: (params) => api.get("/crm/tickets", { params }).then((r) => r.data),
  get: (id) => api.get(`/crm/tickets/${id}`).then((r) => r.data.data),
  create: (body) => api.post("/crm/tickets", body).then((r) => r.data.data),
  addUpdate: (id, body) => api.post(`/crm/tickets/${id}/updates`, body).then((r) => r.data.data),
  assign: (id, body) => api.post(`/crm/tickets/${id}/assign`, body).then((r) => r.data.data),
  setStatus: (id, status, note) =>
    api.post(`/crm/tickets/${id}/status`, { status, note }).then((r) => r.data.data),
  setPriority: (id, priority, note) =>
    api.post(`/crm/tickets/${id}/priority`, { priority, note }).then((r) => r.data.data),
  escalate: (id, body) => api.post(`/crm/tickets/${id}/escalate`, body).then((r) => r.data.data),
  setDueDate: (id, dueAt) => api.post(`/crm/tickets/${id}/due-date`, { dueAt }).then((r) => r.data.data),
  watch: (id, watch) => api.post(`/crm/tickets/${id}/watch`, { watch }).then((r) => r.data.data),
};

export const shipments = {
  stats: () => api.get("/crm/shipments/stats").then((r) => r.data.data),
  list: (params) => api.get("/crm/shipments", { params }).then((r) => r.data),
  get: (id) => api.get(`/crm/shipments/${id}`).then((r) => r.data.data),
  track: (trackingNumber) => api.get(`/crm/shipments/track/${trackingNumber}`).then((r) => r.data.data),
  create: (body) => api.post("/crm/shipments", body).then((r) => r.data.data),
  updateStatus: (id, body) => api.post(`/crm/shipments/${id}/status`, body).then((r) => r.data.data),
  assignRider: (id, body) => api.post(`/crm/shipments/${id}/assign-rider`, body).then((r) => r.data.data),
  capturePod: (id, body) => api.post(`/crm/shipments/${id}/pod`, body).then((r) => r.data.data),
  remitCod: (id) => api.post(`/crm/shipments/${id}/remit-cod`).then((r) => r.data.data),
};

export const orders = {
  stats: () => api.get("/crm/orders/stats").then((r) => r.data.data),
  quote: (body) => api.post("/crm/orders/quote", body).then((r) => r.data.data),
  list: (params) => api.get("/crm/orders", { params }).then((r) => r.data),
  get: (id) => api.get(`/crm/orders/${id}`).then((r) => r.data.data),
  create: (body) => api.post("/crm/orders", body).then((r) => r.data.data),
  requote: (id, body) => api.post(`/crm/orders/${id}/requote`, body).then((r) => r.data.data),
  confirm: (id) => api.post(`/crm/orders/${id}/confirm`).then((r) => r.data.data),
  payment: (id, body) => api.post(`/crm/orders/${id}/payment`, body).then((r) => r.data.data),
  updateStatus: (id, body) => api.post(`/crm/orders/${id}/status`, body).then((r) => r.data.data),
  assignRider: (id, body) => api.post(`/crm/orders/${id}/assign-rider`, body).then((r) => r.data.data),
};

export const marketplace = {
  businessStats: () => api.get("/crm/marketplace/businesses/stats").then((r) => r.data.data),
  businesses: (params) => api.get("/crm/marketplace/businesses", { params }).then((r) => r.data),
  business: (id) => api.get(`/crm/marketplace/businesses/${id}`).then((r) => r.data.data),
  createBusiness: (body) => api.post("/crm/marketplace/businesses", body).then((r) => r.data.data),
  updateBusiness: (id, body) => api.patch(`/crm/marketplace/businesses/${id}`, body).then((r) => r.data.data),
  moderateBusiness: (id, body) => api.post(`/crm/marketplace/businesses/${id}/moderate`, body).then((r) => r.data.data),
  setSubscription: (id, body) => api.post(`/crm/marketplace/businesses/${id}/subscription`, body).then((r) => r.data.data),

  leadBoard: (params) => api.get("/crm/marketplace/leads/board", { params }).then((r) => r.data.data),
  leadStats: () => api.get("/crm/marketplace/leads/stats").then((r) => r.data.data),
  leads: (params) => api.get("/crm/marketplace/leads", { params }).then((r) => r.data),
  lead: (id) => api.get(`/crm/marketplace/leads/${id}`).then((r) => r.data.data),
  createLead: (body) => api.post("/crm/marketplace/leads", body).then((r) => r.data.data),
  moveLeadStage: (id, body) => api.post(`/crm/marketplace/leads/${id}/stage`, body).then((r) => r.data.data),
  addLeadActivity: (id, body) => api.post(`/crm/marketplace/leads/${id}/activity`, body).then((r) => r.data.data),
  assignLead: (id, body) => api.post(`/crm/marketplace/leads/${id}/assign`, body).then((r) => r.data.data),

  reviews: (params) => api.get("/crm/marketplace/reviews", { params }).then((r) => r.data),
  createReview: (body) => api.post("/crm/marketplace/reviews", body).then((r) => r.data.data),
  moderateReview: (id, body) => api.post(`/crm/marketplace/reviews/${id}/moderate`, body).then((r) => r.data.data),
  respondToReview: (id, body) => api.post(`/crm/marketplace/reviews/${id}/response`, body).then((r) => r.data.data),
};

export const tasks = {
  stats: () => api.get("/crm/tasks/stats").then((r) => r.data.data),
  list: (params) => api.get("/crm/tasks", { params }).then((r) => r.data),
  get: (id) => api.get(`/crm/tasks/${id}`).then((r) => r.data.data),
  create: (body) => api.post("/crm/tasks", body).then((r) => r.data.data),
  update: (id, body) => api.patch(`/crm/tasks/${id}`, body).then((r) => r.data.data),
  complete: (id, outcome) => api.post(`/crm/tasks/${id}/complete`, { outcome }).then((r) => r.data.data),
  comment: (id, body) => api.post(`/crm/tasks/${id}/comments`, { body }).then((r) => r.data.data),
};

export const communications = {
  list: (params) => api.get("/crm/communications", { params }).then((r) => r.data),
  log: (body) => api.post("/crm/communications", body).then((r) => r.data.data),
  remove: (id) => api.delete(`/crm/communications/${id}`).then((r) => r.data.data),
};

export const sales = {
  overview: (params) => api.get("/crm/sales/overview", { params }).then((r) => r.data.data),
};

export const sync = {
  status: () => api.get("/crm/sync/status").then((r) => r.data.data),
  run: (brand, body) => api.post(`/crm/sync/${brand}`, body || {}).then((r) => r.data.data),
};

export const reports = {
  group: () => api.get("/reports/group").then((r) => r.data.data),
  support: (params) => api.get("/reports/support", { params }).then((r) => r.data.data),
  logistics: (params) => api.get("/reports/logistics", { params }).then((r) => r.data.data),
};

export const audit = {
  list: (params) => api.get("/audit", { params }).then((r) => r.data),
  facets: () => api.get("/audit/facets").then((r) => r.data.data),
};

export const riders = {
  list: (params) => api.get("/crm/riders", { params }).then((r) => r.data),
  get: (id) => api.get(`/crm/riders/${id}`).then((r) => r.data.data),
  create: (body) => api.post("/crm/riders", body).then((r) => r.data),
  update: (id, body) => api.patch(`/crm/riders/${id}`, body).then((r) => r.data.data),
  provisionLogin: (id, body) => api.post(`/crm/riders/${id}/login`, body || {}).then((r) => r.data.data),
  board: () => api.get("/crm/riders/dispatch/board").then((r) => r.data.data),
  map: () => api.get("/crm/riders/dispatch/map").then((r) => r.data.data),
  optimize: (body) => api.post("/crm/riders/dispatch/optimize", body).then((r) => r.data.data),
};

export const riderPwa = {
  dashboard: () => api.get("/crm/riders/me/dashboard").then((r) => r.data.data),
  job: (id) => api.get(`/crm/riders/me/jobs/${id}`).then((r) => r.data.data),
  action: (id, action, body) => api.post(`/crm/riders/me/jobs/${id}/${action}`, body || {}).then((r) => r.data.data),
  location: (body) => api.post("/crm/riders/me/location", body).then((r) => r.data.data),
  availability: (availability) => api.post("/crm/riders/me/availability", { availability }).then((r) => r.data.data),
};

export const customers = {
  list: (params) => api.get("/crm/customers", { params }).then((r) => r.data),
  search: (q) => api.get("/crm/customers/search", { params: { q } }).then((r) => r.data.data),
  get: (id) => api.get(`/crm/customers/${id}`).then((r) => r.data.data),
  overview: (id, params) => api.get(`/crm/customers/${id}/360`, { params }).then((r) => r.data.data),
  create: (body) => api.post("/crm/customers", body).then((r) => r.data.data),
  update: (id, body) => api.patch(`/crm/customers/${id}`, body).then((r) => r.data.data),
  addNote: (id, body) => api.post(`/crm/customers/${id}/notes`, { body }).then((r) => r.data.data),
  setStatus: (id, status, reason) =>
    api.patch(`/crm/customers/${id}/status`, { status, reason }).then((r) => r.data.data),
};
