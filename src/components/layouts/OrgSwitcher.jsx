import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../store/auth.js";
import { toast } from "../../store/toast.js";

/**
 * Lets a user who belongs to more than one organization (Super Admin, Group
 * Admin — anyone with multiple active memberships) jump between them from the
 * sidebar without logging out. Hidden entirely for a single-org user.
 */
export default function OrgSwitcher({ variant = "light" }) {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const currentOrgId = useAuth((s) => s.session?.organizationId);
  const switchOrg = useAuth((s) => s.switchOrg);
  const [busy, setBusy] = useState(false);

  const memberships = (user?.memberships || []).filter((m) => m.status === "active" && m.organization);
  if (memberships.length < 2) return null;

  const isDark = variant === "dark";

  async function onChange(e) {
    const orgId = e.target.value;
    if (!orgId || orgId === currentOrgId) return;
    setBusy(true);
    try {
      await switchOrg(orgId);
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || "Could not switch organization");
    } finally {
      setBusy(false);
    }
  }

  return (
    <select
      disabled={busy}
      value={currentOrgId || ""}
      onChange={onChange}
      aria-label="Switch organization"
      className={`w-full rounded-md border bg-transparent px-2 py-1.5 text-xs font-medium disabled:opacity-60 ${
        isDark
          ? "border-sidebar-border text-ink-100 [&>option]:bg-sidebar [&>option]:text-ink-100"
          : "border-ink-200 text-ink-700"
      }`}
    >
      {memberships.map((m) => (
        <option key={m.organization.id || m.organization._id} value={m.organization.id || m.organization._id}>
          {m.organization.name} ({m.organization.code})
        </option>
      ))}
    </select>
  );
}
