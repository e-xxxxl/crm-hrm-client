import { useAuth } from "../../store/auth.js";
import EmptyState from "../ui/EmptyState.jsx";

/**
 * Render children only when the session holds the required permission(s).
 * `mode="any"` passes if the user has at least one. Backend authorization is
 * still enforced independently — this only tidies the UI.
 */
export default function RequirePermission({ perm, mode = "all", fallback, children }) {
  const session = useAuth((s) => s.session);
  const perms = session?.permissions || [];
  const list = Array.isArray(perm) ? perm : [perm];
  const has = (p) => perms.includes("*") || perms.includes(p);
  const ok = mode === "any" ? list.some(has) : list.every(has);

  if (ok) return children;
  if (fallback !== undefined) return fallback;
  return (
    <EmptyState
      title="No access"
      description="You do not have permission to view this section. Contact your administrator if you believe this is a mistake."
    />
  );
}
