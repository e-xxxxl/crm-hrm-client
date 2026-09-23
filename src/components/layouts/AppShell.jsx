import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import clsx from "clsx";
import { useAuth } from "../../store/auth.js";
import { initials } from "../../utils/format.js";
import NotificationBell from "../notifications/NotificationBell.jsx";
import UserMenu from "./UserMenu.jsx";
import WorkspaceSwitcher from "./WorkspaceSwitcher.jsx";
import OrgSwitcher from "./OrgSwitcher.jsx";
import { orgLogoFor } from "../../utils/orgLogo.js";

/**
 * Shared application chrome for both the HRM and CRM workspaces: dark sidebar,
 * sticky header, responsive slide-over navigation. The workspace-specific parts
 * (nav items, section label) come in as props.
 */
export default function AppShell({ nav, sectionLabel }) {
  const { session, user } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-ink-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar lg:flex">
        <SidebarContent
          nav={nav}
          sectionLabel={sectionLabel}
          orgName={session?.organizationName}
          orgLogoUrl={orgLogoFor(session?.organizationType, session?.organizationLogoUrl)}
        />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-sidebar shadow-drawer">
            <SidebarContent
              nav={nav}
              sectionLabel={sectionLabel}
              orgName={session?.organizationName}
              orgLogoUrl={orgLogoFor(session?.organizationType, session?.organizationLogoUrl)}
              onNavigate={() => setMobileOpen(false)}
              workspaceCurrent={sectionLabel === "CRM" ? "crm" : "hrm"}
            />
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-ink-200 bg-white px-4 sm:px-6">
          <button
            type="button"
            className="-ml-1 rounded-md p-2 text-ink-500 hover:bg-ink-100 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink-900">{session?.organizationName}</p>
            <p className="truncate text-2xs text-ink-500">{session?.role} · {sectionLabel}</p>
          </div>

          <WorkspaceSwitcher current={sectionLabel === "CRM" ? "crm" : "hrm"} className="hidden sm:flex" />
          <NotificationBell />
          <UserMenu name={user?.name} email={user?.email} role={session?.role} avatar={initials(user?.name)} />
        </header>

        <main className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ nav, sectionLabel, orgName, orgLogoUrl, onNavigate, workspaceCurrent }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-5">
        {orgLogoUrl ? (
          <img src={orgLogoUrl} alt={orgName || "Organization logo"} className="h-9 max-w-[10rem] object-contain" />
        ) : (
          <span className="truncate text-sm font-semibold text-white">{orgName || "CRM + HRM"}</span>
        )}
      </div>

      <div className="border-b border-sidebar-border px-5 py-3">
        <p className="text-2xs uppercase tracking-wide text-ink-500">Organization</p>
        <p className="mt-0.5 truncate text-sm font-medium text-ink-100">{orgName || "—"}</p>
        <div className="mt-2">
          <OrgSwitcher variant="dark" />
        </div>
      </div>

      {workspaceCurrent && (
        <div className="border-b border-sidebar-border px-5 py-3 lg:hidden">
          <p className="mb-1.5 text-2xs uppercase tracking-wide text-ink-500">Workspace</p>
          <WorkspaceSwitcher current={workspaceCurrent} variant="dark" onNavigate={onNavigate} />
        </div>
      )}

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        <p className="px-2 pb-1 pt-2 text-2xs font-medium uppercase tracking-wider text-ink-500">
          {sectionLabel}
        </p>
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            onClick={onNavigate}
            className={({ isActive }) =>
              clsx(
                "block rounded-md px-2.5 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-active font-medium text-white"
                  : "text-ink-200 hover:bg-sidebar-hover hover:text-white",
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-5 py-3">
        <p className="text-2xs text-ink-500">Signed in — internal use only</p>
      </div>
    </div>
  );
}
