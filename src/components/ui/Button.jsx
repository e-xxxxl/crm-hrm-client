import clsx from "clsx";
import Spinner from "./Spinner.jsx";

const VARIANTS = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  danger: "btn-danger",
  ghost: "btn text-ink-700 hover:bg-ink-100 focus:ring-ink-400",
};

const SIZES = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "",
  lg: "px-4 py-2.5 text-sm",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={clsx(VARIANTS[variant], SIZES[size], "w-full sm:w-auto", className)}
      {...props}
    >
      {loading && <Spinner size={14} />}
      {children}
    </button>
  );
}
