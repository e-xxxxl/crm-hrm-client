import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import TextField from "../../components/ui/TextField.jsx";
import Textarea from "../../components/ui/Textarea.jsx";
import Select from "../../components/ui/Select.jsx";
import Alert from "../../components/ui/Alert.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useMutation, fieldErrors } from "../../hooks/useMutation.js";
import { useAuth } from "../../store/auth.js";
import { toast } from "../../store/toast.js";
import { money, fromNow } from "../../utils/format.js";

const STAGES = ["new", "contacted", "qualified", "quoted", "won", "lost"];
const NEXT = {
  new: ["contacted", "qualified", "lost"],
  contacted: ["qualified", "quoted", "lost"],
  qualified: ["quoted", "won", "lost"],
  quoted: ["won", "lost"],
};
const label = (s) => s.replace(/\b\w/g, (m) => m.toUpperCase());

export default function LeadBoard() {
  const navigate = useNavigate();
  const can = useAuth((s) => s.can);
  const [mine, setMine] = useState(false);
  const [creating, setCreating] = useState(false);

  const stats = useApiQuery("/crm/marketplace/leads/stats");
  const board = useApiQuery("/crm/marketplace/leads/board", { params: { mine: mine ? "true" : undefined } });
  const move = useMutation((c, { id, stage, note }) => c.post(`/crm/marketplace/leads/${id}/stage`, { stage, note }));

  async function quickMove(id, stage) {
    try {
      await move.mutate({ id, stage, note: stage === "lost" ? "Marked lost from board" : undefined });
      board.refetch();
      stats.refetch();
    } catch (e) {
      toast.error(e.message);
    }
  }

  const s = stats.data;

  return (
    <>
      <PageHeader
        title="Leads"
        actions={
          <>
            <label className="flex items-center gap-2 text-sm text-ink-600">
              <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> My leads
            </label>
            {can("lead:write") && <Button onClick={() => setCreating(true)}>New lead</Button>}
          </>
        }
      />

      {s && (
        <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-200 bg-ink-200 sm:grid-cols-4">
          <Tile label="Open leads" value={STAGES.filter((x) => !["won", "lost"].includes(x)).reduce((a, x) => a + (s.byStage?.[x] || 0), 0)} />
          <Tile label="Won" value={s.byStage?.won || 0} />
          <Tile label="Pipeline value" value={money(s.pipelineValue, { whole: true })} />
          <Tile label="Conversion" value={s.conversionRate == null ? "—" : `${s.conversionRate}%`} />
        </div>
      )}

      {board.loading ? (
        <div className="flex justify-center py-16 text-ink-400"><Spinner size={22} /></div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {STAGES.map((stage) => {
            const items = board.data?.columns?.[stage] || [];
            return (
              <div key={stage} className="w-64 shrink-0">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-ink-500">{label(stage)}</span>
                  <span className="text-xs text-ink-400">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((l) => (
                    <div key={l.id} className="card cursor-pointer p-2.5 hover:border-brand-600" onClick={() => navigate(`/crm/leads/${l.id}`)}>
                      <p className="text-sm font-medium text-ink-900">{l.title}</p>
                      <p className="truncate text-xs text-ink-500">{l.contactName || "—"} · {l.serviceCategory || "lead"}</p>
                      {(l.estimatedValue > 0 || l.quotedAmount > 0) && (
                        <p className="mt-1 text-2xs text-ink-500">{money(l.quotedAmount || l.estimatedValue, { whole: true })}</p>
                      )}
                      <p className="mt-1 text-2xs text-ink-400">{l.ownerName || "unassigned"} · {fromNow(l.updatedAt)}</p>
                      {can("lead:write") && NEXT[stage] && (
                        <div className="mt-1.5 flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                          {NEXT[stage].map((ns) => (
                            <button
                              key={ns}
                              type="button"
                              className="rounded border border-ink-200 px-1.5 py-0.5 text-2xs text-ink-600 hover:bg-ink-50"
                              onClick={() => (ns === "lost" || ns === "won" ? navigate(`/crm/leads/${l.id}`) : quickMove(l.id, ns))}
                            >
                              → {label(ns)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {items.length === 0 && <p className="px-1 text-2xs text-ink-300">Empty</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {creating && <LeadForm onClose={() => setCreating(false)} onSaved={(l) => { setCreating(false); navigate(`/crm/leads/${l.id}`); }} />}
    </>
  );
}

function LeadForm({ onClose, onSaved }) {
  const [form, setForm] = useState({
    title: "", description: "", serviceCategory: "", contactName: "", contactPhone: "", contactEmail: "",
    location: "", state: "", source: "web", estimatedValue: "",
  });
  const { mutate, loading, error } = useMutation((c, b) => c.post("/crm/marketplace/leads", b));
  const errs = fieldErrors(error);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    try {
      const lead = await mutate({
        ...form,
        estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : undefined,
      });
      toast.success(`Lead ${lead.reference} created`);
      onSaved(lead);
    } catch {
      /* inline */
    }
  }

  return (
    <Modal open onClose={onClose} size="lg" title="New lead" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button form="lead-form" type="submit" loading={loading}>Create</Button></>}>
      <form id="lead-form" onSubmit={submit} className="space-y-4">
        {error && !error.details && <Alert tone="error">{error.message}</Alert>}
        <TextField label="Title" required value={form.title} error={errs.title} onChange={set("title")} />
        <Textarea label="Description" rows={2} value={form.description} onChange={set("description")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Service category" value={form.serviceCategory} onChange={set("serviceCategory")} />
          <TextField label="Estimated value (₦)" type="number" value={form.estimatedValue} onChange={set("estimatedValue")} />
          <TextField label="Contact name" value={form.contactName} onChange={set("contactName")} />
          <TextField label="Contact phone" value={form.contactPhone} onChange={set("contactPhone")} />
          <TextField label="Contact email" value={form.contactEmail} onChange={set("contactEmail")} />
          <TextField label="Location" value={form.location} onChange={set("location")} />
          <TextField label="Source" value={form.source} onChange={set("source")} />
        </div>
      </form>
    </Modal>
  );
}

function Tile({ label, value }) {
  return (
    <div className="bg-white px-3 py-2.5">
      <p className="text-2xs uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-0.5 text-base font-semibold text-ink-900">{value ?? 0}</p>
    </div>
  );
}
