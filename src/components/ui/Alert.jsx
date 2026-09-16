import clsx from "clsx";

const TONES = {
  error: "border-red-200 bg-red-50 text-red-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  info: "border-ink-200 bg-ink-50 text-ink-700",
};

export default function Alert({ tone = "info", title, children, className }) {
  return (
    <div className={clsx("rounded-md border px-3 py-2.5 text-sm", TONES[tone], className)}>
      {title && <p className="font-medium">{title}</p>}
      {children && <div className={clsx(title && "mt-0.5", "text-[13px]")}>{children}</div>}
    </div>
  );
}
