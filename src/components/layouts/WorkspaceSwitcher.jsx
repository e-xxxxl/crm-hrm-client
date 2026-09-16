import { useNavigate } from "react-router-dom";
import { useAuth } from "../../store/auth.js";

const HRM_PERMS = ["employee:read", "attendance:read", "leave:read", "payroll:read", "payroll:read_own", "report:hr"];
const CRM_PERMS = ["customer:read", "ticket:read", "shipment:read", "lead:read", "report:crm"];

/**
 * Toggles between the HRM and CRM workspaces. Only shown when the signed-in
 * role can actually reach both.
 */
export default function WorkspaceSwitcher({ current }) {
  const navigate = useNavigate();
  const canAny = useAuth((s) => s.canAny);

  const hasHrm = canAny(...HRM_PERMS);
  const hasCrm = canAny(...CRM_PERMS);
  if (!hasHrm || !hasCrm) return null;

  return (
    <div className="hidden items-center rounded-md border border-ink-200 p-0.5 text-xs sm:flex">
      <button
        type="button"
        onClick={() => navigate("/hrm")}
        className={`rounded px-2 py-1 font-medium ${current === "hrm" ? "bg-ink-900 text-white" : "text-ink-500 hover:text-ink-800"}`}
      >
        HRM
      </button>
      <button
        type="button"
        onClick={() => navigate("/crm")}
        className={`rounded px-2 py-1 font-medium ${current === "crm" ? "bg-ink-900 text-white" : "text-ink-500 hover:text-ink-800"}`}
      >
        CRM
      </button>
    </div>
  );
}
