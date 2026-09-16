import { useEffect } from "react";
import clsx from "clsx";

/** Right-side slide-over for detail views and long forms. Full-width on mobile. */
export default function Drawer({ open, onClose, title, description, children, footer, size = "md" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const width = { sm: "sm:max-w-sm", md: "sm:max-w-md", lg: "sm:max-w-xl", xl: "sm:max-w-3xl" }[size];

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink-900/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        className={clsx(
          "absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-drawer",
          width,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-200 px-5 py-3.5">
          <div className="min-w-0">
            {title && <h2 className="truncate text-sm font-semibold text-ink-900">{title}</h2>}
            {description && <p className="mt-0.5 truncate text-xs text-ink-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-600"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-ink-200 px-5 py-3 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
