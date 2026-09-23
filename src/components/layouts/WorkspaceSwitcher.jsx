import { useNavigate } from "react-router-dom";
import { useAuth } from "../../store/auth.js";

const HRM_PERMS = ["employee:read", "attendance:read", "leave:read", "payroll:read", "payroll:read_own", "report:hr"];
const CRM_PERMS = ["customer:read", "ticket:read", "shipment:read", "lead:read", "report:crm"];

/**
 * Toggles between the HRM and CRM workspaces. Only shown when the signed-in
 * role can actually reach both. `variant="dark"` is for placing it inside the
 * dark mobile sidebar drawer, where the default light styling would be
 * unreadable; the header keeps the default light variant.
 */
export default function WorkspaceSwitcher({ current, variant = "light", className = "flex", onNavigate }) {
  const navigate = useNavigate();
  const canAny = useAuth((s) => s.canAny);

  const hasHrm = canAny(...HRM_PERMS);
  const hasCrm = canAny(...CRM_PERMS);
  if (!hasHrm || !hasCrm) return null;

  const isDark = variant === "dark";

  function go(path) {
    navigate(path);
    onNavigate?.();
  }

  return (
    <div
      className={`items-center rounded-md border p-0.5 text-xs ${
        isDark ? "border-sidebar-border" : "border-ink-200"
      } ${className}`}
    >
      <button
        type="button"
        onClick={() => go("/hrm")}
        className={`rounded px-2 py-1 font-medium ${
          current === "hrm"
            ? "bg-ink-900 text-white"
            : isDark
              ? "text-ink-300 hover:text-white"
              : "text-ink-500 hover:text-ink-800"
        }`}
      >
        HRM
      </button>
      <button
        type="button"
        onClick={() => go("/crm")}
        className={`rounded px-2 py-1 font-medium ${
          current === "crm"
            ? "bg-ink-900 text-white"
            : isDark
              ? "text-ink-300 hover:text-white"
              : "text-ink-500 hover:text-ink-800"
        }`}
      >
        CRM
      </button>
    </div>
  );
}
