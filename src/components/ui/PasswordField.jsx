import clsx from "clsx";
import { forwardRef, useId, useState } from "react";

/**
 * TextField's password variant — same look, plus a show/hide toggle so the
 * value can be checked before submitting (temp passwords, login, etc).
 */
const PasswordField = forwardRef(function PasswordField(
  { label, hint, error, className, id, required, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id || autoId;
  const [visible, setVisible] = useState(false);

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
          {required && <span className="ml-0.5 text-red-600">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={visible ? "text" : "password"}
          required={required}
          aria-invalid={error ? "true" : undefined}
          className={clsx("input pr-10", error && "border-red-500 focus:border-red-500 focus:ring-red-500")}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-ink-400 hover:text-ink-600"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          tabIndex={-1}
        >
          {visible ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path
                d="M3 3l18 18M10.58 10.58a2 2 0 0 0 2.83 2.83M9.88 4.24A9.77 9.77 0 0 1 12 4c6 0 9.27 5.61 9.87 6.82a1.5 1.5 0 0 1 0 1.36 17.4 17.4 0 0 1-2.9 3.98M6.1 6.1C3.86 7.66 2.42 9.87 2.13 10.82a1.5 1.5 0 0 0 0 1.36C2.73 13.39 6 19 12 19a9.72 9.72 0 0 0 3.16-.53"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path
                d="M2.13 12.18a1.5 1.5 0 0 1 0-1.36C2.73 9.61 6 4 12 4s9.27 5.61 9.87 6.82a1.5 1.5 0 0 1 0 1.36C21.27 13.39 18 19 12 19s-9.27-5.61-9.87-6.82Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
});

export default PasswordField;
