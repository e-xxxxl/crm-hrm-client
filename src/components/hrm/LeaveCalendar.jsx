import { useMemo, useState } from "react";
import Select from "../ui/Select.jsx";
import Badge from "../ui/Badge.jsx";
import Spinner from "../ui/Spinner.jsx";
import EmptyState from "../ui/EmptyState.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { dateShort } from "../../utils/format.js";

function monthBounds(offset = 0) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const last = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return {
    from: first.toISOString().slice(0, 10),
    to: last.toISOString().slice(0, 10),
    label: first.toLocaleString("en-NG", { month: "long", year: "numeric" }),
    first,
    last,
  };
}

const CATEGORY_TONE = {
  annual: "blue",
  casual: "amber",
  sick: "amber",
  maternity: "green",
  paternity: "green",
  compassionate: "slate",
  unpaid: "slate",
  other: "neutral",
};

export default function LeaveCalendar() {
  const [offset, setOffset] = useState(0);
  const bounds = useMemo(() => monthBounds(offset), [offset]);
  const branches = useApiQuery("/hrm/branches", { params: { limit: 100, status: "active" } });
  const [branch, setBranch] = useState("");

  const { data, loading, error } = useApiQuery("/hrm/leave/calendar", {
    params: { from: bounds.from, to: bounds.to, branch: branch || undefined },
  });

  const weeks = useMemo(() => buildGrid(bounds.first, bounds.last, data?.items || []), [bounds, data]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button type="button" className="btn-secondary !w-auto px-2 py-1.5" onClick={() => setOffset((o) => o - 1)}>
            ‹
          </button>
          <span className="min-w-[10rem] text-center text-sm font-medium text-ink-900">{bounds.label}</span>
          <button type="button" className="btn-secondary !w-auto px-2 py-1.5" onClick={() => setOffset((o) => o + 1)}>
            ›
          </button>
        </div>
        <Select
          className="lg:w-48"
          placeholder="All branches"
          options={(branches.data || []).map((b) => ({ value: b.id, label: b.name }))}
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-ink-400">
          <Spinner size={22} />
        </div>
      ) : error ? (
        <EmptyState title="Calendar unavailable" description={error.message} />
      ) : (
        <>
          {/* Desktop grid */}
          <div className="hidden overflow-x-auto md:block">
            <div className="grid min-w-[720px] grid-cols-7 gap-px rounded-lg border border-ink-200 bg-ink-200 text-sm">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="bg-ink-50 px-2 py-1.5 text-2xs font-medium uppercase text-ink-500">
                  {d}
                </div>
              ))}
              {weeks.flat().map((cell, i) => (
                <div
                  key={i}
                  className={`min-h-[90px] bg-white p-1.5 ${cell.inMonth ? "" : "bg-ink-50/60"}`}
                >
                  <span className={`text-xs ${cell.inMonth ? "text-ink-700" : "text-ink-400"}`}>
                    {cell.day}
                  </span>
                  <div className="mt-1 space-y-1">
                    {cell.items.slice(0, 3).map((it) => (
                      <div
                        key={it.id}
                        className="truncate rounded bg-ink-100 px-1 py-0.5 text-2xs text-ink-700"
                        title={`${it.employee} — ${it.leaveType} (${it.status})`}
                      >
                        {it.employee.split(" ")[0]} · {it.leaveType.split(" ")[0]}
                      </div>
                    ))}
                    {cell.items.length > 3 && (
                      <div className="text-2xs text-ink-400">+{cell.items.length - 3} more</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile list */}
          <ul className="space-y-2 md:hidden">
            {(data?.items || []).length === 0 && (
              <EmptyState title="No leave this month" description="Nothing scheduled for the selected period." />
            )}
            {(data?.items || []).map((it) => (
              <li key={it.id} className="card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900">{it.employee}</p>
                    <p className="text-xs text-ink-500">
                      {dateShort(it.startDate)} – {dateShort(it.endDate)} · {it.days}d
                    </p>
                  </div>
                  <Badge tone={CATEGORY_TONE[it.category] || "neutral"}>{it.leaveType}</Badge>
                </div>
                <p className="mt-1 text-2xs uppercase tracking-wide text-ink-400">
                  {it.status}
                  {it.branch ? ` · ${it.branch}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function buildGrid(first, last, items) {
  const startDow = (first.getDay() + 6) % 7; // Monday-first
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - startDow);

  const weeks = [];
  const cursor = new Date(gridStart);
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const iso = cursor.toISOString().slice(0, 10);
      const dayItems = items.filter((it) => iso >= it.startDate && iso <= it.endDate);
      week.push({
        day: cursor.getDate(),
        inMonth: cursor.getMonth() === first.getMonth(),
        items: dayItems,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    if (cursor > last && cursor.getDay() === 1) break;
  }
  return weeks;
}
