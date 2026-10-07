// The logo is a square JPEG with generous white margins and no transparency, so
// it sits on white surfaces (not the dark sidebar colour) and is cropped to a
// 3:2 window to trim the empty space above and below the mark.
function Logo({ className = "" }) {
  return (
    <img
      src="/mainlogo.jpeg"
      alt="AJ Group Portal"
      width="1254"
      height="1254"
      className={`aspect-[3/2] object-cover ${className}`}
    />
  );
}

export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-ink-100 md:flex-row">
      {/* Phone/tablet: logo band across the top. */}
      <div className="flex justify-center border-b border-ink-200 bg-white px-4 py-3 md:hidden">
        <Logo className="w-44" />
      </div>

      {/* Desktop: brand panel on the left. */}
      <div className="hidden border-r border-ink-200 bg-white px-10 py-12 md:flex md:w-2/5 md:flex-col lg:w-1/3">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Logo className="w-full max-w-xs" />
          <div className="mt-4 space-y-2 text-sm">
            <p className="font-medium text-ink-900">One workspace for people and customers</p>
            <p className="text-ink-500">
              Employee records, attendance, leave, payroll, recruitment and customer
              operations across 9jaTradiesPages, QuickShipAfrica and AJCL.
            </p>
          </div>
        </div>
        <p className="text-center text-2xs text-ink-400">
          &copy; {new Date().getFullYear()} — Internal use only
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
