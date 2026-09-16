import { useState } from "react";
import Button from "../ui/Button.jsx";
import Select from "../ui/Select.jsx";
import TextField from "../ui/TextField.jsx";
import Textarea from "../ui/Textarea.jsx";
import Badge from "../ui/Badge.jsx";
import Spinner from "../ui/Spinner.jsx";
import EmptyState from "../ui/EmptyState.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useMutation } from "../../hooks/useMutation.js";
import { useAuth } from "../../store/auth.js";
import { toast } from "../../store/toast.js";
import { dateTime } from "../../utils/format.js";

const CHANNELS = ["call", "whatsapp", "sms", "email", "note", "meeting", "in_person"];
const CHANNEL_TONE = { call: "blue", whatsapp: "green", sms: "neutral", email: "neutral", note: "slate", meeting: "amber", in_person: "amber" };

export default function CommunicationsTab({ customerId, onLogged }) {
  const canWrite = useAuth((s) => s.can("communication:write"));
  const canDelete = useAuth((s) => s.can("communication:delete"));
  const list = useApiQuery("/crm/communications", { params: { customer: customerId, limit: 100 } });
  const [logging, setLogging] = useState(false);
  const [form, setForm] = useState({ channel: "call", direction: "outbound", subject: "", body: "", durationSeconds: "", outcome: "" });

  const logM = useMutation((c, b) => c.post("/crm/communications", b));
  const delM = useMutation((c, id) => c.delete(`/crm/communications/${id}`));

  async function submit(e) {
    e.preventDefault();
    try {
      await logM.mutate({
        customer: customerId,
        channel: form.channel,
        direction: form.direction,
        subject: form.subject || undefined,
        body: form.body,
        durationSeconds: form.durationSeconds ? Number(form.durationSeconds) : undefined,
        outcome: form.outcome || undefined,
      });
      toast.success("Communication logged");
      setLogging(false);
      setForm({ channel: "call", direction: "outbound", subject: "", body: "", durationSeconds: "", outcome: "" });
      list.refetch();
      onLogged?.();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-4">
      {canWrite && !logging && (
        <Button onClick={() => setLogging(true)}>Log communication</Button>
      )}

      {logging && (
        <form onSubmit={submit} className="card space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Select label="Channel" options={CHANNELS.map((c) => ({ value: c, label: c.replace("_", " ") }))} value={form.channel} onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))} />
            <Select label="Direction" options={["inbound", "outbound", "internal"]} value={form.direction} onChange={(e) => setForm((f) => ({ ...f, direction: e.target.value }))} />
            {form.channel === "call" && <TextField label="Duration (sec)" type="number" value={form.durationSeconds} onChange={(e) => setForm((f) => ({ ...f, durationSeconds: e.target.value }))} />}
          </div>
          <TextField label="Subject" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
          <Textarea label="Details" required rows={3} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
          <TextField label="Outcome" value={form.outcome} onChange={(e) => setForm((f) => ({ ...f, outcome: e.target.value }))} />
          <div className="flex gap-2">
            <Button type="submit" loading={logM.loading}>Save</Button>
            <Button type="button" variant="secondary" onClick={() => setLogging(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {list.loading && !list.data ? (
        <div className="flex justify-center py-10 text-ink-400"><Spinner size={20} /></div>
      ) : !list.data || list.data.length === 0 ? (
        <EmptyState title="No communications logged" description="Log calls, messages and meetings to build the customer's history." />
      ) : (
        <ul className="space-y-2">
          {list.data.map((c) => (
            <li key={c.id} className="card p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge tone={CHANNEL_TONE[c.channel] || "neutral"}>{c.channel}</Badge>
                  <span className="text-2xs uppercase tracking-wide text-ink-400">{c.direction}</span>
                  {c.durationSeconds ? <span className="text-2xs text-ink-400">{Math.round(c.durationSeconds / 60)}m</span> : null}
                </div>
                <span className="text-xs text-ink-400">{dateTime(c.occurredAt)}</span>
              </div>
              {c.subject && <p className="mt-1 text-sm font-medium text-ink-900">{c.subject}</p>}
              <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink-700">{c.body}</p>
              {c.outcome && <p className="mt-1 text-xs text-ink-500">Outcome: {c.outcome}</p>}
              <div className="mt-1 flex items-center justify-between">
                <span className="text-2xs text-ink-400">{c.byName}</span>
                {canDelete && (
                  <button
                    type="button"
                    className="text-2xs text-ink-400 hover:text-red-600"
                    onClick={async () => {
                      if (!confirm("Delete this communication log?")) return;
                      await delM.mutate(c.id);
                      list.refetch();
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
