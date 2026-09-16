/**
 * CRM primary navigation. `perm` gates visibility against permissions (mode
 * defaults to "any"); `kind` restricts an item to a brand kind
 * (marketplace | logistics | courier).
 */
export const CRM_NAV = [
  { to: "/crm", label: "Overview", exact: true, perm: ["customer:read", "report:crm"], mode: "any" },
  { to: "/crm/customers", label: "Customers", perm: "customer:read" },
  { to: "/crm/tickets", label: "Tickets", perm: "ticket:read" },
  { to: "/crm/tasks", label: "Tasks", perm: "task:read" },

  // AJCL — courier
  { to: "/crm/shipments", label: "Shipments", perm: "shipment:read", kind: "courier" },
  { to: "/crm/dispatch", label: "Dispatch", perm: ["shipment:dispatch", "rider:write"], mode: "any", kind: "courier" },
  { to: "/crm/riders", label: "Riders", perm: "rider:read", kind: "courier" },

  // QuickShipAfrica — logistics
  { to: "/crm/orders", label: "Orders", perm: "order:read", kind: "logistics" },
  { to: "/crm/dispatch", label: "Dispatch", perm: ["order:dispatch", "rider:write"], mode: "any", kind: "logistics" },
  { to: "/crm/riders", label: "Riders", perm: "rider:read", kind: "logistics" },

  // 9jaTradiesPages — marketplace
  { to: "/crm/businesses", label: "Businesses", perm: "business:read", kind: "marketplace" },
  { to: "/crm/leads", label: "Leads", perm: "lead:read", kind: "marketplace" },
  { to: "/crm/reviews", label: "Reviews", perm: "review:read", kind: "marketplace" },

  { to: "/crm/sales", label: "Sales", perm: "report:crm" },
  { to: "/crm/reports", label: "Reports", perm: "report:crm" },
  { to: "/crm/audit", label: "Audit Log", perm: "audit:read" },
  { to: "/crm/brand", label: "Brand Settings", perm: ["settings:write", "org:read"], mode: "any" },
];

export function visibleNav(nav, can, kind) {
  return nav.filter((item) => {
    if (item.kind && item.kind !== kind) return false;
    if (!item.perm) return true;
    const list = Array.isArray(item.perm) ? item.perm : [item.perm];
    return (item.mode === "all" ? list.every : list.some).call(list, (p) => can(p));
  });
}
