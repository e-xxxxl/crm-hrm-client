export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-ink-100 md:flex-row">
      <div className="hidden bg-sidebar px-10 py-12 md:flex md:w-2/5 md:flex-col md:justify-between lg:w-1/3">
        <div>
          <div className="text-sm font-semibold tracking-wide text-white">CRM + HRM Platform</div>
          <p className="mt-1 text-xs text-ink-400">Unified operations for the group</p>
        </div>
        <div className="space-y-3 text-sm text-ink-200">
          <p className="font-medium text-white">One workspace for people and customers</p>
          <p className="text-ink-400">
            Employee records, attendance, leave, payroll, recruitment and customer
            operations across 9jaTradiesPages, QuickShipAfrica and AJCL.
          </p>
        </div>
        <p className="text-2xs text-ink-500">
          &copy; {new Date().getFullYear()} — Internal use only
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 md:hidden">
            <div className="text-base font-semibold text-ink-900">CRM + HRM Platform</div>
            <p className="text-xs text-ink-500">Internal operations workspace</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
