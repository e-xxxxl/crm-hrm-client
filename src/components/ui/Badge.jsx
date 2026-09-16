import clsx from "clsx";

const TONES = {
  neutral: "bg-ink-100 text-ink-700 ring-ink-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
};

/** Map common status strings to a tone so badges are consistent everywhere. */
const STATUS_TONE = {
  active: "green",
  present: "green",
  approved: "green",
  completed: "green",
  paid: "green",
  probation: "amber",
  pending: "amber",
  late: "amber",
  "on leave": "blue",
  "manager approved": "blue",
  processing: "blue",
  inactive: "slate",
  exited: "slate",
  cancelled: "slate",
  draft: "slate",
  suspended: "red",
  absent: "red",
  rejected: "red",
  failed: "red",
  overdue: "red",
};

export default function Badge({ children, tone, status, className }) {
  const resolved =
    tone || (status ? STATUS_TONE[String(status).toLowerCase()] || "neutral" : "neutral");
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded px-1.5 py-0.5 text-2xs font-medium ring-1 ring-inset",
        TONES[resolved],
        className,
      )}
    >
      {children ?? status}
    </span>
  );
}
