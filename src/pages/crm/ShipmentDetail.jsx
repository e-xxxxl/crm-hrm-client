import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import Select from "../../components/ui/Select.jsx";
import TextField from "../../components/ui/TextField.jsx";
import Textarea from "../../components/ui/Textarea.jsx";
import Alert from "../../components/ui/Alert.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useMutation } from "../../hooks/useMutation.js";
import { useAuth } from "../../store/auth.js";
import { toast } from "../../store/toast.js";
import { money, dateTime, dateShort } from "../../utils/format.js";
import { SHIPMENT_TONE, shLabel } from "./ShipmentList.jsx";

const NEXT = {
  created: ["pickup_requested", "rider_assigned"],
  pickup_requested: ["rider_assigned"],
  rider_assigned: ["picked_up"],
  picked_up: ["at_hub", "in_transit"],
  at_hub: ["in_transit", "out_for_delivery"],
  in_transit: ["at_hub", "out_for_delivery"],
  out_for_delivery: ["failed"],
  failed: ["rescheduled", "returned"],
  rescheduled: ["out_for_delivery"],
};

export default function ShipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const can = useAuth((s) => s.can);
  const { data: s, loading, error, refetch } = useApiQuery(`/crm/shipments/${id}`);
  const riders = useApiQuery("/crm/riders", { params: { status: "active", limit: 200 }, skip: !can("shipment:dispatch") });

  const [statusModal, setStatusModal] = useState(null);
  const [podOpen, setPodOpen] = useState(false);
  const [riderOpen, setRiderOpen] = useState(false);

  const M = {
    status: useMutation((c, b) => c.post(`/crm/shipments/${id}/status`, b)),
    rider: useMutation((c, b) => c.post(`/crm/shipments/${id}/assign-rider`, b)),
    pod: useMutation((c, b) => c.post(`/crm/shipments/${id}/pod`, b)),
    cod: useMutation((c) => c.post(`/crm/shipments/${id}/remit-cod`)),
  };

  if (loading) return <div className="flex justify-center py-20 text-ink-400"><Spinner size={24} /></div>;
  if (error) {
    return <EmptyState title="Shipment not found" description={error.message} action={<Button variant="secondary" onClick={() => navigate("/crm/shipments")}>Back</Button>} />;
  }

  async function run(m, body, msg) {
    try {
      await m.mutate(body);
      if (msg) toast.success(msg);
      refetch();
    } catch (e) {
      if (e.code === "POD_REQUIRED") setPodOpen(true);
      else toast.error(e.message);
    }
  }

  const nextStatuses = NEXT[s.status] || [];
  const canDeliver = ["out_for_delivery", "in_transit", "at_hub"].includes(s.status);

  return (
    <>
      <PageHeader
        title={<span className="flex items-center gap-3">{s.trackingNumber}<Badge tone={SHIPMENT_TONE[s.status]}>{shLabel(s.status)}</Badge></span>}
        description={
          <span className="text-xs text-ink-500">
            {shLabel(s.serviceLevel)} · {s.packageType} · booked {dateShort(s.createdAt)}
            {s.codAmount > 0 && ` · COD ${money(s.codAmount, { whole: true })}`}
          </span>
        }
        actions={<Button variant="secondary" onClick={() => navigate("/crm/shipments")}>Back</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          {/* Route */}
          <div className="card grid gap-4 p-4 sm:grid-cols-2">
            <Party title="From" p={s.sender} />
            <Party title="To" p={s.recipient} />
          </div>

          {/* Timeline */}
          <div className="card p-4">
            <p className="mb-3 text-sm font-semibold text-ink-900">Tracking history</p>
            <ol className="space-y-3 border-l border-ink-200 pl-4">
              {[...s.statusHistory].reverse().map((e, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[1.4rem] top-1 h-2 w-2 rounded-full bg-brand-600" />
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-ink-800">{shLabel(e.status)}</span>
                    <span className="text-2xs text-ink-400">{dateTime(e.at)}</span>
                  </div>
                  {e.note && <p className="text-xs text-ink-600">{e.note}</p>}
                  {(e.hub || e.byName) && (
                    <p className="text-2xs text-ink-400">
                      {e.hub ? `${e.hub} · ` : ""}
                      {e.byName}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </div>

          {/* POD */}
          {s.proofOfDelivery && (
            <div className="card p-4">
              <p className="mb-2 text-sm font-semibold text-ink-900">Proof of delivery</p>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <Row label="Received by" v={s.proofOfDelivery.recipientName} />
                <Row label="Relationship" v={s.proofOfDelivery.relationship || "—"} />
                <Row label="OTP verified" v={s.proofOfDelivery.otpVerified ? "Yes" : "No"} />
                <Row label="Captured" v={dateTime(s.proofOfDelivery.capturedAt)} />
              </dl>
              <div className="mt-2 flex gap-3">
                {s.proofOfDelivery.photoUrl && (
                  <a href={s.proofOfDelivery.photoUrl} target="_blank" rel="noreferrer" className="link text-xs">Photo</a>
                )}
                {s.proofOfDelivery.signatureUrl && (
                  <a href={s.proofOfDelivery.signatureUrl} target="_blank" rel="noreferrer" className="link text-xs">Signature</a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          {s.customer && (
            <Panel title="Customer">
              <Link to={`/crm/customers/${typeof s.customer === "object" ? s.customer.id || s.customer._id : s.customer}`} className="link text-sm">
                View account
              </Link>
            </Panel>
          )}

          <Panel title="Rider">
            <p className="text-sm text-ink-800">{s.riderName || "Unassigned"}</p>
            {s.riderPhone && <p className="text-xs text-ink-500">{s.riderPhone}</p>}
            {can("shipment:dispatch") && !s.isTerminal && (
              <Button variant="secondary" className="mt-2" onClick={() => setRiderOpen(true)}>
                {s.rider ? "Reassign" : "Assign rider"}
              </Button>
            )}
          </Panel>

          {can("shipment:write") && !s.isTerminal && (
            <Panel title="Update status">
              <div className="flex flex-col gap-1.5">
                {nextStatuses.map((ns) => (
                  <Button key={ns} variant="secondary" onClick={() => setStatusModal(ns)}>
                    → {shLabel(ns)}
                  </Button>
                ))}
                {canDeliver && (
                  <Button onClick={() => setPodOpen(true)}>Capture delivery (POD)</Button>
                )}
              </div>
            </Panel>
          )}

          {s.codAmount > 0 && (
            <Panel title="Cash on delivery">
              <dl className="space-y-1 text-sm">
                <Row label="Amount" v={money(s.codAmount, { whole: true })} />
                <Row label="Collected" v={s.codCollected ? dateShort(s.codCollectedAt) : "No"} />
                <Row label="Remitted" v={s.codRemittedAt ? dateShort(s.codRemittedAt) : "No"} />
              </dl>
              {s.codCollected && !s.codRemittedAt && can("shipment:dispatch") && (
                <Button className="mt-2" loading={M.cod.loading} onClick={() => run(M.cod, undefined, "COD remitted")}>
                  Mark COD remitted
                </Button>
              )}
            </Panel>
          )}

          <Panel title="Details">
            <dl className="space-y-1 text-sm">
              <Row label="Weight" v={`${s.weightKg || 0} kg`} />
              <Row label="Pieces" v={s.pieces} />
              <Row label="Declared value" v={money(s.declaredValue, { whole: true })} />
              <Row label="Delivery fee" v={money(s.deliveryFee, { whole: true })} />
              <Row label="Payment" v={s.paymentStatus} />
              <Row label="Attempts" v={s.attempts} />
              {s.expectedDeliveryDate && <Row label="ETA" v={dateShort(s.expectedDeliveryDate)} />}
            </dl>
          </Panel>
        </aside>
      </div>

      {statusModal && (
        <StatusModal
          status={statusModal}
          loading={M.status.loading}
          onClose={() => setStatusModal(null)}
          onConfirm={async (body) => {
            await run(M.status, { status: statusModal, ...body }, `Moved to ${shLabel(statusModal)}`);
            setStatusModal(null);
          }}
        />
      )}
      {riderOpen && (
        <RiderModal
          riders={riders.data || []}
          loading={M.rider.loading}
          onClose={() => setRiderOpen(false)}
          onConfirm={async (body) => {
            await run(M.rider, body, "Rider assigned");
            setRiderOpen(false);
          }}
        />
      )}
      {podOpen && (
        <PodModal
          loading={M.pod.loading}
          onClose={() => setPodOpen(false)}
          onConfirm={async (body) => {
            await run(M.pod, body, "Delivery recorded");
            setPodOpen(false);
          }}
        />
      )}
    </>
  );
}

function StatusModal({ status, loading, onClose, onConfirm }) {
  const [note, setNote] = useState("");
  const [hub, setHub] = useState("");
  const [eta, setEta] = useState("");
  return (
    <Modal
      open
      onClose={onClose}
      title={`Mark ${shLabel(status)}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={() => onConfirm({ note: note || undefined, hub: hub || undefined, expectedDeliveryDate: eta || undefined })}>
            Confirm
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {(status === "at_hub" || status === "in_transit") && (
          <TextField label="Hub" value={hub} onChange={(e) => setHub(e.target.value)} />
        )}
        {status === "rescheduled" && (
          <TextField label="New expected date" type="date" value={eta} onChange={(e) => setEta(e.target.value)} />
        )}
        <Textarea label="Note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Modal>
  );
}

function RiderModal({ riders, loading, onClose, onConfirm }) {
  const [riderId, setRiderId] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const rider = riders.find((r) => r.id === riderId);
  return (
    <Modal
      open
      onClose={onClose}
      title="Assign rider"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            loading={loading}
            onClick={() =>
              onConfirm(
                riderId
                  ? { riderId, riderName: rider?.name, riderPhone: rider?.phone }
                  : { riderName: manualName, riderPhone: manualPhone },
              )
            }
          >
            Assign
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {riders.length > 0 ? (
          <Select
            label="Rider"
            placeholder="Select a rider"
            options={riders.map((r) => ({ value: r.id, label: `${r.name}${r.phone ? ` · ${r.phone}` : ""}` }))}
            value={riderId}
            onChange={(e) => setRiderId(e.target.value)}
          />
        ) : (
          <>
            <p className="text-xs text-ink-500">No riders on file yet — enter details manually.</p>
            <TextField label="Rider name" value={manualName} onChange={(e) => setManualName(e.target.value)} />
            <TextField label="Rider phone" value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} />
          </>
        )}
      </div>
    </Modal>
  );
}

function PodModal({ loading, onClose, onConfirm }) {
  const [f, setF] = useState({ recipientName: "", relationship: "", otpVerified: false, photoUrl: "", signatureUrl: "", codCollected: true });
  return (
    <Modal
      open
      onClose={onClose}
      title="Proof of delivery"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={loading} disabled={!f.recipientName.trim()} onClick={() => onConfirm(f)}>
            Record delivery
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <TextField label="Recipient name" required value={f.recipientName} onChange={(e) => setF((s) => ({ ...s, recipientName: e.target.value }))} />
        <TextField label="Relationship to addressee" value={f.relationship} onChange={(e) => setF((s) => ({ ...s, relationship: e.target.value }))} />
        <TextField label="Photo URL" value={f.photoUrl} onChange={(e) => setF((s) => ({ ...s, photoUrl: e.target.value }))} />
        <TextField label="Signature URL" value={f.signatureUrl} onChange={(e) => setF((s) => ({ ...s, signatureUrl: e.target.value }))} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.otpVerified} onChange={(e) => setF((s) => ({ ...s, otpVerified: e.target.checked }))} />
          OTP verified with recipient
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.codCollected} onChange={(e) => setF((s) => ({ ...s, codCollected: e.target.checked }))} />
          COD cash collected (if applicable)
        </label>
      </div>
    </Modal>
  );
}

function Party({ title, p }) {
  return (
    <div>
      <p className="text-2xs font-medium uppercase tracking-wide text-ink-500">{title}</p>
      <p className="mt-1 text-sm font-medium text-ink-900">{p?.name || "—"}</p>
      <p className="text-xs text-ink-500">{p?.phone}</p>
      <p className="text-xs text-ink-600">
        {[p?.address, p?.city, p?.lga, p?.state].filter(Boolean).join(", ")}
      </p>
    </div>
  );
}
function Panel({ title, children }) {
  return (
    <div className="card p-3">
      <p className="mb-2 text-2xs font-medium uppercase tracking-wide text-ink-500">{title}</p>
      {children}
    </div>
  );
}
function Row({ label, v }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-ink-500">{label}</dt>
      <dd className="text-ink-800">{v}</dd>
    </div>
  );
}
