import { useAuth } from "../store/auth.js";
import { HRM_NAV, visibleNav } from "../config/hrmNav.js";
import AppShell from "../components/layouts/AppShell.jsx";

export default function HRMLayout() {
  const can = useAuth((s) => s.can);
  return <AppShell nav={visibleNav(HRM_NAV, can)} sectionLabel="Human Resources" />;
}
