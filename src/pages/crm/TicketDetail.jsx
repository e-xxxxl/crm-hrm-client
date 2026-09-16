import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Select from "../../components/ui/Select.jsx";
import Textarea from "../../components/ui/Textarea.jsx";
import Alert from "../../components/ui/Alert.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useMutation } from "../../hooks/useMutation.js";
import { useAuth } from "../../store/auth.js";
import { toast } from "../../store/toast.js";
import { dateTime, fromNow } from "../../utils/format.js";

const PRIORITY_TONE = { urgent: "red", high: "amber", normal: "neutral", low: "slate" };
const label = (s) => String(s).replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const can = useAuth((s) => s.can);
  const { data: t, loading, error, refetch } = useApiQuery(`/crm/tickets/${id}`);
  const agents = useApiQuery("/hrm/employees", { params: { limit: 200, status: "active", sort: "lastName" }, skip: !can("ticket:assign") });

  const [reply, setReply] = useState({ body: "", type: "staff_update" });
  const [escalateReason, setEscalateReason] = useState("");
  const [showEscalate, setShowEscalate] = useState(false);

  const M = {
    update: useMutation((c, b) => c.post(`/crm/tickets/${id}/updates`, b)),
    assign: useMutation((c, b) => c.post(`/crm/tickets/${id}/assign`, b)),
    status: useMutation((c, b) => c.post(`/crm/tickets/${id}/status`, b)),
    priority: useMutation((c, b) => c.post(`/crm/tickets/${id}/priority`, b)),
    escalate: useMutation((c, b) => c.post(`/crm/tickets/${id}/escalate`, b)),
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-ink-400">
        <Spinner size={24} />
      </div>
    );
  }
  if (error) {
    return (
      <EmptyState
        title="Ticket not found"
        description={error.message}
        action={<Button variant="secondary" onClick={() => navigate("/crm/tickets")}>Back to tickets</Button>}
      />
    );
  }

  async function run(m, body, msg) {
    try {
      await m.mutate(body);
      if (msg) toast.success(msg);
      refetch();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function sendReply() {
    if (!reply.body.trim()) return;
    await run(M.update, { type: reply.type, body: reply.body.trim() }, "Update added");
    setReply({ body: "", type: reply.type });
  }

  const agentOptions = (agents.data || [])
    .filter((a) => a.user)
    .map((a) => ({ value: a.user, label: `${a.firstName} ${a.lastName}` }));

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-ink-500">{t.ticketNumber}</span>
            {t.subject}
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge>
            <Badge status={t.status === "resolved" || t.status === "closed" ? "completed" : "pending"}>{label(t.status)}</Badge>
            {t.escalated && <Badge tone="red">Escalated</Badge>}
            {t.slaBreached && <Badge tone="red">SLA breached</Badge>}
            <span className="text-xs text-ink-500">opened {fromNow(t.createdAt)} · {t.channel}</span>
          </span>
        }
        actions={
          <Button variant="secondary" onClick={() => navigate("/crm/tickets")}>
            Back
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        {/* Timeline + composer */}
        <div>
          <ol className="space-y-3">
            {t.updates.map((u) => (
              <TimelineEntry key={u.id} u={u} />
            ))}
          </ol>

          {t.status !== "closed" && can("ticket:write") && (
            <div className="mt-4 rounded-md border border-ink-200 p-3">
              <div className="mb-2 flex gap-1">
                {[
                  ["staff_update", "Reply"],
                  ["internal_note", "Internal note"],
                  ["customer_update", "Log customer msg"],
                ].map(([value, lbl]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setReply((r) => ({ ...r, type: value }))}
                    className={`rounded px-2 py-1 text-xs font-medium ${
                      reply.type === value ? "bg-ink-900 text-white" : "text-ink-500 hover:bg-ink-100"
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
              <Textarea
                rows={3}
                placeholder={reply.type === "internal_note" ? "Visible to staff only" : "Message"}
                value={reply.body}
                onChange={(e) => setReply((r) => ({ ...r, body: e.target.value }))}
              />
              <div className="mt-2 flex justify-end">
                <Button loading={M.update.loading} onClick={sendReply}>
                  Add {reply.type === "internal_note" ? "note" : "update"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <Panel title="Customer">
            {t.customer ? (
              <Link to={`/crm/customers/${t.customer.id}`} className="link text-sm">
                {t.customerSnapshot?.name || "View customer"}
              </Link>
            ) : (
              <p className="text-sm text-ink-500">No customer linked</p>
            )}
            {t.customerSnapshot?.phone && <p className="text-xs text-ink-500">{t.customerSnapshot.phone}</p>}
            {t.customerSnapshot?.email && <p className="text-xs text-ink-500">{t.customerSnapshot.email}</p>}
          </Panel>

          <Panel title="Assignment">
            {can("ticket:assign") ? (
              <Select
                value={t.assignee || ""}
                placeholder="Unassigned"
                options={agentOptions}
                onChange={(e) => run(M.assign, { assignee: e.target.value || undefined }, "Reassigned")}
              />
            ) : (
              <p className="text-sm text-ink-800">{t.assigneeName || t.assignedTeam || "Unassigned"}</p>
            )}
          </Panel>

          {can("ticket:write") && (
            <Panel title="Status">
              <Select
                value={t.status}
                options={["open", "pending", "on_hold", "resolved", "closed", "reopened"].map((v) => ({ value: v, label: label(v) }))}
                onChange={(e) => run(M.status, { status: e.target.value }, `Moved to ${label(e.target.value)}`)}
              />
            </Panel>
          )}

          {can("ticket:write") && (
            <Panel title="Priority">
              <Select
                value={t.priority}
                options={["low", "normal", "high", "urgent"]}
                onChange={(e) => run(M.priority, { priority: e.target.value }, "Priority updated")}
              />
            </Panel>
          )}

          <Panel title="SLA">
            <p className="text-sm text-ink-800">
              {t.dueAt ? dateTime(t.dueAt) : "—"}
              {t.slaBreached && <span className="ml-1 text-red-600">(breached)</span>}
            </p>
            {t.firstResponseAt && (
              <p className="text-xs text-ink-500">First response {fromNow(t.firstResponseAt)}</p>
            )}
          </Panel>

          {can("ticket:escalate") && !["resolved", "closed"].includes(t.status) && (
            <Panel title="Escalate">
              {showEscalate ? (
                <div className="space-y-2">
                  <Textarea rows={2} placeholder="Reason" value={escalateReason} onChange={(e) => setEscalateReason(e.target.value)} />
                  <Button
                    variant="danger"
                    loading={M.escalate.loading}
                    onClick={async () => {
                      await run(M.escalate, { reason: escalateReason || undefined }, "Ticket escalated");
                      setShowEscalate(false);
                      setEscalateReason("");
                    }}
                  >
                    Confirm escalation
                  </Button>
                </div>
              ) : (
                <Button variant="secondary" onClick={() => setShowEscalate(true)}>
                  Escalate ticket
                </Button>
              )}
            </Panel>
          )}
        </aside>
      </div>
    </>
  );
}

function TimelineEntry({ u }) {
  const styles = {
    internal_note: "border-amber-200 bg-amber-50",
    system_event: "border-ink-200 bg-ink-50",
    customer_update: "border-blue-200 bg-blue-50/60",
    staff_update: "border-ink-200 bg-white",
  };
  const isChange = ["status_change", "priority_change", "assignment", "escalation", "due_date_change"].includes(u.type);

  if (isChange) {
    return (
      <li className="flex items-center gap-2 px-1 text-xs text-ink-500">
        <span className="h-1.5 w-1.5 rounded-full bg-ink-300" />
        <span>{u.body}</span>
        <span className="text-ink-400">· {u.authorName || "System"} · {fromNow(u.createdAt)}</span>
      </li>
    );
  }

  return (
    <li className={`rounded-md border p-3 ${styles[u.type] || "border-ink-200 bg-white"}`}>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-ink-700">
          {u.system ? `System${u.sourceSystem ? ` · ${u.sourceSystem}` : ""}` : u.authorName || "Staff"}
          {u.type === "internal_note" && <span className="ml-1 text-amber-700">(internal)</span>}
          {u.type === "customer_update" && <span className="ml-1 text-blue-700">(customer)</span>}
        </span>
        <span className="text-ink-400">{dateTime(u.createdAt)}</span>
      </div>
      <p className="whitespace-pre-wrap text-sm text-ink-800">{u.body}</p>
      {u.attachments?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {u.attachments.map((a, i) => (
            <a key={i} href={a.url?.startsWith("http") ? a.url : `/api${a.url}`} target="_blank" rel="noreferrer" className="link text-xs">
              {a.name}
            </a>
          ))}
        </div>
      )}
    </li>
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
