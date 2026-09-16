import clsx from "clsx";

/** Horizontal tab strip. Scrolls sideways on narrow screens rather than wrapping. */
export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className="-mx-4 mb-5 overflow-x-auto border-b border-ink-200 px-4 sm:mx-0 sm:px-0">
      <nav className="flex min-w-max gap-1">
        {tabs.map((tab) => {
          const key = typeof tab === "string" ? tab : tab.key;
          const label = typeof tab === "string" ? tab : tab.label;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={clsx(
                "whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                active === key
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-ink-500 hover:border-ink-200 hover:text-ink-800",
              )}
            >
              {label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
