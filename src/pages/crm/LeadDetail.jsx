import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Select from "../../components/ui/Select.jsx";
import TextField from "../../components/ui/TextField.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useMutation } from "../../hooks/useMutation.js";
import { useAuth } from "../../store/auth.js";
import { toast } from "../../store/toast.js";
import { money, dateTime, fromNow } from "../../utils/format.js";

const STAGE_TONE = { new: "slate", contacted: "blue", qualified: "blue", quoted: "amber", won: "green", lost: "red" };
const NEXT = {
  new: ["contacted", "qualified", "lost"],
  contacted: ["qualified", "quoted", "lost"],
  qualified: ["quoted", "won", "lost"],
  quoted: ["won", "lost"],
  lost: ["new"],
};
const label = (s) => s.replace(/\b\w/g, (m) => m.toUpperCase());

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const can = useAuth((s) => s.can);
  const { data: l, loading, error, refetch } = useApiQuery(`/crm/marketplace/leads/${id}`);
  const businesses = useApiQuery("/crm/marketplace/businesses", { params: { status: "approved", limit: 200 }, skip: !can("lead:write") });

  const [activity, setActivity] = useState({ type: "note", body: "" });
  const [stageForm, setStageForm] = useState(null);

  const M = {
    activity: useMutation((c, b) => c.post(`/crm/marketplace/leads/${id}/activity`, b)),
    stage: useMutation((c, b) => c.post(`/crm/marketplace/leads/${id}/stage`, b)),
    assign: useMutation((c, b) => c.post(`/crm/marketplace/leads/${id}/assign`, b)),
  };

  if (loading) return <div className="flex justify-center py-20 text-ink-400"><Spinner size={24} /></div>;
  if (error) return <EmptyState title="Lead not found" description={error.message} action={<Button variant="secondary" onClick={() => navigate("/crm/leads")}>Back</Button>} />;

  async function run(m, body, msg) {
    try {
      await m.mutate(body);
      if (msg) toast.success(msg);
      refetch();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <>
      <PageHeader
        title={<span className="flex items-center gap-3">{l.title}<Badge tone={STAGE_TONE[l.stage]}>{label(l.stage)}</Badge></span>}
        description={<span className="text-xs text-ink-500">{l.reference} · {l.serviceCategory || "lead"} · created {fromNow(l.createdAt)}</span>}
        actions={<Button variant="secondary" onClick={() => navigate("/crm/leads")}>Back</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-5">
          {l.description && (
            <div className="card p-4">
              <p className="label">Description</p>
              <p className="whitespace-pre-wrap text-sm text-ink-700">{l.description}</p>
            </div>
          )}

          <div className="card p-4">
            <p className="mb-3 text-sm font-semibold text-ink-900">Activity</p>
            <ol className="space-y-2 border-l border-ink-200 pl-4">
              {[...l.activities].reverse().map((a, i) => (
                <li key={i} className="text-sm">
                  <span className="text-ink-800">{a.type === "stage_change" ? a.body : `${label(a.type)}: ${a.body}`}</span>
                  <span className="ml-2 text-2xs text-ink-400">{a.byName} · {dateTime(a.at)}</span>
                </li>
              ))}
            </ol>
            {can("lead:write") && (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <select className="input sm:w-32" value={activity.type} onChange={(e) => setActivity((s) => ({ ...s, type: e.target.value }))}>
                  {["note", "call", "email", "whatsapp", "meeting", "quote"].map((t) => <option key={t} value={t}>{label(t)}</option>)}
                </select>
                <input className="input flex-1" placeholder="Log activity" value={activity.body} onChange={(e) => setActivity((s) => ({ ...s, body: e.target.value }))} />
                <Button
                  variant="secondary"
                  loading={M.activity.loading}
                  onClick={async () => {
                    if (!activity.body.trim()) return;
                    await run(M.activity, activity, "Activity logged");
                    setActivity({ type: "note", body: "" });
                  }}
                >
                  Add
                </Button>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          {l.customer && (
            <Panel title="Customer">
              <Link to={`/crm/customers/${typeof l.customer === "object" ? l.customer.id || l.customer._id : l.customer}`} className="link text-sm">View account</Link>
            </Panel>
          )}
          <Panel title="Contact">
            <p className="text-sm text-ink-800">{l.contactName || "—"}</p>
            <p className="text-xs text-ink-500">{l.contactPhone}</p>
            <p className="text-xs text-ink-500">{l.contactEmail}</p>
          </Panel>

          <Panel title="Value">
            <dl className="space-y-1 text-sm">
              <Row label="Estimated" v={money(l.estimatedValue, { whole: true })} />
              {l.quotedAmount > 0 && <Row label="Quoted" v={money(l.quotedAmount, { whole: true })} />}
              {l.wonValue > 0 && <Row label="Won" v={money(l.wonValue, { whole: true })} />}
            </dl>
          </Panel>

          {can("lead:write") && (
            <Panel title="Matched business">
              <Select
                value={l.matchedBusiness || ""}
                placeholder="Assign a business"
                options={(businesses.data || []).map((b) => ({ value: b.id, label: b.name }))}
                onChange={(e) => run(M.assign, { matchedBusiness: e.target.value || null }, "Business matched")}
              />
            </Panel>
          )}

          {can("lead:write") && NEXT[l.stage]?.length > 0 && (
            <Panel title="Move stage">
              <div className="flex flex-col gap-1.5">
                {NEXT[l.stage].map((ns) => (
                  <Button key={ns} variant="secondary" onClick={() => setStageForm(ns)}>→ {label(ns)}</Button>
                ))}
              </div>
            </Panel>
          )}
        </aside>
      </div>

      {stageForm && (
        <StageModal
          stage={stageForm}
          loading={M.stage.loading}
          onClose={() => setStageForm(null)}
          onConfirm={async (body) => {
            await run(M.stage, { stage: stageForm, ...body }, `Moved to ${label(stageForm)}`);
            setStageForm(null);
          }}
        />
      )}
    </>
  );
}

function StageModal({ stage, loading, onClose, onConfirm }) {
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-lg bg-white p-4 shadow-drawer" onClick={(e) => e.stopPropagation()}>
        <p className="mb-3 text-sm font-semibold text-ink-900">Move lead to {label(stage)}</p>
        <div className="space-y-3">
          {stage === "quoted" && <TextField label="Quoted amount (₦)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />}
          {stage === "won" && <TextField label="Won value (₦)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />}
          <TextField label={stage === "lost" ? "Reason (required)" : "Note"} value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button
              loading={loading}
              onClick={() =>
                onConfirm({
                  note: note || undefined,
                  lostReason: stage === "lost" ? note : undefined,
                  quotedAmount: stage === "quoted" && amount ? Number(amount) : undefined,
                  wonValue: stage === "won" && amount ? Number(amount) : undefined,
                })
              }
            >
              Confirm
            </Button>
          </div>
        </div>
      </div>
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
