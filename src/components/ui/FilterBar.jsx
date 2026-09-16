import clsx from "clsx";

/**
 * Responsive filter row. On desktop the controls sit inline; on mobile they
 * stack full-width. `onClear` is shown only when `active` is true.
 */
export default function FilterBar({ children, active, onClear, className }) {
  return (
    <div
      className={clsx(
        "mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end",
        className,
      )}
    >
      {children}
      {active && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="justify-self-start text-xs font-medium text-ink-500 hover:text-ink-700 lg:self-center"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search" }) {
  return (
    <div className="relative lg:w-64">
      <svg
        className="pointer-events-none absolute left-2.5 top-2.5 text-ink-400"
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" strokeLinecap="round" />
      </svg>
      <input
        className="input pl-8"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type="search"
      />
    </div>
  );
}
