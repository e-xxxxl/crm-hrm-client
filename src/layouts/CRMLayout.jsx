import { useAuth } from "../store/auth.js";
import { CRM_NAV, visibleNav } from "../config/crmNav.js";
import { useApiQuery } from "../hooks/useApiQuery.js";
import AppShell from "../components/layouts/AppShell.jsx";

export default function CRMLayout() {
  const can = useAuth((s) => s.can);
  const brand = useApiQuery("/crm/brands/current");
  return <AppShell nav={visibleNav(CRM_NAV, can, brand.data?.kind)} sectionLabel="CRM" />;
}
