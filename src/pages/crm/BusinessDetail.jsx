import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import Select from "../../components/ui/Select.jsx";
import TextField from "../../components/ui/TextField.jsx";
import Textarea from "../../components/ui/Textarea.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useMutation } from "../../hooks/useMutation.js";
import { useAuth } from "../../store/auth.js";
import { toast } from "../../store/toast.js";
import { dateTime, dateShort, money } from "../../utils/format.js";

const BIZ_TONE = { pending: "amber", approved: "green", rejected: "red", suspended: "slate" };

export default function BusinessDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const can = useAuth((s) => s.can);
  const { data: b, loading, error, refetch } = useApiQuery(`/crm/marketplace/businesses/${id}`);
  const reviews = useApiQuery("/crm/marketplace/reviews", { params: { business: id, limit: 10 } });
  const [modOpen, setModOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);

  const M = {
    moderate: useMutation((c, body) => c.post(`/crm/marketplace/businesses/${id}/moderate`, body)),
    sub: useMutation((c, body) => c.post(`/crm/marketplace/businesses/${id}/subscription`, body)),
  };

  if (loading) return <div className="flex justify-center py-20 text-ink-400"><Spinner size={24} /></div>;
  if (error) return <EmptyState title="Business not found" description={error.message} action={<Button variant="secondary" onClick={() => navigate("/crm/businesses")}>Back</Button>} />;

  async function run(m, body, msg, close) {
    try {
      await m.mutate(body);
      toast.success(msg);
      close?.();
      refetch();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <>
      <PageHeader
        title={<span className="flex items-center gap-3">{b.name}<Badge tone={BIZ_TONE[b.status]}>{b.status}</Badge></span>}
        description={<span className="text-xs text-ink-500">{b.businessCode} · {b.category} · {[b.city, b.state].filter(Boolean).join(", ")}</span>}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate("/crm/businesses")}>Back</Button>
            {can("business:moderate") && <Button variant="secondary" onClick={() => setSubOpen(true)}>Subscription</Button>}
            {can("business:moderate") && <Button onClick={() => setModOpen(true)}>Moderate</Button>}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-4">
          <p className="mb-3 text-sm font-semibold text-ink-900">Profile</p>
          <dl className="space-y-2 text-sm">
            <Row label="Owner" v={b.ownerName || "—"} />
            <Row label="Phone" v={b.phone || "—"} />
            <Row label="WhatsApp" v={b.whatsapp || "—"} />
            <Row label="Email" v={b.email || "—"} />
            <Row label="Address" v={[b.address, b.city, b.lga, b.state].filter(Boolean).join(", ") || "—"} />
            <Row
              label="NIN"
              v={
                b.ninNumber ? (
                  <span className="inline-flex items-center gap-1.5">
                    {b.ninNumber}
                    {b.identityVerified && <Badge tone="green">Verified</Badge>}
                  </span>
                ) : (
                  "—"
                )
              }
            />
            <Row label="Services" v={b.services?.join(", ") || "—"} />
            <Row label="Rating" v={b.ratingCount ? `${b.ratingAverage} / 5 (${b.ratingCount} reviews)` : "No reviews"} />
            <Row label="Leads won" v={b.leadsCount} />
          </dl>
          {b.description && <p className="mt-3 whitespace-pre-wrap text-sm text-ink-700">{b.description}</p>}
        </div>

        <div className="space-y-5">
          <div className="card p-4">
            <p className="mb-2 text-sm font-semibold text-ink-900">Subscription</p>
            <dl className="space-y-1 text-sm">
              <Row label="Tier" v={<Badge tone={b.subscription?.tier === "free" || !b.subscription?.tier ? "slate" : "blue"}>{b.subscription?.tier || "none"}</Badge>} />
              <Row label="Status" v={b.subscription?.status || "none"} />
              {b.subscription?.expiresAt && <Row label="Expires" v={dateShort(b.subscription.expiresAt)} />}
              {b.subscription?.amount ? <Row label="Amount" v={money(b.subscription.amount, { whole: true })} /> : null}
            </dl>
          </div>

          <div className="card p-4">
            <p className="mb-2 text-sm font-semibold text-ink-900">Review log</p>
            <ol className="space-y-1.5 text-sm">
              {b.reviewLog?.map((e, i) => (
                <li key={i}>
                  <span className="text-ink-800">{e.action}</span>
                  {e.reason && <span className="text-ink-500"> — {e.reason}</span>}
                  <span className="ml-2 text-2xs text-ink-400">{e.byName} · {dateTime(e.at)}</span>
                </li>
              ))}
            </ol>
          </div>

          {reviews.data?.length > 0 && (
            <div className="card p-4">
              <p className="mb-2 text-sm font-semibold text-ink-900">Recent reviews</p>
              <ul className="space-y-2 text-sm">
                {reviews.data.map((r) => (
                  <li key={r.id} className="border-b border-ink-100 pb-2 last:border-0">
                    <p className="text-ink-800">{"★".repeat(r.rating)}<span className="text-ink-300">{"★".repeat(5 - r.rating)}</span> · {r.reviewerName}</p>
                    <p className="text-ink-600">{r.body}</p>
                    <Badge tone={r.status === "published" ? "green" : r.status === "pending" ? "amber" : "slate"}>{r.status}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {modOpen && (
        <Modal open onClose={() => setModOpen(false)} title="Moderate business" footer={null}>
          <ModForm loading={M.moderate.loading} onSubmit={(body) => run(M.moderate, body, `Business ${body.decision}d`, () => setModOpen(false))} status={b.status} />
        </Modal>
      )}
      {subOpen && (
        <Modal open onClose={() => setSubOpen(false)} title="Set subscription" footer={null}>
          <SubForm loading={M.sub.loading} onSubmit={(body) => run(M.sub, body, "Subscription updated", () => setSubOpen(false))} />
        </Modal>
      )}
    </>
  );
}

function ModForm({ loading, onSubmit, status }) {
  const [decision, setDecision] = useState(status === "approved" ? "suspend" : "approve");
  const [reason, setReason] = useState("");
  return (
    <div className="space-y-3">
      <Select
        label="Decision"
        options={[
          { value: "approve", label: "Approve" },
          { value: "reject", label: "Reject" },
          { value: "suspend", label: "Suspend" },
          { value: "reinstate", label: "Reinstate" },
        ]}
        value={decision}
        onChange={(e) => setDecision(e.target.value)}
      />
      <Textarea label={decision === "reject" ? "Reason (required)" : "Reason / note"} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
      <Button loading={loading} onClick={() => onSubmit({ decision, reason: reason || undefined })}>Apply</Button>
    </div>
  );
}

function SubForm({ loading, onSubmit }) {
  const [f, setF] = useState({ tier: "basic", months: 1, amount: "", autoRenew: false });
  return (
    <div className="space-y-3">
      <Select label="Tier" options={["free", "basic", "premium", "featured"]} value={f.tier} onChange={(e) => setF((s) => ({ ...s, tier: e.target.value }))} />
      <TextField label="Duration (months)" type="number" value={f.months} onChange={(e) => setF((s) => ({ ...s, months: e.target.value }))} />
      <TextField label="Amount (₦)" type="number" value={f.amount} onChange={(e) => setF((s) => ({ ...s, amount: e.target.value }))} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={f.autoRenew} onChange={(e) => setF((s) => ({ ...s, autoRenew: e.target.checked }))} /> Auto-renew
      </label>
      <Button loading={loading} onClick={() => onSubmit({ tier: f.tier, months: Number(f.months) || 1, amount: f.amount ? Number(f.amount) : undefined, autoRenew: f.autoRenew })}>
        Save subscription
      </Button>
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
