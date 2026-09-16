import { useEffect } from "react";
import { Link } from "react-router-dom";
import Spinner from "../../components/ui/Spinner.jsx";
import Badge from "../../components/ui/Badge.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { money } from "../../utils/format.js";

const STATUS_LABEL = (s) => String(s).replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

export default function RiderHome() {
  const { data, loading, error, refetch } = useApiQuery("/crm/riders/me/dashboard");

  useEffect(() => {
    const t = setInterval(refetch, 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && !data) {
    return <div className="flex justify-center py-16 text-ink-400"><Spinner size={22} /></div>;
  }
  if (error) {
    return <EmptyState title="Not available" description={error.message} />;
  }

  const { rider, jobs, summary } = data;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-ink-200 bg-white p-4">
        <p className="text-sm font-semibold text-ink-900">{rider.name}</p>
        <p className="text-xs text-ink-500">{rider.riderCode} · {rider.vehicleType}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
          <Stat label="Assigned" value={summary.assigned} />
          <Stat label="Pickups" value={summary.pickups} />
          <Stat label="Deliveries" value={summary.deliveries} />
        </div>
        {rider.stats?.codHeld > 0 && (
          <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700">
            COD to remit: {money(rider.stats.codHeld, { whole: true })}
          </p>
        )}
      </div>

      <h1 className="text-sm font-semibold text-ink-900">Today's jobs</h1>

      {jobs.length === 0 ? (
        <EmptyState title="No jobs assigned" description="New jobs will appear here when dispatch assigns them." />
      ) : (
        <ul className="space-y-2">
          {jobs.map((j) => (
            <li key={j.id}>
              <Link to={`/rider/jobs/${j.id}`} className="block rounded-lg border border-ink-200 bg-white p-3 active:bg-ink-50">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink-900">{j.number}</span>
                  <Badge tone={j.priority === "urgent" ? "red" : j.priority === "high" ? "amber" : "neutral"}>
                    {STATUS_LABEL(j.status)}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-ink-700">{j.dropoff?.name || "Recipient"}</p>
                <p className="truncate text-xs text-ink-500">
                  {[j.dropoff?.address, j.dropoff?.city].filter(Boolean).join(", ")}
                </p>
                {j.codAmount > 0 && (
                  <p className="mt-1 text-xs font-medium text-amber-700">Collect {money(j.codAmount, { whole: true })}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-md bg-ink-50 py-2">
      <p className="text-lg font-semibold text-ink-900">{value}</p>
      <p className="text-2xs uppercase tracking-wide text-ink-500">{label}</p>
    </div>
  );
}
