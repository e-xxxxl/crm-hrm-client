import clsx from "clsx";
import { useToast } from "../../store/toast.js";

const TONES = {
  success: "border-emerald-200 bg-white text-emerald-800",
  error: "border-red-200 bg-white text-red-800",
  info: "border-ink-200 bg-white text-ink-800",
};

export default function Toaster() {
  const { toasts, dismiss } = useToast();
  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3 sm:inset-x-auto sm:right-4 sm:items-end">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={clsx(
            "pointer-events-auto w-full max-w-sm rounded-md border px-3.5 py-2.5 text-sm shadow-card",
            TONES[t.tone],
          )}
        >
          <div className="flex items-start gap-2">
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="text-ink-400 hover:text-ink-600"
              aria-label="Dismiss"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
