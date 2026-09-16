import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { riders as api } from "../../services/crm.js";
import { toast } from "../../store/toast.js";
import { fromNow, money } from "../../utils/format.js";

const AVAIL_TONE = { available: "green", busy: "amber", offline: "slate" };

export default function DispatchBoard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("board");
  const board = useApiQuery("/crm/riders/dispatch/board");

  // Poll every 20s while the page is open.
  useEffect(() => {
    const t = setInterval(() => board.refetch(), 20_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const d = board.data;

  return (
    <>
      <PageHeader
        title="Dispatch"
        description="Live view — refreshes every 20 seconds."
        actions={<Button variant="secondary" onClick={() => board.refetch()}>Refresh now</Button>}
      />

      <div className="mb-4 flex gap-1 border-b border-ink-200">
        {[
          ["board", "Board"],
          ["map", "Map"],
          ["optimize", "Route planner"],
        ].map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${tab === k ? "border-brand-600 text-brand-700" : "border-transparent text-ink-500 hover:text-ink-800"}`}
          >
            {l}
          </button>
        ))}
      </div>

      {board.loading && !d ? (
        <div className="flex justify-center py-16 text-ink-400"><Spinner size={22} /></div>
      ) : tab === "board" ? (
        <BoardView d={d} navigate={navigate} />
      ) : tab === "map" ? (
        <MapView />
      ) : (
        <RoutePlanner riders={d?.riders || []} />
      )}
    </>
  );
}

function BoardView({ d, navigate }) {
  if (!d) return null;
  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-200 bg-ink-200 sm:grid-cols-4">
        <Tile label="Available riders" value={d.available} tone="green" />
        <Tile label="Busy" value={d.busy} />
        <Tile label="Pending pickups" value={d.pendingPickups.length} tone={d.pendingPickups.length ? "amber" : undefined} />
        <Tile label="Failed deliveries" value={d.failedDeliveries.length} tone={d.failedDeliveries.length ? "red" : undefined} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink-900">Riders</h2>
          <ul className="divide-y divide-ink-100">
            {d.riders.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                <button type="button" className="min-w-0 text-left hover:underline" onClick={() => navigate(`/crm/riders/${r.id}`)}>
                  <p className="truncate font-medium text-ink-800">{r.name}</p>
                  <p className="truncate text-xs text-ink-500">
                    {r.vehicleType} · {r.activeJobs} active{r.lastSeenAt ? ` · seen ${fromNow(r.lastSeenAt)}` : ""}
                  </p>
                </button>
                <Badge tone={AVAIL_TONE[r.availability]}>{r.availability}</Badge>
              </li>
            ))}
            {d.riders.length === 0 && <li className="py-3 text-sm text-ink-500">No riders.</li>}
          </ul>
        </section>

        <section className="card p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink-900">Pending pickups</h2>
          <JobList jobs={d.pendingPickups} navigate={navigate} empty="Nothing waiting for pickup." />
        </section>

        <section className="card p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink-900">Failed deliveries</h2>
          <JobList jobs={d.failedDeliveries} navigate={navigate} empty="No failed deliveries." />
        </section>
      </div>
    </>
  );
}

function JobList({ jobs, navigate, empty }) {
  if (jobs.length === 0) return <p className="text-sm text-ink-500">{empty}</p>;
  return (
    <ul className="divide-y divide-ink-100">
      {jobs.map((j) => (
        <li key={j.id} className="py-2 text-sm">
          <button
            type="button"
            className="text-left hover:underline"
            onClick={() => navigate(j.kind === "order" ? `/crm/orders/${j.id}` : `/crm/shipments/${j.id}`)}
          >
            <p className="font-medium text-ink-800">{j.number}</p>
            <p className="text-xs text-ink-500">
              {j.dropoff?.name || j.dropoff?.city || "—"}
              {j.codAmount ? ` · COD ${money(j.codAmount, { whole: true })}` : ""}
              {j.attempts ? ` · ${j.attempts} attempt(s)` : ""}
            </p>
          </button>
        </li>
      ))}
    </ul>
  );
}

function MapView() {
  const map = useApiQuery("/crm/riders/dispatch/map");
  useEffect(() => {
    const t = setInterval(() => map.refetch(), 15_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (map.loading && !map.data) return <div className="flex justify-center py-16 text-ink-400"><Spinner size={22} /></div>;
  const d = map.data;
  if (!d) return null;

  const points = [
    ...d.riders.map((r) => ({ ...r, kind: "rider" })),
    ...d.pins.map((p) => ({ ...p, kind: p.type })),
  ].filter((p) => p.coordinates?.length === 2);

  const lngs = points.map((p) => p.coordinates[0]);
  const lats = points.map((p) => p.coordinates[1]);
  const bounds = points.length
    ? { minLng: Math.min(...lngs), maxLng: Math.max(...lngs), minLat: Math.min(...lats), maxLat: Math.max(...lats) }
    : null;
  const project = (c) => {
    if (!bounds) return [50, 50];
    const w = bounds.maxLng - bounds.minLng || 1;
    const h = bounds.maxLat - bounds.minLat || 1;
    return [((c[0] - bounds.minLng) / w) * 92 + 4, (1 - (c[1] - bounds.minLat) / h) * 88 + 6];
  };

  return (
    <>
      <div className="relative mb-4 h-[420px] overflow-hidden rounded-lg border border-ink-200 bg-ink-50">
        {points.length === 0 ? (
          <p className="flex h-full items-center justify-center text-sm text-ink-400">
            No positioned riders or jobs yet.
          </p>
        ) : (
          points.map((p, i) => {
            const [x, y] = project(p.coordinates);
            const color =
              p.kind === "rider"
                ? p.availability === "available"
                  ? "bg-emerald-500"
                  : "bg-amber-500"
                : p.kind === "pickup"
                  ? "bg-blue-500"
                  : "bg-ink-700";
            return (
              <div
                key={i}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full ${color} ${p.kind === "rider" ? "h-3 w-3 ring-2 ring-white" : "h-2 w-2"}`}
                style={{ left: `${x}%`, top: `${y}%` }}
                title={p.kind === "rider" ? `${p.name} (${p.availability})` : `${p.number} — ${p.kind}`}
              />
            );
          })
        )}
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-ink-500">
        <Legend color="bg-emerald-500" label="Available rider" />
        <Legend color="bg-amber-500" label="Busy rider" />
        <Legend color="bg-blue-500" label="Pickup" />
        <Legend color="bg-ink-700" label="Delivery" />
      </div>
      <p className="mt-2 text-2xs text-ink-400">
        Schematic positions (bounding-box scaled), not a street map. {d.riders.length} rider(s) reporting location.
      </p>
    </>
  );
}

function Legend({ color, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} /> {label}
    </span>
  );
}

function RoutePlanner({ riders }) {
  const [riderId, setRiderId] = useState("");
  const shipments = useApiQuery("/crm/shipments", { params: { active: "true", limit: 100 } });
  const [selected, setSelected] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const rows = shipments.data || [];
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  async function plan() {
    if (selected.length === 0) return toast.error("Select at least one job");
    setLoading(true);
    try {
      setResult(await api.optimize({ riderId: riderId || undefined, jobIds: selected }));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="card p-4">
        <p className="mb-2 text-sm font-semibold text-ink-900">Build a route</p>
        <select className="input mb-3" value={riderId} onChange={(e) => setRiderId(e.target.value)}>
          <option value="">Start from a hub / no rider</option>
          {riders.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} {r.location ? "(has GPS)" : ""}
            </option>
          ))}
        </select>
        <div className="max-h-80 space-y-1.5 overflow-y-auto">
          {rows.map((s) => (
            <label key={s.id} className="flex items-start gap-2 rounded-md border border-ink-200 p-2 text-sm">
              <input type="checkbox" className="mt-0.5" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} />
              <span className="min-w-0">
                <span className="block font-medium text-ink-800">{s.trackingNumber}</span>
                <span className="block truncate text-xs text-ink-500">
                  {s.recipient?.name} · {s.recipient?.city || s.recipient?.state} · {s.status}
                </span>
              </span>
            </label>
          ))}
          {rows.length === 0 && <p className="text-sm text-ink-500">No active shipments.</p>}
        </div>
        <Button className="mt-3" loading={loading} onClick={plan}>Optimise route ({selected.length})</Button>
      </div>

      <div className="card p-4">
        <p className="mb-2 text-sm font-semibold text-ink-900">Suggested order</p>
        {!result ? (
          <p className="text-sm text-ink-500">Select jobs and optimise to see a route.</p>
        ) : (
          <>
            <p className="mb-3 text-sm text-ink-600">
              {result.stops.length} stops · ~{result.estimatedDistanceKm} km · ~{result.estimatedMinutes} min
            </p>
            <ol className="space-y-2">
              {result.stops.map((s) => (
                <li key={s.jobId} className="flex gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-900 text-2xs font-semibold text-white">
                    {s.sequence}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium text-ink-800">{s.number} · {s.leg}</span>
                    <span className="block truncate text-xs text-ink-500">{s.address || "no address"} {s.priority !== "normal" ? `· ${s.priority}` : ""}</span>
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, tone }) {
  return (
    <div className="bg-white px-3 py-2.5">
      <p className="text-2xs uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`mt-0.5 text-base font-semibold ${tone === "red" ? "text-red-600" : tone === "amber" ? "text-amber-600" : tone === "green" ? "text-emerald-600" : "text-ink-900"}`}>
        {value ?? 0}
      </p>
    </div>
  );
}
