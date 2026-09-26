import { useMemo, useState } from "react";
import PageHeader from "../../components/ui/PageHeader.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import Pagination from "../../components/ui/Pagination.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import Drawer from "../../components/ui/Drawer.jsx";
import Select from "../../components/ui/Select.jsx";
import TextField from "../../components/ui/TextField.jsx";
import Textarea from "../../components/ui/Textarea.jsx";
import Alert from "../../components/ui/Alert.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import FilterBar from "../../components/ui/FilterBar.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useMutation, fieldErrors } from "../../hooks/useMutation.js";
import { useAuth } from "../../store/auth.js";
import { toast } from "../../store/toast.js";
import { disciplinary as api, downloadFile } from "../../services/hrm.js";
import { dateShort, dateTime } from "../../utils/format.js";

const CATEGORIES = ["misconduct", "attendance", "performance", "insubordination", "policy_breach", "safety", "other"];
const OUTCOMES = ["no_action", "verbal_warning", "written_warning", "final_warning", "suspension", "demotion", "dismissal", "other"];
const label = (s) => s.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

export default function Disciplinary() {
  const canWrite = useAuth((s) => s.can("disciplinary:write"));
  const [filters, setFilters] = useState({ status: "", category: "", severity: "" });
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState(null);
  const [creating, setCreating] = useState(false);

  const params = useMemo(
    () => ({ page, limit: 20, status: filters.status || undefined, category: filters.category || undefined, severity: filters.severity || undefined }),
    [page, filters],
  );
  const list = useApiQuery("/hrm/disciplinary", { params });

  return (
    <>
      <PageHeader
        title="Disciplinary Records"
        description="Restricted — access is logged."
        actions={canWrite && <Button onClick={() => setCreating(true)}>New case</Button>}
      />

      <FilterBar
        active={filters.status || filters.category || filters.severity}
        onClear={() => {
          setFilters({ status: "", category: "", severity: "" });
          setPage(1);
        }}
      >
        <Select className="lg:w-44" placeholder="Any status" options={["open", "query_issued", "response_received", "hearing_scheduled", "hearing_held", "closed"].map((s) => ({ value: s, label: label(s) }))} value={filters.status} onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value })); setPage(1); }} />
        <Select className="lg:w-40" placeholder="Any category" options={CATEGORIES.map((c) => ({ value: c, label: label(c) }))} value={filters.category} onChange={(e) => { setFilters((f) => ({ ...f, category: e.target.value })); setPage(1); }} />
        <Select className="lg:w-36" placeholder="Any severity" options={["minor", "major", "gross"]} value={filters.severity} onChange={(e) => { setFilters((f) => ({ ...f, severity: e.target.value })); setPage(1); }} />
      </FilterBar>

      <DataTable
        loading={list.loading}
        error={list.error}
        onRetry={list.refetch}
        rows={list.data || []}
        keyField="id"
        empty={{ title: "No disciplinary cases", description: "There are no records to display." }}
        onRowClick={(c) => setDetailId(c.id)}
        columns={[
          { key: "ref", header: "Ref", render: (c) => c.reference },
          { key: "employee", header: "Employee", primary: true, render: (c) => `${c.employee?.firstName} ${c.employee?.lastName}` },
          { key: "category", header: "Category", secondary: true, render: (c) => label(c.category) },
          { key: "severity", header: "Severity", render: (c) => <Badge tone={c.severity === "gross" ? "red" : c.severity === "major" ? "amber" : "neutral"}>{c.severity}</Badge> },
          { key: "incident", header: "Incident", render: (c) => dateShort(c.incidentDate) },
          { key: "status", header: "Status", render: (c) => <Badge status={c.status === "closed" ? "completed" : "pending"}>{label(c.status)}</Badge> },
          { key: "outcome", header: "Outcome", render: (c) => (c.outcome?.decision ? label(c.outcome.decision) : "—") },
        ]}
        footer={<Pagination meta={list.meta} onPage={setPage} />}
      />

      {creating && <CaseForm onClose={() => setCreating(false)} onSaved={() => { setCreating(false); list.refetch(); }} />}
      {detailId && <CaseDetail id={detailId} onClose={() => setDetailId(null)} onChanged={() => list.refetch()} />}
    </>
  );
}

function CaseForm({ onClose, onSaved }) {
  const employees = useApiQuery("/hrm/employees", { params: { limit: 300, status: "active", sort: "lastName" } });
  const [form, setForm] = useState({ employee: "", incidentDate: "", category: "misconduct", severity: "minor", description: "" });
  const { mutate, loading, error } = useMutation((client, body) => client.post("/hrm/disciplinary", body));
  const errs = fieldErrors(error);

  async function submit(e) {
    e.preventDefault();
    try {
      await mutate(form);
      toast.success("Disciplinary case created");
      onSaved();
    } catch {
      /* inline */
    }
  }

  return (
    <Modal open onClose={onClose} size="lg" title="New disciplinary case" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button form="dc-form" type="submit" loading={loading}>Create</Button></>}>
      <form id="dc-form" onSubmit={submit} className="space-y-4">
        {error && !error.details && <Alert tone="error">{error.message}</Alert>}
        <Select label="Employee" required placeholder="Select employee" options={(employees.data || []).map((e) => ({ value: e.id, label: `${e.firstName} ${e.lastName} — ${e.employeeId}` }))} value={form.employee} error={errs.employee} onChange={(e) => setForm((f) => ({ ...f, employee: e.target.value }))} />
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Incident date" type="date" required value={form.incidentDate} error={errs.incidentDate} onChange={(e) => setForm((f) => ({ ...f, incidentDate: e.target.value }))} />
          <Select label="Category" options={CATEGORIES.map((c) => ({ value: c, label: label(c) }))} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
          <Select label="Severity" options={["minor", "major", "gross"]} value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))} />
        </div>
        <Textarea label="Description of incident" required rows={4} value={form.description} error={errs.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
      </form>
    </Modal>
  );
}

function CaseDetail({ id, onClose, onChanged }) {
  const { data: c, loading, error, refetch } = useApiQuery(`/hrm/disciplinary/${id}`);
  const session = useAuth((s) => s.session);
  const canDelete = ["Super Admin", "Group Admin", "HR Manager"].includes(session?.role);
  const removeM = useMutation((client) => client.delete(`/hrm/disciplinary/${id}`));
  const [query, setQuery] = useState({ content: "", responseDueDate: "" });
  const [response, setResponse] = useState("");
  const [hearing, setHearing] = useState({ scheduledFor: "", location: "" });
  const [hearingNotes, setHearingNotes] = useState("");
  const [outcome, setOutcome] = useState({ decision: "written_warning", details: "", effectiveDate: "" });

  const M = {
    query: useMutation((cl, b) => cl.post(`/hrm/disciplinary/${id}/query`, b)),
    response: useMutation((cl, b) => cl.post(`/hrm/disciplinary/${id}/response`, b)),
    hearing: useMutation((cl, b) => cl.post(`/hrm/disciplinary/${id}/hearing`, b)),
    hearingRec: useMutation((cl, b) => cl.post(`/hrm/disciplinary/${id}/hearing/record`, b)),
    outcome: useMutation((cl, b) => cl.post(`/hrm/disciplinary/${id}/outcome`, b)),
  };

  async function run(m, body, msg) {
    try {
      await m.mutate(body);
      toast.success(msg);
      refetch();
      onChanged?.();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete disciplinary case "${c.reference}"? This cannot be undone.`)) return;
    try {
      await removeM.mutate();
      toast.success("Disciplinary case deleted");
      onChanged?.();
      onClose();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      size="lg"
      title={c ? `${c.reference} — ${c.employee?.firstName} ${c.employee?.lastName}` : "Case"}
      description={c ? label(c.category) : ""}
      footer={
        c &&
        canDelete && (
          <Button variant="danger" loading={removeM.loading} onClick={handleDelete}>
            Delete case
          </Button>
        )
      }
    >
      {loading && <div className="flex justify-center py-10 text-ink-400"><Spinner size={22} /></div>}
      {error && <Alert tone="error">{error.message}</Alert>}
      {c && (
        <div className="space-y-6 text-sm">
          <div className="flex items-center gap-2">
            <Badge status={c.status === "closed" ? "completed" : "pending"}>{label(c.status)}</Badge>
            <Badge tone={c.severity === "gross" ? "red" : c.severity === "major" ? "amber" : "neutral"}>{c.severity}</Badge>
          </div>

          <div>
            <p className="label">Incident ({dateShort(c.incidentDate)})</p>
            <p className="whitespace-pre-wrap text-ink-700">{c.description}</p>
          </div>

          {/* Query */}
          <Step title="1. Query letter" done={!!c.query?.issuedAt}>
            {c.query?.issuedAt ? (
              <div className="space-y-1">
                <p className="text-ink-700">{c.query.content}</p>
                <p className="text-2xs text-ink-400">Issued {dateTime(c.query.issuedAt)}{c.query.responseDueDate ? ` · response due ${dateShort(c.query.responseDueDate)}` : ""}</p>
                <button type="button" className="link text-xs" onClick={() => downloadFile(api.queryLetterUrl(id), `query-letter-${c.reference}.txt`)}>
                  Download formal query letter
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Textarea rows={3} placeholder="Query content" value={query.content} onChange={(e) => setQuery((q) => ({ ...q, content: e.target.value }))} />
                <TextField type="date" label="Response due date" value={query.responseDueDate} onChange={(e) => setQuery((q) => ({ ...q, responseDueDate: e.target.value }))} />
                <Button loading={M.query.loading} onClick={() => run(M.query, { content: query.content, responseDueDate: query.responseDueDate || undefined }, "Query issued")}>
                  Issue query
                </Button>
              </div>
            )}
          </Step>

          {/* Response */}
          <Step title="2. Employee response" done={!!c.employeeResponse?.submittedAt}>
            {c.employeeResponse?.submittedAt ? (
              <div>
                <p className="whitespace-pre-wrap text-ink-700">{c.employeeResponse.text}</p>
                <p className="text-2xs text-ink-400">Submitted {dateTime(c.employeeResponse.submittedAt)}</p>
              </div>
            ) : c.query?.issuedAt ? (
              <div className="space-y-2">
                <Textarea rows={3} placeholder="Record the employee's written response" value={response} onChange={(e) => setResponse(e.target.value)} />
                <Button loading={M.response.loading} onClick={() => run(M.response, { text: response }, "Response recorded")}>
                  Record response
                </Button>
              </div>
            ) : (
              <p className="text-ink-400">Issue a query first.</p>
            )}
          </Step>

          {/* Hearing */}
          <Step title="3. Hearing" done={!!c.hearing?.heldAt}>
            {c.hearing?.heldAt ? (
              <div>
                <p className="whitespace-pre-wrap text-ink-700">{c.hearing.notes}</p>
                <p className="text-2xs text-ink-400">Held {dateTime(c.hearing.heldAt)}</p>
              </div>
            ) : c.hearing?.scheduledFor ? (
              <div className="space-y-2">
                <p className="text-ink-600">Scheduled for {dateTime(c.hearing.scheduledFor)}</p>
                <Textarea rows={3} placeholder="Hearing notes" value={hearingNotes} onChange={(e) => setHearingNotes(e.target.value)} />
                <Button loading={M.hearingRec.loading} onClick={() => run(M.hearingRec, { notes: hearingNotes }, "Hearing recorded")}>
                  Record hearing outcome
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <TextField type="datetime-local" label="Schedule for" value={hearing.scheduledFor} onChange={(e) => setHearing((h) => ({ ...h, scheduledFor: e.target.value }))} />
                <Button variant="secondary" loading={M.hearing.loading} onClick={() => run(M.hearing, { scheduledFor: hearing.scheduledFor }, "Hearing scheduled")}>
                  Schedule hearing
                </Button>
              </div>
            )}
          </Step>

          {/* Outcome */}
          <Step title="4. Outcome" done={c.status === "closed"}>
            {c.outcome?.decision ? (
              <div>
                <p className="font-medium text-ink-900">{label(c.outcome.decision)}</p>
                <p className="text-ink-700">{c.outcome.details}</p>
                {c.outcome.effectiveDate && <p className="text-2xs text-ink-400">Effective {dateShort(c.outcome.effectiveDate)}</p>}
              </div>
            ) : (
              <div className="space-y-2">
                <Select label="Decision" options={OUTCOMES.map((o) => ({ value: o, label: label(o) }))} value={outcome.decision} onChange={(e) => setOutcome((o) => ({ ...o, decision: e.target.value }))} />
                <Textarea rows={2} placeholder="Details" value={outcome.details} onChange={(e) => setOutcome((o) => ({ ...o, details: e.target.value }))} />
                <TextField type="date" label="Effective date" value={outcome.effectiveDate} onChange={(e) => setOutcome((o) => ({ ...o, effectiveDate: e.target.value }))} />
                <Button variant="danger" loading={M.outcome.loading} onClick={() => run(M.outcome, { decision: outcome.decision, details: outcome.details || undefined, effectiveDate: outcome.effectiveDate || undefined }, "Outcome recorded — case closed")}>
                  Record outcome &amp; close
                </Button>
              </div>
            )}
          </Step>
        </div>
      )}
    </Drawer>
  );
}

function Step({ title, done, children }) {
  return (
    <div className="rounded-md border border-ink-200 p-3">
      <p className="mb-2 flex items-center gap-2 text-sm font-medium text-ink-900">
        <span className={`inline-block h-2 w-2 rounded-full ${done ? "bg-emerald-500" : "bg-ink-300"}`} />
        {title}
      </p>
      {children}
    </div>
  );
}
