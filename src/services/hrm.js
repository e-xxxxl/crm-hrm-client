import { api } from "./api.js";

/** Thin wrappers over the HRM endpoints. Components use these, never axios directly. */

export const organizations = {
  list: (params) => api.get("/organizations", { params }).then((r) => r.data),
  get: (id) => api.get(`/organizations/${id}`).then((r) => r.data.data),
  create: (body) => api.post("/organizations", body).then((r) => r.data.data),
  update: (id, body) => api.patch(`/organizations/${id}`, body).then((r) => r.data.data),
  setStatus: (id, status) =>
    api.patch(`/organizations/${id}/status`, { status }).then((r) => r.data.data),
};

export const employees = {
  list: (params) => api.get("/hrm/employees", { params }).then((r) => r.data),
  get: (id) => api.get(`/hrm/employees/${id}`).then((r) => r.data.data),
  // Resolves to { employee, tempPassword } — .create() alone drops the
  // response's `meta` (login credentials), so keep this raw for callers that
  // provision a login inline (EmployeeForm's "Platform access" section).
  create: (body) => api.post("/hrm/employees", body).then((r) => ({ employee: r.data.data, tempPassword: r.data.meta?.login?.tempPassword ?? null })),
  update: (id, body) => api.patch(`/hrm/employees/${id}`, body).then((r) => r.data.data),
  setStatus: (id, status, reason) =>
    api.patch(`/hrm/employees/${id}/status`, { status, reason }).then((r) => r.data.data),
  provisionLogin: (id, body) =>
    api.post(`/hrm/employees/${id}/login`, body).then((r) => ({ userId: r.data.data.userId, email: r.data.data.email, tempPassword: r.data.meta?.tempPassword ?? null })),
};

export const departments = {
  list: (params) => api.get("/hrm/departments", { params }).then((r) => r.data),
  get: (id) => api.get(`/hrm/departments/${id}`).then((r) => r.data.data),
  create: (body) => api.post("/hrm/departments", body).then((r) => r.data.data),
  update: (id, body) => api.patch(`/hrm/departments/${id}`, body).then((r) => r.data.data),
  setStatus: (id, status) =>
    api.patch(`/hrm/departments/${id}/status`, { status }).then((r) => r.data.data),
};

export const attendance = {
  me: () => api.get("/hrm/attendance/me").then((r) => r.data.data),
  clockIn: (coords) => api.post("/hrm/attendance/clock-in", coords).then((r) => r.data.data),
  clockOut: (coords) => api.post("/hrm/attendance/clock-out", coords).then((r) => r.data.data),
  today: (params) => api.get("/hrm/attendance/today", { params }).then((r) => r.data),
  records: (params) => api.get("/hrm/attendance/records", { params }).then((r) => r.data),
  monthly: (params) => api.get("/hrm/attendance/reports/monthly", { params }).then((r) => r.data.data),
  manual: (body) => api.post("/hrm/attendance/manual", body).then((r) => r.data.data),
};

export const leave = {
  myLeave: () => api.get("/hrm/leave/me").then((r) => r.data.data),
  types: (params) => api.get("/hrm/leave/types", { params }).then((r) => r.data.data),
  createType: (body) => api.post("/hrm/leave/types", body).then((r) => r.data.data),
  updateType: (id, body) => api.patch(`/hrm/leave/types/${id}`, body).then((r) => r.data.data),
  setTypeActive: (id, active) =>
    api.patch(`/hrm/leave/types/${id}/active`, { active }).then((r) => r.data.data),
  balances: (employeeId, year) =>
    api.get(`/hrm/leave/balances/${employeeId}`, { params: { year } }).then((r) => r.data.data),
  adjustBalance: (body) => api.post("/hrm/leave/balances/adjust", body).then((r) => r.data.data),
  requests: (params) => api.get("/hrm/leave/requests", { params }).then((r) => r.data),
  request: (id) => api.get(`/hrm/leave/requests/${id}`).then((r) => r.data.data),
  createRequest: (body) => api.post("/hrm/leave/requests", body).then((r) => r.data.data),
  updateRequest: (id, body) => api.patch(`/hrm/leave/requests/${id}`, body).then((r) => r.data.data),
  cancelRequest: (id) => api.post(`/hrm/leave/requests/${id}/cancel`).then((r) => r.data.data),
  addNote: (id, note) => api.post(`/hrm/leave/requests/${id}/note`, { note }).then((r) => r.data.data),
  managerDecision: (id, body) =>
    api.post(`/hrm/leave/requests/${id}/manager-decision`, body).then((r) => r.data.data),
  hrDecision: (id, body) =>
    api.post(`/hrm/leave/requests/${id}/hr-decision`, body).then((r) => r.data.data),
  calendar: (params) => api.get("/hrm/leave/calendar", { params }).then((r) => r.data.data),
};

export const payroll = {
  structure: (employeeId) => api.get(`/hrm/payroll/structures/${employeeId}`).then((r) => r.data.data),
  setStructure: (employeeId, body) =>
    api.put(`/hrm/payroll/structures/${employeeId}`, body).then((r) => r.data.data),
  runs: (params) => api.get("/hrm/payroll/runs", { params }).then((r) => r.data),
  run: (id) => api.get(`/hrm/payroll/runs/${id}`).then((r) => r.data.data),
  createRun: (body) => api.post("/hrm/payroll/runs", body).then((r) => r.data.data),
  calculateRun: (id, body) => api.post(`/hrm/payroll/runs/${id}/calculate`, body || {}).then((r) => r.data.data),
  approveRun: (id) => api.post(`/hrm/payroll/runs/${id}/approve`).then((r) => r.data.data),
  finalizeRun: (id) => api.post(`/hrm/payroll/runs/${id}/finalize`).then((r) => r.data.data),
  cancelRun: (id) => api.post(`/hrm/payroll/runs/${id}/cancel`).then((r) => r.data.data),
  bankExportUrl: (id) => `/hrm/payroll/runs/${id}/bank-export`,
  payslips: (params) => api.get("/hrm/payroll/payslips", { params }).then((r) => r.data),
  payslip: (id) => api.get(`/hrm/payroll/payslips/${id}`).then((r) => r.data.data),
  myPayslips: () => api.get("/hrm/payroll/payslips/mine").then((r) => r.data.data),
  markPaid: (id) => api.post(`/hrm/payroll/payslips/${id}/mark-paid`).then((r) => r.data.data),
  payslipPdfUrl: (id) => `/hrm/payroll/payslips/${id}/pdf`,
  trips: (params) => api.get("/hrm/payroll/trips", { params }).then((r) => r.data),
  createTrip: (body) => api.post("/hrm/payroll/trips", body).then((r) => r.data.data),
  importTrips: (rows) => api.post("/hrm/payroll/trips/bulk", { rows }).then((r) => r.data.data),
  deleteTrip: (id) => api.delete(`/hrm/payroll/trips/${id}`).then((r) => r.data.data),
};

/** Fetch a binary endpoint with auth and trigger a browser download. */
export async function downloadFile(url, filename) {
  const res = await api.get(url, { responseType: "blob" });
  const blobUrl = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

export const performance = {
  dashboard: (params) => api.get("/hrm/performance/dashboard", { params }).then((r) => r.data.data),
  kpis: (params) => api.get("/hrm/performance/kpis", { params }).then((r) => r.data.data),
  createKpi: (body) => api.post("/hrm/performance/kpis", body).then((r) => r.data.data),
  updateKpi: (id, body) => api.patch(`/hrm/performance/kpis/${id}`, body).then((r) => r.data.data),
  reviews: (params) => api.get("/hrm/performance/reviews", { params }).then((r) => r.data),
  review: (id) => api.get(`/hrm/performance/reviews/${id}`).then((r) => r.data.data),
  createReview: (body) => api.post("/hrm/performance/reviews", body).then((r) => r.data.data),
  updateReview: (id, body) => api.patch(`/hrm/performance/reviews/${id}`, body).then((r) => r.data.data),
  transitionReview: (id, action) =>
    api.post(`/hrm/performance/reviews/${id}/transition`, { action }).then((r) => r.data.data),
};

export const targets = {
  summary: () => api.get("/hrm/targets/summary").then((r) => r.data.data),
  list: (params) => api.get("/hrm/targets", { params }).then((r) => r.data),
  get: (id) => api.get(`/hrm/targets/${id}`).then((r) => r.data.data),
  create: (body) => api.post("/hrm/targets", body).then((r) => r.data.data),
  update: (id, body) => api.patch(`/hrm/targets/${id}`, body).then((r) => r.data.data),
  addProgress: (id, body) => api.post(`/hrm/targets/${id}/progress`, body).then((r) => r.data.data),
};

export const recruitment = {
  summary: () => api.get("/hrm/recruitment/summary").then((r) => r.data.data),
  jobs: (params) => api.get("/hrm/recruitment/jobs", { params }).then((r) => r.data),
  job: (id) => api.get(`/hrm/recruitment/jobs/${id}`).then((r) => r.data.data),
  createJob: (body) => api.post("/hrm/recruitment/jobs", body).then((r) => r.data.data),
  updateJob: (id, body) => api.patch(`/hrm/recruitment/jobs/${id}`, body).then((r) => r.data.data),
  pipeline: (jobId) => api.get(`/hrm/recruitment/jobs/${jobId}/pipeline`).then((r) => r.data.data),
  applicants: (params) => api.get("/hrm/recruitment/applicants", { params }).then((r) => r.data),
  applicant: (id) => api.get(`/hrm/recruitment/applicants/${id}`).then((r) => r.data.data),
  addApplicant: (body) => api.post("/hrm/recruitment/applicants", body).then((r) => r.data.data),
  updateApplicant: (id, body) => api.patch(`/hrm/recruitment/applicants/${id}`, body).then((r) => r.data.data),
  moveStage: (id, body) => api.post(`/hrm/recruitment/applicants/${id}/stage`, body).then((r) => r.data.data),
  scheduleInterview: (id, body) =>
    api.post(`/hrm/recruitment/applicants/${id}/interviews`, body).then((r) => r.data.data),
  interviewFeedback: (id, index, body) =>
    api.post(`/hrm/recruitment/applicants/${id}/interviews/${index}/feedback`, body).then((r) => r.data.data),
  addNote: (id, note) => api.post(`/hrm/recruitment/applicants/${id}/note`, { note }).then((r) => r.data.data),
  convert: (id, body) => api.post(`/hrm/recruitment/applicants/${id}/convert`, body).then((r) => r.data.data),
};

export const documents = {
  summary: () => api.get("/hrm/documents/summary").then((r) => r.data.data),
  list: (params) => api.get("/hrm/documents", { params }).then((r) => r.data),
  get: (id) => api.get(`/hrm/documents/${id}`).then((r) => r.data.data),
  create: (body) => api.post("/hrm/documents", body).then((r) => r.data.data),
  update: (id, body) => api.patch(`/hrm/documents/${id}`, body).then((r) => r.data.data),
  archive: (id) => api.post(`/hrm/documents/${id}/archive`).then((r) => r.data.data),
  remove: (id) => api.delete(`/hrm/documents/${id}`).then((r) => r.data.data),
};

export const disciplinary = {
  list: (params) => api.get("/hrm/disciplinary", { params }).then((r) => r.data),
  get: (id) => api.get(`/hrm/disciplinary/${id}`).then((r) => r.data.data),
  create: (body) => api.post("/hrm/disciplinary", body).then((r) => r.data.data),
  update: (id, body) => api.patch(`/hrm/disciplinary/${id}`, body).then((r) => r.data.data),
  issueQuery: (id, body) => api.post(`/hrm/disciplinary/${id}/query`, body).then((r) => r.data.data),
  queryLetterUrl: (id) => `/hrm/disciplinary/${id}/query-letter`,
  recordResponse: (id, body) => api.post(`/hrm/disciplinary/${id}/response`, body).then((r) => r.data.data),
  scheduleHearing: (id, body) => api.post(`/hrm/disciplinary/${id}/hearing`, body).then((r) => r.data.data),
  recordHearing: (id, body) => api.post(`/hrm/disciplinary/${id}/hearing/record`, body).then((r) => r.data.data),
  recordOutcome: (id, body) => api.post(`/hrm/disciplinary/${id}/outcome`, body).then((r) => r.data.data),
  addNote: (id, note) => api.post(`/hrm/disciplinary/${id}/note`, { note }).then((r) => r.data.data),
};

/** Upload a file, return { id, url, ... }. */
export async function uploadFile(file, purpose = "document") {
  const form = new FormData();
  form.append("file", file);
  form.append("purpose", purpose);
  const res = await api.post("/hrm/files", form, { headers: { "Content-Type": "multipart/form-data" } });
  return res.data.data;
}

export const notifications = {
  list: (params) => api.get("/hrm/notifications", { params }).then((r) => r.data),
  unreadCount: () => api.get("/hrm/notifications/unread-count").then((r) => r.data.data.unread),
  markRead: (id) => api.patch(`/hrm/notifications/${id}/read`).then((r) => r.data.data),
  markAllRead: () => api.post("/hrm/notifications/read-all").then((r) => r.data.data),
};

export const reports = {
  hr: (params) => api.get("/hrm/reports/hr", { params }).then((r) => r.data.data),
};

export const settings = {
  get: () => api.get("/hrm/settings").then((r) => r.data.data),
  update: (body) => api.patch("/hrm/settings", body).then((r) => r.data.data),
};

export const maintenance = {
  runHrChecks: () => api.post("/hrm/maintenance/run-hr-checks", {}).then((r) => r.data.data),
};

export const branches = {
  list: (params) => api.get("/hrm/branches", { params }).then((r) => r.data),
  get: (id) => api.get(`/hrm/branches/${id}`).then((r) => r.data.data),
  create: (body) => api.post("/hrm/branches", body).then((r) => r.data.data),
  update: (id, body) => api.patch(`/hrm/branches/${id}`, body).then((r) => r.data.data),
  setStatus: (id, status) =>
    api.patch(`/hrm/branches/${id}/status`, { status }).then((r) => r.data.data),
};
