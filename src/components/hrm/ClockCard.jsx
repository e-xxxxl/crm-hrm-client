import { useState } from "react";
import Button from "../ui/Button.jsx";
import Badge from "../ui/Badge.jsx";
import Alert from "../ui/Alert.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useGeolocation } from "../../hooks/useGeolocation.js";
import { api, normaliseError } from "../../services/api.js";
import { toast } from "../../store/toast.js";
import { timeOnly, formatLocation, mapsLink } from "../../utils/format.js";

/**
 * Self clock-in / clock-out. Requires a real GPS fix — the button asks the
 * browser for the current position and sends it with the punch.
 */
export default function ClockCard() {
  const { data, loading, error, refetch } = useApiQuery("/hrm/attendance/me");
  const geo = useGeolocation();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);

  if (loading) {
    return <div className="card h-28 animate-pulse bg-ink-50" />;
  }

  // No linked employee record — surface the reason plainly, no fake UI.
  if (error) {
    return (
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-ink-900">Attendance</h3>
        <p className="mt-1 text-sm text-ink-500">{error.message}</p>
      </div>
    );
  }

  const state = data.state; // not_clocked_in | clocked_in | clocked_out
  const rec = data.record;

  async function punch(kind) {
    setProblem(null);
    setBusy(true);
    try {
      const coords = await geo.request();
      const result = await api
        .post(`/hrm/attendance/${kind === "in" ? "clock-in" : "clock-out"}`, coords)
        .then((r) => r.data.data);
      toast.success(
        kind === "in"
          ? `Clocked in at ${timeOnly(result.clockIn.at)}${result.status === "Late" ? " — marked late" : ""}`
          : `Clocked out — ${result.totalHours}h today`,
      );
      if (result.geofenceViolation) {
        toast.error("Recorded outside your branch geofence — HR has been notified.");
      }
      refetch();
    } catch (err) {
      setProblem(normaliseError(err).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink-900">My attendance</h3>
          <p className="text-xs text-ink-500">
            {data.employee.branch ? data.employee.branch.name : "No branch assigned"} · standard start{" "}
            {data.standardClockIn}
          </p>
        </div>
        {rec && (
          <Badge status={rec.status}>{rec.status}</Badge>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
        <span className="text-ink-600">
          In: <span className="font-medium text-ink-900">{rec?.clockIn ? timeOnly(rec.clockIn.at) : "—"}</span>
        </span>
        <span className="text-ink-600">
          Out: <span className="font-medium text-ink-900">{rec?.clockOut ? timeOnly(rec.clockOut.at) : "—"}</span>
        </span>
        {rec?.totalHours != null && (
          <span className="text-ink-600">
            Hours: <span className="font-medium text-ink-900">{rec.totalHours}</span>
          </span>
        )}
      </div>

      {rec?.clockIn && (
        <p className="mt-1.5 text-xs text-ink-500">
          Location:{" "}
          {mapsLink(rec.clockIn) ? (
            <a href={mapsLink(rec.clockIn)} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
              {formatLocation(rec.clockIn)}
            </a>
          ) : (
            formatLocation(rec.clockIn)
          )}
        </p>
      )}

      {rec?.geofenceViolation && (
        <Alert tone="warning" className="mt-3">
          A punch today was recorded outside the permitted branch radius.
        </Alert>
      )}
      {(problem || geo.error) && (
        <Alert tone="error" className="mt-3">
          {problem || geo.error}
        </Alert>
      )}

      <div className="mt-4">
        {state === "not_clocked_in" && (
          <Button loading={busy} onClick={() => punch("in")}>
            Clock in
          </Button>
        )}
        {state === "clocked_in" && (
          <Button variant="secondary" loading={busy} onClick={() => punch("out")}>
            Clock out
          </Button>
        )}
        {state === "clocked_out" && (
          <p className="text-sm text-ink-500">You have completed today's attendance.</p>
        )}
      </div>
    </div>
  );
}
