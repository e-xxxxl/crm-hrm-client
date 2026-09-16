import clsx from "clsx";
import { forwardRef, useId } from "react";

const TextField = forwardRef(function TextField(
  { label, hint, error, className, id, required, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
          {required && <span className="ml-0.5 text-red-600">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        required={required}
        aria-invalid={error ? "true" : undefined}
        className={clsx("input", error && "border-red-500 focus:border-red-500 focus:ring-red-500")}
        {...props}
      />
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
});

export default TextField;
