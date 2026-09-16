import clsx from "clsx";
import { forwardRef, useId } from "react";

const Select = forwardRef(function Select(
  { label, hint, error, className, id, required, placeholder, options = [], children, ...props },
  ref,
) {
  const autoId = useId();
  const selectId = id || autoId;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={selectId} className="label">
          {label}
          {required && <span className="ml-0.5 text-red-600">*</span>}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        required={required}
        className={clsx("input pr-8", error && "border-red-500 focus:border-red-500 focus:ring-red-500")}
        {...props}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((opt) => {
          const value = typeof opt === "string" ? opt : opt.value;
          const text = typeof opt === "string" ? opt : opt.label;
          return (
            <option key={value} value={value}>
              {text}
            </option>
          );
        })}
        {children}
      </select>
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
});

export default Select;
