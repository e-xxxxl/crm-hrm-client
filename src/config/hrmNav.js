/**
 * HRM primary navigation. `perm` (single string or array) gates visibility
 * against the session's permissions — `mode` defaults to "any".
 * Order matches the product specification.
 */
export const HRM_NAV = [
  { to: "/hrm", label: "Overview", exact: true, perm: ["employee:read", "report:hr"], mode: "any" },
  { to: "/hrm/employees", label: "Employees", perm: "employee:read" },
  { to: "/hrm/attendance", label: "Attendance", perm: "attendance:read" },
  { to: "/hrm/leave", label: "Leave Management", perm: "leave:read" },
  { to: "/hrm/payroll", label: "Payroll", perm: ["payroll:read", "payroll:read_own"], mode: "any" },
  { to: "/hrm/performance", label: "Performance", perm: "performance:read" },
  { to: "/hrm/targets", label: "Targets & KPIs", perm: "target:read" },
  { to: "/hrm/recruitment", label: "Recruitment", perm: "recruitment:read" },
  { to: "/hrm/documents", label: "Documents & Contracts", perm: "document:read" },
  { to: "/hrm/disciplinary", label: "Disciplinary Records", perm: "disciplinary:read" },
  { to: "/hrm/departments", label: "Departments", perm: "department:read" },
  { to: "/hrm/branches", label: "Branches", perm: "branch:read" },
  { to: "/hrm/notifications", label: "Notifications", perm: "notification:read" },
  { to: "/hrm/reports", label: "HR Reports", perm: "report:hr" },
  { to: "/hrm/audit", label: "Audit Log", perm: "audit:read" },
  { to: "/hrm/settings", label: "HR Settings", perm: "settings:read" },
];

export function visibleNav(nav, can) {
  return nav.filter((item) => {
    if (!item.perm) return true;
    const list = Array.isArray(item.perm) ? item.perm : [item.perm];
    return (item.mode === "all" ? list.every : list.some).call(list, (p) => can(p));
  });
}
