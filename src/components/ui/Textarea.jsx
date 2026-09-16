import clsx from "clsx";
import { forwardRef, useId } from "react";

const Textarea = forwardRef(function Textarea(
  { label, hint, error, className, id, required, rows = 3, ...props },
  ref,
) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={fieldId} className="label">
          {label}
          {required && <span className="ml-0.5 text-red-600">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        required={required}
        className={clsx(
          "input resize-y",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500",
        )}
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

export default Textarea;
