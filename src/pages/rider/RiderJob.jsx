import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Spinner from "../../components/ui/Spinner.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import TextField from "../../components/ui/TextField.jsx";
import Textarea from "../../components/ui/Textarea.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useGeolocation } from "../../hooks/useGeolocation.js";
import { riderPwa } from "../../services/crm.js";
import { toast } from "../../store/toast.js";
import { normaliseError } from "../../services/api.js";
import { money, dateTime } from "../../utils/format.js";

const STATUS_LABEL = (s) => String(s).replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

export default function RiderJob() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: job, loading, error, refetch } = useApiQuery(`/crm/riders/me/jobs/${id}`);
  const geo = useGeolocation();
  const [busy, setBusy] = useState(false);
  const [pod, setPod] = useState(null); // pod form state when open
  const [failReason, setFailReason] = useState(null);

  if (loading && !job) return <div className="flex justify-center py-16 text-ink-400"><Spinner size={22} /></div>;
  if (error) return <EmptyState title="Job unavailable" description={error.message} action={<Button variant="secondary" onClick={() => navigate("/rider")}>Back</Button>} />;

  async function act(action, body = {}) {
    setBusy(true);
    try {
      let location;
      try {
        const pos = await geo.request();
        location = [pos.longitude, pos.latitude];
      } catch {
        /* location optional for most actions */
      }
      await riderPwa.action(id, action, { ...body, location });
      toast.success("Updated");
      setPod(null);
      setFailReason(null);
      refetch();
    } catch (e) {
      toast.error(normaliseError(e).message);
    } finally {
      setBusy(false);
    }
  }

  const s = job.status;
  const needsPickup = ["created", "pickup_requested", "rider_assigned", "confirmed"].includes(s);
  const outForDelivery = s === "out_for_delivery";
  const inTransit = ["picked_up", "at_hub", "in_transit"].includes(s);
  const dest = needsPickup ? job.pickup : job.dropoff;
  const mapsHref = dest?.coordinates?.length === 2
    ? `https://www.google.com/maps/dir/?api=1&destination=${dest.coordinates[1]},${dest.coordinates[0]}`
    : dest?.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([dest.address, dest.city, dest.state].filter(Boolean).join(", "))}`
      : null;

  return (
    <div className="space-y-4">
      <button type="button" className="text-xs text-ink-500" onClick={() => navigate("/rider")}>&larr; All jobs</button>

      <div className="rounded-lg border border-ink-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-ink-900">{job.number}</span>
          <Badge tone={job.priority === "urgent" ? "red" : job.priority === "high" ? "amber" : "neutral"}>{STATUS_LABEL(s)}</Badge>
        </div>
        {job.description && <p className="mt-1 text-sm text-ink-600">{job.description}</p>}
        {job.codAmount > 0 && (
          <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-sm font-medium text-amber-700">
            Collect cash: {money(job.codAmount, { whole: true })}
          </p>
        )}
      </div>

      <Address title={needsPickup ? "Pick up from" : "Deliver to"} p={dest} mapsHref={mapsHref} />
      {!needsPickup && <Address title="Picked up from" p={job.pickup} muted />}

      {/* Action buttons */}
      <div className="space-y-2">
        {s === "rider_assigned" && (
          <Button className="w-full" loading={busy} onClick={() => act("accept")}>Accept job</Button>
        )}
        {needsPickup && s !== "rider_assigned" && (
          <Button className="w-full" variant="secondary" loading={busy} onClick={() => act("arrived", { at: "pickup" })}>Arrived at pickup</Button>
        )}
        {needsPickup && (
          <Button className="w-full" loading={busy} onClick={() => act("picked-up")}>Confirm picked up</Button>
        )}
        {inTransit && (
          <Button className="w-full" loading={busy} onClick={() => act("out-for-delivery")}>Start delivery run</Button>
        )}
        {outForDelivery && (
          <>
            <Button className="w-full" variant="secondary" loading={busy} onClick={() => act("arrived", { at: "dropoff" })}>Arrived at drop-off</Button>
            <Button className="w-full" loading={busy} onClick={() => setPod({ recipientName: "", relationship: "", otpVerified: false, photoUrl: "", signatureUrl: "", codCollected: job.codAmount > 0 })}>
              Complete delivery
            </Button>
            <Button className="w-full" variant="danger" loading={busy} onClick={() => setFailReason("")}>Delivery failed</Button>
          </>
        )}
      </div>

      {/* History */}
      {job.statusHistory?.length > 0 && (
        <details className="rounded-lg border border-ink-200 bg-white p-3 text-sm">
          <summary className="cursor-pointer text-ink-700">History ({job.statusHistory.length})</summary>
          <ol className="mt-2 space-y-1.5">
            {[...job.statusHistory].reverse().map((e, i) => (
              <li key={i} className="text-xs text-ink-600">
                {STATUS_LABEL(e.status)}{e.note ? ` — ${e.note}` : ""} · {dateTime(e.at)}
              </li>
            ))}
          </ol>
        </details>
      )}

      {/* POD modal */}
      {pod && (
        <Sheet title="Proof of delivery" onClose={() => setPod(null)}>
          <TextField label="Recipient name" required value={pod.recipientName} onChange={(e) => setPod((p) => ({ ...p, recipientName: e.target.value }))} />
          <TextField label="Relationship" value={pod.relationship} onChange={(e) => setPod((p) => ({ ...p, relationship: e.target.value }))} />
          <TextField label="Photo URL" value={pod.photoUrl} onChange={(e) => setPod((p) => ({ ...p, photoUrl: e.target.value }))} />
          <TextField label="Signature URL" value={pod.signatureUrl} onChange={(e) => setPod((p) => ({ ...p, signatureUrl: e.target.value }))} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={pod.otpVerified} onChange={(e) => setPod((p) => ({ ...p, otpVerified: e.target.checked }))} /> OTP verified
          </label>
          {job.codAmount > 0 && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={pod.codCollected} onChange={(e) => setPod((p) => ({ ...p, codCollected: e.target.checked }))} /> Cash collected
            </label>
          )}
          <Button className="w-full" loading={busy} disabled={!pod.recipientName.trim()} onClick={() => act("delivered", pod)}>
            Confirm delivered
          </Button>
        </Sheet>
      )}

      {failReason !== null && (
        <Sheet title="Delivery failed" onClose={() => setFailReason(null)}>
          <Textarea label="What happened?" rows={3} value={failReason} onChange={(e) => setFailReason(e.target.value)} />
          <Button className="w-full" variant="danger" loading={busy} disabled={!failReason.trim()} onClick={() => act("failed", { reason: failReason })}>
            Report failure
          </Button>
        </Sheet>
      )}
    </div>
  );
}

function Address({ title, p, mapsHref, muted }) {
  return (
    <div className={`rounded-lg border border-ink-200 p-4 ${muted ? "bg-ink-50" : "bg-white"}`}>
      <p className="text-2xs font-medium uppercase tracking-wide text-ink-500">{title}</p>
      <p className="mt-1 font-medium text-ink-900">{p?.name || "—"}</p>
      {p?.phone && <a href={`tel:${p.phone}`} className="text-sm text-brand-600">{p.phone}</a>}
      <p className="text-sm text-ink-600">{[p?.address, p?.city, p?.lga, p?.state].filter(Boolean).join(", ")}</p>
      {p?.landmark && <p className="text-xs text-ink-500">Landmark: {p.landmark}</p>}
      {mapsHref && !muted && (
        <a href={mapsHref} target="_blank" rel="noreferrer" className="mt-2 inline-block rounded-md bg-ink-900 px-3 py-1.5 text-xs font-medium text-white">
          Navigate
        </a>
      )}
    </div>
  );
}

function Sheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-30 flex items-end bg-ink-900/40" onClick={onClose}>
      <div className="w-full space-y-3 rounded-t-2xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-ink-900">{title}</p>
          <button type="button" className="text-sm text-ink-500" onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}
