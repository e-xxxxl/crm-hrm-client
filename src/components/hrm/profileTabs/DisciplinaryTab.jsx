import Badge from "../../ui/Badge.jsx";
import EmptyState from "../../ui/EmptyState.jsx";
import Spinner from "../../ui/Spinner.jsx";
import { useApiQuery } from "../../../hooks/useApiQuery.js";
import { dateShort } from "../../../utils/format.js";

const label = (s) => s.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

export default function DisciplinaryTab({ employee }) {
  const list = useApiQuery("/hrm/disciplinary", { params: { employee: employee.id, limit: 100 } });

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-ink-900">Disciplinary Records</h3>

      {list.loading ? (
        <div className="flex justify-center py-10 text-ink-400">
          <Spinner size={22} />
        </div>
      ) : list.error ? (
        <EmptyState title="Could not load" description={list.error.message} />
      ) : (list.data || []).length === 0 ? (
        <p className="text-sm text-ink-500">No disciplinary cases recorded for this employee.</p>
      ) : (
        <ul className="space-y-2">
          {list.data.map((c) => (
            <li key={c.id} className="card p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-ink-900">{c.reference} — {label(c.category)}</p>
                <Badge tone={c.severity === "gross" ? "red" : c.severity === "major" ? "amber" : "neutral"}>{c.severity}</Badge>
              </div>
              <p className="mt-0.5 text-xs text-ink-500">
                Incident {dateShort(c.incidentDate)} · <Badge status={c.status === "closed" ? "completed" : "pending"}>{label(c.status)}</Badge>
                {c.outcome?.decision ? ` · ${label(c.outcome.decision)}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
