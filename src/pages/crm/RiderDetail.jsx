import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Select from "../../components/ui/Select.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useMutation } from "../../hooks/useMutation.js";
import { useAuth } from "../../store/auth.js";
import { toast } from "../../store/toast.js";
import { dateShort, fromNow, money } from "../../utils/format.js";

const AVAIL_TONE = { available: "green", busy: "amber", offline: "slate" };

export default function RiderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const canWrite = useAuth((s) => s.can("rider:write"));
  const { data: r, loading, error, refetch } = useApiQuery(`/crm/riders/${id}`);
  const M = {
    status: useMutation((c, b) => c.patch(`/crm/riders/${id}`, b)),
    login: useMutation((c) => c.post(`/crm/riders/${id}/login`, {})),
  };

  if (loading) return <div className="flex justify-center py-20 text-ink-400"><Spinner size={24} /></div>;
  if (error) return <EmptyState title="Rider not found" description={error.message} action={<Button variant="secondary" onClick={() => navigate("/crm/riders")}>Back</Button>} />;

  async function run(m, body, msg) {
    try {
      const res = await m.mutate(body);
      toast.success(msg || "Saved");
      if (res?.tempPassword) toast.success(`Temp password: ${res.tempPassword}`);
      refetch();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <>
      <PageHeader
        title={<span className="flex items-center gap-3">{r.name}<Badge tone={AVAIL_TONE[r.availability]}>{r.availability}</Badge><Badge status={r.status}>{r.status}</Badge></span>}
        description={<span className="text-xs text-ink-500">{r.riderCode} · {r.phone} · {r.vehicleType}{r.plateNumber ? ` (${r.plateNumber})` : ""}</span>}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate("/crm/riders")}>Back</Button>
            {canWrite && !r.user && r.email && <Button loading={M.login.loading} onClick={() => run(M.login, undefined, "Rider login created")}>Create app login</Button>}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-4">
          <p className="mb-3 text-sm font-semibold text-ink-900">Performance</p>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Metric label="Deliveries" value={r.stats?.deliveries || 0} />
            <Metric label="Failed" value={r.stats?.failed || 0} />
            <Metric label="Active jobs" value={r.stats?.activeJobs || 0} />
            <Metric label="Success rate" value={r.successRate == null ? "—" : `${r.successRate}%`} />
            <Metric label="COD held" value={money(r.stats?.codHeld || 0, { whole: true })} />
            <Metric label="Rating" value={r.rating || "—"} />
          </div>
        </div>

        <div className="card p-4">
          <p className="mb-3 text-sm font-semibold text-ink-900">Profile</p>
          <dl className="space-y-2 text-sm">
            <Row label="Email" v={r.email || "—"} />
            <Row label="Hub" v={r.assignedHub || "—"} />
            <Row label="Zones" v={r.zones?.join(", ") || "—"} />
            <Row label="License" v={r.licenseNumber || "—"} />
            <Row label="License expiry" v={r.licenseExpiry ? dateShort(r.licenseExpiry) : "—"} />
            <Row label="App login" v={r.user ? "Linked" : "None"} />
            <Row label="Last seen" v={r.lastSeenAt ? fromNow(r.lastSeenAt) : "Never"} />
            <Row label="Last location" v={r.currentLocation?.coordinates ? r.currentLocation.coordinates.map((n) => n.toFixed(4)).join(", ") : "—"} />
          </dl>
          {r.guarantor?.name && (
            <p className="mt-3 text-xs text-ink-500">
              Guarantor: {r.guarantor.name} · {r.guarantor.phone}
            </p>
          )}
        </div>

        {canWrite && (
          <div className="card p-4">
            <p className="mb-2 text-sm font-semibold text-ink-900">Status</p>
            <Select
              value={r.status}
              options={["active", "inactive", "suspended"]}
              onChange={(e) => run(M.status, { status: e.target.value }, `Rider set ${e.target.value}`)}
            />
          </div>
        )}
      </div>
    </>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-md border border-ink-200 px-2.5 py-2">
      <p className="text-2xs uppercase tracking-wide text-ink-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-ink-900">{value}</p>
    </div>
  );
}
function Row({ label, v }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-ink-500">{label}</dt>
      <dd className="text-right text-ink-800">{v}</dd>
    </div>
  );
}
